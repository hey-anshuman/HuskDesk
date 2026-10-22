# Huskdesk — Architecture

## Application layers

```
┌─────────────────────────────────────────────────────────┐
│  Chrome Extension Shell (Manifest V3)                    │
│                                                          │
│  ┌──────────────┐  ┌─────────────────────────────────┐  │
│  │  popup.html  │  │       dashboard.html             │  │
│  │  Popup.tsx   │  │       Dashboard.tsx              │  │
│  │              │  │  (Overview, Workspaces, Tabs,    │  │
│  │  Capture     │  │   Memory, Hibernation, Settings) │  │
│  │  Recent list │  │                                  │  │
│  └──────┬───────┘  └───────────────┬─────────────────┘  │
│         │                          │                     │
│  ┌──────▼──────────────────────────▼─────────────────┐  │
│  │             Storage layer (src/storage/)           │  │
│  │   capture.ts       — tab capture & filtering       │  │
│  │   workspaces.ts    — CRUD + validation             │  │
│  └──────────────────────────────┬────────────────────┘  │
│                                 │                        │
│  ┌──────────────────────────────▼────────────────────┐  │
│  │           chrome.storage.local (on-device)        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────┐                               │
│  │  background/index.ts │  (service worker — minimal)   │
│  │  install/update log  │                               │
│  └──────────────────────┘                               │
└─────────────────────────────────────────────────────────┘
```

---

## Entry points

| File | Purpose |
|---|---|
| `popup.html` → `src/popup/main.tsx` | Popup rendered when extension icon is clicked |
| `dashboard.html` → `src/dashboard/main.tsx` | Full dashboard, opened via options_page |
| `src/background/index.ts` → `dist/background.js` | Service worker, minimal |
| `index.html` → `src/main.tsx` | Dev mode only (Vite HMR), not used in extension build |

---

## Build system

- **Bundler**: Vite 8 with `@vitejs/plugin-react`
- **TypeScript**: v6, strict mode, `bundler` module resolution
- **Output**: `dist/` — flat output with named JS files per entry point
- **Config**: `vite.config.ts` uses `rolldownOptions.input` to bundle all three entry points

```
dist/
  popup.html
  popup.js         (popup React app)
  dashboard.html
  dashboard.js     (dashboard React app)
  background.js    (service worker)
  manifest.json
  icons/
  assets/          (hashed CSS bundle)
```

---

## Storage layer

### `src/storage/workspaces.ts`

All workspace data lives in `chrome.storage.local` under the key `huskdesk-workspaces`.

**Types:**
```ts
type SavedTab = {
  title: string;
  url: string;           // http:// or https:// only
  favIconUrl?: string;   // http-origin only, optional
  index: number;         // original tab order
  pinned: boolean;
};

type Workspace = {
  id: string;            // crypto.randomUUID()
  name: string;          // user-provided
  createdAt: string;     // ISO-8601
  windowId: number;      // original window ID (informational)
  tabs: SavedTab[];
  note?: string;         // resume memory (user-written)
};
```

**Operations:**
- `getWorkspaces()` — reads and validates stored array, drops malformed entries
- `saveWorkspace(name, windowId, tabs)` — prepends new workspace, returns saved record
- `deleteWorkspace(id)` — filters out by ID, writes back
- `updateWorkspaceNote(id, note)` — updates note field only

All operations are async, using `chrome.storage.local` directly without a background proxy (permitted from popup and options page contexts).

---

### `src/storage/capture.ts`

Reads tabs from the current window using `chrome.tabs.query` and `chrome.windows.getCurrent`.

**Filtering:**
- Only `http://` and `https://` URLs are captured
- `chrome://`, `chrome-extension://`, `about:`, `data:`, and other schemes are excluded
- Favicon URLs from non-http schemes are stripped

**Error cases handled:**
- `chrome.windows.getCurrent` fails (permission or context error)
- `chrome.tabs.query` fails
- No eligible tabs found → throws with a user-readable message

---

## Background service worker

`src/background/index.ts` is minimal — it only logs install/update events. All storage operations happen in the popup and dashboard contexts where `chrome.storage.local` is directly accessible.

---

## UI architecture

Both popup and dashboard are self-contained React trees. There is no shared state between them — each reads from `chrome.storage.local` independently.

### Popup (`src/popup/Popup.tsx`)

- Compact 360px fixed-width view
- Shows last 4 saved workspaces
- Capture button calls `captureCurrentWindow` directly
- Open workspace button calls `chrome.windows.create`
- Theme syncs via `localStorage` key `huskdesk-theme`

### Dashboard (`src/dashboard/Dashboard.tsx`)

- Full-page layout with sidebar navigation
- Pages: Overview, Workspaces, Tab Organizer, Resume Memory, Hibernation, Settings
- All pages are rendered as conditional JSX blocks within the same component file
- Sub-components (WorkspaceDetail, TabOrganizerPage, ResumeMemoryPage, HibernationPage, SettingsPage) are declared at module level
- State is managed in the top-level Dashboard component and passed as props

---

## Chrome permissions

| Permission | Why it is needed |
|---|---|
| `tabs` | Read tab URL, title, favicon, index, pinned state |
| `storage` | Persist workspace data to `chrome.storage.local` |
| `windows` | `chrome.windows.getCurrent()` for capture; `chrome.windows.create()` for restore |

---

## Data flow: capture

```
User clicks "Capture"
  → prompt() for name
  → captureCurrentWindow(name)
      → chrome.windows.getCurrent()
      → chrome.tabs.query({ windowId })
      → filter http(s) tabs
      → saveWorkspace(name, windowId, tabs)
          → getWorkspaces() [read-then-write]
          → chrome.storage.local.set([new, ...existing])
          → return saved Workspace
  → setWorkspaces(prev => [workspace, ...prev])
  → showNotice(success)
```

---

## Data flow: restore (open workspace)

```
User clicks "Open workspace"
  → window.confirm(tab count warning)
  → chrome.windows.create({ url: firstTab.url })
  → chrome.tabs.create × (tabs.length - 1)
  → showNotice(success/failure)
```

Existing tabs are never closed. The open is additive.

---

## Data flow: hibernation

```
User clicks "Load tabs from this window"
  → chrome.windows.getCurrent()
  → chrome.tabs.query({ windowId })
  → filter non-pinned http(s) tabs
  → display list with checkboxes

User selects tabs + names workspace + confirms
  → saveWorkspace(name, windowId, selectedTabs)
  → getWorkspaces() — verify workspace was saved
  → if verification passes: chrome.tabs.remove(tabIds)
  → if verification fails: error, no tabs closed
```
