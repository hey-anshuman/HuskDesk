// Huskdesk service worker — minimal background script.
// All tab capture and workspace operations happen in the popup/dashboard UI context.
// The background worker currently handles: installation logging only.
// Future: could handle tab events for automatic workspace suggestions (opt-in).

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.info('[Huskdesk] Extension installed. Version:', chrome.runtime.getManifest().version);
  } else if (details.reason === 'update') {
    console.info('[Huskdesk] Extension updated to', chrome.runtime.getManifest().version);
  }
});
