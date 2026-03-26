import React, { useEffect, useState } from "react";
import RoomTile from "../components/RoomTile";
import { useRoom } from "../context/RoomContext";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";
import DashboardStats from "../components/DashboardStats";

export default function Dashboard() {
  const { rooms } = useRoom();
  const [alertsToday, setAlertsToday] = useState(0);
  const [legendExpanded, setLegendExpanded] = useState(false);

  useEffect(() => {
    const alertsRef = ref(db, "alerts");
    const unsub = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val() || {};
      let todayCount = 0;
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10); // 'YYYY-MM-DD'
      Object.values(data).forEach((alert) => {
        if (!alert || !alert.timestamp) return;
        // Check if alert is today
        const alertDate = alert.timestamp.slice(0, 10); // 'YYYY-MM-DD'
        if (alertDate === todayStr) {
          todayCount++;
        }
      });
      setAlertsToday(todayCount);
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-4 md:ml-5 flex flex-col min-h-screen text-sm md:text-base bg-gray-50">
      {/* only count rooms that are not archived */}
      {(() => {
        const visibleRooms = rooms.filter((r) => !r.archived);
        return (
          <>
            <div className="mx-4 mb-4 flex flex-col xl:flex-row gap-4 xl:items-stretch">
              <div className="flex-1 min-w-0">
                <DashboardStats
                  totalRooms={visibleRooms.length}
                  alertsToday={alertsToday}
                  className="mb-0 h-full xl:h-[88px]"
                />
              </div>
              <section className="xl:w-[320px] shrink-0 h-full xl:h-[88px] bg-white border border-red-200 rounded-xl shadow-sm">
                <div className="px-3 py-1.5 h-full flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-red-700 tracking-wide uppercase">
                        Emergency Contact
                      </p>
                      <h2 className="text-xs font-bold text-gray-800 mt-0.5 truncate">
                        Panabo City Fire Station
                      </h2>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                      Fire Response
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <a
                      href="tel:0848231773"
                      className="flex flex-col rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] leading-3 text-red-800 hover:bg-red-100 transition-colors"
                    >
                      <span className="font-medium">Landline</span>
                      <span className="font-bold">(084) 823 - 1773</span>
                    </a>
                    <a
                      href="tel:09284587586"
                      className="flex flex-col rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] leading-3 text-red-800 hover:bg-red-100 transition-colors"
                    >
                      <span className="font-medium">SMART</span>
                      <span className="font-bold">0928-458-7586</span>
                    </a>
                  </div>
                </div>
              </section>
            </div>
            <div className="flex flex-wrap justify-center gap-6 px-4 mb-24 md:mb-32">
              {visibleRooms.map((room, idx) => (
                <div
                  key={room.nodeId || idx}
                  className="flex justify-center flex-grow flex-shrink basis-[240px] max-w-[320px]"
                >
                  <RoomTile {...room} />
                </div>
              ))}
            </div>
          </>
        );
      })()}
      {/* Legend Footer: sticky at bottom of viewport */}
      <footer className="sticky bottom-0 w-full z-10 mt-auto">
        <div className="bg-gray-700 backdrop-blur-sm rounded-xl shadow-md p-3 md:p-3 flex flex-col md:flex-row md:items-center md:justify-center gap-3 md:gap-4 text-xs md:text-sm border border-gray-700">
          {/* Mobile: Legend label and Show details button in one row */}
          <div className="md:hidden flex items-center justify-between w-full">
            <span className="font-semibold text-white">Legend:</span>
            <button
              className="text-xs px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              onClick={() => setLegendExpanded((v) => !v)}
              aria-expanded={legendExpanded}
              aria-controls="mobile-legend-details"
            >
              {legendExpanded ? "Hide details" : "Show details"}
            </button>
          </div>
          <div className="w-full text-gray-300">
            {/* Mobile: stacked details (toggle) - unchanged behavior */}
            <div
              id="mobile-legend-details"
              className={`${
                legendExpanded ? "block" : "hidden"
              } md:hidden text-gray-300`}
            >
              <span className="mr-3 md:mr-4 block">
                <span className="font-semibold text-white">Temperature:</span>{" "}
                Normal {"<"}
                40°C, Warning 40-49°C, Alert {">"}50°C
              </span>
              <span className="mr-3 md:mr-4 block">
                <span className="font-semibold text-white">
                  Smoke and Gas (ratio):
                </span>{" "}
                Normal {"≤"}
                1.5, Warning 1.6-3.0, Alert {">"}3.0
              </span>
              <span className="mr-3 md:mr-4 block">
                <span className="font-semibold text-white">CO (ratio):</span>{" "}
                Normal {"≤"}1.5, Warning 1.6-3.0, Alert {">"}3.0
              </span>
              <span className="mr-3 md:mr-4 block">
                <span className="font-semibold text-white">Humidity:</span>{" "}
                Normal {"≤"}
                80%, Warning 81-100%, Alert {">"}100%
              </span>
              <span className="block">
                <span className="font-semibold text-white">Flame:</span> Alert
                if detected
              </span>
            </div>

            {/* Desktop: legend layout matching the provided screenshot (centered) */}
            <div className="hidden md:flex md:items-center md:justify-center md:gap-6 w-full">
              <div className="flex flex-col items-start ml-16 mr-4">
                <span className="font-semibold text-white mb-2 ml-16">
                  Legend:
                </span>
                <div className="flex items-center gap-2 mb-2 ml-16">
                  <span className="inline-block w-4 h-4 rounded-[4px] bg-yellow-400 animate-pulse"></span>
                  <span className="text-gray-300">Warning</span>
                </div>
                <div className="flex items-center gap-2 ml-16">
                  <span className="inline-block w-4 h-4 rounded-[4px] bg-red-500 animate-pulse"></span>
                  <span className="text-gray-300">Alert</span>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-x-16 text-sm mx-auto mt-2 text-gray-300">
                <div className="font-semibold">Temperature</div>
                <div className="font-semibold">Smoke and Gas</div>
                <div className="font-semibold">Carbon monoxide</div>
                <div className="font-semibold">Humidity</div>
                <div className="font-semibold">Flame</div>

                <div>40-49°C</div>
                <div>1.6-3.0 ratio</div>
                <div>1.6-3.0 ratio</div>
                <div>81-100%</div>
                <div className="text-gray-500 mt-2">—</div>

                <div>Above 50°C</div>
                <div>Above 3.0 ratio</div>
                <div>Above 3.0 ratio</div>
                <div>Above 100%</div>
                <div>If detected</div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
