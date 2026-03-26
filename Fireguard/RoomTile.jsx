import React, { useState, useEffect } from "react";
import "../styles/RoomTile.css";
import Room from "../assets/room.svg";
import OccupiedIcon from "../assets/occupied.svg";
import UnoccupiedIcon from "../assets/unoccupied.svg";

// Add these constants at the top of the file, matching IoT thresholds
const TEMP_NORMAL_MAX = 40.0; // Normal indoor temp max
const TEMP_WARNING_MAX = 49.0; // Warning temp max
const HUMIDITY_NORMAL_MAX = 80.0; // Normal humidity max
const HUMIDITY_WARNING_MAX = 100.0; // Warning humidity max
const MQ2_GAS_NORMAL_MAX = 600; // Normal gas level max (Ratio ≤1.5)
const MQ2_GAS_WARNING_MAX = 1200; // Warning gas level max (Ratio ≤3.0)
const MQ7_CO_NORMAL_MAX = 600; // Normal CO level max (Ratio ≤1.5)
const MQ7_CO_WARNING_MAX = 1200; // Warning CO level max (Ratio ≤3.0)

const RoomTile = ({
  room,
  isHovered,
  onHover,
  onLeave,
  onToggleAlarm,
  onClick,
  isSelected,
}) => {
  const [showReadings, setShowReadings] = useState(false);
  const [showConditionStatus, setShowConditionStatus] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowConditionStatus((prev) => !prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const {
    number,
    temperature,
    humidity,
    mq2,
    mq7,
    flame,
    isFlameDetected,
    alarmStatus,
    isGasDetected,
    isSmokeDetected,
    isFireDetected,
    isCarbonDetected,
    alertLevel,
  } = room;

  // Update temperature condition checks to match IoT thresholds
  const HighTemperature = temperature > TEMP_WARNING_MAX;
  const ElevatedTemperature =
    temperature > TEMP_NORMAL_MAX && temperature <= TEMP_WARNING_MAX;
  const NormalTemperature = temperature <= TEMP_NORMAL_MAX && temperature !== 0;

  // Add new condition checks for other sensors
  const HighHumidity = humidity > HUMIDITY_WARNING_MAX;
  const ElevatedHumidity =
    humidity > HUMIDITY_NORMAL_MAX && humidity <= HUMIDITY_WARNING_MAX;
  const NormalHumidity = humidity <= HUMIDITY_NORMAL_MAX;

  const HighGas = mq2 > MQ2_GAS_WARNING_MAX;
  const ElevatedGas = mq2 > MQ2_GAS_NORMAL_MAX && mq2 <= MQ2_GAS_WARNING_MAX;

  const HighCO = mq7 > MQ7_CO_WARNING_MAX;
  const ElevatedCO = mq7 > MQ7_CO_NORMAL_MAX && mq7 <= MQ7_CO_WARNING_MAX;

  const isDeactivated = alarmStatus === "Deactivated";
  const isBlinkingFire = alertLevel === "Alert";
  const isBlinkingWarning = alertLevel === "Warning";

  // Update text color logic
  const temptext = HighTemperature
    ? "redtext"
    : ElevatedTemperature
      ? "yellowtext"
      : "blacktext";

  // Update dot color logic to include all conditions
  const dotColor = isDeactivated
    ? "gray"
    : isFlameDetected
      ? "red"
      : HighTemperature || HighGas || HighCO || HighHumidity
        ? "red"
        : ElevatedTemperature || ElevatedGas || ElevatedCO || ElevatedHumidity
          ? "yellow"
          : "green";

  // Update renderStatusLabels to include flame detection
  const renderStatusLabels = () => {
    if (isDeactivated) {
      return <div className="status-label deactivated">Deactivated</div>;
    }

    const labels = [];

    // Add Flame detection label first (highest priority)
    if (isFlameDetected) {
      labels.push(
        <div className="status-label danger" key="flame">
          Flame Detected!
        </div>,
      );
    }

    if (temperature > TEMP_WARNING_MAX) {
      labels.push(
        <div className="status-label danger" key="high-temp">
          High Temperature: {temperature}°C
        </div>,
      );
    } else if (temperature > TEMP_NORMAL_MAX) {
      labels.push(
        <div className="status-label warning" key="elevated-temp">
          Elevated Temperature: {temperature}°C
        </div>,
      );
    }

    if (mq2 > MQ2_GAS_WARNING_MAX) {
      labels.push(
        <div className="status-label danger" key="gas">
          High Gas Level: {mq2} ppm
        </div>,
      );
    } else if (mq2 > MQ2_GAS_NORMAL_MAX) {
      labels.push(
        <div className="status-label warning" key="gas">
          Elevated Gas Level: {mq2} ppm
        </div>,
      );
    }

    if (mq7 > MQ7_CO_WARNING_MAX) {
      labels.push(
        <div className="status-label danger" key="co">
          High CO Level: {mq7} ppm
        </div>,
      );
    } else if (mq7 > MQ7_CO_NORMAL_MAX) {
      labels.push(
        <div className="status-label warning" key="co">
          Elevated CO Level: {mq7} ppm
        </div>,
      );
    }

    if (humidity > HUMIDITY_WARNING_MAX) {
      labels.push(
        <div className="status-label danger" key="humidity">
          High Humidity: {humidity}%
        </div>,
      );
    } else if (humidity > HUMIDITY_NORMAL_MAX) {
      labels.push(
        <div className="status-label warning" key="humidity">
          Elevated Humidity: {humidity}%
        </div>,
      );
    }

    if (labels.length === 0) {
      labels.push(
        <div className="status-label normal" key="normal">
          Normal Condition
        </div>,
      );
    }

    return labels;
  };

  // Update condition display text
  const getConditionText = () => {
    if (isDeactivated) return "Deactivated";
    if (showConditionStatus) return "Condition";

    if (isFlameDetected) return "Flame Detected";
    if (HighTemperature || HighGas || HighCO || HighHumidity)
      return "Alert Condition";
    if (ElevatedTemperature || ElevatedGas || ElevatedCO || ElevatedHumidity)
      return "Warning Condition";
    return "Normal Condition";
  };

  const handleToggleAlarm = (e) => {
    e.stopPropagation();
    onToggleAlarm(number);
  };

  const handleToggleReadings = (e) => {
    e.stopPropagation();
    setShowReadings((prev) => !prev);
  };

  return (
    <div
      className={`room-tile ${isHovered ? "hovered" : ""} ${
        isDeactivated ? "deactivated-tile" : ""
      } ${isBlinkingFire ? "blinking-danger" : ""} ${
        isBlinkingWarning ? "blinking-warning" : ""
      }`}
      onMouseEnter={onHover}
      onMouseLeave={() => {
        setShowReadings(false);
        onLeave();
      }}
      onClick={onClick}
    >
      {showReadings && isHovered ? (
        <>
          <div className="tile-header">
            <span className="icon">
              <img src={Room} alt="room" />
            </span>
            <button
              className="view-readings-button"
              onClick={handleToggleReadings}
            >
              Hide Readings
            </button>
          </div>
          <div className="tile-body">
            <h3>ROOM NO. {number}</h3>
            <h4 className="sensor-readings-title">Sensor Readings</h4>
            <div className="readings-grid">
              <p>
                <strong>Temperature</strong>
              </p>
              <p>{temperature}°C</p>
              <p>
                <strong>Humidity</strong>
              </p>
              <p>{humidity}%</p>
              <p>
                <strong>Gas/Smoke</strong>
              </p>
              <p>{mq2} ppm</p>
              <p>
                <strong>Carbon</strong>
              </p>
              <p>{mq7} ppm</p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="tile-header">
            <span className="icon">
              <img src={Room} alt="room" />
            </span>
            <div className="room-header-info">
              <div className="room-condition-line">
                <span className="room-condition">{getConditionText()}</span>
                <span className={`dot ${dotColor}`}></span>
              </div>
            </div>
          </div>

          <div className="tile-body">
            <h3>ROOM NO. {number}</h3>
            {!isHovered && (
              <>
                <p className="temperature-info">
                  <strong>TEMPERATURE</strong>
                  <strong className={`${temptext}`}>{temperature}°C</strong>
                </p>
                <hr />
              </>
            )}

            {isHovered && (
              <>
                <div className="hover-status-info">{renderStatusLabels()}</div>

                <div className="alarm-row">
                  <div className="alarm-toggle">
                    <h5 style={{ fontSize: "0.9rem", margin: 0 }}>
                      Fire Alarm
                    </h5>
                    <div
                      className={`toggle-switch ${
                        alarmStatus === "Active" ? "on" : "off"
                      }`}
                      onClick={handleToggleAlarm}
                    >
                      <div className="toggle-thumb">
                        {alarmStatus === "Active" ? "ON" : "OFF"}
                      </div>
                    </div>
                  </div>

                  <button
                    className="view-readings-button"
                    onClick={handleToggleReadings}
                  >
                    View Readings
                  </button>
                </div>
              </>
            )}

            {!isHovered && (
              <p className="status-info">
                <strong>Status</strong>
                <span className={`status ${alarmStatus.toLowerCase()}`}>
                  {alarmStatus}
                </span>
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RoomTile;
