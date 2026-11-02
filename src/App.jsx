import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { supabase } from "./lib/supabase";
import {
  Loader2,
  LayoutDashboard,
  FolderOpen,
  Users,
  ShieldCheck,
  Plus,
  ChevronLeft,
  ChevronRight,
  Bell,
  Settings,
  Search,
  Sun,
  Moon,
  Clock3,
  ListTodo,
  CalendarDays,
  Workflow,
  Library,
  FileText,
  Layers,
  Sparkles,
  Copy,
  ExternalLink,
  X,
} from "lucide-react";
import ClientPortal from "./components/ClientPortal";
import AllProjectsTab from "./components/AllProjectsTab";
import EmployeesTab from "./components/EmployeesTab";
import HomeDashboard, {
  ClientMark,
  UpdatesView,
  TasksInbox,
  CalendarView,
  ProcessesView,
  TaskCreateDialog,
} from "./components/HomeDashboard";
import ClientWorkspace from "./components/ClientWorkspace";
import PixelsLogo from "./components/PixelsLogo";
import { DashboardFilterProvider } from "./context/DashboardFilterContext";
import { isOpenTask } from "./lib/workspace";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/client/:token" element={<ClientRouteWrapper />} />
        <Route
          path="/client"
          element={
            <ClientErrorView message="Project workspace link is missing a security token." />
          }
        />
        <Route path="/*" element={<AdminMainLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

function ClientRouteWrapper() {
  const { token } = useParams();
  const [project, setProject] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClientData = async () => {
    setLoading(true);
    const { data: projData } = await supabase
      .from("projects")
      .select("*, milestones(*), tasks(*), deliverables(*)")
      .eq("client_token", token)
      .single();
    if (projData) setProject(projData);
    const { data: empData } = await supabase.from("employees").select("*");
    if (empData) setEmployees(empData);
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchClientData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f6f4] flex items-center justify-center text-xs text-[#6b7280]">
        <Loader2 className="h-5 w-5 animate-spin text-[#171717] mr-2" /> Loading
        client portal...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#f6f6f4] flex items-center justify-center text-xs text-rose-600 font-semibold">
        Project workspace not found or link has expired.
      </div>
    );
  }

  const daysRemaining = project.launch_date
    ? Math.ceil(
        (new Date(project.launch_date) - new Date()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <ClientPortal
      project={project}
      employees={employees}
      daysRemaining={daysRemaining > 0 ? daysRemaining : 0}
      onRefresh={fetchClientData}
    />
  );
}

function ClientErrorView({ message }) {
  return (
    <div className="min-h-screen bg-[#f6f6f4] flex items-center justify-center p-4">
      <div className="bg-white border border-[#ecece9] rounded-2xl p-8 max-w-md w-full text-center shadow-sm space-y-3">
        <PixelsLogo className="h-10 w-10 mx-auto" />
        <h2 className="text-base font-bold text-rose-600">Access Denied</h2>
        <p className="text-xs text-[#6b7280] leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

function AdminMainLayout() {
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState("global");
  const [activeTab, setActiveTab] = useState("home");
  const [clientView, setClientView] = useState("dashboard");
  const [highlightTaskId, setHighlightTaskId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("pixels-dark-mode") === "true",
  );
  const [openCreateClient, setOpenCreateClient] = useState(false);
  const [openCreateEvent, setOpenCreateEvent] = useState(false);
  const [taskCreateDate, setTaskCreateDate] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [trackedSeconds, setTrackedSeconds] = useState(0);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [
        { data: projectsData },
        { data: employeesData },
        { data: calendarEventsData, error: calendarEventsError },
      ] = await Promise.all([
        supabase
          .from("projects")
          .select("*, milestones(*), tasks(*), deliverables(*)")
          .order("created_at", { ascending: false }),
        supabase.from("employees").select("*").order("name"),
        supabase
          .from("calendar_events")
          .select("*")
          .order("event_date", { ascending: true }),
      ]);
      setProjects(projectsData || []);
      setEmployees(employeesData || []);
      setCalendarEvents(calendarEventsData || []);
      if (calendarEventsError) {
        console.warn(
          "Calendar events are unavailable:",
          calendarEventsError.message,
        );
      }
      if (projectsData && projectsData.length > 0 && !activeProjectId) {
        setActiveProjectId(projectsData[0].id);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const refresh = () => fetchDataRef.current(true);
    const channel = supabase
      .channel("admin-dashboard-data")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "milestones" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events" },
        refresh,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!tracking) return undefined;
    const id = setInterval(() => setTrackedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [tracking]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("pixels-dark-mode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goHome = () => {
    setScope("global");
    setActiveTab("home");
    setHighlightTaskId(null);
  };

  const openNewClient = () => {
    setOpenCreateClient(true);
  };

  const openCalendarEventCreator = () => {
    setOpenCreateEvent(true);
  };

  const openTaskCreator = (date = new Date()) => {
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000,
    );
    setTaskCreateDate(localDate.toISOString().slice(0, 10));
  };

  const selectClient = (id, view = "dashboard", taskId = null) => {
    setActiveProjectId(id);
    setScope("client");
    setClientView(view);
    setHighlightTaskId(taskId);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const openGlobalTasks = (task) => {
    setScope("global");
    setActiveTab("tasks");
    setHighlightTaskId(task?.id || null);
    if (task?.project?.id) setActiveProjectId(task.project.id);
  };

  const handleCreateOpened = useCallback(() => setOpenCreateClient(false), []);
  const handleCalendarEventOpened = useCallback(
    () => setOpenCreateEvent(false),
    [],
  );

  const createCalendarEvent = async (event) => {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        title: event.title.trim(),
        event_date: event.date,
        project_id: event.projectId,
        description: event.description.trim() || null,
      })
      .select()
      .single();

    if (error) {
      alert(
        `Could not save this event. Check the calendar_events table and its RLS policy: ${error.message}`,
      );
      return false;
    }

    setCalendarEvents((current) => [...current, data]);
    return true;
  };

  const createTaskFromCalendar = async ({
    name,
    projectId,
    assigneeId,
    dueDate,
  }) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from("tasks").insert({
      project_id: projectId,
      tab_id: "tracker",
      name,
      assignee_id: assigneeId,
      created_at: now,
      status: "pending",
      progress: 0,
      start_date: dueDate,
      due_date: dueDate,
    });
    if (error) {
      alert(`Could not create this task: ${error.message}`);
      return false;
    }
    await fetchData(true);
    return true;
  };
  const toggleTask = async (task) => {
    const done = !isOpenTask(task);
    await supabase
      .from("tasks")
      .update({
        status: done ? "progress" : "done",
        progress: done ? 50 : 100,
      })
      .eq("id", task.id);
    fetchData(true);
  };

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.title, p.client_name, p.status_note]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [projects, searchQuery]);

  const openTaskCount = useMemo(
    () =>
      projects.reduce(
        (n, p) => n + (p.tasks || []).filter((t) => isOpenTask(t)).length,
        0,
      ),
    [projects],
  );

  const formatTracked = (secs) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, "0");
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const activeProject = useMemo(() => {
    return (
      projects.find((p) => p.id === activeProjectId) || projects[0] || null
    );
  }, [projects, activeProjectId]);

  const calculateDaysRemaining = (dateStr) => {
    if (!dateStr) return 0;
    const diff = Math.ceil(
      (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24),
    );
    return diff > 0 ? diff : 0;
  };

  const seeAsClient = () => {
    if (!activeProject?.client_token) {
      alert("This client does not have a portal token yet.");
      return;
    }
    const clientUrl = `${window.location.origin}/client/${activeProject.client_token}`;
    setShareLink(clientUrl);
    setShareCopied(false);
  };

  const copyShareLink = async () => {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
    } catch {
      const input = document.createElement("textarea");
      input.value = shareLink;
      input.readOnly = true;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      setShareCopied(copied);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f6f4] flex flex-col items-center justify-center gap-3 text-[#5e6c84]">
        <PixelsLogo className="h-10 w-10" />
        <Loader2 className="h-5 w-5 animate-spin text-[#171717]" />
        <span className="text-xs font-semibold">Loading workspace...</span>
      </div>
    );
  }

  const pageTitle =
    scope === "client"
      ? {
          dashboard: "Dashboard",
          updates: "Updates",
          tasks: "Tasks",
          documents: "Documents",
          library: "Deliverables",
          settings: "Client settings",
          tracker: "Tracker",
        }[clientView] || "Dashboard"
      : {
          home: "Home",
          updates: "Updates",
          tasks: "Tasks",
          calendar: "Calendar",
          employees: "Processes",
          team: "Team",
          "all-projects": "All Clients",
        }[activeTab] || "Home";

  const navClass = (active) =>
    `w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px] transition ${
      active
        ? "bg-[#e8e8e5] text-[#30302e] font-medium"
        : "text-[#5f5f5b] hover:bg-[#ecece9]"
    }`;

  const inClient = scope === "client" && activeProject;

  return (
    <DashboardFilterProvider>
      <div className="min-h-screen antialiased flex flex-col md:flex-row overflow-hidden bg-background text-foreground">
        <aside
          className={`hidden md:flex ${
            sidebarCollapsed ? "w-[68px]" : "w-[220px]"
          } bg-[#f3f3f0] text-[#6f6f6c] flex-col shrink-0 border-r border-[#e8e8e4] select-none h-screen sticky top-0 transition-[width]`}
        >
          <div className="h-12 px-3 flex items-center justify-between">
            <button
              onClick={goHome}
              className="flex items-center gap-2 min-w-0 text-left"
              title="Home"
            >
              <PixelsLogo className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-[13px] font-semibold text-[#343432] truncate">
                  Pixels
                </span>
              )}
            </button>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDarkMode((v) => !v)}
                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-[#e8e8e5]"
                  aria-label={
                    darkMode ? "Switch to light mode" : "Switch to dark mode"
                  }
                  title={
                    darkMode ? "Switch to light mode" : "Switch to dark mode"
                  }
                >
                  {darkMode ? (
                    <Moon className="h-3.5 w-3.5" />
                  ) : (
                    <Sun className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(true)}
                  className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-[#e8e8e5]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          {sidebarCollapsed && (
            <div className="mx-auto mt-1 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-[#e8e8e5]"
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDarkMode((v) => !v)}
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-[#e8e8e5]"
                aria-label={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
                title={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
              >
                {darkMode ? (
                  <Moon className="h-3.5 w-3.5" />
                ) : (
                  <Sun className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}
          <div className="px-2.5 pt-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-full h-8 flex items-center gap-2 px-2 rounded-md text-[12px] text-[#8a8a86] hover:bg-[#ecece9]"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span>Search</span>
                  <span className="ml-auto text-[10px]">⌘ K</span>
                </>
              )}
            </button>
          </div>
          {inClient ? (
            <>
              <div className="px-2.5 pt-2">
                <button
                  type="button"
                  onClick={goHome}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-[#8a8a86] hover:bg-[#ecece9]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {!sidebarCollapsed && "All clients"}
                </button>
                <div className="mt-1 flex items-center gap-2 px-2 py-1.5">
                  <ClientMark
                    project={activeProject}
                    index={0}
                    size="h-5 w-5"
                  />
                  {!sidebarCollapsed && (
                    <span className="text-[12px] font-medium text-[#30302e] truncate">
                      {activeProject.title}
                    </span>
                  )}
                </div>
              </div>
              <nav className="px-2.5 pt-2 pb-3 space-y-0.5 flex-1 overflow-y-auto">
                {!sidebarCollapsed && (
                  <p className="px-2 py-1 text-[10px] font-semibold text-[#999995] uppercase tracking-[0.12em]">
                    Workspace
                  </p>
                )}
                <ClientNavBtn
                  icon={LayoutDashboard}
                  label="Dashboard"
                  active={clientView === "dashboard"}
                  collapsed={sidebarCollapsed}
                  onClick={() => setClientView("dashboard")}
                  className={navClass}
                />
                <ClientNavBtn
                  icon={FileText}
                  label="Documents"
                  active={clientView === "documents"}
                  collapsed={sidebarCollapsed}
                  onClick={() => setClientView("documents")}
                  className={navClass}
                />
                <ClientNavBtn
                  icon={Library}
                  label="Deliverables"
                  active={clientView === "library"}
                  collapsed={sidebarCollapsed}
                  onClick={() => setClientView("library")}
                  className={navClass}
                />
                
                
                {(activeProject.custom_tabs || []).map((tab) => (
                  <ClientNavBtn
                    key={tab.id}
                    icon={Sparkles}
                    label={tab.name}
                    active={clientView === tab.id}
                    collapsed={sidebarCollapsed}
                    onClick={() => setClientView(tab.id)}
                    className={navClass}
                  />
                ))}
               
              </nav>
            </>
          ) : (
            <>
              <nav className="px-2.5 pt-2 pb-3 text-[12px] space-y-0.5">
                <button
                  type="button"
                  onClick={goHome}
                  className={navClass(activeTab === "home")}
                >
                  <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                  {!sidebarCollapsed && "Home"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("updates")}
                  className={navClass(activeTab === "updates")}
                >
                  <Bell className="h-3.5 w-3.5 shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      Updates
                      <span className="ml-auto text-[10px] text-[#aaa]">
                        {Math.min(openTaskCount, 99)}
                      </span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("tasks")}
                  className={navClass(activeTab === "tasks")}
                >
                  <ListTodo className="h-3.5 w-3.5 shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      Tasks
                      <span className="ml-auto text-[10px] text-[#aaa]">
                        {openTaskCount}
                      </span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("calendar")}
                  className={navClass(activeTab === "calendar")}
                >
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  {!sidebarCollapsed && "Calendar"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("employees")}
                  className={navClass(activeTab === "employees")}
                >
                  <Workflow className="h-3.5 w-3.5 shrink-0" />
                  {!sidebarCollapsed && "Processes"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("team")}
                  className={navClass(activeTab === "team")}
                >
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {!sidebarCollapsed && "Team"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenCreateClient(false);
                    setActiveTab("all-projects");
                  }}
                  className={navClass(activeTab === "all-projects")}
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  {!sidebarCollapsed && "All Clients"}
                </button>
              </nav>
              {!sidebarCollapsed && (
                <div className="px-4 pb-1 flex items-center justify-between text-[10px] font-semibold text-[#999995] uppercase tracking-[0.12em]">
                  <span>Clients</span>
                  <button
                    onClick={openNewClient}
                    className="h-5 w-5 rounded flex items-center justify-center hover:bg-[#e9e9e6]"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-2.5 space-y-0.5">
                {projects.map((project, index) => (
                  <button
                    key={project.id}
                    onClick={() => selectClient(project.id)}
                    className={navClass(false)}
                    title={project.title}
                  >
                    <ClientMark
                      project={project}
                      index={index}
                      size="h-4 w-4"
                    />
                    {!sidebarCollapsed && (
                      <span className="truncate">{project.title}</span>
                    )}
                  </button>
                ))}
                <button
                  onClick={openNewClient}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px] text-[#a1a19d] hover:bg-[#ecece9]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {!sidebarCollapsed && "Add client"}
                </button>
              </div>
            </>
          )}
          {/* Bottom Sidebar Section */}
          <div className="p-2.5 border-t border-[#e8e8e4] space-y-2 mt-auto">
            {inClient && activeProject ? (
              <div className="p-3  space-y-2" style={{ boxShadow: "none" }}>
                {!sidebarCollapsed && (
                  <>
                    <span className="text-[10px] uppercase font-bold text-[#2c83fc] tracking-wider block">
                      Active Project
                    </span>
                    <p className="text-xs font-bold text-[#000] truncate">
                      {activeProject.title}
                    </p>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const clientUrl = `${window.location.origin}/client/${activeProject.client_token}`;
                    navigator.clipboard.writeText(clientUrl);
                    alert(
                      "Secure client portal share link copied to clipboard!",
                    );
                  }}
                  className="w-full py-1.5 px-2 rounded bg-[#579dff]/10 hover:bg-[#579dff]/20 text-[#2c83fc] text-[11px] font-bold transition flex items-center justify-center gap-1"
                  title="Copy Secure Link"
                >
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  {!sidebarCollapsed && <span>Copy Secure Link</span>}
                </button>
              </div>
            ) : (
              <div></div>
            )}
          </div>
        </aside>
        <div className="min-w-0 flex-1 flex flex-col h-screen overflow-y-auto">
          <header className="h-12 bg-transparent px-5 sm:px-8 py-2 flex items-center justify-between shrink-0 sticky top-0 z-30">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-[#6f6f6c]">
              {inClient ? (
                <>
                  <span className="shrink-0">Pixels</span>
                  <span className="shrink-0 text-[#c4c4bf]">/</span>
                  <span
                    className="min-w-0 max-w-[96px] truncate sm:max-w-48"
                    title={activeProject.title}
                  >
                    {activeProject.title}
                  </span>
                  <span className="shrink-0 text-[#c4c4bf]">/</span>
                  <span className="shrink-0 font-medium text-[#3a3a37]">
                    {pageTitle}
                  </span>
                </>
              ) : (
                <>
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span className="font-medium text-[#3a3a37]">
                    {pageTitle}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDarkMode((v) => !v)}
                className="md:hidden h-8 w-8 flex items-center justify-center rounded-md hover:bg-[#e8e8e5]"
                aria-label={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
                title={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
              >
                {darkMode ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </button>
              {inClient && (
                <button
                  onClick={seeAsClient}
                  className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#ecece9] text-[10px] font-bold"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Share
                </button>
              )}
              {/* <button
                type="button"
                onClick={openNewClient}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#171717] text-white text-[12px] font-medium hover:bg-black"
              >
                <Plus className="h-3.5 w-3.5" /> New client
              </button> */}
            </div>
          </header>
          {inClient && (
            <nav
              aria-label="Project sections"
              className="flex gap-1 overflow-x-auto border-b border-[#e9e9e6] bg-[#f3f3f0] px-3 py-2 md:hidden"
            >
              {[
                ["dashboard", "Dashboard", LayoutDashboard],
                ["documents", "Documents", FileText],
                ["library", "Deliverables", Library],
              ].map(([view, label, Icon]) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setClientView(view)}
                  aria-pressed={clientView === view}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[11px] ${
                    clientView === view
                      ? "bg-[#e3e3df] font-medium text-[#30302e]"
                      : "text-[#5f5f5b] hover:bg-[#eaeae6]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </nav>
          )}
          <main
            className={`px-4 sm:px-8 w-full mx-auto flex-1 pb-24 md:pb-10 ${
              inClient || activeTab === "tasks" || activeTab === "calendar"
                ? "max-w-[1180px]"
                : "max-w-6xl"
            }`}
          >
            {scope === "global" && activeTab === "home" && (
              <HomeDashboard
                projects={projects}
                events={calendarEvents}
                employees={employees}
                onNewClient={openNewClient}
                onOpenTasks={() => setActiveTab("tasks")}
                onAddEvent={openCalendarEventCreator}
                onViewCalendar={() => setActiveTab("calendar")}
                onSelectClient={selectClient}
                onOpenTask={openGlobalTasks}
              />
            )}
            {scope === "global" && activeTab === "updates" && (
              <UpdatesView projects={projects} onSelectClient={selectClient} />
            )}
            {scope === "global" && activeTab === "tasks" && (
              <TasksInbox
                projects={projects}
                employees={employees}
                onSelectClient={selectClient}
                highlightTaskId={highlightTaskId}
                onToggleTask={toggleTask}
                onCreateTask={openTaskCreator}
              />
            )}
            {scope === "global" && (
              <div className={activeTab === "calendar" ? "" : "hidden"}>
                <CalendarView
                  projects={projects}
                  events={calendarEvents}
                  onSelectClient={selectClient}
                  onOpenTask={openGlobalTasks}
                  onCreateEvent={createCalendarEvent}
                  onCreateTask={openTaskCreator}
                  openCreate={openCreateEvent}
                  onCreateOpened={handleCalendarEventOpened}
                />
              </div>
            )}
            {scope === "client" &&
              (activeProject ? (
                <ClientWorkspace
                  project={activeProject}
                  employees={employees}
                  daysRemaining={calculateDaysRemaining(
                    activeProject.launch_date,
                  )}
                  onRefresh={() => fetchData(true)}
                  view={clientView}
                  onViewChange={setClientView}
                  highlightTaskId={highlightTaskId}
                  onSeeAsClient={seeAsClient}
                />
              ) : (
                <div className="my-auto py-16 px-6 bg-white rounded-2xl border border-[#e9e9e7] text-center max-w-md mx-auto">
                  <h3 className="text-sm font-bold text-[#37352f]">
                    No projects found
                  </h3>
                  <p className="text-xs text-[#787774] mt-1 mb-4">
                    Create your first client workspace to get started.
                  </p>
                  <button
                    onClick={openNewClient}
                    className="px-4 py-2 bg-[#171717] text-white text-xs font-semibold rounded-lg hover:bg-black transition"
                  >
                    Create Project
                  </button>
                </div>
              ))}
            {scope === "global" && (
              <div className={activeTab === "all-projects" ? "" : "hidden"}>
                <AllProjectsTab
                  projects={projects}
                  onSelect={selectClient}
                  onRefresh={() => fetchData(true)}
                  openCreate={openCreateClient}
                  onCreateOpened={handleCreateOpened}
                />
              </div>
            )}
            {scope === "global" && activeTab === "employees" && (
              <ProcessesView
                projects={projects}
                onSelectClient={selectClient}
              />
            )}
            {scope === "global" && activeTab === "team" && (
              <EmployeesTab
                employees={employees}
                projects={projects}
                onRefresh={() => fetchData(true)}
              />
            )}
          </main>
        </div>
        {searchOpen && (
          <div
            className="fixed inset-0 z-[80] bg-[#1a1a18]/25 backdrop-blur-[2px] flex items-start justify-center pt-24 px-4"
            onClick={() => setSearchOpen(false)}
          >
            <div
              className="w-full max-w-lg bg-white rounded-2xl border border-[#ecece9] shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 px-3 h-11 border-b border-[#ecece9]">
                <Search className="h-4 w-4 text-[#b0b0ab]" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clients, projects..."
                  className="flex-1 text-[13px] outline-none bg-transparent"
                />
                <span className="text-[10px] text-[#b0b0ab]">ESC</span>
              </div>
              <div className="max-h-80 overflow-y-auto p-1.5">
                {filteredClients.length === 0 ? (
                  <p className="px-3 py-8 text-center text-[12px] text-[#9a9a96]">
                    No matching clients
                  </p>
                ) : (
                  filteredClients.map((project, index) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => selectClient(project.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[13px] hover:bg-[#f6f6f3]"
                    >
                      <ClientMark
                        project={project}
                        index={index}
                        size="h-5 w-5"
                      />
                      <span className="truncate">{project.title}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        {shareLink && (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShareLink("")}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-client-title"
              className="w-full max-w-md overflow-hidden rounded-xl border border-[#e9e9e7] bg-white p-4 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2
                    id="share-client-title"
                    className="text-sm font-semibold text-[#30302e]"
                  >
                    Client portal link
                  </h2>
                  <p className="mt-1 text-xs text-[#787774]">
                    Share this link with the client.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShareLink("")}
                  aria-label="Close client link"
                  className="rounded p-1 text-[#787774] hover:bg-[#f4f4f1]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                readOnly
                value={shareLink}
                onFocus={(event) => event.target.select()}
                aria-label="Client portal URL"
                className="mt-4 h-10 w-full min-w-0 rounded-md border border-[#e5e5e2] bg-transparent px-2 text-xs"
              />
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <a
                  href={shareLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#e5e5e2] px-3 text-xs font-medium text-[#30302e]"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open portal
                </a>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#20201e] px-3 text-xs font-medium text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {shareCopied ? "Copied" : "Copy link"}
                </button>
              </div>
            </section>
          </div>
        )}
        {taskCreateDate && (
          <TaskCreateDialog
            key={taskCreateDate}
            projects={projects}
            employees={employees}
            initialDate={taskCreateDate}
            onClose={() => setTaskCreateDate(null)}
            onSubmit={createTaskFromCalendar}
          />
        )}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e9e9e7] px-3 py-2 flex items-center justify-around md:hidden shadow-lg">
          <button
            onClick={goHome}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              scope === "global" && activeTab === "home"
                ? "text-[#171717]"
                : "text-[#787774]"
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            Home
          </button>
          <button
            onClick={() => {
              setScope("global");
              setActiveTab("tasks");
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              (scope === "global" && activeTab === "tasks") ||
              (scope === "client" && clientView === "tasks")
                ? "text-[#171717]"
                : "text-[#787774]"
            }`}
          >
            <ListTodo className="h-5 w-5" />
            Tasks
          </button>
          <button
            onClick={() => {
              setScope("global");
              setActiveTab("calendar");
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              activeTab === "calendar" && scope === "global"
                ? "text-[#171717]"
                : "text-[#787774]"
            }`}
          >
            <CalendarDays className="h-5 w-5" />
            Calendar
          </button>
          <button
            onClick={() => {
              setScope("global");
              setActiveTab("all-projects");
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              activeTab === "all-projects" ? "text-[#171717]" : "text-[#787774]"
            }`}
          >
            <FolderOpen className="h-5 w-5" />
            Clients
          </button>
          <button
            onClick={() => {
              setScope("global");
              setActiveTab("team");
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              activeTab === "team" ? "text-[#171717]" : "text-[#787774]"
            }`}
          >
            <Users className="h-5 w-5" />
            Team
          </button>
        </nav>
      </div>
    </DashboardFilterProvider>
  );
}

function ClientNavBtn({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
  className,
  badge,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className(active)}
      title={label}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {badge != null && (
            <span className="ml-auto text-[10px] text-[#aaa]">{badge}</span>
          )}
        </>
      )}
    </button>
  );
}
