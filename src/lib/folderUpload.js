// Operating-system clutter that nobody meant to deliver.
const SYSTEM_FILES = new Set([".ds_store", "thumbs.db", "desktop.ini"]);
const SYSTEM_FOLDERS = new Set(["__macosx"]);

const isSystemFile = (name) => {
  const lower = name.toLowerCase();
  return SYSTEM_FILES.has(lower) || lower.startsWith("._");
};

const isSystemFolder = (name) => SYSTEM_FOLDERS.has(name.toLowerCase());

const createPlan = () => ({
  folderPaths: [],
  files: [],
  unreadable: [],
  skipped: 0,
});

function addFile(plan, file, folderPath) {
  if (isSystemFile(file.name)) {
    plan.skipped += 1;
  } else {
    plan.files.push({ file, folderPath });
  }
}

// readEntries returns at most 100 entries per call, so keep reading until it
// comes back empty.
async function readDirectory(directory) {
  const reader = directory.createReader();
  const entries = [];
  for (;;) {
    const batch = await new Promise((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) return entries;
    entries.push(...batch);
  }
}

async function walkEntry(entry, folderPath, plan) {
  const label = [...folderPath, entry.name].join("/");
  try {
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) =>
        entry.file(resolve, reject),
      );
      addFile(plan, file, folderPath);
      return;
    }
    if (isSystemFolder(entry.name)) {
      plan.skipped += 1;
      return;
    }
    const path = [...folderPath, entry.name];
    plan.folderPaths.push(path);
    for (const child of await readDirectory(entry)) {
      await walkEntry(child, path, plan);
    }
  } catch (error) {
    plan.unreadable.push({
      label,
      message: error?.message || "Could not be read from disk.",
    });
  }
}

/**
 * Builds an upload plan from a drop event. Folders are walked recursively and
 * parents always come before their children in plan.folderPaths.
 */
export function planFromDrop(dataTransfer) {
  // Entries are only readable during the drop event, so collect them here
  // before anything is awaited.
  const entries = Array.from(dataTransfer.items || [], (item) =>
    item.kind === "file" ? item.webkitGetAsEntry?.() : null,
  ).filter(Boolean);
  const looseFiles = entries.length ? [] : Array.from(dataTransfer.files || []);

  return (async () => {
    const plan = createPlan();
    looseFiles.forEach((file) => addFile(plan, file, []));
    for (const entry of entries) {
      await walkEntry(entry, [], plan);
    }
    return plan;
  })();
}

/** Builds an upload plan from the files of a webkitdirectory input. */
export function planFromFolderInput(files) {
  const plan = createPlan();
  const seenFolders = new Set();

  files.forEach((file) => {
    const folderPath = file.webkitRelativePath.split("/").slice(0, -1);
    if (folderPath.some(isSystemFolder)) {
      plan.skipped += 1;
      return;
    }
    folderPath.forEach((_, index) => {
      const path = folderPath.slice(0, index + 1);
      const key = path.join("/");
      if (!seenFolders.has(key)) {
        seenFolders.add(key);
        plan.folderPaths.push(path);
      }
    });
    addFile(plan, file, folderPath);
  });

  return plan;
}

/** Runs worker over items with at most `limit` in flight at once. */
export async function runPool(items, limit, worker) {
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next];
        next += 1;
        await worker(item);
      }
    },
  );
  await Promise.all(runners);
}
