
import React from "react";
import { format, parseISO, isSameDay, addDays } from "date-fns";
import { Clock, Calendar, Bell, ChevronRight, Check } from "lucide-react";
import { sortedMilestones, currentPhase, isDoneStatus, phaseStyle } from "../lib/workspace";

function ClientMark({ project, index, size = "h-6 w-6" }) {
  if (project?.icon) {
    return (
      <img
        src={project.icon}
        alt=""
        className={`${size} shrink-0 rounded-[5px] object-contain bg-white ring-1 ring-[#e9e9e7]`}
      />
    );
  }
  return (
    <span
      className={`${size} shrink-0 rounded-[5px] flex items-center justify-center text-[9px] font-bold text-white bg-blue-600`}
    >
      {(project?.title || "C").charAt(0).toUpperCase()}
    </span>
  );
}

export default function GlobalOverviewTab({ projects, employees, tasks, requests, onSelectProject, onRefresh }) {
  const today = new Date();
  const nextTwoDays = addDays(today, 2);
  
  const upcomingTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === "done") return false;
    const d = parseISO(t.due_date);
    return d >= today && d <= nextTwoDays;
  });

  const todaysTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    return isSameDay(parseISO(t.due_date), today);
  });

  const unreadRequests = requests.filter((r) => !r.is_read);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e9e9e7] rounded-2xl p-6" style={{ boxShadow: "none" }}>
        <h1 className="text-xl font-bold tracking-tight text-[#37352f]">Agency Dashboard Overview</h1>
        <p className="text-xs text-[#787774] mt-1">Here is a centralized summary of all active projects, schedules, and client communications.</p>
                 
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
          <div className="p-4 bg-[#fafafa] border border-[#e9e9e7] rounded-xl" style={{ boxShadow: "none" }}>
            <span className="text-[10px] font-bold text-[#787774] uppercase tracking-wider">Total Projects</span>
            <p className="text-2xl font-extrabold text-[#37352f] mt-1">{projects.length}</p>
          </div>
          <div className="p-4 bg-[#fafafa] border border-[#e9e9e7] rounded-xl" style={{ boxShadow: "none" }}>
            <span className="text-[10px] font-bold text-[#787774] uppercase tracking-wider">Upcoming Tasks (2 Days)</span>
            <p className="text-2xl font-extrabold text-blue-600 mt-1">{upcomingTasks.length}</p>
          </div>
          <div className="p-4 bg-[#fafafa] border border-[#e9e9e7] rounded-xl" style={{ boxShadow: "none" }}>
            <span className="text-[10px] font-bold text-[#787774] uppercase tracking-wider">Client Notifications</span>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">{unreadRequests.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-[#e9e9e7] rounded-2xl p-5 space-y-3" style={{ boxShadow: "none" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#787774] flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-600" /> Tasks Due in the Next 2 Days
            </h3>
            <div className="space-y-2">
              {upcomingTasks.length === 0 ? (
                <p className="text-xs text-[#9b9a97] py-3 italic">No tasks scheduled for the next 2 days.</p>
              ) : (
                upcomingTasks.map((t) => (
                  <div key={t.id} className="p-3 bg-[#fafafa] border border-[#e9e9e7] rounded-xl flex items-center justify-between text-xs" style={{ boxShadow: "none" }}>
                    <span className="font-semibold text-[#37352f]">{t.name}</span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{t.due_date}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="bg-white border border-[#e9e9e7] rounded-2xl p-5 space-y-3" style={{ boxShadow: "none" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#787774] flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-emerald-600" /> Calendar Events / Tasks For Today
            </h3>
            <div className="space-y-2">
              {todaysTasks.length === 0 ? (
                <p className="text-xs text-[#9b9a97] py-3 italic">No calendar events or tasks set for today.</p>
              ) : (
                todaysTasks.map((t) => (
                  <div key={t.id} className="p-3 bg-[#fafafa] border border-[#e9e9e7] rounded-xl flex items-center justify-between text-xs" style={{ boxShadow: "none" }}>
                    <span className="font-semibold text-[#37352f]">{t.name}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Due Today</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-[#e9e9e7] rounded-2xl p-5 space-y-3" style={{ boxShadow: "none" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#787774] flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-rose-600" /> Recent Client Message Notifications
            </h3>
            <div className="space-y-2">
              {requests.length === 0 ? (
                <p className="text-xs text-[#9b9a97] py-3 italic">No client messages or requests found.</p>
              ) : (
                requests.slice(0, 5).map((req) => (
                  <div key={req.id} className={`p-3 rounded-xl border text-xs space-y-1 ${req.is_read ? "bg-[#fafafa] border-[#e9e9e7]" : "bg-rose-50/50 border-rose-200"}`} style={{ boxShadow: "none" }}>
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#787774]">
                      <span>Client Message</span>
                      <span>{format(parseISO(req.created_at), "MMM dd, hh:mm a")}</span>
                    </div>
                    <p className="font-semibold text-[#37352f]">{req.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="bg-white border border-[#e9e9e7] rounded-2xl p-5 space-y-3" style={{ boxShadow: "none" }}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#787774]">Global Team Tasks List</h3>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {tasks.length === 0 ? (
                <p className="text-xs text-[#9b9a97] py-3 italic">No tasks assigned across projects.</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="p-2.5 bg-[#fafafa] border border-[#e9e9e7] rounded-xl flex items-center justify-between text-xs" style={{ boxShadow: "none" }}>
                    <span className="font-medium text-[#37352f] truncate max-w-[240px]">{task.name}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${task.status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                      {task.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#e9e9e7] rounded-2xl p-6 space-y-4" style={{ boxShadow: "none" }}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#787774]">All Registered Clients</h3>
        <div className="space-y-4">
          {projects.map((proj, index) => {
            const ms = sortedMilestones(proj);
            const phase = currentPhase(proj);
            return (
              <div 
                key={proj.id} 
                onClick={() => onSelectProject(proj.id)}
                className="p-4 bg-[#fafafa] border border-[#e9e9e7] rounded-xl cursor-pointer hover:border-blue-500 transition space-y-3"
                style={{ boxShadow: "none" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClientMark project={proj} index={index} size="h-8 w-8" />
                    <div>
                      <span className="text-xs font-bold text-[#37352f] block">{proj.title}</span>
                      <p className="text-[10px] text-[#787774] mt-0.5">Workspace: {proj.client_name} • {phase.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${phase.className}`}>
                      {phase.complete}/{phase.total || 0} Stages Done
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#787774]" />
                  </div>
                </div>

                {/* Stage Progression Line at the bottom */}
                {ms.length > 0 && (
                  <div className="pt-3 border-t border-[#e9e9e7] overflow-x-auto">
                    <ol className="flex items-center gap-0 w-full min-w-[280px]">
                      {ms.map((m, i, arr) => {
                        const done = isDoneStatus(m.status);
                        const current = phase.milestone?.id === m.id;
                        return (
                          <li key={m.id} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center">
                              <span
                                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                                  done
                                    ? "bg-emerald-600 text-white"
                                    : current
                                    ? "bg-white border-2 border-blue-600 text-blue-600"
                                    : "bg-[#e9e9e7] text-[#787774]"
                                }`}
                              >
                                {done ? <Check className="h-3 w-3 stroke-[3]" /> : i + 1}
                              </span>
                              <span className="mt-1 text-[10px] font-medium text-[#37352f] truncate max-w-[80px]">
                                {m.title}
                              </span>
                            </div>
                            {i < arr.length - 1 && (
                              <span
                                className="flex-1 h-0.5 mx-2 mb-4 bg-[#e9e9e7]"
                                style={{
                                  backgroundColor: done ? "#059669" : "#e9e9e7",
                                }}
                              />
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}