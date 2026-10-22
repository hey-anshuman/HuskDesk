// Huskdesk workspace storage — all data stays on-device in chrome.storage.local.

export type SavedTab = {
  title: string;
  url: string;
  favIconUrl?: string;
  index: number;
  pinned: boolean;
};

export type Workspace = {
  id: string;
  name: string;
  createdAt: string; // ISO-8601
  windowId: number;
  tabs: SavedTab[];
  note?: string; // Optional user note / resume memory
};

const STORAGE_KEY = 'huskdesk-workspaces';

/** Narrow an unknown value into a SavedTab, returning null if invalid. */
function parseSavedTab(value: unknown): SavedTab | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.url !== 'string' || !obj.url) return null;
  return {
    title: typeof obj.title === 'string' ? obj.title : obj.url,
    url: obj.url,
    favIconUrl: typeof obj.favIconUrl === 'string' ? obj.favIconUrl : undefined,
    index: typeof obj.index === 'number' ? obj.index : 0,
    pinned: typeof obj.pinned === 'boolean' ? obj.pinned : false,
  };
}

/** Narrow an unknown value into a Workspace, returning null if invalid. */
function parseWorkspace(value: unknown): Workspace | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.id !== 'string' || !obj.id) return null;
  if (typeof obj.name !== 'string') return null;
  if (typeof obj.createdAt !== 'string') return null;
  if (!Array.isArray(obj.tabs)) return null;

  const tabs: SavedTab[] = [];
  for (const rawTab of obj.tabs) {
    const tab = parseSavedTab(rawTab);
    if (tab) tabs.push(tab);
  }

  return {
    id: obj.id,
    name: obj.name,
    createdAt: obj.createdAt,
    windowId: typeof obj.windowId === 'number' ? obj.windowId : 0,
    tabs,
    note: typeof obj.note === 'string' ? obj.note : undefined,
  };
}

/** Load all workspaces from local storage, discarding any malformed entries. */
export async function getWorkspaces(): Promise<Workspace[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const value: unknown = result[STORAGE_KEY];
  if (!Array.isArray(value)) return [];

  const workspaces: Workspace[] = [];
  for (const raw of value) {
    const ws = parseWorkspace(raw);
    if (ws) workspaces.push(ws);
  }
  return workspaces;
}

/** Persist a new workspace (prepended, newest first). Returns the saved record. */
export async function saveWorkspace(
  name: string,
  windowId: number,
  tabs: SavedTab[],
): Promise<Workspace> {
  const existing = await getWorkspaces();

  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    windowId,
    tabs,
  };

  await chrome.storage.local.set({
    [STORAGE_KEY]: [workspace, ...existing],
  });

  return workspace;
}

/** Delete a workspace by id. Silently a no-op when the id is not found. */
export async function deleteWorkspace(id: string): Promise<void> {
  const workspaces = await getWorkspaces();
  await chrome.storage.local.set({
    [STORAGE_KEY]: workspaces.filter((ws) => ws.id !== id),
  });
}

/** Update the optional note/memory on an existing workspace. */
export async function updateWorkspaceNote(id: string, note: string): Promise<void> {
  const workspaces = await getWorkspaces();
  const updated = workspaces.map((ws) =>
    ws.id === id ? { ...ws, note: note.trim() || undefined } : ws,
  );
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
}
