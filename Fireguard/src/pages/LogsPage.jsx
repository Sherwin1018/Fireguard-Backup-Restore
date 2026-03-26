import React, { useCallback, useEffect, useState } from "react";
import LogsTable from "../components/LogsTable";
import { db } from "../firebase";
import { onValue, push, ref } from "firebase/database";
import { useRoom } from "../context/RoomContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

const MANUAL_LOG_QUEUE_KEY = "fireguard_manual_log_queue_v1";
const REPORT_CHANNEL_LABELS = {
  central_hub_sms: "Central Hub SMS",
  central_hub_call: "Central Hub Call",
  manual_observation: "Manual Observation",
};

function getDefaultDateTimeLocal() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function normalizeNodeId(value) {
  const raw = (value || "").trim().toUpperCase();
  if (!raw) return "";
  if (raw.startsWith("NODE")) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits ? `NODE${digits}` : raw;
}

function parseOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatTimestampForStorage(date) {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${safeDate.getFullYear()}-${pad(safeDate.getMonth() + 1)}-${pad(
    safeDate.getDate(),
  )} ${pad(safeDate.getHours())}:${pad(safeDate.getMinutes())}:${pad(
    safeDate.getSeconds(),
  )}`;
}

function loadQueuedManualLogs() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MANUAL_LOG_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse queued manual logs:", error);
    return [];
  }
}

function saveQueuedManualLogs(queueItems) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MANUAL_LOG_QUEUE_KEY, JSON.stringify(queueItems));
}

function formatReportChannel(channel) {
  return REPORT_CHANNEL_LABELS[channel] || "Manual Entry";
}

function formatReportedBy(alert) {
  const name = String(alert?.reported_by_name || "").trim();
  const email = String(alert?.reported_by_email || "").trim();
  const fallback = String(alert?.reported_by || "").trim();

  if (name && email && name !== email) return `${name} (${email})`;
  if (name) return name;
  if (email) return email;
  if (fallback) return fallback;

  return alert?.manualEntry ? "Unknown User" : "Central Hub";
}

const initialManualForm = {
  roomNode: "",
  customNode: "",
  message: "",
  level: "warning",
  timestamp: getDefaultDateTimeLocal(),
  temperature: "",
  humidity: "",
  smoke: "",
  carbonMonoxide: "",
  flame: "0",
  reportChannel: "central_hub_sms",
  notes: "",
};

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const { rooms } = useRoom();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState(initialManualForm);
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const alertsRef = ref(db, "alerts");
    const unsub = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const logsArr = Object.entries(data)
        .map(([id, alert]) => {
          // Find custom room name from rooms context
          let customRoomName = "-";
          if (alert && alert.node) {
            const roomObj = rooms.find((r) => r.nodeId === alert.node);
            customRoomName = roomObj
              ? roomObj.roomName
              : `ROOM NO. ${String(alert.node).replace("NODE", "")}`;
          }
          return {
            ...alert,
            id,
            date: alert && alert.timestamp ? alert.timestamp : "-",
            room: customRoomName,
            alert: alert && alert.message ? alert.message : "-",
            entryType: alert?.manualEntry
              ? `Manual (${formatReportChannel(alert.report_channel)})`
              : "Automatic",
            reportedBy: formatReportedBy(alert),
            notes:
              alert && alert.report_notes
                ? String(alert.report_notes).trim()
                : "-",
            temperature:
              alert &&
              alert.temperature !== undefined &&
              alert.temperature !== null
                ? `${alert.temperature}°C`
                : "-",
            humidity:
              alert && alert.humidity !== undefined && alert.humidity !== null
                ? `${alert.humidity}%`
                : "-",
            flame: alert && alert.flame === 1 ? "Detected" : "Not Detected",
            smoke:
              alert &&
              alert.Gas_and_Smoke !== undefined &&
              alert.Gas_and_Smoke !== null
                ? `${alert.Gas_and_Smoke} ppm`
                : "-",
            carbonMonoxide:
              alert &&
              alert.carbon_monoxide !== undefined &&
              alert.carbon_monoxide !== null
                ? `${alert.carbon_monoxide} ppm`
                : "-",
          };
        })
        .filter(
          (log) =>
            log.date !== "-" &&
            log.date !== undefined &&
            log.date !== null &&
            log.date !== "",
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setLogs(logsArr);
    });
    return () => unsub();
  }, [rooms]);

  const enqueueManualLog = useCallback((payload) => {
    const queue = loadQueuedManualLogs();
    queue.push(payload);
    saveQueuedManualLogs(queue);
    setQueuedCount(queue.length);
  }, []);

  const syncQueuedManualLogs = useCallback(async () => {
    const queue = loadQueuedManualLogs();
    if (queue.length === 0) {
      setQueuedCount(0);
      return;
    }

    const remaining = [];
    let synced = 0;

    for (const payload of queue) {
      try {
        await push(ref(db, "alerts"), payload);
        synced++;
      } catch {
        remaining.push(payload);
      }
    }

    saveQueuedManualLogs(remaining);
    setQueuedCount(remaining.length);

    if (synced > 0) {
      showToast(
        `${synced} queued record${synced > 1 ? "s were" : " was"} synced.`,
        "success",
      );
    }
  }, [showToast]);

  useEffect(() => {
    setQueuedCount(loadQueuedManualLogs().length);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleOnline = () => {
      setIsOnline(true);
      syncQueuedManualLogs();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    syncQueuedManualLogs();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncQueuedManualLogs]);

  const handleManualFieldChange = (key, value) => {
    setManualForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetManualForm = useCallback(() => {
    setManualForm((prev) => ({
      ...initialManualForm,
      roomNode: prev.roomNode,
      customNode: prev.customNode,
      level: prev.level,
      reportChannel: prev.reportChannel,
      timestamp: getDefaultDateTimeLocal(),
    }));
  }, []);

  const handleManualSubmit = async (e) => {
    e.preventDefault();

    const message = manualForm.message.trim();
    if (!message) {
      showToast("Please provide an alarm message for this record.", "warning");
      return;
    }

    const selectedNode =
      manualForm.roomNode || normalizeNodeId(manualForm.customNode);
    if (!selectedNode) {
      showToast("Select a room or enter a node ID (e.g. NODE1).", "warning");
      return;
    }

    const selectedRoom = rooms.find((room) => room.nodeId === manualForm.roomNode);
    const level = String(manualForm.level || "warning").toLowerCase();
    const timestampDate = manualForm.timestamp
      ? new Date(manualForm.timestamp)
      : new Date();
    const safeTimestamp = Number.isNaN(timestampDate.getTime())
      ? new Date()
      : timestampDate;

    const payload = {
      node: selectedNode,
      room:
        selectedRoom?.roomName ||
        `ROOM NO. ${String(selectedNode).replace("NODE", "")}`,
      message,
      level,
      alert_level: level,
      temperature: parseOptionalNumber(manualForm.temperature),
      humidity: parseOptionalNumber(manualForm.humidity),
      Gas_and_Smoke: parseOptionalNumber(manualForm.smoke),
      carbon_monoxide: parseOptionalNumber(manualForm.carbonMonoxide),
      flame: Number(manualForm.flame) === 1 ? 1 : 0,
      timestamp: formatTimestampForStorage(safeTimestamp),
      manualEntry: true,
      report_channel: manualForm.reportChannel,
      report_notes: manualForm.notes.trim() || null,
      reported_by: user?.displayName || user?.email || "unknown",
      reported_by_name: user?.displayName || null,
      reported_by_email: user?.email || null,
    };

    setIsSubmitting(true);

    try {
      if (!navigator.onLine) {
        enqueueManualLog(payload);
        showToast(
          "No internet connection. Record saved locally and queued for sync.",
          "warning",
        );
      } else {
        await push(ref(db, "alerts"), payload);
        showToast("Manual record/report added to logs.", "success");
      }
      resetManualForm();
    } catch {
      enqueueManualLog(payload);
      showToast(
        "Failed to write to server. Record queued locally for automatic sync.",
        "warning",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 ml-5 space-y-4">
      <section className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              Add Manual Record/Report
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Use this when the central hub cannot upload logs due to unstable
              connection.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                isOnline
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
            {queuedCount > 0 ? (
              <>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  {queuedCount} pending sync
                </span>
                <button
                  type="button"
                  onClick={syncQueuedManualLogs}
                  disabled={!isOnline}
                  className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  Sync Pending
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setShowManualForm((v) => !v)}
              className="px-3 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
            >
              {showManualForm ? "Hide Form" : "Add Record/Report"}
            </button>
          </div>
        </div>

        {showManualForm ? (
          <form className="p-4" onSubmit={handleManualSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="text-xs text-gray-700">
                Room (optional)
                <select
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  value={manualForm.roomNode}
                  onChange={(e) =>
                    handleManualFieldChange("roomNode", e.target.value)
                  }
                >
                  <option value="">Select room</option>
                  {rooms.map((room) => (
                    <option key={room.nodeId} value={room.nodeId}>
                      {room.roomName} ({room.nodeId})
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-gray-700">
                Node ID (if room not listed)
                <input
                  type="text"
                  placeholder="NODE1"
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  value={manualForm.customNode}
                  onChange={(e) =>
                    handleManualFieldChange("customNode", e.target.value)
                  }
                />
              </label>

              <label className="text-xs text-gray-700">
                Alarm Severity
                <select
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  value={manualForm.level}
                  onChange={(e) =>
                    handleManualFieldChange("level", e.target.value)
                  }
                >
                  <option value="warning">Warning</option>
                  <option value="alert">Alert</option>
                </select>
              </label>

              <label className="text-xs text-gray-700 lg:col-span-2">
                Alarm Message
                <input
                  type="text"
                  required
                  placeholder="e.g. Smoke level rising in room NODE2"
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  value={manualForm.message}
                  onChange={(e) =>
                    handleManualFieldChange("message", e.target.value)
                  }
                />
              </label>

              <label className="text-xs text-gray-700">
                Report Timestamp
                <input
                  type="datetime-local"
                  required
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  value={manualForm.timestamp}
                  onChange={(e) =>
                    handleManualFieldChange("timestamp", e.target.value)
                  }
                />
              </label>

              <label className="text-xs text-gray-700">
                Temperature (C)
                <input
                  type="number"
                  step="0.1"
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  value={manualForm.temperature}
                  onChange={(e) =>
                    handleManualFieldChange("temperature", e.target.value)
                  }
                />
              </label>

              <label className="text-xs text-gray-700">
                Humidity (%)
                <input
                  type="number"
                  step="0.1"
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  value={manualForm.humidity}
                  onChange={(e) =>
                    handleManualFieldChange("humidity", e.target.value)
                  }
                />
              </label>

              <label className="text-xs text-gray-700">
                Smoke/Gas (ppm)
                <input
                  type="number"
                  step="0.1"
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  value={manualForm.smoke}
                  onChange={(e) =>
                    handleManualFieldChange("smoke", e.target.value)
                  }
                />
              </label>

              <label className="text-xs text-gray-700">
                CO (ppm)
                <input
                  type="number"
                  step="0.1"
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  value={manualForm.carbonMonoxide}
                  onChange={(e) =>
                    handleManualFieldChange("carbonMonoxide", e.target.value)
                  }
                />
              </label>

              <label className="text-xs text-gray-700">
                Flame Sensor
                <select
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  value={manualForm.flame}
                  onChange={(e) =>
                    handleManualFieldChange("flame", e.target.value)
                  }
                >
                  <option value="0">Not Detected</option>
                  <option value="1">Detected</option>
                </select>
              </label>

              <label className="text-xs text-gray-700">
                Report Source
                <select
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  value={manualForm.reportChannel}
                  onChange={(e) =>
                    handleManualFieldChange("reportChannel", e.target.value)
                  }
                >
                  <option value="central_hub_sms">Central Hub SMS</option>
                  <option value="central_hub_call">Central Hub Call</option>
                  <option value="manual_observation">Manual Observation</option>
                </select>
              </label>

              <label className="text-xs text-gray-700 lg:col-span-3">
                Notes (optional)
                <textarea
                  rows={2}
                  className="mt-1 w-full border border-gray-300 rounded px-2 py-2 text-sm"
                  placeholder="Additional details from the report message"
                  value={manualForm.notes}
                  onChange={(e) =>
                    handleManualFieldChange("notes", e.target.value)
                  }
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetManualForm}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Save Record"}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <LogsTable logs={logs} />
    </div>
  );
}
