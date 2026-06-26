import type { PropsWithChildren } from "react";
import {
  formatBytes,
  formatReleaseDate,
  inferAssetLabel,
  selectReleaseSections,
} from "./catalog";
import type { ReleaseCatalog, ReleaseRecord } from "./types";

interface DownloadsPageProps {
  catalog: ReleaseCatalog;
}

export function DownloadsPage({ catalog }: DownloadsPageProps) {
  const { latestStable, latestPrerelease, previousReleases } =
    selectReleaseSections(catalog);

  if (!latestStable && !latestPrerelease && previousReleases.length === 0) {
    return (
      <PageFrame>
        <Hero />
        <EmptyState />
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <Hero />
      <section className="downloads-grid" aria-label="Featured downloads">
        {latestStable ? (
          <ReleaseCard
            heading="Latest stable release"
            release={latestStable}
            tone="stable"
          />
        ) : null}
        {latestPrerelease ? (
          <ReleaseCard
            heading="Latest prerelease"
            release={latestPrerelease}
            tone="preview"
          />
        ) : null}
      </section>

      <section className="history-section">
        <div className="section-heading">
          <p className="section-kicker">Archive</p>
          <h2>More downloads</h2>
          <p>
            Browse older stable releases and prerelease builds. Use release
            notes to inspect change history before installing.
          </p>
        </div>

        {previousReleases.length === 0 ? (
          <p className="section-note">
            No older public packages are available yet.
          </p>
        ) : (
          <div className="history-grid">
            {previousReleases.map((release) => (
              <ReleaseCard
                key={release.id}
                heading={release.tagName}
                release={release}
                tone={release.isPrerelease ? "preview" : "archive"}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="page-footer">
        <span>
          Generated from GitHub Releases for {catalog.owner}/{catalog.repo}
        </span>
        <span>Updated {formatReleaseDate(catalog.generatedAt)}</span>
      </footer>
    </PageFrame>
  );
}

function PageFrame({ children }: PropsWithChildren) {
  return <main className="downloads-page">{children}</main>;
}

function Hero() {
  return (
    <header className="hero">
      <p className="hero-kicker">VocaPort</p>
      <h1>Download builds from one place</h1>
      <p className="hero-copy">
        Grab the latest stable release, try the newest preview, or roll back to
        an older package without digging through release history by hand.
      </p>
    </header>
  );
}

function EmptyState() {
  return (
    <section className="empty-state">
      <h2>No downloadable packages yet.</h2>
      <p>
        Public GitHub Releases have not been published yet. This page will fill
        itself once release assets are attached.
      </p>
    </section>
  );
}

function ReleaseCard({
  heading,
  release,
  tone,
}: {
  heading: string;
  release: ReleaseRecord;
  tone: "stable" | "preview" | "archive";
}) {
  return (
    <section className={`release-card release-card--${tone}`}>
      <div className="release-card__header">
        <div>
          <p className="release-card__eyebrow">{heading}</p>
          <h2>{release.name}</h2>
        </div>
        <span className={`release-badge release-badge--${tone}`}>
          {release.isPrerelease ? "Prerelease" : "Release"}
        </span>
      </div>

      <p className="release-card__meta">
        <span>{release.tagName}</span>
        <span>{formatReleaseDate(release.publishedAt)}</span>
      </p>

      <div className="asset-list">
        {release.assets.map((asset) => (
          <a
            key={asset.id}
            className="asset-link"
            href={asset.downloadUrl}
            rel="noreferrer"
            target="_blank"
          >
            <span>{inferAssetLabel(asset)}</span>
            <span className="asset-link__meta">
              {formatBytes(asset.sizeBytes)} · {asset.downloadCount} downloads
            </span>
          </a>
        ))}
      </div>

      <div className="release-card__footer">
        <a
          className="release-notes-link"
          href={release.htmlUrl}
          rel="noreferrer"
          target="_blank"
        >
          Release notes
        </a>
      </div>
    </section>
  );
}
