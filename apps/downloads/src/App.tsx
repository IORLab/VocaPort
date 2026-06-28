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
type DevicePlatform = "android" | "ios" | "linux" | "macos" | "windows";
type DeviceArchitecture = "arm64" | "intel" | "universal" | "x64";

interface CurrentDeviceDescriptor {
  architecture: DeviceArchitecture | null;
  platform: DevicePlatform;
}

interface NavigatorUserAgentDataHighEntropyValues {
  architecture?: string;
  bitness?: string;
  platform?: string;
}

interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: {
    mobile?: boolean;
    platform?: string;
    getHighEntropyValues?: (
      hints: string[],
    ) => Promise<NavigatorUserAgentDataHighEntropyValues>;
  };
}

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

async function detectCurrentDevice(): Promise<CurrentDeviceDescriptor | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const navigator = window.navigator as NavigatorWithUserAgentData;
  const platform = inferCurrentPlatform({
    platformHint: navigator.userAgentData?.platform,
    platformValue: navigator.platform,
    userAgent: navigator.userAgent,
  });

  if (!platform) {
    return null;
  }

  let architecture = inferCurrentArchitecture({
    platform,
    platformValue: navigator.platform,
    userAgent: navigator.userAgent,
  });

  if (typeof navigator.userAgentData?.getHighEntropyValues === "function") {
    try {
      const values = await navigator.userAgentData.getHighEntropyValues([
        "architecture",
        "bitness",
        "platform",
      ]);

      architecture =
        normalizeCurrentArchitecture(
          platform,
          values.architecture,
          values.bitness,
        ) ?? architecture;
    } catch (error) {
      console.warn("Failed to detect the current device architecture.", error);
    }
  }

  return {
    architecture,
    platform,
  };
}

function inferCurrentPlatform({
  platformHint,
  platformValue,
  userAgent,
}: {
  platformHint?: string;
  platformValue?: string;
  userAgent?: string;
}): DevicePlatform | null {
  const normalizedHint = `${platformHint ?? ""} ${platformValue ?? ""} ${userAgent ?? ""}`
    .toLowerCase();

  if (
    normalizedHint.includes("iphone") ||
    normalizedHint.includes("ipad") ||
    normalizedHint.includes("ipod") ||
    normalizedHint.includes("ios")
  ) {
    return "ios";
  }

  if (normalizedHint.includes("android")) {
    return "android";
  }

  if (normalizedHint.includes("win")) {
    return "windows";
  }

  if (normalizedHint.includes("mac")) {
    return "macos";
  }

  if (normalizedHint.includes("linux") || normalizedHint.includes("x11")) {
    return "linux";
  }

  return null;
}

function inferCurrentArchitecture({
  platform,
  platformValue,
  userAgent,
}: {
  platform: DevicePlatform;
  platformValue?: string;
  userAgent?: string;
}): DeviceArchitecture | null {
  const normalizedHint = `${platformValue ?? ""} ${userAgent ?? ""}`.toLowerCase();

  if (
    normalizedHint.includes("arm64") ||
    normalizedHint.includes("aarch64") ||
    normalizedHint.includes("apple silicon")
  ) {
    return "arm64";
  }

  if (platform === "macos" && normalizedHint.includes("intel")) {
    return "intel";
  }

  if (
    normalizedHint.includes("x64") ||
    normalizedHint.includes("x86_64") ||
    normalizedHint.includes("amd64") ||
    normalizedHint.includes("win64") ||
    normalizedHint.includes("wow64")
  ) {
    return platform === "macos" ? "intel" : "x64";
  }

  return null;
}

function normalizeCurrentArchitecture(
  platform: DevicePlatform,
  architecture?: string,
  bitness?: string,
): DeviceArchitecture | null {
  const normalizedArchitecture = architecture?.toLowerCase() ?? "";

  if (
    normalizedArchitecture.includes("arm") ||
    normalizedArchitecture.includes("aarch64")
  ) {
    return "arm64";
  }

  if (
    normalizedArchitecture.includes("x86") ||
    normalizedArchitecture.includes("x64") ||
    normalizedArchitecture.includes("amd64")
  ) {
    return platform === "macos" ? "intel" : bitness === "64" ? "x64" : null;
  }

  if (normalizedArchitecture.includes("universal")) {
    return "universal";
  }

  return null;
}

function selectCurrentDeviceAssetId(
  assets: ReleaseAsset[],
  currentDevice: CurrentDeviceDescriptor | null,
): number | null {
  if (!currentDevice) {
    return null;
  }

  const samePlatformAssets = assets.filter(
    (asset) => inferAssetPlatform(asset) === currentDevice.platform,
  );

  if (samePlatformAssets.length === 0) {
    return null;
  }

  if (
    currentDevice.architecture === null &&
    currentDevice.platform === "macos" &&
    new Set(
      samePlatformAssets
        .map((asset) => inferAssetArchitecture(asset.name))
        .filter((architecture): architecture is DeviceArchitecture => architecture !== null),
    ).size > 1
  ) {
    return null;
  }

  const rankedAssets = samePlatformAssets
    .map((asset) => ({
      asset,
      score: scoreAssetForCurrentDevice(asset, currentDevice),
    }))
    .filter((candidate) => candidate.score >= 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.asset.name.localeCompare(right.asset.name),
    );

  return rankedAssets[0]?.asset.id ?? null;
}

function scoreAssetForCurrentDevice(
  asset: ReleaseAsset,
  currentDevice: CurrentDeviceDescriptor,
) {
  const assetArchitecture = inferAssetArchitecture(asset.name);
  let score = inferAssetFormatPriority(asset.name);

  if (currentDevice.platform === "android") {
    return score + (assetArchitecture === "universal" ? 20 : 10);
  }

  if (currentDevice.platform === "ios") {
    return -1;
  }

  if (currentDevice.architecture && assetArchitecture) {
    if (assetArchitecture === currentDevice.architecture) {
      score += 30;
    } else if (assetArchitecture === "universal") {
      score += 18;
    } else {
      return -1;
    }
  }

  return score;
}

function inferAssetPlatform(asset: ReleaseAsset): DevicePlatform | null {
  const normalizedName = asset.name.toLowerCase();

  if (
    normalizedName.endsWith(".apk") ||
    asset.contentType === "application/vnd.android.package-archive"
  ) {
    return "android";
  }

  if (normalizedName.endsWith(".dmg") || normalizedName.endsWith(".pkg")) {
    return "macos";
  }

  if (normalizedName.endsWith(".msi") || normalizedName.endsWith(".exe")) {
    return "windows";
  }

  if (
    normalizedName.endsWith(".appimage") ||
    normalizedName.endsWith(".deb") ||
    normalizedName.endsWith(".rpm")
  ) {
    return "linux";
  }

  return null;
}

function inferAssetArchitecture(name: string): DeviceArchitecture | null {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("-universal")) {
    return "universal";
  }

  if (normalizedName.includes("-intel")) {
    return "intel";
  }

  if (
    normalizedName.includes("-arm64") ||
    normalizedName.includes("-aarch64")
  ) {
    return "arm64";
  }

  if (
    normalizedName.includes("-x64") ||
    normalizedName.includes("-x86_64") ||
    normalizedName.includes("-amd64")
  ) {
    return "x64";
  }

  return null;
}

function inferAssetFormatPriority(name: string) {
  const normalizedName = name.toLowerCase();

  if (normalizedName.endsWith(".apk")) {
    return 60;
  }

  if (normalizedName.endsWith(".dmg")) {
    return 50;
  }

  if (normalizedName.endsWith(".pkg")) {
    return 40;
  }

  if (normalizedName.endsWith(".exe")) {
    return 60;
  }

  if (normalizedName.endsWith(".msi")) {
    return 45;
  }

  if (normalizedName.endsWith(".appimage")) {
    return 60;
  }

  if (normalizedName.endsWith(".deb")) {
    return 45;
  }

  if (normalizedName.endsWith(".rpm")) {
    return 40;
  }

  return 0;
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
  const [currentDevice, setCurrentDevice] =
    useState<CurrentDeviceDescriptor | null>(null);
  const copy = getCopy(locale);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale, theme]);

  useEffect(() => {
    let cancelled = false;

    void detectCurrentDevice().then((device) => {
      if (!cancelled) {
        setCurrentDevice(device);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
      <PageBody currentDevice={currentDevice} locale={locale} state={state} />
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
  currentDevice,
  locale,
  state,
}: {
  currentDevice: CurrentDeviceDescriptor | null;
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
          currentDevice={currentDevice}
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
          currentDevice={currentDevice}
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
  currentDevice,
  kind,
  locale,
  releases,
  state,
}: {
  currentDevice: CurrentDeviceDescriptor | null;
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
        <ReleaseCard
          key={release.id}
          currentDevice={currentDevice}
          locale={locale}
          release={release}
        />
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
  currentDevice,
  locale,
  release,
}: {
  currentDevice: CurrentDeviceDescriptor | null;
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
          <ReleaseAssetList
            currentDevice={currentDevice}
            locale={locale}
            release={release}
          />
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
  currentDevice,
  locale,
  release,
}: {
  currentDevice: CurrentDeviceDescriptor | null;
  locale: Locale;
  release: ReleaseRecord;
}) {
  const currentDeviceAssetId = selectCurrentDeviceAssetId(
    release.assets,
    currentDevice,
  );

  return (
    <ul className="asset-list">
      {release.assets.map((asset) => (
        <ReleaseAssetItem
          key={asset.id}
          asset={asset}
          isCurrentDevice={asset.id === currentDeviceAssetId}
          locale={locale}
        />
      ))}
    </ul>
  );
}

function ReleaseAssetItem({
  asset,
  isCurrentDevice,
  locale,
}: {
  asset: ReleaseAsset;
  isCurrentDevice: boolean;
  locale: Locale;
}) {
  const copy = getCopy(locale);

  return (
    <li
      className="asset-item"
      data-current-device={isCurrentDevice ? "true" : undefined}
    >
      <div className="asset-item__meta">
        <div className="asset-item__platform-row">
          <span className="asset-item__platform">
            {inferAssetPlatformLabel(asset, locale)}
          </span>
          {isCurrentDevice ? (
            <span className="asset-item__badge">{copy.currentDeviceBadge}</span>
          ) : null}
        </div>
        <span className="asset-item__name">{asset.name}</span>
      </div>
      <div className="asset-item__actions">
        <span className="asset-item__size">
          {formatBytes(asset.sizeBytes, locale)}
        </span>
        <a
          className="asset-item__link"
          data-current-device={isCurrentDevice ? "true" : undefined}
          href={asset.downloadUrl}
          rel="noreferrer"
          target="_blank"
        >
          {copy.downloadAction}
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
