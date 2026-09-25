import React from "react";
import { ShieldCheck } from "lucide-react";


export default function Navbar({
  projectsCount,
  employeesCount,
  viewMode,
  setViewMode,
  activeTab,
  setActiveTab,
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#e9e9e7] px-4 py-3">
      <div className="max-w-[1100px] mx-auto flex items-center justify-between">
        <div className="flex items-center items-center gap-2">
          <img src="./logo.svg" className="w-6" />
          <span className="font-semibold text-sm tracking-tight hidden sm:inline">
            Pixels Creative Technologies
          </span>
        </div>

        {/* Center Desktop Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-[#f0efe9] p-1 rounded-full text-xs font-semibold text-[#787774]">
          <button
            onClick={() => {
              setViewMode("admin");
              setActiveTab("overview");
            }}
            className={`px-4 py-1.5 rounded-full transition ${
              viewMode === "admin" && activeTab === "overview"
                ? "bg-white text-[#37352f] shadow-sm"
                : "hover:text-[#37352f]"
            }`}
          >
            Current Project
          </button>
          <button
            onClick={() => {
              setViewMode("admin");
              setActiveTab("all-projects");
            }}
            className={`px-4 py-1.5 rounded-full transition ${
              viewMode === "admin" && activeTab === "all-projects"
                ? "bg-white text-[#37352f] shadow-sm"
                : "hover:text-[#37352f]"
            }`}
          >
            All Projects ({projectsCount})
          </button>
          <button
            onClick={() => {
              setViewMode("admin");
              setActiveTab("employees");
            }}
            className={`px-4 py-1.5 rounded-full transition ${
              viewMode === "admin" && activeTab === "employees"
                ? "bg-white text-[#37352f] shadow-sm"
                : "hover:text-[#37352f]"
            }`}
          >
            Team ({employeesCount})
          </button>
        </nav>

        {/* Client View Toggle */}
        <button
          onClick={() => setViewMode(viewMode === "admin" ? "client" : "admin")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
            viewMode === "client"
              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
              : "bg-white text-[#37352f] border-[#e9e9e7] hover:bg-[#f7f6f3]"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {viewMode === "admin" ? "Switch to Client View" : "Back to Admin"}
        </button>
      </div>
    </header>
  );
}