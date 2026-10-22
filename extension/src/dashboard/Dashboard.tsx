import { resolveGrouping } from "../features/grouping/resolveGrouping";
import { describeAiFailure, suggestLocalGroups } from "../features/grouping/localAiGrouping";
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { captureCurrentWindow, isEligibleUrl } from '../storage/capture';
import { deleteWorkspace, getWorkspaces, updateWorkspaceNote, type Workspace } from '../storage/workspaces';

type Page =
  | 'Overview'
  | 'Workspaces'
  | 'Tab Organizer'
  | 'Resume Memory'
  | 'Hibernation'
  | 'Settings';

type NoticeType = 'info' | 'success' | 'error';

const NAV_ITEMS: { label: Page; icon: IconName; group: 'WORK' | 'PREFERENCES' }[] = [
  { label: 'Overview', icon: 'overview', group: 'WORK' },
  { label: 'Workspaces', icon: 'workspaces', group: 'WORK' },
  { label: 'Tab Organizer', icon: 'tabs', group: 'WORK' },
  { label: 'Resume Memory', icon: 'memory', group: 'WORK' },
  { label: 'Hibernation', icon: 'hibernation', group: 'WORK' },
  { label: 'Settings', icon: 'settings', group: 'PREFERENCES' },
];

const WORKSPACE_COLORS = ['var(--lavender)', 'var(--pink)', 'var(--lime)', 'var(--bg-secondary)'];

function getInitialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('huskdesk-theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* Continue with system preference. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

type IconName =
  | 'overview' | 'workspaces' | 'tabs' | 'memory' | 'hibernation' | 'settings'
  | 'sun' | 'moon' | 'shield' | 'shield-check' | 'sparkles'
  | 'arrow-right' | 'arrow-left' | 'external' | 'refresh'
  | 'plus' | 'check' | 'x' | 'info' | 'globe';

const ICON_PATHS: Record<IconName, ReactNode> = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  workspaces: (
    <>
      <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3z" />
      <path d="m3 12 9 4.5 9-4.5" />
      <path d="m3 16.5 9 4.5 9-4.5" />
    </>
  ),
  tabs: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 5v5" />
      <path d="M14 5v5" />
    </>
  ),
  memory: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  hibernation: (
    <>
      <rect x="2" y="3" width="20" height="5" rx="1.5" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </>
  ),
  settings: (
    <>
      <path d="M4 21v-7" />
      <path d="M4 10V3" />
      <path d="M12 21v-9" />
      <path d="M12 8V3" />
      <path d="M20 21v-5" />
      <path d="M20 12V3" />
      <path d="M1 14h6" />
      <path d="M9 8h6" />
      <path d="M17 16h6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  'shield-check': (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  sparkles: (
    <>
      <path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9L11 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </>
  ),
  external: (
    <>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
    </>
  ),
};

function Icon({
  name,
  size = 18,
  spaceStart = false,
  spaceEnd = false,
  style,
}: {
  name: IconName;
  size?: number;
  spaceStart?: boolean;
  spaceEnd?: boolean;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{
        flexShrink: 0,
        verticalAlign: '-0.2em',
        marginLeft: spaceStart ? 6 : undefined,
        marginRight: spaceEnd ? 6 : undefined,
        ...style,
      }}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

export default function Dashboard() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [page, setPage] = useState<Page>('Overview');
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState<NoticeType>('info');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [loading, setLoading] = useState(true);
  // Workspace detail view
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  // Hibernation state
  const [hibernateTabs, setHibernateTabs] = useState<chrome.tabs.Tab[]>([]);
  const [hibernateSelected, setHibernateSelected] = useState<Set<number>>(new Set());
  const [hibernating, setHibernating] = useState(false);
  const [hibernateStep, setHibernateStep] = useState<'pick' | 'confirm' | 'done'>('pick');
  // Resume memory
  const [memoryEditId, setMemoryEditId] = useState<string | null>(null);
  const [memoryDraft, setMemoryDraft] = useState('');
  const [savingMemory, setSavingMemory] = useState(false);

  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply theme on mount using the initial value only — this is safe.
  useEffect(() => {
    applyTheme(getInitialTheme());
  }, []);

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const ws = await getWorkspaces();
      setWorkspaces(ws);
    } catch {
      setNotice('Could not load saved workspaces.');
      setNoticeType('error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch — inlined async pattern; setLoading is needed here
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getWorkspaces()
      .then((ws) => { if (active) { setWorkspaces(ws); setLoading(false); } })
      .catch(() => { if (active) { setNotice('Could not load saved workspaces.'); setNoticeType('error'); setLoading(false); } });
    return () => { active = false; };
  }, []);

  function showNotice(message: string, type: NoticeType = 'info') {
    setNotice(message);
    setNoticeType(type);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 6000);
  }

  function navigate(p: Page) {
    setPage(p);
    setNotice('');
    setSelectedWorkspaceId(null);
  }

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem('huskdesk-theme', next);
    } catch { /* Theme still changes this session. */ }
  }

  async function handleCapture() {
    const name = window.prompt('Name this workspace:', 'My workspace');
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) { showNotice('Please enter a workspace name.', 'error'); return; }

    setCapturing(true);
    setNotice('');
    try {
      const workspace = await captureCurrentWindow(trimmed);
      setWorkspaces((prev) => [workspace, ...prev]);
      showNotice(`Saved "${workspace.name}" with ${workspace.tabs.length} tab${workspace.tabs.length === 1 ? '' : 's'}.`, 'success');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Workspace capture failed.', 'error');
    } finally {
      setCapturing(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(`Delete workspace "${name}"?\n\nThis permanently removes the saved record. Your browser tabs are not affected.`);
    if (!confirmed) return;
    try {
      await deleteWorkspace(id);
      setWorkspaces((prev) => prev.filter((ws) => ws.id !== id));
      if (selectedWorkspaceId === id) setSelectedWorkspaceId(null);
      showNotice(`Workspace "${name}" deleted.`, 'success');
    } catch {
      showNotice('Could not delete workspace.', 'error');
    }
  }

  async function handleOpenWorkspace(workspace: Workspace) {
    const validTabs = workspace.tabs.filter((t) => isEligibleUrl(t.url));
    if (validTabs.length === 0) { showNotice('No valid URLs to open.', 'error'); return; }

    const confirmed = window.confirm(
      `Open "${workspace.name}"?\n\nThis will open ${validTabs.length} tab${validTabs.length === 1 ? '' : 's'} in a new window.\nYour existing tabs will not be closed.`,
    );
    if (!confirmed) return;

    try {
      const newWindow = await chrome.windows.create({ url: validTabs[0].url, focused: true });
      if (newWindow && newWindow.id && validTabs.length > 1) {
        await Promise.all(
          validTabs.slice(1).map((tab) =>
            chrome.tabs.create({ windowId: newWindow.id!, url: tab.url, pinned: tab.pinned }),
          ),
        );
      }
      showNotice(`Opened ${validTabs.length} tab${validTabs.length === 1 ? '' : 's'} in a new window.`, 'success');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'Could not open workspace tabs.', 'error');
    }
  }

  async function handleOpenTab(url: string, title: string) {
    if (!isEligibleUrl(url)) { showNotice('This URL cannot be opened.', 'error'); return; }
    try {
      await chrome.tabs.create({ url, active: true });
      showNotice(`Opened "${title}".`, 'success');
    } catch {
      showNotice('Could not open tab.', 'error');
    }
  }

  // Resume Memory handlers
  function startMemoryEdit(ws: Workspace) {
    setMemoryEditId(ws.id);
    setMemoryDraft(ws.note ?? '');
  }

  async function saveMemory() {
    if (!memoryEditId) return;
    setSavingMemory(true);
    try {
      await updateWorkspaceNote(memoryEditId, memoryDraft);
      setWorkspaces((prev) =>
        prev.map((ws) => ws.id === memoryEditId ? { ...ws, note: memoryDraft.trim() || undefined } : ws),
      );
      showNotice('Resume memory saved.', 'success');
      setMemoryEditId(null);
    } catch {
      showNotice('Could not save memory.', 'error');
    } finally {
      setSavingMemory(false);
    }
  }

  // Hibernation handlers
  async function loadHibernateTabs() {
    try {
      const [currentWindow] = await Promise.all([chrome.windows.getCurrent()]);
      const tabs = await chrome.tabs.query({ windowId: currentWindow.id });
      const eligible = tabs.filter((t) => typeof t.url === 'string' && isEligibleUrl(t.url) && !t.pinned);
      setHibernateTabs(eligible);
      // Default: all eligible selected
      setHibernateSelected(new Set(eligible.map((t) => t.id!).filter(Boolean)));
      setHibernateStep('pick');
    } catch {
      showNotice('Could not query open tabs.', 'error');
    }
  }

  function toggleHibernateTab(tabId: number) {
    setHibernateSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId); else next.add(tabId);
      return next;
    });
  }

  async function doHibernate(workspaceName: string) {
    if (hibernateSelected.size === 0) {
      showNotice('No tabs selected.', 'error');
      return;
    }

    setHibernating(true);

    try {
      const selectedTabs = hibernateTabs.filter(
        (tab) => typeof tab.id === 'number' && hibernateSelected.has(tab.id),
      );

      if (selectedTabs.length === 0) {
        throw new Error('No valid tabs are selected. Nothing was closed.');
      }

      // Re-query Chrome immediately before saving to ensure tabs still exist.
      const currentTabs = await chrome.tabs.query({});
      const currentById = new Map(
        currentTabs.filter((tab) => typeof tab.id === 'number').map((tab) => [tab.id!, tab]),
      );

      const tabsToSave = selectedTabs.map((tab) => {
        const current = currentById.get(tab.id!);
        if (
          !current ||
          current.pinned ||
          typeof current.url !== 'string' ||
          !isEligibleUrl(current.url)
        ) {
          throw new Error('A selected tab changed or is no longer eligible. Reload the list and try again. No tabs were closed.');
        }

        return {
          title: current.title?.trim() || current.url,
          url: current.url,
          favIconUrl: current.favIconUrl?.startsWith('http') ? current.favIconUrl : undefined,
          index: current.index,
          pinned: false,
        };
      });

      const currentWindow = await chrome.windows.getCurrent();
      const { saveWorkspace } = await import('../storage/workspaces');
      const workspace = await saveWorkspace(
        workspaceName,
        currentWindow.id ?? 0,
        tabsToSave,
      );

      // Verify the persisted workspace and its exact tab URLs before closing.
      const verified = await getWorkspaces();
      const saved = verified.find((item) => item.id === workspace.id);
      const savedUrls = saved?.tabs.map((tab) => tab.url) ?? [];
      const expectedUrls = tabsToSave.map((tab) => tab.url);

      if (
        !saved ||
        savedUrls.length !== expectedUrls.length ||
        expectedUrls.some((url, index) => savedUrls[index] !== url)
      ) {
        throw new Error('Workspace verification failed. Tabs were not closed.');
      }

      // Workspace is confirmed in storage — update UI now so it is always visible
      // regardless of whether the tab-close step succeeds or fails.
      setWorkspaces((prev) => [workspace, ...prev]);

      // Recheck every selected tab immediately before removal.
      const latestTabs = await chrome.tabs.query({});
      const latestById = new Map(
        latestTabs.filter((tab) => typeof tab.id === 'number').map((tab) => [tab.id!, tab]),
      );

      for (const tab of selectedTabs) {
        const latest = latestById.get(tab.id!);
        const expected = tabsToSave[selectedTabs.indexOf(tab)];

        if (
          !latest ||
          latest.pinned ||
          latest.url !== expected.url ||
          !isEligibleUrl(latest.url ?? '')
        ) {
          showNotice(
            `A selected tab changed before closing. The workspace "${workspaceName}" was saved to your library, but tabs were not closed.`,
            'error',
          );
          setHibernateStep('done');
          return;
        }
      }

      const tabIds = selectedTabs.map((tab) => tab.id!);

      // Attempt to close tabs. chrome.tabs.remove resolves even on partial
      // failures, so we recheck which tabs are actually gone afterwards.
      let removeError: string | null = null;
      try {
        await chrome.tabs.remove(tabIds);
      } catch (err) {
        removeError = err instanceof Error ? err.message : String(err);
      }

      // Re-query to determine the accurate closed count.
      const afterRemove = await chrome.tabs.query({});
      const stillOpenIds = new Set(
        afterRemove.filter((t) => typeof t.id === 'number').map((t) => t.id!),
      );
      const closedCount = tabIds.filter((id) => !stillOpenIds.has(id)).length;
      const attempted = tabIds.length;

      if (closedCount === attempted) {
        showNotice(
          `Hibernated ${closedCount} tab${closedCount === 1 ? '' : 's'} and saved to "${workspaceName}".`,
          'success',
        );
        setHibernateStep('done');
      } else if (closedCount > 0) {
        showNotice(
          `Saved "${workspaceName}" to your library. ${closedCount} of ${attempted} tab${attempted === 1 ? '' : 's'} closed; ${attempted - closedCount} could not be closed (they may have blocked the close or already navigated away).`,
          'error',
        );
        setHibernateStep('done');
      } else {
        const extra = removeError ? ` (${removeError})` : '';
        showNotice(
          `Saved "${workspaceName}" to your library, but no tabs were closed${extra}. You can reopen the workspace from the library at any time.`,
          'error',
        );
        setHibernateStep('done');
      }
    } catch (error) {
      showNotice(
        error instanceof Error
          ? error.message
          : 'Hibernation failed. Check your open tabs and saved workspace.',
        'error',
      );
    } finally {
      setHibernating(false);
    }
  }

  // Stats
  const totalTabs = workspaces.reduce((sum, ws) => sum + ws.tabs.length, 0);
  const selectedWorkspace = workspaces.find((ws) => ws.id === selectedWorkspaceId) ?? null;

  return (
    <div className="app-frame">
      <header className="app-topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">h.</div>
          <div>
            <div className="brand-name">huskdesk</div>
            <div className="brand-tagline">Close the tabs. Keep the context.</div>
          </div>
        </div>
        <div className="heading-actions">
          <span className="accent-label accent-lime">LOCAL-FIRST</span>
          <button
            className="icon-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            title="Toggle theme"
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
          </button>
        </div>
      </header>

      <div className="dashboard-layout">
        <aside className="sidebar" aria-label="Main navigation">
          <div>
            <p className="sidebar-label">Workspace</p>
            <nav className="nav-list" aria-label="Workspace navigation">
              {NAV_ITEMS.filter((i) => i.group === 'WORK').map((item) => (
                <button
                  key={item.label}
                  className={`nav-item${page === item.label ? ' active' : ''}`}
                  onClick={() => navigate(item.label)}
                  aria-current={page === item.label ? 'page' : undefined}
                >
                  <span className="nav-icon" aria-hidden="true"><Icon name={item.icon} size={17} /></span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div>
            <p className="sidebar-label">Preferences</p>
            <nav className="nav-list" aria-label="Preferences navigation">
              {NAV_ITEMS.filter((i) => i.group === 'PREFERENCES').map((item) => (
                <button
                  key={item.label}
                  className={`nav-item${page === item.label ? ' active' : ''}`}
                  onClick={() => navigate(item.label)}
                  aria-current={page === item.label ? 'page' : undefined}
                >
                  <span className="nav-icon" aria-hidden="true"><Icon name={item.icon} size={17} /></span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="sidebar-note">
            <strong><Icon name="shield" size={15} spaceEnd />Your context stays yours.</strong>
            <p>Local-first storage and user-approved actions only. No cloud. No tracking.</p>
          </div>
        </aside>

        <main className="dashboard-main" id="main-content" tabIndex={-1}>

          {/* OVERVIEW PAGE */}
          {page === 'Overview' && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR PERSONAL WORKSPACE</span>
                  <h1 className="display-title" style={{ marginTop: 10 }}>
                    Make room for <span className="accent-word">deep work.</span>
                  </h1>
                  <p>Save the context behind your tabs. Come back when you're ready.</p>
                </div>
                <div className="heading-actions">
                  <button className="btn btn-secondary" onClick={() => navigate('Workspaces')}>Browse library</button>
                  <button className="btn btn-primary" onClick={handleCapture} disabled={capturing} aria-busy={capturing}>
                    {capturing ? 'Saving...' : <><Icon name="plus" size={15} spaceEnd />Capture workspace</>}
                  </button>
                </div>
              </div>

              <div className="dashboard-grid">
                <section className="span-12 feature-card welcome-panel">
                  <span className="accent-label accent-pink">LESS TAB CHAOS. MORE CONTEXT.</span>
                  <h2>Close the tabs.<br />Keep the <span className="accent-word">context.</span></h2>
                  <p>Your projects, references, and next steps deserve more than a crowded browser window.</p>
                  <button className="btn btn-primary" onClick={() => navigate('Workspaces')}>Explore workspaces<Icon name="arrow-right" size={15} spaceStart /></button>
                </section>

                <section className="span-4 surface-card stat-card" aria-label="Saved workspaces count">
                  <div className="stat-top"><span>Saved workspaces</span><span aria-hidden="true"><Icon name="workspaces" size={18} /></span></div>
                  <strong className="stat-number">{loading ? '—' : workspaces.length}</strong>
                  <div className="stat-note">{workspaces.length === 0 ? 'No sessions saved yet' : `${workspaces.length} saved session${workspaces.length === 1 ? '' : 's'}`}</div>
                </section>
                <section className="span-4 surface-card stat-card" aria-label="Tabs preserved count">
                  <div className="stat-top"><span>Tabs preserved</span><span aria-hidden="true"><Icon name="tabs" size={18} /></span></div>
                  <strong className="stat-number">{loading ? '—' : totalTabs}</strong>
                  <div className="stat-note">{totalTabs === 0 ? 'Capture a window to start' : `Across ${workspaces.length} workspace${workspaces.length === 1 ? '' : 's'}`}</div>
                </section>
                <section className="span-4 surface-card stat-card" aria-label="AI status">
                  <div className="stat-top"><span>AI assistance</span><span aria-hidden="true"><Icon name="sparkles" size={18} /></span></div>
                  <strong className="stat-number" style={{ fontSize: 23 }}>Optional</strong>
                  <div className="stat-note">Capture and restore work without AI</div>
                </section>

                <section className="span-7 surface-card section-card">
                  <div className="section-title-row">
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Recently saved</h2>
                    <button className="btn btn-quiet" onClick={() => navigate('Workspaces')}>View library<Icon name="arrow-right" size={15} spaceStart /></button>
                  </div>
                  {loading ? (
                    <div className="empty-state"><p style={{ margin: 0 }}>Loading…</p></div>
                  ) : workspaces.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-symbol" aria-hidden="true"><Icon name="workspaces" size={28} /></div>
                      <strong>No workspaces yet</strong>
                      <p>Capture a browser window to save its tabs and return to your work later.</p>
                      <button className="btn btn-secondary" onClick={handleCapture} disabled={capturing}><Icon name="plus" size={15} spaceEnd />Capture workspace</button>
                    </div>
                  ) : (
                    <ul className="workspace-list" role="list">
                      {workspaces.slice(0, 5).map((ws, i) => (
                        <li key={ws.id} className="workspace-row">
                          <div className="workspace-symbol" aria-hidden="true" style={{ background: WORKSPACE_COLORS[i % WORKSPACE_COLORS.length] }}><Icon name="workspaces" size={18} /></div>
                          <div className="workspace-info">
                            <strong>{ws.name}</strong>
                            <span>{ws.tabs.length} tab{ws.tabs.length === 1 ? '' : 's'} · {formatDate(ws.createdAt)}</span>
                          </div>
                          <button
                            className="btn btn-quiet workspace-action-btn"
                            onClick={() => { setSelectedWorkspaceId(ws.id); navigate('Workspaces'); }}
                            aria-label={`Open workspace ${ws.name}`}
                          ><Icon name="arrow-right" size={16} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="span-5 surface-card section-card">
                  <div className="section-title-row">
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Built around your focus</h2>
                    <span className="accent-label accent-lavender">THE APPROACH</span>
                  </div>
                  <ul className="workspace-list" role="list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li className="workspace-row">
                      <div className="workspace-symbol" aria-hidden="true"><Icon name="workspaces" size={18} /></div>
                      <div className="workspace-info"><strong>Save with context</strong><span>Named snapshots of your work</span></div>
                    </li>
                    <li className="workspace-row">
                      <div className="workspace-symbol" style={{ background: 'var(--pink)' }} aria-hidden="true"><Icon name="hibernation" size={18} /></div>
                      <div className="workspace-info"><strong>Hibernate safely</strong><span>Close confirmed, workspace saved first</span></div>
                    </li>
                    <li className="workspace-row">
                      <div className="workspace-symbol" style={{ background: 'var(--lime)' }} aria-hidden="true"><Icon name="memory" size={18} /></div>
                      <div className="workspace-info"><strong>Resume when ready</strong><span>Open saved tabs on your terms</span></div>
                    </li>
                  </ul>
                </section>

                <section className="span-12 feature-strip">
                  <span className="feature-symbol" aria-hidden="true"><Icon name="shield-check" size={22} /></span>
                  <div>
                    <strong>Private by default. Useful without AI.</strong>
                    <p>Core workspace capture and restoration work without any paid API or remote service. Your browsing metadata stays on your device.</p>
                  </div>
                </section>
              </div>
            </>
          )}

          {/* WORKSPACES LIBRARY PAGE */}
          {page === 'Workspaces' && (
            <>
              {selectedWorkspace ? (
                // WORKSPACE DETAIL VIEW
                <WorkspaceDetail
                  workspace={selectedWorkspace}
                  onBack={() => setSelectedWorkspaceId(null)}
                  onOpen={handleOpenWorkspace}
                  onOpenTab={handleOpenTab}
                  onDelete={handleDelete}
                  onEditMemory={startMemoryEdit}
                />
              ) : (
                // WORKSPACE LIBRARY LIST
                <>
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">HUSKDESK / WORKSPACES</span>
                      <h1 className="display-title" style={{ marginTop: 10 }}>Your workspace <span className="accent-word">library.</span></h1>
                      <p>Saved browsing sessions, organized around the work they belong to.</p>
                    </div>
                    <div className="heading-actions">
                      <button className="btn btn-secondary" onClick={loadWorkspaces} aria-label="Refresh workspace list"><Icon name="refresh" size={15} spaceEnd />Refresh</button>
                      <button className="btn btn-primary" onClick={handleCapture} disabled={capturing} aria-busy={capturing}>
                        {capturing ? 'Saving...' : <><Icon name="plus" size={15} spaceEnd />Capture workspace</>}
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <div className="empty-state surface-card" style={{ padding: 40 }}>
                      <p style={{ margin: 0, color: 'var(--muted)' }}>Loading saved workspaces…</p>
                    </div>
                  ) : workspaces.length === 0 ? (
                    <div className="empty-state feature-card" style={{ padding: 40 }}>
                      <div className="empty-state-symbol" aria-hidden="true"><Icon name="workspaces" size={28} /></div>
                      <strong>Your library is empty</strong>
                      <p>Capture a browser window to save its tabs. You can restore them any time — your existing tabs are never closed automatically.</p>
                      <button className="btn btn-primary" onClick={handleCapture} disabled={capturing}><Icon name="plus" size={15} spaceEnd />Capture your first workspace</button>
                    </div>
                  ) : (
                    <ul className="ws-library-grid" role="list">
                      {workspaces.map((ws, i) => (
                        <li key={ws.id} className="ws-card feature-card">
                          <div className="ws-card-header">
                            <div className="workspace-symbol" style={{ background: WORKSPACE_COLORS[i % WORKSPACE_COLORS.length] }} aria-hidden="true"><Icon name="workspaces" size={18} /></div>
                            <div className="ws-card-meta">
                              <strong className="ws-card-name">{ws.name}</strong>
                              <span className="ws-card-date">{formatDate(ws.createdAt)}</span>
                            </div>
                          </div>
                          <div className="ws-card-tabs-preview">
                            {ws.tabs.slice(0, 3).map((tab) => (
                              <div key={tab.url + tab.index} className="ws-tab-preview-row">
                                {tab.favIconUrl
                                  ? <img src={tab.favIconUrl} alt="" className="ws-tab-favicon" width={14} height={14} aria-hidden="true" />
                                  : <span className="ws-tab-favicon-placeholder" aria-hidden="true"><Icon name="globe" size={14} /></span>
                                }
                                <span className="ws-tab-title">{tab.title}</span>
                              </div>
                            ))}
                            {ws.tabs.length > 3 && (
                              <div className="ws-tab-preview-more">+ {ws.tabs.length - 3} more tab{ws.tabs.length - 3 === 1 ? '' : 's'}</div>
                            )}
                          </div>
                          <div className="ws-card-count">
                            <span className="accent-label accent-lavender">{ws.tabs.length} TAB{ws.tabs.length === 1 ? '' : 'S'}</span>
                            {ws.note && <span className="ws-card-memory-badge" title="Has resume memory"><Icon name="memory" size={12} spaceEnd />memory</span>}
                          </div>
                          <div className="ws-card-actions">
                            <button
                              className="btn btn-primary ws-card-btn"
                              onClick={() => handleOpenWorkspace(ws)}
                              aria-label={`Open workspace ${ws.name} in new window`}
                            >
                              Open workspace<Icon name="external" size={15} spaceStart />
                            </button>
                            <button
                              className="btn btn-secondary ws-card-btn"
                              onClick={() => setSelectedWorkspaceId(ws.id)}
                              aria-label={`View details for ${ws.name}`}
                            >
                              Details
                            </button>
                            <button
                              className="btn btn-danger ws-card-btn"
                              onClick={() => handleDelete(ws.id, ws.name)}
                              aria-label={`Delete workspace ${ws.name}`}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </>
          )}

          {/* TAB ORGANIZER PAGE */}
          {page === 'Tab Organizer' && (
            <TabOrganizerPage workspaces={workspaces} onOpenTab={handleOpenTab} />
          )}

          {/* RESUME MEMORY PAGE */}
          {page === 'Resume Memory' && (
            <ResumeMemoryPage
              workspaces={workspaces}
              memoryEditId={memoryEditId}
              memoryDraft={memoryDraft}
              savingMemory={savingMemory}
              onEditMemory={startMemoryEdit}
              onDraftChange={setMemoryDraft}
              onSaveMemory={saveMemory}
              onCancelMemory={() => setMemoryEditId(null)}
              onDeleteMemory={async (id) => {
                await updateWorkspaceNote(id, '');
                setWorkspaces((prev) => prev.map((ws) => ws.id === id ? { ...ws, note: undefined } : ws));
                showNotice('Memory deleted.', 'success');
              }}
            />
          )}

          {/* HIBERNATION PAGE */}
          {page === 'Hibernation' && (
            <HibernationPage
              hibernateTabs={hibernateTabs}
              hibernateSelected={hibernateSelected}
              hibernating={hibernating}
              hibernateStep={hibernateStep}
              onLoadTabs={loadHibernateTabs}
              onToggleTab={toggleHibernateTab}
              onHibernate={doHibernate}
              onReset={() => {
                setHibernateStep('pick');
                setHibernateTabs([]);
                setHibernateSelected(new Set());
              }}
            />
          )}

          {/* SETTINGS PAGE */}
          {page === 'Settings' && (
            <SettingsPage theme={theme} onToggleTheme={toggleTheme} workspacesCount={workspaces.length} totalTabs={totalTabs} />
          )}

          {notice && (
            <div
              role="status"
              aria-live="polite"
              className={`dashboard-notice dashboard-notice--${noticeType}`}
            >
              <Icon name={noticeType === 'success' ? 'check' : noticeType === 'error' ? 'x' : 'info'} size={15} spaceEnd />{notice}
            </div>
          )}

          <footer className="dashboard-footer muted">
            HUSKDESK · LOCAL-FIRST BY DESIGN · v0.1.0
          </footer>
        </main>
      </div>
    </div>
  );
}

// ─── Workspace Detail sub-component ────────────────────────────────────────

function WorkspaceDetail({
  workspace,
  onBack,
  onOpen,
  onOpenTab,
  onDelete,
  onEditMemory,
}: {
  workspace: Workspace;
  onBack: () => void;
  onOpen: (ws: Workspace) => void;
  onOpenTab: (url: string, title: string) => void;
  onDelete: (id: string, name: string) => void;
  onEditMemory: (ws: Workspace) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">HUSKDESK / WORKSPACES / DETAIL</span>
          <h1 className="display-title" style={{ marginTop: 10 }}>{workspace.name}</h1>
          <p>Saved {new Date(workspace.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {workspace.tabs.length} tab{workspace.tabs.length === 1 ? '' : 's'}</p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-secondary" onClick={onBack}><Icon name="arrow-left" size={15} spaceEnd />Library</button>
          <button className="btn btn-primary" onClick={() => onOpen(workspace)}>Open workspace<Icon name="external" size={15} spaceStart /></button>
        </div>
      </div>

      {workspace.note && (
        <section className="surface-card section-card" style={{ marginBottom: 18 }}>
          <div className="section-title-row">
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}><Icon name="memory" size={16} spaceEnd />Resume memory</h2>
            <button className="btn btn-quiet" onClick={() => onEditMemory(workspace)}>Edit memory</button>
          </div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text-secondary)' }}>{workspace.note}</p>
        </section>
      )}

      {!workspace.note && (
        <section className="surface-card section-card" style={{ marginBottom: 18, borderStyle: 'dashed' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>No resume memory yet. Add context to help yourself pick up where you left off.</p>
            <button className="btn btn-quiet" onClick={() => onEditMemory(workspace)}><Icon name="plus" size={14} spaceEnd />Add memory</button>
          </div>
        </section>
      )}

      <section className="surface-card section-card">
        <div className="section-title-row">
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Saved tabs</h2>
          <span className="accent-label accent-lavender">{workspace.tabs.length} TOTAL</span>
        </div>
        <ul className="workspace-list" role="list">
          {workspace.tabs.map((tab, i) => (
            <li key={tab.url + i} className="workspace-row">
              {tab.favIconUrl
                ? <img src={tab.favIconUrl} alt="" className="ws-tab-favicon-lg" width={20} height={20} aria-hidden="true" />
                : <div className="workspace-symbol" style={{ fontSize: 12, background: 'var(--bg-secondary)' }} aria-hidden="true"><Icon name="globe" size={16} /></div>
              }
              <div className="workspace-info">
                <strong title={tab.title}>{tab.title}</strong>
                <span title={tab.url}>{tab.url}</span>
              </div>
              {tab.pinned && <span className="accent-label" style={{ background: 'var(--lime)', fontSize: 9 }}>PINNED</span>}
              <button
                className="btn btn-quiet workspace-action-btn"
                onClick={() => onOpenTab(tab.url, tab.title)}
                aria-label={`Open tab: ${tab.title}`}
                title="Open this tab"
              ><Icon name="external" size={15} /></button>
            </li>
          ))}
        </ul>
      </section>

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-danger"
          onClick={() => onDelete(workspace.id, workspace.name)}
          aria-label={`Delete workspace ${workspace.name}`}
        >
          Delete workspace
        </button>
      </div>
    </>
  );
}

// ─── Tab Organizer sub-component ────────────────────────────────────────────

function TabOrganizerPage({
  workspaces,
  onOpenTab,
}: {
  workspaces: Workspace[];
  onOpenTab: (url: string, title: string) => void;
}) {
  const [groups, setGroups] = useState<{ label: string; tabs: { url: string; title: string; ws: string }[] }[]>([]);
  const [generated, setGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiNotice, setAiNotice] = useState<{ kind: 'ai' | 'fallback'; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  async function generateGroups() {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const domainMap = new Map<
        string,
        { url: string; title: string; ws: string; domain: string }[]
      >();

      for (const ws of workspaces) {
        for (const tab of ws.tabs) {
          try {
            const parsedUrl = new URL(tab.url);
            if (!["http:", "https:"].includes(parsedUrl.protocol)) continue;

            const domain = parsedUrl.hostname.replace(/^www\./, "");
            if (!domainMap.has(domain)) domainMap.set(domain, []);

            domainMap.get(domain)!.push({
              url: tab.url,
              title: tab.title,
              ws: ws.name,
              domain,
            });
          } catch {
            // Skip malformed URLs.
          }
        }
      }

      const allTabs = Array.from(domainMap.values()).flat();

      const groupingTabs = allTabs.map((tab, id) => ({
        id,
        title: tab.title,
      }));

      const aiTabs = allTabs.map((tab, id) => ({
        id,
        title: tab.title,
        domain: tab.domain,
      }));

      // Use each tab's actual array index, never findIndex().
      const fallbackGroups = Array.from(domainMap.keys()).map((domain) => ({
        name: domain,
        ids: allTabs.reduce<number[]>((ids, tab, id) => {
          if (tab.domain === domain) ids.push(id);
          return ids;
        }, []),
      }));

      if (allTabs.length === 0) {
        setErrorMessage('No saved tabs with web (http/https) URLs to group.');
        return;
      }

      const aiResult = await suggestLocalGroups(aiTabs);

      console.log("[Huskdesk] AI result:", aiResult);
      console.log("[Huskdesk] Input tab count:", aiTabs.length);

      const safeGroups = resolveGrouping(
        groupingTabs,
        aiResult.groups,
        fallbackGroups,
      );

      // resolveGrouping returns the AI array itself only when it validated.
      if (aiResult.groups !== null && safeGroups === aiResult.groups) {
        setAiNotice({ kind: 'ai', message: 'Grouped with local AI (Ollama). Review the groups before relying on them.' });
      } else {
        const reason = aiResult.reason ?? 'invalid-output';
        setAiNotice({
          kind: 'fallback',
          message: `${describeAiFailure(reason)} Showing domain-based groups instead.`,
        });
      }

      const result = safeGroups.map((group) => ({
        label: group.name,
        tabs: group.ids
          .map((id) => allTabs[id])
          .filter((tab) => tab !== undefined)
          .map(({ url, title, ws }) => ({ url, title, ws })),
      }));

      setGroups(result);
      setGenerated(true);
    } catch (error) {
      console.error("[Huskdesk] Group generation failed:", error);
      setErrorMessage('Could not generate groups. Your saved workspaces are unchanged.');
    } finally {
      setIsGenerating(false);
    }
  }



  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">HUSKDESK / TAB ORGANIZER</span>
          <h1 className="display-title" style={{ marginTop: 10 }}>Organize your <span className="accent-word">saved tabs.</span></h1>
          <p>Group tabs from saved workspaces by topic using local AI, with a domain-based fallback. Review suggestions before taking any action.</p>
        </div>
      </div>

      {workspaces.length === 0 ? (
        <div className="empty-state feature-card" style={{ padding: 40 }}>
          <div className="empty-state-symbol" aria-hidden="true"><Icon name="tabs" size={28} /></div>
          <strong>No saved workspaces yet</strong>
          <p>Capture a workspace first. Tab groups are built from saved workspace metadata — your live browser tabs are not modified.</p>
        </div>
      ) : !generated ? (
        <section className="feature-card welcome-panel" style={{ padding: 32 }}>
          <span className="accent-label accent-lavender">LOCAL AI GROUPING</span>
          <h2>Group tabs by topic</h2>
          <p>Huskdesk asks a model running on your computer (Ollama) to group your saved tabs by topic. Nothing leaves your device. If Ollama isn't available, tabs are grouped by website domain instead. This is a read-only suggestion — no tabs will be moved or modified.</p>
          {errorMessage && <div className="dashboard-notice dashboard-notice--error" role="alert" style={{ marginBottom: 16 }}>{errorMessage}</div>}
          <button
            className="btn btn-primary"
            onClick={generateGroups}
            disabled={isGenerating}
          >
            {isGenerating
              ? "Analyzing saved tabs with local AI..."
              : "Generate groups from saved workspaces"}
          </button>
        </section>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Showing {groups.length} suggested group{groups.length === 1 ? '' : 's'} from {workspaces.length} saved workspace{workspaces.length === 1 ? '' : 's'}.
              These are suggestions only — no browser tabs are modified.
            </p>
            <button className="btn btn-quiet" onClick={() => { setGenerated(false); setGroups([]); setAiNotice(null); setErrorMessage(null); }}>Reset</button>
          </div>
          {aiNotice && (
            <div className={`dashboard-notice dashboard-notice--${aiNotice.kind === 'ai' ? 'info' : 'error'}`} role="status" style={{ marginBottom: 16 }}>
              {aiNotice.message}
            </div>
          )}
          <ul className="ws-library-grid" role="list">
            {groups.map((group, groupIndex) => (
              <li key={`${group.label}-${groupIndex}`} className="ws-card surface-card">
                <div className="ws-card-header">
                  <div className="workspace-symbol" style={{ background: 'var(--bg-secondary)', fontSize: 12 }} aria-hidden="true"><Icon name="tabs" size={16} /></div>
                  <div className="ws-card-meta">
                    <strong className="ws-card-name">{group.label}</strong>
                    <span className="ws-card-date">{group.tabs.length} saved tab{group.tabs.length === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {group.tabs.slice(0, 4).map((tab, i) => (
                    <li key={tab.url + i} className="ws-tab-preview-row" style={{ paddingBlock: 4 }}>
                      <span className="ws-tab-favicon-placeholder" aria-hidden="true"><Icon name="globe" size={14} /></span>
                      <span className="ws-tab-title" style={{ flex: 1 }}>{tab.title}</span>
                      <button className="btn btn-quiet" style={{ padding: '2px 6px', minHeight: 28, fontSize: 11 }} onClick={() => onOpenTab(tab.url, tab.title)} aria-label={`Open ${tab.title}`}><Icon name="external" size={15} /></button>
                    </li>
                  ))}
                  {group.tabs.length > 4 && <li className="ws-tab-preview-more">+ {group.tabs.length - 4} more</li>}
                </ul>
              </li>
            ))}
          </ul>
          <div className="surface-card" style={{ marginTop: 16, padding: 16 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Note:</strong> These are read-only suggestions based on saved workspace metadata (titles and domains). No live browser tabs are moved or modified, and AI processing stays on your device.
            </p>
          </div>
        </>
      )}
    </>
  );
}

// ─── Resume Memory sub-component ─────────────────────────────────────────────

function ResumeMemoryPage({
  workspaces,
  memoryEditId,
  memoryDraft,
  savingMemory,
  onEditMemory,
  onDraftChange,
  onSaveMemory,
  onCancelMemory,
  onDeleteMemory,
}: {
  workspaces: Workspace[];
  memoryEditId: string | null;
  memoryDraft: string;
  savingMemory: boolean;
  onEditMemory: (ws: Workspace) => void;
  onDraftChange: (v: string) => void;
  onSaveMemory: () => void;
  onCancelMemory: () => void;
  onDeleteMemory: (id: string) => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">HUSKDESK / RESUME MEMORY</span>
          <h1 className="display-title" style={{ marginTop: 10 }}>Remember <span className="accent-word">where you were.</span></h1>
          <p>Add a note to any saved workspace to help yourself pick up exactly where you left off.</p>
        </div>
      </div>

      <section className="surface-card section-card" style={{ marginBottom: 18 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>What is Resume Memory?</strong><br />
          Resume Memory is a free-form note you write for each workspace — what you were doing, what to do next, relevant links, or any context that helps you re-orient. It is stored alongside the workspace on your device. It is never sent to any server or AI service without your action.
        </p>
      </section>

      {memoryEditId && (
        <section className="feature-card" style={{ padding: 24, marginBottom: 18 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16 }}>
            Editing memory for: <em>{workspaces.find((ws) => ws.id === memoryEditId)?.name ?? 'workspace'}</em>
          </h2>
          <label htmlFor="memory-textarea" className="muted" style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
            Write anything that helps you pick up where you left off:
          </label>
          <textarea
            id="memory-textarea"
            className="memory-textarea"
            value={memoryDraft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="e.g. Reviewing accessibility audit results. Next step: update dashboard ARIA labels. Reference: axe DevTools report in Tab 3."
            rows={6}
            disabled={savingMemory}
            aria-describedby="memory-help"
          />
          <p id="memory-help" style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 14px' }}>
            Use only information you have. Do not fabricate context. This note is for you only.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={onSaveMemory} disabled={savingMemory}>
              {savingMemory ? 'Saving…' : 'Save memory'}
            </button>
            <button className="btn btn-secondary" onClick={onCancelMemory} disabled={savingMemory}>Cancel</button>
          </div>
        </section>
      )}

      {workspaces.length === 0 ? (
        <div className="empty-state feature-card" style={{ padding: 40 }}>
          <div className="empty-state-symbol" aria-hidden="true"><Icon name="memory" size={28} /></div>
          <strong>No workspaces yet</strong>
          <p>Capture a workspace first to start adding resume memory.</p>
        </div>
      ) : (
        <ul className="workspace-list" role="list">
          {workspaces.map((ws) => (
            <li key={ws.id} className="workspace-row surface-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: ws.note ? 10 : 0 }}>
                <div className="workspace-symbol" aria-hidden="true"><Icon name="memory" size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ display: 'block' }}>{ws.name}</strong>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{ws.tabs.length} tab{ws.tabs.length === 1 ? '' : 's'} · {new Date(ws.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-quiet"
                    onClick={() => onEditMemory(ws)}
                    aria-label={ws.note ? `Edit memory for ${ws.name}` : `Add memory for ${ws.name}`}
                  >
                    {ws.note ? 'Edit' : <><Icon name="plus" size={14} spaceEnd />Add memory</>}
                  </button>
                  {ws.note && (
                    <button
                      className="btn btn-quiet btn-danger-quiet"
                      onClick={() => {
                        if (window.confirm(`Delete memory for "${ws.name}"?`)) onDeleteMemory(ws.id);
                      }}
                      aria-label={`Delete memory for ${ws.name}`}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              {ws.note && (
                <div className="memory-note-preview">
                  <p style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{ws.note}</p>
                </div>
              )}
              {!ws.note && <p className="muted" style={{ margin: 0, fontSize: 11 }}>No memory yet.</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ─── Hibernation sub-component ────────────────────────────────────────────────

function HibernationPage({
  hibernateTabs,
  hibernateSelected,
  hibernating,
  hibernateStep,
  onLoadTabs,
  onToggleTab,
  onHibernate,
  onReset,
}: {
  hibernateTabs: chrome.tabs.Tab[];
  hibernateSelected: Set<number>;
  hibernating: boolean;
  hibernateStep: 'pick' | 'confirm' | 'done';
  onLoadTabs: () => void;
  onToggleTab: (id: number) => void;
  onHibernate: (name: string) => void;
  onReset: () => void;
}) {
  const [workspaceName, setWorkspaceName] = useState('Hibernated workspace');

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">HUSKDESK / HIBERNATION</span>
          <h1 className="display-title" style={{ marginTop: 10 }}>Hibernate <span className="accent-word">your tabs.</span></h1>
          <p>Select tabs to save and close. Your workspace is verified before any tabs are closed.</p>
        </div>
      </div>

      <section className="surface-card section-card" style={{ marginBottom: 18 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>How hibernation works:</strong><br />
          1. Choose which tabs to save.<br />
          2. Name the workspace.<br />
          3. Huskdesk saves and verifies the workspace.<br />
          4. Only after verification succeeds will the selected tabs be closed.<br />
          Pinned tabs and internal Chrome pages are never included. If saving fails, no tabs are closed.
        </p>
      </section>

      {hibernateStep === 'done' ? (
        <div className="feature-card" style={{ padding: 32, textAlign: 'center' }}>
          <div className="empty-state-symbol" style={{ background: 'var(--lime)' }} aria-hidden="true"><Icon name="check" size={28} /></div>
          <strong style={{ display: 'block', marginBottom: 8 }}>Hibernation complete</strong>
          <p style={{ color: 'var(--muted)', marginBottom: 16 }}>Your tabs were saved and closed. Open the Workspaces library to restore them.</p>
          <button className="btn btn-primary" onClick={onReset}>Hibernate more tabs</button>
        </div>
      ) : hibernateTabs.length === 0 ? (
        <div style={{ textAlign: 'center' }}>
          <button className="btn btn-primary" onClick={onLoadTabs}>Load tabs from this window</button>
        </div>
      ) : (
        <>
          <section className="surface-card section-card" style={{ marginBottom: 16 }}>
            <div className="section-title-row">
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Select tabs to hibernate</h2>
              <span className="muted" style={{ fontSize: 11 }}>{hibernateSelected.size} of {hibernateTabs.length} selected</span>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--muted)' }}>Pinned tabs are not shown. Each selected tab will be saved, then closed after verification.</p>
            <ul className="workspace-list" role="list">
              {hibernateTabs.map((tab) => {
                const id = tab.id ?? 0;
                const checked = hibernateSelected.has(id);
                return (
                  <li key={id} className="workspace-row" style={{ cursor: 'pointer' }} onClick={() => onToggleTab(id)}>
                    <input
                      type="checkbox"
                      id={`htab-${id}`}
                      checked={checked}
                      onChange={() => onToggleTab(id)}
                      onClick={(e) => e.stopPropagation()}
                      className="hibernate-checkbox"
                      aria-label={`Select tab: ${tab.title}`}
                    />
                    <div className="workspace-info" style={{ marginLeft: 4 }}>
                      <strong>{tab.title || tab.url}</strong>
                      <span>{tab.url}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="surface-card section-card" style={{ marginBottom: 16 }}>
            <label htmlFor="hibernate-ws-name" style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              Workspace name
            </label>
            <input
              id="hibernate-ws-name"
              className="text-input"
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              maxLength={100}
              placeholder="Hibernated workspace"
              disabled={hibernating}
            />
          </section>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-primary"
              disabled={hibernateSelected.size === 0 || !workspaceName.trim() || hibernating}
              onClick={() => {
                if (window.confirm(
                  `Hibernate ${hibernateSelected.size} tab${hibernateSelected.size === 1 ? '' : 's'}?\n\nHuskdesk will:\n1. Save them as "${workspaceName.trim()}"\n2. Verify the save succeeded\n3. Close the selected tabs\n\nThis cannot be undone, but the workspace will remain in your library.`
                )) {
                  onHibernate(workspaceName.trim());
                }
              }}
              aria-busy={hibernating}
            >
              {hibernating ? 'Saving and closing tabs…' : `Hibernate ${hibernateSelected.size} tab${hibernateSelected.size === 1 ? '' : 's'}`}
            </button>
            <button className="btn btn-secondary" onClick={onReset} disabled={hibernating}>Cancel</button>
          </div>
        </>
      )}
    </>
  );
}

// ─── Settings sub-component ──────────────────────────────────────────────────

function SettingsPage({
  theme,
  onToggleTheme,
  workspacesCount,
  totalTabs,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  workspacesCount: number;
  totalTabs: number;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">HUSKDESK / SETTINGS</span>
          <h1 className="display-title" style={{ marginTop: 10 }}>Settings & <span className="accent-word">privacy.</span></h1>
          <p>Control your Huskdesk experience. All data stays on this device.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <section className="surface-card section-card">
          <div className="section-title-row">
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Appearance</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <strong style={{ display: 'block', fontSize: 13 }}>Color theme</strong>
              <span className="muted" style={{ fontSize: 12 }}>Currently: {theme === 'light' ? 'Light' : 'Dark'}</span>
            </div>
            <button className="btn btn-secondary" onClick={onToggleTheme}>
              <>
                <Icon name={theme === 'light' ? 'moon' : 'sun'} size={15} spaceEnd />
                {theme === 'light' ? 'Switch to dark' : 'Switch to light'}
              </>
            </button>
          </div>
        </section>

        <section className="surface-card section-card">
          <div className="section-title-row">
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Storage summary</h2>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Saved workspaces</span>
              <strong>{workspacesCount}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Total saved tabs</span>
              <strong>{totalTabs}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Storage location</span>
              <strong>chrome.storage.local (on-device)</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span>Cloud sync</span>
              <strong>Disabled</strong>
            </li>
          </ul>
        </section>

        <section className="surface-card section-card">
          <div className="section-title-row">
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Privacy</h2>
            <span className="accent-label accent-lime">LOCAL-FIRST</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8, fontSize: 13, lineHeight: 1.6 }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><Icon name="check" size={15} style={{ marginTop: 5 }} /><span>All workspace data stored on-device only</span></li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><Icon name="check" size={15} style={{ marginTop: 5 }} /><span>No analytics, telemetry, or crash reporting</span></li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><Icon name="check" size={15} style={{ marginTop: 5 }} /><span>No account or login required</span></li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><Icon name="check" size={15} style={{ marginTop: 5 }} /><span>No page content, screenshots, or cookies captured</span></li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><Icon name="check" size={15} style={{ marginTop: 5 }} /><span>No remote AI services used (AI features are optional and local)</span></li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><Icon name="check" size={15} style={{ marginTop: 5 }} /><span>Only URLs, titles, and favicon URLs from eligible tabs are saved</span></li>
          </ul>
        </section>

        <section className="surface-card section-card">
          <div className="section-title-row">
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Chrome permissions</h2>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8, fontSize: 13 }}>
            <li><strong>tabs</strong> — Read tab URLs, titles, and favicon URLs to save workspaces</li>
            <li><strong>storage</strong> — Store workspace data locally on your device</li>
            <li><strong>windows</strong> — Identify the current browser window for capture</li>
          </ul>
          <p className="muted" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
            These are the minimum permissions needed. Huskdesk does not request access to page content, history, cookies, or your clipboard.
          </p>
        </section>

        <section className="surface-card section-card">
          <div className="section-title-row">
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>About</h2>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            Huskdesk v0.1.0 · Early build<br />
            Close the tabs. Keep the context.<br />
            A local-first Chrome extension for saving browsing workspaces and resuming unfinished work.
          </p>
        </section>
      </div>
    </>
  );
}