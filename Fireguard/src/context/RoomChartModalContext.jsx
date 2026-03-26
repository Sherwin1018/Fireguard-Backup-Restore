import React, { createContext, useContext, useState, useCallback } from "react";

const RoomChartModalContext = createContext();

export function useRoomChartModal() {
  return useContext(RoomChartModalContext);
}

export function RoomChartModalProvider({ children }) {
  const [modal, setModal] = useState({ open: false, room: null });

  const showRoomChart = useCallback((room) => {
    setModal({ open: true, room });
  }, []);

  const closeRoomChart = useCallback(() => {
    setModal({ open: false, room: null });
  }, []);

  return (
    <RoomChartModalContext.Provider value={{ showRoomChart, closeRoomChart, modal }}>
      {children}
    </RoomChartModalContext.Provider>
  );
}

