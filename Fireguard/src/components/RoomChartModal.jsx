import React, { useEffect, useState } from "react";
import { useRoomChartModal } from "../context/RoomChartModalContext";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Helper to format date as 'MAR 5 2025 9:00 pm'
function formatLogDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  let hour = date.getHours();
  const min = date.getMinutes().toString().padStart(2, "0");
  const ampm = hour >= 12 ? "pm" : "am";
  hour = hour % 12;
  hour = hour ? hour : 12;
  return `${month} ${day} ${year} ${hour}:${min} ${ampm}`;
}

export default function RoomChartModal() {
  const { modal, closeRoomChart } = useRoomChartModal();
  const room = modal.room;
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!modal.open || !room) return;
    const alertsRef = ref(db, "alerts");
    const unsub = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val() || {};
      // Filter alerts for this room/node
      const node = room.nodeId
        ? room.nodeId
        : room.roomName.replace("ROOM NO. ", "NODE");
      const arr = Object.values(data)
        .filter((alert) => alert.node === node)
        .map((alert) => ({
          ...alert,
          time: alert.timestamp, // for X axis
          temperature: alert.temperature ?? null,
          humidity: alert.humidity ?? null,
          smoke: alert.Gas_and_Smoke ?? null,
          carbonMonoxide: alert.carbon_monoxide ?? null,
          flame: alert.flame ?? null,
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setHistory(arr);
    });
    return () => unsub();
  }, [modal.open, room]);

  if (!modal.open || !room) return null;

  // Helper to render a chart for a sensor
  const renderSensorChart = (dataKey, label, color, options = {}) => (
    <div
      className={`mb-8 ${
        options.card
          ? "bg-white rounded-xl shadow-md p-4 transition-transform hover:scale-105 hover:shadow-lg"
          : ""
      }`}
    >
      <h3 className="text-lg font-semibold mb-2 text-gray-700 tracking-wide uppercase letter-spacing-1">
        {label}
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="time"
            tickFormatter={(t) => formatLogDate(t)}
            tick={{ fill: "#6b7280", fontSize: 12 }}
          />
          {options.flame ? (
            <YAxis
              domain={[0, 1]}
              ticks={[0, 1]}
              tickFormatter={(v) => (v === 1 ? "Flame Detected" : "No Flame")}
              tick={{ fill: "#6b7280", fontSize: 12 }}
            />
          ) : (
            <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
          )}
          <Tooltip
            contentStyle={{
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 8px #0001",
            }}
            labelStyle={{ color: "#374151" }}
            labelFormatter={formatLogDate}
          />
          <Legend wrapperStyle={{ color: "#6b7280", fontSize: 13 }} />
          <Line
            type={options.flame ? "stepAfter" : "monotone"}
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            dot={{ r: 3, stroke: color, strokeWidth: 2, fill: "#fff" }}
            activeDot={{ r: 6, fill: color, stroke: "#fff", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur"
      onClick={closeRoomChart}
    >
      <div
        className="bg-white/30 rounded-lg shadow-lg p-8 max-w-2xl w-full text-center relative overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-900 text-2xl cursor-pointer"
          onClick={closeRoomChart}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">
          {room.roomName} - Sensor History
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {renderSensorChart("temperature", "Temperature (°C)", "#f87171", {
            card: true,
          })}
          {renderSensorChart("humidity", "Humidity (%)", "#60a5fa", {
            card: true,
          })}
          {renderSensorChart("smoke", "Smoke (ppm)", "#a78bfa", { card: true })}
          {renderSensorChart("carbonMonoxide", "CO (ppm)", "#fbbf24", {
            card: true,
          })}
        </div>
        <hr className="my-4 border-gray-200" />
        <div className="mb-4">
          {renderSensorChart("flame", "Flame Sensor", "#34d399", {
            flame: true,
            card: true,
          })}
        </div>
      </div>
    </div>
  );
}
