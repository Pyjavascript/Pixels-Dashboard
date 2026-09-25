import React, { useState, useEffect, useMemo } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
} from "react-router-dom";
import { supabase } from "./lib/supabase";
import {
  Loader2,
  LayoutDashboard,
  FolderOpen,
  Users,
  ShieldCheck,
  Plus,
  Building2,
  ChevronRight,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";

import ProjectDashboard from "./components/ProjectDashboard";
import ClientPortal from "./components/ClientPortal";
import AllProjectsTab from "./components/AllProjectsTab";
import EmployeesTab from "./components/EmployeesTab";
import { DashboardFilterProvider } from "./context/DashboardFilterContext";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Shareable Client Link Route (Clean View Only) */}
        <Route path="/client/:token" element={<ClientRouteWrapper />} />
        <Route path="/client" element={<ClientErrorView message="Project workspace link is missing a security token." />} />

        {/* Main Admin Jira-Style App */}
        <Route path="/*" element={<AdminMainLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

// --- Dedicated Client Route Wrapper ---
function ClientRouteWrapper() {
  const { token } = useParams();
  const [project, setProject] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClientData = async () => {
    setLoading(true);
    // Query project by secure client_token instead of slug
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
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center text-xs text-[#6b7280]">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" /> Loading
        client portal...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center text-xs text-rose-600 font-semibold">
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
    <div className="min-h-screen bg-[#f8f9fa] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <ClientPortal
          project={project}
          employees={employees}
          daysRemaining={daysRemaining > 0 ? daysRemaining : 0}
          onRefresh={fetchClientData}
        />
      </div>
    </div>
  );
}

function ClientErrorView({ message }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-8 max-w-md w-full text-center shadow-sm space-y-3">
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
  const [activeTab, setActiveTab] = useState("all-projects"); // 'overview' | 'all-projects' | 'employees'

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [{ data: projectsData }, { data: employeesData }] =
        await Promise.all([
          supabase
            .from("projects")
            .select("*, milestones(*), tasks(*), deliverables(*)")
            .order("created_at", { ascending: false }),
          supabase.from("employees").select("*").order("name"),
        ]);

      setProjects(projectsData || []);
      setEmployees(employeesData || []);

      if (projectsData && projectsData.length > 0 && !activeProjectId) {
        setActiveProjectId(projectsData[0].id);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex flex-col items-center justify-center gap-3 text-[#5e6c84]">
        <Loader2 className="h-6 w-6 animate-spin text-[#0052cc]" />
        <span className="text-xs font-semibold">Loading workspace...</span>
      </div>
    );
  }

  return (
    <DashboardFilterProvider>
      <div className="min-h-screen bg-[#f4f5f7] text-[#172b4d] antialiased flex flex-col md:flex-row overflow-hidden">
        {/* DESKTOP SIDEBAR (Jira Style) */}
        <aside className="hidden md:flex w-64 bg-white text-[#9fadbc] flex-col shrink-0 border-r border-[#e9e9e7] select-none h-screen sticky top-0">
          {/* Workspace Brand Header */}
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

          {/* Sidebar Nav Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 text-xs">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition ${
                activeTab === "overview"
                  ? "bg-[#e9e9e7] text-[#579dff]"
                  : "hover:bg-[#e9e9e7] text-[#9fadbc]"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Current Project</span>
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
          </nav>

          {activeProject && (
            <div className="p-3 m-3 bg-[#fffffc] rounded-xl border border-[#e9e9e7] space-y-2">
              <span className="text-[10px] uppercase font-bold text-[#579dff] tracking-wider block">
                Active Project
              </span>
              <p className="text-xs font-bold text-[#000] truncate">
                {activeProject.title}
              </p>
              <button
                onClick={() => {
                  // Use activeProject.client_token instead of activeProject.slug
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

        {/* MAIN CONTENT CANVAS */}
        <div className="flex-1 flex flex-col h-screen overflow-y-auto">
          {/* Top Header Bar */}
          <header className="h-14 bg-white border-b border-[#e9e9e7] px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
            <div className="h-14 flex items-center space-x-3 border-b border-[#e9e9e7]">
            <img src="./logo.svg" alt="Logo" className="h-1/2" />
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-[#3A3B6C] truncate hidden md:flex ">
                Pixels Creative Technologies
              </h4>
              
            </div>
          </div>

            <div className="flex items-center gap-3">
              {/* MOBILE ONLY COPY LINK BUTTON */}
              {activeProject && activeTab === "overview" && (
                <button
                  onClick={() => {
                    const clientUrl = `${window.location.origin}/client/${activeProject.client_token}`;
                    navigator.clipboard.writeText(clientUrl);
                    alert("Secure client portal share link copied to clipboard!");
                  }}
                  className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#579dff]/10 text-[#579dff] hover:bg-[#579dff]/20 transition text-[10px] font-bold border border-[#579dff]/20"
                  title="Copy Secure Link"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="inline">Client Client Link</span>
                </button>
              )}
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                MS
              </div>
            </div>
          </header>

          {/* Scrollable Workspace Body */}
          <main className="p-4 sm:p-8 max-w-6xl w-full mx-auto flex-1 pb-24 md:pb-8">
            {activeTab === "overview" &&
              (activeProject ? (
                <ProjectDashboard
                  project={activeProject}
                  employees={employees}
                  daysRemaining={calculateDaysRemaining(
                    activeProject.launch_date,
                  )}
                  onRefresh={() => fetchData(true)}
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
                    onClick={() => setActiveTab("all-projects")}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition"
                  >
                    Create Project
                  </button>
                </div>
              ))}

            {activeTab === "all-projects" && (
              <AllProjectsTab
                projects={projects}
                onSelect={(id) => {
                  setActiveProjectId(id);
                  setActiveTab("overview");
                }}
                onRefresh={() => fetchData(true)}
              />
            )}

            {activeTab === "employees" && (
              <EmployeesTab
                employees={employees}
                projects={projects}
                onRefresh={() => fetchData(true)}
              />
            )}
          </main>
        </div>

        {/* MOBILE BOTTOM NAV */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e9e9e7] px-6 py-2 flex items-center justify-around md:hidden shadow-lg">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              activeTab === "overview" ? "text-blue-600" : "text-[#787774]"
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            Project
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
      </div>
    </DashboardFilterProvider>
  );
}
