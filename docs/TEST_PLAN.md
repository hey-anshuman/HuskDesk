# Huskdesk — Test Plan

## Test environment

- Tests use **mock Chrome APIs** — real browser APIs are not available in the Node.js test environment.
- The extension build is tested via the TypeScript compiler and Vite build.
- End-to-end tests require loading the unpacked extension in Chrome and manual verification.
- No automated E2E framework (Playwright/Puppeteer) is currently configured.

> **Note:** All tests below marked as "Manual" require a real Chrome instance with the unpacked extension loaded.

---

## Unit test cases (storage layer)

### T-001: `isEligibleUrl`
| Input | Expected |
|---|---|
| `https://example.com` | `true` |
| `http://example.com` | `true` |
| `chrome://newtab` | `false` |
| `chrome-extension://abc/popup.html` | `false` |
| `about:blank` | `false` |
| `data:text/html,...` | `false` |
| `javascript:void(0)` | `false` |
| `file:///home/user/doc.html` | `false` |
| `ftp://server.com` | `false` |

### T-002: `parseWorkspace` (internal validation)
| Input | Expected |
|---|---|
| Valid workspace object | Returns typed Workspace |
| `null` | Returns `null` |
| Object missing `id` | Returns `null` |
| Object missing `tabs` array | Returns `null` |
| Workspace with malformed tab entries | Returns workspace with only valid tabs |
| Workspace with `note: undefined` | Returns workspace, `note` field absent |
| Workspace with `note: "some text"` | Returns workspace with note intact |

### T-003: `saveWorkspace`
| Scenario | Expected |
|---|---|
| Empty storage | Creates array with one workspace |
| Existing workspaces | Prepends new workspace |
| Returns the saved workspace | `id`, `name`, `createdAt`, `tabs` all present |
| `crypto.randomUUID()` called | Each save produces a unique ID |

### T-004: `deleteWorkspace`
| Scenario | Expected |
|---|---|
| Existing ID | Workspace removed from array |
| Non-existent ID | Array unchanged |
| Last workspace deleted | Empty array stored |

### T-005: `getWorkspaces`
| Scenario | Expected |
|---|---|
| Empty storage | Returns `[]` |
| Valid stored array | Returns typed Workspace[] |
| Malformed storage value (not array) | Returns `[]` |
| Array with some malformed entries | Returns only valid entries |

### T-006: `updateWorkspaceNote`
| Scenario | Expected |
|---|---|
| Existing workspace ID | `note` field updated |
| Empty string passed | `note` field removed (undefined) |
| Non-existent ID | Array unchanged |

---

## Integration test cases (requires Chrome mock)

### T-010: `captureCurrentWindow`
| Scenario | Expected |
|---|---|
| Window with 3 http tabs | Returns workspace with 3 tabs |
| Window with chrome:// tabs only | Throws "No eligible web tabs" |
| Window with mixed http + chrome:// tabs | Only http tabs in result |
| Empty window | Throws error |
| Pinned tab included | Tab saved with `pinned: true` |
| Tab with data: favicon | Favicon URL not saved (stripped) |
| Tab with https: favicon | Favicon URL saved |

### T-011: Popup capture flow (manual)
1. Load popup in Chrome.
2. Open 3+ http tabs.
3. Click "Save current workspace".
4. Enter a name and confirm.
5. **Assert**: Success notice appears with correct tab count.
6. **Assert**: Workspace appears in the recent list below.
7. Dismiss popup, reopen.
8. **Assert**: Workspace still appears (persisted to storage).

### T-012: Dashboard workspace library (manual)
1. Open dashboard.
2. Navigate to Workspaces.
3. **Assert**: All saved workspaces displayed with name, date, tab count.
4. **Assert**: Tab preview shows up to 3 titles.
5. **Assert**: Empty state shown when no workspaces exist.

### T-013: Open workspace (manual)
1. On dashboard Workspaces page, click "Open workspace".
2. Review confirmation dialog (tab count shown).
3. Confirm.
4. **Assert**: New Chrome window opens with saved URLs.
5. **Assert**: Original window tabs are unchanged.

### T-014: Open single tab (manual)
1. Navigate to workspace detail.
2. Click ↗ on one saved tab.
3. **Assert**: That tab opens in the current window.
4. **Assert**: Other saved tabs are not touched.

### T-015: Delete workspace (manual)
1. On Workspaces page, click Delete on a workspace.
2. **Assert**: Confirmation dialog appears.
3. Cancel — **Assert**: Workspace still present.
4. Delete again and confirm.
5. **Assert**: Workspace removed from list.
6. **Assert**: Workspace count on Overview decreases.

### T-016: Resume memory (manual)
1. Navigate to Resume Memory page.
2. Click "+ Add memory" on a workspace.
3. Enter text and save.
4. **Assert**: Note displayed below the workspace.
5. Click "Edit", modify, save.
6. **Assert**: Updated note displayed.
7. Click "Delete", confirm.
8. **Assert**: Note removed.

### T-017: Hibernation flow — success (manual)
1. Open 5 non-pinned http tabs.
2. Navigate to Hibernation.
3. Click "Load tabs from this window".
4. **Assert**: Tabs listed (pinned excluded).
5. Select all, name workspace, confirm.
6. **Assert**: Workspace appears in library.
7. **Assert**: All selected tabs closed.

### T-018: Hibernation flow — verification guard (manual / simulated)
- Simulate a storage failure during `saveWorkspace` (e.g., mock `chrome.storage.local.set` to reject).
- **Assert**: Error message displayed.
- **Assert**: No tabs closed.

### T-019: Theme persistence (manual)
1. Toggle theme in popup.
2. Close and reopen popup.
3. **Assert**: Theme remembered.
4. Open dashboard.
5. **Assert**: Dashboard picks up the same theme.

### T-020: Tab Organizer (manual)
1. Save 2+ workspaces with tabs from different domains.
2. Navigate to Tab Organizer.
3. Click "Generate groups".
4. **Assert**: Groups shown by domain.
5. **Assert**: No browser tabs modified.

---

## Build / lint verification

| Check | Command | Expected |
|---|---|---|
| TypeScript compilation | `npx tsc --noEmit -p tsconfig.app.json` | Exit 0, no errors |
| Production build | `npm run build` | Exit 0, all output files present |
| Lint | `npm run lint` | Exit 0, no errors |

---

## Results (as of 2026-10-21)

| Check | Result |
|---|---|
| `npm run build` | ✅ Exit 0 — popup.js (4.84 kB), dashboard.js (39.47 kB), background.js (0.26 kB) |
| `npm run lint` | ✅ Exit 0 — 0 errors, 0 warnings |
| TypeScript | ✅ Exit 0 — no type errors |
| Manual browser tests | ⚠️ Not yet run — requires unpacked extension in Chrome |

---

## Limitations and gaps

1. No automated unit test runner is configured (no Vitest/Jest setup).
2. Chrome API mocks are not implemented — `chrome.storage.local`, `chrome.tabs`, `chrome.windows` would need to be mocked for unit tests.
3. End-to-end tests use `window.prompt()` / `window.confirm()` which cannot be tested with standard Playwright without dialog handling.
4. Hibernation tab closure cannot be fully verified without a real Chrome instance.
