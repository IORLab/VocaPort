import { useEffect, useState, type PropsWithChildren } from "react";
import {
  formatBytes,
  formatReleaseDate,
  inferAssetLabel,
  selectReleaseSections,
} from "./catalog";
import {
  getCopy,
  getLocalizedReleaseNotes,
  type Locale,
} from "./i18n";
import {
  getInitialTheme,
  persistTheme,
  toggleTheme,
  type Theme,
} from "./theme";
import type { ReleaseCatalog, ReleaseRecord } from "./types";

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

export function DownloadsExperience({
  state,
}: {
  state: DownloadsViewState;
}) {
  const [locale, setLocale] = useState<Locale>("en");
  const [theme, setTheme] = useState<Theme>(() =>
    getInitialTheme(getBrowserThemeDependencies()),
  );
  const copy = getCopy(locale);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const repository =
    state.status === "ready"
      ? { owner: state.catalog.owner, repo: state.catalog.repo }
      : FALLBACK_REPOSITORY;
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
            {copy.footerUpdatedPrefix}{" "}
            {formatReleaseDate(state.catalog.generatedAt, locale)}
          </span>
        </footer>
      ) : null}
    </PageFrame>
  );
}

export function DownloadsPage({ catalog }: DownloadsPageProps) {
  return <DownloadsExperience state={{ status: "ready", catalog }} />;
}

function PageFrame({ children }: PropsWithChildren) {
  return <main className="downloads-page">{children}</main>;
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
      />
    );
  }

  if (state.status === "error") {
    return (
      <StatePanel
        description={copy.errorDescription}
        detail={state.message}
        title={copy.errorTitle}
      />
    );
  }

  const { latestStable, latestPrerelease, previousReleases } =
    selectReleaseSections(state.catalog);

  if (!latestStable && !latestPrerelease && previousReleases.length === 0) {
    return (
      <StatePanel
        description={copy.emptyDescription}
        title={copy.emptyTitle}
      />
    );
  }

  return (
    <FilledState
      latestPrerelease={latestPrerelease}
      latestStable={latestStable}
      locale={locale}
      previousReleases={previousReleases}
    />
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
      <div className="hero__content">
        <p className="hero-kicker">{copy.heroEyebrow}</p>
        <h1>{copy.heroTitle}</h1>
        <p className="hero-copy">{copy.heroDescription}</p>
      </div>

      <div className="hero__actions">
        <div className="hero__action-row">
          <a
            className="hero-action hero-action--link"
            href={githubReleasesUrl}
            rel="noreferrer"
            target="_blank"
          >
            {copy.githubReleasesButton}
          </a>
          <ThemeToggle
            locale={locale}
            onToggle={onThemeToggle}
            theme={theme}
          />
        </div>

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
      className="hero-action theme-toggle"
      onClick={onToggle}
      type="button"
    >
      {actionLabel}
    </button>
  );
}

function StatePanel({
  description,
  detail,
  title,
}: {
  description: string;
  detail?: string;
  title: string;
}) {
  return (
    <section className="status-screen state-panel">
      <p className="section-kicker">State</p>
      <h2>{title}</h2>
      <p>{description}</p>
      {detail ? <p className="state-panel__detail">{detail}</p> : null}
    </section>
  );
}

function FilledState({
  latestPrerelease,
  latestStable,
  locale,
  previousReleases,
}: {
  latestPrerelease?: ReleaseRecord;
  latestStable?: ReleaseRecord;
  locale: Locale;
  previousReleases: ReleaseRecord[];
}) {
  const copy = getCopy(locale);

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

function ReleaseSpotlightCard({
  description,
  locale,
  release,
  sectionLabel,
  sectionNumber,
  tone,
}: {
  description: string;
  locale: Locale;
  release: ReleaseRecord;
  sectionLabel: string;
  sectionNumber: string;
  tone: "stable" | "preview";
}) {
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const copy = getCopy(locale);
  const localizedReleaseNotes = getLocalizedReleaseNotes(
    release.releaseNotesMarkdown,
    locale,
  );

  return (
    <section className={`spotlight-card spotlight-card--${tone}`}>
      <div className="spotlight-card__header">
        <div className="spotlight-card__section">
          <span className="spotlight-card__number">{sectionNumber}</span>
          <div className="spotlight-card__heading-group">
            <h2>{sectionLabel}</h2>
            <p className="spotlight-card__description">{description}</p>
          </div>
        </div>
        <span className={`release-badge release-badge--${tone}`}>
          {release.isPrerelease ? copy.prereleaseBadge : copy.releaseBadge}
        </span>
      </div>

      <div className="spotlight-card__release">
        <h3 className="spotlight-card__release-name">{release.name}</h3>
      </div>

      <p className="release-card__meta">
        <span>{release.tagName}</span>
        <span>{formatReleaseDate(release.publishedAt, locale)}</span>
      </p>

      <ReleaseAssetList locale={locale} release={release} />
      <ReleaseCardActions
        isReleaseNotesOpen={isReleaseNotesOpen}
        locale={locale}
        onToggleReleaseNotes={() => setIsReleaseNotesOpen((value) => !value)}
        release={release}
      />

      {isReleaseNotesOpen ? (
        <div className="release-notes-panel">
          {localizedReleaseNotes ? (
            <ReleaseNotesBody markdown={localizedReleaseNotes} />
          ) : (
            <p className="release-notes-empty">{copy.releaseNotesEmpty}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ArchiveReleaseList({
  locale,
  releases,
}: {
  locale: Locale;
  releases: ReleaseRecord[];
}) {
  const copy = getCopy(locale);

  return (
    <section className="archive-section">
      <div className="archive-section__header">
        <p className="section-kicker">{copy.archiveKicker}</p>
        <h2>{copy.moreDownloads}</h2>
        <p>{copy.archiveDescription}</p>
      </div>

      {releases.length === 0 ? (
        <p className="section-note">{copy.noOlderPackages}</p>
      ) : (
        <div className="archive-list">
          {releases.map((release) => (
            <ArchiveReleaseCard
              key={release.id}
              locale={locale}
              release={release}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ArchiveReleaseCard({
  locale,
  release,
}: {
  locale: Locale;
  release: ReleaseRecord;
}) {
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const localizedReleaseNotes = getLocalizedReleaseNotes(
    release.releaseNotesMarkdown,
    locale,
  );
  const copy = getCopy(locale);

  return (
    <article className="archive-card">
      <div className="archive-card__header">
        <div>
          <p className="archive-card__tag">{release.tagName}</p>
          <h3>{release.name}</h3>
        </div>
        <span className="archive-card__date">
          {formatReleaseDate(release.publishedAt, locale)}
        </span>
      </div>

      <ReleaseAssetList locale={locale} release={release} />
      <ReleaseCardActions
        isReleaseNotesOpen={isReleaseNotesOpen}
        locale={locale}
        onToggleReleaseNotes={() => setIsReleaseNotesOpen((value) => !value)}
        release={release}
      />

      {isReleaseNotesOpen ? (
        <div className="release-notes-panel release-notes-panel--archive">
          {localizedReleaseNotes ? (
            <ReleaseNotesBody markdown={localizedReleaseNotes} />
          ) : (
            <p className="release-notes-empty">{copy.releaseNotesEmpty}</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function ReleaseAssetList({
  locale,
  release,
}: {
  locale: Locale;
  release: ReleaseRecord;
}) {
  return (
    <div className="asset-list">
      {release.assets.map((asset) => {
        const assetLabel = inferAssetLabel(asset, locale);

        return (
          <a
            key={asset.id}
            aria-label={assetLabel}
            className="asset-link"
            href={asset.downloadUrl}
            rel="noreferrer"
            target="_blank"
          >
            <span>{assetLabel}</span>
            <span className="asset-link__meta">
              {formatBytes(asset.sizeBytes)} · {asset.downloadCount}
              {locale === "zh" ? " 次下载" : " downloads"}
            </span>
          </a>
        );
      })}
    </div>
  );
}

function ReleaseCardActions({
  isReleaseNotesOpen,
  locale,
  onToggleReleaseNotes,
  release,
}: {
  isReleaseNotesOpen: boolean;
  locale: Locale;
  onToggleReleaseNotes: () => void;
  release: ReleaseRecord;
}) {
  const copy = getCopy(locale);

  return (
    <div className="release-card__footer">
      <button
        aria-expanded={isReleaseNotesOpen}
        className="release-notes-button"
        onClick={onToggleReleaseNotes}
        type="button"
      >
        {copy.releaseNotesButton}
      </button>
      <a
        className="release-notes-link"
        href={release.htmlUrl}
        rel="noreferrer"
        target="_blank"
      >
        {copy.viewOnGitHub}
      </a>
    </div>
  );
}

function ReleaseNotesBody({ markdown }: { markdown: string }) {
  const blocks = parseMarkdownBlocks(markdown);

  return (
    <div className="release-notes-body">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h3 key={`${block.kind}-${index}`} className="release-notes-heading">
              {block.text}
            </h3>
          );
        }

        if (block.kind === "list") {
          return (
            <ul key={`${block.kind}-${index}`} className="release-notes-list">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }

        if (block.kind === "divider") {
          return <hr key={`${block.kind}-${index}`} className="release-notes-divider" />;
        }

        return (
          <p key={`${block.kind}-${index}`} className="release-notes-paragraph">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

type MarkdownBlock =
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "divider" }
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
