// src/components/AlarmWatcher.jsx
import { useRoom } from "../context/RoomContext";
import { useAlarmModal } from "../context/AlarmModalContext";
import { useRef, useEffect } from "react";
import { HUB_THRESHOLDS } from "../constants/thresholds";

function getAlarmMessage(room) {
  // Do not show modal if alert_level or alert_message is 'Normal' or 'Normal condition'
  const alertLevel = room.alert_level
    ? String(room.alert_level).toLowerCase()
    : "";
  const alertMsg = room.alert_message
    ? String(room.alert_message).toLowerCase()
    : "";
  if (
    alertLevel === "normal" ||
    alertLevel === "normal condition" ||
    alertMsg === "normal" ||
    alertMsg === "normal condition"
  ) {
    return null;
  }
  if (room.alert_message && room.alert_message !== "Normal") {
    return `${room.alert_message} (Room: ${room.roomName})`;
  }
  if (room.fire) return `Fire detected in ${room.roomName}!`;
  if (room.temperature > HUB_THRESHOLDS.temperature.alert) {
    return `High temperature in ${room.roomName}!`;
  }
  if (room.smoke > HUB_THRESHOLDS.gas.alert) {
    return `High smoke level in ${room.roomName}!`;
  }
  if (room.carbonMonoxide > HUB_THRESHOLDS.co.alert) {
    return `High CO in ${room.roomName}!`;
  }
  return null;
}

export default function AlarmWatcher() {
  const { rooms } = useRoom();
  const { showAlarm } = useAlarmModal();
  const prevAlarms = useRef({});

  useEffect(() => {
    rooms.forEach((room) => {
      const alarmMsg = getAlarmMessage(room);
      if (alarmMsg && !prevAlarms.current[room.roomName]) {
        showAlarm({ room });
        prevAlarms.current[room.roomName] = true;
      } else if (!alarmMsg) {
        prevAlarms.current[room.roomName] = false;
      }
    });
  }, [rooms, showAlarm]);

  return null;
}
