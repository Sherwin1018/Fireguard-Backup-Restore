import React, { lazy, Suspense } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { RoomProvider } from "./context/RoomContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ToastProvider } from "./context/ToastContext";
import { AlarmModalProvider } from "./context/AlarmModalContext";
import AlarmWatcher from "./components/AlarmWatcher";
import { RoomChartModalProvider } from "./context/RoomChartModalContext";
import RoomChartModal from "./components/RoomChartModal";
import Header from "./components/Header";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";

// Lazy load heavy pages to improve initial load time
const LogsPage = lazy(() => import("./pages/LogsPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

// Loading component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600">Loading page...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AlarmModalProvider>
            <RoomProvider>
              <NotificationProvider>
                <RoomChartModalProvider>
                  <Routes>
                    {/* Auth routes: login, register, forgot password, and reset password (standalone pages) */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route
                      path="/forgot-password"
                      element={<ForgotPasswordPage />}
                    />
                    <Route
                      path="/reset-password"
                      element={<ResetPasswordPage />}
                    />
                    {/* All other routes: show sidebar and main layout */}
                    <Route
                      path="/*"
                      element={
                        <PrivateRoute>
                          <>
                            <AlarmWatcher />
                            <RoomChartModal />
                            <div className="flex h-screen overflow-hidden">
                              <Sidebar />
                              <div className="flex-1 flex flex-col min-h-0 h-screen overflow-y-auto bg-gray-50">
                                <Header />
                                <main className="flex-1 min-h-0 overflow-y-auto">
                                  <Routes>
                                    <Route path="/" element={<Dashboard />} />
                                    <Route
                                      path="/logs"
                                      element={
                                        <Suspense fallback={<PageLoader />}>
                                          <LogsPage />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="/analytics"
                                      element={
                                        <Suspense fallback={<PageLoader />}>
                                          <AnalyticsPage />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="/users"
                                      element={
                                        <Suspense fallback={<PageLoader />}>
                                          <UsersPage />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="/settings"
                                      element={
                                        <Suspense fallback={<PageLoader />}>
                                          <SettingsPage />
                                        </Suspense>
                                      }
                                    />
                                    <Route
                                      path="/profile"
                                      element={<ProfilePage />}
                                    />
                                  </Routes>
                                </main>
                              </div>
                            </div>
                          </>
                        </PrivateRoute>
                      }
                    />
                  </Routes>
                </RoomChartModalProvider>
              </NotificationProvider>
            </RoomProvider>
          </AlarmModalProvider>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
