import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captureCurrentWindow, isEligibleUrl } from './capture';

const STORAGE_KEY = 'huskdesk-workspaces';
const mockStore: Record<string, unknown> = {};

let browserTabs: Array<Record<string, unknown>> = [];

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
  windows: {
    getCurrent: vi.fn<() => Promise<{ id?: number }>>(async () => ({ id: 10 })),
  },
  tabs: {
    query: vi.fn(async () => browserTabs),
  },
};

vi.stubGlobal('chrome', mockChrome);

describe('tab capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    for (const key of Object.keys(mockStore)) {
      delete mockStore[key];
    }

    browserTabs = [
      {
        title: 'Second tab',
        url: 'https://example.com/second',
        favIconUrl: 'https://example.com/favicon.ico',
        index: 2,
        pinned: false,
      },
      {
        title: 'Chrome settings',
        url: 'chrome://settings',
        index: 0,
        pinned: false,
      },
      {
        title: 'First tab',
        url: 'http://example.org',
        index: 1,
        pinned: true,
      },
      {
        title: 'Extension page',
        url: 'chrome-extension://abc/page.html',
        index: 3,
        pinned: false,
      },
    ];

    mockChrome.windows.getCurrent.mockResolvedValue({ id: 10 });
    mockChrome.tabs.query.mockImplementation(async () => browserTabs);
  });

  it('allows HTTP and HTTPS URLs only', () => {
    expect(isEligibleUrl('https://example.com')).toBe(true);
    expect(isEligibleUrl('http://example.com')).toBe(true);
    expect(isEligibleUrl('chrome://settings')).toBe(false);
    expect(isEligibleUrl('chrome-extension://abc/page.html')).toBe(false);
    expect(isEligibleUrl('file:///document.pdf')).toBe(false);
    expect(isEligibleUrl('javascript:alert(1)')).toBe(false);
  });

  it('captures eligible tabs in index order and excludes internal pages', async () => {
    const workspace = await captureCurrentWindow('Research');

    expect(workspace.name).toBe('Research');
    expect(workspace.windowId).toBe(10);
    expect(workspace.tabs.map((tab) => tab.title)).toEqual([
      'First tab',
      'Second tab',
    ]);
    expect(workspace.tabs[0]?.pinned).toBe(true);
    expect(workspace.tabs[1]?.favIconUrl).toBe(
      'https://example.com/favicon.ico',
    );
    expect(
      workspace.tabs.some((tab) => tab.url.startsWith('chrome://')),
    ).toBe(false);

    expect(mockStore[STORAGE_KEY]).toEqual([workspace]);
  });

  it('does not save non-HTTP favicon URLs', async () => {
    browserTabs = [
      {
        title: 'Example',
        url: 'https://example.com',
        favIconUrl: 'javascript:alert(1)',
        index: 0,
        pinned: false,
      },
    ];

    const workspace = await captureCurrentWindow('Favicon test');

    expect(workspace.tabs[0]?.favIconUrl).toBeUndefined();
  });

  it('throws when the current window cannot be identified', async () => {
    mockChrome.windows.getCurrent.mockResolvedValue({});

    await expect(captureCurrentWindow('Research')).rejects.toThrow(
      'Could not identify the current browser window.',
    );
  });

  it('reports an error when accessing the current window fails', async () => {
    mockChrome.windows.getCurrent.mockRejectedValueOnce(
      new Error('Permission denied'),
    );

    await expect(captureCurrentWindow('Research')).rejects.toThrow(
      'Could not access the current browser window.',
    );
  });

  it('reports an error when querying browser tabs fails', async () => {
    mockChrome.tabs.query.mockRejectedValueOnce(
      new Error('Permission denied'),
    );

    await expect(captureCurrentWindow('Research')).rejects.toThrow(
      'Could not query tabs.',
    );
  });

  it('does not save a workspace when no eligible tabs exist', async () => {
    browserTabs = [
      {
        title: 'Chrome settings',
        url: 'chrome://settings',
        index: 0,
        pinned: false,
      },
    ];

    await expect(captureCurrentWindow('Research')).rejects.toThrow(
      'No eligible web tabs were found',
    );

    expect(mockStore[STORAGE_KEY]).toBeUndefined();
  });
});

