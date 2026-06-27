# VocaPort Downloads Page Refresh Design

> Chinese version (中文版): [2026-06-27-downloads-page-refresh-design.zh.md](/Users/jay/Code/VocaPort/docs/superpowers/specs/2026-06-27-downloads-page-refresh-design.zh.md)

> Reading note: higher-difficulty words, design-heavy terms, and abstract concepts are glossed in Chinese when they most affect reading flow.

**Status (状态):** Design approved, ready for implementation planning.

**Scope (范围):** Information architecture, visual direction, copy structure, theme switching, and frontend interactions for `apps/downloads`.

**Out of scope (暂不包含):** GitHub Releases data-model refactors, Rust crate changes, bridge-contract changes, and any service-side download analytics.

## 1. Background

The current downloads page already covers the baseline function set: it renders the latest stable release, the latest prerelease, older releases, and inline release notes from `releases.json`.

Current problems:

- It forces dark mode by default and does not match the light-first visual direction shown in the LunaTV reference.
- The hero and content sections are visually too similar, so the primary download choice is not obvious enough.
- Loading, error, and empty states are simple status cards instead of part of the same page language.
- There is no explicit dark-mode toggle.
- Older releases feel too visually close to the primary releases, which weakens decision speed.

## 2. Goals

This refresh solves one core problem: make the user understand, within a few seconds, which build to install now, where to try preview builds, and where to roll back.

Concrete goals:

1. Borrow the LunaTV page's clear segmentation (清晰分区) and top action area without cloning its brand voice.
2. Reframe the page as a VocaPort-specific "official build manifest" instead of a generic release dump.
3. Make the latest stable release the primary download path, the latest prerelease the secondary featured path, and the archive a lower-emphasis fallback.
4. Add an explicit dark-mode toggle.
5. Follow the system theme on first visit, then remember the user's manual choice.
6. Use one visual shell for loading, error, empty, and filled states.

## 3. Design Constraints

- Keep the current release-first data model.
- Keep using `selectReleaseSections()` to derive `latestStable`, `latestPrerelease`, and `previousReleases`.
- Preserve bilingual switching.
- Do not add search, filtering, pagination, autoplay, or other non-essential interactions.
- Keep all new logic in the TypeScript UI layer; do not introduce backend or bridge changes.

## 4. Page Role

The downloads page is not a marketing homepage and not a release-admin console.

Its single job is to present public GitHub Release installers in a way that feels clearer, more trustworthy, and faster to decide from.

It serves two user groups:

- regular users who want the recommended stable installer
- test users who want preview builds or older rollback options

## 5. Information Architecture

### 5.1 Hero

The hero uses a "single large title + top-right action cluster" structure.

Left-side content:

- small eyebrow: `VocaPort Download Desk` and its Chinese equivalent
- large title that frames the page as an official installer overview
- short supporting copy that says stable, preview, and archive builds are all reachable from one screen

Right-side actions:

- `Open GitHub Releases`
- language toggle
- dark-mode toggle

### 5.2 Featured Download Sections

The featured area is split into two independent sections:

1. `01 Stable`
2. `02 Preview`

Each section contains:

- a section number
- a section title
- one-line purpose copy
- release name
- tag and publish date
- asset list
- expandable release notes
- a GitHub Release detail link

Meaning:

- `Stable` means recommended for most users
- `Preview` means testing / early access

### 5.3 Archive Section

Older releases remain visible, but at a lower visual priority than the two featured sections.

Presentation strategy:

- use more compact cards or list rows instead of equally dominant spotlight cards
- keep release name, tag, publish date, and installer links
- still allow release-note expansion

### 5.4 Footer

The footer continues to show:

- repository source
- catalog sync time

The copy should read closer to "Last synced" / "最后同步" than a raw technical timestamp label.

## 6. Visual Direction

### 6.1 Overall Character

The page borrows these useful traits from the LunaTV reference:

- light paper-like surfaces
- large rounded containers
- strong section boundaries
- concentrated actions in the top area
- low-noise, high-readability layout

But the VocaPort version should lean more toward a manifest / installer ledger metaphor than a direct stylistic copy.

### 6.2 Light Theme

The light theme is the default visual presentation, but not a hardcoded default. On first visit, the rendered theme follows the system preference.

Visual traits:

- warm gray or mist-white background instead of hard white
- cards feel like paper surfaces, not glassmorphism (玻璃拟态)
- subtle grid or rule lines reinforce structure
- primary text uses dark blue-gray or ink-like tones for readability

### 6.3 Dark Theme

The dark theme is not a naive inversion (简单反色). It keeps the same structure and material logic.

Visual traits:

- deep ink-blue or charcoal background
- preserved card edges and depth without bright glow
- enough contrast on section numbers, labels, and main actions

### 6.4 Typography

- the hero title uses a more distinctive display / serif treatment
- body copy, metadata, and buttons use a restrained sans-serif
- section numbers, eyebrows, and labels use a narrower, more structural style

### 6.5 Structural Elements

Elements worth keeping:

- numbered section markers `01 / 02`
- eyebrows
- dividers
- status labels

Elements to remove or reduce:

- the current full-page dark glass atmosphere
- the overly equal weight between all cards

## 7. Copy Strategy

### 7.1 Hero Copy

The hero copy moves beyond "All builds, one page" and gives the page a clearer installer identity, for example:

- Chinese: `官方安装包总览`
- English: `Official build manifest`

The supporting line should communicate three things:

- the latest stable build is the recommended install
- preview builds are for trying or validating upcoming changes
- older builds are available for rollback

### 7.2 Section Copy

- `Stable`: recommended for most users
- `Preview`: for testing new changes or early validation
- `Archive`: for rollback or older package lookup

### 7.3 State Copy

Loading, error, and empty states should match the main-page voice:

- avoid stiff technical phrasing
- clearly say what is happening
- in error state, keep a clear path to GitHub Releases

## 8. Interaction Design

### 8.1 Language Switching

- keep the current Chinese / English toggle
- continue to localize hero copy, section titles, state copy, and parsed release notes

### 8.2 Dark-Mode Toggle

Theme rules:

1. On first visit, read `prefers-color-scheme`.
2. If the user has already chosen a theme, stored preference wins.
3. When the user clicks the toggle, switch immediately and persist to `localStorage`.

Implementation strategy:

- use `data-theme="light" | "dark"` to drive CSS variables
- do not expose a third "auto" state in the UI
- the button only flips between light and dark

### 8.3 Release Notes Expansion

- keep the current inline expansion pattern
- restyle it as an embedded note panel inside the new card language
- keep the bilingual release-note parsing logic

### 8.4 External Links

These links continue to open in a new tab:

- GitHub Release pages
- installer download links

## 9. State Design

### 9.1 Loading

The loading state uses the same hero shell and theme system as the final page, with a content panel that says the installer catalog is syncing.

### 9.2 Error

The error state uses the same shell and clearly explains:

- release data could not be loaded right now
- GitHub Releases is still available as a direct fallback path

### 9.3 Empty

The empty state should not read like a failure. It should read like "no public builds yet."

The page still shows the hero and top actions, then a main content panel saying:

- no public installers are available yet
- this page updates automatically once GitHub Release assets are attached

### 9.4 Filled

The filled state uses the full three-part structure:

- Stable
- Preview
- Archive

## 10. Component Boundaries

This refresh should create clearer display units inside the existing app without drifting into unrelated refactors.

Suggested boundaries:

- `DownloadsPage`
  - owns `locale` and `theme`
  - decides which sections render from catalog data
- `Hero`
  - renders title, supporting copy, and top action cluster
- `ThemeToggle`
  - renders only the theme toggle control
- `ReleaseSpotlightCard`
  - used for `Stable` and `Preview`
- `ArchiveReleaseList`
  - used for older releases
- `StatePanel`
  - shared shell for loading / error / empty panels

## 11. Responsive Behavior And Accessibility

### 11.1 Responsive Behavior

- the desktop hero uses a left-right layout
- on narrow screens, the action cluster stacks below the title block
- `Stable` and `Preview` may sit side by side on desktop, but must collapse to one column on mobile
- archive rows stay compact but tap-friendly on mobile

### 11.2 Accessibility

- theme and language toggles need explicit `aria-label`s
- both themes must keep baseline readable contrast
- keyboard access must not rely on hover
- release-note expansion keeps using `aria-expanded`

## 12. Testing Requirements

The refresh should cover at least these frontend tests:

1. renders the refreshed hero and three-part layout
2. updates titles and release notes when the language changes
3. toggles the theme from the dark-mode button
4. applies stored theme preference on initialization
5. keeps the refreshed shell in the empty state
6. preserves working release-note expansion in the new layout

## 13. Non-Goals

This refresh does not:

- change GitHub Releases fetching logic
- add OS-based filtering
- add download-count sorting
- turn the downloads page into a full marketing homepage
- introduce a design-system dependency or large UI framework

## 14. Expected Implementation Entry Points

Most edits are expected in:

- `apps/downloads/src/App.tsx`
- `apps/downloads/src/index.css`
- `apps/downloads/src/i18n.ts`
- `apps/downloads/src/App.test.tsx`

If a few small presentational helpers are added, they should stay local to `apps/downloads/src` rather than spreading into shared packages.
