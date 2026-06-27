import type { Locale } from "./i18n";
import type { ReleaseAsset, ReleaseCatalog, ReleaseRecord } from "./types";

export interface ReleaseSections {
  prerelease: ReleaseRecord[];
  release: ReleaseRecord[];
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

  return {
    prerelease: releases.filter((release) => release.isPrerelease),
    release: releases.filter((release) => !release.isPrerelease),
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

export function inferAssetPlatformLabel(asset: ReleaseAsset, locale: Locale) {
  const normalizedName = asset.name.toLowerCase();
  const architectureLabel = inferAssetArchitectureLabel(normalizedName, locale);
  const parts: string[] = [];

  if (
    normalizedName.endsWith(".apk") ||
    asset.contentType === "application/vnd.android.package-archive"
  ) {
    parts.push("Android");
  } else if (normalizedName.endsWith(".dmg") || normalizedName.endsWith(".pkg")) {
    parts.push("macOS");
  } else if (normalizedName.endsWith(".msi") || normalizedName.endsWith(".exe")) {
    parts.push("Windows");
  } else if (
    normalizedName.endsWith(".appimage") ||
    normalizedName.endsWith(".deb") ||
    normalizedName.endsWith(".rpm")
  ) {
    parts.push("Linux");
  } else {
    return locale === "zh" ? "安装包" : "Package";
  }

  if (architectureLabel) {
    parts.push(architectureLabel);
  }

  if (
    normalizedName.includes("beta") &&
    (normalizedName.endsWith(".apk") ||
      asset.contentType === "application/vnd.android.package-archive")
  ) {
    parts.push("Beta");
  }

  return parts.join(" ");
}

export function formatPublishedAt(
  value: string,
  locale: Locale,
  fallback: string,
) {
  if (!value) {
    return fallback;
  }

  try {
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatGeneratedAt(value: string, locale: Locale) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatBytes(value: number, locale: Locale) {
  if (!value || !Number.isFinite(value)) {
    return "";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    maximumFractionDigits: size >= 10 ? 0 : 1,
  }).format(size)} ${units[unitIndex]}`;
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
