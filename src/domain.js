// Hostname helpers. Deliberately dependency-free: a full Public Suffix List is
// overkill here because lookups walk up the label chain anyway.

// Second-level suffixes that are effectively TLDs. Only used to stop the walk
// from producing a meaningless key like "co.uk".
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'net.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.nz', 'net.nz', 'org.nz',
  'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'go.jp',
  'com.br', 'net.br', 'org.br', 'gov.br',
  'com.mx', 'com.ar', 'com.co', 'com.pe', 'com.cl',
  'co.in', 'net.in', 'org.in',
  'co.za', 'org.za',
  'com.sg', 'com.hk', 'com.tw', 'com.tr', 'com.cn', 'net.cn', 'org.cn',
  'co.kr', 'or.kr',
  'com.es', 'com.pl', 'com.ua', 'com.ru'
]);

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Normalizes a tab URL to a lowercase hostname, or null when the page is not a
 * real website (chrome://, file://, extension pages, blank tabs).
 */
export function hostnameFromUrl(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost') return null;
  if (IPV4.test(host) || host.includes(':')) return null;
  return host;
}

/**
 * Every dataset key worth trying for a hostname, most specific first:
 * shop.staples.co.uk -> ["shop.staples.co.uk", "staples.co.uk"]
 * www.petsmart.com   -> ["www.petsmart.com", "petsmart.com"]
 */
export function lookupKeys(hostname) {
  if (!hostname) return [];
  const labels = hostname.split('.');
  const keys = [];
  for (let i = 0; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join('.');
    keys.push(candidate);
    // Stop before the walk reaches a bare public suffix.
    const remaining = labels.slice(i + 1).join('.');
    if (labels.length - i <= 2) break;
    if (MULTI_PART_SUFFIXES.has(remaining)) break;
  }
  return keys;
}

/** The registrable domain we display to the user (last key from the walk). */
export function registrableDomain(hostname) {
  const keys = lookupKeys(hostname);
  return keys.length ? keys[keys.length - 1] : hostname;
}
