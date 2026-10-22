# Huskdesk — Technical Decisions

## Decision log

---

### D-001: Manifest V3 service worker (minimal)

**Decision:** Keep the background service worker as a near-empty stub; do not use it for storage operations or message passing.

**Rationale:** All storage operations (`chrome.storage.local`) are accessible directly from the popup and dashboard (options page) contexts. Adding a background proxy would add complexity and latency without benefit. The `chrome.windows.getCurrent()` and `chrome.tabs.query()` calls work correctly from the popup and options page.

**Trade-off:** If future features need cross-context event coordination (e.g., auto-capture on window close), the background worker will need expanding. This is acceptable deferred complexity.

---

### D-002: Single-file Dashboard component

**Decision:** All dashboard pages and their sub-components (`WorkspaceDetail`, `TabOrganizerPage`, etc.) are declared in a single `Dashboard.tsx` file, not in separate files.

**Rationale:** Given the current scale, co-locating related logic reduces import graph complexity and makes the full page flow easier to follow. React does not require one-file-per-component.

**Trade-off:** The file is large (~1,150 lines). If pages grow significantly, they should be extracted into `src/pages/` or `src/features/` modules. This is noted as a future refactor point.

---

### D-003: No shared state between popup and dashboard

**Decision:** The popup and dashboard read from `chrome.storage.local` independently; there is no shared in-memory React state or Chrome message bus between them.

**Rationale:** Both contexts are separate browser pages (different origins in Chrome extension terms). Each reads storage on mount and after operations. This keeps state management simple and avoids message-passing bugs.

**Trade-off:** If the popup and dashboard are open simultaneously, changes made in one are not reflected in the other without a refresh. This is acceptable for an MVP — users rarely have both open at once, and a Refresh button exists on the library page.

---

### D-004: `window.prompt()` / `window.confirm()` for user input

**Decision:** Workspace naming and confirmations use native `window.prompt()` and `window.confirm()` dialogs.

**Rationale:** Modal dialogs in React require state management for open/close, focus trapping, keyboard handling, and accessibility. Native dialogs handle all of this for free, are accessible by default, and can be implemented in a few lines.

**Trade-off:** Native dialogs are visually plain and not branded. In a later design iteration, these should be replaced with custom modal components for a more consistent experience. The current implementation is functionally correct.

---

### D-005: Heuristic tab grouping (no AI in MVP)

**Decision:** The Tab Organizer uses domain-based heuristic grouping instead of AI-powered grouping in the MVP.

**Rationale:** Local AI (e.g., via Transformers.js with WebGPU/WASM) is a meaningful engineering effort that requires model selection, size/memory evaluation, loading states, fallbacks, and output validation. This work should not block the core workspace workflow.

**Trade-off:** The heuristic grouping is less intelligent than AI grouping. It is clearly labelled as such in the UI. AI grouping is documented as a planned future feature.

---

### D-006: Read-then-write storage pattern

**Decision:** `saveWorkspace` and `deleteWorkspace` call `getWorkspaces()` first, then write the entire array back. Not using atomic per-item operations.

**Rationale:** `chrome.storage.local` does not offer array-append operations. The read-then-write is necessary. Workspaces are small (hundreds of bytes per workspace), so reading the full array is cheap.

**Trade-off:** Concurrent writes from two contexts (popup + dashboard open simultaneously) could cause a race condition where one write overwrites the other. This is a known limitation, documented here. For MVP it is acceptable — the likelihood of concurrent capture from two contexts is very low.

---

### D-007: Favicon URL filtering

**Decision:** Only favicon URLs that start with `http://` or `https://` are stored. `data:` URIs are excluded.

**Rationale:** Some tabs report favicon URLs as inline `data:image/...` base64 strings, which can be hundreds of KB each. Storing these would quickly exhaust `chrome.storage.local`'s 10MB quota. HTTP favicon URLs are small strings that let the browser fetch the image fresh when needed.

**Trade-off:** Favicons may fail to load if a site is offline. The UI gracefully falls back to a placeholder character (`○`) in these cases.

---

### D-008: eslint-plugin-react-hooks v7 `set-state-in-effect` rule

**Decision:** Suppress `react-hooks/set-state-in-effect` with `eslint-disable-next-line` on the specific `setLoading(true)` call in the initial data fetch effect.

**Rationale:** The rule prohibits calling `setState` inside `useEffect`, including asynchronously. However, the standard async data-fetch pattern — `useEffect(() => { fetch().then(setState) })` — is a widely accepted React pattern for initial load. The rule is overly strict for this well-understood case. An `eslint-disable` on the single line is the least-invasive fix.

**Trade-off:** Using `eslint-disable` is a code smell but is explicitly documented here. A better long-term solution is to use React Query, SWR, or a custom `useAsync` hook that the linter understands. Deferred to a future refactor.

---

### D-009: Hibernation verification step

**Decision:** After saving the workspace, `getWorkspaces()` is called again to verify the workspace is present in storage before closing any tabs.

**Rationale:** `chrome.storage.local.set` is async and could theoretically fail silently (quota exceeded, storage corruption). The extra read confirms the data is retrievable before the destructive close operation.

**Trade-off:** An extra storage read adds ~1–5ms latency. Acceptable for a safety-critical step.
