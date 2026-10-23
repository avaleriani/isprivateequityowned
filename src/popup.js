const el = (id) => document.getElementById(id);

const COPY = {
  yes: { mark: 'YES', title: 'Private-equity owned' },
  no: { mark: 'NO', title: 'Not private-equity owned' },
  unknown: { mark: '?', title: 'No data for this site' }
};

/**
 * 88 -> "88%", 55.5 -> "55.5%", anything unusable -> null.
 * Exact, unlike the badge, which rounds to fit four characters.
 */
function formatStake(stake) {
  if (typeof stake !== 'number' || !Number.isFinite(stake)) return null;
  if (stake < 0 || stake > 100) return null;
  return `${Number(stake.toFixed(2))}%`;
}

/** The long form shown in the details list. */
function describeStake(verdict) {
  const stake = formatStake(verdict.stake);
  if (!stake) return '';
  const basis = verdict.stakeBasis === 'voting' ? 'of the voting power' : 'of the equity';
  if (verdict.stake === 0) return 'None left — the firms behind it have exited';
  return `${stake} ${basis}`;
}

function send(message) {
  return chrome.runtime.sendMessage(message);
}

function setRow(rowId, valueId, value) {
  const row = el(rowId);
  if (!value) {
    row.hidden = true;
    return;
  }
  el(valueId).textContent = value;
  row.hidden = false;
}

function renderVerdict(verdict) {
  const card = el('card');
  card.className = 'card';

  if (!verdict) {
    el('verdict-mark').textContent = '–';
    el('verdict-title').textContent = 'Nothing to check';
    el('domain').textContent = 'This page is not a website.';
    el('details').hidden = true;
    el('note').hidden = true;
    el('source').hidden = true;
    return;
  }

  const copy = COPY[verdict.status] || COPY.unknown;
  card.classList.add(`state-${verdict.status}`);

  // A known percentage replaces the YES/NO mark — it is the more useful answer.
  const stake = formatStake(verdict.stake);
  const mark = el('verdict-mark');
  mark.textContent = stake || copy.mark;
  mark.classList.toggle('mark-numeric', Boolean(stake));
  el('verdict-title').textContent =
    stake && verdict.status === 'yes' ? 'Private-equity owned' : copy.title;
  el('domain').textContent = verdict.matchedDomain || verdict.hostname;

  const owners = Array.isArray(verdict.owners) ? verdict.owners.join(', ') : '';
  const stakeText = describeStake(verdict);
  setRow('row-company', 'company', verdict.company);
  setRow('row-owners', 'owners', owners);
  setRow('row-stake', 'stake', stakeText);
  setRow('row-since', 'since', verdict.since ? String(verdict.since) : '');

  const hasDetails = Boolean(verdict.company || owners || stakeText || verdict.since);
  el('details').hidden = !hasDetails;

  const note = verdict.note ||
    (verdict.status === 'unknown'
      ? 'This domain is not in the dataset yet — it is neither confirmed nor ruled out.'
      : '');
  el('note').textContent = note;
  el('note').hidden = !note;

  // Only render sources the browser can actually open, and never javascript: URLs.
  // A stake-specific citation wins, since the number is what gets doubted.
  const source = el('source');
  const candidate = verdict.stakeSource || verdict.source || '';
  const safeSource = /^https?:\/\//i.test(candidate) ? candidate : '';
  if (safeSource) source.href = safeSource;
  else source.removeAttribute('href');
  source.hidden = !safeSource;
}

function formatAge(timestamp) {
  if (!timestamp) return 'never updated';
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'updated just now';
  if (minutes < 60) return `updated ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `updated ${hours}h ago`;
  return `updated ${Math.round(hours / 24)}d ago`;
}

function renderInfo(info) {
  if (!info) return;
  const version = info.remoteVersion || info.bundledVersion || 'unknown';
  el('dataset-meta').textContent =
    `${info.entryCount} domains · v${version} · ${formatAge(info.fetchedAt)}`;
  if (info.remoteUrl && !el('remote-url').value) {
    el('remote-url').value = info.remoteUrl;
  }
  if (info.lastError) {
    showStatus(`Last fetch failed: ${info.lastError}`, true);
  }
}

function showStatus(text, isError = false) {
  const status = el('settings-status');
  status.textContent = text;
  status.classList.toggle('error', isError);
  status.hidden = false;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const { verdict, info } = await send({ type: 'getVerdict', url: tab?.url });
  renderVerdict(verdict);
  renderInfo(info);
}

el('refresh').addEventListener('click', async () => {
  el('refresh').textContent = 'Refreshing…';
  const { result, info } = await send({ type: 'refresh' });
  el('refresh').textContent = 'Refresh';
  renderInfo(info);
  showStatus(result.ok ? 'Dataset up to date.' : result.reason, !result.ok);
  await init();
});

el('toggle-settings').addEventListener('click', () => {
  el('settings').hidden = !el('settings').hidden;
});

el('settings').addEventListener('submit', async (event) => {
  event.preventDefault();
  const url = el('remote-url').value.trim();
  if (!url.startsWith('https://raw.githubusercontent.com/')) {
    showStatus('URL must be a https://raw.githubusercontent.com/… link.', true);
    return;
  }
  const { result, info } = await send({ type: 'setRemoteUrl', url });
  renderInfo(info);
  showStatus(result.ok ? 'Saved and fetched.' : result.reason, !result.ok);
  await init();
});

init();
