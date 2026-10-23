#!/usr/bin/env node
/**
 * Checks data/companies.json before it ships or gets published to the remote URL.
 * Run: node tools/validate.js
 * Exits non-zero on any error, so it can gate a commit or a CI job.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const file = path.join(root, 'data', 'companies.json');
const raw = fs.readFileSync(file, 'utf8');

const errors = [];
const warnings = [];

let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  console.error(`FAIL  data/companies.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

if (!data.entries || typeof data.entries !== 'object') {
  console.error('FAIL  missing top-level "entries" object');
  process.exit(1);
}

// JSON.parse silently keeps the last of any duplicated key, so scan the text.
const keysInText = [...raw.matchAll(/^    "([^"]+)":/gm)].map((m) => m[1]);
const seen = new Set();
for (const key of keysInText) {
  if (seen.has(key)) errors.push(`duplicate key: ${key}`);
  seen.add(key);
}

const entries = Object.entries(data.entries);
const thisYear = new Date().getFullYear();

for (const [domain, entry] of entries) {
  const where = `${domain}:`;

  if (domain !== domain.toLowerCase()) errors.push(`${where} key must be lowercase`);
  if (domain.startsWith('www.')) errors.push(`${where} drop the www. prefix`);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) errors.push(`${where} not a bare domain`);

  if (!['yes', 'no', 'removed'].includes(entry.status)) {
    errors.push(`${where} status must be yes, no or removed`);
    continue;
  }
  if (entry.status === 'removed') continue;

  if (!entry.company) errors.push(`${where} missing company`);

  if (entry.status === 'yes') {
    if (!Array.isArray(entry.owners) || entry.owners.length === 0) {
      errors.push(`${where} a "yes" entry needs at least one owner`);
    }
    if (!entry.since) errors.push(`${where} a "yes" entry needs a "since" year`);
    if (!entry.source) errors.push(`${where} a "yes" entry needs a source link`);
  }

  if (entry.since && (entry.since < 1980 || entry.since > thisYear)) {
    errors.push(`${where} implausible "since" year: ${entry.since}`);
  }
  if (entry.source && !/^https:\/\//.test(entry.source)) {
    errors.push(`${where} source must be an https URL`);
  }

  // "stake" is the share of the company held by the listed firms. It is
  // optional: absent means the size of the holding is not on the record.
  if (entry.stake !== undefined) {
    if (typeof entry.stake !== 'number' || !Number.isFinite(entry.stake)) {
      errors.push(`${where} stake must be a number`);
    } else if (entry.stake < 0 || entry.stake > 100) {
      errors.push(`${where} stake out of range: ${entry.stake}`);
    } else if (entry.status === 'yes' && entry.stake === 0) {
      errors.push(`${where} a "yes" entry cannot have a 0% stake`);
    } else if (entry.status === 'no' && entry.stake > 50) {
      errors.push(`${where} a "no" entry with ${entry.stake}% needs re-checking`);
    }
    if (!entry.source && !entry.stakeSource) {
      errors.push(`${where} a stake figure needs a source`);
    }
  }
  if (entry.stakeBasis !== undefined && !['equity', 'voting'].includes(entry.stakeBasis)) {
    errors.push(`${where} stakeBasis must be "equity" or "voting"`);
  }
  if (entry.stakeSource && !/^https:\/\//.test(entry.stakeSource)) {
    errors.push(`${where} stakeSource must be an https URL`);
  }
  if (entry.stakeBasis !== undefined && entry.stake === undefined) {
    errors.push(`${where} stakeBasis without a stake`);
  }

  // Long holds are the likeliest place for a missed exit.
  if (entry.status === 'yes' && entry.since && thisYear - entry.since >= 12) {
    warnings.push(`${domain} has been held since ${entry.since} — re-check for an exit`);
  }
}

const yes = entries.filter(([, v]) => v.status === 'yes').length;
const no = entries.filter(([, v]) => v.status === 'no').length;
const firms = new Set(entries.flatMap(([, v]) => v.owners || []));
const staked = entries.filter(([, v]) => typeof v.stake === 'number').length;

console.log(`${entries.length} domains — ${yes} yes, ${no} no — ${firms.size} firms`);
console.log(`${staked} carry a documented stake percentage`);
console.log(`dataVersion ${data.dataVersion}, verifiedOn ${data.verifiedOn}`);

for (const w of warnings) console.log(`WARN  ${w}`);
for (const e of errors) console.error(`FAIL  ${e}`);

if (errors.length) {
  console.error(`\n${errors.length} error(s). Not safe to publish.`);
  process.exit(1);
}
console.log(`\nOK — ${warnings.length} warning(s), no errors.`);
