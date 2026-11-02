import React from "react";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  ShieldCheck,
} from "lucide-react";

export default function DesktopSidebar({
  projects,
  employees = [],
  activeProject,
  activeProjectId,
  activeTab,
  setActiveProjectId,
  setActiveTab,
  activeEmployeeId,
  setActiveEmployeeId,
}) {
  return (
    <aside
      className="hidden md:flex w-64 bg-white text-[#9fadbc] flex-col shrink-0 border-r border-[#e9e9e7] select-none h-screen sticky top-0"
      style={{ boxShadow: "none" }}
    >
      <div className="h-14 px-4 flex items-center space-x-3 border-b border-[#e9e9e7]">
        <img src="./logo.svg" alt="Logo" className="h-1/2" />
        <div className="overflow-hidden">
          <h4 className="text-xs font-bold text-[#3A3B6C] truncate">
            Pixels Creative Technologies
          </h4>
          <p className="text-[10px] text-[#9fadbc]/70 truncate">
            Admin Workspace
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 text-xs overflow-y-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition ${
            activeTab === "overview"
              ? "bg-[#e9e9e7] text-[#579dff]"
              : "hover:bg-[#e9e9e7] text-[#9fadbc]"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("all-projects")}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition ${
            activeTab === "all-projects"
              ? "bg-[#e9e9e7] text-[#579dff]"
              : "hover:bg-[#e9e9e7] text-[#9fadbc]"
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          <span>All Projects ({projects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("employees")}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition ${
            activeTab === "employees"
              ? "bg-[#e9e9e7] text-[#579dff]"
              : "hover:bg-[#e9e9e7] text-[#9fadbc]"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Team Directory ({employees.length})</span>
        </button>

        {/* Employees Section Subheading */}
        <div className="pt-5 pb-2">
          <div className="px-3 text-[12px] font-medium uppercase tracking-wider text-[#9fadbc]">
            Team Members ({employees.length})
          </div>
        </div>

        <div className="space-y-1">
          {employees.map((emp) => {
            const isCurrentEmpActive =
              activeTab === "employee-detail" && activeEmployeeId === emp.id;
            return (
              <button
                key={emp.id}
                onClick={() => {
                  setActiveTab("employee-detail");
                  if (setActiveEmployeeId) setActiveEmployeeId(emp.id);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition text-left ${
                  isCurrentEmpActive
                    ? "bg-blue-50 text-blue-600 font-bold border border-blue-100"
                    : "hover:bg-[#e9e9e7] text-[#37352f]"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {emp.name?.charAt(0) || "E"}
                  </div>
                  <div className="truncate">
                    <span className="truncate text-xs block font-semibold">
                      {emp.name}
                    </span>
                    <span className="truncate text-[10px] text-[#9fadbc] block">
                      {emp.role || "Employee"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Clients Subheading Section */}
        <div className="pt-5 pb-2">
          <div className="px-3 text-[12px] font-medium uppercase tracking-wider text-[#9fadbc]">
            Clients ({projects.length})
          </div>
        </div>

        <div className="space-y-1">
          {projects.map((proj) => {
            const isCurrentActive =
              activeProjectId === proj.id && activeTab === "project-dashboard";
            const isOnHold = proj.status === "On Hold";
            return (
              <button
                key={proj.id}
                onClick={() => {
                  setActiveProjectId(proj.id);
                  setActiveTab("project-dashboard");
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition text-left ${
                  isCurrentActive
                    ? "bg-blue-50 text-blue-600 font-bold border border-blue-100"
                    : "hover:bg-[#e9e9e7] text-[#37352f]"
                }`}
                style={{ boxShadow: "none" }}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {proj.icon ? (
                    <img
                      src={proj.icon}
                      alt=""
                      className="h-5 w-5 rounded object-contain shrink-0"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {proj.client_name?.charAt(0) || "C"}
                    </div>
                  )}
                  <div className="truncate">
                    <span className="truncate text-xs block font-semibold">
                      {proj.title}
                    </span>
                    <span className="truncate text-[10px] text-[#9fadbc] block">
                      {proj.client_name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isOnHold && (
                    <span className="text-[9px] font-extrabold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
                      On Hold
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {activeProject && (
        <div
          className="p-3 m-3 bg-[#fffffc] rounded-xl border border-[#e9e9e7] space-y-2"
          style={{ boxShadow: "none" }}
        >
          <span className="text-[10px] uppercase font-bold text-[#579dff] tracking-wider block">
            Active Project
          </span>
          <p className="text-xs font-bold text-[#000] truncate">
            {activeProject.title}
          </p>
          <button
            onClick={() => {
              const clientUrl = `${window.location.origin}/client/${activeProject.client_token}`;
              navigator.clipboard.writeText(clientUrl);
              alert("Secure client portal share link copied to clipboard!");
            }}
            className="w-full mt-1 py-1.5 px-2 rounded bg-[#579dff]/10 hover:bg-[#579dff]/20 text-[#579dff] text-[11px] font-bold transition flex items-center justify-center gap-1"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Copy Secure Link</span>
          </button>
        </div>
      )}
    </aside>
  );
}