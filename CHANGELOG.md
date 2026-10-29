# Changelog

All notable changes to Medal Detector. This project uses [semantic versioning](https://semver.org).

## [2.0.1] – 2026-10-29

### Fixed
- The **Medal Detector** label in Torn's sidebar no longer wraps onto two lines and overlaps the count. It now sits on one line, with a little space between the arrow and **[open]**.

## [2.0.0] – 2026-10-29

First public release. Earlier versions were private test builds called **Merit Hunter**.

### Changed
- Renamed from Merit Hunter to **Medal Detector**. Tampermonkey treats it as a new script, so your key and goals need adding again.
- Redesigned the whole window for a cleaner, more professional look, with line icons, a calmer colour scheme and clearer layouts.
- New **Overview** page: daily goals, honours and medals earned, best streak, today's goals, and your closest awards sorted by estimated time.

### Added
- Separate **Honours** and **Medals** pages, with search, filters (In progress, In-game only, Earned, All) and rows that expand to show the full award path.
- A **goal picker** that lists every honour, medal and stat. It shows where you are, every award on the way, target choices and suggested daily amounts.
- Goals for a single award, either counted from a stat or done in-game. In-game ones tick off automatically when Torn awards them.
- "Requirement met" list for awards you qualify for but haven't been given yet.
- A note when an existing goal already covers the award you're looking at.

### Fixed
- Checked all 392 current honours against their real wording:
  - Crimes 2.0 "skill level 100" honours were wrongly matched to your player level.
  - Special-ammo honours were matched to all rounds fired.
  - Lavish, Riddled, Deadly Duo and Lovestruck were matched to the wrong stats.
  - Bare ("unarmored fights") wasn't matched at all.
  - Hunting-skill honours are now shown as in-game only, because the API doesn't provide hunting skill.
- Now tracked: total battle stats, best single hit, each special-ammo type, contracts, days online in a row, highest working stat, lifetime damage, times hospitalised and times jailed.

## Pre-release builds (as Merit Hunter)

### 1.8.x
- Checks for progress on every page load, a few seconds after clicks that don't reload the page, and when you return to the tab. Never more than once every 15 seconds.
- Timed checks can run every 30 seconds to 5 minutes.
- Started the full honour review. Legacy API counters are now labelled on their cards.

### 1.7.x
- Your goals listed in the sidebar under Merits, with progress bars.
- Finished goals hidden from the sidebar, with a show/hide line. The list can be collapsed.

### 1.6.x
- One Limited API key now powers everything (a single API call per check), with clear messages for keys with too little access.
- The floating button no longer flashes on page load.

### 1.5.0
- Covered every award: kill streaks, rounds fired, hits, time in the air, auctions, bazaar, points, stock payouts, imports, job points, racing, viruses and more.
- War Machine and 007 worked out from several stats.
- Awards that can't be tracked are grouped by type.

### 1.4.x
- Drug cooldown ranges, fastest-possible times and warnings for unrealistic daily targets.
- Crime-type honours like Escobar are no longer counted as drug use.

### 1.3.0
- Goal setting shows the full award path for the chosen stat, suggested daily targets and a live estimate.

### 1.2.x
- Window moved to the centre of the screen and redesigned.
- Lifetime targets aim at the top award for each stat.
- Fixed flicker when switching tabs.

### 1.1.x
- Read your honours and medals from the API and show your next award for every stat.
- Open button added under Merits in the sidebar.

### 1.0.0
- Daily goals tracked against your real Torn stats, with streaks, history and reminders.

[2.0.1]: https://github.com/Eaglewing91/Medal-Detector/releases/tag/v2.0.1
[2.0.0]: https://github.com/Eaglewing91/Medal-Detector/releases/tag/v2.0.0
