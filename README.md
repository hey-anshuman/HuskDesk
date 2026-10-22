
<h1 align="center">Huskdesk</h1>

<p align="center">
  <strong>Close the tabs. Keep the context.</strong>
</p>

<p align="center">
  A local-first Chrome extension to organize your browser workspace, preserve your progress, and return to unfinished work without losing context.
</p>


---

## Overview

Your browser is more than a collection of open tabs. It is where projects take shape, research accumulates, ideas develop, and unfinished tasks wait for your return.

But when tabs pile up, useful context gets buried in clutter. Closing them can mean losing track of what you were doing, while leaving everything open makes it harder to focus.

**Huskdesk helps you close the tabs without losing the context.**

It lets you save named workspaces, reopen them when you need them, attach personal resume notes, safely hibernate tabs, and organize saved tabs into useful groups. Its optional AI-powered grouping runs locally through Ollama, keeping the workflow independent of cloud AI services.

Huskdesk is designed around three principles:

- **Preserve context:** Keep your browser work organized and recoverable.
- **Stay in control:** Review suggestions before taking action.
- **Work locally:** Core workspace features do not require an account, a cloud backend, or a paid AI API.

## Features

### 1. Workspaces

Capture your current browser context as a named workspace.

- Save eligible open tabs with their URLs, titles, favicons, ordering, and pinned state.
- Browse your saved workspace library.
- Reopen a workspace in a new browser window.
- Open individual tabs from a saved workspace.
- Delete workspaces you no longer need.

Your saved workspace is a reusable snapshot of browser tabs, not a complete backup of a live browser session.

### 2. Resume Memory

Sometimes remembering the tabs is not enough. You also need to remember why they mattered.

Resume Memory lets you attach a user-written note to a workspace so you can pick up where you left off.

Use it to record:

- What you were working on.
- What you completed and what remains.
- Important links, decisions, or references.
- The next step you intended to take.

Your notes are associated with your saved workspace and stored with the extension's local workspace data.

### 3. Safe Tab Hibernation

Keep your browser manageable without immediately losing access to your work.

Huskdesk's hibernation workflow saves and verifies workspace information before closing the selected tabs.

The goal is simple: reduce tab clutter while preserving enough information to reopen your work later.

**Important:** Hibernation saves tab metadata and URLs. It does not preserve the complete live state of every page.

### 4. Tab Organizer

Turn a collection of saved tabs into more understandable groups.

Huskdesk supports two grouping approaches:

- **Domain-based grouping:** Groups tabs using website/domain information. This works without AI.
- **Local AI grouping:** Uses an optional model running through Ollama to suggest topic-based groups.

AI grouping is experimental. Model output can be incomplete, inaccurate, or unsuitable. Huskdesk validates the output and falls back to domain-based grouping when the result cannot be used.

Tabs the model does not classify may be placed in **Other / Review**. If too few tabs receive meaningful classifications, Huskdesk can use the domain-based fallback instead.

Grouping results are suggestions. Review them before taking further action.

### 5. Local-First Operation

Huskdesk is designed to keep workspace management independent of cloud infrastructure.

- No account is required.
- Core workspace features do not require AI.
- Local AI is optional.
- No paid AI API is required for the documented local workflow.
- Workspace information is stored using Chrome's local extension storage.

The local AI integration communicates with an Ollama instance running on your machine. See [Local AI Setup](#local-ai-setup-optional) for configuration details.

### 6. Light and Dark Themes

Use the interface in light or dark mode according to your preference.

---

## Feature Status

The following table describes the current documented feature set for version `0.1.0`.

| Feature | Status |
|---|---|
| Workspace capture | Implemented |
| Workspace library | Implemented |
| Open workspace in a new window | Implemented |
| Open individual saved tabs | Implemented |
| Delete saved workspaces | Implemented |
| Resume Memory notes | Implemented |
| Safe tab hibernation | Implemented |
| Domain-based tab grouping | Implemented |
| Local AI tab grouping | Implemented; experimental |
| AI grouping validation and fallback | Implemented |
| Light and dark themes | Implemented |

Implementation status does not guarantee that every browser configuration or failure scenario has been tested. See the project's test plan and implementation status documentation for additional details.

---

## Installation

Huskdesk is currently distributed as an unpacked Chrome extension built from the source code.

### Prerequisites

- Windows, macOS, or Linux with a supported development environment.
- Node.js 18 or later.
- npm.
- Google Chrome 115 or later, as specified by the current project setup.
- Ollama and a compatible local model only if you want to use AI-powered grouping.

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/HuskDesk.git
cd HuskDesk
```

Replace `YOUR_USERNAME` with the repository owner's GitHub username, and use the actual repository URL if it differs.

### 2. Install dependencies

```bash
cd extension
npm install
```

### 3. Build the extension

```bash
npm run build
```

The production build is generated in:

```text
extension/dist/
```

### 4. Load Huskdesk in Chrome

1. Open `chrome://extensions` in Google Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `extension/dist` directory.
5. Pin Huskdesk to the Chrome toolbar if desired.
6. Click the Huskdesk toolbar icon to open the popup.
7. Use the dashboard link in the popup to access the full workspace manager.

When you update the source code, rebuild the project and click **Reload** on the Huskdesk extension card.

> **Development note:** Load the generated `dist` directory, not the source directory. This ensures Chrome uses the built extension files.

---

## Local AI Setup (Optional)

Huskdesk's core workspace features work without AI. Local AI is an optional enhancement for topic-based tab grouping.

The local AI integration uses [Ollama](https://ollama.com) and the `gemma3:1b` model.

### 1. Install Ollama

Download and install Ollama from its official website:

https://ollama.com

### 2. Download the model

Open a terminal and run:

```bash
ollama pull gemma3:1b
```

This downloads the model to your machine. Model storage requirements depend on the model and Ollama installation.

### 3. Configure Ollama for the extension

Huskdesk sends grouping requests to this local endpoint:

```text
http://127.0.0.1:11434/api/generate
```

The Ollama server must allow requests from the Huskdesk Chrome extension origin. Depending on your Ollama installation and operating system, you may need to configure `OLLAMA_ORIGINS` to include the extension origin and restart Ollama.

The current setup uses:

```text
chrome-extension://*
```

Use the narrowest origin configuration supported by your setup. Avoid exposing Ollama to your local network or the public internet merely to make the extension work.

### 4. Verify the local service

Confirm that Ollama is running and that the model is available:

```bash
ollama list
```

Look for `gemma3:1b` in the model list.

### 5. Use AI grouping

1. Open Huskdesk.
2. Navigate to Tab Organizer.
3. Generate groups from saved workspaces.
4. Review the generated suggestions.

If Ollama is unavailable, rejects the request, or returns unusable output, Huskdesk can fall back to domain-based grouping.

### Troubleshooting

**The request returns HTTP 403**

Ollama may not allow requests from the extension origin. Review the `OLLAMA_ORIGINS` configuration and restart the Ollama service.

**The request fails to connect**

Verify that Ollama is running and listening on `127.0.0.1:11434`.

**The model is missing**

Run:

```bash
ollama pull gemma3:1b
```

**The grouping is inaccurate or incomplete**

AI-generated groups are suggestions, not guaranteed classifications. Review the results and use the domain-based fallback when necessary.

**AI is unavailable**

You can continue using Huskdesk's core workspace features without the local AI service.

---

## Privacy and Data Handling

Huskdesk follows a local-first design: workspace management is intended to work without a cloud account or a remote backend.

### Local workspace storage

Workspace data is stored through Chrome's `chrome.storage.local` API. This includes saved workspace information and associated resume notes.

Chrome's local extension storage is not encrypted at rest by Huskdesk. Anyone with sufficient access to your local browser profile or device may potentially access stored data.

### Browser tab information

To save and restore workspaces, Huskdesk uses browser tab metadata such as URLs, titles, favicon URLs, ordering, and pinned state.

Only eligible HTTP and HTTPS tabs are captured by the documented capture workflow. Chrome-internal pages are excluded.

A URL can contain sensitive information. Avoid saving workspaces containing confidential URLs if other people have access to your device or browser profile.

### Local AI processing

For the documented AI grouping workflow, Huskdesk sends a request to the Ollama service running locally on your machine.

The verified grouping request uses:

```text
http://127.0.0.1:11434/api/generate
```

This is a loopback address for the local machine. The intended workflow does not require sending grouping requests to a cloud AI provider.

However, local processing alone does not establish the behaviour of every dependency, browser context, or future feature. Review the source code and network activity when auditing a particular build.

### No account required

Huskdesk does not require users to create an account or configure a cloud backend to use its core features.

### Data retention

Saved workspace information remains in local extension storage until it is changed or deleted through the extension or its storage is otherwise cleared.

Uninstalling the extension or clearing browser data can affect locally stored information. Keep a separate backup of important information when necessary.

---

## Permissions

Huskdesk requests the following Chrome permissions in its current Manifest V3 configuration.

| Permission | Purpose |
|---|---|
| `tabs` | Read tab metadata and create, query, update, or close tabs as required by workspace management and hibernation. |
| `storage` | Store workspace data and related information locally through Chrome's extension storage. |
| `windows` | Identify the current browser window and open windows when restoring workspaces. |

Huskdesk also declares this host permission for local AI communication:

```text
http://127.0.0.1:11434/*
```

This allows the extension to communicate with the local Ollama service for AI grouping.

The current manifest does not declare broad `<all_urls>` access, browsing-history access, cookie access, or clipboard access.

Permission declarations and source-code usage should be reviewed together whenever the extension changes. A permission should only be removed after verifying that no active feature depends on it.

---

## Limitations

Huskdesk is designed to preserve browser work context, not to create a complete snapshot of every web application.

- **Eligible URLs only:** The documented capture workflow includes HTTP and HTTPS tabs. Chrome-internal pages are excluded.
- **No live session snapshot:** Restoring a saved workspace reopens URLs; it does not reconstruct the exact live state of each page.
- **Authentication is not restored:** You may need to sign in again if a website requires it.
- **Unsaved changes are not preserved:** Unsaved form inputs, page-specific state, scroll position, and transient application state may be lost.
- **AI grouping is experimental:** Model output can be incomplete, inaccurate, or inconsistent.
- **Local AI requires setup:** Ollama must be installed, running, configured, and have the required model available.
- **Fallback grouping is less semantic:** Domain-based grouping organizes tabs by website information rather than understanding their full context.
- **Local storage is not encrypted by Huskdesk:** Device and browser-profile security remain important.
- **No built-in cloud sync:** Workspaces are not automatically synchronized between devices by a Huskdesk cloud service.

---

## Development

### Project setup

From the repository root:

```bash
cd extension
npm install
```

### Run the development checks

```bash
# TypeScript type check
npx tsc --noEmit

# Lint
npm run lint

# Unit and integration tests, as configured by the project
npm test

# Production build
npm run build
```

A successful production build alone does not establish that every browser workflow is correct. Run the automated tests and perform manual Chrome smoke tests before preparing a release.

### Recommended manual smoke tests

- Save a workspace and restore it in a new window.
- Open an individual saved tab.
- Hibernate tabs and restore them.
- Create a Resume Memory note, reload the dashboard, and verify persistence.
- Generate Tab Organizer suggestions with Ollama available.
- Test the domain-based fallback when AI is unavailable.
- Verify that saved workspaces remain unchanged when generating suggestions.
- Check empty states and error handling.
- Review browser console errors and unexpected network requests.

After source changes, rebuild the extension and reload it through `chrome://extensions`.

---

## Repository Structure

The repository is organized around the extension application, its storage utilities, documentation, and development tooling.

```text
HuskDesk/
├── extension/
│   ├── src/
│   │   ├── background/     # Background service worker
│   │   ├── dashboard/      # Dashboard and workspace manager
│   │   ├── popup/          # Toolbar popup
│   │   ├── storage/        # Workspace capture and persistence
│   │   └── features/
│   │       └── grouping/   # Tab grouping and local AI integration
│   ├── public/             # Static extension assets
│   ├── dist/               # Generated production build
│   ├── manifest.json       # Extension manifest, if stored here
│   └── package.json        # Extension dependencies and scripts
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DESIGN.md
│   ├── SECURITY.md
│   ├── MEMORY.md
│   ├── DECISIONS.md
│   ├── TEST_PLAN.md
│   └── IMPLEMENTATION_STATUS.md
└── README.md
```

Some file locations may differ depending on the current repository layout. Use the actual project tree as the source of truth when updating this section.

---

## Project Documentation

Additional documentation provides more detail about the product and implementation:

| Document | Description |
|---|---|
| `docs/PRD.md` | Product requirements, workflows, and acceptance criteria |
| `docs/ARCHITECTURE.md` | Application architecture, layers, and data flow |
| `docs/DESIGN.md` | Design system, brand tokens, components, and accessibility |
| `docs/SECURITY.md` | Permissions, privacy considerations, and threat model |
| `docs/MEMORY.md` | Resume Memory structure and limitations |
| `docs/DECISIONS.md` | Technical decisions and trade-offs |
| `docs/TEST_PLAN.md` | Test cases and verification guidance |
| `docs/IMPLEMENTATION_STATUS.md` | Feature implementation status and known gaps |

---

## Design Principles

Huskdesk is guided by a few straightforward principles:

1. **Context over clutter:** Preserve useful work context instead of leaving every tab open.
2. **Local-first by default:** Avoid mandatory accounts, cloud backends, and paid AI dependencies.
3. **User control:** Treat generated groupings as suggestions and keep users in control of consequential actions.
4. **Safe workflows:** Preserve workspace information before closing tabs during hibernation.
5. **Honest limitations:** Clearly distinguish saved URLs from a complete browser session backup.
6. **Practical reliability:** Prefer a usable fallback over failing completely when optional AI functionality is unavailable.

---

## Current Release

**Version:** `0.1.0`

Huskdesk is an early-stage project. Core workspace workflows are implemented, while local AI grouping remains experimental and should be reviewed before relying on its classifications.

Before distributing a build, verify the current source, permissions, privacy disclosures, automated tests, and installation workflow.

---

**Huskdesk — Close the tabs. Keep the context.**
