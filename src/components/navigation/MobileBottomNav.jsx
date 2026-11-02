import React from "react";
import { LayoutDashboard, FolderOpen, Users } from "lucide-react";

export default function MobileBottomNav({ activeTab, setActiveTab }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e9e9e7] px-6 py-2 flex items-center justify-around md:hidden"
      style={{ boxShadow: "none" }}
    >
      <button
        onClick={() => setActiveTab("overview")}
        className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
          activeTab === "overview" ? "text-blue-600" : "text-[#787774]"
        }`}
      >
        <LayoutDashboard className="h-5 w-5" />
        Overview
      </button>
      <button
        onClick={() => setActiveTab("all-projects")}
        className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
          activeTab === "all-projects" ? "text-blue-600" : "text-[#787774]"
        }`}
      >
        <FolderOpen className="h-5 w-5" />
        Projects
      </button>
      <button
        onClick={() => setActiveTab("employees")}
        className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
          activeTab === "employees" ? "text-blue-600" : "text-[#787774]"
        }`}
      >
        <Users className="h-5 w-5" />
        Team
      </button>
    </nav>
  );
}