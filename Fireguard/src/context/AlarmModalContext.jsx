// src/context/AlarmModalContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";
import { FaExclamationTriangle, FaThermometerHalf } from "react-icons/fa";

const AlarmModalContext = createContext();

export function useAlarmModal() {
  return useContext(AlarmModalContext);
}

export function AlarmModalProvider({ children }) {
  const [modal, setModal] = useState({ open: false, alarmData: null });

  const showAlarm = useCallback((alarmData) => {
    setModal({ open: true, alarmData });
  }, []);

  const closeAlarm = useCallback(() => {
    setModal({ open: false, alarmData: null });
  }, []);

  // Determine alarm type and extract values for display
  const getAlarmDetails = (alarmData) => {
    if (!alarmData) return { type: "temperature", value: null, unit: "°C" };
    
    const room = alarmData.room || alarmData;
    const alertMsg = room.alert_message || "";
    
    // Determine alarm type for icon and value display
    if (room.fire || (alertMsg.toLowerCase().includes("flame"))) {
      return { type: "flame", value: null, unit: "" };
    }
    if (room.temperature > 55 || alertMsg.toLowerCase().includes("temp") || alertMsg.toLowerCase().includes("temperature")) {
      return { type: "temperature", value: room.temperature, unit: "°C" };
    }
    if (room.smoke > 600 || alertMsg.toLowerCase().includes("smoke") || alertMsg.toLowerCase().includes("gas")) {
      return { type: "smoke", value: room.smoke, unit: "ppm" };
    }
    if (room.carbonMonoxide > 70 || alertMsg.toLowerCase().includes("co") || alertMsg.toLowerCase().includes("carbon")) {
      return { type: "co", value: room.carbonMonoxide, unit: "ppm" };
    }
    
    // Default to temperature
    return { type: "temperature", value: room.temperature, unit: "°C" };
  };

  return (
    <AlarmModalContext.Provider value={{ showAlarm, closeAlarm }}>
      {children}
      {modal.open && modal.alarmData && (() => {
        const room = modal.alarmData.room || modal.alarmData;
        const alarmDetails = getAlarmDetails(modal.alarmData);
        const roomName = room.roomName || "Unknown Room";
        const alertMessage = room.alert_message || "";
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
              {/* Header with icon and ALARM! text */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 border border-red-300 flex items-center justify-center flex-shrink-0">
                  <FaExclamationTriangle className="text-red-600 text-lg" />
                </div>
                <h2 className="text-3xl font-bold text-red-600 uppercase">ALARM!</h2>
              </div>
              
              {/* Light pink box with alarm details */}
              <div className="bg-pink-50 border border-red-400 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  {alarmDetails.type === "temperature" && (
                    <FaThermometerHalf className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="text-gray-800 font-medium mb-2">
                      {alertMessage}
                    </div>
                    {alarmDetails.value !== null && (
                      <div className="text-gray-800 mb-1">
                        <span className="font-medium">
                          {alarmDetails.type === "temperature" ? "Temperature" : 
                           alarmDetails.type === "smoke" ? "Smoke" : 
                           alarmDetails.type === "co" ? "CO" : "Value"}
                          :{" "}
                        </span>
                        <span className="text-red-600 font-semibold">
                          {alarmDetails.value.toFixed(2)}{alarmDetails.unit}
                        </span>
                      </div>
                    )}
                    <div className="text-gray-800">
                      <span className="font-medium">Room: </span>
                      <span className="font-bold uppercase">{roomName}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Dismiss button */}
              <button
                className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors"
                onClick={closeAlarm}
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })()}
    </AlarmModalContext.Provider>
  );
}
