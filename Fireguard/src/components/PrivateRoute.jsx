import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

// Usage: <PrivateRoute allowedRoles={["admin"]}><SettingsPage/></PrivateRoute>
export default function PrivateRoute({
  children,
  allowedRoles = ["admin", "user"],
}) {
  const { user, role, loading } = useAuth();

  if (loading) return null; // or a spinner

  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(role)) {
    // If not allowed, redirect to dashboard (could render Forbidden page instead)
    return <Navigate to="/" replace />;
  }

  return children;
}
