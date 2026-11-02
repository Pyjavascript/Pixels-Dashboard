import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  supabase,
  uploadDeliverableFile,
  uploadRequestAttachment,
} from "../lib/supabase";
import {
  ArrowUpRight,
  Plus,
  FileText,
  Link2,
  UploadCloud,
  Loader2,
  Calendar as CalendarIcon,
  Save,
  X,
  Settings2,
  Kanban as KanbanIcon,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Layers,
  Sparkles,
  Trash2,
  Bell,
  Check,
  Copy,
  Image as ImageIcon,
  Video as VideoIcon,
  Paperclip,
  Flame,
  Compass,
  Edit2,
  Users,
  MessageSquare,
  FileSignature,
  FileCheck2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  CheckCircle2,
  Send,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronDown,
  History,
} from "lucide-react";
import {
  format,
  addDays,
  subDays,
  startOfDay,
  isSameDay,
  parseISO,
  setMonth,
  setYear,
  getYear,
  getMonth,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import StageSetupModal from "./StageSetupModal";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const YEARS = Array.from({ length: 11 }, (_, i) => 2022 + i);

function getPriorityConfig(priority) {
  switch (priority?.toLowerCase()) {
    case "high":
    case "highest":
      return {
        label: "High",
        color: "bg-rose-50 border-rose-200 text-rose-800",
        icon: <Flame className="h-3 w-3 text-rose-600 shrink-0" />,
      };
    case "mid":
    case "medium":
      return {
        label: "Medium",
        color: "bg-amber-50 border-amber-200 text-amber-800",
        icon: <ArrowUp className="h-3 w-3 text-amber-600 shrink-0" />,
      };
    case "low":
    case "lowest":
      return {
        label: "Low",
        color: "bg-emerald-50 border-emerald-200 text-emerald-800",
        icon: <ArrowDown className="h-3 w-3 text-emerald-600 shrink-0" />,
      };
    default:
      return {
        label: "Medium",
        color: "bg-blue-50 border-blue-200 text-blue-800",
        icon: <Minus className="h-3 w-3 text-blue-600 shrink-0" />,
      };
  }
}

const VERSION_COLORS = [
  { solid: "bg-blue-600", soft: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
  {
    solid: "bg-emerald-600",
    soft: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
  },
  {
    solid: "bg-purple-600",
    soft: "bg-purple-50 text-purple-600 hover:bg-purple-100",
  },
  {
    solid: "bg-amber-600",
    soft: "bg-amber-50 text-amber-600 hover:bg-amber-100",
  },
  { solid: "bg-rose-600", soft: "bg-rose-50 text-rose-600 hover:bg-rose-100" },
  { solid: "bg-cyan-600", soft: "bg-cyan-50 text-cyan-600 hover:bg-cyan-100" },
];

function VersionPills({ count, active, onSelect }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {Array.from({ length: count }, (_, i) => i + 1).map((v) => {
        const c = VERSION_COLORS[(v - 1) % VERSION_COLORS.length];
        const isActive = v === active;
        return (
          <button
            key={v}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(v);
            }}
            className={`h-7 min-w-[30px] px-1 rounded-md text-[12px] font-extrabold transition ${
              isActive ? `${c.solid} text-white shadow-xs` : c.soft
            }`}
            title={`View v${v}`}
          >
            v{v}
          </button>
        );
      })}
    </div>
  );
}

const PASTEL_THEMES = [
  "bg-[#e6f9f0] border-[#9fe3c2] text-[#0f7b6c] opacity-80",
  "bg-[#fff1ed] border-[#fecdc2] text-[#c2410c] opacity-80",
  "bg-[#eef4ff] border-[#c7d9fe] text-[#3538cd] opacity-80",
  "bg-[#fdf2fa] border-[#fcceea] text-[#c11574] opacity-80",
];

function getTaskTheme(id) {
  if (!id) return PASTEL_THEMES[0];
  const charCode = id.toString().charCodeAt(id.toString().length - 1) || 0;
  return PASTEL_THEMES[charCode % PASTEL_THEMES.length];
}

function calculateDateProgress(createdAt, dueDateStr, status) {
  if (status === "done") return 100;
  if (!createdAt || !dueDateStr) return 0;

  const start = new Date(createdAt).getTime();
  const end = new Date(dueDateStr).getTime();
  const now = Date.now();

  if (isNaN(start) || isNaN(end) || end <= start) {
    return status === "done" ? 100 : 0;
  }
  if (now >= end) return 100;
  if (now <= start) return 0;

  return Math.round(((now - start) / (end - start)) * 100);
}

function isValidUrl(string) {
  if (!string || typeof string !== "string") return false;
  const trimmed = string.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("www.")
  );
}

function isTaskOnDate(taskDueDateStr, targetDate) {
  if (!taskDueDateStr) return false;
  const taskDateOnly = taskDueDateStr.split("T")[0];
  const targetDateStr = format(targetDate, "yyyy-MM-dd");
  return taskDateOnly === targetDateStr;
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "done":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "progress":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function GoogleSheetsIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} aria-hidden="true">
      <path
        fill="#0f9d58"
        d="M12 4h17l11 11v27a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
      />
      <path fill="#87ceac" d="M29 4v9a2 2 0 0 0 2 2h9z" />
      <rect x="16" y="22" width="16" height="14" rx="1" fill="#fff" />
      <path
        d="M16 26.7h16M16 31.3h16M23 22v14"
        stroke="#0f9d58"
        strokeWidth="1.6"
      />
    </svg>
  );
}

// "" = empty, null = invalid, string = normalized https link
function normalizeSheetUrl(raw) {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^www\./i.test(v)) return `https://${v}`;
  return null;
}

function SubStagePanel({ stage, onChange }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [urlError, setUrlError] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [sheetEditIndex, setSheetEditIndex] = useState(null);
  const [sheetEditValue, setSheetEditValue] = useState("");
  const [sheetEditError, setSheetEditError] = useState(false);
  const [busy, setBusy] = useState(false);

  const list = Array.isArray(stage.subtasks) ? stage.subtasks : [];
  const isDone = (s) =>
    s.status === "complete" || s.status === "done" || Number(s.progress) >= 100;
  const doneCount = list.filter(isDone).length;
  const pct = list.length ? Math.round((doneCount / list.length) * 100) : 0;

  const commit = async (next) => {
    setBusy(true);
    const ok = await onChange(next);
    setBusy(false);
    return ok;
  };

  const handleAdd = async () => {
    const t = title.trim();
    if (!t || busy) return;
    const url = normalizeSheetUrl(sheetUrl);
    if (url === null) {
      setUrlError(true);
      return;
    }
    const id =
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const ok = await commit([
      ...list,
      {
        id,
        title: t,
        due_date: dueDate || null,
        sheet_url: url || null,
        status: "pending",
        progress: 0,
      },
    ]);
    if (ok) {
      setTitle("");
      setDueDate("");
      setSheetUrl("");
      setUrlError(false);
    }
  };

  const handleToggle = (index) =>
    commit(
      list.map((s, i) =>
        i !== index
          ? s
          : isDone(s)
            ? { ...s, status: "pending", progress: 0 }
            : { ...s, status: "complete", progress: 100 },
      ),
    );

  const handleRename = async (index) => {
    const t = editTitle.trim();
    setEditingIndex(null);
    const current = list[index]?.title || list[index]?.name || "";
    if (!t || t === current) return;
    await commit(list.map((s, i) => (i === index ? { ...s, title: t } : s)));
  };

  const handleSaveSheet = async (index, clear = false) => {
    const url = clear ? "" : normalizeSheetUrl(sheetEditValue);
    if (url === null) {
      setSheetEditError(true);
      return;
    }
    const ok = await commit(
      list.map((s, i) => (i === index ? { ...s, sheet_url: url || null } : s)),
    );
    if (ok) setSheetEditIndex(null);
  };

  const handleRemove = (index) => commit(list.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[#30302e]">Sub-stages</h3>
        <span className="text-[10px] text-[#8a8a86]">
          {doneCount}/{list.length} done
        </span>
      </div>

      {list.length > 0 && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-[#e9e9e7]">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div
        className={`divide-y divide-[#efefec] rounded-lg border border-[#e5e5e2] bg-white ${busy ? "opacity-70" : ""}`}
      >
        {list.length === 0 && (
          <p className="px-3 py-5 text-center text-xs text-[#8a8a86]">
            No sub-stages yet. Add the first one below.
          </p>
        )}

        {list.map((s, index) => {
          const done = isDone(s);
          const name = s.title || s.name || `Sub-stage ${index + 1}`;
          return (
            <div key={s.id || index} className="group px-3 py-2.5">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(index)}
                  disabled={busy}
                  aria-label={
                    done ? "Reopen sub-stage" : "Mark sub-stage complete"
                  }
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                    done
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-gray-300 bg-white text-transparent hover:border-emerald-600"
                  }`}
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                </button>

                <div className="min-w-0 flex-1">
                  {editingIndex === index ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleRename(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setEditingIndex(null);
                      }}
                      className="h-6 w-full rounded border border-blue-500 bg-white px-1.5 text-xs font-medium text-[#333330] outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIndex(index);
                        setEditTitle(name);
                      }}
                      title="Click to rename"
                      className={`block w-full truncate text-left text-xs font-medium hover:text-blue-700 ${
                        done ? "text-[#9a9a96] line-through" : "text-[#333330]"
                      }`}
                    >
                      {name}
                    </button>
                  )}
                  {(s.notes || s.description) && (
                    <p className="mt-0.5 text-[10px] text-[#787774]">
                      {s.notes || s.description}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    {(s.due_date || s.date) && (
                      <span className="text-[10px] text-[#9a9a96]">
                        Due {s.due_date || s.date}
                      </span>
                    )}
                    {s.sheet_url && (
                      <a
                        href={s.sheet_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 hover:underline"
                      >
                        <GoogleSheetsIcon className="h-3 w-3" />
                        Open sheet
                        <ArrowUpRight className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSheetEditIndex(sheetEditIndex === index ? null : index);
                      setSheetEditValue(s.sheet_url || "");
                      setSheetEditError(false);
                    }}
                    title={s.sheet_url ? "Edit sheet link" : "Link a Google Sheet"}
                    aria-label={
                      s.sheet_url ? "Edit sheet link" : "Link a Google Sheet"
                    }
                    className="rounded p-1 hover:bg-[#f4f4f1]"
                  >
                    <GoogleSheetsIcon
                      className={`h-3.5 w-3.5 ${s.sheet_url ? "" : "opacity-40 grayscale"}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    disabled={busy}
                    aria-label="Delete sub-stage"
                    className="rounded p-1 text-[#9ca3af] transition hover:text-rose-600 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {sheetEditIndex === index && (
                <div className="ml-6 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={sheetEditValue}
                      onChange={(e) => {
                        setSheetEditValue(e.target.value);
                        setSheetEditError(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveSheet(index);
                        }
                        if (e.key === "Escape") setSheetEditIndex(null);
                      }}
                      placeholder="https://docs.google.com/spreadsheets/…"
                      className={`h-7 min-w-0 flex-1 rounded border bg-white px-2 text-[11px] outline-none ${
                        sheetEditError
                          ? "border-rose-400"
                          : "border-[#e5e5e2] focus:border-blue-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveSheet(index)}
                      disabled={busy}
                      className="h-7 shrink-0 rounded-md bg-blue-600 px-2.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                      Save
                    </button>
                    {s.sheet_url && (
                      <button
                        type="button"
                        onClick={() => handleSaveSheet(index, true)}
                        disabled={busy}
                        className="h-7 shrink-0 rounded-md border border-[#e5e5e2] px-2 text-[11px] font-medium text-[#5f5f5b] hover:bg-[#f7f7f5]"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {sheetEditError && (
                    <p className="mt-1 text-[10px] text-rose-600">
                      Enter a full link starting with https://
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add row */}
        <div className="space-y-2 bg-[#fafafa] px-3 py-2">
          <div className="flex items-center gap-2">
            <Plus className="h-3.5 w-3.5 shrink-0 text-[#9a9a96]" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="Add a sub-stage…"
              className="h-7 min-w-0 flex-1 bg-transparent text-xs text-[#333330] outline-none placeholder:text-[#9a9a96]"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-label="Sub-stage due date"
              className="h-7 w-[112px] shrink-0 rounded border border-[#e5e5e2] bg-white px-1.5 text-[10px] text-[#5f5f5b]"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!title.trim() || busy}
              className="h-7 shrink-0 rounded-md bg-blue-600 px-2.5 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
            >
              Add
            </button>
          </div>

          {title.trim() && (
            <div className="pl-[22px]">
              <div className="flex items-center gap-2">
                <GoogleSheetsIcon className="h-4 w-4" />
                <input
                  value={sheetUrl}
                  onChange={(e) => {
                    setSheetUrl(e.target.value);
                    setUrlError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                  placeholder="Link a Google Sheet (optional)"
                  className={`h-7 min-w-0 flex-1 rounded border bg-white px-2 text-[11px] outline-none ${
                    urlError
                      ? "border-rose-400"
                      : "border-[#e5e5e2] focus:border-blue-500"
                  }`}
                />
              </div>
              {urlError && (
                <p className="mt-1 pl-6 text-[10px] text-rose-600">
                  Enter a full link starting with https://
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SheetsList({ stage }) {
  const subs = Array.isArray(stage.subtasks) ? stage.subtasks : [];
  const rows = [
    ...(stage.sheet_url
      ? [
          {
            key: "stage",
            name: stage.title,
            kind: "Stage sheet",
            url: stage.sheet_url,
          },
        ]
      : []),
    ...subs
      .map((s, i) => ({
        key: s.id || `sub-${i}`,
        name: s.title || s.name || `Sub-stage ${i + 1}`,
        kind: "Sub-stage sheet",
        url: s.sheet_url,
      }))
      .filter((r) => r.url),
  ];

  return (
    <div className="flex min-h-72 flex-col overflow-hidden rounded-lg border border-[#e5e5e2] bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-[#efefec] px-3 py-2">
        <h3 className="text-xs font-semibold text-[#30302e]">Google Sheets</h3>
        <span className="text-[10px] text-[#8a8a86]">
          {rows.length} linked
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 py-12 text-center text-xs text-[#8a8a86]">
          <GoogleSheetsIcon className="h-7 w-7 opacity-40 grayscale" />
          <p>
            No sheets linked yet. Link one to this stage or to any sub-stage.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#efefec] overflow-y-auto">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e8f5ee]">
                <GoogleSheetsIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[#333330]">
                  {r.name}
                </p>
                <p className="truncate text-[10px] text-[#9a9a96]">
                  {r.kind} · {r.url.replace(/^https?:\/\//, "")}
                </p>
              </div>
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-[#e5e5e1] bg-white px-2.5 text-xs font-medium text-[#5f5f5b] hover:bg-[#f4f4f1]"
              >
                Open <ArrowUpRight className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ProjectDashboard({
  project,
  employees = [],
  daysRemaining,
  onRefresh,
  activeView,
  onViewChange,
  showImportantLinks = true,
}) {
  const [internalProjectTab, setInternalProjectTab] = useState("tracker");
  const activeProjectTab =
    activeView == null
      ? internalProjectTab
      : activeView === "dashboard"
        ? "tracker"
        : activeView === "tracker" ||
            (project?.custom_tabs || []).some((tab) => tab.id === activeView)
          ? activeView
          : "tracker";
  const setActiveProjectTab = (tabId) => {
    setInternalProjectTab(tabId);
    onViewChange?.(tabId === "tracker" ? "dashboard" : tabId);
  };
  const [isAddTabModalOpen, setIsAddTabModalOpen] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [isSavingTab, setIsSavingTab] = useState(false);

  const [selectedTaskModal, setSelectedTaskModal] = useState(null);
  const [calendarStartDate, setCalendarStartDate] = useState(new Date());

  // Notifications State
  const [requestsList, setRequestsList] = useState([]);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Inner Views inside Tracker Tab
  const [activeTab, setActiveTab] = useState("kanban");
  const [kanbanDate, setKanbanDate] = useState(new Date());
  const [isKanbanCalendarOpen, setIsKanbanCalendarOpen] = useState(false);

  // Modals
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isAddDeliverableModalOpen, setIsAddDeliverableModalOpen] =
    useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  // const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  // const [isStageCalendarOpen, setIsStageCalendarOpen] = useState(false);

  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null);

  // Stage Form State
  // const [editingStage, setEditingStage] = useState(null);
  // const [stageTitle, setStageTitle] = useState("");
  // const [stageDueDate, setStageDueDate] = useState("");
  // const [isSavingStage, setIsSavingStage] = useState(false);
  // const [stageCompleted, setStageCompleted] = useState(false);

  // Timeline Navigation State & Horizontal Scroll Ref
  const [timelineBaseDate, setTimelineBaseDate] = useState(new Date());
  const calendarScrollRef = useRef(null);

  // Deliverable Form State & Edit State
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [delivTitle, setDelivTitle] = useState("");
  const [delivUrl, setDelivUrl] = useState("");
  const [delivType, setDelivType] = useState("link");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileObject, setFileObject] = useState(null);

  const [selectedMilestoneModal, setSelectedMilestoneModal] = useState(null);

  const [openPriorityMenuId, setOpenPriorityMenuId] = useState(null);
  const [openStatusMenuId, setOpenStatusMenuId] = useState(null);

  const [targetFolderId, setTargetFolderId] = useState("root");

  // Supabase-backed project folders
  const [projectFolders, setProjectFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({ root: true });

  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [folderParentId, setFolderParentId] = useState("root");
  const [newFolderName, setNewFolderName] = useState("");
  const [isSavingFolder, setIsSavingFolder] = useState(false);

  const [iconFile, setIconFile] = useState(null);

  // NEW: State for Edit Project Modal to match AllProjectsTab layout
  const [removeIcon, setRemoveIcon] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(project?.team_members || []);

  useEffect(() => {
    if (!selectedMilestoneModal?.id) return;
    const latestMilestone = (project?.milestones || []).find(
      (milestone) => String(milestone.id) === String(selectedMilestoneModal.id),
    );
    if (latestMilestone && latestMilestone !== selectedMilestoneModal) {
      setSelectedMilestoneModal(latestMilestone);
    }
  }, [project?.milestones, selectedMilestoneModal?.id]);

  const toggleFolder = (folderKey) => {
    setExpandedFolders((prev) => ({ ...prev, [folderKey]: !prev[folderKey] }));
  };

  const fetchProjectFolders = async () => {
    if (!project?.id) {
      setProjectFolders([]);
      return;
    }

    const { data, error } = await supabase
      .from("project_folders")
      .select("*")
      .eq("project_id", project.id)
      .eq("tab_id", activeProjectTab)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading project folders:", error.message);
      setProjectFolders([]);
      return;
    }

    setProjectFolders(data || []);
  };

  useEffect(() => {
    fetchProjectFolders();
    setTargetFolderId("root");
    setExpandedFolders({ root: true });
  }, [project?.id, activeProjectTab]);

  // --- Deliverable Version History State ---
  const [historyModalItem, setHistoryModalItem] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [linkVersionMenu, setLinkVersionMenu] = useState(null);
  const [linkVersionData, setLinkVersionData] = useState([]);
  const [isLoadingLinkVersions, setIsLoadingLinkVersions] = useState(false);

  const handleToggleLinkVersions = async (linkKey) => {
    if (linkVersionMenu === linkKey) {
      setLinkVersionMenu(null);
      return;
    }
    setLinkVersionMenu(linkKey);
    setLinkVersionData([]);
    setIsLoadingLinkVersions(true);

    const { data, error } = await supabase
      .from("project_link_versions")
      .select("*")
      .eq("project_id", project.id)
      .eq("link_key", linkKey)
      .order("version", { ascending: false });

    setIsLoadingLinkVersions(false);
    if (error) {
      alert("Error loading link version history: " + error.message);
      return;
    }
    setLinkVersionData(data || []);
  };

  // --- Deliverable version switching ---
  const [selectedDeliverableVersions, setSelectedDeliverableVersions] =
    useState({});
  const [deliverableVersionsCache, setDeliverableVersionsCache] = useState({});
  const [loadingDeliverableVersionId, setLoadingDeliverableVersionId] =
    useState(null);

  const handleSelectDeliverableVersion = async (item, targetVersion) => {
    const currentVersion = item.version || 1;
    if (targetVersion === currentVersion) {
      setSelectedDeliverableVersions((prev) => ({
        ...prev,
        [item.id]: targetVersion,
      }));
      return;
    }
    if (deliverableVersionsCache[item.id]?.[targetVersion]) {
      setSelectedDeliverableVersions((prev) => ({
        ...prev,
        [item.id]: targetVersion,
      }));
      return;
    }

    setLoadingDeliverableVersionId(item.id);
    const { data, error } = await supabase
      .from("deliverable_versions")
      .select("*")
      .eq("deliverable_id", item.id)
      .order("version", { ascending: false });
    setLoadingDeliverableVersionId(null);

    if (error) {
      alert("Error loading version: " + error.message);
      return;
    }

    const map = {};
    (data || []).forEach((v) => {
      map[v.version] = v;
    });
    setDeliverableVersionsCache((prev) => ({ ...prev, [item.id]: map }));
    setSelectedDeliverableVersions((prev) => ({
      ...prev,
      [item.id]: targetVersion,
    }));
  };

  const getDisplayedDeliverable = (item) => {
    const currentVersion = item.version || 1;
    const selectedV = selectedDeliverableVersions[item.id] || currentVersion;
    if (selectedV === currentVersion) return item;
    return deliverableVersionsCache[item.id]?.[selectedV] || item;
  };

  // --- Project link version switching ---
  const [selectedLinkVersions, setSelectedLinkVersions] = useState({});
  const [linkVersionsCache, setLinkVersionsCache] = useState({});
  const [loadingLinkVersionKey, setLoadingLinkVersionKey] = useState(null);

  const handleSelectLinkVersion = async (link, targetVersion) => {
    if (targetVersion === link.version) {
      setSelectedLinkVersions((prev) => ({
        ...prev,
        [link.key]: targetVersion,
      }));
      return;
    }
    if (linkVersionsCache[link.key]?.[targetVersion]) {
      setSelectedLinkVersions((prev) => ({
        ...prev,
        [link.key]: targetVersion,
      }));
      return;
    }

    setLoadingLinkVersionKey(link.key);
    const { data, error } = await supabase
      .from("project_link_versions")
      .select("*")
      .eq("project_id", project.id)
      .eq("link_key", link.key)
      .order("version", { ascending: false });
    setLoadingLinkVersionKey(null);

    if (error) {
      alert("Error loading version: " + error.message);
      return;
    }

    const map = {};
    (data || []).forEach((v) => {
      map[v.version] = v;
    });
    setLinkVersionsCache((prev) => ({ ...prev, [link.key]: map }));
    setSelectedLinkVersions((prev) => ({ ...prev, [link.key]: targetVersion }));
  };

  const getDisplayedLinkUrl = (link) => {
    const selectedV = selectedLinkVersions[link.key] || link.version;
    if (selectedV === link.version) return link.url;
    return linkVersionsCache[link.key]?.[selectedV]?.url || link.url;
  };

  // Raw lists from props
  const allTasks = project?.tasks || [];
  const allMilestones = project?.milestones || [];
  const customTabs = project?.custom_tabs || [];

  // Scoped lists filtered by active tab
  const currentTabId = activeProjectTab;
  const tasks = allTasks.filter(
    (t) => (t.tab_id || "tracker") === currentTabId,
  );
  const milestones = allMilestones.filter(
    (m) => (m.tab_id || "tracker") === currentTabId,
  );

  const currentTabDeliverables = (project?.deliverables || []).filter(
    (item) => (item.tab_id || "tracker") === currentTabId,
  );

  const linkDeliverables = currentTabDeliverables.filter(
    (i) => i.type === "link",
  );
  const fileDeliverables = currentTabDeliverables.filter(
    (i) => i.type === "file",
  );

  // --- FILTER ASSIGNED MEMBERS ---
  const projectTeamMembers = useMemo(() => {
    if (!project?.team_members || !Array.isArray(project.team_members))
      return [];
    return employees.filter((emp) => project.team_members.includes(emp.id));
  }, [employees, project?.team_members]);

  // Task Form State (Using assigned team members as default)
  const [taskName, setTaskName] = useState("");
  const [taskAssignee, setTaskAssignee] = useState(
    projectTeamMembers[0]?.id || "",
  );
  const [taskDateRange, setTaskDateRange] = useState({
    from: new Date(),
    to: addDays(new Date(), 2),
  });
  const [isTaskCalendarOpen, setIsTaskCalendarOpen] = useState(false);
  const [taskStatus, setTaskStatus] = useState("pending");
  const [taskPriority, setTaskPriority] = useState("mid");
  const [isSavingTask, setIsSavingTask] = useState(false);

  // --- GLOBAL VERSION LOGIC ---
  const maxGlobalVersion = useMemo(() => {
    let max = 1;
    [
      project?.feedback_url_version,
      project?.agreements_url_version,
      project?.scope_of_work_url_version,
    ].forEach((v) => {
      if (v && v > max) max = v;
    });
    (project?.deliverables || []).forEach((d) => {
      if (d.version && d.version > max) max = d.version;
    });
    return max;
  }, [project]);

  const [activeGlobalVersion, setActiveGlobalVersion] = useState(null);

  const handleGlobalVersionSelect = async (v) => {
    setActiveGlobalVersion(v);

    const links = [
      {
        key: "feedback_url",
        url: project?.feedback_url,
        version: project?.feedback_url_version || 1,
      },
      {
        key: "agreements_url",
        url: project?.agreements_url,
        version: project?.agreements_url_version || 1,
      },
      {
        key: "scope_of_work_url",
        url: project?.scope_of_work_url,
        version: project?.scope_of_work_url_version || 1,
      },
    ].filter((l) => l.url);

    links.forEach((link) => {
      if (v <= link.version) {
        handleSelectLinkVersion(link, v);
      } else {
        handleSelectLinkVersion(link, link.version);
      }
    });

    currentTabDeliverables.forEach((item) => {
      const itemMax = item.version || 1;
      if (v <= itemMax) {
        handleSelectDeliverableVersion(item, v);
      } else {
        handleSelectDeliverableVersion(item, itemMax);
      }
    });
  };

  const handleUpdateTaskPriority = async (taskId, newPriority) => {
    setOpenPriorityMenuId(null);
    await supabase
      .from("tasks")
      .update({ priority: newPriority })
      .eq("id", taskId);

    onRefresh?.();
  };

  // Edit Project Form State
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [editForm, setEditForm] = useState({
    title: project?.title || "",
    description: project?.description || "",
    client_name: project?.client_name || "",
    location: project?.location || "",
    launch_date: project?.launch_date || "",
    status_note: project?.status_note || "Active Delivery Build",
    feedback_url: project?.feedback_url || "",
    agreements_url: project?.agreements_url || "",
    scope_of_work_url: project?.scope_of_work_url || "",
  });

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const inProgressCount = tasks.filter((t) => t.status === "progress").length;
  const pendingCount = tasks.filter(
    (t) =>
      t.status === "pending" ||
      t.status === "notstarted" ||
      t.status === "blocked",
  ).length;

  const completionPct = useMemo(() => {
    if (milestones.length === 0) {
      const doneTasks = tasks.filter((t) => t.status === "done").length;
      const totalTasks = tasks.length || 1;
      return Math.round((doneTasks / totalTasks) * 100);
    }

    const totalProgress = milestones.reduce((acc, m) => {
      const progress =
        m.status === "complete" ? 100 : Number(m.sheet_progress) || 0;
      return acc + progress;
    }, 0);

    return Math.round(totalProgress / milestones.length);
  }, [milestones, tasks]);

  const fetchRequests = async () => {
    if (!project?.id) return;
    const { data } = await supabase
      .from("client_requests")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    if (data) {
      setRequestsList(data);
    }
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarStartDate);
    const monthEnd = endOfMonth(calendarStartDate);

    return eachDayOfInterval({
      start: monthStart,
      end: monthEnd,
    });
  }, [calendarStartDate]);

  // 1. Keep a stable reference to onRefresh to avoid reconnecting the websocket on every render
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const stateRef = useRef({ project, projectFolders });
  useEffect(() => {
    stateRef.current = { project, projectFolders };
  }, [project, projectFolders]);

  // 2. Main Realtime Subscription
  useEffect(() => {
    fetchRequests();
    if (!project?.id) return;

    // Use a unique channel for this specific client portal
    const channel = supabase
      .channel(`client-portal-${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        console.log("🔥 ANY DATABASE CHANGE FIRED:", payload);
        const currentState = stateRef.current;

        // 1. Handle Client Requests (Instant Push)
        if (
          payload.table === "client_requests" &&
          payload.eventType === "INSERT"
        ) {
          if (String(payload.new.project_id) === String(project.id)) {
            setRequestsList((prev) => [payload.new, ...prev]);
          }
        }

        // 2. Handle Dashboard Updates (Popup Trigger)
        const trackedTables = [
          "tasks",
          "milestones",
          "deliverables",
          "projects",
          "project_folders",
        ];

        if (trackedTables.includes(payload.table)) {
          let isCurrentProject = false;

          // A. Check if project_id is explicitly in the payload
          if (
            String(payload.new?.project_id) === String(project.id) ||
            String(payload.old?.project_id) === String(project.id)
          ) {
            isCurrentProject = true;
          } else if (payload.eventType === "DELETE" && payload.old?.id) {
            const delId = String(payload.old.id);

            const inTasks = currentState.project?.tasks?.some(
              (t) => String(t.id) === delId,
            );
            const inMilestones = currentState.project?.milestones?.some(
              (m) => String(m.id) === delId,
            );
            const inDeliverables = currentState.project?.deliverables?.some(
              (d) => String(d.id) === delId,
            );
            const inFolders = currentState.projectFolders?.some(
              (f) => String(f.id) === delId,
            );

            if (inTasks || inMilestones || inDeliverables || inFolders) {
              isCurrentProject = true;
            }
          }

          // If the change belongs to us, trigger the UI updates
          if (isCurrentProject) {
            if (payload.table === "project_folders") {
              fetchProjectFolders(); // Silently update folders
            }
            setUpdateAvailable(true); // Show the popup
          }
        }
      })
      .subscribe((status) => {
        console.log("Supabase Realtime Status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project?.id]);

  const unreadCount = requestsList.filter((r) => !r.is_read).length;

  const markRequestAsRead = async (id) => {
    await supabase
      .from("client_requests")
      .update({ is_read: true })
      .eq("id", id);
    setRequestsList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)),
    );
  };

  const timelineDays = useMemo(() => {
    const days = [];
    const start = subDays(startOfDay(timelineBaseDate), 7);
    for (let i = 0; i < 21; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }, [timelineBaseDate]);

  // Ensure Kanban strictly uses Project's Assigned Members
  const kanbanMembersData = useMemo(() => {
    return projectTeamMembers.map((emp) => {
      const allEmpTasks = tasks.filter((t) => t.assignee_id === emp.id);

      const targetDateStr = format(kanbanDate, "yyyy-MM-dd");

      const backlog = allEmpTasks.filter((t) => {
        if (t.status === "done") return false;
        if (!t.due_date) return true;
        const taskDateOnly = t.due_date.split("T")[0];
        return taskDateOnly < targetDateStr;
      });

      const doToday = allEmpTasks.filter((t) => {
        if (t.status === "done") return false;
        return isTaskOnDate(t.due_date, kanbanDate);
      });

      const completed = allEmpTasks.filter((t) => t.status === "done");

      return {
        ...emp,
        columns: {
          backlog,
          doToday,
          completed,
        },
      };
    });
  }, [projectTeamMembers, tasks, kanbanDate]);

  const handleJumpToToday = () => {
    const today = new Date();
    setTimelineBaseDate(today);
    if (calendarScrollRef.current) {
      calendarScrollRef.current.scrollTo({ left: 750, behavior: "smooth" });
    }
  };

  const handleCreateCustomTab = async (e) => {
    e.preventDefault();
    if (!newTabName.trim()) return;

    setIsSavingTab(true);
    const newTab = {
      id: `tab_${Date.now()}`,
      name: newTabName.trim(),
      created_at: new Date().toISOString(),
    };

    const updatedTabs = [...customTabs, newTab];

    const { error } = await supabase
      .from("projects")
      .update({ custom_tabs: updatedTabs })
      .eq("id", project?.id);

    setIsSavingTab(false);
    if (error) {
      alert("Error adding tab: " + error.message);
      return;
    }

    setNewTabName("");
    setIsAddTabModalOpen(false);
    setActiveProjectTab(newTab.id);
    onRefresh?.();
  };

  const handleDeleteCustomTab = async (tabId) => {
    if (!confirm("Are you sure you want to delete this tab?")) return;
    const updatedTabs = customTabs.filter((t) => t.id !== tabId);

    await supabase
      .from("projects")
      .update({ custom_tabs: updatedTabs })
      .eq("id", project?.id);

    setActiveProjectTab("tracker");
    onRefresh?.();
  };

  const [stageSheetUrl, setStageSheetUrl] = useState("");

  // const handleOpenStageModal = (stage = null) => {
  //   if (stage) {
  //     setEditingStage(stage);
  //     setStageTitle(stage.title);
  //     setStageDueDate(stage.due_date || "");
  //     setStageSheetUrl(stage.sheet_url || "");
  //     setStageCompleted(
  //       stage.status === "complete" || Number(stage.sheet_progress) >= 100,
  //     );
  //   } else {
  //     setEditingStage(null);
  //     setStageTitle("");
  //     setStageDueDate(new Date());
  //     setStageSheetUrl("");
  //     setStageCompleted(false);
  //   }
  //   setIsStageModalOpen(true);
  // };

  const handleOpenStageModal = (stage = null) => {
    setEditingStage(stage);
    setIsStageModalOpen(true);
  };

  // const handleSaveStage = async (e) => {
  //   if (!stageTitle.trim()) return;

  //   setIsSavingStage(true);
  //   const formattedDueDate =
  //     stageDueDate instanceof Date
  //       ? format(stageDueDate, "yyyy-MM-dd")
  //       : stageDueDate.trim() || "TBD";
  //   let createdStage = null;

  //   if (editingStage) {
  //     const { error } = await supabase
  //       .from("milestones")
  //       .update({
  //         title: stageTitle.trim(),
  //         due_date: formattedDueDate,
  //         sheet_url: stageSheetUrl,
  //         status: stageCompleted ? "complete" : "pending",
  //         sheet_progress: stageCompleted
  //           ? 100
  //           : Math.min(Number(editingStage.sheet_progress) || 0, 99),
  //       })
  //       .eq("id", editingStage.id);

  //     if (error) {
  //       alert("Error updating stage: " + error.message);
  //       setIsSavingStage(false);
  //       return;
  //     }
  //   } else {
  //     const { data, error } = await supabase
  //       .from("milestones")
  //       .insert({
  //         project_id: project?.id,
  //         tab_id: activeProjectTab,
  //         title: stageTitle.trim(),
  //         due_date: formattedDueDate,
  //         sheet_url: stageSheetUrl,
  //         sheet_progress: stageCompleted ? 100 : 0,
  //         status: stageCompleted ? "complete" : "pending",
  //         order_index: milestones.length + 1,
  //       })
  //       .select()
  //       .single();

  //     if (error) {
  //       alert("Error adding stage: " + error.message);
  //       setIsSavingStage(false);
  //       return;
  //     }
  //     createdStage = data;
  //   }

  //   setIsSavingStage(false);
  //   setIsStageModalOpen(false);
  //   setEditingStage(null);
  //   if (createdStage) {
  //     setSelectedMilestoneModal({
  //       ...createdStage,
  //       subtasks: Array.isArray(createdStage.subtasks)
  //         ? createdStage.subtasks
  //         : [],
  //     });
  //   }
  //   setStageTitle("");
  //   setStageDueDate("");
  //   onRefresh?.();
  // };

  const handleSaveStage = async (stageData, opts = {}) => {
    let saved = editingStage;

    if (editingStage) {
      // Update existing stage
      const { error } = await supabase
        .from("milestones")
        .update({
          title: stageData.title,
          due_date: stageData.due_date,
          sheet_url: stageData.sheet_url,
          status: stageData.status,
          sheet_progress: stageData.sheet_progress,
        })
        .eq("id", editingStage.id);

      if (error) {
        alert("Error updating stage: " + error.message);
        return null;
      }
    } else {
      // Create new stage
      const { data, error } = await supabase
        .from("milestones")
        .insert({
          project_id: project?.id,
          tab_id: activeProjectTab,
          title: stageData.title,
          due_date: stageData.due_date,
          sheet_url: stageData.sheet_url,
          status: stageData.status,
          sheet_progress: stageData.sheet_progress,
          order_index: milestones.length + 1,
        })
        .select()
        .single();

      if (error) {
        alert("Error creating stage: " + error.message);
        return null;
      }
      saved = data;
    }

    if (opts.keepOpen) {
      // Modal stays open; later saves update this row instead of inserting again
      setEditingStage(saved);
      onRefresh?.();
      return saved;
    }

    setIsStageModalOpen(false);
    setEditingStage(null);
    onRefresh?.();
    return saved;
  };
  const handleSaveSubstages = async (stageId, subtasks) => {
    const { error } = await supabase
      .from("milestones")
      .update({ subtasks })
      .eq("id", stageId);
    if (error) {
      alert("Error saving sub-stages: " + error.message);
      return false;
    }
    setSelectedMilestoneModal((prev) =>
      prev && String(prev.id) === String(stageId) ? { ...prev, subtasks } : prev,
    );
    onRefresh?.();
    return true;
  };
  const handleDeleteStage = async (stageId) => {
    if (!confirm("Are you sure you want to delete this stage?")) return;
    await supabase.from("milestones").delete().eq("id", stageId);
    onRefresh?.();
  };

  const handleToggleMilestone = async (milestone) => {
    const isComplete =
      milestone.status === "complete" ||
      Number(milestone.sheet_progress) >= 100;
    const newStatus = isComplete ? "pending" : "complete";

    let updatePayload = { status: newStatus };

    if (!isComplete) {
      // Marking as complete: Backup current progress before forcing to 100%
      updatePayload.original_progress = milestone.sheet_progress || 0;
      updatePayload.sheet_progress = 100;
    } else {
      // Unchecking: Restore back to what Excel/original progress was
      updatePayload.sheet_progress = milestone.original_progress || 0;
    }

    const { error } = await supabase
      .from("milestones")
      .update(updatePayload)
      .eq("id", milestone.id);

    if (error) {
      alert("Error updating stage: " + error.message);
      return;
    }

    onRefresh?.();
  };

  const handleOpenAddTaskForDate = (memberId, date) => {
    setTaskAssignee(memberId || projectTeamMembers[0]?.id || "");
    setTaskDateRange({
      from: date || new Date(),
      to: date || new Date(),
    });
    setTaskStatus("pending");
    setTaskPriority("mid");
    setIsAddTaskModalOpen(true);
  };

  const handleToggleTaskDone = async (task) => {
    const isDone = task.status === "done";
    const newStatus = isDone ? "progress" : "done";
    const progress = isDone ? 50 : 100;

    await supabase
      .from("tasks")
      .update({ status: newStatus, progress })
      .eq("id", task.id);

    onRefresh?.();
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      alert("Error deleting task: " + error.message);
      return;
    }

    onRefresh?.();
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    const progress =
      newStatus === "done" ? 100 : newStatus === "progress" ? 50 : 0;

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus, progress })
      .eq("id", taskId);

    if (error) {
      alert("Error updating status: " + error.message);
      return;
    }

    try {
      await supabase.from("activity_logs").insert({
        project_id: project?.id || null,
        task_id: taskId,
        action: `Moved task status to ${newStatus}`,
      });
    } catch (err) {
      console.error("Activity logging error:", err.message);
    }

    setOpenStatusMenuId(null);
    onRefresh?.();
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setIsSavingProject(true);

    let finalIconUrl = project?.icon || null;

    if (removeIcon) {
      finalIconUrl = null;
    } else if (iconFile) {
      try {
        finalIconUrl = await uploadDeliverableFile(iconFile, "project-icons");
      } catch (err) {
        alert("Failed to upload icon: " + err.message);
        setIsSavingProject(false);
        return;
      }
    }

    const cleanUrl = (u) =>
      u && !u.startsWith("http") ? `https://${u}` : u || null;

    const { error } = await supabase
      .from("projects")
      .update({
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        client_name: editForm.client_name.trim(),
        location: editForm.location.trim(),
        launch_date: editForm.launch_date,
        status_note: editForm.status_note.trim(),
        feedback_url: cleanUrl(editForm.feedback_url.trim()),
        agreements_url: cleanUrl(editForm.agreements_url.trim()),
        icon: finalIconUrl,
        scope_of_work_url: cleanUrl(editForm.scope_of_work_url.trim()),
        team_members: selectedTeam,
      })
      .eq("id", project?.id);

    setIsSavingProject(false);
    if (error) {
      alert("Error updating project: " + error.message);
      return;
    }
    setIsEditProjectOpen(false);
    onRefresh?.();
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    setIsSavingTask(true);
    const progress =
      taskStatus === "done" ? 100 : taskStatus === "progress" ? 50 : 0;

    const { error } = await supabase.from("tasks").insert({
      project_id: project?.id,
      tab_id: activeProjectTab,
      name: taskName.trim(),
      created_at: new Date().toISOString(),
      status: taskStatus,
      assignee_id: taskAssignee || null,
      start_date: taskDateRange?.from
        ? format(taskDateRange.from, "yyyy-MM-dd")
        : null,
      due_date: taskDateRange?.to
        ? format(taskDateRange.to, "yyyy-MM-dd")
        : taskDateRange?.from
          ? format(taskDateRange.from, "yyyy-MM-dd")
          : null,
      progress,
    });

    setIsSavingTask(false);
    if (error) {
      alert("Error assigning task: " + error.message);
      return;
    }

    setTaskName("");
    setIsAddTaskModalOpen(false);
    onRefresh?.();
  };

  const handleOpenAddDeliverableModal = (folderId = "root", item = null) => {
    setTargetFolderId(item?.folder_id || folderId || "root");

    if (item) {
      setEditingDeliverable(item);
      setDelivTitle(item.title);
      setDelivUrl(item.url);
      setDelivType(item.type || "link");
      setFileObject(null);
    } else {
      setEditingDeliverable(null);
      setDelivTitle("");
      setDelivUrl("");
      setDelivType("link");
      setFileObject(null);
    }

    setIsAddDeliverableModalOpen(true);
  };

  const handleOpenCreateFolderModal = (parentId = "root") => {
    setFolderParentId(parentId || "root");
    setNewFolderName("");
    setIsCreateFolderModalOpen(true);
  };

  const handleSaveFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim() || !project?.id) return;

    setIsSavingFolder(true);
    const { data, error } = await supabase
      .from("project_folders")
      .insert({
        project_id: project.id,
        parent_id: folderParentId || "root",
        name: newFolderName.trim(),
        tab_id: activeProjectTab,
      })
      .select()
      .single();

    setIsSavingFolder(false);
    if (error) {
      alert("Error creating folder: " + error.message);
      return;
    }

    if (data?.id) {
      setExpandedFolders((prev) => ({
        ...prev,
        [folderParentId || "root"]: true,
        [data.id]: true,
      }));
    }

    setNewFolderName("");
    setIsCreateFolderModalOpen(false);
    await fetchProjectFolders();
  };

  const handleRenameFolder = async (folder) => {
    const name = window.prompt("Rename folder:", folder.name);
    if (!name?.trim() || name.trim() === folder.name) return;

    const { error } = await supabase
      .from("project_folders")
      .update({ name: name.trim() })
      .eq("id", folder.id);

    if (error) {
      alert("Error renaming folder: " + error.message);
      return;
    }

    await fetchProjectFolders();
  };

  const handleDeleteFolder = async (folderId) => {
    const folder = projectFolders.find((f) => f.id === folderId);
    if (!folder) return;

    const children = projectFolders.filter((f) => f.parent_id === folderId);
    const hasAssets = currentTabDeliverables.some(
      (item) => item.folder_id === folderId,
    );

    const message =
      hasAssets || children.length
        ? `Delete "${folder.name}" and its subfolders? Assets inside will be moved to Unfiled.`
        : `Delete "${folder.name}"?`;

    if (!window.confirm(message)) return;

    const collectIds = (id) => {
      const ids = [id];
      projectFolders
        .filter((f) => f.parent_id === id)
        .forEach((child) => ids.push(...collectIds(child.id)));
      return ids;
    };

    const idsToDelete = collectIds(folderId);

    const { error: deliverableError } = await supabase
      .from("deliverables")
      .update({ folder_id: null })
      .in("folder_id", idsToDelete);

    if (deliverableError) {
      alert("Error moving assets out of folder: " + deliverableError.message);
      return;
    }

    const { error } = await supabase
      .from("project_folders")
      .delete()
      .in("id", idsToDelete);

    if (error) {
      alert("Error deleting folder: " + error.message);
      return;
    }

    if (idsToDelete.includes(targetFolderId)) {
      setTargetFolderId("root");
    }

    await fetchProjectFolders();
    onRefresh?.();
  };

  const saveDeliverable = async (e) => {
    e.preventDefault();
    if (!delivTitle.trim()) return;

    let finalUrl = delivUrl;

    if (delivType === "file") {
      if (fileObject) {
        setUploadingFile(true);
        try {
          finalUrl = await uploadDeliverableFile(fileObject, project?.id);
        } catch (err) {
          alert("Upload failed: " + err.message);
          setUploadingFile(false);
          return;
        }
        setUploadingFile(false);
      } else if (!editingDeliverable) {
        return;
      }
    } else {
      if (!finalUrl.trim()) return;
      if (!finalUrl.startsWith("http")) finalUrl = `https://${finalUrl}`;
    }

    const folderId = targetFolderId === "root" ? null : targetFolderId;

    if (editingDeliverable) {
      const updatePayload = {
        title: delivTitle.trim(),
        type: delivType,
        url: finalUrl,
        folder_id: folderId,
      };
      const { error } = await supabase
        .from("deliverables")
        .update(updatePayload)
        .eq("id", editingDeliverable.id);

      if (error) {
        alert("Error updating deliverable: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("deliverables").insert({
        project_id: project?.id,
        tab_id: activeProjectTab,
        title: delivTitle.trim(),
        type: delivType,
        url: finalUrl,
        uploaded_by: "admin",
        folder_id: folderId,
      });

      if (error) {
        alert("Error adding deliverable: " + error.message);
        return;
      }
    }

    setDelivTitle("");
    setDelivUrl("");
    setFileObject(null);
    setEditingDeliverable(null);
    setTargetFolderId("root");
    setIsAddDeliverableModalOpen(false);
    onRefresh?.();
  };

  const handleDeleteDeliverable = async (deliverableId) => {
    if (!confirm("Are you sure you want to delete this shared asset?")) return;
    const { error } = await supabase
      .from("deliverables")
      .delete()
      .eq("id", deliverableId);

    if (error) {
      alert("Error deleting asset: " + error.message);
      return;
    }
    onRefresh?.();
  };

  const handleViewHistory = async (item) => {
    setHistoryModalItem(item);
    setHistoryData([]);
    setIsLoadingHistory(true);

    const { data, error } = await supabase
      .from("deliverable_versions")
      .select("*")
      .eq("deliverable_id", item.id)
      .order("version", { ascending: false });

    setIsLoadingHistory(false);

    if (error) {
      alert("Error loading version history: " + error.message);
      return;
    }

    setHistoryData(data || []);
  };

  const isLocationUrl = isValidUrl(project?.location);
  const locationHref = isLocationUrl
    ? project.location.startsWith("http")
      ? project.location
      : `https://${project.location}`
    : null;

  return (
    <div
      className="space-y-6"
      onClick={() => {
        setOpenPriorityMenuId(null);
        setOpenStatusMenuId(null);
        setLinkVersionMenu(null);
      }}
    >
      {/* Top Header with Notification Bell */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 py-10">
        <div>
          <div className="flex items-center gap-3 text-2xl font-bold tracking-tight text-[#37352f]">
            {project?.icon && (
              <img
                src={project.icon}
                alt="Company icon"
                className="h-8 w-8 rounded-md object-contain shrink-0"
              />
            )}

            <h1>{project?.title}</h1>
          </div>
          <p className="text-xs text-[#787774] mt-1">{project?.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification Bell Icon */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="p-2 rounded-xl bg-white border border-[#e9e9e7] hover:bg-[#f7f6f3] text-[#37352f] transition shadow-xs relative"
              title="Client Requests & Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {isNotificationOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-[#e5e7eb] rounded-2xl p-4 z-50 space-y-3 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-2">
                  <div className="flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold text-[#111827]">
                      Client Requests ({requestsList.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setIsNotificationOpen(false)}
                    className="p-1 text-[#9ca3af] hover:text-black rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-[#f3f4f6]">
                  {requestsList.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#9ca3af]">
                      No requests received yet.
                    </div>
                  ) : (
                    requestsList.map((req) => (
                      <div
                        key={req.id}
                        onClick={() => markRequestAsRead(req.id)}
                        className={`py-2.5 px-2.5 rounded-xl transition cursor-pointer space-y-1.5 my-1 ${
                          req.is_priority
                            ? "bg-rose-50 border border-rose-200 hover:bg-rose-100/60"
                            : "hover:bg-[#f9fafb]"
                        } ${!req.is_read && !req.is_priority ? "bg-blue-50/40" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {req.is_priority && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 font-extrabold text-[9px] uppercase tracking-wider">
                                <Flame className="h-2.5 w-2.5 fill-rose-600 text-rose-600" />
                                Priority
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-blue-600 uppercase">
                              Client Request
                            </span>
                          </div>
                          <span className="text-[9px] text-[#9ca3af]">
                            {format(
                              parseISO(req.created_at),
                              "MMM dd, hh:mm a",
                            )}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#111827]">
                          {req.message}
                        </p>

                        {req.attachment_url && (
                          <a
                            href={req.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-blue-600 underline font-medium"
                          >
                            <Paperclip className="h-3 w-3" />
                            <span>View Attachment</span>
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setEditForm({
                title: project?.title || "",
                description: project?.description || "",
                client_name: project?.client_name || "",
                location: project?.location || "",
                launch_date: project?.launch_date || "",
                status_note: project?.status_note || "Active Delivery Build",
                feedback_url: project?.feedback_url || "",
                agreements_url: project?.agreements_url || "",
                scope_of_work_url: project?.scope_of_work_url || "",
              });
              setIconFile(null);
              setRemoveIcon(false);
              setSelectedTeam(project?.team_members || []);
              setIsEditProjectOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#e9e9e7] text-[#37352f] text-xs font-semibold hover:bg-[#f7f6f3] shadow-xs transition shrink-0"
          >
            <Settings2 className="h-4 w-4 text-[#787774]" />
            <span>Edit Project Details</span>
          </button>
        </div>
      </div>

      {/* Metadata Inline Bar */}
      <div className="flex flex-wrap items-center gap-6 py-3 border-y border-[#e9e9e7] text-xs text-[#787774]">
        <div>
          Client:{" "}
          <b className="text-[#37352f]">{project?.client_name || "N/A"}</b>
        </div>
        <div className="flex items-center gap-1">
          Location:{" "}
          {project?.location ? (
            isLocationUrl ? (
              <a
                href={locationHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-blue-600 font-bold hover:underline"
              >
                <span>{project.location}</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            ) : (
              <b className="text-[#37352f]">{project.location}</b>
            )
          ) : (
            <span className="text-[#9b9a97]">N/A</span>
          )}
        </div>
        <div>
          Launch:{" "}
          <b className="text-[#37352f]">{project?.launch_date || "N/A"}</b>
        </div>

        {maxGlobalVersion > 1 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Global Version:
            </span>
            <VersionPills
              count={maxGlobalVersion}
              active={activeGlobalVersion || maxGlobalVersion}
              onSelect={handleGlobalVersionSelect}
            />
          </div>
        )}
      </div>

      {/* Important Links */}
      {showImportantLinks &&
        (project?.feedback_url ||
          project?.agreements_url ||
          project?.scope_of_work_url) && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#787774]">
              Important Links
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  key: "feedback_url",
                  url: project?.feedback_url,
                  version: project?.feedback_url_version || 1,
                  title: "Feedback Document",
                  sub: "Submit notes & revisions",
                  icon: <MessageSquare className="h-4 w-4" />,
                  highlighted: true,
                },
                {
                  key: "agreements_url",
                  url: project?.agreements_url,
                  version: project?.agreements_url_version || 1,
                  title: "Master Agreement",
                  sub: "Signed legal terms",
                  icon: <FileSignature className="h-4 w-4" />,
                  highlighted: false,
                  iconWrap:
                    "bg-purple-50 text-purple-600 border border-purple-100",
                },
                {
                  key: "scope_of_work_url",
                  url: project?.scope_of_work_url,
                  version: project?.scope_of_work_url_version || 1,
                  title: "Scope of Work (SOW)",
                  sub: "Project deliverables spec",
                  icon: <FileCheck2 className="h-4 w-4" />,
                  highlighted: false,
                  iconWrap: "bg-blue-50 text-blue-600 border border-blue-100",
                },
              ].map((link) => {
                if (!link.url) return null;
                const isMenuOpen = linkVersionMenu === link.key;
                const displayUrl = getDisplayedLinkUrl(link);
                const displayVersion =
                  selectedLinkVersions[link.key] || link.version;

                return (
                  <div key={link.key} className="relative">
                    <div
                      className={`rounded-2xl p-4 flex items-center justify-between gap-3 transition group ${
                        link.highlighted
                          ? "bg-[#fbf3db] border border-[#f7e3af] hover:shadow-xs"
                          : "bg-white border border-[#e9e9e7] hover:shadow-xs"
                      }`}
                    >
                      <a
                        href={displayUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 min-w-0"
                      >
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                            link.highlighted
                              ? "bg-[#cb912f] text-white"
                              : link.iconWrap
                          }`}
                        >
                          {link.icon}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-bold text-[#37352f]">
                            {link.title}
                          </h4>
                          <p className="text-[10px] text-[#787774] truncate">
                            {link.sub}
                          </p>
                        </div>
                      </a>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLinkVersions(link.key);
                          }}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold transition ${
                            link.highlighted
                              ? "bg-white/70 text-[#946a1e] hover:bg-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black"
                          }`}
                          title="View link version history"
                        >
                          <History className="h-2.5 w-2.5" />
                          <span>v{displayVersion}</span>
                        </button>
                        <ArrowUpRight
                          className={`h-4 w-4 shrink-0 ${
                            link.highlighted
                              ? "text-[#cb912f]"
                              : "text-[#787774] group-hover:text-blue-600"
                          } transition-transform`}
                        />
                      </div>
                    </div>

                    {isMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-[#e5e7eb] rounded-xl shadow-2xl p-2 z-40 max-h-64 overflow-y-auto"
                      >
                        <div className="px-2 py-1 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">
                          Version History
                        </div>

                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition mb-1"
                        >
                          <span className="text-[11px] font-medium text-blue-800 truncate">
                            Current
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 shrink-0">
                            v{link.version}
                          </span>
                        </a>

                        {isLoadingLinkVersions ? (
                          <div className="py-4 flex items-center justify-center text-[#9b9a97]">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          </div>
                        ) : linkVersionData.length === 0 ? (
                          <div className="py-3 text-center text-[10px] text-[#9b9a97] italic">
                            No earlier versions archived.
                          </div>
                        ) : (
                          linkVersionData.map((v) => (
                            <a
                              key={v.id}
                              href={v.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition"
                            >
                              <span className="text-[11px] text-[#37352f] truncate">
                                {v.archived_at
                                  ? format(
                                      parseISO(v.archived_at),
                                      "MMM dd, yyyy hh:mm a",
                                    )
                                  : "Archived"}
                              </span>
                              <span className="text-[10px] font-bold text-gray-500 shrink-0">
                                v{v.version}
                              </span>
                            </a>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* DYNAMIC MODULE TABS SWITCHER */}
      <div className="flex items-center justify-between border-b border-[#e9e9e7] pt-1">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveProjectTab("tracker")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all relative shrink-0 ${
              activeProjectTab === "tracker"
                ? "text-[#37352f] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600"
                : "text-[#787774] hover:text-[#37352f]"
            }`}
          >
            <Layers className="h-4 w-4 text-blue-600" />
            <span>Overview &amp; Tracker</span>
          </button>

          {customTabs.map((tab) => (
            <div
              key={tab.id}
              className="group relative flex items-center shrink-0"
            >
              <button
                onClick={() => setActiveProjectTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all relative ${
                  activeProjectTab === tab.id
                    ? "text-[#37352f] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600"
                    : "text-[#787774] hover:text-[#37352f]"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-[#cb912f]" />
                <span>{tab.name}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCustomTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-[#9b9a97] hover:text-rose-600 transition"
                title="Delete Tab"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          <button
            onClick={() => setIsAddTabModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#f0efe9] hover:bg-[#e9e9e7] text-[#37352f] text-xs font-semibold transition shrink-0 ml-1 mb-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Tab</span>
          </button>
        </div>
      </div>

      {/* TRACKER & WORKSPACE CONTENT */}
      <div className="space-y-6">
        {/* Project Health Bento Hero */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white border border-[#e9e9e7] rounded-xl p-6 shadow-sm items-center">
          <div className="md:col-span-4 flex items-center justify-center">
            <div className="relative flex h-36 w-36 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#e9e9e7]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-blue-600 transition-all duration-500"
                  strokeDasharray={`${completionPct}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-3xl font-extrabold text-[#37352f]">
                  {completionPct}%
                </span>
                <p className="text-[10px] uppercase font-bold text-[#787774]">
                  Complete
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-8 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#fbf3db] text-[#cb912f] text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#cb912f]" />
              {project?.status_note || "Active Delivery Build"}
            </span>
            <h2 className="text-sm font-semibold text-[#37352f]">
              Workspace Health &amp; Timeline Overview (
              {activeProjectTab === "tracker"
                ? "Overview & Tracker"
                : customTabs.find((t) => t.id === activeProjectTab)?.name}
              )
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-lg p-3">
                <div className="text-lg font-bold text-[#37352f]">
                  {doneCount}
                </div>
                <div className="text-[11px] text-[#787774]">Tasks done</div>
              </div>
              <div className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-lg p-3">
                <div className="text-lg font-bold text-[#37352f]">
                  {inProgressCount}
                </div>
                <div className="text-[11px] text-[#787774]">In progress</div>
              </div>
              <div className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-lg p-3">
                <div className="text-lg font-bold text-[#37352f]">
                  {pendingCount}
                </div>
                <div className="text-[11px] text-[#787774]">Pending</div>
              </div>
              <div className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-lg p-3">
                <div className="text-lg font-bold text-blue-600">
                  {daysRemaining} days
                </div>
                <div className="text-[11px] text-[#787774]">Until launch</div>
              </div>
            </div>
          </div>
        </div>

        {/* ADMIN ROADMAP STAGES */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-blue-600" />
              <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-[#374151]">
                Project Roadmap
              </h3>
            </div>
            <button
              onClick={() => handleOpenStageModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Stage</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {milestones.length === 0 ? (
              <div
                onClick={() => handleOpenStageModal()}
                className="col-span-full py-8 text-center text-xs text-[#6b7280] bg-[#f9fafb] rounded-xl border border-dashed border-[#d1d5db] cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 transition flex flex-col items-center justify-center gap-1.5"
              >
                <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="text-[10px] md:text-xs">
                  No stages added yet. <b>Click here to add the first stage</b>{" "}
                  (e.g. Design, Development, QC).
                </span>
              </div>
            ) : (
              milestones.map((m) => {
                const sheetProgress = Math.min(
                  Number(m.sheet_progress) || 0,
                  100,
                );
                const isCompleted =
                  m.status === "complete" || sheetProgress >= 100;
                const progress = isCompleted ? 100 : sheetProgress;

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMilestoneModal({
                        ...m,
                        subtasks: Array.isArray(m.subtasks) ? m.subtasks : [],
                      });
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedMilestoneModal({
                          ...m,
                          subtasks: Array.isArray(m.subtasks) ? m.subtasks : [],
                        });
                      }
                    }}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-0 transition ${
                      isCompleted
                        ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]"
                        : "bg-[#f9fafb] border-[#e5e7eb] text-[#111827]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {/* Quick Complete / Toggle Button */}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleMilestone(m);
                          }}
                          className={`h-5 w-5 rounded-md border flex items-center justify-center transition ${
                            isCompleted
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-white border-gray-300 text-transparent hover:border-emerald-600"
                          }`}
                          title={
                            isCompleted ? "Reopen stage" : "Mark stage complete"
                          }
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </button>

                        <span className="text-[10px] uppercase font-bold text-[#9ca3af]">
                          {m.due_date || "No date"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenStageModal(m);
                          }}
                          className="p-1 text-[#9ca3af] hover:text-[#111827] rounded"
                          title="Edit Stage"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteStage(m.id);
                          }}
                          className="p-1 text-[#9ca3af] hover:text-rose-600 rounded"
                          title="Delete Stage"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-2">
                      <p
                        className={`text-xs font-bold leading-tight ${isCompleted ? "opacity-75" : ""}`}
                      >
                        {m.title}
                      </p>

                      <div className="space-y-1.5 w-full">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-gray-700">
                            {progress}% Complete
                          </span>
                          {m.sheet_url && (
                            <a
                              href={m.sheet_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="text-blue-600 hover:underline"
                            >
                              Sheet Link
                            </a>
                          )}
                        </div>
                        <div className="h-1.5 w-full bg-gray-200/80 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* View Selector Tabs & Actions Header */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-xl bg-[#f0efe9] p-1 text-xs font-medium overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("kanban")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                  activeTab === "kanban"
                    ? "bg-white text-[#37352f] font-semibold shadow-xs"
                    : "text-[#787774] hover:text-[#37352f]"
                }`}
              >
                <KanbanIcon className="h-3.5 w-3.5 text-blue-600" />
                <span>Kanban</span>
              </button>
              
              <button
                onClick={() => setActiveTab("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                  activeTab === "table"
                    ? "bg-white text-[#37352f] font-semibold shadow-xs"
                    : "text-[#787774] hover:text-[#37352f]"
                }`}
              >
                <TableIcon className="h-3.5 w-3.5 text-blue-600" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                  activeTab === "completed"
                    ? "bg-white text-[#37352f] font-semibold shadow-xs"
                    : "text-[#787774] hover:text-[#37352f]"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  Archive ({tasks.filter((t) => t.status === "done").length})
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-[#9b9a97]">
              ({tasks.length} total tasks)
            </span>
            <button
              onClick={() => handleOpenAddTaskForDate(null, new Date())}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Task</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: MULTI-USER KANBAN */}
        {activeTab === "kanban" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#e9e9e7] rounded-xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#787774] uppercase tracking-wider">
                  VIEWING DATE:
                </span>
                <button
                  onClick={() => setIsKanbanCalendarOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#e9e9e7] hover:bg-[#f7f6f3] text-xs font-semibold text-[#37352f] shadow-2xs transition"
                >
                  <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
                  <span>{format(kanbanDate, "EEEE, MMM d, yyyy")}</span>
                </button>
              </div>

              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setKanbanDate(subDays(kanbanDate, 1))}
                  className="p-1.5 border border-[#e9e9e7] hover:bg-[#f7f6f3] rounded-lg text-[#787774] transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setKanbanDate(new Date())}
                  className="px-3 py-1 bg-white border border-[#e9e9e7] hover:bg-[#f7f6f3] text-[#37352f] font-semibold rounded-lg transition text-xs shadow-2xs"
                >
                  Today
                </button>
                <button
                  onClick={() => setKanbanDate(addDays(kanbanDate, 1))}
                  className="p-1.5 border border-[#e9e9e7] hover:bg-[#f7f6f3] rounded-lg text-[#787774] transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {kanbanMembersData.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-[#787774] border border-dashed border-[#d1d5db] rounded-xl bg-white">
                  No team members assigned to this project yet. Use "Edit
                  Project Details" to assign members.
                </div>
              ) : (
                kanbanMembersData.map((emp) => (
                  <div
                    key={emp.id}
                    className="bg-white border border-[#e5e7eb] rounded-xl shadow-xs overflow-hidden flex flex-col"
                  >
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#fafafa] border-b border-[#e5e7eb]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#111827]">
                          {emp.name}
                        </span>
                        {emp.role && (
                          <span className="text-[11px] text-[#6b7280]">
                            ({emp.role})
                          </span>
                        )}
                      </div>
                      <button className="text-[#9ca3af] hover:text-[#111827] p-0.5 rounded">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-[#e5e7eb] bg-white grow min-h-[220px]">
                      {/* Backlog */}
                      <div className="flex flex-col">
                        <div className="py-2 px-2 border-b border-[#e5e7eb] text-center font-bold text-xs text-[#374151]">
                          Backlog
                        </div>
                        <div className="p-2 space-y-2 grow">
                          {emp.columns.backlog.length === 0 ? (
                            <div className="text-xs text-[#9ca3af] text-center py-8 italic font-light">
                              Empty
                            </div>
                          ) : (
                            emp.columns.backlog.map((task) => (
                              <div
                                key={task.id}
                                onClick={() => handleToggleTaskDone(task)}
                                className={`group p-2 sm:p-2.5 rounded-lg border text-xs leading-snug flex flex-col items-stretch justify-between gap-1.5 cursor-pointer shadow-2xs hover:opacity-90 transition sm:flex-row sm:items-center ${getTaskTheme(
                                  task.id,
                                )}`}
                              >
                                <span className="min-w-0 flex-1 line-clamp-2 font-semibold">
                                  {task.name}
                                </span>
                                <div className="flex items-center gap-1 self-end sm:self-auto">
                                  <span className="h-5 w-5 rounded-full bg-white/90 border border-black/10 text-[9px] font-extrabold flex items-center justify-center shrink-0">
                                    {emp.initials ||
                                      emp.name.slice(0, 2).toUpperCase()}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[#9ca3af] hover:text-rose-600 hover:bg-rose-50 transition"
                                    title="Delete task"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Do Today */}
                      <div className="flex flex-col">
                        <div className="py-2 px-2 border-b border-[#e5e7eb] text-center font-bold text-xs text-[#374151]">
                          Do today
                        </div>
                        <div className="p-2 space-y-2 grow">
                          {emp.columns.doToday.length === 0 ? (
                            <div className="text-xs text-[#9ca3af] text-center py-8 italic font-light">
                              No tasks for today
                            </div>
                          ) : (
                            emp.columns.doToday.map((task) => (
                              <div
                                key={task.id}
                                onClick={() => handleToggleTaskDone(task)}
                                className={`group p-2 sm:p-2.5 rounded-lg border text-xs leading-snug flex flex-col items-stretch justify-between gap-1.5 cursor-pointer shadow-2xs hover:opacity-90 transition sm:flex-row sm:items-center ${getTaskTheme(
                                  task.id,
                                )}`}
                              >
                                <span className="min-w-0 flex-1 line-clamp-2 font-semibold">
                                  {task.name}
                                </span>
                                <div className="flex items-center gap-1 self-end sm:self-auto">
                                  <span className="h-5 w-5 rounded-full bg-white/90 border border-black/10 text-[9px] font-extrabold flex items-center justify-center shrink-0">
                                    {emp.initials ||
                                      emp.name.slice(0, 2).toUpperCase()}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[#9ca3af] hover:text-rose-600 hover:bg-rose-50 transition"
                                    title="Delete task"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Completed */}
                      <div className="flex flex-col">
                        <div className="py-2 px-2 border-b border-[#e5e7eb] text-center font-bold text-xs text-[#374151]">
                          Completed
                        </div>
                        <div className="p-2 space-y-2 grow">
                          {emp.columns.completed.length === 0 ? (
                            <div className="text-xs text-[#9ca3af] text-center py-8 italic font-light">
                              Empty
                            </div>
                          ) : (
                            emp.columns.completed.map((task) => (
                              <div
                                key={task.id}
                                onClick={() => handleToggleTaskDone(task)}
                                className="group p-2 sm:p-2.5 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-900 text-xs leading-snug flex flex-col items-stretch justify-between gap-1.5 cursor-pointer shadow-2xs line-through opacity-75 transition sm:flex-row sm:items-center"
                              >
                                <span className="min-w-0 flex-1 line-clamp-2 font-semibold">
                                  {task.name}
                                </span>
                                <div className="flex items-center gap-1 self-end sm:self-auto">
                                  <span className="h-5 w-5 rounded-full bg-white/90 border border-black/10 text-[9px] font-extrabold flex items-center justify-center shrink-0">
                                    {emp.initials ||
                                      emp.name.slice(0, 2).toUpperCase()}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-emerald-700 hover:text-rose-600 hover:bg-rose-50 transition"
                                    title="Delete task"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-2 bg-white border-t border-[#e5e7eb] flex justify-end">
                      <button
                        onClick={() =>
                          handleOpenAddTaskForDate(emp.id, kanbanDate)
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-0.5"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* STAGE DETAILS MODAL */}
            {selectedMilestoneModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/45 p-3 sm:p-5">
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-label={`${selectedMilestoneModal.title} stage details`}
                  className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[#e9e9e7] bg-[#f8f8f6] shadow-2xl"
                >
                  <header className="flex items-start justify-between gap-4 border-b border-[#e5e5e1] bg-white px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#777772]">
                        Project roadmap · Stage details
                      </p>
                      <h2 className="mt-1 truncate text-lg font-semibold text-[#30302e]">
                        {selectedMilestoneModal.title}
                      </h2>
                      <p className="mt-1 text-xs text-[#787774]">
                        Due {selectedMilestoneModal.due_date || "date not set"}
                        {selectedMilestoneModal.sheet_progress != null &&
                          ` · ${selectedMilestoneModal.sheet_progress}% complete`}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-medium text-[#777772]">
                          Stage UUID
                        </span>
                        <code className="max-w-64 truncate rounded bg-[#f0f0ed] px-2 py-1 text-[10px] text-[#4c4c48]">
                          {selectedMilestoneModal.id}
                        </code>
                        <button
                          type="button"
                          title="Copy stage UUID for the sheet script"
                          aria-label="Copy stage UUID"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                String(selectedMilestoneModal.id),
                              );
                            } catch {
                              alert(
                                "Could not access the clipboard. Select and copy the stage UUID.",
                              );
                            }
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded text-[#777772] hover:bg-[#f0f0ed] hover:text-[#30302e]"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {selectedMilestoneModal.sheet_url && (
                        <a
                          href={selectedMilestoneModal.sheet_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#e5e5e1] bg-white px-2.5 text-xs font-medium text-[#5f5f5b] hover:bg-[#f4f4f1]"
                        >
                          Open sheet <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedMilestoneModal(null)}
                        aria-label="Close stage details"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-[#787774] hover:bg-[#f4f4f1]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </header>

                  <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <SubStagePanel
                      stage={selectedMilestoneModal}
                      onChange={(next) =>
                        handleSaveSubstages(selectedMilestoneModal.id, next)
                      }
                    />

                    <SheetsList stage={selectedMilestoneModal} />
                  </div>

                  <footer className="flex justify-end border-t border-[#e5e5e1] bg-white px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedMilestoneModal(null)}
                      className="h-8 rounded-md border border-[#e5e5e2] px-3 text-xs font-medium text-[#5f5f5b] hover:bg-[#f7f7f5]"
                    >
                      Done
                    </button>
                  </footer>
                </section>
              </div>
            )}
            {/* Kanban Date Picker Overlay Modal */}
            {isKanbanCalendarOpen && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-[320px] rounded-2xl border border-[#e9e9e7] bg-white p-4 shadow-2xl">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#e9e9e7]">
                    <span className="text-xs font-bold text-[#18181b]">
                      Select Viewing Date
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsKanbanCalendarOpen(false)}
                      className="p-1 text-[#787774] hover:text-black rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex justify-center [&_.rdp]:m-0 [&_.rdp-table]:max-w-full [&_.rdp-cell]:p-0.5">
                    <DayPicker
                      mode="single"
                      selected={kanbanDate}
                      onSelect={(d) => {
                        if (d) setKanbanDate(d);
                        setIsKanbanCalendarOpen(false);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* INTERACTIVE CALENDAR */}
        {activeTab === "timeline" && (
          <div className="bg-white border border-[#dfe1e6] rounded-2xl shadow-xl overflow-hidden">
            {/* Calendar Control Header */}
            <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-[#dfe1e6] bg-[#f4f5f7] gap-4">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-[#0052cc]" />
                <h2 className="text-base font-bold text-[#172b4d]">
                  {format(calendarStartDate, "MMMM yyyy")}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCalendarStartDate(subDays(calendarStartDate, 30))
                  }
                  className="p-1.5 bg-white border border-[#dfe1e6] hover:bg-[#ebecf0] rounded-lg text-[#5e6c84]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCalendarStartDate(new Date())}
                  className="px-3 py-1 bg-white border border-[#dfe1e6] hover:bg-[#ebecf0] text-[#172b4d] font-semibold rounded-lg text-xs shadow-2xs"
                >
                  Today
                </button>
                <button
                  onClick={() =>
                    setCalendarStartDate(addDays(calendarStartDate, 30))
                  }
                  className="p-1.5 bg-white border border-[#dfe1e6] hover:bg-[#ebecf0] rounded-lg text-[#5e6c84]"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-[#dfe1e6] bg-[#f4f5f7] text-center text-xs font-bold text-[#5e6c84] py-2.5">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Calendar Matrix Grid (Row-by-Row Week grouping) */}
            <div className="bg-[#dfe1e6] divide-y divide-[#dfe1e6]">
              {Array.from({
                length: Math.ceil(calendarDays.length / 7),
              }).map((_, weekIndex) => {
                const weekDays = calendarDays.slice(
                  weekIndex * 7,
                  (weekIndex + 1) * 7,
                );

                return (
                  <div
                    key={weekIndex}
                    className="grid grid-cols-7 bg-white relative"
                  >
                    {/* Render Day Cells */}
                    {weekDays.map((day, idx) => {
                      const isCurrentDay = isSameDay(day, new Date());
                      return (
                        <div
                          key={idx}
                          onClick={() => handleOpenAddTaskForDate(null, day)}
                          className={`min-h-[120px] p-2.5 flex flex-col justify-between cursor-pointer hover:bg-blue-50/10 transition border-r border-b border-[#dfe1e6] last:border-r-0 relative ${
                            isCurrentDay ? "bg-blue-50/30" : "bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold ${
                                isCurrentDay
                                  ? "h-6 w-6 rounded-full bg-[#de350b] text-white flex items-center justify-center shadow-2xs"
                                  : "text-[#172b4d]"
                              }`}
                            >
                              {format(day, "d")}
                            </span>
                            <span className="opacity-0 group-hover:opacity-100 text-[#0052cc] text-xs font-bold transition">
                              + Add
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Absolute Spanning Task Strips Overlay for this Week Row */}
                    <div className="absolute inset-x-0 top-10 pointer-events-none grid grid-cols-7 gap-x-1 px-1">
                      {tasks
                        .filter((task) => {
                          if (!task.due_date) return false;
                          const start = parseISO(
                            task.start_date || task.due_date,
                          );
                          const end = parseISO(task.due_date);
                          return (
                            end >= startOfDay(weekDays[0]) &&
                            start <= startOfDay(weekDays[6])
                          );
                        })
                        .map((task) => {
                          const start = parseISO(
                            task.start_date || task.due_date,
                          );
                          const end = parseISO(task.due_date);

                          const rowIndexStart = Math.max(
                            0,
                            weekDays.findIndex(
                              (d) => isSameDay(d, start) || d > start,
                            ),
                          );
                          const rowIndexEnd = Math.min(
                            6,
                            weekDays.findIndex(
                              (d) => isSameDay(d, end) || d > end,
                            ),
                          );

                          const actualStartIdx =
                            start < weekDays[0] ? 0 : rowIndexStart;
                          const actualEndIdx =
                            end > weekDays[6]
                              ? 6
                              : rowIndexEnd === -1
                                ? 6
                                : rowIndexEnd;
                          const spanCols = actualEndIdx - actualStartIdx + 1;

                          const priorityCfg = getPriorityConfig(task.priority);
                          const assignee = employees.find(
                            (e) => e.id === task.assignee_id,
                          );

                          return (
                            <div
                              key={task.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTaskModal(task);
                              }}
                              style={{
                                gridColumn: `${actualStartIdx + 1} / span ${spanCols}`,
                              }}
                              className={`pointer-events-auto my-0.5 p-2 text-xs font-semibold flex items-center justify-between shadow-xs cursor-pointer transition hover:opacity-90 ${priorityCfg.color} ${
                                task.status === "done"
                                  ? "line-through opacity-60"
                                  : ""
                              } rounded-lg border`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                {priorityCfg.icon}
                                <span className="truncate">{task.name}</span>
                              </div>
                              {assignee && (
                                <span className="h-4 w-4 rounded-full bg-[#0052cc] text-white text-[8px] font-bold flex items-center justify-center shrink-0 ml-2">
                                  {assignee.initials || assignee.name.charAt(0)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 3: TABLE VIEW */}
        {activeTab === "table" && (
          <div className="bg-white border border-[#e9e9e7] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f7f6f3] border-b border-[#e9e9e7] text-[#787774]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Tasks</th>
                    <th className="py-2.5 px-3 font-semibold">Assignee</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Timeline</th>
                    <th className="py-2.5 px-4 font-semibold">Progress</th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9e9e7]">
                  {tasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-xs text-[#9b9a97]"
                      >
                        No tasks created yet. Click <b>+ New Task</b> above to
                        assign one.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => {
                      const assignee = employees.find(
                        (e) => e.id === task.assignee_id,
                      );
                      const progressValue = calculateDateProgress(
                        task.created_at,
                        task.due_date,
                        task.status,
                      );

                      return (
                        <tr
                          key={task.id}
                          className="hover:bg-[#f7f6f3]/60 transition"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5 text-[#9b9a97]" />
                              <span
                                className={`font-medium ${
                                  task.status === "done"
                                    ? "line-through text-[#9b9a97]"
                                    : "text-[#37352f]"
                                }`}
                              >
                                {task.name}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {assignee ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#f0efe9] text-[#37352f] text-xs font-medium">
                                <span
                                  className={`h-4 w-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center shrink-0 ${
                                    assignee.color || "bg-blue-600"
                                  }`}
                                >
                                  {assignee.initials || assignee.name.charAt(0)}
                                </span>
                                {assignee.name}
                              </span>
                            ) : (
                              <span className="text-[#9b9a97] text-xs">
                                Unassigned
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <select
                              value={task.status || "pending"}
                              onChange={(e) =>
                                handleUpdateTaskStatus(task.id, e.target.value)
                              }
                              className="text-xs font-semibold px-2 py-0.5 rounded-md border border-[#e9e9e7] bg-white outline-none cursor-pointer"
                            >
                              <option value="pending">Pending</option>
                              <option value="progress">In progress</option>
                              <option value="done">Done</option>
                            </select>
                          </td>

                          <td className="py-3 px-3 text-[#787774] font-medium">
                            {task.due_date
                              ? isNaN(new Date(task.due_date).getTime())
                                ? task.due_date
                                : format(
                                    new Date(task.due_date),
                                    "MMM dd, yyyy",
                                  )
                              : "No date"}
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 bg-[#e9e9e7] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    task.status === "done"
                                      ? "bg-emerald-500"
                                      : "bg-blue-600"
                                  }`}
                                  style={{ width: `${progressValue}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-[#787774]">
                                {progressValue}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                              className=" p-1.5 rounded-md text-[#9ca3af] hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW: COMPLETED ARCHIVE */}
        {activeTab === "completed" && (
          <div className="bg-white border border-[#e9e9e7] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f7f6f3] border-b border-[#e9e9e7] text-[#787774]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">
                      Completed Task
                    </th>
                    <th className="py-2.5 px-3 font-semibold">Assignee</th>
                    <th className="py-2.5 px-3 font-semibold">
                      Due / Completion Date
                    </th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9e9e7]">
                  {tasks.filter((t) => t.status === "done").length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-xs text-[#9b9a97]"
                      >
                        No completed tasks found in the archive yet.
                      </td>
                    </tr>
                  ) : (
                    tasks
                      .filter((t) => t.status === "done")
                      .map((task) => {
                        const assignee = employees.find(
                          (e) => e.id === task.assignee_id,
                        );
                        return (
                          <tr
                            key={task.id}
                            className="hover:bg-[#f7f6f3]/60 transition"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span className="font-medium text-[#37352f] line-through opacity-80">
                                  {task.name}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              {assignee ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#f0efe9] text-[#37352f] text-xs font-medium">
                                  <span className="h-4 w-4 rounded-full bg-blue-600 text-[8px] font-bold text-white flex items-center justify-center shrink-0">
                                    {assignee.initials ||
                                      assignee.name.charAt(0)}
                                  </span>
                                  {assignee.name}
                                </span>
                              ) : (
                                <span className="text-[#9b9a97] text-xs italic">
                                  Unassigned
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-[#787774] font-medium">
                              {task.due_date
                                ? isNaN(new Date(task.due_date).getTime())
                                  ? task.due_date
                                  : format(
                                      new Date(task.due_date),
                                      "MMM dd, yyyy",
                                    )
                                : "No date"}
                            </td>

                            <td className="py-3 px-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Done
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleTaskDone(task)}
                                  className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-[#37352f] text-[10px] font-semibold transition"
                                  title="Reopen task"
                                >
                                  Reopen
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.id);
                                  }}
                                  className="p-1.5 rounded-md text-[#9ca3af] hover:text-rose-600 hover:bg-rose-50 transition"
                                  title="Delete task"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ADMIN FILE TREE EXPLORER FOR DELIVERABLES --- */}
        {/* {activeTab === "deliverables" && (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f3f4f6] pb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#374151]">
                  Deliverables File & Links ({currentTabDeliverables.length}{" "}
                  items)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenCreateFolderModal("root")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f7f6f3] text-[#37352f] hover:bg-[#e9e9e7] text-xs font-bold transition"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span>New Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddDeliverableModal("root")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Asset</span>
                </button>
              </div>
            </div>

            {(() => {
              const renderDeliverable = (item, depth = 0) => {
                const displayedItem = getDisplayedDeliverable(item);
                const displayVersion =
                  selectedDeliverableVersions[item.id] || item.version || 1;

                return (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between gap-3 py-1.5 px-2 rounded-md hover:bg-blue-50/70 transition"
                  >
                    <div
                      className="flex items-center gap-2 min-w-0"
                      style={{ paddingLeft: depth * 4 }}
                    >
                      <span className="text-gray-300">├──</span>
                      {item.type === "file" ? (
                        <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      )}
                      <a
                        href={displayedItem.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`truncate hover:underline font-sans font-medium text-xs ${
                          item.type === "file"
                            ? "text-emerald-700"
                            : "text-blue-700"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {displayedItem.title || item.title}
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewHistory(item);
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-black text-[10px] font-bold font-sans shrink-0 transition"
                        title="View version history"
                      >
                        <History className="h-2.5 w-2.5" />
                        <span>v{displayVersion}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:inline text-[10px] text-gray-400 font-sans">
                        by{" "}
                        <span className="uppercase font-semibold text-gray-600">
                          {item.uploaded_by || "admin"}
                        </span>
                        {item.created_at
                          ? ` • ${format(parseISO(item.created_at), "MMM dd, yyyy")}`
                          : ""}
                      </span>
                      {item.uploaded_by === "admin" && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenAddDeliverableModal(
                                item.folder_id || "root",
                                item,
                              )
                            }
                            className="p-0.5 text-gray-500 hover:text-black"
                            title="Edit / Move Asset"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDeliverable(item.id)}
                            className="p-0.5 text-gray-500 hover:text-rose-600"
                            title="Delete Asset"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              };

              const renderFolder = (folder, depth = 0) => {
                const isExpanded = Boolean(expandedFolders[folder.id]);
                const children = projectFolders.filter(
                  (f) => f.parent_id === folder.id,
                );
                const assets = currentTabDeliverables.filter(
                  (item) => item.folder_id === folder.id,
                );

                return (
                  <div key={folder.id} className="space-y-1">
                    <div
                      className="group flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-gray-200/60 text-[#374151] transition"
                      style={{ marginLeft: depth * 18 }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleFolder(folder.id)}
                        className="flex items-center gap-1.5 min-w-0 cursor-pointer text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        )}
                        {isExpanded ? (
                          <FolderOpen className="h-4 w-4 text-amber-500 fill-amber-400 shrink-0" />
                        ) : (
                          <Folder className="h-4 w-4 text-amber-500 fill-amber-400 shrink-0" />
                        )}
                        <span className="truncate font-semibold">
                          {folder.name}
                        </span>
                        <span className="text-[10px] text-gray-400 font-sans">
                          ({assets.length})
                        </span>
                      </button>

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenAddDeliverableModal(folder.id)
                          }
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Add asset here"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateFolderModal(folder.id)}
                          className="p-1 text-gray-500 hover:bg-white rounded"
                          title="New subfolder"
                        >
                          <FolderPlus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRenameFolder(folder)}
                          className="p-1 text-gray-500 hover:bg-white rounded"
                          title="Rename folder"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(folder.id)}
                          className="p-1 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete folder"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div
                        className="space-y-1 border-l border-dashed border-gray-300 ml-4"
                        style={{ marginLeft: depth * 18 + 16 }}
                      >
                        {children.map((child) =>
                          renderFolder(child, depth + 1),
                        )}
                        {assets.map((item) =>
                          renderDeliverable(item, depth + 1),
                        )}
                        {children.length === 0 && assets.length === 0 && (
                          <div className="py-1 pl-5 text-[11px] text-gray-400 italic font-sans">
                            empty folder
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              };

              const rootFolders = projectFolders.filter(
                (folder) => !folder.parent_id || folder.parent_id === "root",
              );
              const unfiled = currentTabDeliverables.filter(
                (item) => !item.folder_id,
              );

              return (
                <div className="font-mono text-sm space-y-1 bg-[#fafafa] border border-[#e5e7eb] rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg hover:bg-gray-200/60 transition">
                    <button
                      type="button"
                      onClick={() => toggleFolder("root")}
                      className="flex items-center gap-1.5 min-w-0 text-[#111827] font-bold cursor-pointer"
                    >
                      {expandedFolders.root ? (
                        <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                      )}
                      <FolderOpen className="h-4 w-4 text-amber-500 fill-amber-400" />
                      <span className="truncate">
                        {project?.title?.toLowerCase().replace(/\s+/g, "-") ||
                          "workspace"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateFolderModal("root")}
                      className="p-1 text-gray-500 hover:text-blue-600 rounded"
                      title="New folder"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {expandedFolders.root && (
                    <div className="pl-5 space-y-1 border-l border-dashed border-gray-300 ml-2 mt-1">
                      {rootFolders.map((folder) => renderFolder(folder))}

                      {unfiled.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center gap-1.5 py-1 px-2 text-[#6b7280] font-semibold">
                            <Folder className="h-4 w-4 text-gray-400" />
                            <span>Unfiled</span>
                            <span className="text-[10px] text-gray-400 font-sans">
                              ({unfiled.length})
                            </span>
                          </div>
                          <div className="pl-5 border-l border-dashed border-gray-300 ml-2">
                            {unfiled.map((item) => renderDeliverable(item, 1))}
                          </div>
                        </div>
                      )}

                      {rootFolders.length === 0 && unfiled.length === 0 && (
                        <div className="py-8 text-center text-[11px] text-gray-400 italic font-sans">
                          No folders or assets yet. Create a folder or add an
                          asset.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )} */}
      </div>

      {/* MODAL: ADD DYNAMIC PROJECT TAB */}
      {isAddTabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white border border-[#e9e9e7] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#e9e9e7]">
              <h3 className="text-sm font-bold text-[#37352f]">
                Add Custom Project Tab
              </h3>
              <button
                onClick={() => setIsAddTabModalOpen(false)}
                className="p-1 text-[#787774] hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={handleCreateCustomTab}
              className="space-y-4 pt-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Tab Name *
                </label>
                <input
                  required
                  placeholder="e.g. Branding, Design Assets, QA..."
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#f7f6f3] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e9e9e7]">
                <button
                  type="button"
                  onClick={() => setIsAddTabModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#787774] hover:bg-[#f7f6f3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTab}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                >
                  {isSavingTab ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Create Tab"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE FOLDER MODAL */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white border border-[#e9e9e7] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#e9e9e7]">
              <h3 className="text-sm font-bold text-[#37352f]">
                {folderParentId === "root"
                  ? "Create New Folder"
                  : "Create New Subfolder"}
              </h3>
              <button
                onClick={() => setIsCreateFolderModalOpen(false)}
                className="p-1 text-[#787774] hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={handleSaveFolder}
              className="space-y-4 pt-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Folder Name *
                </label>
                <input
                  required
                  autoFocus
                  placeholder="e.g. Design Assets, Documentation..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#f7f6f3] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e9e9e7]">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#787774] hover:bg-[#f7f6f3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFolder}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1.5"
                >
                  {isSavingFolder ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FolderPlus className="h-3.5 w-3.5" />
                  )}
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD TASK MODAL */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-[#e9e9e7] rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[90dvh] flex flex-col my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e9e9e7] shrink-0">
              <h2 className="text-base font-bold text-[#37352f]">
                Add New Task
              </h2>
              <button
                onClick={() => setIsAddTaskModalOpen(false)}
                className="p-1.5 text-[#787774] hover:text-black rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={addTask}
              className="space-y-4 pt-4 text-xs overflow-y-auto"
            >
              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Task Description *
                </label>
                <input
                  required
                  placeholder="e.g. Implement authentication middleware..."
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#f7f6f3] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Assignee
                </label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#f7f6f3] text-xs text-[#37352f] outline-none focus:bg-white focus:border-blue-600 transition"
                >
                  <option value="">Select Assignee</option>
                  {projectTeamMembers.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.role || "Member"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Task Status
                </label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#f7f6f3] text-xs text-[#37352f] outline-none focus:bg-white focus:border-blue-600 transition"
                >
                  <option value="pending">Pending</option>
                  <option value="progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Task Date Range (Start to Due) *
                </label>
                <button
                  type="button"
                  onClick={() => setIsTaskCalendarOpen(true)}
                  className="w-full h-9 px-3 rounded-lg bg-[#f7f6f3] border border-[#e9e9e7] text-xs font-medium text-[#37352f] flex items-center justify-between hover:bg-white hover:border-blue-600 transition"
                >
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-3.5 w-3.5 text-[#787774]" />
                    {taskDateRange?.from
                      ? taskDateRange.to
                        ? `${format(taskDateRange.from, "MMM dd, yyyy")} → ${format(taskDateRange.to, "MMM dd, yyyy")}`
                        : format(taskDateRange.from, "MMM dd, yyyy")
                      : "Select date range..."}
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold uppercase">
                    Pick Range
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#e9e9e7] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#787774] hover:bg-[#f7f6f3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTask}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-700 shadow-xs transition disabled:opacity-50"
                >
                  {isSavingTask ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Create Task
                </button>
              </div>
            </form>
          </div>

          {isTaskCalendarOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-[340px] rounded-2xl border border-[#e9e9e7] bg-white p-4 shadow-2xl">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#e9e9e7]">
                  <span className="text-xs font-bold text-[#18181b]">
                    Select Task Start &amp; End Range
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsTaskCalendarOpen(false)}
                    className="p-1 text-[#787774] hover:text-black rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex justify-center [&_.rdp]:m-0 [&_.rdp-table]:max-w-full [&_.rdp-cell]:p-0.5">
                  <DayPicker
                    mode="range"
                    selected={taskDateRange}
                    onSelect={(range) => {
                      if (range) setTaskDateRange(range);
                    }}
                  />
                </div>
                <div className="mt-3 pt-2 border-t border-[#e9e9e7] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsTaskCalendarOpen(false)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Apply Range
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD DELIVERABLE MODAL */}
      {isAddDeliverableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-[#e9e9e7] rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[90dvh] flex flex-col my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e9e9e7] shrink-0">
              <h2 className="text-base font-bold text-[#37352f]">
                {editingDeliverable ? "Edit Shared Asset" : "Add Shared Asset"}
              </h2>
              <button
                onClick={() => setIsAddDeliverableModalOpen(false)}
                className="p-1.5 text-[#787774] hover:text-black rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={saveDeliverable}
              className="space-y-4 pt-4 text-xs overflow-y-auto"
            >
              <div className="inline-flex rounded-lg bg-[#f0efe9] p-1 text-xs font-semibold text-[#787774]">
                <button
                  type="button"
                  onClick={() => setDelivType("link")}
                  className={`px-3 py-1 rounded-md transition ${delivType === "link" ? "bg-white text-[#37352f] shadow-xs" : "hover:text-[#37352f]"}`}
                >
                  URL Link
                </button>
                <button
                  type="button"
                  onClick={() => setDelivType("file")}
                  className={`px-3 py-1 rounded-md transition ${delivType === "file" ? "bg-white text-[#37352f] shadow-xs" : "hover:text-[#37352f]"}`}
                >
                  File Upload
                </button>
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Asset Title *
                </label>
                <input
                  required
                  placeholder="e.g. Design Specs, Staging URL..."
                  value={delivTitle}
                  onChange={(e) => setDelivTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#f7f6f3] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Folder
                </label>
                <select
                  value={targetFolderId}
                  onChange={(e) => setTargetFolderId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#f7f6f3] text-xs text-[#37352f] outline-none focus:bg-white focus:border-blue-600 transition"
                >
                  <option value="root">Unfiled / Root</option>
                  {projectFolders.map((folder) => {
                    const depth = (() => {
                      let current = folder;
                      let count = 0;
                      const seen = new Set();
                      while (
                        current?.parent_id &&
                        current.parent_id !== "root" &&
                        !seen.has(current.parent_id)
                      ) {
                        seen.add(current.parent_id);
                        count += 1;
                        current = projectFolders.find(
                          (f) => f.id === current.parent_id,
                        );
                      }
                      return count;
                    })();
                    return (
                      <option key={folder.id} value={folder.id}>
                        {"— ".repeat(depth)}
                        {folder.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {delivType === "link" ? (
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Destination URL *
                  </label>
                  <input
                    required
                    placeholder="https://..."
                    value={delivUrl}
                    onChange={(e) => setDelivUrl(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#f7f6f3] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Select File {!editingDeliverable && "*"}
                  </label>
                  <input
                    required={!editingDeliverable}
                    type="file"
                    onChange={(e) => setFileObject(e.target.files?.[0] || null)}
                    className="w-full h-9 px-3 py-1.5 rounded-lg border border-[#e9e9e7] bg-[#f7f6f3] text-xs outline-none file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-white file:text-[#37352f]"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#e9e9e7] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddDeliverableModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#787774] hover:bg-[#f7f6f3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-700 shadow-xs transition disabled:opacity-50"
                >
                  {uploadingFile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="h-3.5 w-3.5" />
                  )}
                  {editingDeliverable ? "Save Changes" : "Add Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROJECT MODAL WITH NEW CLEAN UI + TEAM MEMBERS */}
      {isEditProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-[#e9e9e7] rounded-2xl shadow-2xl p-5 sm:p-7 max-h-[90dvh] flex flex-col my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e9e9e7] shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-[#37352f]">
                Edit Project Details
              </h2>
              <button
                onClick={() => setIsEditProjectOpen(false)}
                className="p-1.5 rounded-lg text-[#787774] hover:bg-[#f7f6f3] hover:text-black transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleUpdateProject}
              className="space-y-4 pt-4 text-xs overflow-y-auto pr-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Advanced Icon Component from AllProjectsTab */}
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                    Company Icon Image
                  </label>

                  {project?.icon && !removeIcon ? (
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 rounded-lg border border-[#e9e9e7] bg-[#fafafa] flex items-center justify-center overflow-hidden">
                        <img
                          src={project.icon}
                          alt="Current company icon"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setRemoveIcon(true)}
                        className="p-2 rounded-md text-[#9b9a97] hover:text-red-600 hover:bg-red-50 transition"
                        title="Remove current icon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : removeIcon ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-rose-600 font-medium">
                        Icon will be removed on save.
                      </span>
                      <button
                        type="button"
                        onClick={() => setRemoveIcon(false)}
                        className="text-[10px] font-semibold text-blue-600 hover:underline"
                      >
                        Undo
                      </button>
                    </div>
                  ) : null}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      setIconFile(e.target.files?.[0] || null);
                      setRemoveIcon(false);
                    }}
                    className="mt-2 w-full h-9 px-3 py-1.5 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-white file:text-[#37352f] outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Project Title *
                  </label>
                  <input
                    required
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>
              </div>

              {/* Team Member Checkboxes */}
              <div>
                <label className="block font-semibold text-[#37352f] mb-1.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  Assigned Team Members
                </label>
                <div className="max-h-36 overflow-y-auto border border-[#e9e9e7] rounded-lg p-2.5 space-y-2 bg-[#fafafa]">
                  {employees.length === 0 ? (
                    <p className="text-[11px] text-[#787774] italic">
                      No employees available. Add them from the Employees tab.
                    </p>
                  ) : (
                    employees.map((emp) => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-2.5 cursor-pointer text-xs select-none"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTeam.includes(emp.id)}
                          onChange={() => {
                            setSelectedTeam((prev) =>
                              prev.includes(emp.id)
                                ? prev.filter((id) => id !== emp.id)
                                : [...prev, emp.id],
                            );
                          }}
                          className="h-4 w-4 rounded border-[#d4d4d8] text-blue-600"
                        />
                        <span className="font-medium text-[#37352f]">
                          {emp.name}
                        </span>
                        <span className="text-[10px] text-[#787774] bg-white border border-[#e4e4e7] px-1.5 py-0.5 rounded">
                          {emp.role || "Member"}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Project Description
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Client Name
                  </label>
                  <input
                    value={editForm.client_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, client_name: e.target.value })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Location / Link
                  </label>
                  <input
                    placeholder="e.g. New York or URL"
                    value={editForm.location}
                    onChange={(e) =>
                      setEditForm({ ...editForm, location: e.target.value })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Launch Date
                  </label>
                  <input
                    type="date"
                    value={editForm.launch_date}
                    onChange={(e) =>
                      setEditForm({ ...editForm, launch_date: e.target.value })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Status Pill Label
                  </label>
                  <input
                    placeholder="e.g. Active Build"
                    value={editForm.status_note}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status_note: e.target.value })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#e9e9e7]">
                <h4 className="font-bold text-[#37352f] uppercase tracking-wider text-[11px] mb-2">
                  Official Links (Displayed on Client Portal)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Feedback Doc URL
                  </label>
                  <input
                    placeholder="https://docs.google.com/..."
                    value={editForm.feedback_url}
                    onChange={(e) =>
                      setEditForm({ ...editForm, feedback_url: e.target.value })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Agreements URL
                  </label>
                  <input
                    placeholder="https://..."
                    value={editForm.agreements_url}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        agreements_url: e.target.value,
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Scope of Work (SOW)
                  </label>
                  <input
                    placeholder="https://..."
                    value={editForm.scope_of_work_url}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        scope_of_work_url: e.target.value,
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#e9e9e7] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditProjectOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#e9e9e7] text-xs font-semibold text-[#787774] hover:bg-[#fafafa] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProject}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-700 shadow-xs transition disabled:opacity-50"
                >
                  {isSavingProject ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAGE EDIT / ADD MODAL WITH POPUP CALENDAR */}

      <StageSetupModal
        isOpen={isStageModalOpen}
        onClose={() => {
          setIsStageModalOpen(false);
          setEditingStage(null);
        }}
        onSave={handleSaveStage}
        initialData={editingStage}
        projectId={project?.id}
      />
      {/* <StageSetupModal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        onSave={handleSaveStage}
        initialData={editingStage}
        projectId={project?.id}
      /> */}
      {/* TASK INSPECTOR MODAL */}
      {selectedTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="w-full max-w-md bg-white border border-[#dfe1e6] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#dfe1e6]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#0052cc] bg-blue-50 px-2 py-0.5 rounded">
                  TASK-{selectedTaskModal.id.slice(0, 4)}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(selectedTaskModal.status)}`}
                >
                  {selectedTaskModal.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedTaskModal(null)}
                className="p-1 text-[#5e6c84] hover:text-[#172b4d] rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <h3 className="text-sm font-bold text-[#172b4d]">
                  {selectedTaskModal.name}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-[#f4f5f7] p-3 rounded-xl border border-[#dfe1e6]">
                  <span className="text-[10px] font-bold text-[#5e6c84] uppercase block mb-1">
                    Assignee
                  </span>
                  <span className="font-semibold text-[#172b4d]">
                    {employees.find(
                      (e) => e.id === selectedTaskModal.assignee_id,
                    )?.name || "Unassigned"}
                  </span>
                </div>
                <div className="bg-[#f4f5f7] p-3 rounded-xl border border-[#dfe1e6]">
                  <span className="text-[10px] font-bold text-[#5e6c84] uppercase block mb-1">
                    Timeline Range
                  </span>
                  <span className="font-semibold text-[#172b4d]">
                    {selectedTaskModal.start_date || selectedTaskModal.due_date
                      ? `${selectedTaskModal.start_date || selectedTaskModal.due_date} → ${selectedTaskModal.due_date}`
                      : "No date set"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#dfe1e6]">
              <button
                onClick={() => {
                  handleToggleTaskDone(selectedTaskModal);
                  setSelectedTaskModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition"
              >
                {selectedTaskModal.status === "done"
                  ? "Mark In Progress"
                  : "Mark as Done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VERSION HISTORY MODAL */}
      {historyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-[#e9e9e7] rounded-2xl shadow-2xl p-5 sm:p-6 max-h-[85dvh] flex flex-col my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e9e9e7] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <History className="h-4 w-4 text-blue-600 shrink-0" />
                <h2 className="text-sm font-bold text-[#37352f] truncate">
                  Version History — {historyModalItem.title}
                </h2>
              </div>
              <button
                onClick={() => {
                  setHistoryModalItem(null);
                  setHistoryData([]);
                }}
                className="p-1.5 text-[#787774] hover:text-black rounded-md shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="pt-4 space-y-2 overflow-y-auto text-xs">
              {/* Current version */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 min-w-0">
                  {historyModalItem.type === "file" ? (
                    <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  )}
                  <a
                    href={historyModalItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:underline font-medium text-blue-700"
                  >
                    {historyModalItem.title}
                  </a>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold shrink-0">
                  v{historyModalItem.version || 1} · Current
                </span>
              </div>

              {/* Archived versions */}
              {isLoadingHistory ? (
                <div className="py-8 flex items-center justify-center text-[#9b9a97]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : historyData.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-[#9b9a97] italic">
                  No earlier versions archived yet.
                </div>
              ) : (
                historyData.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#f7f6f3] border border-[#e9e9e7]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {v.type === "file" ? (
                        <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      )}
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate hover:underline font-medium text-[#37352f]"
                      >
                        {v.title}
                      </a>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 text-[10px] font-bold">
                        v{v.version}
                      </span>
                      <span className="text-[9px] text-[#9b9a97] mt-0.5">
                        {v.archived_at
                          ? format(
                              parseISO(v.archived_at),
                              "MMM dd, yyyy hh:mm a",
                            )
                          : ""}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* UPDATE NOTIFICATION POPUP */}
      {updateAvailable && (
        <div
          className="fixed bottom-6 right-6 flex items-center gap-4 rounded-xl border border-[#e9e9e7] bg-white p-4 shadow-2xl transition-all"
          style={{ zIndex: 99999 }}
        >
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#37352f]">
              Update Available
            </span>
            <span className="text-xs text-[#787774]">
              Workspace data has changed.
            </span>
          </div>
          <button
            onClick={() => {
              onRefreshRef.current?.();
              setUpdateAvailable(false);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 shadow-xs"
          >
            Refresh Now
          </button>
          <button
            onClick={() => setUpdateAvailable(false)}
            className="p-1 text-[#9b9a97] hover:text-[#37352f] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
