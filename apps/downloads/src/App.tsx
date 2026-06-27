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
import { getInitialTheme, type Theme } from "./theme";
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
  const [theme] = useState<Theme>(() =>
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

  return (
    <PageFrame>
      <Hero
        githubReleasesUrl={githubReleasesUrl}
        locale={locale}
        onLocaleChange={setLocale}
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
    <>
      <section
        className="downloads-grid"
        aria-label={copy.featuredDownloadsAriaLabel}
      >
        {latestStable ? (
          <ReleaseCard
            heading={copy.latestStable}
            locale={locale}
            release={latestStable}
            tone="stable"
          />
        ) : null}
        {latestPrerelease ? (
          <ReleaseCard
            heading={copy.latestPrerelease}
            locale={locale}
            release={latestPrerelease}
            tone="preview"
          />
        ) : null}
      </section>

      <section className="history-section">
        <div className="section-heading">
          <p className="section-kicker">{copy.archiveKicker}</p>
          <h2>{copy.moreDownloads}</h2>
          <p>{copy.archiveDescription}</p>
        </div>

        {previousReleases.length === 0 ? (
          <p className="section-note">{copy.noOlderPackages}</p>
        ) : (
          <div className="history-grid">
            {previousReleases.map((release) => (
              <ReleaseCard
                key={release.id}
                heading={release.tagName}
                locale={locale}
                release={release}
                tone={release.isPrerelease ? "preview" : "archive"}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Hero({
  githubReleasesUrl,
  locale,
  onLocaleChange,
}: {
  githubReleasesUrl: string;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}) {
  const copy = getCopy(locale);

  return (
    <header className="hero">
      <div className="hero__topbar">
        <p className="hero-kicker">{copy.heroEyebrow}</p>
        <div
          className="locale-switcher"
          aria-label={copy.languageSwitcherLabel}
          role="group"
        >
          <a
            className="release-notes-link"
            href={githubReleasesUrl}
            rel="noreferrer"
            target="_blank"
          >
            {copy.githubReleasesButton}
          </a>
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
      <h1>{copy.heroTitle}</h1>
      <p className="hero-copy">{copy.heroDescription}</p>
    </header>
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
      <h2>{title}</h2>
      <p>{description}</p>
      {detail ? <p>{detail}</p> : null}
    </section>
  );
}

function ReleaseCard({
  heading,
  locale,
  release,
  tone,
}: {
  heading: string;
  locale: Locale;
  release: ReleaseRecord;
  tone: "stable" | "preview" | "archive";
}) {
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const copy = getCopy(locale);
  const localizedReleaseNotes = getLocalizedReleaseNotes(
    release.releaseNotesMarkdown,
    locale,
  );

  return (
    <section className={`release-card release-card--${tone}`}>
      <div className="release-card__header">
        <div>
          <p className="release-card__eyebrow">{heading}</p>
          <h2>{release.name}</h2>
        </div>
        <span className={`release-badge release-badge--${tone}`}>
          {release.isPrerelease ? copy.prereleaseBadge : copy.releaseBadge}
        </span>
      </div>

      <p className="release-card__meta">
        <span>{release.tagName}</span>
        <span>{formatReleaseDate(release.publishedAt, locale)}</span>
      </p>

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

      <div className="release-card__footer">
        <button
          aria-expanded={isReleaseNotesOpen}
          className="release-notes-button"
          onClick={() => setIsReleaseNotesOpen((value) => !value)}
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
