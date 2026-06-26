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

  if (
    normalizedName.endsWith(".apk") ||
    asset.contentType === "application/vnd.android.package-archive"
  ) {
    return locale === "zh" ? "下载 Android APK" : "Download Android APK";
  }

  if (normalizedName.endsWith(".dmg")) {
    return locale === "zh" ? "下载 macOS DMG" : "Download macOS DMG";
  }

  if (normalizedName.endsWith(".pkg")) {
    return locale === "zh" ? "下载 macOS PKG" : "Download macOS PKG";
  }

  if (normalizedName.endsWith(".msi")) {
    return locale === "zh" ? "下载 Windows MSI" : "Download Windows MSI";
  }

  if (normalizedName.endsWith(".exe")) {
    return locale === "zh" ? "下载 Windows EXE" : "Download Windows EXE";
  }

  if (normalizedName.endsWith(".appimage")) {
    return locale === "zh" ? "下载 Linux AppImage" : "Download Linux AppImage";
  }

  if (normalizedName.endsWith(".deb")) {
    return locale === "zh" ? "下载 Linux DEB" : "Download Linux DEB";
  }

  if (normalizedName.endsWith(".rpm")) {
    return locale === "zh" ? "下载 Linux RPM" : "Download Linux RPM";
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
