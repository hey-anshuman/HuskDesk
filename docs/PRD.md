# Huskdesk — Product Requirements Document

## Product vision

Huskdesk is a local-first Chrome extension that lets you save named workspaces of browser tabs, pick up exactly where you left off, and clear your browser without losing context. All core features work without AI, without an account, and without any data leaving your device.

---

## Core principles

1. **Local-first** — workspace data is stored in `chrome.storage.local` on-device only.
2. **User-controlled** — no tabs are closed, moved, or modified without an explicit user action.
3. **AI-optional** — capture, restore, and hibernation work completely without AI.
4. **Honest UI** — every visible control performs the action its label describes.
5. **Minimal permissions** — `tabs`, `storage`, `windows` only.

---

## MVP user workflows

### 1. Capture a workspace

1. User opens the popup or dashboard.
2. User clicks **Save current workspace** (popup) or **Capture workspace** (dashboard).
3. User is prompted for a workspace name.
4. Huskdesk reads all eligible http/https tabs from the current window.
5. Tab metadata (URL, title, favicon URL, index, pinned state) is saved to `chrome.storage.local`.
6. A success message confirms the workspace name and tab count.
7. The workspace list updates immediately.

**Acceptance criteria:**
- Chrome-internal pages (`chrome://`, `chrome-extension://`, etc.) are excluded.
- Empty windows produce an error message, not a silent empty save.
- Cancelled naming prompts are silently ignored (no error, no partial save).
- Storage failures display a clear error message.

---

### 2. View the workspace library

1. User opens the dashboard Workspaces page.
2. All saved workspaces are listed with: name, creation date, tab count, tab preview (first 3 titles), and resume memory badge if present.
3. Empty state shows a prompt to capture.

**Acceptance criteria:**
- Displayed counts match actual stored data.
- Data refreshes after capture or deletion.
- "Refresh" button allows manual reload.

---

### 3. Open a workspace

1. User clicks **Open workspace** on any saved workspace.
2. A confirmation dialog shows the workspace name and tab count.
3. User confirms.
4. Huskdesk opens the saved URLs in a **new browser window**.
5. Existing tabs in the current window are NOT closed.

**Acceptance criteria:**
- Pinned state is restored where Chrome APIs allow.
- Invalid or non-http URLs are skipped.
- Partial failures (some tabs fail to open) are reported.
- No false success if the window fails to open.

---

### 4. Open a single tab

1. On the workspace detail page, user clicks the open button (↗) next to any tab.
2. That tab opens in a new browser tab.

**Acceptance criteria:**
- Only http/https URLs can be opened.
- Chrome-internal URLs are rejected with a clear message.

---

### 5. Delete a workspace

1. User clicks **Delete** on a workspace card or detail page.
2. A confirmation dialog explains this deletes the saved record (browser tabs are not affected).
3. User confirms.
4. The workspace is removed from storage and the list updates.

**Acceptance criteria:**
- Deletion requires explicit confirmation.
- No workspace is deleted on accidental button press.
- The operation cannot affect live browser tabs.

---

### 6. Add / edit resume memory

1. On the Resume Memory page or workspace detail, user clicks **Add memory** or **Edit**.
2. A text area opens with the current note (empty if new).
3. User writes context and saves.
4. The note is stored alongside the workspace in local storage.

**Acceptance criteria:**
- Notes are displayed verbatim — no AI inference is applied.
- Notes can be deleted.
- The UI makes clear this is a user-written note, not AI-generated output.

---

### 7. Hibernate tabs

1. User opens the Hibernation page.
2. User clicks **Load tabs from this window**.
3. Eligible non-pinned http/https tabs are displayed with checkboxes.
4. User selects tabs to close, names the workspace, and confirms.
5. Huskdesk saves the workspace, verifies the save succeeded, then closes the selected tabs.
6. If save or verification fails, **no tabs are closed**.

**Acceptance criteria:**
- Pinned tabs are never included or closed.
- Workspace must be verified in storage before any closure.
- Failure during save produces an error, no tab closure.
- User can browse their hibernated workspace in the library afterwards.

---

## MVP acceptance criteria (overall)

| Feature | Criterion |
|---|---|
| Build | `npm run build` exits 0 |
| Lint | `npm run lint` exits 0, zero errors |
| Capture | Saves workspace with correct metadata |
| Library | Lists all saved workspaces, updates after changes |
| Open workspace | Opens tabs in new window, no existing tabs closed |
| Open tab | Opens single tab, validates URL |
| Delete | Requires confirmation, removes from storage |
| Resume memory | Editable note stored on device |
| Hibernation | Save-first-verify-then-close flow |
| Theme | Light/dark toggle persists in localStorage |
| Empty state | Shown when no workspaces exist |
| Error state | Shown on storage, permission, or API failures |

---

## Out of scope for MVP

- Cloud sync or accounts
- AI tab grouping (heuristic-only in MVP)
- Automatic tab monitoring or background agents
- Page content, screenshots, or form data capture
- Cross-device sync
