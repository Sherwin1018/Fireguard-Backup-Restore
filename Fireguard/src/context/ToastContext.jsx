// src/context/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000); // 4 seconds
  }, []);

  const getToastStyles = (type) => {
    switch (type) {
      case "error":
        return "bg-red-600 text-white border border-red-700";
      case "success":
        return "bg-green-600 text-white border border-green-700";
      case "warning":
        return "bg-yellow-500 text-white border border-yellow-600";
      default:
        return "bg-blue-600 text-white border border-blue-700";
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "error":
        return "❌";
      case "success":
        return "✓";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-5 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-right-5 ${getToastStyles(
              toast.type,
            )}`}
          >
            <span className="text-lg">{getIcon(toast.type)}</span>
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
