import React, { useState, createContext, useContext } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useLocation } from "react-router-dom";
import {
  PanelLeftOpen,
  PanelLeftClose,
  MoreVertical,
  LayoutDashboard,
  BookText,
  BarChart3,
  UserCircle2,
  Settings,
  User,
} from "lucide-react";
import FireguardImg from "../assets/fireguard-logo.png";
import { useNotification } from "../context/NotificationContext";
import bgAlpha from "../assets/bg-alpha.jpg";

const SidebarContext = createContext();

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const location = useLocation();
  const { dashboardAlert, logsAlert } = useNotification();
  const { user, role, loading } = useAuth();

  const navItems = [
    {
      path: "/",
      text: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      active: location.pathname === "/",
      alert: dashboardAlert,
    },
    {
      path: "/logs",
      text: "Logs",
      icon: <BookText size={20} />,
      active: location.pathname === "/logs",
      alert: logsAlert,
    },
    {
      path: "/analytics",
      text: "Reports",
      icon: <BarChart3 size={20} />,
      active: location.pathname === "/analytics",
    },
    {
      path: "/users",
      text: "Users",
      icon: <UserCircle2 size={20} />,
      active: location.pathname === "/users",
      adminOnly: true,
    },
    {
      path: "/settings",
      text: "Settings",
      icon: <Settings size={20} />,
      active: location.pathname === "/settings",
      adminOnly: true,
    },
    {
      path: "/profile",
      text: "Settings",
      icon: <Settings size={20} />,
      active: location.pathname === "/profile",
      userOnly: true,
    },
  ];

  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut } = useAuth();

  return (
    <>
      {/* Backdrop for mobile when sidebar is expanded */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setExpanded(false)}
          aria-hidden
        />
      )}
      <aside
        className={`h-screen transition-all duration-300 ease-in-out ${
          expanded ? "fixed inset-y-0 left-0 z-50 md:relative" : "relative"
        } ${expanded ? "w-64" : "w-20"}`}
      >
        <nav
          className="h-full flex flex-col border-r-blue-50 shadow-[8px_0_17px_rgba(0,0,0,0.07)] relative"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.4)), url(${bgAlpha})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="p-4 pb-2 flex justify-between items-center relative z-10">
            <img
              src={FireguardImg}
              className={`transition-all duration-300 ease-in-out ${
                expanded ? "w-50" : "w-20"
              }`}
              alt="Fireguard Logo"
            />
            <button
              onClick={() => setExpanded((curr) => !curr)}
              className={`transition-all duration-300 cursor-pointer ease-in-out p-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 ${
                expanded
                  ? "absolute -left-2 mt-10 ml-62"
                  : "absolute -left-2 mt-10 ml-19"
              }`}
            >
              {expanded ? (
                <PanelLeftClose size={20} className="text-white" />
              ) : (
                <PanelLeftOpen size={20} className="text-white" />
              )}
            </button>
          </div>

          <SidebarContext.Provider value={{ expanded }}>
            <ul className="flex-1 px-3 relative z-10">
              {navItems
                .filter((item) => {
                  if (item.adminOnly) {
                    // while loading, hide admin-only links; only show when role === 'admin'
                    return !loading && role === "admin";
                  }
                  if (item.userOnly) {
                    // Show only for non-admin users
                    return !loading && role !== "admin";
                  }
                  return true;
                })
                .map((item) => (
                  <SidebarItem
                    key={item.path}
                    icon={item.icon}
                    text={item.text}
                    to={item.path}
                    active={item.active}
                    alert={item.alert}
                  />
                ))}
            </ul>
          </SidebarContext.Provider>

          <div className="flex p-3 relative z-10">
            <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
              {user?.displayName || user?.email ? (
                <span className="text-white text-xs font-semibold">
                  {(() => {
                    const name =
                      user?.displayName || user?.email?.split("@")[0] || "U";
                    if (name.length <= 2) return name.toUpperCase().slice(0, 2);
                    const parts = name.trim().split(" ");
                    if (parts.length === 1)
                      return parts[0].slice(0, 2).toUpperCase();
                    return (
                      parts[0][0] + parts[parts.length - 1][0]
                    ).toUpperCase();
                  })()}
                </span>
              ) : (
                <User size={14} className="text-white" />
              )}
            </div>
            <div
              className={`flex justify-between items-center overflow-hidden transition-all duration-300 ease-in-out ${
                expanded ? "w-52 ml-3 opacity-100" : "w-0 opacity-0"
              }`}
            >
              <div className="leading-4 flex-1 min-w-0">
                <h4 className="font-semibold text-white truncate">
                  {user?.displayName || user?.email?.split("@")[0] || "User"}
                </h4>
                <span className="text-xs text-white/80 truncate block">
                  {user?.email || ""}
                </span>
              </div>
              <button
                className="p-1 rounded-full hover:bg-white/20 text-white flex-shrink-0 ml-2"
                onClick={() => setMenuOpen((open) => !open)}
              >
                <MoreVertical size={15} />
              </button>
            </div>
            {/* Popup menu */}
            {menuOpen && (
              <div className="absolute bottom-12 right-0 w-50 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-2 flex flex-col">
                <button
                  className="flex items-center gap-2 px-4 py-1 text-gray-800 hover:bg-gray-100 rounded"
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                >
                  {/* Logout icon */}
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}

function SidebarItem({ icon, text, to, active, alert }) {
  const { expanded } = useContext(SidebarContext);
  const [hovered, setHovered] = useState(false);

  return (
    <li className="mb-1">
      <Link
        to={to}
        className={`relative flex items-center py-2 px-4 my-1 font-medium rounded-md cursor-pointer transition-all duration-300 ease-in-out ${
          active
            ? "bg-white/20 text-white backdrop-blur-sm"
            : "hover:bg-white/10 text-white/80"
        }`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="min-w-[20px]">{icon}</div>
        {/* Expanded: show text inline. Collapsed: show tooltip on hover. */}
        {expanded ? (
          <span className="overflow-hidden transition-all duration-300 ease-in-out w-52 ml-3 opacity-100">
            {text}
          </span>
        ) : (
          hovered && (
            <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1 bg-gray-900 text-white rounded-md shadow-lg z-10 whitespace-nowrap border border-gray-700">
              {text}
            </span>
          )
        )}
        {/* Alert dot: on top of icon when collapsed, at side when expanded */}
        {alert &&
          (expanded ? (
            <div className="absolute right-2 w-2 h-2 rounded bg-red-500" />
          ) : (
            <div className="absolute top-2 left-2/3 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 z-20" />
          ))}
      </Link>
    </li>
  );
}
