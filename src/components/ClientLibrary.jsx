import React, {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Film,
  Folder,
  FolderOpen,
  Grid2X2,
  Image as ImageIcon,
  Link2,
  List,
  Loader2,
  Edit2,
  Trash2,
  Plus,
  FolderPlus,
  UploadCloud,
  Search,
  X,
} from "lucide-react";
import { supabase, uploadDeliverableFile } from "../lib/supabase";
import { fileKind } from "../lib/workspace";
import {
  planFromDrop,
  planFromFolderInput,
  runPool,
} from "../lib/folderUpload";

const UPLOAD_CONCURRENCY = 4;

const FILTERS = [
  ["all", "All files"],
  ["folders", "Folders"],
  ["image", "Images"],
  ["video", "Video"],
  ["docs", "Docs"],
];

const sameId = (left, right) =>
  String(left ?? "root") === String(right ?? "root");

const isFileDrag = (event) =>
  Array.from(event.dataTransfer?.types || []).includes("Files");

const isFileInput = (target) => Boolean(target.closest?.('input[type="file"]'));

function importantLinks(project) {
  return [
    {
      id: `important-feedback-${project.id}`,
      key: "feedback_url",
      isProjectLink: true,
      title: "Feedback Document",
      url: project.feedback_url,
      type: "link",
      version: project.feedback_url_version || 1,
      folder_id: null,
      uploaded_by: "admin",
    },
    {
      id: `important-agreement-${project.id}`,
      key: "agreements_url",
      isProjectLink: true,
      title: "Master Agreement",
      url: project.agreements_url,
      type: "link",
      version: project.agreements_url_version || 1,
      folder_id: null,
      uploaded_by: "admin",
    },
    {
      id: `important-scope-${project.id}`,
      key: "scope_of_work_url",
      isProjectLink: true,
      title: "Scope of Work",
      url: project.scope_of_work_url || project.scope_url,
      type: "link",
      version: project.scope_of_work_url_version || 1,
      folder_id: null,
      uploaded_by: "admin",
    },
  ].filter((item) => item.url);
}

function isDocumentItem(item, folders) {
  if (fileKind(item) === "file" || item.isProjectLink) return true;

  const url = String(item.url || "").toLowerCase();
  if (
    /\.(pdf|docx?|xlsx?|pptx?|txt|rtf|odt|ods|odp)(?:[?#]|$)/.test(url) ||
    /docs\.google\.com|drive\.google\.com\/file/.test(url)
  ) {
    return true;
  }

  let folder = folders.find((entry) => sameId(entry.id, item.folder_id));
  while (folder) {
    if (/^docs?$|^documents?$/i.test(folder.name)) return true;
    folder = folders.find((entry) => sameId(entry.id, folder.parent_id));
  }
  return false;
}

function LibraryItemIcon({ item, className = "h-4 w-4" }) {
  const kind = fileKind(item);
  if (kind === "image") return <ImageIcon className={className} />;
  if (kind === "video") return <Film className={className} />;
  if (kind === "link") return <Link2 className={className} />;
  return <FileText className={className} />;
}

export default function ClientLibrary({
  project,
  onRefresh,
  uploaderRole = "admin",
  mode = "deliverables",
}) {
  const documentsMode = mode === "documents";
  const filters = documentsMode ? [["all", "All documents"]] : FILTERS;
  const [folders, setFolders] = useState([]);
  const [assets, setAssets] = useState(project.deliverables || []);
  const [isLoading, setIsLoading] = useState(true);
  const [folderError, setFolderError] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({ root: true });
  const [view, setView] = useState("grid");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [previewItem, setPreviewItem] = useState(null);
  const [versionPopoverKey, setVersionPopoverKey] = useState(null);
  const [versionRecords, setVersionRecords] = useState([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderParentId, setFolderParentId] = useState(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetTitle, setAssetTitle] = useState("");
  const [assetUrl, setAssetUrl] = useState("");
  const [assetType, setAssetType] = useState("link");
  const [assetFile, setAssetFile] = useState(null);
  const [assetFolderId, setAssetFolderId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dropFolderKey, setDropFolderKey] = useState(null);
  const [bulkUpload, setBulkUpload] = useState(null);
  const isBulkUploadRunning = useRef(false);
  const isBulkUploading = Boolean(bulkUpload?.isRunning);

  useEffect(() => {
    if (!isBulkUploading) return undefined;
    const warnBeforeLeaving = (event) => event.preventDefault();
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isBulkUploading]);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setFolderError("");
    setCurrentFolderId(null);

    supabase
      .from("project_folders")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!isCurrent) return;
        if (error) {
          setFolderError(error.message);
          setFolders([]);
        } else {
          setFolders(data || []);
        }
        setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [project.id]);

  useEffect(() => {
    setAssets(project.deliverables || []);
  }, [project.id, project.deliverables]);

  const items = useMemo(() => {
    const modeAssets = assets.filter((item) =>
      documentsMode ? item.tab_id === "documents" : item.tab_id !== "documents",
    );
    return documentsMode
      ? [...modeAssets, ...importantLinks(project)]
      : modeAssets;
  }, [assets, documentsMode, project]);

  const currentFolder = folders.find((folder) =>
    sameId(folder.id, currentFolderId),
  );

  const breadcrumbs = useMemo(() => {
    const path = [];
    let folder = currentFolder;
    while (folder) {
      path.unshift(folder);
      folder = folders.find((item) => sameId(item.id, folder.parent_id));
    }
    return path;
  }, [currentFolder, folders]);

  const childFolders = documentsMode
    ? []
    : folders.filter((folder) =>
        currentFolderId
          ? sameId(folder.parent_id, currentFolderId)
          : !folder.parent_id || folder.parent_id === "root",
      );

  const folderItems = items.filter((item) =>
    currentFolderId
      ? sameId(item.folder_id, currentFolderId)
      : !item.folder_id || item.folder_id === "root",
  );

  const normalizedQuery = query.trim().toLowerCase();
  const visibleFolders =
    !documentsMode && (filter === "all" || filter === "folders")
      ? childFolders.filter((folder) =>
          folder.name.toLowerCase().includes(normalizedQuery),
        )
      : [];
  const visibleItemsSource =
    currentFolderId || (filter === "all" && !normalizedQuery)
      ? folderItems
      : items;
  const visibleItems = visibleItemsSource.filter((item) => {
    const kind = fileKind(item);
    const matchesFilter =
      filter === "all" ||
      (filter === "folders"
        ? false
        : filter === "docs"
          ? isDocumentItem(item, folders)
          : kind === filter);
    return (
      matchesFilter &&
      String(item.title || "")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  });

  const itemMatches = (item) => {
    const kind = fileKind(item);
    const matchesFilter =
      filter === "all" ||
      (filter === "folders"
        ? false
        : filter === "docs"
          ? isDocumentItem(item, folders)
          : kind === filter);
    return (
      matchesFilter &&
      String(item.title || "")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  };

  const folderHasMatches = (folder) =>
    ((filter === "all" || filter === "folders") &&
      folder.name.toLowerCase().includes(normalizedQuery)) ||
    items.some(
      (item) => sameId(item.folder_id, folder.id) && itemMatches(item),
    ) ||
    folders.some(
      (child) => sameId(child.parent_id, folder.id) && folderHasMatches(child),
    );

  const toggleFolder = (folderId) => {
    setExpandedFolders((current) => ({
      ...current,
      [folderId]: !current[folderId],
    }));
  };

  const openAssetModal = (item = null, folderId = currentFolderId) => {
    setEditingAsset(item);
    setAssetTitle(item?.title || "");
    setAssetUrl(item?.url || "");
    setAssetType(documentsMode ? "file" : item?.type || "link");
    setAssetFile(null);
    setAssetFolderId(
      documentsMode ? null : item?.folder_id || folderId || null,
    );
    setIsAssetModalOpen(true);
  };

  const itemVersionKey = (item) =>
    item.isProjectLink ? `project-link-${item.key}` : `deliverable-${item.id}`;

  const toggleVersionHistory = async (item) => {
    const key = itemVersionKey(item);
    if (versionPopoverKey === key) {
      setVersionPopoverKey(null);
      return;
    }

    setVersionPopoverKey(key);
    setVersionRecords([]);
    setIsLoadingVersions(true);
    const result = item.isProjectLink
      ? await supabase
          .from("project_link_versions")
          .select("*")
          .eq("project_id", project.id)
          .eq("link_key", item.key)
          .order("version", { ascending: false })
      : await supabase
          .from("deliverable_versions")
          .select("*")
          .eq("deliverable_id", item.id)
          .order("version", { ascending: false });

    setIsLoadingVersions(false);
    if (result.error) {
      alert(`Could not load version history: ${result.error.message}`);
      return;
    }
    setVersionRecords(result.data || []);
  };

  const renderVersionBadge = (item) => {
    const key = itemVersionKey(item);
    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleVersionHistory(item);
          }}
          aria-label={`Show versions for ${item.title}`}
          title="View versions"
          className="rounded bg-[#f0f0ed] px-1.5 py-0.5 text-[9px] font-semibold text-[#777772] hover:bg-[#e5e5e2]"
        >
          v{item.version || 1}
        </button>
        {versionPopoverKey === key && (
          <span className="absolute bottom-full right-0 z-40 mb-1.5 block w-52 rounded-md border border-[#e5e5e2] bg-white p-1.5 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setPreviewItem(item);
                setVersionPopoverKey(null);
              }}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[10px] hover:bg-[#f4f4f1]"
            >
              <span className="truncate">Current · {item.title}</span>
              <span className="ml-2 shrink-0 font-semibold">
                v{item.version || 1}
              </span>
            </button>
            {isLoadingVersions ? (
              <span className="flex justify-center py-2 text-[#8a8a86]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </span>
            ) : versionRecords.length === 0 ? (
              <span className="block px-2 py-2 text-[10px] text-[#8a8a86]">
                No earlier versions.
              </span>
            ) : (
              versionRecords.map((record) => (
                <button
                  key={record.id || record.version}
                  type="button"
                  onClick={() => {
                    setPreviewItem({
                      ...item,
                      ...record,
                      id: item.id,
                      key: item.key,
                      isProjectLink: item.isProjectLink,
                      title: record.title || item.title,
                      url: record.url || item.url,
                      version: record.version,
                    });
                    setVersionPopoverKey(null);
                  }}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-[10px] hover:bg-[#f4f4f1]"
                >
                  <span className="truncate">
                    {record.title || "Archived version"}
                  </span>
                  <span className="ml-2 shrink-0 font-semibold">
                    v{record.version}
                  </span>
                </button>
              ))
            )}
          </span>
        )}
      </span>
    );
  };

  const saveAsset = async (event) => {
    event.preventDefault();
    if (!assetTitle.trim()) return;
    setIsSaving(true);
    let finalUrl = assetUrl.trim();

    if (assetType === "file" && assetFile) {
      try {
        finalUrl = await uploadDeliverableFile(assetFile, project.id);
      } catch (error) {
        alert(`File upload failed: ${error.message}`);
        setIsSaving(false);
        return;
      }
    }
    if (assetType === "link" && finalUrl && !/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }
    if (!finalUrl) {
      setIsSaving(false);
      return;
    }

    const folderId = assetFolderId || null;
    const folder = folders.find((entry) => sameId(entry.id, folderId));
    const payload = {
      title: assetTitle.trim(),
      type: assetType,
      url: finalUrl,
      folder_id: documentsMode ? null : folderId,
      tab_id: documentsMode
        ? "documents"
        : folder?.tab_id || editingAsset?.tab_id || "tracker",
    };
    const result = editingAsset
      ? await supabase
          .from("deliverables")
          .update(payload)
          .eq("id", editingAsset.id)
          .select()
          .single()
      : await supabase
          .from("deliverables")
          .insert({
            ...payload,
            project_id: project.id,
            uploaded_by: uploaderRole,
          })
          .select()
          .single();

    setIsSaving(false);
    if (result.error) {
      alert(`Could not save library item: ${result.error.message}`);
      return;
    }

    setAssets((current) =>
      editingAsset
        ? current.map((item) =>
            item.id === editingAsset.id ? result.data : item,
          )
        : [...current, result.data],
    );
    setIsAssetModalOpen(false);
    setEditingAsset(null);
    setAssetFile(null);
    onRefresh?.();
  };

  const deleteAsset = async (item) => {
    if (!window.confirm(`Delete "${item.title}" from this library?`)) return;
    const { error } = await supabase
      .from("deliverables")
      .delete()
      .eq("id", item.id);
    if (error) {
      alert(`Could not delete library item: ${error.message}`);
      return;
    }
    setAssets((current) => current.filter((asset) => asset.id !== item.id));
    onRefresh?.();
  };

  const insertFolder = async (name, parent) => {
    const result = await supabase
      .from("project_folders")
      .insert({
        project_id: project.id,
        parent_id: parent?.id || "root",
        name,
        tab_id: parent?.tab_id || "tracker",
      })
      .select()
      .single();
    if (!result.error) {
      const created = result.data;
      setFolders((current) => [...current, created]);
      setExpandedFolders((current) => ({
        ...current,
        [parent?.id || "root"]: true,
        [created.id]: true,
      }));
    }
    return result;
  };

  const createFolder = async (event) => {
    event.preventDefault();
    if (!folderName.trim()) return;
    const parent = folders.find((folder) => sameId(folder.id, folderParentId));
    const { error } = await insertFolder(folderName.trim(), parent);
    if (error) {
      alert(`Could not create folder: ${error.message}`);
      return;
    }
    setFolderName("");
    setIsFolderModalOpen(false);
    onRefresh?.();
  };

  const runBulkUpload = async (plan, targetFolderId) => {
    if (isBulkUploadRunning.current) {
      alert("Please wait for the current upload to finish.");
      return;
    }
    if (
      plan.files.length === 0 &&
      plan.folderPaths.length === 0 &&
      plan.unreadable.length === 0
    ) {
      alert("There are no files to upload in that folder.");
      return;
    }

    isBulkUploadRunning.current = true;
    setBulkUpload({
      plan,
      targetFolderId,
      total: plan.files.length,
      done: 0,
      uploaded: 0,
      skipped: plan.skipped,
      failed: plan.unreadable,
      isRunning: true,
    });

    const addFailure = (failure) =>
      setBulkUpload((current) => ({
        ...current,
        failed: [...current.failed, failure],
      }));

    // Keyed by path inside the upload. A missing key means that folder could
    // not be created; re-uploading into an existing folder merges with it.
    const target = folders.find((folder) => sameId(folder.id, targetFolderId));
    const folderRows = new Map([["", target || null]]);
    for (const path of plan.folderPaths) {
      const key = path.join("/");
      const parent = folderRows.get(path.slice(0, -1).join("/"));
      if (parent === undefined) continue;

      const name = path[path.length - 1];
      const existing = folders.find(
        (folder) => sameId(folder.parent_id, parent?.id) && folder.name === name,
      );
      if (existing) {
        folderRows.set(key, existing);
        continue;
      }
      const { data, error } = await insertFolder(name, parent);
      if (error) {
        addFailure({ label: `${key}/`, message: error.message });
      } else {
        folderRows.set(key, data);
      }
    }

    await runPool(plan.files, UPLOAD_CONCURRENCY, async (planFile) => {
      const { file, folderPath } = planFile;
      const key = folderPath.join("/");
      try {
        const parent = folderRows.get(key);
        if (parent === undefined) {
          throw new Error("Its folder could not be created.");
        }
        const url = await uploadDeliverableFile(file, project.id);
        const { data, error } = await supabase
          .from("deliverables")
          .insert({
            title: file.name,
            type: "file",
            url,
            folder_id: parent?.id || null,
            tab_id: parent?.tab_id || "tracker",
            project_id: project.id,
            uploaded_by: uploaderRole,
          })
          .select()
          .single();
        if (error) throw error;

        setAssets((current) => [...current, data]);
        setBulkUpload((current) => ({
          ...current,
          done: current.done + 1,
          uploaded: current.uploaded + 1,
        }));
      } catch (error) {
        addFailure({
          label: key ? `${key}/${file.name}` : file.name,
          message: error.message,
          planFile,
        });
        setBulkUpload((current) => ({ ...current, done: current.done + 1 }));
      }
    });

    isBulkUploadRunning.current = false;
    setBulkUpload((current) => ({ ...current, isRunning: false }));
    onRefresh?.();
  };

  const retryFailedUploads = () => {
    const { plan, targetFolderId, failed } = bulkUpload;
    runBulkUpload(
      {
        ...plan,
        files: failed.filter((item) => item.planFile).map((item) => item.planFile),
        unreadable: [],
        skipped: 0,
      },
      targetFolderId,
    );
  };

  const handleFolderPicked = (event) => {
    const plan = planFromFolderInput(Array.from(event.target.files || []));
    event.target.value = "";
    setIsAssetModalOpen(false);
    runBulkUpload(plan, assetFolderId);
  };

  const canDropFiles =
    !documentsMode && (!isAssetModalOpen || assetType === "folder");

  const dropKeyFor = (event) =>
    event.target.closest?.("[data-drop-folder]")?.dataset.dropFolder ??
    String(currentFolderId ?? "root");

  // Listens on the window so a drop anywhere on the page counts, instead of
  // navigating the tab to the file. File inputs keep their native behaviour.
  const handleWindowDragOver = useEffectEvent((event) => {
    if (!isFileDrag(event) || isFileInput(event.target)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = canDropFiles ? "copy" : "none";
    if (canDropFiles) setDropFolderKey(dropKeyFor(event));
  });

  const handleWindowDragLeave = useEffectEvent((event) => {
    if (!event.relatedTarget) setDropFolderKey(null);
  });

  const handleWindowDrop = useEffectEvent(async (event) => {
    setDropFolderKey(null);
    if (!isFileDrag(event) || isFileInput(event.target)) return;
    event.preventDefault();
    if (!canDropFiles) return;
    const dropKey = dropKeyFor(event);
    setIsAssetModalOpen(false);
    const plan = await planFromDrop(event.dataTransfer);
    runBulkUpload(plan, dropKey === "root" ? null : dropKey);
  });

  useEffect(() => {
    if (documentsMode) return undefined;
    const onDragOver = (event) => handleWindowDragOver(event);
    const onDragLeave = (event) => handleWindowDragLeave(event);
    const onDrop = (event) => handleWindowDrop(event);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [documentsMode]);

  const dropFolderName =
    dropFolderKey === "root"
      ? project.title
      : folders.find((folder) => sameId(folder.id, dropFolderKey))?.name;

  const openFolderModal = (parentId = currentFolderId) => {
    setFolderParentId(parentId);
    setFolderName("");
    setIsFolderModalOpen(true);
  };

  const renameFolder = async (folder) => {
    const nextName = window.prompt("Rename folder", folder.name);
    if (!nextName?.trim() || nextName.trim() === folder.name) return;
    const { data, error } = await supabase
      .from("project_folders")
      .update({ name: nextName.trim() })
      .eq("id", folder.id)
      .select()
      .single();
    if (error) {
      alert(`Could not rename folder: ${error.message}`);
      return;
    }
    setFolders((current) =>
      current.map((entry) => (entry.id === folder.id ? data : entry)),
    );
    onRefresh?.();
  };

  const deleteFolder = async (folder) => {
    if (isBulkUploadRunning.current) {
      alert("Please wait for the current upload to finish.");
      return;
    }

    const collectFolderIds = (folderId) => [
      folderId,
      ...folders
        .filter((entry) => sameId(entry.parent_id, folderId))
        .flatMap((entry) => collectFolderIds(entry.id)),
    ];
    const folderIds = collectFolderIds(folder.id);
    const subfolderCount = folderIds.length - 1;
    const itemCount = assets.filter((item) =>
      folderIds.some((id) => sameId(id, item.folder_id)),
    ).length;

    const contents = [
      itemCount && `${itemCount} ${itemCount === 1 ? "item" : "items"}`,
      subfolderCount &&
        `${subfolderCount} ${subfolderCount === 1 ? "subfolder" : "subfolders"}`,
    ]
      .filter(Boolean)
      .join(" and ");
    const message = contents
      ? `Delete "${folder.name}" and everything inside it (${contents})? This cannot be undone.`
      : `Delete the empty folder "${folder.name}"?`;
    if (!window.confirm(message)) return;

    // Row-level security reports a blocked delete as success with zero rows,
    // so check what was actually removed.
    const blockedMessage =
      "The database did not allow this delete. Check the table's delete policy.";

    if (itemCount > 0) {
      const { data, error } = await supabase
        .from("deliverables")
        .delete()
        .in("folder_id", folderIds)
        .select("id");
      if (error || data.length === 0) {
        alert(`Could not delete folder: ${error?.message || blockedMessage}`);
        return;
      }
      setAssets((current) =>
        current.filter(
          (item) => !folderIds.some((id) => sameId(id, item.folder_id)),
        ),
      );
    }

    const { data, error } = await supabase
      .from("project_folders")
      .delete()
      .in("id", folderIds)
      .select("id");
    if (error || data.length === 0) {
      alert(`Could not delete folder: ${error?.message || blockedMessage}`);
      onRefresh?.();
      return;
    }
    setFolders((current) =>
      current.filter(
        (entry) => !folderIds.some((id) => sameId(id, entry.id)),
      ),
    );
    onRefresh?.();
  };

  const rootFolders = folders.filter(
    (folder) => !folder.parent_id || folder.parent_id === "root",
  );
  const matchingRootFolders = rootFolders.filter(folderHasMatches);
  const rootItems = items.filter(
    (item) =>
      (!item.folder_id || item.folder_id === "root") && itemMatches(item),
  );

  const goToFolder = (folderId) => {
    setCurrentFolderId(folderId);
    setQuery("");
    setFilter("all");
  };

  const renderFolderCard = (folder) => (
    <div
      key={folder.id}
      data-drop-folder={folder.id}
      className={`group relative flex min-h-28 flex-col justify-between rounded-lg border bg-white p-4 transition hover:border-[#c9c9c4] hover:bg-[#fcfcfa] ${sameId(dropFolderKey, folder.id) ? "border-[#579dff] ring-2 ring-[#579dff]/30" : "border-[#e5e5e2]"}`}
    >
      <button
        type="button"
        onClick={() => goToFolder(folder.id)}
        className="flex min-h-20 flex-col items-start justify-between text-left"
      >
        <Folder className="h-8 w-8 fill-[#dbdedd] text-[#c9c9c6]" />
        <span className="mt-4 block w-full truncate text-xs font-medium text-[#333330]">
          {folder.name}
        </span>
      </button>
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        <button
          type="button"
          onClick={() => openAssetModal(null, folder.id)}
          aria-label={`Upload to ${folder.name}`}
          title="Upload item here"
          className="flex h-7 w-7 items-center justify-center rounded text-[#8a8a86] hover:bg-[#f0f0ed] hover:text-[#30302e]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => openFolderModal(folder.id)}
          aria-label={`Create subfolder in ${folder.name}`}
          title="Create subfolder"
          className="flex h-7 w-7 items-center justify-center rounded text-[#8a8a86] hover:bg-[#f0f0ed] hover:text-[#30302e]"
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => renameFolder(folder)}
          aria-label={`Rename ${folder.name}`}
          title="Rename folder"
          className="flex h-7 w-7 items-center justify-center rounded text-[#8a8a86] hover:bg-[#f0f0ed] hover:text-[#30302e]"
        >
          <Edit2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => deleteFolder(folder)}
          aria-label={`Delete ${folder.name}`}
          title="Delete folder"
          className="flex h-7 w-7 items-center justify-center rounded text-[#8a8a86] hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  const renderItem = (item) => {
    const kind = fileKind(item);
    const isImage = kind === "image";
    const isVideo = kind === "video";
    const parentFolder = folders.find((folder) =>
      sameId(folder.id, item.folder_id),
    );

    return (
      <article
        key={item.id}
        className="group relative min-w-0 overflow-hidden rounded-lg border border-[#e5e5e2] bg-white transition hover:border-[#c9c9c4]"
      >
        <button
          type="button"
          onClick={() => setPreviewItem(item)}
          className="block w-full min-w-0 text-left"
        >
          <span className="flex h-28 items-center justify-center overflow-hidden bg-[#f5f5f3]">
            {isImage ? (
              <img
                src={item.url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <LibraryItemIcon item={item} className="h-8 w-8 text-[#8a8a86]" />
            )}
          </span>
          <span className="block min-w-0 px-3 py-2.5">
            <span className="block truncate pr-14 text-xs font-medium text-[#333330]">
              {item.title}
            </span>
            <span className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[#8a8a86]">
              <span className="truncate">
                {kind}
                {!currentFolderId && parentFolder
                  ? ` · ${parentFolder.name}`
                  : ""}
              </span>
            </span>
          </span>
        </button>
        <div className="flex justify-end border-t border-[#f0f0ec] px-3 py-1.5">
          {renderVersionBadge(item)}
        </div>
        {!item.id.startsWith("important-") && (
          <span className="absolute right-1.5 top-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => openAssetModal(item)}
              aria-label={`Edit ${item.title}`}
              title="Edit item"
              className="flex h-7 w-7 items-center justify-center rounded bg-white/95 text-[#666660] hover:bg-white hover:text-[#30302e]"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => deleteAsset(item)}
              aria-label={`Delete ${item.title}`}
              title="Delete item"
              className="flex h-7 w-7 items-center justify-center rounded bg-white/95 text-[#666660] hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </article>
    );
  };

  const renderListItem = (item, depth = 0) => (
    <div
      key={item.id}
      className="group flex w-full min-w-0 items-center justify-between gap-2 rounded-md py-1.5 pr-2 transition hover:bg-[#ecece9]"
      style={{ paddingLeft: `${12 + Math.min(depth, 3) * 12}px` }}
    >
      <button
        type="button"
        onClick={() => setPreviewItem(item)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="text-[#c4c4bf]">├──</span>
        <LibraryItemIcon
          item={item}
          className={`h-3.5 w-3.5 shrink-0 ${fileKind(item) === "link" ? "text-blue-600" : "text-emerald-600"}`}
        />
        <span className="truncate text-xs font-medium text-[#37352f]">
          {item.title}
        </span>
      </button>
      <span className="hidden shrink-0 text-[10px] text-[#999995] sm:inline">
        {item.uploaded_by || "admin"}
        {item.created_at
          ? ` · ${new Date(item.created_at).toLocaleDateString()}`
          : ""}
      </span>
      {renderVersionBadge(item)}
      {!item.id.startsWith("important-") && (
        <span className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
          <button
            type="button"
            onClick={() => openAssetModal(item)}
            aria-label={`Edit ${item.title}`}
            title="Edit item"
            className="flex h-7 w-7 items-center justify-center rounded text-[#8a8a86] hover:bg-white hover:text-[#30302e]"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => deleteAsset(item)}
            aria-label={`Delete ${item.title}`}
            title="Delete item"
            className="flex h-7 w-7 items-center justify-center rounded text-[#8a8a86] hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      )}
    </div>
  );

  const renderListFolder = (folder, depth = 0) => {
    if (!folderHasMatches(folder)) return null;
    const isExpanded = Boolean(expandedFolders[folder.id]);
    const children = folders.filter((item) =>
      sameId(item.parent_id, folder.id),
    );
    const folderAssets = items.filter(
      (item) => sameId(item.folder_id, folder.id) && itemMatches(item),
    );

    return (
      <div
        key={folder.id}
        data-drop-folder={folder.id}
        className={
          sameId(dropFolderKey, folder.id)
            ? "rounded-md ring-2 ring-[#579dff]/40"
            : undefined
        }
      >
        <div
          className="group flex items-center gap-2 rounded-md py-1 text-[#37352f] hover:bg-[#ecece9]"
          style={{ paddingLeft: `${8 + Math.min(depth, 3) * 12}px` }}
        >
          <button
            type="button"
            onClick={() => toggleFolder(folder.id)}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#9a9a96]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#9a9a96]" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 fill-[#dededb] text-[#c9c9c6]" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 fill-[#dededb] text-[#c9c9c6]" />
            )}
            <span className="truncate text-xs font-semibold">
              {folder.name}
            </span>
            <span className="shrink-0 text-[10px] text-[#9a9a96]">
              ({folderAssets.length + children.length})
            </span>
          </button>
          <span className="flex shrink-0 items-center gap-1 pr-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
            <button
              type="button"
              onClick={() => openAssetModal(null, folder.id)}
              aria-label={`Upload to ${folder.name}`}
              title="Upload item here"
              className="flex h-7 w-7 items-center justify-center rounded text-[#8a8a86] hover:bg-white hover:text-[#30302e]"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => openFolderModal(folder.id)}
              aria-label={`Create subfolder in ${folder.name}`}
              title="Create subfolder"
              className="flex h-7 w-7 items-center justify-center rounded text-[#8a8a86] hover:bg-white hover:text-[#30302e]"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => renameFolder(folder)}
              aria-label={`Rename ${folder.name}`}
              title="Rename folder"
              className="flex h-7 w-7 items-center justify-center rounded text-[#8a8a86] hover:bg-white hover:text-[#30302e]"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => deleteFolder(folder)}
              aria-label={`Delete ${folder.name}`}
              title="Delete folder"
              className="flex h-7 w-7 items-center justify-center rounded text-[#8a8a86] hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
        {isExpanded && (
          <div className="ml-4 border-l border-dashed border-[#d8d8d3]">
            {children.map((child) => renderListFolder(child, depth + 1))}
            {folderAssets.map((item) => renderListItem(item, depth + 1))}
            {children.length === 0 && folderAssets.length === 0 && (
              <p
                className="py-1 text-[11px] italic text-[#9a9a96]"
                style={{ paddingLeft: `${12 + depth * 18}px` }}
              >
                empty folder
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      className={`min-w-0 space-y-4 rounded-lg pt-4 sm:pt-6 ${
        dropFolderKey !== null && sameId(dropFolderKey, currentFolderId)
          ? "outline-2 outline-offset-4 outline-dashed outline-[#579dff]"
          : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[#30302e]">
            {documentsMode ? "Documents" : "Deliverables"}
          </h1>
          <div className="mt-2 flex min-w-0 items-center gap-1 text-[11px] text-[#787774]">
            <button
              type="button"
              onClick={() => goToFolder(null)}
              className="truncate hover:text-[#30302e]"
            >
              {project.title}
            </button>
            {breadcrumbs.map((folder) => (
              <React.Fragment key={folder.id}>
                <ChevronRight className="h-3 w-3 shrink-0" />
                <button
                  type="button"
                  onClick={() => goToFolder(folder.id)}
                  className="max-w-32 truncate hover:text-[#30302e]"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
        {!documentsMode && (
          <div className="flex items-center gap-1 rounded-md border border-[#e5e5e2] bg-white p-0.5">
            <button
              type="button"
              title="Grid view"
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              onClick={() => {
                setView("grid");
                setCurrentFolderId(null);
              }}
              className={`flex h-7 w-7 items-center justify-center rounded ${view === "grid" ? "bg-[#e9e9e6] text-[#30302e]" : "text-[#8a8a86] hover:bg-[#f4f4f1]"}`}
            >
              <Grid2X2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="List view"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => {
                setView("list");
                setCurrentFolderId(null);
                setExpandedFolders({ root: true });
              }}
              className={`flex h-7 w-7 items-center justify-center rounded ${view === "list" ? "bg-[#e9e9e6] text-[#30302e]" : "text-[#8a8a86] hover:bg-[#f4f4f1]"}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-y border-[#e9e9e6] py-2">
        <div className="flex flex-wrap items-center gap-1">
          {filters.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`h-7 rounded-md px-2.5 text-[10px] font-medium ${filter === id ? "bg-[#e9e9e6] text-[#30302e]" : "text-[#777772] hover:bg-[#f4f4f1]"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right side group containing New Folder, Upload, and Search */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {!documentsMode && (
            <button
              type="button"
              onClick={() => {
                openFolderModal(currentFolderId);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#e5e5e2] bg-white px-2.5 text-[11px] font-medium text-[#5f5f5b] hover:bg-[#f7f7f5]"
            >
              <FolderPlus className="h-3.5 w-3.5" /> New folder
            </button>
          )}
          <button
            type="button"
            onClick={() => openAssetModal(null, currentFolderId)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#20201e] px-2.5 text-[11px] font-medium text-white hover:bg-black"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {documentsMode ? "Upload document" : "Upload"}
          </button>

          <label className="flex h-8 w-full items-center gap-2 rounded-md border border-[#e5e5e2] bg-white px-2.5 sm:w-56">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#9a9a96]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={documentsMode ? "Search documents" : "Search files"}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="text-[#9a9a96] hover:text-[#30302e]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-xs text-[#787774]">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading library
        </div>
      ) : folderError ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          Could not load workspace folders: {folderError}
        </p>
      ) : (
        <>
          {view === "grid" && currentFolderId && (
            <button
              type="button"
              onClick={() => goToFolder(currentFolder?.parent_id || null)}
              className="inline-flex items-center gap-1.5 text-xs text-[#6f6f6c] hover:text-[#30302e]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}
          {view === "grid" ? (
            <>
              <div className="grid min-w-0 grid-cols-1 min-[360px]:grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visibleFolders.map(renderFolderCard)}
                {visibleItems.map(renderItem)}
              </div>
              {visibleFolders.length === 0 && visibleItems.length === 0 && (
                <p className="py-16 text-center text-xs text-[#8a8a86]">
                  No matching folders or files.
                </p>
              )}
            </>
          ) : (
            <div className="space-y-1 rounded-lg border border-[#e5e5e2] bg-[#fafaf8] p-3 font-mono text-sm">
              <div className="flex items-center gap-2 rounded-md px-2 py-1.5 font-semibold text-[#30302e] hover:bg-[#ecece9]">
                <button
                  type="button"
                  onClick={() => toggleFolder("root")}
                  className="flex min-w-0 items-center gap-1.5 text-left"
                >
                  {expandedFolders.root ? (
                    <ChevronDown className="h-3.5 w-3.5 text-[#777772]" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-[#777772]" />
                  )}
                  <FolderOpen className="h-4 w-4 shrink-0 fill-[#dededb] text-[#c9c9c6]" />
                  <span className="truncate">
                    {project.title.toLowerCase().replace(/\s+/g, "-")}
                  </span>
                </button>
              </div>
              {expandedFolders.root && (
                <div className="ml-3 border-l border-dashed border-[#d8d8d3] pl-2">
                  {matchingRootFolders.map((folder) =>
                    renderListFolder(folder),
                  )}
                  {rootItems.map((item) => renderListItem(item, 1))}
                  {matchingRootFolders.length === 0 &&
                    rootItems.length === 0 && (
                      <p className="px-4 py-8 text-center text-xs text-[#8a8a86]">
                        No matching folders or files.
                      </p>
                    )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {isFolderModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={createFolder}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-sm space-y-4 overflow-y-auto rounded-lg border border-[#e5e5e2] bg-white p-5 shadow-2xl"
          >
            <div>
              <h2 className="text-sm font-semibold text-[#30302e]">
                Create folder
              </h2>
              <p className="mt-1 text-xs text-[#787774]">
                Keep this workspace library organized.
              </p>
            </div>
            <label className="block space-y-1 text-xs font-medium text-[#5f5f5b]">
              <span>Folder name</span>
              <input
                autoFocus
                required
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                className="h-9 w-full rounded-md border border-[#e5e5e2] px-3 text-xs outline-none focus:border-[#579dff]"
              />
            </label>
            <label className="block space-y-1 text-xs font-medium text-[#5f5f5b]">
              <span>Parent folder</span>
              <select
                value={folderParentId || "root"}
                onChange={(event) =>
                  setFolderParentId(
                    event.target.value === "root" ? null : event.target.value,
                  )
                }
                className="h-9 w-full rounded-md border border-[#e5e5e2] bg-white px-3 text-xs"
              >
                <option value="root">Library root</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2 border-t border-[#f0f0ec] pt-3">
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="h-8 rounded-md border border-[#e5e5e2] px-3 text-xs text-[#5f5f5b]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#20201e] px-3 text-xs font-medium text-white"
              >
                <FolderPlus className="h-3.5 w-3.5" /> Create folder
              </button>
            </div>
          </form>
        </div>
      )}

      {dropFolderKey !== null && dropFolderName && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-md bg-[#20201e] px-3 py-2 text-xs font-medium text-white shadow-lg">
          <UploadCloud className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Drop to upload to {dropFolderName}</span>
        </div>
      )}

      {bulkUpload && (
        <aside
          aria-live="polite"
          className="fixed bottom-24 right-6 z-[95] w-80 max-w-[calc(100vw-3rem)] space-y-2 rounded-lg border border-[#e5e5e2] bg-white p-3 shadow-2xl"
        >
          <div className="flex items-center gap-2">
            {bulkUpload.isRunning ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#8a8a86]" />
            ) : bulkUpload.failed.length > 0 ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            <p className="min-w-0 flex-1 text-xs font-medium text-[#30302e]">
              {bulkUpload.isRunning
                ? `Uploading ${bulkUpload.done} of ${bulkUpload.total} files`
                : `${bulkUpload.uploaded} of ${bulkUpload.total} files uploaded`}
            </p>
            {!bulkUpload.isRunning && (
              <button
                type="button"
                onClick={() => setBulkUpload(null)}
                aria-label="Dismiss upload summary"
                className="text-[#9a9a96] hover:text-[#30302e]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[#f0f0ed]">
            <div
              className="h-full rounded-full bg-[#20201e] transition-[width]"
              style={{
                width: `${bulkUpload.total ? (bulkUpload.done / bulkUpload.total) * 100 : 100}%`,
              }}
            />
          </div>
          {bulkUpload.skipped > 0 && (
            <p className="text-[10px] text-[#8a8a86]">
              Skipped {bulkUpload.skipped} system{" "}
              {bulkUpload.skipped === 1 ? "item" : "items"} (e.g. Thumbs.db,
              .DS_Store).
            </p>
          )}
          {bulkUpload.failed.length > 0 && (
            <ul className="max-h-32 space-y-1 overflow-y-auto border-t border-[#f0f0ec] pt-2">
              {bulkUpload.failed.map((item) => (
                <li key={item.label} className="text-[10px]">
                  <span className="block truncate font-medium text-rose-700">
                    {item.label}
                  </span>
                  <span className="block truncate text-[#8a8a86]">
                    {item.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!bulkUpload.isRunning &&
            bulkUpload.failed.some((item) => item.planFile) && (
              <button
                type="button"
                onClick={retryFailedUploads}
                className="h-7 w-full rounded-md border border-[#e5e5e2] text-[11px] font-medium text-[#5f5f5b] hover:bg-[#f7f7f5]"
              >
                Retry failed files
              </button>
            )}
        </aside>
      )}

      {isAssetModalOpen && (
        <div
          data-drop-folder={assetFolderId || "root"}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
        >
          <form
            onSubmit={saveAsset}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md space-y-4 overflow-y-auto rounded-lg border border-[#e5e5e2] bg-white p-5 shadow-2xl"
          >
            <div>
              <h2 className="text-sm font-semibold text-[#30302e]">
                {documentsMode
                  ? editingAsset
                    ? "Edit document"
                    : "Upload document"
                  : editingAsset
                    ? "Edit library item"
                    : "Add to Deliverables"}
              </h2>
              <p className="mt-1 text-xs text-[#787774]">
                {documentsMode
                  ? "Add a document to this project."
                  : "Upload a file or a whole folder, or save a link."}
              </p>
            </div>
            {!documentsMode && (
              <div className="inline-flex items-center gap-1 rounded-md border border-[#e5e5e2] bg-[#f7f7f5] p-0.5">
                {[
                  ["link", "Link"],
                  ["file", "File"],
                  ...(editingAsset ? [] : [["folder", "Folder"]]),
                ].map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAssetType(type)}
                    className={`h-7 rounded px-3 text-[11px] font-medium ${assetType === type ? "bg-white text-[#30302e] shadow-sm" : "text-[#777772]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {assetType !== "folder" && (
              <label className="block space-y-1 text-xs font-medium text-[#5f5f5b]">
                <span>Name</span>
                <input
                  required
                  value={assetTitle}
                  onChange={(event) => setAssetTitle(event.target.value)}
                  className="h-9 w-full rounded-md border border-[#e5e5e2] px-3 text-xs outline-none focus:border-[#579dff]"
                />
              </label>
            )}
            {!documentsMode && (
              <label className="block space-y-1 text-xs font-medium text-[#5f5f5b]">
                <span>{assetType === "folder" ? "Upload into" : "Folder"}</span>
                <select
                  value={assetFolderId || "root"}
                  onChange={(event) =>
                    setAssetFolderId(
                      event.target.value === "root" ? null : event.target.value,
                    )
                  }
                  className="h-9 w-full rounded-md border border-[#e5e5e2] bg-white px-3 text-xs"
                >
                  <option value="root">Unfiled / root</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {assetType === "link" ? (
              <label className="block space-y-1 text-xs font-medium text-[#5f5f5b]">
                <span>Destination URL</span>
                <input
                  required
                  type="url"
                  placeholder="https://..."
                  value={assetUrl}
                  onChange={(event) => setAssetUrl(event.target.value)}
                  className="h-9 w-full rounded-md border border-[#e5e5e2] px-3 text-xs outline-none focus:border-[#579dff]"
                />
              </label>
            ) : assetType === "folder" ? (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-[#c9c9c4] bg-[#fafaf8] px-4 py-8 text-center transition hover:border-[#579dff] focus-within:border-[#579dff]">
                <input
                  type="file"
                  webkitdirectory=""
                  multiple
                  onChange={handleFolderPicked}
                  className="sr-only"
                />
                <FolderOpen className="h-7 w-7 fill-[#dededb] text-[#c9c9c6]" />
                <span className="text-xs font-medium text-[#30302e]">
                  Drag a folder here, or click to choose one
                </span>
                <span className="text-[10px] text-[#8a8a86]">
                  Its files and subfolders upload with the same structure.
                </span>
              </label>
            ) : (
              <label className="block space-y-1 text-xs font-medium text-[#5f5f5b]">
                <span>
                  Choose file{" "}
                  {editingAsset && "(optional to keep the current file)"}
                </span>
                <input
                  required={!editingAsset}
                  type="file"
                  accept={
                    documentsMode
                      ? ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp"
                      : undefined
                  }
                  onChange={(event) =>
                    setAssetFile(event.target.files?.[0] || null)
                  }
                  className="w-full rounded-md border border-[#e5e5e2] p-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-[#f0f0ed] file:px-2 file:py-1 file:text-[10px]"
                />
              </label>
            )}
            <div className="flex justify-end gap-2 border-t border-[#f0f0ec] pt-3">
              <button
                type="button"
                onClick={() => setIsAssetModalOpen(false)}
                className="h-8 rounded-md border border-[#e5e5e2] px-3 text-xs text-[#5f5f5b]"
              >
                Cancel
              </button>
              {assetType !== "folder" && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#20201e] px-3 text-xs font-medium text-white disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="h-3.5 w-3.5" />
                  )}
                  {editingAsset
                    ? "Save changes"
                    : documentsMode
                      ? "Upload document"
                      : "Upload"}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {previewItem && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setPreviewItem(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Preview ${previewItem.title}`}
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-[#e5e5e2] bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between gap-3 border-b border-[#e9e9e6] px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-[#30302e]">
                  {previewItem.title}
                </h2>
                <p className="text-[10px] text-[#8a8a86]">
                  {fileKind(previewItem)} · version {previewItem.version || 1}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={previewItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#e5e5e2] px-2.5 text-xs text-[#5f5f5b] hover:bg-[#f7f7f5]"
                >
                  Open link <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  aria-label="Close preview"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[#777772] hover:bg-[#f4f4f1]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 bg-[#f5f5f3]">
              {fileKind(previewItem) === "image" ? (
                <img
                  src={previewItem.url}
                  alt={previewItem.title}
                  className="mx-auto max-h-[78vh] max-w-full object-contain"
                />
              ) : fileKind(previewItem) === "video" ? (
                <video
                  src={previewItem.url}
                  controls
                  className="mx-auto max-h-[78vh] max-w-full"
                />
              ) : (
                <iframe
                  src={previewItem.url}
                  title={`Preview ${previewItem.title}`}
                  sandbox="allow-forms allow-scripts"
                  className="h-[70vh] w-full border-0 bg-white"
                />
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
