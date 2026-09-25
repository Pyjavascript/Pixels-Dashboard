import React from "react";
import { LayoutDashboard, FolderOpen, Users, ShieldCheck } from "lucide-react";

export default function MobileNav({
  viewMode,
  setViewMode,
  activeTab,
  setActiveTab,
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e9e9e7] px-6 py-2 flex items-center justify-around md:hidden">
      <button
        onClick={() => {
          setViewMode("admin");
          setActiveTab("overview");
        }}
        className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
          viewMode === "admin" && activeTab === "overview"
            ? "text-blue-600"
            : "text-[#787774]"
        }`}
      >
        <LayoutDashboard className="h-5 w-5" />
        Current
      </button>
      <button
        onClick={() => {
          setViewMode("admin");
          setActiveTab("all-projects");
        }}
        className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
          viewMode === "admin" && activeTab === "all-projects"
            ? "text-blue-600"
            : "text-[#787774]"
        }`}
      >
        <FolderOpen className="h-5 w-5" />
        Projects
      </button>
      <button
        onClick={() => {
          setViewMode("admin");
          setActiveTab("employees");
        }}
        className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
          viewMode === "admin" && activeTab === "employees"
            ? "text-blue-600"
            : "text-[#787774]"
        }`}
      >
        <Users className="h-5 w-5" />
        Team
      </button>
      <button
        onClick={() => setViewMode(viewMode === "admin" ? "client" : "admin")}
        className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
          viewMode === "client" ? "text-emerald-600" : "text-[#787774]"
        }`}
      >
        <ShieldCheck className="h-5 w-5" />
        Client View
      </button>
    </nav>
  );
}