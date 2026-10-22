# Huskdesk — Security & Privacy

## Threat model summary

Huskdesk is a local-first tool with no network connectivity by design. The primary threats are:

1. Over-collection of sensitive tab data (page bodies, cookies, etc.)
2. Malicious URLs in saved workspaces being opened automatically
3. Prompt-injection-like tab titles influencing AI processing
4. Accidental destructive tab closure
5. Sensitive data exposure via logs or error messages

---

## Chrome permissions

### Requested permissions (manifest.json)

| Permission | Justification | Not requested |
|---|---|---|
| `tabs` | Read URL, title, favicon URL from open tabs | `history`, `bookmarks`, `cookies`, `webRequest` |
| `storage` | Persist workspace data locally | `syncStorage` (sync disabled) |
| `windows` | Identify current window; create windows for restore | `activeTab`, `background` (persistent) |

Huskdesk does **not** request:
- `history` — browser history is never scanned
- `cookies` — session cookies are never read
- `webRequest` / `declarativeNetRequest` — network traffic is not intercepted
- `clipboardRead` / `clipboardWrite` — clipboard is never accessed
- `geolocation`, `notifications`, `identity` — not needed

---

## What is collected

When a user captures a workspace, Huskdesk saves:

- Tab **URL** (http/https only)
- Tab **title** (plain text, as returned by the browser)
- Tab **favicon URL** (http/https only; data: URIs are excluded)
- Tab **index** (position in window, integer)
- Tab **pinned** state (boolean)
- **Workspace name** (user-provided string)
- **Creation timestamp** (ISO-8601, local device time)
- Optional **resume memory note** (user-written string)

Huskdesk does **not** collect:
- Page body content, DOM, or HTML
- Screenshots or visual snapshots
- Form values, passwords, or authentication tokens
- Cookies or session state
- Scroll position, text selection, or user interaction data
- Browser history outside of the current window's visible tabs
- Any data from inactive, minimized, or background browser windows (unless that window is the one being captured)

---

## Storage

All workspace data is stored in `chrome.storage.local`:

- **On-device only** — data never leaves the device
- **No cloud sync** — `chrome.storage.sync` is not used
- **No server** — Huskdesk has no backend, API endpoint, or telemetry receiver
- **No encryption at rest** — data is in plaintext in the Chrome local profile

> **Limitation**: Chrome's `storage.local` is not encrypted. If an attacker gains access to the user's Chrome profile directory, they can read the stored workspace data. This is a fundamental limitation of Chrome extension storage — equivalent to other browser-stored data like cookies, localStorage, and IndexedDB.

---

## URL validation before opening

Before opening any saved URL, Huskdesk validates the URL with `isEligibleUrl(url)`:

```ts
function isEligibleUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://');
}
```

This prevents:
- `javascript:` protocol execution
- `chrome://` internal page navigation
- `data:` URI execution
- `file://` local file access
- Any other non-http(s) scheme

---

## AI inputs (future)

If AI features are added:

- Tab metadata (URLs, titles) is treated as untrusted user-controlled data
- Prompt injections in page titles (e.g., titles that say "Ignore previous instructions...") are a known risk
- AI is never given page body content
- No tab metadata is sent to remote APIs
- Model outputs are validated against explicit schemas
- Users see and approve all AI-generated suggestions before any action is taken

---

## Destructive actions

All destructive or irreversible operations require explicit user confirmation:

| Action | Confirmation required |
|---|---|
| Delete workspace | `window.confirm()` with clear description |
| Open workspace (many tabs) | `window.confirm()` showing tab count |
| Hibernate tabs | `window.confirm()` with named steps |

- Hibernation: saves and **verifies** before closing any tab. If verification fails, no tabs are closed.
- Deletion: removes only the saved record — live browser tabs are never affected.

---

## Content Security Policy

The extension uses Manifest V3's default CSP, which prohibits:
- Inline `<script>` execution
- `eval()` and related dynamic JS execution
- Remote script loading

React is bundled at build time; no runtime CDN scripts are loaded.

---

## No analytics or telemetry

Huskdesk does not:
- Report crashes or errors to any remote service
- Track user actions or feature usage
- Include any third-party analytics SDK

---

## Logging

- `console.info` is used in the background service worker for install/update events only
- No sensitive tab metadata (URLs, titles) is logged
- Production builds include the background log but no user data is exposed via it
