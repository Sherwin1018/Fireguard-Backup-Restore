import React, { useState, useEffect } from "react";
import { FaHome, FaThermometerHalf, FaCloud, FaPowerOff } from "react-icons/fa";
import { MdCo2 } from "react-icons/md";
import { GiSmokeBomb } from "react-icons/gi";
import { useRoom } from "../context/RoomContext";
import { useRoomChartModal } from "../context/RoomChartModalContext";

// Blinking Logic
function getBlinkingClass({
  alert_level,
  status,
  fire,
  temperature,
  smoke,
  carbonMonoxide,
  isAlarmSilenced,
}) {
  if (status !== "Active" || isAlarmSilenced) return "";
  const thresholdAlarm =
    fire || temperature > 55 || smoke > 600 || carbonMonoxide > 70;
  if (alert_level && alert_level.toLowerCase() === "warning")
    return "blink-yellow";
  if (thresholdAlarm || (alert_level && alert_level.toLowerCase() === "alert"))
    return "blink-red";
  return "";
}

export default function RoomTile(props) {
  const { toggleRoomSilence } = useRoom();
  const room = props;
  const { showRoomChart } = useRoomChartModal();
  const [timeUntilOffline, setTimeUntilOffline] = useState(60);
  const isAlarmSilenced = room.silenced === true;

  const blinkingClass = getBlinkingClass({ ...room, isAlarmSilenced });

  // Calculate time until offline
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const OFFLINE_THRESHOLD = 60000; // 60 seconds
      const timeSinceUpdate = now - (room.lastUpdated || now);
      const remainingTime = Math.max(
        0,
        Math.ceil((OFFLINE_THRESHOLD - timeSinceUpdate) / 1000),
      );
      setTimeUntilOffline(remainingTime);
    }, 1000); // Update every second
    return () => clearInterval(timer);
  }, [room.lastUpdated]);

  const handlePowerClick = () => {
    toggleRoomSilence(room.nodeId);
  };

  return (
    <div
      className={`rounded-2xl shadow-md p-6 w-full max-w-full transition duration-300 transform hover:-translate-y-1 cursor-pointer ${
        room.isOffline
          ? "bg-gray-300"
          : blinkingClass
            ? blinkingClass
            : "bg-white"
      }`}
      onClick={() => showRoomChart(room)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <FaHome className="text-2xl md:text-3xl text-gray-800" />
          <span className="text-xl md:text-2xl font-bold text-gray-800">
            {room.roomName}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePowerClick();
          }}
          disabled={room.isOffline}
          className={`p-1 rounded-full transition-colors ${
            room.isOffline
              ? "cursor-not-allowed opacity-50"
              : `cursor-pointer ${
                  isAlarmSilenced
                    ? "bg-gray-200 hover:bg-gray-300"
                    : "bg-green-100 hover:bg-green-200"
                }`
          }`}
          aria-label="Silence Alarm"
        >
          <FaPowerOff
            className={`text-2xl ${
              isAlarmSilenced ? "text-gray-500" : "text-green-600"
            }`}
          />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-4">
        <div>
          <div className="text-sm font-semibold text-gray-700 flex items-center gap-1">
            Temperature
          </div>
          <div className="flex items-center gap-1 text-lg font-bold text-gray-800">
            {room.isOffline ? 0 : room.temperature}°C
            <FaThermometerHalf className="text-base text-gray-500" />
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-700 flex items-center gap-1">
            Carbon monoxide
          </div>
          <div className="flex items-center gap-1 text-lg font-bold text-gray-800">
            {room.isOffline ? 0 : room.carbonMonoxide}
            <span className="text-xs font-normal text-gray-500">ratio</span>
            <MdCo2 className="text-2xl text-gray-500" />
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-700 flex items-center gap-1">
            Humidity
          </div>
          <div className="flex items-center gap-1 text-lg font-bold text-gray-800">
            {room.isOffline ? 0 : room.humidity}%
            <FaCloud className="text-base text-gray-500" />
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-700 flex items-center gap-1">
            Smoke and Gas
          </div>
          <div className="flex items-center gap-1 text-lg font-bold text-gray-800">
            {room.isOffline ? 0 : room.smoke}
            <span className="text-xs font-normal text-gray-500">ratio</span>
            <GiSmokeBomb className="text-2xl text-gray-500" />
          </div>
        </div>
      </div>
      <hr className="my-2 border-gray-300" />
      <div className="flex justify-between items-center pt-2">
        <span className="text-sm md:text-lg font-semibold text-gray-700">
          Status
        </span>
        <span className="text-sm md:text-lg font-bold text-gray-800">
          {room.status}
        </span>
      </div>
      {!room.isOffline && (
        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
          <span>Last Update: {room.sensorTimestampString || "N/A"}</span>
          <span
            className={`px-2 py-1 rounded ${
              timeUntilOffline <= 10
                ? "bg-red-100 text-red-700 font-semibold"
                : timeUntilOffline <= 30
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-700"
            }`}
          >
            Offline in: {timeUntilOffline}s
          </span>
        </div>
      )}
    </div>
  );
}
