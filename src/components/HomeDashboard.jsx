import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  format,
  startOfDay,
  endOfMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
} from "date-fns";
import {
  Plus,
  CalendarPlus,
  ListTodo,
  ArrowUpRight,
  Flag,
  ChevronLeft,
  Check,
  Search,
  Filter,
  X,
  Loader2,
  ChevronRight,
} from "lucide-react";
import {
  parseDate,
  isOpenTask,
  currentPhase,
  waitingOnYouCount,
  flattenTasks,
  formatDue,
  dueTone,
  employeeById,
  phaseStyle,
  sortedMilestones,
  isDoneStatus,
} from "../lib/workspace";
import { ICON_COLORS } from "../lib/workspace";

export function ClientMark({
  project,
  index,
  size = "h-6 w-6",
  circle = false,
}) {
  const shape = circle ? "rounded-full" : "rounded-[5px]";
  if (project?.icon) {
    return (
      <img
        src={project.icon}
        alt=""
        className={`${size} shrink-0 ${shape} object-contain bg-white ring-1 ring-[#ecece9] dark:bg-transparent dark:ring-0`}
      />
    );
  }
  return (
    <span
      className={`${size} shrink-0 ${shape} flex items-center justify-center text-[9px] font-bold text-white ${ICON_COLORS[Math.max(0, index) % ICON_COLORS.length]}`}
    >
      {(project?.title || "C").charAt(0).toUpperCase()}
    </span>
  );
}

export function Person({ emp, size = "h-6 w-6" }) {
  if (!emp) {
    return (
      <span
        className={`${size} rounded-full bg-[#ecece9] inline-block`}
        title="Unassigned"
      />
    );
  }
  return (
    <span
      title={emp.name}
      className={`${size} rounded-full text-white text-[9px] font-bold flex items-center justify-center ${emp.color || "bg-[#292929]"}`}
    >
      {emp.initials || emp.name?.charAt(0)}
    </span>
  );
}

export default function HomeDashboard({
  projects = [],
  events = [],
  onNewClient,
  onOpenTasks,
  onAddEvent,
  onViewCalendar,
  onSelectClient,
  onOpenTask,
}) {
  const today = startOfDay(new Date());

  const stats = useMemo(() => {
    const active = projects.filter(
      (p) => (p.status || "").toLowerCase() !== "on hold",
    ).length;
    return {
      clients: projects.length,
      active,
      waiting: waitingOnYouCount(projects, today),
    };
  }, [projects, today]);

  const todayTasks = useMemo(() => {
    const dueToday = [];
    projects.forEach((p) => {
      (p.tasks || []).forEach((t) => {
        if (!isOpenTask(t)) return;
        const due = parseDate(t.due_date);
        if (due && isToday(due)) dueToday.push({ ...t, project: p, due });
      });
    });
    return dueToday.slice(0, 8);
  }, [projects]);

  const upcoming = useMemo(() => {
    const items = [];
    projects.forEach((p) => {
      (p.tasks || []).forEach((t) => {
        const due = parseDate(t.due_date);
        if (!due || isBefore(due, today)) return;
        items.push({
          id: `task-${t.id}`,
          date: due,
          title: t.name,
          project: p,
          kind: "Task",
          task: t,
        });
      });
      (p.milestones || []).forEach((m) => {
        const due = parseDate(m.due_date);
        if (!due || isBefore(due, today)) return;
        items.push({
          id: `ms-${m.id}`,
          date: due,
          title: m.title,
          project: p,
          kind: "Milestone",
        });
      });
    });
    events.forEach((event) => {
      const date = parseDate(event.event_date);
      if (!date || isBefore(date, today)) return;
      items.push({
        id: `event-${event.id}`,
        date,
        title: event.title,
        project: projects.find(
          (project) => String(project.id) === String(event.project_id),
        ),
        kind: "Event",
        calendarEvent: true,
      });
    });
    items.sort((a, b) => a.date - b.date);
    return items.slice(0, 8);
  }, [projects, events, today]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[12px] text-[#8a8a86]">
          {format(today, "EEEE d MMMM")}
        </p>
        <h1 className="mt-1 text-[28px] sm:text-[32px] leading-tight font-semibold tracking-tight text-[#2f2f2c]">
          Welcome back
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onNewClient} className={chipBtn}>
            <Plus className="h-3.5 w-3.5" /> New client
          </button>
          <button type="button" onClick={onAddEvent} className={chipBtn}>
            <CalendarPlus className="h-3.5 w-3.5" /> Add event
          </button>
          <button type="button" onClick={onOpenTasks} className={chipBtn}>
            <ListTodo className="h-3.5 w-3.5" /> Open tasks
          </button>
        </div>
      </div>
      <div className="bg-white border border-[#ecece9] rounded-2xl px-5 py-4 grid grid-cols-1 min-[400px]:grid-cols-3 gap-0 min-[400px]:gap-4">
        <Stat label="Clients" value={stats.clients} />
        <Stat label="Active projects" value={stats.active} />
        <Stat label="Pending Updates" value={stats.waiting} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="bg-white border border-[#ecece9] rounded-2xl p-4 min-h-[280px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-medium text-[#3a3a37]">Today</h2>
            <button
              type="button"
              onClick={onOpenTasks}
              className="h-6 w-6 rounded-md text-[#b0b0ab] hover:bg-[#f4f4f1] flex items-center justify-center"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {todayTasks.length === 0 ? (
            <p className="text-[12px] text-[#9a9a96] py-10 text-center">
              No open tasks for today.
            </p>
          ) : (
            <>
              <p className="text-[11px] text-[#9a9a96] mb-2">
                Today {todayTasks.length}
              </p>
              <div className="space-y-1.5">
                {todayTasks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenTask?.(item)}
                    className="w-full text-left rounded-lg border-l-2 border-[#d4d4d0] bg-[#fafaf8] px-3 py-2.5 hover:bg-[#f4f4f0]"
                  >
                    <p className="text-[12px] font-medium text-[#333330] truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-[#9a9a96] truncate">
                      {item.project.title}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
        <section className="bg-white border border-[#ecece9] rounded-2xl p-4 min-h-[280px]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-medium text-[#3a3a37]">
              Upcoming events
            </h2>
            <button
              type="button"
              onClick={onAddEvent}
              className="h-6 w-6 rounded-md text-[#b0b0ab] hover:bg-[#f4f4f1] flex items-center justify-center"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-[12px] text-[#9a9a96] py-10 text-center">
              No upcoming dates on tasks or stages.
            </p>
          ) : (
            <div className="divide-y divide-[#f0f0ec]">
              {upcoming.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.task) {
                      onOpenTask?.({ ...item.task, project: item.project });
                    } else if (item.calendarEvent) {
                      onViewCalendar?.();
                    } else if (item.project) {
                      onSelectClient(item.project.id);
                    }
                  }}
                  className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-[#fafaf8]"
                >
                  <div className="w-10 shrink-0 text-center">
                    <p className="text-[13px] font-semibold text-[#2f2f2c] leading-none">
                      {format(item.date, "d")}
                    </p>
                    <p className="text-[9px] uppercase tracking-wide text-[#9a9a96] mt-0.5">
                      {format(item.date, "EEE")}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-[#333330] truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#9a9a96] truncate">
                      {item.project?.title || "Agency"}
                    </p>
                  </div>
                  <span className="text-[11px] text-[#9a9a96] flex items-center gap-1 shrink-0">
                    {item.kind === "Milestone" ? (
                      <Flag className="h-3 w-3" />
                    ) : item.kind === "Event" ? (
                      <CalendarPlus className="h-3 w-3" />
                    ) : (
                      <ListTodo className="h-3 w-3" />
                    )}
                    {item.kind}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
      <section>
        <h2 className="text-[13px] font-medium text-[#3a3a37] mb-3">
          Clients {projects.length}
        </h2>
        <div className="bg-white border border-[#ecece9] rounded-2xl divide-y divide-[#f0f0ec]">
          {projects.length === 0 ? (
            <div className="px-4 py-10 text-center text-[12px] text-[#9a9a96]">
              No clients yet. Create your first workspace.
            </div>
          ) : (
            projects.map((project, index) => {
              const stage = currentPhase(project);
              const progress = stage.total ? stage.complete / stage.total : 0;
              const waiting = (project.tasks || []).some((t) => {
                if (!isOpenTask(t)) return false;
                const due = parseDate(t.due_date);
                return due && (isToday(due) || isBefore(due, today));
              });
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onSelectClient(project.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#fafaf8]"
                >
                  <ClientMark project={project} index={index} />
                  <span className="flex-1 min-w-0 text-[13px] font-medium text-[#333330] truncate">
                    {project.title}
                  </span>
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    {waiting && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                        1 waiting
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${stage.className}`}
                    >
                      {stage.label}
                    </span>
                    <div className="w-16 h-1 rounded-full bg-[#ecece9] overflow-hidden">
                      <div
                        className="h-full bg-[#c8c8c3]"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#9a9a96] w-8 text-right">
                      {stage.complete}/{stage.total || 0}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

const chipBtn =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#e4e4e1] bg-white text-[12px] font-medium text-[#3a3a37] hover:bg-[#f7f7f5]";

function Stat({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#ecece9] py-2 last:border-b-0 min-[400px]:block min-[400px]:border-0 min-[400px]:py-0">
      <p className="text-[11px] text-[#8f8f8b]">{label}</p>
      <p className="text-[20px] leading-none font-semibold text-[#2f2f2c] min-[400px]:mt-1 min-[400px]:text-[26px]">
        {value}
      </p>
    </div>
  );
}

export function UpdatesView({ projects = [], onSelectClient }) {
  const items = useMemo(() => {
    const rows = [];
    projects.forEach((p, projectIndex) => {
      (p.tasks || []).forEach((t) => {
        rows.push({
          id: `t-${t.id}`,
          title: t.name,
          meta: `${p.title} • ${t.status || "pending"}`,
          project: p,
          projectIndex,
          projectId: p.id,
          stamp: t.updated_at || t.created_at || p.updated_at || p.created_at,
        });
      });
      (p.milestones || []).forEach((m) => {
        rows.push({
          id: `m-${m.id}`,
          title: m.title,
          meta: `${p.title} • ${m.status || "pending"}`,
          project: p,
          projectIndex,
          projectId: p.id,
          stamp: m.updated_at || m.created_at || p.updated_at || p.created_at,
        });
      });
    });
    rows.sort((a, b) => new Date(b.stamp || 0) - new Date(a.stamp || 0));
    return rows.slice(0, 40);
  }, [projects]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-[#2f2f2c]">
          Updates
        </h1>
        <p className="text-[12px] text-[#8a8a86] mt-1">
          Recent tasks and stage activity across clients.
        </p>
      </div>
      <div className="bg-white border border-[#ecece9] rounded-2xl divide-y divide-[#f0f0ec] overflow-hidden">
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-[12px] text-[#9a9a96]">
            No updates yet.
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectClient(item.projectId)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#fafaf8]"
            >
              <ClientMark
                project={item.project}
                index={item.projectIndex}
                size="h-7 w-7"
                circle
              />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-[#333330]">
                  {item.title}
                </span>
                <span className="block truncate text-[11px] text-[#9a9a96]">
                  {item.meta}
                </span>
                <span className="block text-[10px] text-[#9a9a96]">
                  {formatUpdateTime(item.stamp)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function formatUpdateTime(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : format(date, "d MMM yyyy, h:mm a");
}

export function TasksInbox({
  projects = [],
  employees = [],
  onSelectClient,
  highlightTaskId,
  onToggleTask,
  onCreateTask,
}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const today = startOfDay(new Date());

  const tasks = useMemo(() => {
    let rows = flattenTasks(projects);
    if (filter === "todo")
      rows = rows.filter(
        (t) => (t.status || "pending") === "pending" || t.status === "todo",
      );
    if (filter === "doing")
      rows = rows.filter(
        (t) => t.status === "progress" || t.status === "in_progress",
      );
    if (filter === "done") rows = rows.filter((t) => !isOpenTask(t));
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.name?.toLowerCase().includes(q) ||
          t.project?.title?.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [projects, filter, query]);

  const counts = useMemo(() => {
    const all = flattenTasks(projects);
    return {
      all: all.length,
      todo: all.filter(
        (t) => (t.status || "pending") === "pending" || t.status === "todo",
      ).length,
      doing: all.filter(
        (t) => t.status === "progress" || t.status === "in_progress",
      ).length,
      done: all.filter((t) => !isOpenTask(t)).length,
    };
  }, [projects]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 text-[13px]">
          {[
            ["all", `All ${counts.all}`],
            ["todo", `To do ${counts.todo}`],
            ["doing", `Doing ${counts.doing}`],
            ["done", `Done ${counts.done}`],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`h-8 px-3 rounded-lg ${
                filter === id
                  ? "bg-white border border-[#e4e4e1] font-medium text-[#2f2f2c]"
                  : "text-[#8a8a86] hover:bg-white/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="h-8 min-w-0 flex-1 px-2 rounded-lg border border-[#ecece9] bg-white flex items-center gap-1.5 sm:flex-none">
            <Search className="h-3.5 w-3.5 text-[#b0b0ab]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks"
              className="min-w-0 flex-1 text-[12px] outline-none bg-transparent sm:w-36 sm:flex-none"
            />
          </div>
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterMenuOpen((open) => !open)}
              aria-label="Filter tasks"
              aria-expanded={filterMenuOpen}
              title="Filter tasks"
              className="h-8 w-8 rounded-lg border border-[#ecece9] bg-white inline-flex items-center justify-center text-[#787774] hover:bg-[#f7f7f5]"
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
            {filterMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-36 rounded-md border border-[#e5e5e2] bg-white p-1 shadow-lg">
                {[
                  ["all", "All tasks"],
                  ["todo", "To do"],
                  ["doing", "In progress"],
                  ["done", "Done"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setFilter(value);
                      setFilterMenuOpen(false);
                    }}
                    aria-pressed={filter === value}
                    className={`block w-full rounded px-2 py-1.5 text-left text-xs ${filter === value ? "bg-[#f0f0ed] font-medium text-[#30302e]" : "text-[#5f5f5b] hover:bg-[#f7f7f5]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => onCreateTask?.(new Date())}
              aria-label="Add task"
              title="Add task"
              className="h-8 w-8 rounded-md bg-[#20201e] text-white inline-flex items-center justify-center hover:bg-black"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white border border-[#ecece9] rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[minmax(0,2fr)_120px_110px_90px_70px_90px] gap-2 px-4 py-2.5 text-[11px] font-semibold text-[#9a9a96] border-b border-[#f0f0ec] bg-[#fafafa]">
          <span>Task</span>
          <span>Client / Project</span>
          <span>Assignee</span>
          <span>Due date</span>
          <span>Phase</span>
          <span>Created</span>
        </div>
        {tasks.length === 0 ? (
          <p className="px-4 py-12 text-center text-[12px] text-[#9a9a96]">
            No tasks in this view.
          </p>
        ) : (
          tasks.map((task) => {
            const assignee = employeeById(employees, task.assignee_id);
            const phase = currentPhase(task.project);
            const created = parseDate(task.created_at);
            const highlighted = String(highlightTaskId) === String(task.id);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() =>
                  onSelectClient(task.project.id, "tasks", task.id)
                }
                className={`w-full min-w-0 grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_120px_110px_90px_70px_90px] gap-1 md:gap-2 px-3 md:px-4 py-3 md:py-2.5 text-left border-b border-[#f5f5f2] hover:bg-[#fafaf8] ${
                  highlighted ? "bg-[#f7f7f3]" : ""
                }`}
              >
                <span className="hidden md:flex items-center gap-2 min-w-0">
                  <span
                    role="presentation"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTask?.(task);
                    }}
                    className={`h-4 w-4 rounded-full border shrink-0 flex items-center justify-center ${
                      isOpenTask(task)
                        ? "border-[#d4d4d0]"
                        : "border-emerald-500 bg-emerald-500 text-white"
                    }`}
                  >
                    {!isOpenTask(task) && <Check className="h-3 w-3" />}
                  </span>
                  <span className="text-[13px] text-[#333330] truncate">
                    {task.name}
                  </span>
                </span>
                <span className="md:hidden flex min-w-0 items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      role="presentation"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleTask?.(task);
                      }}
                      className={`h-4 w-4 rounded-full border shrink-0 flex items-center justify-center ${
                        isOpenTask(task)
                          ? "border-[#d4d4d0]"
                          : "border-emerald-500 bg-emerald-500 text-white"
                      }`}
                    >
                      {!isOpenTask(task) && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 truncate text-[13px] font-medium text-[#333330]">
                      {task.name}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 whitespace-nowrap text-[11px] ${dueTone(task.due_date, today)}`}
                  >
                    {formatDue(task.due_date) || "No due date"}
                  </span>
                </span>
                <span className="md:hidden flex min-w-0 items-center gap-1.5 pl-6 text-[11px] text-[#6f6f6c]">
                  <ClientMark
                    project={task.project}
                    index={Math.max(
                      0,
                      projects.findIndex(
                        (project) => project.id === task.project.id,
                      ),
                    )}
                    size="h-4 w-4"
                    circle
                  />
                  <span className="truncate">{task.project.title}</span>
                </span>
                <span className="hidden md:flex items-center gap-1.5 min-w-0 text-[12px] text-[#6f6f6c] truncate">
                  <ClientMark
                    project={task.project}
                    index={Math.max(
                      0,
                      projects.findIndex(
                        (project) => project.id === task.project.id,
                      ),
                    )}
                    size="h-5 w-5"
                    circle
                  />
                  <span className="truncate">{task.project.title}</span>
                </span>
                <span className="hidden md:flex items-center gap-1.5">
                  <Person emp={assignee} />
                </span>
                <span
                  className={`hidden md:block text-[12px] ${dueTone(task.due_date, today)}`}
                >
                  {formatDue(task.due_date) || "—"}
                </span>
                <span className="hidden md:block text-[12px] text-[#8a8a86] truncate">
                  {phase.label}
                </span>
                <span className="hidden md:block text-[12px] text-[#9a9a96]">
                  {created ? format(created, "d MMM yyyy") : "Not recorded"}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function CalendarView({
  projects = [],
  events = [],
  onSelectClient,
  onOpenTask,
  onCreateEvent,
  onCreateTask,
  openCreate = false,
  onCreateOpened,
}) {
  const [cursor, setCursor] = useState(new Date());
  const [itemFilter, setItemFilter] = useState("tasks");
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [eventProjectId, setEventProjectId] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const showTasks = [
    "tasks",
    "tasks-milestones",
    "tasks-events",
    "all",
  ].includes(itemFilter);
  const showMilestones = ["milestones", "tasks-milestones", "all"].includes(
    itemFilter,
  );
  const showEvents = ["events", "tasks-events", "all"].includes(itemFilter);

  useEffect(() => {
    if (!openCreate) return;
    setIsEventModalOpen(true);
    onCreateOpened?.();
  }, [openCreate, onCreateOpened]);

  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = [];
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d);

  const bars = useMemo(() => {
    const items = [];
    projects.forEach((p) => {
      const ms = sortedMilestones(p);
      ms.forEach((m, i) => {
        const end = parseDate(m.due_date);
        if (!end) return;
        const start =
          i === 0
            ? parseDate(p.created_at) || parseDate(p.launch_date) || end
            : parseDate(ms[i - 1].due_date) || end;
        items.push({
          id: `${p.id}-${m.id}`,
          project: p,
          title: m.title,
          start: start > end ? end : start,
          end,
          style: phaseStyle(m.title),
        });
      });
    });
    return items;
  }, [projects]);

  const eventsByDay = useMemo(() => {
    const map = {};
    projects.forEach((p) => {
      (p.tasks || []).forEach((t) => {
        const due = parseDate(t.due_date);
        if (!due) return;
        const key = format(due, "yyyy-MM-dd");
        map[key] = map[key] || [];
        map[key].push({
          id: `t-${t.id}`,
          title: t.name,
          project: p,
          task: t,
          kind: "task",
          color: phaseStyle(currentPhase(p).label).solid,
        });
      });
    });
    events.forEach((event) => {
      const date = parseDate(event.event_date);
      if (!date) return;
      const key = format(date, "yyyy-MM-dd");
      map[key] = map[key] || [];
      map[key].push({
        id: `event-${event.id}`,
        title: event.title,
        project: projects.find(
          (project) => String(project.id) === String(event.project_id),
        ),
        kind: "event",
        description: event.description,
        color: "#0f7b6c",
      });
    });
    return map;
  }, [projects, events]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setIsSavingEvent(true);
    try {
      const saved = await onCreateEvent?.({
        title: eventTitle,
        date: eventDate,
        projectId: eventProjectId,
        description: eventDescription,
      });
      if (!saved) return;
      setEventTitle("");
      setEventDate(format(new Date(), "yyyy-MM-dd"));
      setEventProjectId("");
      setEventDescription("");
      setIsEventModalOpen(false);
    } finally {
      setIsSavingEvent(false);
    }
  };

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-[#2f2f2c]">
            Calendar
          </h1>
          <p className="text-[12px] text-[#8a8a86] mt-1">
            Schedule view across clients.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
          <label className="flex h-8 items-center gap-1.5 rounded-lg border border-[#e4e4e1] bg-white px-2 text-[11px] font-medium text-[#5f5f5b]">
            <span className="shrink-0">Show</span>
            <select
              value={itemFilter}
              onChange={(event) => setItemFilter(event.target.value)}
              aria-label="Calendar item types"
              className="min-w-0 max-w-36 bg-transparent text-[11px] outline-none sm:max-w-none"
            >
              <option value="tasks">Tasks only</option>
              <option value="milestones">Milestones only</option>
              <option value="events">Calendar events only</option>
              <option value="tasks-milestones">Tasks + milestones</option>
              <option value="tasks-events">Tasks + events</option>
              <option value="all">All calendar items</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setIsEventModalOpen(true)}
            className={chipBtn}
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Add event
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className={chipBtn}
          >
            Today
          </button>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setCursor(subMonths(cursor, 1))}
              className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="w-32 text-center text-[12px] font-medium sm:w-36 sm:text-[14px]">
              {format(cursor, "MMMM yyyy")}
            </span>
            <button
              type="button"
              onClick={() => setCursor(addMonths(cursor, 1))}
              className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white border border-[#ecece9] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[#f0f0ec] text-[10px] text-[#9a9a96] sm:text-[11px]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-1 py-2 font-medium sm:px-3">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className="grid grid-cols-7 border-b border-[#f0f0ec] min-h-[92px] sm:min-h-[118px]"
          >
            {week.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayMilestones = showMilestones
                ? bars.filter((bar) => {
                    const start = startOfDay(bar.start);
                    const end = startOfDay(bar.end);
                    return (
                      (isSameDay(day, start) ||
                        isSameDay(day, end) ||
                        (day > start && day < end)) &&
                      (isSameDay(day, end) ||
                        format(day, "EEE") === "Mon" ||
                        isSameDay(day, gridStart))
                    );
                  })
                : [];
              const dayEvents = (eventsByDay[key] || []).filter((item) =>
                item.kind === "task" ? showTasks : showEvents,
              );
              const dayItems = [
                ...dayMilestones.map((milestone) => ({
                  ...milestone,
                  kind: "milestone",
                })),
                ...dayEvents,
              ];
              return (
                <div
                  key={key}
                  className={`min-w-0 overflow-hidden px-1 py-1.5 border-r border-[#f5f5f2] last:border-r-0 sm:px-2 sm:py-2 ${
                    !isSameMonth(day, cursor) ? "bg-[#fbfbfa]" : ""
                  }`}
                >
                  <div
                    className="mb-1.5 flex items-center justify-between"
                    onClick={() => onCreateTask?.(day)}
                  >
                    <div
                      className={`text-[12px] ${
                        isToday(day)
                          ? "h-6 w-6 rounded-full bg-[#171717] text-white flex items-center justify-center"
                          : isSameMonth(day, cursor)
                            ? "text-[#3a3a37]"
                            : "text-[#c4c4bf]"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                    {/* <button
                    type="button"
                    onClick={() => onCreateTask?.(day)}
                    aria-label={`Add task on ${format(day, "d MMMM yyyy")}`}
                    title="Add task on this date"
                    className="flex h-5 w-5 items-center justify-center rounded text-[#8a8a86] hover:bg-[#f0f0ed] hover:text-[#20201e]"
                  >
                    <Plus className="h-3 w-3" />
                  </button> */}
                  </div>
                  <div className="min-w-0 space-y-0.5 overflow-hidden">
                    {dayItems.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        title={item.description || item.title}
                        onClick={() => {
                          if (item.kind === "task") {
                            onOpenTask?.({
                              ...item.task,
                              project: item.project,
                            });
                          } else if (item.project?.id) {
                            onSelectClient(item.project.id);
                          }
                        }}
                        className={
                          item.kind === "milestone"
                            ? `block w-full min-w-0 overflow-hidden text-left truncate rounded px-1 py-[2px] text-[9px] font-medium sm:px-1.5 sm:text-[10px] ${item.style.bar}`
                            : "flex w-full min-w-0 items-center gap-1 overflow-hidden text-left"
                        }
                      >
                        {item.kind !== "milestone" && (
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ background: item.color }}
                          />
                        )}
                        <span className="min-w-0 truncate text-[9px] text-[#5f5f5b] sm:text-[10px]">
                          {item.title}
                        </span>
                      </button>
                    ))}
                    {dayItems.length > 3 && (
                      <span className="block px-1 text-[9px] text-[#8a8a86]">
                        +{dayItems.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {isEventModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
            <form
              onSubmit={handleCreateEvent}
              className="w-full max-w-md space-y-4 rounded-xl border border-[#e9e9e7] bg-white p-5 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#30302e]">
                    Add calendar event
                  </h2>
                  <p className="mt-1 text-xs text-[#787774]">
                    Schedule an event for a client project.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="rounded-md p-1.5 text-[#787774] hover:bg-[#f4f4f1]"
                  aria-label="Close event form"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <label className="block space-y-1 text-xs font-medium text-[#3a3a37]">
                <span>Event name</span>
                <input
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="h-9 w-full rounded-md border border-[#e4e4e1] px-3 outline-none focus:border-[#579dff]"
                />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-xs font-medium text-[#3a3a37]">
                  <span>Date</span>
                  <input
                    required
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="h-9 w-full rounded-md border border-[#e4e4e1] px-3"
                  />
                </label>
                <label className="block space-y-1 text-xs font-medium text-[#3a3a37]">
                  <span>Project</span>
                  <select
                    required
                    value={eventProjectId}
                    onChange={(e) => setEventProjectId(e.target.value)}
                    className="h-9 w-full rounded-md border border-[#e4e4e1] bg-white px-3"
                  >
                    <option value="">Select a project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block space-y-1 text-xs font-medium text-[#3a3a37]">
                <span>Notes</span>
                <textarea
                  rows={3}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full resize-y rounded-md border border-[#e4e4e1] px-3 py-2 outline-none focus:border-[#579dff]"
                />
              </label>
              <div className="flex justify-end gap-2 border-t border-[#f0f0ec] pt-3">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="h-9 rounded-md border border-[#e4e4e1] px-3 text-xs font-medium text-[#5f5f5b]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvent}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#171717] px-3 text-xs font-medium text-white disabled:opacity-60"
                >
                  {isSavingEvent && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Save event
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function TaskCreateDialog({
  projects = [],
  employees = [],
  initialDate,
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [assigneeId, setAssigneeId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !projectId || !date) return;
    setIsSaving(true);
    const saved = await onSubmit({
      name: name.trim(),
      projectId,
      assigneeId: assigneeId || null,
      dueDate: date,
    });
    setIsSaving(false);
    if (saved) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-task-title"
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-xl border border-[#e9e9e7] bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="new-task-title"
              className="text-base font-semibold text-[#30302e]"
            >
              Add task
            </h2>
            <p className="mt-1 text-xs text-[#787774]">
              Add a task to a client project.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task form"
            className="rounded-md p-1.5 text-[#787774] hover:bg-[#f4f4f1]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block space-y-1 text-xs font-medium text-[#3a3a37]">
          <span>Task name</span>
          <input
            autoFocus
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-9 w-full rounded-md border border-[#e4e4e1] px-3"
          />
        </label>

        <label className="block space-y-1 text-xs font-medium text-[#3a3a37]">
          <span>Project</span>
          <select
            required
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-9 w-full rounded-md border border-[#e4e4e1] bg-white px-3"
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </label>

        {/* --- ASSIGNEE DROPDOWN FIELD --- */}
        <label className="block space-y-1 text-xs font-medium text-[#3a3a37]">
          <span>Assignee (Optional)</span>
          <select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            className="h-9 w-full rounded-md border border-[#e4e4e1] bg-white px-3"
          >
            <option value="">Unassigned</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} {emp.role ? `— ${emp.role}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-xs font-medium text-[#3a3a37]">
          <span>Due date</span>
          <input
            required
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-9 w-full rounded-md border border-[#e4e4e1] px-3"
          />
        </label>

        <div className="flex justify-end gap-2 border-t border-[#f0f0ec] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-[#e4e4e1] px-3 text-xs font-medium text-[#5f5f5b]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !projects.length}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#20201e] px-3 text-xs font-medium text-white disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add task
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProcessesView({ projects = [], onSelectClient }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-[#2f2f2c]">
          Processes
        </h1>
        <p className="text-[12px] text-[#8a8a86] mt-1">
          Live stages for every client workspace.
        </p>
      </div>
      <div className="space-y-3">
        {projects.length === 0 ? (
          <div className="bg-white border border-[#ecece9] rounded-2xl px-4 py-10 text-center text-[12px] text-[#9a9a96]">
            No client processes yet.
          </div>
        ) : (
          projects.map((project, index) => {
            const ms = sortedMilestones(project);
            const phase = currentPhase(project);
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectClient(project.id)}
                className="w-full text-left bg-white border border-[#ecece9] rounded-2xl p-4 hover:border-[#ddd]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <ClientMark project={project} index={index} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate">
                      {project.title}
                    </p>
                    <p className="text-[11px] text-[#9a9a96]">
                      {project.client_name || "Client"} • {phase.label}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${phase.className}`}
                  >
                    {phase.complete}/{phase.total || 0}
                  </span>
                </div>
                {ms.length === 0 ? (
                  <p className="text-[12px] text-[#9a9a96]">
                    No stages yet. Open the client to add a process.
                  </p>
                ) : (
                  <ol className="flex items-start gap-0 overflow-x-auto">
                    {ms.map((m, i) => {
                      const done = isDoneStatus(m.status);
                      const current = phase.milestone?.id === m.id;
                      const style = phaseStyle(m.title);
                      const subs = Array.isArray(m.subtasks) ? m.subtasks : [];
                      return (
                        <li
                          key={m.id}
                          className="flex items-start min-w-[140px]"
                        >
                          <div className="flex flex-col items-start">
                            <span
                              className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                                done
                                  ? "bg-[#171717] text-white"
                                  : current
                                    ? "bg-white border-2 border-[#171717]"
                                    : "bg-[#f3f3f0] text-[#9a9a96]"
                              }`}
                            >
                              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                            </span>
                            <span className="mt-2 text-[12px] font-medium">
                              {m.title}
                            </span>
                            <span className="text-[10px] text-[#9a9a96]">
                              {done
                                ? "Completed"
                                : current
                                  ? "In progress"
                                  : "Upcoming"}
                            </span>
                            {subs.length > 0 && (
                              <ul className="mt-2 w-[136px] space-y-1.5 border-l border-[#ecece9] pl-2.5">
                                {subs.map((s, si) => {
                                  const subDone =
                                    s.status === "complete" ||
                                    s.status === "done" ||
                                    Number(s.progress) >= 100;
                                  return (
                                    <li
                                      key={s.id || si}
                                      className="flex items-center gap-1.5"
                                    >
                                      <span
                                        className={`h-3.5 w-3.5 shrink-0 rounded-full flex items-center justify-center ${
                                          subDone
                                            ? "bg-[#171717] text-white"
                                            : "border border-[#d9d9d5] bg-white"
                                        }`}
                                      >
                                        {subDone && (
                                          <Check className="h-2.5 w-2.5" />
                                        )}
                                      </span>
                                      <span
                                        className={`truncate text-[11px] ${
                                          subDone
                                            ? "text-[#9a9a96] line-through"
                                            : "text-[#5f5f5b]"
                                        }`}
                                        title={s.title || s.name}
                                      >
                                        {s.title ||
                                          s.name ||
                                          `Sub-stage ${si + 1}`}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                          {i < ms.length - 1 && (
                            <span
                              className="flex-1 h-px mx-2 mt-3 bg-[#ecece9]"
                              style={{
                                background: done ? style.solid : "#ecece9",
                              }}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
