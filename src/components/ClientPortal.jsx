import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  supabase,
  uploadDeliverableFile,
  uploadRequestAttachment,
} from "../lib/supabase";
import {
  MessageSquare,
  FileText,
  Link2,
  ArrowUpRight,
  UploadCloud,
  Loader2,
  FileSignature,
  FileCheck2,
  Check,
  Send,
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  Compass,
  Paperclip,
  Users,
  Flame,
  Layers,
  Sparkles,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  Plus,
  FolderPlus,
  History,
} from "lucide-react";
import { format, parseISO } from "date-fns";

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

export default function ClientPortal({
  project,
  employees: propEmployees = [],
  daysRemaining,
  onRefresh,
}) {
  const [activeProjectTab, setActiveProjectTab] = useState("tracker");

  const [assetType, setAssetType] = useState("link"); // 'link' | 'file'
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [fileObject, setFileObject] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Add/Edit Deliverable Modal State ---
  const [isAddDeliverableModalOpen, setIsAddDeliverableModalOpen] =
    useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  const [targetFolderId, setTargetFolderId] = useState("root");

  // --- Supabase Database Folders State ---
  const [projectFolders, setProjectFolders] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({ root: true });


  // --- REALTIME REFRESH STATE ---
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Keep track of current items to detect DELETES properly
  const stateRef = useRef({ project, projectFolders });
  useEffect(() => {
    stateRef.current = { project, projectFolders };
  }, [project, projectFolders]);

  useEffect(() => {
    if (!project?.id) return;

    const channel = supabase
      .channel(`client-portal-room-${project.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          const currentState = stateRef.current;
          const trackedTables = ["tasks", "milestones", "deliverables", "projects", "project_folders"];
          
          if (trackedTables.includes(payload.table)) {
            let isCurrentProject = false;

            // A. Check if project_id is explicitly in the payload
            if (String(payload.new?.project_id) === String(project.id) || String(payload.old?.project_id) === String(project.id)) {
              isCurrentProject = true;
            } 
            // B. Fix for DELETE: Check if the deleted ID was in our current lists
            else if (payload.eventType === "DELETE" && payload.old?.id) {
              const delId = String(payload.old.id);
              
              const inTasks = currentState.project?.tasks?.some(t => String(t.id) === delId);
              const inMilestones = currentState.project?.milestones?.some(m => String(m.id) === delId);
              const inDeliverables = currentState.project?.deliverables?.some(d => String(d.id) === delId);
              const inFolders = currentState.projectFolders?.some(f => String(f.id) === delId);
              
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
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project?.id]);

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

  // --- Raise a Request Form States ---
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [requestAttachment, setRequestAttachment] = useState(null);
  const [requestAttachmentType, setRequestAttachmentType] = useState(null);
  const [isPriority, setIsPriority] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // --- Team Members & @ Mention State ---
  const [teamList, setTeamList] = useState(propEmployees);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [taggedMembers, setTaggedMembers] = useState([]);
  const textareaRef = useRef(null);

  // --- Custom Folder Modal State ---
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [folderParentTarget, setFolderParentTarget] = useState("root");
  const [newFolderName, setNewFolderName] = useState("");
  const [isSavingFolder, setIsSavingFolder] = useState(false);

  // --- Deliverable Version History State ---
  const [historyModalItem, setHistoryModalItem] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

  const allTasks = project?.tasks || [];
  const allMilestones = project?.milestones || [];
  const customTabs = project?.custom_tabs || [];

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

    // Update Project Links globally
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

    // Update Deliverables globally
    currentTabDeliverables.forEach((item) => {
      const itemMax = item.version || 1;
      if (v <= itemMax) {
        handleSelectDeliverableVersion(item, v);
      } else {
        handleSelectDeliverableVersion(item, itemMax);
      }
    });
  };

  const completionPct = useMemo(() => {
    if (milestones.length === 0) {
      const doneTasks = tasks.filter((t) => t.status === "done").length;
      const totalTasks = tasks.length || 1;
      return Math.round((doneTasks / totalTasks) * 100);
    }
    
    // Sum the true progress (0-100) of each milestone and divide by total milestones
    const totalProgress = milestones.reduce((acc, m) => {
      // If manually marked complete, force 100. Otherwise, use the sheet_progress number.
      const progress = m.status === "complete" ? 100 : (Number(m.sheet_progress) || 0);
      return acc + progress;
    }, 0);

    return Math.round(totalProgress / milestones.length);
  }, [milestones, tasks]);

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = tasks.filter((t) => t.status === "progress").length;

  useEffect(() => {
    if (propEmployees.length > 0) {
      setTeamList(propEmployees);
    } else {
      const fetchTeam = async () => {
        const { data } = await supabase.from("employees").select("*");
        if (data && data.length > 0) setTeamList(data);
      };
      fetchTeam();
    }
  }, [propEmployees]);

  const handleOpenAddDeliverableModal = (folderId = "root", item = null) => {
    setTargetFolderId(folderId || "root");
    if (item) {
      setEditingDeliverable(item);
      setTitle(item.title);
      setUrl(item.url);
      setAssetType(item.type || "link");
    } else {
      setEditingDeliverable(null);
      setTitle("");
      setUrl("");
      setAssetType("link");
      setFileObject(null);
    }
    setIsAddDeliverableModalOpen(true);
  };

  const handleOpenCreateFolderModal = (parentId = "root") => {
    setFolderParentTarget(parentId || "root");
    setNewFolderName("");
    setIsCreateFolderModalOpen(true);
  };

  const handleSaveCustomFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim() || !project?.id) return;

    setIsSavingFolder(true);
    const { data, error } = await supabase
      .from("project_folders")
      .insert({
        project_id: project.id,
        parent_id: folderParentTarget || "root",
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
        [folderParentTarget || "root"]: true,
        [data.id]: true,
      }));
    }

    setNewFolderName("");
    setIsCreateFolderModalOpen(false);
    await fetchProjectFolders();
  };

  const handleTextareaChange = (e) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    setRequestText(value);

    const textBeforeCursor = value.slice(0, cursor);
    const lastAtMatch = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);

    if (lastAtMatch) {
      setShowMentionMenu(true);
      setMentionFilter(lastAtMatch[1].toLowerCase());
      setMentionIndex(cursor - lastAtMatch[1].length - 1);
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleSelectMember = (emp) => {
    const beforeAt = requestText.slice(0, mentionIndex);
    const afterCursor = requestText.slice(textareaRef.current.selectionStart);
    const updatedText = `${beforeAt}@${emp.name} ${afterCursor}`;

    setRequestText(updatedText);
    if (!taggedMembers.some((m) => m.id === emp.id)) {
      setTaggedMembers((prev) => [...prev, emp]);
    }
    setShowMentionMenu(false);
    textareaRef.current?.focus();
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!requestText.trim() && !requestAttachment) return;

    setIsSubmittingRequest(true);
    let uploadedMediaUrl = null;

    try {
      if (requestAttachment) {
        uploadedMediaUrl = await uploadRequestAttachment(
          requestAttachment,
          project.id,
        );
      }

      const taggedIds = teamList
        .filter((emp) => requestText.includes(`@${emp.name}`))
        .map((emp) => emp.id);

      const { error } = await supabase.from("client_requests").insert({
        project_id: project.id,
        sender_type: "client",
        message: requestText.trim(),
        tagged_employee_ids: taggedIds,
        attachment_url: uploadedMediaUrl,
        attachment_type: requestAttachmentType,
        is_priority: isPriority,
        is_read: false,
      });

      if (error) throw error;

      setRequestText("");
      setRequestAttachment(null);
      setRequestAttachmentType(null);
      setIsPriority(false);
      setTaggedMembers([]);
      setIsRequestModalOpen(false);
      alert("Request submitted successfully!");
    } catch (err) {
      alert("Failed to submit request: " + err.message);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleAttachFile = (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      setRequestAttachment(file);
      setRequestAttachmentType(type);
    }
  };

  const saveDeliverable = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalUrl = url.trim();

    if (assetType === "file") {
      if (fileObject) {
        setIsUploading(true);
        try {
          finalUrl = await uploadDeliverableFile(fileObject, project.id);
        } catch (err) {
          alert("Upload error: " + err.message);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      } else if (!editingDeliverable) {
        return;
      }
    } else {
      if (!finalUrl) return;
      if (!finalUrl.startsWith("http")) finalUrl = `https://${finalUrl}`;
    }

    const folderId = targetFolderId === "root" ? null : targetFolderId;

    if (editingDeliverable) {
      const { error } = await supabase
        .from("deliverables")
        .update({
          title: title.trim(),
          type: assetType,
          url: finalUrl,
          folder_id: folderId,
        })
        .eq("id", editingDeliverable.id);

      if (error) {
        alert("Error updating asset: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("deliverables").insert({
        project_id: project.id,
        tab_id: activeProjectTab,
        title: title.trim(),
        type: assetType,
        url: finalUrl,
        uploaded_by: "client",
        folder_id: folderId,
      });

      if (error) {
        alert("Error adding asset: " + error.message);
        return;
      }
    }

    setTitle("");
    setUrl("");
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

  const filteredTeam = teamList.filter((emp) =>
    emp.name?.toLowerCase().includes(mentionFilter),
  );

  const hasProjectLinks =
    Boolean(project?.feedback_url) ||
    Boolean(project?.agreements_url) ||
    Boolean(project?.scope_of_work_url);

  return (
    <div className="space-y-6" onClick={() => setLinkVersionMenu(null)}>
      <div className="flex items-center gap-2">
        <img src="/logo.svg" className="w-6" />
        <span className="font-semibold text-sm tracking-tight hidden sm:inline">
          Pixels Creative Technologies
        </span>
      </div>
      {/* Header & Overview with Raise a Request CTA */}
      <div className="bg-white border border-[#e9e9e7] rounded-2xl p-5 sm:p-8 shadow-sm">
        <div className="flex flex-row sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block px-3 py-1 rounded-md bg-[#ddedea] text-[#0f7b6c] text-[11px] font-semibold">
              Client Portal
            </span>
          </div>

          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold  transition active:scale-95 self-start sm:self-auto"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Raise a Request</span>
          </button>
        </div>

        <div className="flex items-center gap-3 mt-3">
          {project?.icon && (
            <img
              src={project.icon}
              alt=""
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-contain shrink-0 bg-white p-1"
            />
          )}

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#37352f]">
            {project?.title}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#787774] mt-2 max-w-2xl leading-relaxed">
          {project?.description}
        </p>

        <div className="mt-4 flex flex-col md:flex-row md:items-center gap-2 justify-between text-xs font-medium text-[#787774] pt-3 border-t border-[#e9e9e7]">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div>
              Target Launch:{" "}
              <b className="text-[#37352f]">{project?.launch_date || "N/A"}</b>
            </div>
            <div className="hidden sm:inline">•</div>
            <div>
              Countdown:{" "}
              <b className="text-blue-600 font-bold">
                {daysRemaining} days remaining
              </b>
            </div>
          </div>
          {maxGlobalVersion > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Versions:
              </span>
              <VersionPills
                count={maxGlobalVersion}
                active={activeGlobalVersion || maxGlobalVersion}
                onSelect={handleGlobalVersionSelect}
              />
            </div>
          )}
        </div>
      </div>

      {/* CLIENT PORTAL DYNAMIC TABS SWITCHER */}
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
            <button
              key={tab.id}
              onClick={() => setActiveProjectTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all relative shrink-0 ${
                activeProjectTab === tab.id
                  ? "text-[#37352f] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600"
                  : "text-[#787774] hover:text-[#37352f]"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-[#cb912f]" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Project Health & Overall Completion Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white border border-[#e9e9e7] rounded-2xl p-6 shadow-sm items-center">
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
            {project?.status_note || "Delivery on track"}
          </span>
          <h2 className="text-sm font-semibold text-[#37352f]">
            Delivery Progress &amp; Health Overview (
            {activeProjectTab === "tracker"
              ? "Overview & Tracker"
              : customTabs.find((t) => t.id === activeProjectTab)?.name}
            )
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-lg p-3">
              <div className="text-lg font-bold text-[#37352f]">
                {doneTasks}
              </div>
              <div className="text-[11px] text-[#787774]">Delivered</div>
            </div>
            <div className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-lg p-3">
              <div className="text-lg font-bold text-[#37352f]">
                {inProgressTasks}
              </div>
              <div className="text-[11px] text-[#787774]">In Progress</div>
            </div>
            <div className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-lg p-3">
              <div className="text-lg font-bold text-[#37352f]">
                {tasks.length}
              </div>
              <div className="text-[11px] text-[#787774]">
                Total Deliverables
              </div>
            </div>
            <div className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-lg p-3">
              <div className="text-lg font-bold text-blue-600">
                {daysRemaining} days
              </div>
              <div className="text-[11px] text-[#787774]">Until Launch</div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Project Documents & Feedback Section */}
      {hasProjectLinks && (
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

      {/* Milestones Roadmap */}
      {/* Milestones Roadmap */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#787774]">
          Project Milestones ({milestones.length} Stages)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 bg-white border border-[#e9e9e7] rounded-xl p-3 shadow-sm">
          {milestones.length === 0 ? (
            <div className="col-span-full py-6 text-center text-xs text-[#9b9a97]">
              No milestone stages set yet.
            </div>
          ) : (
            milestones.map((m) => {
              const isCompleted = m.status === "complete";
              const progress = m.sheet_progress || 0; // Pulls from Google Sheets

              return (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-0 transition relative ${
                    isCompleted
                      ? "bg-[#ddedea]/40 border-[#0f7b6c]/40 text-[#0f7b6c]"
                      : "bg-[#f9fafb] border-[#e9e9e7]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold text-[#9b9a97]">
                      {m.due_date || "No Date"}
                    </span>
                    {/* <span
                      className={`h-4 w-4 rounded border flex items-center justify-center transition shrink-0 ${
                        isCompleted
                          ? "bg-[#0f7b6c] border-[#0f7b6c] text-white"
                          : "border-[#d1d5db] bg-white"
                      }`}
                    >
                      {isCompleted && <Check className="h-3 w-3 stroke-[3]" />}
                    </span> */}
                  </div>

                  <div className="flex flex-col gap-3 mt-1">
                    <p
                      className={`text-xs font-bold leading-tight ${
                        isCompleted ? "line-through opacity-75" : "text-[#37352f]"
                      }`}
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

      {/* --- FILE TREE DIRECTORY EXPLORER FOR DELIVERABLES --- */}
      <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f3f4f6] pb-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#374151]">
              Deliverables File &amp; Links Explorer (
              {currentTabDeliverables.length} items)
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
                      {item.uploaded_by || "client"}
                    </span>
                    {item.created_at
                      ? ` • ${format(parseISO(item.created_at), "MMM dd, yyyy")}`
                      : ""}
                  </span>
                  {item.uploaded_by === "client" && (
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
                      onClick={() => handleOpenAddDeliverableModal(folder.id)}
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
                  </div>
                </div>

                {isExpanded && (
                  <div
                    className="space-y-1 border-l border-dashed border-gray-300 ml-4"
                    style={{ marginLeft: depth * 18 + 16 }}
                  >
                    {children.map((child) => renderFolder(child, depth + 1))}
                    {assets.map((item) => renderDeliverable(item, depth + 1))}
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
                      No folders or assets yet. Create a folder or add an asset.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* --- CUSTOM CREATE FOLDER MODAL --- */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white border border-[#e9e9e7] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#e9e9e7]">
              <h3 className="text-sm font-bold text-[#37352f]">
                {folderParentTarget === "root"
                  ? "Create New Folder"
                  : "Create New Subfolder"}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateFolderModalOpen(false)}
                className="p-1 text-[#787774] hover:text-black rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveCustomFolder}
              className="space-y-4 pt-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-[#37352f] mb-1">
                  Folder Name *
                </label>
                <input
                  required
                  autoFocus
                  placeholder="e.g. wireframes, brand-assets"
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

      {/* --- ADD / EDIT DELIVERABLE MODAL --- */}
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
                  onClick={() => setAssetType("link")}
                  className={`px-3 py-1 rounded-md transition ${assetType === "link" ? "bg-white text-[#37352f] shadow-xs" : "hover:text-[#37352f]"}`}
                >
                  URL Link
                </button>
                <button
                  type="button"
                  onClick={() => setAssetType("file")}
                  className={`px-3 py-1 rounded-md transition ${assetType === "file" ? "bg-white text-[#37352f] shadow-xs" : "hover:text-[#37352f]"}`}
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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

              {assetType === "link" ? (
                <div>
                  <label className="block font-semibold text-[#37352f] mb-1">
                    Destination URL *
                  </label>
                  <input
                    required
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
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
                  disabled={isUploading}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-700 shadow-xs transition disabled:opacity-50"
                >
                  {isUploading ? (
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

      {/* RAISE A REQUEST MODAL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-[#e9e9e7] rounded-3xl shadow-2xl p-6 sm:p-7 max-h-[92dvh] flex flex-col my-auto relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#e9e9e7]">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Raise a Project Request
                </h3>
                <p className="text-xs text-[#787774]">
                  Describe your request or revisions. Type{" "}
                  <b className="text-blue-600">@</b> to tag team members.
                </p>
              </div>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1.5 text-[#787774] hover:text-black rounded-xl transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitRequest}
              className="space-y-4 pt-4 text-xs flex-1 flex flex-col"
            >
              {taggedMembers.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-blue-50/60 border border-blue-100 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-800 uppercase mr-1">
                    Tagged:
                  </span>
                  {taggedMembers.map((emp) => (
                    <span
                      key={emp.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold shadow-2xs"
                    >
                      @{emp.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  required
                  rows={4}
                  value={requestText}
                  onChange={handleTextareaChange}
                  placeholder="Type your request here... (Type @ to tag a team member)"
                  className="w-full h-32 p-3.5 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] text-xs text-[#111827] outline-none focus:bg-white focus:border-blue-600 transition resize-none leading-relaxed"
                />

                {showMentionMenu && (
                  <div className="absolute left-3 bottom-full mb-1 w-64 bg-white rounded-2xl border border-[#e5e7eb] shadow-2xl p-1.5 max-h-48 overflow-y-auto z-50">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>Tag Team Member</span>
                    </div>
                    {filteredTeam.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-[#9ca3af] italic">
                        No team members found
                      </div>
                    ) : (
                      filteredTeam.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleSelectMember(emp)}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-blue-50 flex items-center justify-between text-xs transition"
                        >
                          <span className="font-bold text-[#111827]">
                            @{emp.name}
                          </span>
                          <span className="text-[10px] text-[#6b7280]">
                            {emp.role || "Member"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#fafafa] border border-[#e9e9e7]">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-7 w-7 rounded-xl flex items-center justify-center ${isPriority ? "bg-rose-100 text-rose-600" : "bg-gray-100 text-gray-400"}`}
                  >
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-[#111827] block">
                      Mark as Priority Request
                    </span>
                    <span className="text-[10px] text-[#787774]">
                      Highlights request in admin notification drawer
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPriority(!isPriority)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    isPriority ? "bg-rose-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isPriority ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {requestAttachment && (
                <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-800">
                  <div className="flex items-center gap-2 truncate">
                    <Paperclip className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span className="font-medium truncate">
                      {requestAttachment.name} ({requestAttachmentType})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestAttachment(null);
                      setRequestAttachmentType(null);
                    }}
                    className="p-1 hover:text-black"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[#e9e9e7]">
                <div className="flex items-center gap-1">
                  <label
                    title="Attach Image"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e5e7eb] hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 text-[#6b7280] font-semibold text-xs cursor-pointer transition shadow-2xs"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                    <span>Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAttachFile(e, "image")}
                    />
                  </label>

                  <label
                    title="Attach Video"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e5e7eb] hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 text-[#6b7280] font-semibold text-xs cursor-pointer transition shadow-2xs"
                  >
                    <VideoIcon className="h-3.5 w-3.5 text-purple-600" />
                    <span>Video</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => handleAttachFile(e, "video")}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRequestModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6b7280] hover:bg-[#f3f4f6]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isSubmittingRequest ||
                      (!requestText.trim() && !requestAttachment)
                    }
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition disabled:opacity-50"
                  >
                    {isSubmittingRequest ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>Submit Request</span>
                  </button>
                </div>
              </div>
            </form>
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
