import React, { useState, createContext, useContext } from "react";
import { PanelLeftOpen, PanelLeftClose, MoreVertical } from "lucide-react";
import FireguardImg from "../assets/fireguard-logo.png";
import Occupied from "../assets/occupied.svg";

const SidebarContext = createContext();

export default function Sidebar({ children }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <aside
      className={`h-screen transition-all duration-300 ease-in-out ${
        expanded ? "w-64" : "w-20"
      }`}
    >
      <nav className="h-full flex flex-col bg-blue-50 border-r-neutral-950 shadow-sm">
        <div className="p-4 pb-2 flex justify-between items-center">
          <img
            src={FireguardImg}
            className={`transition-all duration-300 ease-in-out ${
              expanded ? "w-20" : "w-10"
            }`}
            alt="Fireguard Logo"
          />
          <button
            onClick={() => setExpanded((curr) => !curr)}
            className={`transition-all duration-300 ease-in-out p-1 rounded-lg bg-gray-50 hover:bg-gray-100 ${
              expanded
                ? "absolute -left-2 mt-10 ml-63"
                : "absolute -left-2 mt-10 ml-20"
            }`}
          >
            {expanded ? (
              <PanelLeftClose size={20} />
            ) : (
              <PanelLeftOpen size={20} />
            )}
          </button>
        </div>

        <SidebarContext.Provider value={{ expanded }}>
          <ul className="flex-1 px-3">{children}</ul>
        </SidebarContext.Provider>

        <div className="border-t-0 flex p-3">
          <img src={Occupied} alt="" className="ml-1 w-7 h-7 rounded-md" />
          <div
            className={`
            flex justify-between items-center
            overflow-hidden transition-all duration-300 ease-in-out
            ${expanded ? "w-52 ml-3 opacity-100" : "w-0 opacity-0"}
          `}
          >
            <div className="leading-4">
              <h4 className="font-semibold">John Doe</h4>
              <span className="text-xs text-gray-600">johndoe@gmail.com</span>
            </div>
            <MoreVertical size={15} />
          </div>
        </div>
      </nav>
    </aside>
  );
}

function SidebarItem({ icon, text, active, alert }) {
  const { expanded } = useContext(SidebarContext);

  return (
    <li>
      <div
        className={`
        relative flex items-center py-2 px-3 my-1 font-medium rounded-md cursor-pointer
        transition-all duration-300 ease-in-out
        ${
          active
            ? "bg-gradient-to-tr from-indigo-200 to-indigo-100 text-indigo-800"
            : "hover:bg-indigo-50 text-gray-600"
        }
      `}
      >
        <div className="min-w-[20px]">{icon}</div>
        <span
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expanded ? "w-52 ml-3 opacity-100" : "w-0 opacity-0"
          }`}
        >
          {text}
        </span>
        {alert && (
          <div
            className={`absolute right-2 w-2 h-2 rounded bg-red-500 transition-all duration-300 ease-in-out ${
              expanded ? "" : "right-1 top-2"
            }`}
          />
        )}
      </div>
    </li>
  );
}

Sidebar.Item = SidebarItem;
