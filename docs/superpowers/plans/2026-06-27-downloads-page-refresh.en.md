# Downloads Page Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended, 推荐) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh `apps/downloads` into a LunaTV-inspired but VocaPort-specific installer manifest: first visit follows the system theme, a persistent dark-mode toggle is available, loading / error / empty / filled states share one shell, and the page clearly prioritizes Stable / Preview / Archive sections.

**Architecture:** Keep the current release-first catalog flow and `selectReleaseSections()` output, but move page-shell concerns into a single React experience component that owns locale and theme state. Add a small theme helper for system-theme resolution and persistence, then rebuild the page through CSS variables so both light and dark themes share the same manifest-style structure.

**Tech Stack:** `React 18`, `TypeScript` (`strict: true`), `Vitest`, `@testing-library/react`, `Vite CSS`

## Global Constraints

- Only touch `apps/downloads`; do not introduce Rust, bridge-contract, or GitHub Releases data-model changes.
- Continue to use `selectReleaseSections()` to derive `latestStable`, `latestPrerelease`, and `previousReleases`.
- On first visit, follow `prefers-color-scheme`; after a manual toggle, persist the chosen theme in `localStorage`.
- Do not add OS-based filtering, pagination, search, or marketing-homepage content.
- Make loading, error, empty, and filled states share the same hero, top actions, and theme system.
- Preserve bilingual switching and localized release-note parsing.
- Keep external links opening in a new tab.

## File Structure

- Create `apps/downloads/src/theme.ts`
  - Theme types plus initialization, toggling, and persistence helpers.
- Create `apps/downloads/src/theme.test.ts`
  - Unit coverage for theme initialization and persistence logic.
- Modify `apps/downloads/src/App.tsx`
  - Consolidated page shell, hero, theme toggle, spotlight sections, archive, and state panels.
- Modify `apps/downloads/src/main.tsx`
  - Route loading and error states through the shared page shell.
- Modify `apps/downloads/src/i18n.ts`
  - Expanded hero, section-description, state, and theme-toggle copy.
- Modify `apps/downloads/src/App.test.tsx`
  - Component coverage for the refreshed shell, language switching, theme switching, persistence, and three-part layout.
- Modify `apps/downloads/src/index.css`
  - Light/dark design tokens, manifest-style layout, and card styling.

### Task 1: Add The Theme Helper And Unit Tests

**Files:**
- Create: `apps/downloads/src/theme.ts`
- Test: `apps/downloads/src/theme.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `Theme = "light" | "dark"`
- Produces: `THEME_STORAGE_KEY`
- Produces: `getInitialTheme(deps?: ThemeDependencies): Theme`
- Produces: `persistTheme(theme: Theme, storage?: StorageLike): void`
- Produces: `toggleTheme(theme: Theme): Theme`

- [ ] **Step 1: Write the failing test**

```ts
// apps/downloads/src/theme.test.ts
import { describe, expect, it, vi } from "vitest";
import {
  THEME_STORAGE_KEY,
  getInitialTheme,
  persistTheme,
  toggleTheme,
} from "./theme";

describe("getInitialTheme", () => {
  it("prefers the stored theme over the system preference", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue("light"),
      setItem: vi.fn(),
    };
    const matchMedia = vi.fn().mockReturnValue({ matches: true });

    expect(getInitialTheme({ storage, matchMedia })).toBe("light");
  });

  it("falls back to the system theme when nothing is stored", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    };
    const matchMedia = vi.fn().mockReturnValue({ matches: true });

    expect(getInitialTheme({ storage, matchMedia })).toBe("dark");
  });
});

describe("toggleTheme", () => {
  it("switches between light and dark", () => {
    expect(toggleTheme("light")).toBe("dark");
    expect(toggleTheme("dark")).toBe("light");
  });
});

describe("persistTheme", () => {
  it("writes the selected theme into storage", () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    };

    persistTheme("dark", storage);

    expect(storage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "dark");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @vocaport/downloads test -- src/theme.test.ts`

Expected: FAIL with `Cannot find module './theme'` or missing exported members from `./theme`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// apps/downloads/src/theme.ts
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "vocaport-downloads-theme";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface MatchMediaResult {
  matches: boolean;
}

type MatchMediaLike = (query: string) => MatchMediaResult;

export interface ThemeDependencies {
  storage?: StorageLike;
  matchMedia?: MatchMediaLike;
}

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function getStoredTheme(storage?: StorageLike): Theme | null {
  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch (error) {
    console.warn("Failed to read the downloads theme preference.", error);
    return null;
  }
}

export function getInitialTheme(deps: ThemeDependencies = {}): Theme {
  const storedTheme = getStoredTheme(deps.storage);

  if (storedTheme) {
    return storedTheme;
  }

  return deps.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function persistTheme(theme: Theme, storage?: StorageLike) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn("Failed to persist the downloads theme preference.", error);
  }
}

export function toggleTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @vocaport/downloads test -- src/theme.test.ts`

Expected: PASS with all `theme.test.ts` assertions green.

- [ ] **Step 5: Commit**

```bash
git add apps/downloads/src/theme.ts apps/downloads/src/theme.test.ts
git commit -m "test: add downloads theme helpers"
```

### Task 2: Unify The Page Shell And State Layout

**Files:**
- Modify: `apps/downloads/src/App.tsx`
- Modify: `apps/downloads/src/main.tsx`
- Modify: `apps/downloads/src/i18n.ts`
- Test: `apps/downloads/src/App.test.tsx`

**Interfaces:**
- Consumes: `Theme`, `getInitialTheme`, `persistTheme`, `toggleTheme`
- Produces: `DownloadsViewState`
- Produces: `DownloadsExperience`
- Produces: `DownloadsPage`
- Produces: `StatePanel`

- [ ] **Step 1: Write the failing page-shell test**

```tsx
// apps/downloads/src/App.test.tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DownloadsExperience } from "./App";

afterEach(() => {
  cleanup();
});

describe("downloads shell states", () => {
  it("reuses the refreshed shell for loading, error, and empty states", () => {
    const { rerender } = render(
      <DownloadsExperience state={{ status: "loading" }} />,
    );

    expect(
      screen.getByRole("heading", { name: "Official build manifest" }),
    ).toBeTruthy();
    expect(screen.getByText("Syncing public installers…")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Open GitHub Releases" }),
    ).toBeTruthy();

    rerender(
      <DownloadsExperience
        state={{ status: "error", message: "Failed to load release catalog: 500" }}
      />,
    );

    expect(screen.getByText("Release data is temporarily unavailable.")).toBeTruthy();
    expect(screen.getByText("Failed to load release catalog: 500")).toBeTruthy();

    rerender(
      <DownloadsExperience
        state={{
          status: "ready",
          catalog: {
            owner: "IORLab",
            repo: "VocaPort",
            generatedAt: "2026-06-26T10:00:00.000Z",
            releases: [],
          },
        }}
      />,
    );

    expect(screen.getByText("No public installers yet.")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @vocaport/downloads test -- src/App.test.tsx`

Expected: FAIL because `DownloadsExperience` does not exist yet, `main.tsx` still renders the old `status-screen`, and the current hero has neither the GitHub action nor the new copy.

- [ ] **Step 3: Write the minimal implementation**

```tsx
// apps/downloads/src/App.tsx
import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import {
  formatReleaseDate,
  selectReleaseSections,
} from "./catalog";
import { getCopy, type Locale } from "./i18n";
import {
  getInitialTheme,
  persistTheme,
  toggleTheme,
  type Theme,
} from "./theme";
import type { ReleaseCatalog } from "./types";

export type DownloadsViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; catalog: ReleaseCatalog };

const FALLBACK_REPOSITORY = {
  owner: "IORLab",
  repo: "VocaPort",
} as const;

function getBrowserThemeDependencies() {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    storage: window.localStorage,
    matchMedia: window.matchMedia.bind(window),
  };
}

export function DownloadsExperience({ state }: { state: DownloadsViewState }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState<Theme>(() =>
    getInitialTheme(getBrowserThemeDependencies()),
  );
  const copy = getCopy(locale);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const repository = useMemo(() => {
    if (state.status !== "ready") {
      return FALLBACK_REPOSITORY;
    }

    return {
      owner: state.catalog.owner,
      repo: state.catalog.repo,
    };
  }, [state]);

  const githubReleasesUrl = `https://github.com/${repository.owner}/${repository.repo}/releases`;

  const handleThemeToggle = () => {
    setTheme((currentTheme) => {
      const nextTheme = toggleTheme(currentTheme);

      if (typeof window !== "undefined") {
        persistTheme(nextTheme, window.localStorage);
      }

      return nextTheme;
    });
  };

  return (
    <PageFrame>
      <Hero
        githubReleasesUrl={githubReleasesUrl}
        locale={locale}
        onLocaleChange={setLocale}
        onThemeToggle={handleThemeToggle}
        theme={theme}
      />
      <PageBody locale={locale} state={state} />
      {state.status === "ready" ? (
        <footer className="page-footer">
          <span>
            {copy.footerGeneratedPrefix} {state.catalog.owner}/{state.catalog.repo}
          </span>
          <span>
            {copy.footerUpdatedPrefix} {formatReleaseDate(state.catalog.generatedAt, locale)}
          </span>
        </footer>
      ) : null}
    </PageFrame>
  );
}

export function DownloadsPage({ catalog }: { catalog: ReleaseCatalog }) {
  return <DownloadsExperience state={{ status: "ready", catalog }} />;
}

function PageBody({
  locale,
  state,
}: {
  locale: Locale;
  state: DownloadsViewState;
}) {
  const copy = getCopy(locale);

  if (state.status === "loading") {
    return (
      <StatePanel
        description={copy.loadingDescription}
        title={copy.loadingTitle}
        tone="loading"
      />
    );
  }

  if (state.status === "error") {
    return (
      <StatePanel
        description={copy.errorDescription}
        detail={state.message}
        title={copy.errorTitle}
        tone="error"
      />
    );
  }

  const sections = selectReleaseSections(state.catalog);

  if (!sections.latestStable && !sections.latestPrerelease && sections.previousReleases.length === 0) {
    return (
      <StatePanel
        description={copy.emptyDescription}
        title={copy.emptyTitle}
        tone="empty"
      />
    );
  }

  return <div className="downloads-content" data-locale={locale} />;
}
```

```ts
// apps/downloads/src/i18n.ts
export interface DownloadsCopy {
  archiveDescription: string;
  archiveKicker: string;
  emptyDescription: string;
  emptyTitle: string;
  errorDescription: string;
  errorTitle: string;
  featuredDownloadsAriaLabel: string;
  footerGeneratedPrefix: string;
  footerUpdatedPrefix: string;
  githubReleasesButton: string;
  heroDescription: string;
  heroEyebrow: string;
  heroTitle: string;
  languageSwitcherLabel: string;
  loadingDescription: string;
  loadingTitle: string;
  previewDescription: string;
  previewSectionLabel: string;
  stableDescription: string;
  stableSectionLabel: string;
  themeToggleLabel: string;
  themeToggleToDark: string;
  themeToggleToLight: string;
  // keep the existing release-note keys
}
```

```tsx
// apps/downloads/src/main.tsx
import { DownloadsExperience } from "./App";

function DownloadsApp() {
  const [state, setState] = useState<BootstrapState>({ status: "loading" });

  useEffect(() => {
    void loadReleaseCatalog(`${import.meta.env.BASE_URL}releases.json`)
      .then((catalog) => {
        setState({ status: "ready", catalog });
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Unknown loading error";
        setState({ status: "error", message });
      });
  }, []);

  return <DownloadsExperience state={state} />;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @vocaport/downloads test -- src/App.test.tsx`

Expected: PASS with the new loading / error / empty shell assertions green. If older assertions fail because of renamed copy, update them now to the approved wording.

- [ ] **Step 5: Commit**

```bash
git add apps/downloads/src/App.tsx apps/downloads/src/main.tsx apps/downloads/src/i18n.ts apps/downloads/src/App.test.tsx
git commit -m "feat: unify downloads page shell states"
```

### Task 3: Build The Stable / Preview / Archive Layout And Theme Toggle

**Files:**
- Modify: `apps/downloads/src/App.tsx`
- Modify: `apps/downloads/src/index.css`
- Modify: `apps/downloads/src/App.test.tsx`

**Interfaces:**
- Consumes: `DownloadsExperience`, `Theme`, `getCopy()`, `selectReleaseSections()`
- Produces: `Hero`
- Produces: `ThemeToggle`
- Produces: `ReleaseSpotlightCard`
- Produces: `ArchiveReleaseList`

- [ ] **Step 1: Write the failing interaction and layout tests**

```tsx
// apps/downloads/src/App.test.tsx
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DownloadsPage } from "./App";
import { sampleCatalog } from "./fixtures";
import { THEME_STORAGE_KEY } from "./theme";

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  cleanup();
});

describe("downloads page layout", () => {
  it("renders the stable, preview, and archive sections in the refreshed layout", () => {
    mockMatchMedia(false);
    render(<DownloadsPage catalog={sampleCatalog} />);

    expect(screen.getByText("01")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Stable" })).toBeTruthy();
    expect(screen.getByText("02")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Preview" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Archive" })).toBeTruthy();

    const stableSection = screen.getByRole("heading", { name: "Stable" }).closest("section");
    expect(
      within(stableSection as HTMLElement).getByRole("link", {
        name: /Download Android Universal Beta APK/,
      }),
    ).toBeTruthy();
  });

  it("toggles the theme and persists the manual choice", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    render(<DownloadsPage catalog={sampleCatalog} />);

    expect(document.documentElement.dataset.theme).toBe("light");

    await user.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    );

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @vocaport/downloads test -- src/App.test.tsx`

Expected: FAIL because there is no `ThemeToggle`, no `data-theme` update, and no `01 Stable` / `02 Preview` / `Archive` structure yet.

- [ ] **Step 3: Write the minimal implementation**

```tsx
// apps/downloads/src/App.tsx
function Hero({
  githubReleasesUrl,
  locale,
  onLocaleChange,
  onThemeToggle,
  theme,
}: {
  githubReleasesUrl: string;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onThemeToggle: () => void;
  theme: Theme;
}) {
  const copy = getCopy(locale);

  return (
    <header className="hero">
      <div className="hero__content">
        <p className="hero-kicker">{copy.heroEyebrow}</p>
        <h1>{copy.heroTitle}</h1>
        <p className="hero-copy">{copy.heroDescription}</p>
      </div>

      <div className="hero__actions">
        <a
          className="hero-action hero-action--link"
          href={githubReleasesUrl}
          rel="noreferrer"
          target="_blank"
        >
          {copy.githubReleasesButton}
        </a>

        <div
          className="locale-switcher"
          aria-label={copy.languageSwitcherLabel}
          role="group"
        >
          <button
            aria-pressed={locale === "zh"}
            className={`locale-switcher__button${locale === "zh" ? " locale-switcher__button--active" : ""}`}
            onClick={() => onLocaleChange("zh")}
            type="button"
          >
            中文
          </button>
          <button
            aria-pressed={locale === "en"}
            className={`locale-switcher__button${locale === "en" ? " locale-switcher__button--active" : ""}`}
            onClick={() => onLocaleChange("en")}
            type="button"
          >
            EN
          </button>
        </div>

        <button
          aria-label={copy.themeToggleLabel}
          className="theme-toggle"
          onClick={onThemeToggle}
          type="button"
        >
          {theme === "dark" ? copy.themeToggleToLight : copy.themeToggleToDark}
        </button>
      </div>
    </header>
  );
}

function FilledState({
  catalog,
  locale,
}: {
  catalog: ReleaseCatalog;
  locale: Locale;
}) {
  const copy = getCopy(locale);
  const { latestStable, latestPrerelease, previousReleases } =
    selectReleaseSections(catalog);

  return (
    <>
      <section
        className="spotlight-grid"
        aria-label={copy.featuredDownloadsAriaLabel}
      >
        {latestStable ? (
          <ReleaseSpotlightCard
            description={copy.stableDescription}
            locale={locale}
            release={latestStable}
            sectionLabel={copy.stableSectionLabel}
            sectionNumber="01"
            tone="stable"
          />
        ) : null}
        {latestPrerelease ? (
          <ReleaseSpotlightCard
            description={copy.previewDescription}
            locale={locale}
            release={latestPrerelease}
            sectionLabel={copy.previewSectionLabel}
            sectionNumber="02"
            tone="preview"
          />
        ) : null}
      </section>

      <ArchiveReleaseList locale={locale} releases={previousReleases} />
    </>
  );
}
```

```css
/* apps/downloads/src/index.css */
:root {
  color-scheme: light dark;
  font-family: "Avenir Next", "Segoe UI", sans-serif;
}

:root[data-theme="light"] {
  --page-bg: #e9eef0;
  --surface-bg: rgba(255, 252, 247, 0.92);
  --surface-border: rgba(54, 74, 92, 0.12);
  --text-primary: #17324a;
  --text-secondary: #587089;
  --accent: #d86d2f;
  --action-bg: #f6fbff;
  --action-text: #17324a;
}

:root[data-theme="dark"] {
  --page-bg: #09131b;
  --surface-bg: rgba(12, 21, 31, 0.86);
  --surface-border: rgba(166, 185, 204, 0.14);
  --text-primary: #ecf3fa;
  --text-secondary: #a2b4c6;
  --accent: #ff9f5a;
  --action-bg: rgba(24, 38, 52, 0.82);
  --action-text: #ecf3fa;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(216, 109, 47, 0.12), transparent 28%),
    radial-gradient(circle at top right, rgba(25, 118, 210, 0.1), transparent 24%),
    linear-gradient(180deg, var(--page-bg) 0%, color-mix(in srgb, var(--page-bg) 90%, #ffffff 10%) 100%);
  color: var(--text-primary);
}

.downloads-page {
  margin: 0 auto;
  max-width: 1240px;
  padding: 40px 20px 72px;
}

.hero,
.state-panel,
.spotlight-card,
.archive-section {
  border: 1px solid var(--surface-border);
  border-radius: 34px;
  background: var(--surface-bg);
  box-shadow: 0 24px 80px rgba(11, 18, 24, 0.12);
  backdrop-filter: blur(18px);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  padding: 36px 40px;
}

.spotlight-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  margin-top: 24px;
}

.archive-section {
  margin-top: 24px;
  padding: 28px;
}

@media (max-width: 720px) {
  .hero {
    grid-template-columns: 1fr;
    padding: 24px;
  }
}
```

- [ ] **Step 4: Run the full verification**

Run: `pnpm --filter @vocaport/downloads test && pnpm --filter @vocaport/downloads typecheck && pnpm --filter @vocaport/downloads build`

Expected:

- `Vitest` PASS
- `tsc` reports no type errors
- `vite build` completes successfully

- [ ] **Step 5: Commit**

```bash
git add apps/downloads/src/App.tsx apps/downloads/src/index.css apps/downloads/src/App.test.tsx
git commit -m "feat: refresh downloads page layout and themes"
```

## Self-Review Checklist

- **Spec coverage:** The plan includes the top action cluster, Stable / Preview / Archive hierarchy, system-following first theme, persistent dark-mode toggle, and unified loading / error / empty / filled shell.
- **Placeholder scan:** Do not leave `TODO`, `TBD`, or vague “style as needed” instructions in code or copy keys.
- **Type consistency:** Keep `Theme`, `DownloadsViewState`, and new copy-key names identical across `theme.ts`, `App.tsx`, `i18n.ts`, and tests.
