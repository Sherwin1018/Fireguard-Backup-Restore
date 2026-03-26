import React from "react";
import { FaHome } from "react-icons/fa";
import { FaFireAlt } from "react-icons/fa";
import { MdOutlineReportGmailerrorred } from "react-icons/md";

const stats = [
  {
    key: "totalRooms",
    label: "Total Rooms",
    icon: <FaHome className="text-white text-lg " />,
    iconBg: "bg-black",
    valueClass: "text-black",
  },
  {
    key: "alertsToday",
    label: "Alerts within the day",
    icon: <FaFireAlt className="text-white text-lg" />,
    iconBg: "bg-red-500",
    valueClass: "text-red-600",
  },
];

export default function DashboardStats({
  totalRooms,
  alertsToday,
  className = "",
}) {
  const values = { totalRooms, alertsToday };
  return (
    <div
      className={`bg-white shadow-sm rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}
    >
      {stats.map((stat) => (
        <div
          key={stat.key}
          className="flex flex-row items-center gap-2 flex-1 justify-center"
        >
          <span
            className={`w-8 h-8 flex items-center justify-center rounded-full shadow ${stat.iconBg}`}
          >
            {stat.icon}
          </span>
          <span className="text-gray-500 text-xs font-medium tracking-wide uppercase">
            {stat.label}
          </span>
          <span className={`text-xl font-bold ${stat.valueClass} ml-2`}>
            {values[stat.key]}
          </span>
        </div>
      ))}
    </div>
  );
}
