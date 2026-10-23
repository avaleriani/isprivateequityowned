# Is Private Equity Owned?

A Chrome extension that answers one question about the site you're on: **is it owned by private equity?**

The toolbar badge shows the answer without a click:

| Badge | Meaning |
| --- | --- |
| **88%** (red) | How much of the company the private equity firms actually hold, where that number is on the record. |
| **YES** (red) | PE-controlled, but the size of the holding isn't separately documented. |
| **17%** (green) | A firm still holds a stake, but not control — the honest answer is a number, not "NO". |
| **NO** (green) | Verified *not* PE-controlled — public and widely held, founder/family owned, a nonprofit, or a subsidiary of a non-PE parent. |
| **?** (grey) | The domain isn't in the dataset. Neither confirmed nor ruled out. |

Colour still comes from the yes/no verdict, so a sold-down holding stays green even though it shows a number. The badge rounds to fit four characters; the popup shows the exact figure and says whether it measures equity or voting power.

Clicking the icon opens a popup with the company name, the firms that own it, the year they took control, and any caveats.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this directory.

The badge updates on tab switch and on navigation.

## How the data works

Two layers:

- **Bundled** — `data/companies.json` ships inside the extension. It works offline and is what you see on a fresh install.
- **Remote** — a copy of the same JSON hosted on GitHub. The service worker fetches it on install, on browser start, and every 12 hours, then caches it in `chrome.storage.local`. Remote entries are merged *over* the bundled ones, so the hosted file only needs to carry additions and corrections.

To retract a bundled entry from the remote file, set its status to `"removed"`:

```json
{ "entries": { "example.com": { "status": "removed" } } }
```

### Pointing it at your repo

The default URL in `src/data.js` is a placeholder (`OWNER/REPO`). Until you change it, the extension runs on bundled data only and the popup reports "No dataset URL configured yet."

Either edit `DEFAULT_REMOTE_URL` in `src/data.js`, or set it at runtime: open the popup → **Data source** → paste the raw URL → **Save & fetch**. Only `https://raw.githubusercontent.com/…` URLs are accepted, matching the extension's `host_permissions`.

```
https://raw.githubusercontent.com/<owner>/<repo>/main/data/companies.json
```

### Publishing an update

```bash
node tools/validate.js     # gates the file: schema, duplicate keys, https sources, stale holds
```

It exits non-zero on any error, so it works as a pre-commit or CI gate. It also warns on any `yes` entry held 12+ years without a re-check — long holds are where a missed exit is most likely to be hiding.

Then bump `dataVersion` and `verifiedOn`, commit, and push to the repo behind your `DEFAULT_REMOTE_URL`. Installed extensions pick it up within 12 hours, or immediately via **Refresh** in the popup.

### Entry format

```json
"staples.com": {
  "status": "yes",
  "company": "Staples",
  "owners": ["Sycamore Partners"],
  "since": 2017,
  "stake": 88,
  "stakeBasis": "voting",
  "stakeSource": "https://example.com/13d-filing",
  "note": "Optional caveat shown in the popup.",
  "source": "https://www.sycamorepartners.com/news-article/sycamore-partners-completes-acquisition-of-staples-inc"
}
```

`stake` is the share of the company held by investment funds — the listed firms plus any co-investing funds — as a number between 0 and 100. It is **optional, and absent does not mean zero**; it means the size of the holding isn't on the record.

`stake: 100` is reserved for companies wholly owned by funds: a completed take-private or creditor takeover where the cited source has them acquiring all outstanding shares, with no public float, founding family or trade buyer left holding equity. Deals where a founder rolled over (Skechers, Spanx), a seller kept a piece (Insomnia Cookies, Evri) or a strategic partner co-invested (Telegraph, Express) are deliberately left blank rather than rounded up to 100. `stakeBasis` is `"equity"` (the default, omit it) or `"voting"`, which matters for the dual-class cases where a firm holds a minority of the shares and a majority of the votes. `stakeSource` is only needed when the figure comes from somewhere other than `source`; the popup prefers it for the "Check the source" link, because the number is the part people doubt.

A `no` entry can carry a stake too, and those are some of the most useful: Bumble reads `17%`, BrightSpring `13.7%`, Life Time `5.9%`, and a documented full exit reads `0`.

`source` is rendered as a "Check the source →" link in the popup, so prefer a primary source: the PE firm's or company's own press release, or an SEC filing.

Keys are lowercase registrable domains. Lookups walk up the label chain, so `shop.staples.co.uk` matches a `staples.co.uk` entry without a separate key.

Bump `dataVersion` when you change the file — the popup displays it.

## Accuracy

The dataset holds **1,139 domains — 417 `yes`, 722 `no`** covering 164 investment firms, with the heaviest coverage in enterprise software and cybersecurity, restaurants and franchising, retail and apparel, healthcare services, and UK/EU consumer names. The `no` side deliberately covers high-traffic sites people visit daily — banks, carriers, airlines, streaming services, big-tech and news — so common browsing resolves to a definite answer rather than `?`.

It is not exhaustive and cannot be: private equity owns tens of thousands of companies, most of which have no website you would ever visit. The dataset targets domains people actually browse. Anything not covered shows `?`, which is the honest answer.

**168 domains carry a percentage** — 148 of the `yes` entries, about a third of them, plus 20 on the `no` side. Some are partial holdings taken from filings and reporting: 94.8% of Adevinta and its marketplaces (Permira/Blackstone), 91% of WeightWatchers (its creditors), 90% of Yahoo (Apollo), 88% of SailPoint (Thoma Bravo) and of Chewy's votes (BC Partners), 86.4% of McGraw Hill (Platinum), 68.3% of Waystar (EQT/CPPIB/Bain), 62.3% of Action (3i), 59.8% of Definitive Healthcare (Advent), 55.5% of Canada Goose's votes (Bain), 45% of Driven Brands (Roark), 43% of Krispy Kreme (JAB). The other 99 are companies funds own outright, at 100%.

Everywhere else the badge still falls back to `YES`, because "a buyout fund controls it" and "a buyout fund owns all of it" are different claims and the dataset shouldn't blur them.

Every `yes` entry was checked against a primary source (a PE-firm or company press release, an SEC filing, or reporting on the deal) on the `verifiedOn` date in the file, and carries a `source` link so any claim can be checked in one click. `no` entries split into two kinds: those where a PE firm used to be in control and has since exited or sold down carry a source link too (Bumble, ADT, Hilton, Life Time, BrightSpring); the rest are large widely-held public companies, nonprofits and family or employee-owned firms, where the `note` states the basis and no link is needed.

Ownership changes constantly, so treat entries as best-effort as of `verifiedOn`. Some entries are judgment calls, and the `note` field always says why:

- **Public but PE-controlled** → `yes`. McGraw Hill (Platinum Equity, 86%), Chewy (BC Partners, ~88% voting power), Savers (Ares, ~76%), KinderCare (Partners Group, 71%), Hertz (Knighthead/Certares, 58%), Torrid (Sycamore, ~78%), Medline (three firms, ~54% combined), Petco (CVC/CPPIB), Krispy Kreme (JAB, ~43%), Canada Goose (Bain, 55.5% of the votes), Driven Brands (Roark, ~45%), UFC and WWE (Silver Lake owns Endeavor, which controls the listed TKO).
- **PE bought in, then sold down** → `no`, with the exit documented. Life Time (Leonard Green down to 5.9%), BrightSpring (KKR down to 13.7%), Bumble (Blackstone down to ~17%), ADT (Apollo fully out), Hilton (Blackstone out in 2018), Dollar General (KKR out by 2016), Caesars (Apollo/TPG out in 2019), Academy Sports (KKR out by 2023), Planet Fitness (TSG out in 2017), Motel 6 (Blackstone sold G6 Hospitality to Oyo in December 2024), The Fresh Market (Cencosud bought out Apollo's last 33% in 2025), Peet's (Keurig Dr Pepper's takeover of JDE Peet's ended JAB's control in 2026).
- **Financing is not control** → `no`. Equinox and SoulCycle took $1.8bn from Sixth Street, Silver Lake, L Catterton, Ares and HPS in 2024, but Related Companies still controls the business.
- **Creditors took over in bankruptcy** → `yes` when the new owners are PE or distressed-debt funds. Red Lobster (Fortress), Guitar Center (Ares), Belk (KKR and Hein Park, who took control *from* Sycamore in 2024), Pluralsight (lenders, after Vista wrote its stake to zero), 2U/edX (Mudrick), WeightWatchers (lenders took 91% of the equity), Regal (Cineworld's lenders), Vue (Barings and Farallon), The Container Store (Golub, LCM, Glendon), Matalan (Invesco, Man GLG, Napier Park, Tresidor), Mitel (senior lenders, ending Searchlight's ownership), 24 Hour Fitness (Monarch, Sculptor, Cyrus), Audacy (Soros Fund Management), Cirque du Soleil (Catalyst Capital), PizzaExpress (Cyrus and Bain Capital Credit), Bonhams (private credit manager Pemberton, which had been its lender).
- **Bankruptcy buyer is a trade, family or non-profit owner** → `no`. Big Lots (Variety Wholesalers, family-owned), GNC (Harbin Pharmaceutical), 23andMe (TTAM Research Institute, a non-profit), The Body Shop is the counter-example and stays `yes` because Auréa is an investment group.
- **Hedge funds and family investment firms** → `yes` with a caveat. Alden Global Capital (the Chicago Tribune, Denver Post and other papers), Chatham Asset Management (McClatchy's 30 titles, including the Miami Herald and Sacramento Bee), JAB Holding (Panera, Krispy Kreme), BDT & MSD (Whataburger, Weber), Ames Watson (Claire's), 3G Capital (Skechers) are not conventional buyout funds, but each holds control.

Large minorities used to be unresolvable — "not control" made them `no`, which read as *clean*, and leaving them out made them `?`. The stake field fixes that: Surgery Partners is now `no` at **39%** (Bain, offer rejected in 2025), LifeStance `no` at **29.3%** (TPG, selling down), Frontier Airlines `no` at **30%**, Gatwick `no` at **49.99%**. The verdict stays honest and the number carries the nuance.

Known gaps, deliberately left as `?` rather than guessed: Albertsons (Cerberus has been the largest holder since the 2020 IPO but has sold down and the current figure isn't clear), Pet Supplies Plus (separated from Franchise Group in 2025 into a management-led holding company whose backers are not disclosed), Thames Water (senior creditors including Elliott and Apollo are bidding, but the restructuring was unresolved on the verifiedOn date), Frontier Airlines (Indigo Partners distributed most of its stake to its own investors in 2024), GoodRx (Silver Lake holds Class B shares but voting control is shared with the founders), TikTok (the 2025 US joint venture splits roughly 45% between Oracle, Silver Lake and MGX, with no single controller), F45 Training (delisted in 2023 with Kennedy Lewis as its lender and largest holder, but no completed take-private on the record), Vacasa (bought by Casago in 2025, whose own backers are not disclosed).

The `?` state exists so the extension never claims a site is clean merely because nobody has looked it up yet.

## Layout

```
manifest.json         MV3 manifest
src/background.js     Service worker: badge painting, refresh alarm, messaging
src/data.js           Dataset load, remote fetch/cache, lookup
src/domain.js         Hostname normalization and label-chain walk
src/popup.*           Popup UI
data/companies.json   Seed dataset
tools/gen_icons.py    Regenerates icons/ (stdlib only)
tools/validate.js     Validates the dataset before publishing
```

## Permissions

- `storage` — cache the fetched dataset.
- `tabs` — read the active tab's URL to pick a badge.
- `alarms` — schedule the 12-hour refresh.
- `host_permissions: raw.githubusercontent.com` — fetch the hosted dataset.

No content scripts, no analytics, no page access. Nothing about your browsing leaves the machine — lookups are local against the cached dataset.
