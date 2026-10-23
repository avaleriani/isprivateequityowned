# Privacy Policy

_Is Private Equity Owned?_ Chrome extension. Effective 23 October 2026.

**Short version: nothing about your browsing leaves your computer.** There are no accounts, no analytics, no ads and no tracking.

## What the extension reads

- **The address of the tab you're looking at.** The extension reads the active tab's URL to pick the toolbar badge. It reduces the URL to its domain (for example `www.staples.com` → `staples.com`) and looks it up in a list that is already stored on your computer. The URL is not saved, logged or sent anywhere.

It does not read page contents, form fields, cookies or anything else on the pages you visit. It has no content scripts.

## What it stores

In Chrome's local extension storage, on your machine only:

- a cached copy of the ownership dataset,
- the time it was last downloaded,
- the last download error, if any.

Uninstalling the extension deletes all of it.

## Network requests

- **Dataset updates.** About every 12 hours, and when you press **Refresh**, the extension downloads the public dataset file from `raw.githubusercontent.com`. The request is the same for every user and contains nothing about you or your browsing. As with any web request, GitHub can see your IP address and browser version; see [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
- **Links you click.** "Check the source" opens the cited article or filing in a new tab. "Report a mistake" opens a pre-filled GitHub issue showing the domain you were on and what the extension said about it. Nothing is submitted unless you choose to post the issue from your own GitHub account.

## What we don't do

We don't collect, sell or share personal data or browsing history, and we don't use data for advertising, creditworthiness or any purpose unrelated to the extension's single purpose.

## Changes and contact

Changes to this policy are published in this file, with the history in the repository. Questions: open an issue at <https://github.com/avaleriani/isprivateequityowned/issues>.
