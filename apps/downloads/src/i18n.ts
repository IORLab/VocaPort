export type Locale = "en" | "zh";

export interface DownloadsCopy {
  archiveDescription: string;
  archiveKicker: string;
  emptyDescription: string;
  emptyTitle: string;
  featuredDownloadsAriaLabel: string;
  footerGeneratedPrefix: string;
  footerUpdatedPrefix: string;
  heroDescription: string;
  heroTitle: string;
  languageSwitcherLabel: string;
  latestPrerelease: string;
  latestStable: string;
  moreDownloads: string;
  noOlderPackages: string;
  prereleaseBadge: string;
  releaseBadge: string;
  releaseNotesButton: string;
  releaseNotesEmpty: string;
  viewOnGitHub: string;
}

const copyByLocale: Record<Locale, DownloadsCopy> = {
  en: {
    archiveDescription:
      "Browse older stable releases and prerelease builds. Expand the release notes before installing if you want a quick change summary.",
    archiveKicker: "Archive",
    emptyDescription:
      "Public GitHub Releases have not been published yet. This page will fill itself once release assets are attached.",
    emptyTitle: "No downloadable packages yet.",
    featuredDownloadsAriaLabel: "Featured downloads",
    footerGeneratedPrefix: "Generated from GitHub Releases for",
    footerUpdatedPrefix: "Updated",
    heroDescription:
      "Grab the latest stable release, try the newest preview, or roll back to an older package without digging through release history by hand.",
    heroTitle: "All builds, one page",
    languageSwitcherLabel: "Language",
    latestPrerelease: "Latest prerelease",
    latestStable: "Latest stable release",
    moreDownloads: "More downloads",
    noOlderPackages: "No older public packages are available yet.",
    prereleaseBadge: "Prerelease",
    releaseBadge: "Release",
    releaseNotesButton: "Release notes",
    releaseNotesEmpty: "No release notes were published for this build.",
    viewOnGitHub: "View on GitHub",
  },
  zh: {
    archiveDescription:
      "浏览更早的稳定版和预发布包。安装前可先展开版本说明，快速查看本次变更。",
    archiveKicker: "历史版本",
    emptyDescription:
      "GitHub Releases 还没有公开发布安装包。只要 release 附上资产，这个页面就会自动显示出来。",
    emptyTitle: "暂时还没有可下载的安装包。",
    featuredDownloadsAriaLabel: "精选下载",
    footerGeneratedPrefix: "数据来自 GitHub Releases：",
    footerUpdatedPrefix: "更新于",
    heroDescription:
      "直接下载最新稳定版、最新预发布版，或回退到旧版本，不用再手动翻 release 历史。",
    heroTitle: "一页下载全部版本",
    languageSwitcherLabel: "语言切换",
    latestPrerelease: "最新预发布版",
    latestStable: "最新稳定版",
    moreDownloads: "更多下载",
    noOlderPackages: "暂时还没有更早的公开安装包。",
    prereleaseBadge: "预发布",
    releaseBadge: "正式版",
    releaseNotesButton: "发行说明",
    releaseNotesEmpty: "这个版本还没有发布说明。",
    viewOnGitHub: "在 GitHub 查看",
  },
};

export function getCopy(locale: Locale) {
  return copyByLocale[locale];
}

export function getLocalizedReleaseNotes(markdown: string, locale: Locale) {
  const normalizedMarkdown = markdown.trim();

  if (!normalizedMarkdown) {
    return "";
  }

  const headingMatches = Array.from(
    normalizedMarkdown.matchAll(/^##\s+(中文|English)\s*$/gm),
  );

  if (headingMatches.length === 0) {
    return normalizedMarkdown;
  }

  const localizedSections: Partial<Record<Locale, string>> = {};

  headingMatches.forEach((match, index) => {
    const language = match[1] === "中文" ? "zh" : "en";
    const startIndex = (match.index ?? 0) + match[0].length;
    const endIndex =
      index + 1 < headingMatches.length
        ? (headingMatches[index + 1].index ?? normalizedMarkdown.length)
        : normalizedMarkdown.length;

    localizedSections[language] = trimLocalizedReleaseNotesSection(
      normalizedMarkdown.slice(startIndex, endIndex),
    );
  });

  return (
    localizedSections[locale] ??
    localizedSections.en ??
    localizedSections.zh ??
    normalizedMarkdown
  );
}

function trimLocalizedReleaseNotesSection(section: string) {
  const lines = section
    .trim()
    .split(/\r?\n/);

  while (lines[0]?.trim() === "---") {
    lines.shift();
  }

  while (lines.at(-1)?.trim() === "---") {
    lines.pop();
  }

  return lines.join("\n").trim();
}
