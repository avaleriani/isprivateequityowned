# Chrome Web Store listing

Everything the developer dashboard asks for, ready to paste. Images in this
folder are rendered by `sh tools/store/render.sh`; re-run it after a popup or
dataset change so the screenshots stay truthful.

## Package

Upload `dist/isprivateequityowned-<version>.zip` from `npm run package`.

## Store listing tab

**Name** (from the manifest): Is Private Equity Owned?

**Summary** (from the manifest, ≤132 chars):
Tells you at a glance whether the site you're on is owned by a private equity firm.

**Category:** Lifestyle → Shopping (alternative: Productivity → Tools)

**Language:** English

**Description:**

```
Is the store, restaurant, app or newspaper you're looking at owned by private equity? This extension answers in the toolbar, on every site, without a click.

THE BADGE
• A percentage (red), e.g. 88%: private equity controls the company, and this is how much of it the funds hold.
• YES (red): controlled by private equity, but the size of the holding isn't on the public record.
• A percentage (green), e.g. 17%: a firm still holds a stake, but no longer controls the company.
• NO (green): checked and not private-equity controlled. Public and widely held, founder or family owned, a nonprofit, or owned by a non-PE parent company.
• ? (grey): not in the dataset. Not confirmed, not ruled out, and never guessed.

CLICK FOR THE DETAILS
The company name, the firms that own it, the year they took control, any caveats, and a "Check the source" link to the press release, filing or report the entry is based on.

THE DATA
Over 1,100 sites people actually visit: retail and apparel, restaurants and franchises, software, healthcare, local newspapers, fitness, travel, and big everyday sites on the "no" side so common browsing gets a definite answer. Every "yes" entry links to its source. Corrections ship to installed copies within 12 hours, without an extension update.

Spot a mistake? "Report a mistake" in the popup opens a pre-filled GitHub issue.

PRIVACY
Lookups happen on your computer against a downloaded list. Nothing about your browsing is sent anywhere: no accounts, no analytics, no ads. The only network request is a periodic download of the public dataset from GitHub.

Ownership changes constantly. Entries are best-effort as of the date shown in the popup; check the linked source before relying on one.

Open source (MIT code, CC BY 4.0 data): https://github.com/avaleriani/isprivateequityowned
```

**Graphic assets:**

| Field | File |
| --- | --- |
| Store icon (128×128) | `icons/icon128.png` |
| Screenshots (1280×800) | `store/screenshot-1.png` … `store/screenshot-4.png` |
| Small promo tile (440×280) | `store/promo-small-440x280.png` |
| Marquee promo tile (1400×560, optional) | `store/promo-marquee-1400x560.png` |

**Official URL:** none (needs a verified domain)
**Homepage URL:** https://github.com/avaleriani/isprivateequityowned
**Support URL:** https://github.com/avaleriani/isprivateequityowned/issues

## Privacy practices tab

**Single purpose:**
Shows whether the website in the current tab is owned by a private equity firm, using a toolbar badge and a popup with the owners and a source link.

**Permission justifications:**

- `tabs`: Reads the URL of the active tab so the toolbar badge can show the ownership verdict for that site as you switch tabs and navigate, before you click anything. The URL is reduced to its domain and looked up in a locally stored list; it is never stored or transmitted.
- `storage`: Caches the downloaded ownership dataset and the time it was fetched, so lookups work offline and the dataset is not re-downloaded on every browser start.
- `alarms`: Schedules the dataset refresh every 12 hours so ownership corrections reach users without an extension update.
- Host permission `https://raw.githubusercontent.com/*`: Downloads the public ownership dataset (a JSON file) from the project's GitHub repository. No user data is sent.

**Are you using remote code?** No. The only remote resource is a JSON data file; it is parsed as data and never executed.

**Data usage:** tick none of the data categories. The extension reads the active tab's URL locally but does not collect or transmit it. If a reviewer asks for it anyway, tick "Web history" and state that it is processed on-device only and never leaves the browser.

**Certifications:** tick all three.
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://github.com/avaleriani/isprivateequityowned/blob/main/PRIVACY.md

## Distribution tab

Free · Public · All regions.

## Before each submission

1. `npm run validate` passes and `dataVersion`/`verifiedOn` are current.
2. The hosted `data/companies.json` on `main` is the same file being bundled (or newer).
3. `version` in `manifest.json` is bumped (the store rejects a re-used version).
4. `sh tools/store/render.sh` if the popup or the screenshot entries changed.
5. `npm run package`, then upload the zip.
