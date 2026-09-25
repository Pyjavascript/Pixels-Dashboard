import React, { useState, useEffect } from "react";
import { supabase, uploadDeliverableFile } from "../lib/supabase";
import {
  Plus,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  MapPin,
  Building2,
  ArrowUpRight,
  Trash2,
  Users,
  Settings2,
  Loader2,
  ImageIcon,
  LayoutGrid,
  GanttChartSquare,
} from "lucide-react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import ProjectsTimelineTab from "./ProjectsTimelineTab";

function isValidUrl(string) {
  if (!string || typeof string !== "string") return false;
  const trimmed = string.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("www.")
  );
}

export default function AllProjectsTab({ projects, onSelect, onRefresh }) {
  const [view, setView] = useState("grid"); // "grid" | "timeline"
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  // Form states
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");

  // Icon and Team states
  const [iconFile, setIconFile] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState([]);

  const [removeIcon, setRemoveIcon] = useState(false);

  // Tier states
  const [tier, setTier] = useState("Startup");
  const [customTier, setCustomTier] = useState("");

  const [selectedDate, setSelectedDate] = useState(new Date(2026, 8, 30));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const [feedbackUrl, setFeedbackUrl] = useState("");
  const [agreementsUrl, setAgreementsUrl] = useState("");
  const [scopeUrl, setScopeUrl] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Fetch employees for team checkboxes
  useEffect(() => {
    async function fetchEmployees() {
      const { data } = await supabase.from("employees").select("*");
      if (data) setEmployees(data);
    }
    fetchEmployees();
  }, []);

  const handleCheckboxChange = (empId) => {
    setSelectedTeam((prev) =>
      prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId],
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    let finalIconUrl = null;

    if (iconFile) {
      try {
        finalIconUrl = await uploadDeliverableFile(iconFile, "project-icons");
      } catch (err) {
        alert("Failed to upload icon: " + err.message);
        setIsSaving(false);
        return;
      }
    }

    const finalTier = tier === "Other" ? customTier.trim() || "Custom" : tier;
    const slug =
      title.toLowerCase().replace(/\s+/g, "-") + `-${Date.now().toString(36)}`;
    const launchDate = format(selectedDate, "yyyy-MM-dd");

    const { error } = await supabase.from("projects").insert({
      slug,
      title: title.trim(),
      client_name: client.trim() || "Private Client",
      description: "Custom agency project workspace.",
      location: location.trim() || "Remote",
      tier: finalTier,
      icon: finalIconUrl,
      launch_date: launchDate,
      status_note: "Project initialized",
      feedback_url: feedbackUrl.trim() || null,
      agreements_url: agreementsUrl.trim() || null,
      scope_url: scopeUrl.trim() || null,
      team_members: selectedTeam,
    });

    setIsSaving(false);
    if (error) {
      alert(error.message);
      return;
    }

    // Reset Form
    setTitle("");
    setClient("");
    setLocation("");
    setIconFile(null);
    setSelectedTeam([]);
    setTier("Startup");
    setCustomTier("");
    setFeedbackUrl("");
    setAgreementsUrl("");
    setScopeUrl("");
    setIsModalOpen(false);
    onRefresh();
  };

  const handleOpenEdit = (e, proj) => {
    e.stopPropagation();
    setEditingProject(proj);
    setTitle(proj.title || "");
    setClient(proj.client_name || "");
    setLocation(proj.location || "");
    let initialDate = new Date();
    if (proj.launch_date) {
      const parsed = new Date(proj.launch_date);
      if (!isNaN(parsed.getTime())) {
        initialDate = parsed;
      }
    }
    setSelectedDate(initialDate);
    setIconFile(null);
    setSelectedTeam(proj.team_members || []);
    setTier(
      ["Startup", "Business", "Enterprise"].includes(proj.tier)
        ? proj.tier
        : "Other",
    );
    setCustomTier(
      ["Startup", "Business", "Enterprise"].includes(proj.tier)
        ? ""
        : proj.tier || "",
    );
    setFeedbackUrl(proj.feedback_url || "");
    setAgreementsUrl(proj.agreements_url || "");
    setScopeUrl(proj.scope_url || proj.scope_of_work_url || "");
    setIsEditModalOpen(true);
    setRemoveIcon(false);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingProject) return;

    setIsSaving(true);
    let finalIconUrl = editingProject.icon;

    // --- ADDED THIS CHECK FOR REMOVING THE ICON ---
    if (removeIcon) {
      finalIconUrl = null;
    } else if (iconFile) {
      try {
        finalIconUrl = await uploadDeliverableFile(iconFile, "project-icons");
      } catch (err) {
        alert("Failed to upload icon: " + err.message);
        setIsSaving(false);
        return;
      }
    }

    const finalTier = tier === "Other" ? customTier.trim() || "Custom" : tier;
    const launchDate = format(selectedDate, "yyyy-MM-dd");

    const { error } = await supabase
      .from("projects")
      .update({
        title: title.trim(),
        client_name: client.trim(),
        location: location.trim(),
        launch_date: launchDate,
        tier: finalTier,
        team_members: selectedTeam,
        feedback_url: feedbackUrl.trim() || null,
        agreements_url: agreementsUrl.trim() || null,
        scope_of_work_url: scopeUrl.trim() || null,
        icon: finalIconUrl, // Removed the duplicate key that was at the bottom
      })
      .eq("id", editingProject.id);

    setIsSaving(false);
    if (error) {
      alert("Failed to update: " + error.message);
      return;
    }

    setIsEditModalOpen(false);
    setEditingProject(null);
    setRemoveIcon(false); // Reset state
    onRefresh();
  };
  const handleDeleteProject = async (e, project) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.title}"?`,
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", project.id);
    if (error) {
      alert(`Failed to delete project: ${error.message}`);
      return;
    }
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#37352f]">
            All Client Projects
          </h2>
          <p className="text-xs text-[#787774]">
            Manage and launch client workspaces.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-lg border border-[#e9e9e7] bg-[#fafafa] p-1">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                view === "grid"
                  ? "bg-white shadow-xs text-[#37352f]"
                  : "text-[#787774]"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setView("timeline")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                view === "timeline"
                  ? "bg-white shadow-xs text-[#37352f]"
                  : "text-[#787774]"
              }`}
            >
              <GanttChartSquare className="h-3.5 w-3.5" />
              Timeline
            </button>
          </div>

          <button
            onClick={() => {
              setTitle("");
              setClient("");
              setLocation("");
              setIconFile(null);
              setSelectedTeam([]);
              setTier("Startup");
              setCustomTier("");
              setFeedbackUrl("");
              setAgreementsUrl("");
              setScopeUrl("");
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold shadow-xs hover:bg-blue-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            New Project
          </button>
        </div>
      </div>

      {view === "timeline" ? (
        <ProjectsTimelineTab projects={projects} onRefresh={onRefresh} />
      ) : (
        <>
          {/* Projects Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map((proj) => {
              const isLocUrl = isValidUrl(proj.location);
              const locHref = isLocUrl
                ? proj.location.startsWith("http")
                  ? proj.location
                  : `https://${proj.location}`
                : null;

              const assignedMembers = employees.filter((emp) =>
                proj.team_members?.includes(emp.id),
              );

              return (
                <div
                  key={proj.id}
                  onClick={() => onSelect(proj.id)}
                  className="p-5 bg-white border border-[#e9e9e7] rounded-xl hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#0f7b6c] bg-[#ddedea] px-2 py-0.5 rounded flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {proj.tier || "Startup"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[#787774] font-medium">
                          Launch: {proj.launch_date}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(e, proj)}
                          className="p-1.5 rounded-md text-[#9b9a97] hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit project & team"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteProject(e, proj)}
                          className="p-1.5 rounded-md text-[#9b9a97] hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete project"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Title with Company Icon */}
                    <h3 className="text-base font-bold text-[#37352f] flex items-center gap-2.5 ">
                      {proj.icon ? (
                        <img
                          src={proj.icon}
                          alt="company icon"
                          className="h-7 w-7 rounded-md object-contain shrink-0"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {proj.title?.charAt(0) || "P"}
                        </div>
                      )}
                      <span className="truncate">{proj.title}</span>
                    </h3>

                    <div className="flex items-center justify-between text-xs text-[#787774] mt-1">
                      <span>{proj.client_name}</span>
                      {proj.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#9b9a97]" />
                          {isLocUrl ? (
                            <a
                              href={locHref}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                            >
                              {proj.location}
                              <ArrowUpRight className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span className="text-[#9b9a97]">
                              {proj.location}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Assigned Team Highlights */}
                    {assignedMembers.length > 0 && (
                      <div className=" pt-3 flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-[#787774] uppercase tracking-wider">
                          Assigned Team:
                        </span>
                        <div className="flex items-center -space-x-1.5 overflow-hidden">
                          {assignedMembers.map((member) => (
                            <div
                              key={member.id}
                              title={`${member.name} (${member.role || "Member"})`}
                              className={`h-6 w-6 rounded-full text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white ${
                                member.color || "bg-blue-600"
                              }`}
                            >
                              {member.initials}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#e9e9e7] flex items-center justify-between text-xs text-blue-600 font-semibold">
                    <span>Open Dashboard</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal Dialog for Creation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#e9e9e7] bg-white p-5 sm:p-6 shadow-2xl max-h-[90dvh] flex flex-col my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e9e9e7] shrink-0">
              <div>
                <h3 className="text-base font-bold text-[#18181b]">
                  Create Client Workspace
                </h3>
                <p className="text-xs text-[#787774]">
                  Configure launch target, company icon, team, and parameters.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-1.5 text-[#787774] hover:bg-[#f4f4f5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleCreate}
              className="space-y-4 text-xs overflow-y-auto pt-4 pr-1"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Project Title *
                  </label>
                  <input
                    required
                    placeholder="e.g. Apex Branding Redesign"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Client Name *
                  </label>
                  <input
                    required
                    placeholder="e.g. Acme Corp"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Replace Icon Image */}
              <div>
                <label className="block font-semibold text-[#37352f] mb-1 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                  Replace Company Icon Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setIconFile(e.target.files?.[0] || null);
                    setRemoveIcon(false); // Reset removal if they upload a new file
                  }}
                  className="w-full h-9 px-3 py-1.5 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-white file:text-[#37352f]"
                />
                {editingProject?.icon && !removeIcon && !iconFile && (
                  <button
                    type="button"
                    onClick={() => setRemoveIcon(true)}
                    className="mt-1.5 text-[10px] font-semibold text-rose-600 hover:underline"
                  >
                    Remove current icon
                  </button>
                )}
                {removeIcon && (
                  <p className="mt-1.5 text-[10px] text-rose-600 font-medium">
                    Icon will be removed upon saving.
                  </p>
                )}
              </div>

              {/* Team Member Checkboxes */}
              <div>
                <label className="block font-semibold text-[#37352f] mb-1.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  Assign Team Members
                </label>
                <div className="max-h-36 overflow-y-auto border border-[#e9e9e7] rounded-lg p-2.5 space-y-2 bg-[#fafafa]">
                  {employees.length === 0 ? (
                    <p className="text-[11px] text-[#787774] italic">
                      No employees found.
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
                          onChange={() => handleCheckboxChange(emp.id)}
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

              {/* Tier Selection */}
              <div>
                <label className="block font-semibold text-[#37352f] mb-1.5">
                  Project Tier
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["Startup", "Business", "Enterprise", "Other"].map(
                    (tierOption) => (
                      <button
                        key={tierOption}
                        type="button"
                        onClick={() => setTier(tierOption)}
                        className={`h-9 rounded-lg border text-xs font-semibold transition ${
                          tier === tierOption
                            ? "bg-blue-50 border-blue-600 text-blue-700 shadow-xs"
                            : "border-[#e9e9e7] bg-[#fafafa] text-[#787774] hover:bg-white"
                        }`}
                      >
                        {tierOption}
                      </button>
                    ),
                  )}
                </div>
                {tier === "Other" && (
                  <div className="mt-2">
                    <input
                      required
                      placeholder="Enter custom tier name..."
                      value={customTier}
                      onChange={(e) => setCustomTier(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                    />
                  </div>
                )}
              </div>

              {/* Location & Launch Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Location / Link
                  </label>
                  <input
                    placeholder="e.g. San Francisco or URL"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Launch Date
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(true)}
                    className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] flex items-center justify-between text-left font-medium hover:bg-white"
                  >
                    <span>{format(selectedDate, "PPP")}</span>
                    <CalendarIcon className="h-3.5 w-3.5 text-[#787774]" />
                  </button>
                </div>
              </div>

              {/* Doc Links */}
              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Google Feedback Doc URL (Optional)
                </label>
                <input
                  placeholder="https://docs.google.com/..."
                  value={feedbackUrl}
                  onChange={(e) => setFeedbackUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Agreements URL (Optional)
                </label>
                <input
                  placeholder="https://..."
                  value={agreementsUrl}
                  onChange={(e) => setAgreementsUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Scope of Work URL (Optional)
                </label>
                <input
                  placeholder="https://..."
                  value={scopeUrl}
                  onChange={(e) => setScopeUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#e9e9e7] shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-[#e9e9e7] bg-white font-semibold text-[#37352f]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-9 px-5 rounded-lg bg-blue-600 text-white font-semibold shadow-xs hover:bg-blue-700 flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl border border-[#e9e9e7] bg-white p-5 sm:p-6 shadow-2xl max-h-[90dvh] flex flex-col my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e9e9e7]">
              <h3 className="text-base font-bold text-[#18181b]">
                Edit Project & Team
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-[#787774]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleUpdate}
              className="space-y-4 text-xs overflow-y-auto pt-4"
            >
              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Project Title *
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Client Name *
                </label>
                <input
                  required
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                />
              </div>

              {/* Company Icon */}
              <div>
                <label className="block font-semibold text-[#37352f] mb-1 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                  Company Icon
                </label>

                {editingProject?.icon && !removeIcon ? (
                  <div className="flex items-center gap-3">
                    {/* Current Icon */}
                    <div className="relative h-12 w-12 rounded-lg border border-[#e9e9e7] bg-[#fafafa] flex items-center justify-center overflow-hidden">
                      <img
                        src={editingProject.icon}
                        alt="Current company icon"
                        className="h-full w-full object-contain"
                      />
                    </div>

                    {/* Delete Icon */}
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
                      Icon will be removed when you save.
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

                {/* Upload replacement */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setIconFile(e.target.files?.[0] || null);
                    setRemoveIcon(false);
                  }}
                  className="mt-2 w-full h-9 px-3 py-1.5 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-white file:text-[#37352f]"
                />
              </div>

              {/* Team Member Checkboxes */}
              <div>
                <label className="block font-semibold text-[#37352f] mb-1.5 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  Assigned Team Members
                </label>
                <div className="max-h-36 overflow-y-auto border border-[#e9e9e7] rounded-lg p-2.5 space-y-2 bg-[#fafafa]">
                  {employees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-2.5 cursor-pointer text-xs select-none"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeam.includes(emp.id)}
                        onChange={() => handleCheckboxChange(emp.id)}
                        className="h-4 w-4 rounded border-[#d4d4d8] text-blue-600"
                      />
                      <span className="font-medium text-[#37352f]">
                        {emp.name}
                      </span>
                      <span className="text-[10px] text-[#787774] bg-white border border-[#e4e4e7] px-1.5 py-0.5 rounded">
                        {emp.role || "Member"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tier Selection */}
              <div>
                <label className="block font-semibold text-[#37352f] mb-1.5">
                  Project Tier
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["Startup", "Business", "Enterprise", "Other"].map(
                    (tierOption) => (
                      <button
                        key={tierOption}
                        type="button"
                        onClick={() => setTier(tierOption)}
                        className={`h-9 rounded-lg border text-xs font-semibold transition ${
                          tier === tierOption
                            ? "bg-blue-50 border-blue-600 text-blue-700 shadow-xs"
                            : "border-[#e9e9e7] bg-[#fafafa] text-[#787774] hover:bg-white"
                        }`}
                      >
                        {tierOption}
                      </button>
                    ),
                  )}
                </div>
                {tier === "Other" && (
                  <div className="mt-2">
                    <input
                      required
                      placeholder="Enter custom tier name..."
                      value={customTier}
                      onChange={(e) => setCustomTier(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                    />
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Location / Link
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Launch Date
                </label>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen(true)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] flex items-center justify-between text-left font-medium hover:bg-white transition"
                >
                  <span>{format(selectedDate, "PPP")}</span>
                  <CalendarIcon className="h-3.5 w-3.5 text-[#787774]" />
                </button>
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Feedback Doc URL
                </label>
                <input
                  value={feedbackUrl}
                  onChange={(e) => setFeedbackUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Agreements URL
                </label>
                <input
                  value={agreementsUrl}
                  onChange={(e) => setAgreementsUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Scope of Work URL
                </label>
                <input
                  value={scopeUrl}
                  onChange={(e) => setScopeUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#e9e9e7]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-[#e9e9e7] bg-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-9 px-5 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-1.5"
                >
                  {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calendar Picker Modal */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
        style={{ zIndex: 9999 }}>
          <div className="w-full max-w-[320px] rounded-2xl border border-[#e9e9e7] bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#e9e9e7]">
              <span className="text-xs font-bold text-[#18181b]">
                Select Launch Date
              </span>
              <button
                type="button"
                onClick={() => setIsCalendarOpen(false)}
                className="p-1 text-[#787774]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-center">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (d) setSelectedDate(d);
                  setIsCalendarOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
