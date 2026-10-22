# Huskdesk — Resume Memory

## What is Resume Memory?

Resume Memory is a user-written, free-form note attached to any saved workspace. It is designed to help the user re-orient themselves when returning to a saved context.

---

## Data structure

Resume memory is stored as an optional `note` field on the `Workspace` type:

```ts
type Workspace = {
  id: string;
  name: string;
  createdAt: string;
  windowId: number;
  tabs: SavedTab[];
  note?: string;         // Resume memory — user-written plain text
};
```

- **Type**: plain text string
- **Maximum length**: none enforced (user-controlled)
- **Storage**: alongside the workspace in `chrome.storage.local`
- **Mutability**: can be edited or deleted at any time

---

## What Resume Memory is

- A free-form note the **user writes themselves**
- Useful for: recording what you were doing, what to do next, relevant links, why certain tabs were open
- Displayed verbatim — never processed by AI or text transformation
- Entirely private — stored on-device only

---

## What Resume Memory is NOT

- NOT AI-generated content (no AI is used within the MVP to generate or suggest memory)
- NOT a transcript of page content
- NOT a record of the user's actions or browsing history
- NOT a guarantee about page state, authentication, or saved form data

---

## Limitations

1. **No page state capture** — browser sessions, login state, form data, scroll position, and video timestamps cannot be recovered by reopening tabs.
2. **No inference** — Huskdesk does not infer what the user was doing from tab titles or URLs.
3. **No structured format** — the note is plain text; there is no templating or required structure.
4. **User responsibility** — the quality of the memory depends entirely on what the user writes.

---

## Saved workspace metadata (what IS captured automatically)

When a workspace is captured, the following metadata is saved without user input:

| Field | Source | Notes |
|---|---|---|
| `name` | User prompt | Required |
| `createdAt` | `new Date().toISOString()` | Device clock |
| `tabs[].title` | `tab.title` | As shown in browser tab |
| `tabs[].url` | `tab.url` | http/https only |
| `tabs[].favIconUrl` | `tab.favIconUrl` | http/https only, optional |
| `tabs[].index` | `tab.index` | Original tab order |
| `tabs[].pinned` | `tab.pinned` | Boolean |

This metadata is objective and factual. It does not include any interpretation of the user's intent, page content, or relationship between tabs.

---

## UI flow

### Add memory
1. User visits Resume Memory page or workspace detail.
2. User clicks **Add memory**.
3. A text area opens — empty for new, pre-filled for existing notes.
4. User writes their note and clicks **Save memory**.
5. The note is persisted via `updateWorkspaceNote(id, note)`.

### Edit memory
- Same flow as above; existing note is pre-filled.

### Delete memory
- User clicks **Delete** next to the note.
- A `window.confirm()` prompt asks for confirmation.
- On confirmation, `updateWorkspaceNote(id, '')` is called, clearing the note.

---

## Future: AI-assisted memory (planned, not implemented)

A future version may offer an AI-assisted suggestion for the resume memory note, based solely on saved tab metadata (not page content). If implemented:
- The suggestion will always be shown to the user before saving
- The user can edit or reject the suggestion
- No tab metadata will be sent to remote services
- Any AI feature will be clearly labelled as AI-generated
