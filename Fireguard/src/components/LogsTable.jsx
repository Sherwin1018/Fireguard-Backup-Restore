import React, { useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

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

export default function LogsTable({ logs }) {
  const [filters, setFilters] = useState({
    date: "",
    room: "",
    alert: "",
    temperature: "",
    humidity: "",
    flame: "",
    smoke: "",
    carbonMonoxide: "",
    entryType: "",
    reportedBy: "",
    notes: "",
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const handleFilterChange = (e, key) => {
    setFilters({ ...filters, [key]: e.target.value });
    setPage(1); // Reset to first page on filter change
  };

  const filteredLogs = logs.filter((log) =>
    Object.keys(filters).every((key) =>
      (log[key] || "").toLowerCase().includes(filters[key].toLowerCase()),
    ),
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage,
  );

  // Excel Export
  const handleExportExcel = () => {
    const exportLogs = filteredLogs.map((log) => ({
      Date: log.date,
      Room: log.room,
      Alarm: log.alert,
      Temperature: log.temperature,
      Humidity: log.humidity,
      "Flame Sensor": log.flame,
      "Smoke Level": log.smoke,
      "CO Level": log.carbonMonoxide,
      "Entry Type": log.entryType,
      "Recorded By": log.reportedBy,
      Notes: log.notes,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportLogs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Logs");
    XLSX.writeFile(workbook, "Logs.xlsx");
  };

  // PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Logs", 14, 10);
    doc.autoTable({
      head: [
        [
          "Date",
          "Room",
          "Alert",
          "Temperature",
          "Humidity",
          "Flame Sensor",
          "Smoke Level",
          "CO Level",
          "Entry Type",
          "Recorded By",
          "Notes",
        ],
      ],
      body: filteredLogs.map((log) => [
        log.date,
        log.room,
        log.alert,
        log.temperature,
        log.humidity,
        log.flame,
        log.smoke,
        log.carbonMonoxide,
        log.entryType,
        log.reportedBy,
        log.notes,
      ]),
      startY: 18,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [243, 244, 246] },
    });
    doc.save("logs.pdf");
  };

  // (Acknowledgement feature removed)

  return (
    <div>
      <div className="flex justify-end items-center gap-2 mb-2">
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
          >
            Download Excel
          </button>
        </div>
      </div>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Date
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Room
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Alarm
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Temperature
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Humidity
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Flame Sensor
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Smoke Level
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                CO Level
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Entry Type
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Recorded By
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Notes
              </th>
              {/* Acknowledge column removed */}
            </tr>
            <tr className="bg-gray-50">
              {Object.keys(filters).map((key) => (
                <th className="px-2 py-2" key={key}>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
                    placeholder="Filter"
                    value={filters[key]}
                    onChange={(e) => handleFilterChange(e, key)}
                  />
                </th>
              ))}
              {/* removed acknowledge column filter placeholder */}
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map((log, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? "bg-gray-50" : ""}>
                <td className="px-4 py-3">{formatLogDate(log.date)}</td>
                <td className="px-4 py-3">{log.room}</td>
                <td className="px-4 py-3 font-semibold text-red-700">
                  {log.alert}
                </td>
                <td className="px-4 py-3">{log.temperature}</td>
                <td className="px-4 py-3">{log.humidity}</td>
                <td className="px-4 py-3">{log.flame}</td>
                <td className="px-4 py-3">{log.smoke}</td>
                <td className="px-4 py-3">{log.carbonMonoxide}</td>
                <td className="px-4 py-3">{log.entryType}</td>
                <td className="px-4 py-3">{log.reportedBy}</td>
                <td className="px-4 py-3 max-w-xs whitespace-normal break-words text-gray-600">
                  {log.notes}
                </td>
                {/* Acknowledge column removed */}
              </tr>
            ))}
            {paginatedLogs.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-6 text-gray-400">
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <div></div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500">
            {filteredLogs.length === 0
              ? "Showing 0 records"
              : `Showing ${(page - 1) * rowsPerPage + 1}-${Math.min(
                  page * rowsPerPage,
                  filteredLogs.length,
                )} of ${filteredLogs.length} records`}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages || 1}
          </span>
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
