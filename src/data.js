// Dataset loading: bundled JSON is the floor, a GitHub-hosted copy is the
// update channel. Remote entries are merged over bundled ones so the hosted
// file only needs to carry additions and corrections.

import { lookupKeys, registrableDomain } from './domain.js';

export const DEFAULT_REMOTE_URL =
  'https://raw.githubusercontent.com/OWNER/REPO/main/data/companies.json';

const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REMOTE_BYTES = 8 * 1024 * 1024;

const STORAGE = {
  remote: 'remoteDataset',
  fetchedAt: 'remoteFetchedAt',
  url: 'remoteUrl',
  error: 'lastFetchError'
};

let bundledPromise = null;
let mergedCache = null; // { entries, dataVersion, remoteVersion, fetchedAt }

async function loadBundled() {
  if (!bundledPromise) {
    bundledPromise = fetch(chrome.runtime.getURL('data/companies.json'))
      .then((r) => r.json())
      .catch((err) => {
        bundledPromise = null;
        throw err;
      });
  }
  return bundledPromise;
}

export async function getRemoteUrl() {
  const stored = await chrome.storage.local.get(STORAGE.url);
  return stored[STORAGE.url] || DEFAULT_REMOTE_URL;
}

export async function setRemoteUrl(url) {
  await chrome.storage.local.set({ [STORAGE.url]: url });
  mergedCache = null;
}

/** True when the configured URL is still the unedited placeholder. */
export function isPlaceholderUrl(url) {
  return url.includes('/OWNER/REPO/');
}

function isValidDataset(data) {
  return Boolean(data) && typeof data === 'object' && data.entries &&
    typeof data.entries === 'object';
}

/**
 * Fetches the hosted dataset and stores it. Returns { ok, reason?, version? }.
 * Never throws — a failed refresh must leave the bundled data working.
 */
export async function refreshRemote({ force = false } = {}) {
  const url = await getRemoteUrl();
  if (isPlaceholderUrl(url)) {
    return { ok: false, reason: 'No dataset URL configured yet.' };
  }

  const stored = await chrome.storage.local.get([STORAGE.fetchedAt]);
  const age = Date.now() - (stored[STORAGE.fetchedAt] || 0);
  if (!force && age < REFRESH_INTERVAL_MS) {
    return { ok: true, reason: 'cached' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const length = Number(res.headers.get('content-length') || 0);
    if (length > MAX_REMOTE_BYTES) throw new Error('Dataset too large');

    const text = await res.text();
    if (text.length > MAX_REMOTE_BYTES) throw new Error('Dataset too large');

    const data = JSON.parse(text);
    if (!isValidDataset(data)) throw new Error('Unexpected dataset shape');

    await chrome.storage.local.set({
      [STORAGE.remote]: data,
      [STORAGE.fetchedAt]: Date.now(),
      [STORAGE.error]: null
    });
    mergedCache = null;
    return { ok: true, version: data.dataVersion };
  } catch (err) {
    const message = err.name === 'AbortError' ? 'Request timed out' : err.message;
    await chrome.storage.local.set({ [STORAGE.error]: message });
    return { ok: false, reason: message };
  } finally {
    clearTimeout(timer);
  }
}

async function getMerged() {
  if (mergedCache) return mergedCache;

  const [bundled, stored] = await Promise.all([
    loadBundled(),
    chrome.storage.local.get([STORAGE.remote, STORAGE.fetchedAt])
  ]);
  const remote = stored[STORAGE.remote];

  const entries = { ...bundled.entries };
  if (isValidDataset(remote)) {
    for (const [domain, entry] of Object.entries(remote.entries)) {
      // A remote entry marked "removed" retracts a bundled one.
      if (entry && entry.status === 'removed') delete entries[domain];
      else entries[domain] = entry;
    }
  }

  mergedCache = {
    entries,
    bundledVersion: bundled.dataVersion,
    remoteVersion: isValidDataset(remote) ? remote.dataVersion : null,
    fetchedAt: stored[STORAGE.fetchedAt] || null
  };
  return mergedCache;
}

/**
 * Resolves a hostname to a verdict.
 * status is always one of 'yes' | 'no' | 'unknown'.
 */
export async function lookup(hostname) {
  const { entries, bundledVersion, remoteVersion, fetchedAt } = await getMerged();

  for (const key of lookupKeys(hostname)) {
    const entry = entries[key];
    if (entry && (entry.status === 'yes' || entry.status === 'no')) {
      return {
        ...entry,
        status: entry.status,
        hostname,
        matchedDomain: key,
        dataVersion: remoteVersion || bundledVersion,
        fetchedAt
      };
    }
  }

  return {
    status: 'unknown',
    hostname,
    matchedDomain: registrableDomain(hostname),
    dataVersion: remoteVersion || bundledVersion,
    fetchedAt
  };
}

export async function getDatasetInfo() {
  const merged = await getMerged();
  const stored = await chrome.storage.local.get(STORAGE.error);
  return {
    entryCount: Object.keys(merged.entries).length,
    bundledVersion: merged.bundledVersion,
    remoteVersion: merged.remoteVersion,
    fetchedAt: merged.fetchedAt,
    lastError: stored[STORAGE.error] || null,
    remoteUrl: await getRemoteUrl()
  };
}

/** Drops the in-memory merge so the next lookup re-reads storage. */
export function invalidateCache() {
  mergedCache = null;
}
