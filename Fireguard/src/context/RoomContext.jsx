import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import { db } from "../firebase";
import { ref, onValue, update } from "firebase/database";
import buzzer from "../public/buzzer.mp3";
const RoomContext = createContext();

export function useRoom() {
  return useContext(RoomContext);
}

export function RoomProvider({ children }) {
  const [rooms, setRooms] = useState([]);
  const [buzzerOn, setBuzzerOn] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const sensorRef = ref(db, "sensor_data");
    const unsub = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val() || {};
      const now = Date.now();
      const roomsArr = Object.entries(data).map(([node, sensor]) => {
        // Parse the sensor's timestamp to detect actual offline status
        let sensorTimestamp = now;
        if (sensor.timestamp) {
          // Parse "YYYY-MM-DD HH:mm:ss" format
          try {
            const parsedDate = new Date(sensor.timestamp.replace(" ", "T"));
            sensorTimestamp = parsedDate.getTime();
          } catch (e) {
            sensorTimestamp = now;
          }
        }

        const sensorSilenced = !!sensor.silenced;

        return {
          // include the node id so other parts (settings) can reference it
          nodeId: node,
          // roomName will be replaced below if a custom name exists
          roomName: `ROOM NO. ${node.replace("NODE", "")}`,
          temperature: sensor.temperature ?? 0,
          humidity: sensor.humidity ?? 0,
          smoke: sensor.Gas_and_Smoke ?? 0,
          carbonMonoxide: sensor.carbon_monoxide ?? 0,
          flame: sensor.flame ?? 0,
          fire:
            sensor.flame === 1 ||
            (sensor.alert_level &&
              sensor.alert_level.toLowerCase() === "alert"),
          status: sensorSilenced ? "Silenced" : "Active",
          alert_level: sensor.alert_level,
          alert_message: sensor.alert_message,
          silenced: sensorSilenced,
          lastUpdated: sensorTimestamp,
          isOffline: false,
          sensorTimestampString: sensor.timestamp,
        };
      });
      // If there are custom room names loaded, apply them
      setRooms((prev) => {
        // try to preserve any previous mapping from nodeId to custom names and offline state
        return roomsArr.map((r) => {
          const existing = prev.find((p) => p.nodeId === r.nodeId);

          if (existing) {
            return {
              ...r,
              roomName: existing.customName || r.roomName,
              customName: existing.customName,
              // IMPORTANT: Preserve the offline state set by the offline detection logic
              isOffline: existing.isOffline,
              status: existing.isOffline
                ? "Offline"
                : r.silenced
                  ? "Silenced"
                  : "Active",
            };
          }
          return {
            ...r,
            status: r.silenced ? "Silenced" : "Active",
          };
        });
      });
    });
    return () => unsub();
  }, []);

  // Check for offline rooms (no update for 1 minute)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const OFFLINE_THRESHOLD = 60000; // 1 minute in milliseconds
      setRooms((current) =>
        current.map((room) => {
          const timeSinceUpdate = now - (room.lastUpdated || now);
          const isNowOffline = timeSinceUpdate > OFFLINE_THRESHOLD;

          // If the room just went offline, mark it Offline and zero readings
          if (isNowOffline && !room.isOffline) {
            // Auto-silence the room in Firebase when it goes offline
            if (room.nodeId) {
              update(ref(db, `sensor_data/${room.nodeId}`), {
                silenced: true,
              }).catch((err) =>
                console.error("Failed to silence offline room:", err),
              );
            }

            return {
              ...room,
              isOffline: true,
              status: "Offline",
              temperature: 0,
              humidity: 0,
              smoke: 0,
              carbonMonoxide: 0,
              flame: 0,
              fire: false,
              silenced: true,
            };
          }

          // If the room came back online, clear the offline flag and restore status
          // (actual sensor values will be overwritten by the realtime listener)
          if (!isNowOffline && room.isOffline) {
            return {
              ...room,
              isOffline: false,
              status: room.silenced ? "Silenced" : "Active",
            };
          }

          return room;
        }),
      );
    }, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Listen for custom room names under 'room_names' and merge into rooms
  useEffect(() => {
    const namesRef = ref(db, "room_names");
    const unsubNames = onValue(namesRef, (snapshot) => {
      const data = snapshot.val() || {};
      // data expected to be { NODE1: 'My Lab', NODE2: 'Kitchen', ... }
      setRooms((current) =>
        current.map((r) => {
          if (!r.nodeId) return r;
          const name = data[r.nodeId];
          if (name) return { ...r, roomName: name, customName: name };
          // if no custom name, keep the default roomName (constructed from nodeId)
          return { ...r };
        }),
      );
    });
    return () => unsubNames();
  }, []);

  // Listen for room metadata (archived, onRepair etc) under 'room_meta' and merge
  useEffect(() => {
    const metaRef = ref(db, "room_meta");
    const unsubMeta = onValue(metaRef, (snapshot) => {
      const data = snapshot.val() || {};
      setRooms((current) =>
        current.map((r) => {
          if (!r.nodeId) return r;
          const meta = data[r.nodeId] || {};
          return { ...r, archived: !!meta.archived, onRepair: !!meta.onRepair };
        }),
      );
    });
    return () => unsubMeta();
  }, []);

  // Simplified buzzer logic - play when there's an alarm
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (buzzerOn) {
      audio.loop = true;
      audio.currentTime = 0;
      audio.play().catch((error) => {
        console.log("Buzzer play failed:", error);
        // If autoplay fails, try to enable audio
        setAudioEnabled(false);
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [buzzerOn]);

  // Check for alarms and set buzzer state
  useEffect(() => {
    const anyAlarm = rooms.some((room) => {
      if (room.isOffline || room.silenced === true) return false;
      const level = String(room.alert_level || "").toLowerCase();
      const message = String(room.alert_message || "").toLowerCase();
      const thresholdAlarm =
        room.fire ||
        room.temperature > 55 ||
        room.smoke > 600 ||
        room.carbonMonoxide > 70;
      const alertLevelAlarm = level === "alert";
      const messageAlarm =
        message.includes("alert") ||
        message.includes("flame");

      return thresholdAlarm || alertLevelAlarm || messageAlarm;
    });

    setBuzzerOn(anyAlarm);
  }, [rooms]);

  const toggleRoomSilence = (nodeId) => {
    if (!nodeId) return;

    const targetRoom = rooms.find((room) => room.nodeId === nodeId);
    if (!targetRoom) return;

    const previousSilenced = !!targetRoom.silenced;
    const nextSilenced = !previousSilenced;

    setRooms((current) =>
      current.map((room) => {
        if (room.nodeId !== nodeId) return room;

        return {
          ...room,
          silenced: nextSilenced,
          status: room.isOffline
            ? "Offline"
            : nextSilenced
              ? "Silenced"
              : "Active",
        };
      }),
    );

    update(ref(db, `sensor_data/${nodeId}`), { silenced: nextSilenced }).catch(
      (err) => {
        console.error("Failed to sync silence state to Firebase:", err);
        setRooms((current) =>
          current.map((room) =>
            room.nodeId === nodeId
              ? {
                  ...room,
                  silenced: previousSilenced,
                  status: room.isOffline
                    ? "Offline"
                    : previousSilenced
                      ? "Silenced"
                      : "Active",
                }
              : room,
          ),
        );
      },
    );
  };

  // Function to manually enable audio (called from header)
  const enableAudio = () => {
    setAudioEnabled(true);
    // Try to play the buzzer if it should be on
    if (buzzerOn && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  };

  // Function to manually test buzzer
  const testBuzzer = () => {
    if (audioRef.current) {
      audioRef.current.loop = false;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  };

  return (
    <RoomContext.Provider
      value={{
        rooms,
        setRooms,
        buzzerOn,
        setBuzzerOn,
        audioEnabled,
        enableAudio,
        testBuzzer,
        toggleRoomSilence,
      }}
    >
      <audio ref={audioRef} src={buzzer} preload="auto" />
      {children}
    </RoomContext.Provider>
  );
}
