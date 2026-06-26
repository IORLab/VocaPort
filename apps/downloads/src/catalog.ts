import type { Locale } from "./i18n";
import type { ReleaseAsset, ReleaseCatalog, ReleaseRecord } from "./types";

export interface ReleaseSections {
  latestStable?: ReleaseRecord;
  latestPrerelease?: ReleaseRecord;
  previousReleases: ReleaseRecord[];
}

export function loadReleaseCatalog(url: string) {
  return fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load release catalog: ${response.status}`);
    }

    return (await response.json()) as ReleaseCatalog;
  });
}

export function selectReleaseSections(catalog: ReleaseCatalog): ReleaseSections {
  const releases = [...catalog.releases]
    .filter((release) => release.assets.length > 0)
    .sort(sortByPublishedAtDesc);

  const latestStable = releases.find((release) => !release.isPrerelease);
  const latestPrerelease = releases.find((release) => release.isPrerelease);

  return {
    latestStable,
    latestPrerelease,
    previousReleases: releases.filter(
      (release) =>
        release.id !== latestStable?.id &&
        release.id !== latestPrerelease?.id,
    ),
  };
}

export function inferAssetLabel(asset: ReleaseAsset, locale: Locale) {
  const normalizedName = asset.name.toLowerCase();
  const architectureLabel = inferAssetArchitectureLabel(normalizedName, locale);

  if (
    normalizedName.endsWith(".apk") ||
    asset.contentType === "application/vnd.android.package-archive"
  ) {
    return buildPlatformAssetLabel({
      architectureLabel,
      formatLabel: "APK",
      isBeta: normalizedName.includes("beta"),
      locale,
      platformLabel: "Android",
    });
  }

  if (normalizedName.endsWith(".dmg")) {
    return buildPlatformAssetLabel({
      architectureLabel,
      formatLabel: "DMG",
      locale,
      platformLabel: "macOS",
    });
  }

  if (normalizedName.endsWith(".pkg")) {
    return buildPlatformAssetLabel({
      architectureLabel,
      formatLabel: "PKG",
      locale,
      platformLabel: "macOS",
    });
  }

  if (normalizedName.endsWith(".msi")) {
    return buildPlatformAssetLabel({
      architectureLabel,
      formatLabel: "MSI",
      locale,
      platformLabel: "Windows",
    });
  }

  if (normalizedName.endsWith(".exe")) {
    return buildPlatformAssetLabel({
      architectureLabel,
      formatLabel: "EXE",
      locale,
      platformLabel: "Windows",
    });
  }

  if (normalizedName.endsWith(".appimage")) {
    return buildPlatformAssetLabel({
      architectureLabel,
      formatLabel: "AppImage",
      locale,
      platformLabel: "Linux",
    });
  }

  if (normalizedName.endsWith(".deb")) {
    return buildPlatformAssetLabel({
      architectureLabel,
      formatLabel: "DEB",
      locale,
      platformLabel: "Linux",
    });
  }

  if (normalizedName.endsWith(".rpm")) {
    return buildPlatformAssetLabel({
      architectureLabel,
      formatLabel: "RPM",
      locale,
      platformLabel: "Linux",
    });
  }

  if (normalizedName.endsWith(".zip")) {
    return locale === "zh" ? "下载 ZIP 压缩包" : "Download ZIP archive";
  }

  if (normalizedName.endsWith(".tar.gz") || normalizedName.endsWith(".tgz")) {
    return locale === "zh" ? "下载 tarball" : "Download tarball";
  }

  return locale === "zh" ? `下载 ${asset.name}` : `Download ${asset.name}`;
}

export function formatReleaseDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatBytes(value: number) {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} GB`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} MB`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)} KB`;
  }

  return `${value} B`;
}

function sortByPublishedAtDesc(left: ReleaseRecord, right: ReleaseRecord) {
  return (
    new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
  );
}

function inferAssetArchitectureLabel(
  normalizedName: string,
  locale: Locale,
): string | null {
  if (normalizedName.includes("-universal")) {
    return locale === "zh" ? "通用版" : "Universal";
  }

  if (normalizedName.includes("-intel")) {
    return "Intel";
  }

  if (normalizedName.includes("-arm64")) {
    return "arm64";
  }

  if (normalizedName.includes("-x64")) {
    return "x64";
  }

  if (normalizedName.includes("-x86_64")) {
    return "x86_64";
  }

  if (normalizedName.includes("-aarch64")) {
    return "aarch64";
  }

  if (normalizedName.includes("-armv7")) {
    return "armv7";
  }

  if (normalizedName.includes("-i686")) {
    return "i686";
  }

  return null;
}

function buildPlatformAssetLabel({
  architectureLabel,
  formatLabel,
  isBeta = false,
  locale,
  platformLabel,
}: {
  architectureLabel: string | null;
  formatLabel: string;
  isBeta?: boolean;
  locale: Locale;
  platformLabel: string;
}) {
  const parts = [locale === "zh" ? "下载" : "Download", platformLabel];

  if (architectureLabel) {
    parts.push(architectureLabel);
  }

  if (isBeta) {
    parts.push("Beta");
  }

  parts.push(formatLabel);

  return parts.join(" ");
}
