import { useEffect, useState, type PropsWithChildren } from "react";
import {
  formatBytes,
  formatGeneratedAt,
  formatPublishedAt,
  inferAssetPlatformLabel,
  selectReleaseSections,
} from "./catalog";
import { getCopy, getLocalizedReleaseNotes, type Locale } from "./i18n";
import {
  getInitialTheme,
  persistTheme,
  toggleTheme,
  type StorageLike,
  type Theme,
} from "./theme";
import type { ReleaseAsset, ReleaseCatalog, ReleaseRecord } from "./types";

interface DownloadsPageProps {
  catalog: ReleaseCatalog;
}

export type DownloadsViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; catalog: ReleaseCatalog };

const FALLBACK_REPOSITORY = {
  owner: "IORLab",
  repo: "VocaPort",
} as const;

const LOCALE_STORAGE_KEY = "vocaport-downloads-locale";

type ReleaseTab = "downloads" | "notes";
type ReleaseKind = "release" | "prerelease";

function getBrowserThemeDependencies() {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    storage: window.localStorage,
    matchMedia:
      typeof window.matchMedia === "function"
        ? window.matchMedia.bind(window)
        : undefined,
  };
}

function getStoredLocale(storage?: StorageLike): Locale | null {
  if (!storage) {
    return null;
  }

  try {
    const locale = storage.getItem(LOCALE_STORAGE_KEY);
    return locale === "zh" || locale === "en" ? locale : null;
  } catch (error) {
    console.warn("Failed to read the downloads locale preference.", error);
    return null;
  }
}

function getInitialLocale(storage?: StorageLike): Locale {
  return getStoredLocale(storage) ?? "en";
}

function persistLocale(locale: Locale, storage?: StorageLike) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch (error) {
    console.warn("Failed to persist the downloads locale preference.", error);
  }
}

export function DownloadsExperience({
  state,
}: {
  state: DownloadsViewState;
}) {
  const browserDeps = getBrowserThemeDependencies();
  const [locale, setLocale] = useState<Locale>(() =>
    getInitialLocale(browserDeps.storage),
  );
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme(browserDeps));
  const copy = getCopy(locale);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale, theme]);

  const repository =
    state.status === "ready"
      ? { owner: state.catalog.owner, repo: state.catalog.repo }
      : FALLBACK_REPOSITORY;
  const githubReleasesUrl = `https://github.com/${repository.owner}/${repository.repo}/releases`;
  const generatedAt =
    state.status === "ready"
      ? formatGeneratedAt(state.catalog.generatedAt, locale)
      : "";

  const handleThemeToggle = () => {
    setTheme((currentTheme) => {
      const nextTheme = toggleTheme(currentTheme);

      if (typeof window !== "undefined") {
        persistTheme(nextTheme, window.localStorage);
      }

      return nextTheme;
    });
  };

  const handleLocaleChange = (nextLocale: Locale) => {
    setLocale(nextLocale);

    if (typeof window !== "undefined") {
      persistLocale(nextLocale, window.localStorage);
    }
  };

  return (
    <PageFrame>
      <Hero
        githubReleasesUrl={githubReleasesUrl}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        onThemeToggle={handleThemeToggle}
        theme={theme}
      />
      <PageBody locale={locale} state={state} />
      <footer className="site-footer">
        <span>{copy.footerLabel}</span>
        <time>{generatedAt}</time>
      </footer>
    </PageFrame>
  );
}

export function DownloadsPage({ catalog }: DownloadsPageProps) {
  return <DownloadsExperience state={{ status: "ready", catalog }} />;
}

function PageFrame({ children }: PropsWithChildren) {
  return <main className="site-shell">{children}</main>;
}

function PageBody({
  locale,
  state,
}: {
  locale: Locale;
  state: DownloadsViewState;
}) {
  const copy = getCopy(locale);
  const sections =
    state.status === "ready"
      ? selectReleaseSections(state.catalog)
      : { prerelease: [], release: [] };

  return (
    <div className="board">
      <ReleaseSection
        description={copy.releaseSectionDescription}
        number="01"
        title={copy.releaseSectionTitle}
      >
        <ReleaseSectionContent
          kind="release"
          locale={locale}
          releases={sections.release}
          state={state}
        />
      </ReleaseSection>
      <ReleaseSection
        description={copy.prereleaseSectionDescription}
        number="02"
        tone="secondary"
        title={copy.prereleaseSectionTitle}
      >
        <ReleaseSectionContent
          kind="prerelease"
          locale={locale}
          releases={sections.prerelease}
          state={state}
        />
      </ReleaseSection>
    </div>
  );
}

function ReleaseSection({
  children,
  description,
  number,
  tone = "primary",
  title,
}: PropsWithChildren<{
  description: string;
  number: string;
  tone?: "primary" | "secondary";
  title: string;
}>) {
  return (
    <section
      className={`release-section${tone === "secondary" ? " release-section--secondary" : ""}`}
    >
      <div className="release-section__header">
        <p className="release-section__eyebrow">{number}</p>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ReleaseSectionContent({
  kind,
  locale,
  releases,
  state,
}: {
  kind: ReleaseKind;
  locale: Locale;
  releases: ReleaseRecord[];
  state: DownloadsViewState;
}) {
  const copy = getCopy(locale);

  if (state.status === "loading") {
    return kind === "release" ? (
      <p className="empty-state">{copy.loading}</p>
    ) : (
      <div className="release-section__list" />
    );
  }

  if (state.status === "error") {
    return kind === "release" ? (
      <div className="error-state">
        <strong>{copy.errorTitle}</strong>
        <p>{copy.errorBody}</p>
      </div>
    ) : (
      <div className="release-section__list" />
    );
  }

  if (releases.length === 0) {
    return (
      <p className="empty-state">
        {kind === "release"
          ? copy.emptyReleaseSection
          : copy.emptyPrereleaseSection}
      </p>
    );
  }

  return (
    <div className="release-section__list">
      {releases.map((release) => (
        <ReleaseCard key={release.id} locale={locale} release={release} />
      ))}
    </div>
  );
}

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
      <div className="hero__copy">
        <p className="hero__eyebrow">{copy.heroEyebrow}</p>
        <h1 className="hero__title">{copy.heroTitle}</h1>
        <p className="hero__subtitle">{copy.heroSubtitle}</p>
      </div>
      <div className="hero__tools">
        <a
          className="hero__repo-link"
          href={githubReleasesUrl}
          rel="noreferrer"
          target="_blank"
        >
          {copy.githubReleasesButton}
        </a>
        <div className="hero__controls">
          <ThemeToggle
            locale={locale}
            onToggle={onThemeToggle}
            theme={theme}
          />
          <div
            className="locale-switch"
            aria-label={copy.languageSwitcherLabel}
            role="group"
          >
            <button
              aria-pressed={locale === "zh"}
              className="locale-switch__button"
              data-active={locale === "zh" ? "true" : "false"}
              onClick={() => onLocaleChange("zh")}
              type="button"
            >
              中文
            </button>
            <button
              aria-pressed={locale === "en"}
              className="locale-switch__button"
              data-active={locale === "en" ? "true" : "false"}
              onClick={() => onLocaleChange("en")}
              type="button"
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function ThemeToggle({
  locale,
  onToggle,
  theme,
}: {
  locale: Locale;
  onToggle: () => void;
  theme: Theme;
}) {
  const copy = getCopy(locale);
  const actionLabel =
    theme === "dark" ? copy.themeToggleToLight : copy.themeToggleToDark;

  return (
    <button
      aria-label={actionLabel}
      className="hero__icon-button"
      onClick={onToggle}
      type="button"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function ReleaseCard({
  locale,
  release,
}: {
  locale: Locale;
  release: ReleaseRecord;
}) {
  const [activeTab, setActiveTab] = useState<ReleaseTab>("downloads");
  const copy = getCopy(locale);
  const localizedReleaseNotes = getLocalizedReleaseNotes(
    release.releaseNotesMarkdown,
    locale,
  );

  return (
    <details className="release-card">
      <summary className="release-card__summary">
        <div className="release-card__heading">
          <h3 className="release-card__title">{release.name}</h3>
          <p className="release-card__version">{release.tagName}</p>
        </div>
        <div className="release-card__summary-meta">
          <span className="release-card__published">
            {copy.publishedAtLabel}:{" "}
            {formatPublishedAt(
              release.publishedAt,
              locale,
              copy.unknownPublishedAt,
            )}
          </span>
        </div>
      </summary>

      <div className="release-card__body">
        <div className="release-card__body-actions">
          <a
            className="release-card__release-link"
            href={release.htmlUrl}
            rel="noreferrer"
            target="_blank"
          >
            {copy.openRelease}
          </a>
        </div>

        <div className="release-card__tabs" role="tablist" aria-label={release.name}>
          <button
            aria-selected={activeTab === "downloads"}
            className="release-card__tab"
            data-active={activeTab === "downloads" ? "true" : "false"}
            onClick={() => setActiveTab("downloads")}
            role="tab"
            type="button"
          >
            {copy.downloadsTab}
          </button>
          <button
            aria-selected={activeTab === "notes"}
            className="release-card__tab"
            data-active={activeTab === "notes" ? "true" : "false"}
            onClick={() => setActiveTab("notes")}
            role="tab"
            type="button"
          >
            {copy.releaseNotesTab}
          </button>
        </div>

        <div
          className="release-card__panel"
          data-tab-panel="downloads"
          hidden={activeTab !== "downloads"}
          role="tabpanel"
        >
          <h4 className="release-card__section-heading">{copy.downloadsTab}</h4>
          <ReleaseAssetList locale={locale} release={release} />
        </div>

        <div
          className="release-card__panel"
          data-tab-panel="notes"
          hidden={activeTab !== "notes"}
          role="tabpanel"
        >
          <h4 className="release-card__section-heading">
            {copy.releaseNotesTab}
          </h4>
          {localizedReleaseNotes ? (
            <ReleaseNotesBody markdown={localizedReleaseNotes} />
          ) : (
            <p className="release-card__notes release-card__notes--empty">
              {copy.releaseNotesEmpty}
            </p>
          )}
        </div>
      </div>
    </details>
  );
}

function ReleaseAssetList({
  locale,
  release,
}: {
  locale: Locale;
  release: ReleaseRecord;
}) {
  const copy = getCopy(locale);

  return (
    <ul className="asset-list">
      {release.assets.map((asset) => (
        <ReleaseAssetItem
          key={asset.id}
          asset={asset}
          downloadAction={copy.downloadAction}
          locale={locale}
        />
      ))}
    </ul>
  );
}

function ReleaseAssetItem({
  asset,
  downloadAction,
  locale,
}: {
  asset: ReleaseAsset;
  downloadAction: string;
  locale: Locale;
}) {
  return (
    <li className="asset-item">
      <div className="asset-item__meta">
        <span className="asset-item__platform">
          {inferAssetPlatformLabel(asset, locale)}
        </span>
        <span className="asset-item__name">{asset.name}</span>
      </div>
      <div className="asset-item__actions">
        <span className="asset-item__size">
          {formatBytes(asset.sizeBytes, locale)}
        </span>
        <a
          className="asset-item__link"
          href={asset.downloadUrl}
          rel="noreferrer"
          target="_blank"
        >
          {downloadAction}
        </a>
      </div>
    </li>
  );
}

function ReleaseNotesBody({ markdown }: { markdown: string }) {
  const blocks = parseMarkdownBlocks(markdown);

  return (
    <div className="release-card__notes">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h5 key={`${block.kind}-${index}`} className="release-card__notes-heading">
              {block.text}
            </h5>
          );
        }

        if (block.kind === "list") {
          return (
            <ul key={`${block.kind}-${index}`} className="release-card__notes-list">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }

        if (block.kind === "divider") {
          return <hr key={`${block.kind}-${index}`} className="release-card__notes-divider" />;
        }

        return (
          <p key={`${block.kind}-${index}`} className="release-card__notes-paragraph">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

type MarkdownBlock =
  | { kind: "divider" }
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const blocks: MarkdownBlock[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line === "---") {
      blocks.push({ kind: "divider" });
      continue;
    }

    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);

    if (headingMatch) {
      blocks.push({ kind: "heading", text: headingMatch[1] });
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [line.slice(2).trim()];

      while (index + 1 < lines.length && lines[index + 1].startsWith("- ")) {
        index += 1;
        items.push(lines[index].slice(2).trim());
      }

      blocks.push({ kind: "list", items });
      continue;
    }

    const paragraphLines = [line];

    while (
      index + 1 < lines.length &&
      lines[index + 1] !== "---" &&
      !lines[index + 1].startsWith("- ") &&
      !/^#{1,6}\s+(.+)$/.test(lines[index + 1])
    ) {
      index += 1;
      paragraphLines.push(lines[index]);
    }

    blocks.push({ kind: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.5 1.5M6.8 17.2l-1.5 1.5M18.7 18.7l-1.5-1.5M6.8 6.8 5.3 5.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
