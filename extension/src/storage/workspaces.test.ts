import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteWorkspace,
  getWorkspaces,
  saveWorkspace,
  updateWorkspaceNote,
  type SavedTab,
} from './workspaces';

const STORAGE_KEY = 'huskdesk-workspaces';

const mockStore: Record<string, unknown> = {};

const mockChrome = {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({
        [key]: mockStore[key],
      })),
      set: vi.fn(async (value: Record<string, unknown>) => {
        Object.assign(mockStore, value);
      }),
    },
  },
};

vi.stubGlobal('chrome', mockChrome);

const sampleTab: SavedTab = {
  title: 'Huskdesk Documentation',
  url: 'https://example.com/docs',
  favIconUrl: 'https://example.com/favicon.ico',
  index: 0,
  pinned: false,
};

const sampleWorkspace = {
  id: 'workspace-1',
  name: 'Research',
  createdAt: '2026-10-21T10:00:00.000Z',
  windowId: 1,
  tabs: [sampleTab],
};

describe('workspace storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockStore)) {
      delete mockStore[key];
    }
  });

  it('returns an empty array when storage is empty', async () => {
    await expect(getWorkspaces()).resolves.toEqual([]);
  });

  it('returns an empty array when stored data is not an array', async () => {
    mockStore[STORAGE_KEY] = { unexpected: true };

    await expect(getWorkspaces()).resolves.toEqual([]);
  });

  it('loads valid workspaces and discards malformed entries', async () => {
    mockStore[STORAGE_KEY] = [
      sampleWorkspace,
      null,
      { id: '', name: 'Invalid', createdAt: 'today', tabs: [] },
    ];

    const result = await getWorkspaces();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'workspace-1',
      name: 'Research',
      tabs: [sampleTab],
    });
  });

  it('filters malformed tabs from otherwise valid workspaces', async () => {
    mockStore[STORAGE_KEY] = [
      {
        ...sampleWorkspace,
        tabs: [sampleTab, null, { url: '', title: 'Invalid' }],
      },
    ];

    const result = await getWorkspaces();

    expect(result[0]?.tabs).toEqual([sampleTab]);
  });

  it('saves a trimmed workspace name and prepends the new workspace', async () => {
    mockStore[STORAGE_KEY] = [sampleWorkspace];

    const saved = await saveWorkspace('  New workspace  ', 2, [sampleTab]);

    expect(saved.name).toBe('New workspace');
    expect(saved.windowId).toBe(2);
    expect(saved.tabs).toEqual([sampleTab]);
    expect(saved.id).toBeTruthy();
    expect(Number.isNaN(Date.parse(saved.createdAt))).toBe(false);

    expect(mockStore[STORAGE_KEY]).toEqual([
      saved,
      sampleWorkspace,
    ]);
  });

  it('deletes a workspace by ID', async () => {
    mockStore[STORAGE_KEY] = [
      sampleWorkspace,
      { ...sampleWorkspace, id: 'workspace-2', name: 'Other' },
    ];

    await deleteWorkspace('workspace-1');

    expect(mockStore[STORAGE_KEY]).toEqual([
      { ...sampleWorkspace, id: 'workspace-2', name: 'Other' },
    ]);
  });

  it('keeps the list unchanged when deleting an unknown ID', async () => {
    mockStore[STORAGE_KEY] = [sampleWorkspace];

    await deleteWorkspace('does-not-exist');

    expect(mockStore[STORAGE_KEY]).toEqual([sampleWorkspace]);
  });

  it('trims a workspace note when updating it', async () => {
    mockStore[STORAGE_KEY] = [sampleWorkspace];

    await updateWorkspaceNote('workspace-1', '  Continue research tomorrow  ');

    expect(mockStore[STORAGE_KEY]).toEqual([
      { ...sampleWorkspace, note: 'Continue research tomorrow' },
    ]);
  });

  it('clears a workspace note when given an empty string', async () => {
    mockStore[STORAGE_KEY] = [
      { ...sampleWorkspace, note: 'Old note' },
    ];

    await updateWorkspaceNote('workspace-1', '   ');

    expect(mockStore[STORAGE_KEY]).toEqual([
      { ...sampleWorkspace, note: undefined },
    ]);
  });
});
