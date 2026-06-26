import type { ReleaseCatalog } from "./types";

const sampleReleaseNotes = `## 中文

VocaPort 第一版公开 Beta。

### 本次包含
- Web / Desktop / Android 壳层已公开可用。
- 已附带 Android、macOS、Windows、Linux 多平台安装包。

---

## English

First public beta release of VocaPort.

### Included in this release
- The Web / Desktop / Android shells are now publicly available.
- Includes Android, macOS, Windows, and Linux installers.
`;

export const sampleGithubReleases = [
  {
    id: 301,
    name: "VocaPort v1.1.0-beta.1",
    tag_name: "v1.1.0-beta.1",
    html_url: "https://example.com/releases/v1.1.0-beta.1",
    body: sampleReleaseNotes,
    draft: false,
    prerelease: true,
    published_at: "2026-06-26T09:00:00.000Z",
    assets: [
      {
        id: 11,
        name: "vocaport-v1.1.0-beta.1-android-universal-beta.apk",
        browser_download_url:
          "https://example.com/downloads/v1.1.0-beta.1/vocaport-v1.1.0-beta.1-android-universal-beta.apk",
        content_type: "application/vnd.android.package-archive",
        size: 124000000,
        download_count: 3,
        updated_at: "2026-06-26T09:10:00.000Z",
      },
      {
        id: 14,
        name: "vocaport-v1.1.0-beta.1-macos-intel.dmg",
        browser_download_url:
          "https://example.com/downloads/v1.1.0-beta.1/vocaport-v1.1.0-beta.1-macos-intel.dmg",
        content_type: "application/x-apple-diskimage",
        size: 158000000,
        download_count: 2,
        updated_at: "2026-06-26T09:12:00.000Z",
      },
      {
        id: 21,
        name: "vocaport-v1.1.0-beta.1-macos-arm64.dmg",
        browser_download_url:
          "https://example.com/downloads/v1.1.0-beta.1/vocaport-v1.1.0-beta.1-macos-arm64.dmg",
        content_type: "application/x-apple-diskimage",
        size: 156000000,
        download_count: 1,
        updated_at: "2026-06-26T09:13:00.000Z",
      },
      {
        id: 15,
        name: "vocaport-v1.1.0-beta.1-windows-x64-setup.exe",
        browser_download_url:
          "https://example.com/downloads/v1.1.0-beta.1/vocaport-v1.1.0-beta.1-windows-x64-setup.exe",
        content_type: "application/vnd.microsoft.portable-executable",
        size: 149000000,
        download_count: 1,
        updated_at: "2026-06-26T09:15:00.000Z",
      },
    ],
  },
  {
    id: 201,
    name: "VocaPort v1.0.1",
    tag_name: "v1.0.1",
    html_url: "https://example.com/releases/v1.0.1",
    body: sampleReleaseNotes,
    draft: false,
    prerelease: false,
    published_at: "2026-06-25T09:00:00.000Z",
    assets: [
      {
        id: 12,
        name: "vocaport-v1.0.1-android-universal-beta.apk",
        browser_download_url:
          "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-android-universal-beta.apk",
        content_type: "application/vnd.android.package-archive",
        size: 123000000,
        download_count: 10,
        updated_at: "2026-06-25T09:10:00.000Z",
      },
      {
        id: 16,
        name: "vocaport-v1.0.1-macos-intel.dmg",
        browser_download_url:
          "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-macos-intel.dmg",
        content_type: "application/x-apple-diskimage",
        size: 157000000,
        download_count: 5,
        updated_at: "2026-06-25T09:11:00.000Z",
      },
      {
        id: 22,
        name: "vocaport-v1.0.1-macos-arm64.dmg",
        browser_download_url:
          "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-macos-arm64.dmg",
        content_type: "application/x-apple-diskimage",
        size: 155000000,
        download_count: 4,
        updated_at: "2026-06-25T09:11:30.000Z",
      },
      {
        id: 17,
        name: "vocaport-v1.0.1-windows-x64.msi",
        browser_download_url:
          "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-windows-x64.msi",
        content_type: "application/x-msi",
        size: 151000000,
        download_count: 6,
        updated_at: "2026-06-25T09:12:00.000Z",
      },
      {
        id: 18,
        name: "vocaport-v1.0.1-linux-x64.AppImage",
        browser_download_url:
          "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-linux-x64.AppImage",
        content_type: "application/octet-stream",
        size: 146000000,
        download_count: 4,
        updated_at: "2026-06-25T09:13:00.000Z",
      },
      {
        id: 19,
        name: "vocaport-v1.0.1-linux-x64.deb",
        browser_download_url:
          "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-linux-x64.deb",
        content_type: "application/vnd.debian.binary-package",
        size: 139000000,
        download_count: 3,
        updated_at: "2026-06-25T09:14:00.000Z",
      },
    ],
  },
  {
    id: 101,
    name: "VocaPort v1.0.0",
    tag_name: "v1.0.0",
    html_url: "https://example.com/releases/v1.0.0",
    body: sampleReleaseNotes,
    draft: false,
    prerelease: false,
    published_at: "2026-06-24T09:00:00.000Z",
    assets: [
      {
        id: 13,
        name: "vocaport-v1.0.0-android-universal-beta.apk",
        browser_download_url:
          "https://example.com/downloads/v1.0.0/vocaport-v1.0.0-android-universal-beta.apk",
        content_type: "application/vnd.android.package-archive",
        size: 122000000,
        download_count: 14,
        updated_at: "2026-06-24T09:10:00.000Z",
      },
      {
        id: 20,
        name: "vocaport-v1.0.0-windows-x64.msi",
        browser_download_url:
          "https://example.com/downloads/v1.0.0/vocaport-v1.0.0-windows-x64.msi",
        content_type: "application/x-msi",
        size: 150000000,
        download_count: 8,
        updated_at: "2026-06-24T09:11:00.000Z",
      },
    ],
  },
  {
    id: 1,
    name: "Draft",
    tag_name: "v0.9.9",
    html_url: "https://example.com/releases/v0.9.9",
    body: "",
    draft: true,
    prerelease: false,
    published_at: "2026-06-20T09:00:00.000Z",
    assets: [],
  },
];

export const sampleCatalog: ReleaseCatalog = {
  owner: "IORLab",
  repo: "VocaPort",
  generatedAt: "2026-06-26T10:00:00.000Z",
  releases: [
    {
      id: 301,
      name: "VocaPort v1.1.0-beta.1",
      tagName: "v1.1.0-beta.1",
      htmlUrl: "https://example.com/releases/v1.1.0-beta.1",
      isPrerelease: true,
      publishedAt: "2026-06-26T09:00:00.000Z",
      releaseNotesMarkdown: sampleReleaseNotes,
      assets: [
        {
          id: 11,
          name: "vocaport-v1.1.0-beta.1-android-universal-beta.apk",
          downloadUrl:
            "https://example.com/downloads/v1.1.0-beta.1/vocaport-v1.1.0-beta.1-android-universal-beta.apk",
          contentType: "application/vnd.android.package-archive",
          sizeBytes: 124000000,
          downloadCount: 3,
          updatedAt: "2026-06-26T09:10:00.000Z",
        },
        {
          id: 14,
          name: "vocaport-v1.1.0-beta.1-macos-intel.dmg",
          downloadUrl:
            "https://example.com/downloads/v1.1.0-beta.1/vocaport-v1.1.0-beta.1-macos-intel.dmg",
          contentType: "application/x-apple-diskimage",
          sizeBytes: 158000000,
          downloadCount: 2,
          updatedAt: "2026-06-26T09:12:00.000Z",
        },
        {
          id: 21,
          name: "vocaport-v1.1.0-beta.1-macos-arm64.dmg",
          downloadUrl:
            "https://example.com/downloads/v1.1.0-beta.1/vocaport-v1.1.0-beta.1-macos-arm64.dmg",
          contentType: "application/x-apple-diskimage",
          sizeBytes: 156000000,
          downloadCount: 1,
          updatedAt: "2026-06-26T09:13:00.000Z",
        },
        {
          id: 15,
          name: "vocaport-v1.1.0-beta.1-windows-x64-setup.exe",
          downloadUrl:
            "https://example.com/downloads/v1.1.0-beta.1/vocaport-v1.1.0-beta.1-windows-x64-setup.exe",
          contentType: "application/vnd.microsoft.portable-executable",
          sizeBytes: 149000000,
          downloadCount: 1,
          updatedAt: "2026-06-26T09:15:00.000Z",
        },
      ],
    },
    {
      id: 201,
      name: "VocaPort v1.0.1",
      tagName: "v1.0.1",
      htmlUrl: "https://example.com/releases/v1.0.1",
      isPrerelease: false,
      publishedAt: "2026-06-25T09:00:00.000Z",
      releaseNotesMarkdown: sampleReleaseNotes,
      assets: [
        {
          id: 12,
          name: "vocaport-v1.0.1-android-universal-beta.apk",
          downloadUrl:
            "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-android-universal-beta.apk",
          contentType: "application/vnd.android.package-archive",
          sizeBytes: 123000000,
          downloadCount: 10,
          updatedAt: "2026-06-25T09:10:00.000Z",
        },
        {
          id: 16,
          name: "vocaport-v1.0.1-macos-intel.dmg",
          downloadUrl:
            "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-macos-intel.dmg",
          contentType: "application/x-apple-diskimage",
          sizeBytes: 157000000,
          downloadCount: 5,
          updatedAt: "2026-06-25T09:11:00.000Z",
        },
        {
          id: 22,
          name: "vocaport-v1.0.1-macos-arm64.dmg",
          downloadUrl:
            "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-macos-arm64.dmg",
          contentType: "application/x-apple-diskimage",
          sizeBytes: 155000000,
          downloadCount: 4,
          updatedAt: "2026-06-25T09:11:30.000Z",
        },
        {
          id: 17,
          name: "vocaport-v1.0.1-windows-x64.msi",
          downloadUrl:
            "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-windows-x64.msi",
          contentType: "application/x-msi",
          sizeBytes: 151000000,
          downloadCount: 6,
          updatedAt: "2026-06-25T09:12:00.000Z",
        },
        {
          id: 18,
          name: "vocaport-v1.0.1-linux-x64.AppImage",
          downloadUrl:
            "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-linux-x64.AppImage",
          contentType: "application/octet-stream",
          sizeBytes: 146000000,
          downloadCount: 4,
          updatedAt: "2026-06-25T09:13:00.000Z",
        },
        {
          id: 19,
          name: "vocaport-v1.0.1-linux-x64.deb",
          downloadUrl:
            "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-linux-x64.deb",
          contentType: "application/vnd.debian.binary-package",
          sizeBytes: 139000000,
          downloadCount: 3,
          updatedAt: "2026-06-25T09:14:00.000Z",
        },
      ],
    },
    {
      id: 101,
      name: "VocaPort v1.0.0",
      tagName: "v1.0.0",
      htmlUrl: "https://example.com/releases/v1.0.0",
      isPrerelease: false,
      publishedAt: "2026-06-24T09:00:00.000Z",
      releaseNotesMarkdown: sampleReleaseNotes,
      assets: [
        {
          id: 13,
          name: "vocaport-v1.0.0-android-universal-beta.apk",
          downloadUrl:
            "https://example.com/downloads/v1.0.0/vocaport-v1.0.0-android-universal-beta.apk",
          contentType: "application/vnd.android.package-archive",
          sizeBytes: 122000000,
          downloadCount: 14,
          updatedAt: "2026-06-24T09:10:00.000Z",
        },
        {
          id: 20,
          name: "vocaport-v1.0.0-windows-x64.msi",
          downloadUrl:
            "https://example.com/downloads/v1.0.0/vocaport-v1.0.0-windows-x64.msi",
          contentType: "application/x-msi",
          sizeBytes: 150000000,
          downloadCount: 8,
          updatedAt: "2026-06-24T09:11:00.000Z",
        },
      ],
    },
  ],
};
