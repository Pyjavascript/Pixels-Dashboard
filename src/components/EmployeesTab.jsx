import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Plus,
  Users,
  Briefcase,
  Trash2,
  Settings2,
  X,
  Pencil,
} from "lucide-react";

export default function EmployeesTab({ employees, projects, onRefresh }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // New States for Roles Management
  const [roles, setRoles] = useState([]);
  const [isManagingRoles, setIsManagingRoles] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null);

  const openEditEmployee = (emp) => {
    setName(emp.name);
    setRole(emp.role);
    setEditingEmployee(emp);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parts = name.trim().split(" ");
    const initials =
      parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();

    await supabase
      .from("employees")
      .update({
        name: name.trim(),
        role: role.trim() || roles[0]?.name || "Team Member",
        initials,
      })
      .eq("id", editingEmployee.id);

    setName("");
    setRole(roles[0]?.name || "");
    setEditingEmployee(null);
    onRefresh();
  };

  const colors = [
    "bg-blue-600",
    "bg-teal-600",
    "bg-amber-600",
    "bg-purple-600",
    "bg-rose-600",
    "bg-indigo-600",
  ];

  // Fetch roles on mount
  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    const { data } = await supabase.from("roles").select("*").order("name");
    if (data) {
      setRoles(data);
      if (data.length > 0 && !role) setRole(data[0].name);
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    await supabase.from("roles").insert({ name: newRoleName.trim() });
    setNewRoleName("");
    fetchRoles();
  };

  const handleDeleteRole = async (id) => {
    if (!confirm("Remove this role from available options?")) return;
    await supabase.from("roles").delete().eq("id", id);
    fetchRoles();
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parts = name.trim().split(" ");
    const initials =
      parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    await supabase.from("employees").insert({
      name: name.trim(),
      role: role.trim() || roles[0]?.name || "Team Member",
      initials,
      color: randomColor,
    });

    setName("");
    setRole(roles[0]?.name || "");
    setIsAdding(false);
    onRefresh();
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to remove this team member?")) return;
    await supabase.from("employees").delete().eq("id", id);
    onRefresh();
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#37352f]">
            Team Members
          </h2>
          <p className="text-xs text-[#787774]">
            Manage your agency team and assign roles for task assignments.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsManagingRoles(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#e9e9e7] bg-white text-[#37352f] text-xs font-semibold shadow-sm hover:bg-[#f4f4f5] transition"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Manage Roles
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#18181b] text-white text-xs font-semibold shadow-sm hover:bg-black transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Member
          </button>
        </div>
      </div>

      {/* Grid of Team Cards OR Centered Empty State */}
      {employees.length === 0 ? (
        <div className="my-auto flex flex-col items-center justify-center py-16 px-6 bg-white border border-[#e9e9e7] rounded-2xl text-center max-w-md mx-auto w-full shadow-xs">
          <div className="h-12 w-12 rounded-full bg-[#f4f4f5] flex items-center justify-center mb-3">
            <Users className="h-6 w-6 text-[#787774]" />
          </div>
          <h3 className="text-sm font-bold text-[#37352f]">
            No Team Members Added
          </h3>
          <p className="text-xs text-[#787774] mt-1 mb-4">
            Add your team members to assign roles and track deliverable
            progress.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="h-9 px-4 rounded-lg bg-[#18181b] text-white text-xs font-semibold hover:bg-black transition"
          >
            Add First Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {employees.map((emp) => {
            const empProjects = projects.filter((project) =>
              project.team_members?.includes(emp.id),
            );

            return (
              <div
                key={emp.id}
                className="group p-4 bg-white border border-[#e9e9e7] rounded-xl shadow-xs hover:border-[#d4d4d8] transition"
              >
                {/* Employee Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs ${
                        emp.color || "bg-blue-600"
                      }`}
                    >
                      {emp.initials}
                    </div>

                    <div className="truncate">
                      <p className="text-xs font-bold text-[#37352f] truncate">
                        {emp.name}
                      </p>
                      <span className="text-[11px] text-[#787774] flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {emp.role || "Team Member"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEditEmployee(emp)}
                      className="p-1.5 rounded-md text-[#a1a1aa] hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(emp.id)}
                      className="p-1.5 rounded-md text-[#a1a1aa] hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Projects (unchanged) */}
                <div className="flex justify-start items-center gap-2 pt-3">
                  <p className="text-xs">Working On: </p>
                  {empProjects.length > 0 ? (
                    <div className="flex items-center">
                      {empProjects.slice(0, 5).map((project) => (
                        <div
                          key={project.id}
                          title={project.title}
                          className="h-7 w-7 rounded-full overflow-hidden -ml-1 first:ml-0"
                        >
                          {project.icon ? (
                            <img
                              src={project.icon}
                              alt={project.title}
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-[#f4f4f5] text-[9px] font-bold text-[#787774]">
                              {project.title?.charAt(0)}
                            </div>
                          )}
                        </div>
                      ))}

                      {empProjects.length > 5 && (
                        <div className="h-7 w-7 rounded-full bg-[#f4f4f5] border-2 border-white flex items-center justify-center text-[9px] font-bold text-[#787774] -ml-1">
                          +{empProjects.length - 5}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#9b9a97]">
                      No projects assigned
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Manage Roles */}
      {isManagingRoles && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#e9e9e7] bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-bold text-[#18181b]">
                  Manage Roles
                </h3>
                <p className="text-xs text-[#787774]">
                  Add or remove available roles.
                </p>
              </div>
              <button
                onClick={() => setIsManagingRoles(false)}
                className="text-[#a1a1aa] hover:text-[#18181b]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto pr-1">
              {roles.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[#e9e9e7] bg-[#fafafa]"
                >
                  <span className="text-xs font-semibold text-[#37352f]">
                    {r.name}
                  </span>
                  <button
                    onClick={() => handleDeleteRole(r.id)}
                    className="p-1 rounded text-[#a1a1aa] hover:bg-rose-50 hover:text-rose-600 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {roles.length === 0 && (
                <p className="text-xs text-center text-[#787774] py-2">
                  No custom roles found.
                </p>
              )}
            </div>

            <form onSubmit={handleAddRole} className="flex gap-2">
              <input
                required
                placeholder="New Role Name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="flex-1 h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
              />
              <button
                type="submit"
                className="h-9 px-3 rounded-lg bg-[#18181b] text-white text-xs font-semibold hover:bg-black transition shadow-xs"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Employee */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#e9e9e7] bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="mb-4">
              <h3 className="text-base font-bold text-[#18181b]">
                Edit Team Member
              </h3>
              <p className="text-xs text-[#787774]">
                Update employee name and designation.
              </p>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#37352f] mb-1">
                  Full Name
                </label>
                <input
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#37352f] mb-1">
                  Role / Designation
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                  {roles.length === 0 && (
                    <option value="Team Member">Team Member</option>
                  )}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e9e9e7]">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="h-9 px-4 rounded-lg border border-[#e9e9e7] bg-white text-xs font-semibold text-[#37352f] hover:bg-[#f4f4f5] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-[#18181b] text-white text-xs font-semibold hover:bg-black transition shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Employee */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#e9e9e7] bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="mb-4">
              <h3 className="text-base font-bold text-[#18181b]">
                Add Team Member
              </h3>
              <p className="text-xs text-[#787774]">
                Add an employee to assign them to project deliverables.
              </p>
            </div>

            <form onSubmit={handleAdd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#37352f] mb-1">
                  Full Name
                </label>
                <input
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#37352f] mb-1">
                  Role / Designation
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#e9e9e7] bg-[#fafafa] text-xs outline-none focus:bg-white focus:border-blue-600 transition"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                  {roles.length === 0 && (
                    <option value="Team Member">Team Member</option>
                  )}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e9e9e7]">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="h-9 px-4 rounded-lg border border-[#e9e9e7] bg-white text-xs font-semibold text-[#37352f] hover:bg-[#f4f4f5] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-[#18181b] text-white text-xs font-semibold hover:bg-black transition shadow-xs"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
