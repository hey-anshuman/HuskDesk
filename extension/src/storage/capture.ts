// Workspace capture — collects eligible tabs from the current browser window.
// Only http:// and https:// tabs are captured. Chrome-internal pages are excluded.
// Requires "tabs" and "windows" permissions in the manifest.

import { saveWorkspace, type SavedTab, type Workspace } from './workspaces';

/** Returns true for URLs that are safe to capture and open later. */
export function isEligibleUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://');
}

/** Capture all eligible tabs from the current browser window and persist them. */
export async function captureCurrentWindow(name: string): Promise<Workspace> {
  let currentWindow: chrome.windows.Window;
  try {
    currentWindow = await chrome.windows.getCurrent({ populate: false });
  } catch {
    throw new Error('Could not access the current browser window. Check the "windows" permission.');
  }

  if (currentWindow.id === undefined) {
    throw new Error('Could not identify the current browser window.');
  }

  let browserTabs: chrome.tabs.Tab[];
  try {
    browserTabs = await chrome.tabs.query({ windowId: currentWindow.id });
  } catch {
    throw new Error('Could not query tabs. Check the "tabs" permission.');
  }

  const tabs: SavedTab[] = browserTabs
    .filter((tab) => typeof tab.url === 'string' && isEligibleUrl(tab.url))
    .sort((a, b) => a.index - b.index)
    .map((tab) => ({
      title: (tab.title?.trim() || tab.url || 'Untitled tab'),
      url: tab.url!,
      ...(tab.favIconUrl && tab.favIconUrl.startsWith('http')
        ? { favIconUrl: tab.favIconUrl }
        : {}),
      index: tab.index,
      pinned: tab.pinned ?? false,
    }));

  if (tabs.length === 0) {
    throw new Error('No eligible web tabs were found in this window. Internal Chrome pages are not captured.');
  }

  return saveWorkspace(name, currentWindow.id, tabs);
}
