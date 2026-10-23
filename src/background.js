// Service worker: keeps the toolbar badge in sync with the active tab and owns
// the periodic dataset refresh.

import { hostnameFromUrl } from './domain.js';
import { lookup, refreshRemote, getDatasetInfo, invalidateCache } from './data.js';

const REFRESH_ALARM = 'refresh-dataset';

const BADGE = {
  yes: { text: 'YES', color: '#C0392B', title: (v) => `PE-owned: ${describeOwners(v)}` },
  no: { text: 'NO', color: '#1E8E4E', title: () => 'Not private-equity owned' },
  unknown: { text: '?', color: '#6B7280', title: () => 'No ownership data for this site' }
};

function describeOwners(verdict) {
  const owners = Array.isArray(verdict.owners) ? verdict.owners : [];
  if (!owners.length) return verdict.company || verdict.matchedDomain;
  return owners.join(', ');
}

/** A documented stake, as a badge-sized string: 88 -> "88%", 5.9 -> "5.9%". */
export function formatStake(stake) {
  if (typeof stake !== 'number' || !Number.isFinite(stake)) return null;
  if (stake < 0 || stake > 100) return null;
  // Whole numbers stay whole; keep one decimal only when it fits and matters.
  const rounded = stake >= 10 ? Math.round(stake) : Math.round(stake * 10) / 10;
  return `${rounded}%`;
}

/**
 * The badge leads with the percentage when one is on the record, because
 * "88%" says more than "YES". Colour still comes from the yes/no verdict, so a
 * sold-down holding stays green.
 */
function badgeFor(verdict) {
  const style = BADGE[verdict.status] || BADGE.unknown;
  const stake = formatStake(verdict.stake);
  if (!stake) return style;

  const basis = verdict.stakeBasis === 'voting' ? ' of the votes' : '';
  let title;
  if (verdict.status === 'yes') title = `${stake}${basis} held by ${describeOwners(verdict)}`;
  else if (verdict.stake === 0) title = 'Private equity has fully exited';
  else title = `Private equity holds ${stake}${basis} — not control`;
  return { text: stake, color: style.color, title: () => title };
}

async function paintBadge(tabId, url) {
  const hostname = hostnameFromUrl(url);

  if (!hostname) {
    await safeAction(() => chrome.action.setBadgeText({ tabId, text: '' }));
    await safeAction(() =>
      chrome.action.setTitle({ tabId, title: 'Is Private Equity Owned?' })
    );
    return;
  }

  const verdict = await lookup(hostname);
  const style = badgeFor(verdict);

  await safeAction(() => chrome.action.setBadgeText({ tabId, text: style.text }));
  await safeAction(() =>
    chrome.action.setBadgeBackgroundColor({ tabId, color: style.color })
  );
  await safeAction(() =>
    chrome.action.setTitle({
      tabId,
      title: `${verdict.matchedDomain} — ${style.title(verdict)}`
    })
  );
}

// Tabs close mid-flight often enough that these calls need to fail quietly.
async function safeAction(fn) {
  try {
    await fn();
  } catch {
    /* tab is gone */
  }
}

async function paintActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab) await paintBadge(tab.id, tab.url);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    paintBadge(tabId, changeInfo.url || tab.url);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await paintBadge(tabId, tab.url);
  } catch {
    /* tab is gone */
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) paintActiveTab();
});

// Chrome can drop alarms across browser restarts, so both entry points check.
async function ensureRefreshAlarm() {
  if (!(await chrome.alarms.get(REFRESH_ALARM))) {
    await chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: 720 });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureRefreshAlarm();
  await refreshRemote();
  await repaintAllTabs();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureRefreshAlarm();
  await refreshRemote();
  await repaintAllTabs();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== REFRESH_ALARM) return;
  const result = await refreshRemote();
  if (result.ok && result.reason !== 'cached') await repaintAllTabs();
});

async function repaintAllTabs() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((tab) => paintBadge(tab.id, tab.url)));
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: err.message }));
  return true; // keep the channel open for the async reply
});

async function handleMessage(message) {
  switch (message?.type) {
    case 'getVerdict': {
      const hostname = hostnameFromUrl(message.url);
      const info = await getDatasetInfo();
      if (!hostname) return { verdict: null, info };
      return { verdict: await lookup(hostname), info };
    }
    case 'refresh': {
      const result = await refreshRemote({ force: true });
      invalidateCache();
      await repaintAllTabs();
      return { result, info: await getDatasetInfo() };
    }
    default:
      throw new Error(`Unknown message type: ${message?.type}`);
  }
}

// The worker can be restarted at any point; repaint so the badge is never stale.
paintActiveTab();
