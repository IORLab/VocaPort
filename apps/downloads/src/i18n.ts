export type Locale = "en" | "zh";

export interface DownloadsCopy {
  currentDeviceBadge: string;
  downloadAction: string;
  downloadsTab: string;
  emptyPrereleaseSection: string;
  emptyReleaseSection: string;
  errorBody: string;
  errorTitle: string;
  footerLabel: string;
  githubReleasesButton: string;
  heroEyebrow: string;
  heroSubtitle: string;
  heroTitle: string;
  languageSwitcherLabel: string;
  loading: string;
  openRelease: string;
  prereleaseSectionDescription: string;
  prereleaseSectionTitle: string;
  publishedAtLabel: string;
  releaseNotesEmpty: string;
  releaseNotesTab: string;
  releaseSectionDescription: string;
  releaseSectionTitle: string;
  themeToggleToDark: string;
  themeToggleToLight: string;
  unknownPublishedAt: string;
}

const copyByLocale: Record<Locale, DownloadsCopy> = {
  en: {
    currentDeviceBadge: "This device",
    downloadAction: "Download",
    downloadsTab: "Downloads",
    emptyPrereleaseSection: "No prerelease builds are available right now.",
    emptyReleaseSection: "No stable builds are available right now.",
    errorBody: "Refresh later or open GitHub Releases directly.",
    errorTitle: "Failed to load release data",
    footerLabel: "Last synced",
    githubReleasesButton: "Open GitHub Releases",
    heroEyebrow: "VocaPort Download Desk",
    heroSubtitle:
      "Browse stable and prerelease builds in one place and jump straight to the official GitHub installers.",
    heroTitle: "Build Ledger",
    languageSwitcherLabel: "Language switch",
    loading: "Loading release data...",
    openRelease: "Open Release Page",
    prereleaseSectionDescription: "Preview builds for testing and early access.",
    prereleaseSectionTitle: "Prerelease",
    publishedAtLabel: "Published",
    releaseNotesEmpty: "This release does not include notes yet.",
    releaseNotesTab: "Release Notes",
    releaseSectionDescription: "Stable public builds.",
    releaseSectionTitle: "Release",
    themeToggleToDark: "Switch to dark mode",
    themeToggleToLight: "Switch to light mode",
    unknownPublishedAt: "Unknown",
  },
  zh: {
    currentDeviceBadge: "本机",
    downloadAction: "下载",
    downloadsTab: "下载列表",
    emptyPrereleaseSection: "暂时没有可用的预发布版本。",
    emptyReleaseSection: "暂时没有可用的正式版本。",
    errorBody: "请稍后刷新，或直接前往 GitHub Releases 查看下载。",
    errorTitle: "版本数据加载失败",
    footerLabel: "最后同步",
    githubReleasesButton: "查看 GitHub Releases",
    heroEyebrow: "VocaPort 下载站",
    heroSubtitle: "统一查看正式版和预发布版，直接跳转到 GitHub 官方安装包。",
    heroTitle: "构建账本",
    languageSwitcherLabel: "语言切换",
    loading: "正在读取版本数据...",
    openRelease: "打开 Release 页面",
    prereleaseSectionDescription: "用于测试与提前体验的新构建。",
    prereleaseSectionTitle: "预发布",
    publishedAtLabel: "发布时间",
    releaseNotesEmpty: "这个版本暂时没有发布说明。",
    releaseNotesTab: "发布说明",
    releaseSectionDescription: "稳定可用的公开版本。",
    releaseSectionTitle: "正式版",
    themeToggleToDark: "切换到暗色模式",
    themeToggleToLight: "切换到浅色模式",
    unknownPublishedAt: "时间未知",
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
