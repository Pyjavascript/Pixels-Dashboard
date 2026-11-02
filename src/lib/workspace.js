import {
  format,
  isToday,
  isBefore,
  isAfter,
  startOfDay,
  parseISO,
  isValid,
  differenceInCalendarDays,
} from "date-fns";

export const ICON_COLORS = [
  "bg-[#7c9b93]",
  "bg-[#a9bf35]",
  "bg-[#d1bd27]",
  "bg-[#e46c37]",
  "bg-[#6f8bb4]",
  "bg-[#c45c8a]",
  "bg-[#5b8a6a]",
  "bg-[#3d3d3d]",
];

export const PHASE_STYLES = [
  {
    match: /discover/i,
    label: "Discovery",
    badge: "bg-[#eef2ff] text-[#4338ca]",
    bar: "bg-[#c7d2fe] text-[#3730a3]",
    soft: "#eef2ff",
    solid: "#818cf8",
  },
  {
    match: /strateg/i,
    label: "Strategy",
    badge: "bg-[#fff1e8] text-[#c2410c]",
    bar: "bg-[#fed7aa] text-[#9a3412]",
    soft: "#fff1e8",
    solid: "#fb923c",
  },
  {
    match: /design/i,
    label: "Design",
    badge: "bg-[#f4f4f2] text-[#57534e]",
    bar: "bg-[#d6d3d1] text-[#44403c]",
    soft: "#f4f4f2",
    solid: "#a8a29e",
  },
  {
    match: /deliver|launch/i,
    label: "Delivery",
    badge: "bg-[#ecfdf3] text-[#067647]",
    bar: "bg-[#bbf7d0] text-[#166534]",
    soft: "#ecfdf3",
    solid: "#86efac",
  },
  {
    match: /wait/i,
    label: "Waiting",
    badge: "bg-[#fff7ed] text-[#c2410c]",
    bar: "bg-[#fed7aa] text-[#9a3412]",
    soft: "#fff7ed",
    solid: "#fdba74",
  },
  {
    match: /build|dev|progress/i,
    label: "Build",
    badge: "bg-[#eff6ff] text-[#1d4ed8]",
    bar: "bg-[#bfdbfe] text-[#1e40af]",
    soft: "#eff6ff",
    solid: "#60a5fa",
  },
];

export function parseDate(value) {
  if (!value) return null;
  const raw = String(value).includes("T")
    ? String(value)
    : `${String(value).split(" ")[0]}T00:00:00`;
  const d = parseISO(raw);
  return isValid(d) ? d : null;
}

export function isOpenTask(task) {
  const status = (task?.status || "").toLowerCase();
  return status !== "done" && status !== "complete";
}

export function isDoneStatus(status) {
  const s = (status || "").toLowerCase();
  return s === "done" || s === "complete";
}

export function phaseStyle(title = "") {
  return (
    PHASE_STYLES.find((s) => s.match.test(title)) || {
      label: title || "Active",
      badge: "bg-[#f3f3f0] text-[#6f6f6c]",
      bar: "bg-[#e7e5e4] text-[#57534e]",
      soft: "#f3f3f0",
      solid: "#a8a29e",
    }
  );
}

export function sortedMilestones(project) {
  return [...(project?.milestones || [])].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0),
  );
}

export function currentPhase(project) {
  const milestones = sortedMilestones(project);
  const current =
    milestones.find((m) => !isDoneStatus(m.status)) ||
    milestones[milestones.length - 1];
  const complete = milestones.filter((m) => isDoneStatus(m.status)).length;
  const onHold = String(project?.status || "").toLowerCase() === "on hold";
  const style = phaseStyle(
    onHold ? "wait" : current?.title || project?.status_note || "Active",
  );
  return {
    milestone: current,
    label: onHold ? "On Hold" : style.label,
    className: style.badge,
    complete,
    total: milestones.length,
    milestones,
  };
}

export function waitingOnYouCount(projects, today = startOfDay(new Date())) {
  return projects.reduce((count, p) => {
    return (
      count +
      (p.tasks || []).filter((t) => {
        if (!isOpenTask(t)) return false;
        const due = parseDate(t.due_date);
        if (!due) return false;
        return isBefore(due, today) || isToday(due);
      }).length
    );
  }, 0);
}

export function formatDue(value) {
  const d = parseDate(value);
  if (!d) return "";
  if (isToday(d)) return "Today";
  return format(d, "d MMM");
}

export function dueTone(value, today = startOfDay(new Date())) {
  const d = parseDate(value);
  if (!d) return "text-[#9a9a96]";
  if (isToday(d)) return "text-[#c2410c] font-semibold";
  if (isBefore(d, today)) return "text-rose-600 font-semibold";
  if (differenceInCalendarDays(d, today) <= 2) return "text-[#b45309]";
  return "text-[#6f6f6c]";
}

export function employeeById(employees, id) {
  if (!id) return null;
  return employees.find((e) => String(e.id) === String(id)) || null;
}

export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return String(name).slice(0, 2).toUpperCase() || "?";
}

export function fileKind(item) {
  const name = `${item?.title || ""} ${item?.url || ""}`.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(name) || item?.type === "image")
    return "image";
  if (/\.(mp4|mov|webm)(\?|$)/.test(name)) return "video";
  if (item?.type === "link") return "link";
  return "file";
}

export function flattenTasks(projects, { openOnly = false } = {}) {
  const rows = [];
  projects.forEach((project) => {
    (project.tasks || []).forEach((task) => {
      if (openOnly && !isOpenTask(task)) return;
      rows.push({ ...task, project });
    });
  });
  rows.sort((a, b) =>
    String(a.due_date || "9999").localeCompare(String(b.due_date || "9999")),
  );
  return rows;
}

export function isUpcoming(date, today = startOfDay(new Date())) {
  return date && (isToday(date) || isAfter(date, today) || isBefore(today, date));
}
