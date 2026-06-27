export type Locale = "en" | "zh";

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
  latestPrerelease: string;
  latestStable: string;
  loadingDescription: string;
  loadingTitle: string;
  moreDownloads: string;
  noOlderPackages: string;
  previewDescription: string;
  previewSectionLabel: string;
  prereleaseBadge: string;
  releaseBadge: string;
  releaseNotesButton: string;
  releaseNotesEmpty: string;
  stableDescription: string;
  stableSectionLabel: string;
  themeToggleToDark: string;
  themeToggleToLight: string;
  viewOnGitHub: string;
}

const copyByLocale: Record<Locale, DownloadsCopy> = {
  en: {
    archiveDescription:
      "Browse older stable releases and prerelease builds. Expand the release notes before installing if you want a quick change summary.",
    archiveKicker: "Archive",
    emptyDescription:
      "Public GitHub installers have not been published yet. This page will update itself once release assets are attached.",
    emptyTitle: "No public installers yet.",
    errorDescription: "Release data is temporarily unavailable.",
    errorTitle: "Could not load the installer catalog.",
    featuredDownloadsAriaLabel: "Featured downloads",
    footerGeneratedPrefix: "Source",
    footerUpdatedPrefix: "Last synced",
    githubReleasesButton: "Open GitHub Releases",
    heroDescription:
      "Install the latest stable build, test the newest preview, or roll back to an older package without digging through release history by hand.",
    heroEyebrow: "VocaPort Download Desk",
    heroTitle: "Official build manifest",
    languageSwitcherLabel: "Language",
    latestPrerelease: "Latest prerelease",
    latestStable: "Latest stable release",
    loadingDescription:
      "The page is syncing the current public release list from GitHub.",
    loadingTitle: "Syncing public installers…",
    moreDownloads: "Archive",
    noOlderPackages: "No older public packages are available yet.",
    previewDescription: "Test upcoming changes and early-access installers.",
    previewSectionLabel: "Preview",
    prereleaseBadge: "Prerelease",
    releaseBadge: "Release",
    releaseNotesButton: "Release notes",
    releaseNotesEmpty: "No release notes were published for this build.",
    stableDescription: "Recommended for most users and everyday installs.",
    stableSectionLabel: "Stable",
    themeToggleToDark: "Switch to dark mode",
    themeToggleToLight: "Switch to light mode",
    viewOnGitHub: "View on GitHub",
  },
  zh: {
    archiveDescription:
      "浏览更早的稳定版和预发布包，需要回退或核对旧版本时可直接从这里进入。",
    archiveKicker: "历史构建",
    emptyDescription:
      "GitHub Releases 暂时还没有公开安装包。只要 release 附上资产，这个页面就会自动更新。",
    emptyTitle: "暂时还没有公开安装包。",
    errorDescription: "当前暂时无法加载 release 数据。",
    errorTitle: "暂时无法加载安装包目录。",
    featuredDownloadsAriaLabel: "精选下载",
    footerGeneratedPrefix: "来源",
    footerUpdatedPrefix: "最后同步",
    githubReleasesButton: "打开 GitHub Releases",
    heroDescription:
      "直接安装最新稳定版、试用最新预发布版，或回退到旧版本，不用再手动翻 release 历史。",
    heroEyebrow: "VocaPort 下载总览",
    heroTitle: "官方安装包总览",
    languageSwitcherLabel: "语言切换",
    latestPrerelease: "最新预发布版",
    latestStable: "最新稳定版",
    loadingDescription: "页面正在同步 GitHub 上当前公开的安装包列表。",
    loadingTitle: "正在同步公开安装包……",
    moreDownloads: "版本归档",
    noOlderPackages: "暂时还没有更早的公开安装包。",
    previewDescription: "适合测试新改动，或提前验证即将发布的安装包。",
    previewSectionLabel: "预发布版",
    prereleaseBadge: "预发布",
    releaseBadge: "正式版",
    releaseNotesButton: "发行说明",
    releaseNotesEmpty: "这个版本还没有发布说明。",
    stableDescription: "推荐大多数用户直接安装，适合日常使用。",
    stableSectionLabel: "稳定版",
    themeToggleToDark: "切换到暗色模式",
    themeToggleToLight: "切换到浅色模式",
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
