import type { ReleaseCatalog } from "./types";

export const sampleGithubReleases = [
  {
    id: 301,
    name: "VocaPort v1.1.0-beta.1",
    tag_name: "v1.1.0-beta.1",
    html_url: "https://example.com/releases/v1.1.0-beta.1",
    draft: false,
    prerelease: true,
    published_at: "2026-06-26T09:00:00.000Z",
    assets: [
      {
        id: 11,
        name: "vocaport-v1.1.0-beta.1-android.apk",
        browser_download_url:
          "https://example.com/downloads/v1.1.0-beta.1/vocaport-v1.1.0-beta.1-android.apk",
        content_type: "application/vnd.android.package-archive",
        size: 124000000,
        download_count: 3,
        updated_at: "2026-06-26T09:10:00.000Z",
      },
    ],
  },
  {
    id: 201,
    name: "VocaPort v1.0.1",
    tag_name: "v1.0.1",
    html_url: "https://example.com/releases/v1.0.1",
    draft: false,
    prerelease: false,
    published_at: "2026-06-25T09:00:00.000Z",
    assets: [
      {
        id: 12,
        name: "vocaport-v1.0.1-android.apk",
        browser_download_url:
          "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-android.apk",
        content_type: "application/vnd.android.package-archive",
        size: 123000000,
        download_count: 10,
        updated_at: "2026-06-25T09:10:00.000Z",
      },
    ],
  },
  {
    id: 101,
    name: "VocaPort v1.0.0",
    tag_name: "v1.0.0",
    html_url: "https://example.com/releases/v1.0.0",
    draft: false,
    prerelease: false,
    published_at: "2026-06-24T09:00:00.000Z",
    assets: [
      {
        id: 13,
        name: "vocaport-v1.0.0-android.apk",
        browser_download_url:
          "https://example.com/downloads/v1.0.0/vocaport-v1.0.0-android.apk",
        content_type: "application/vnd.android.package-archive",
        size: 122000000,
        download_count: 14,
        updated_at: "2026-06-24T09:10:00.000Z",
      },
    ],
  },
  {
    id: 1,
    name: "Draft",
    tag_name: "v0.9.9",
    html_url: "https://example.com/releases/v0.9.9",
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
      assets: [
        {
          id: 11,
          name: "vocaport-v1.1.0-beta.1-android.apk",
          downloadUrl:
            "https://example.com/downloads/v1.1.0-beta.1/vocaport-v1.1.0-beta.1-android.apk",
          contentType: "application/vnd.android.package-archive",
          sizeBytes: 124000000,
          downloadCount: 3,
          updatedAt: "2026-06-26T09:10:00.000Z",
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
      assets: [
        {
          id: 12,
          name: "vocaport-v1.0.1-android.apk",
          downloadUrl:
            "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-android.apk",
          contentType: "application/vnd.android.package-archive",
          sizeBytes: 123000000,
          downloadCount: 10,
          updatedAt: "2026-06-25T09:10:00.000Z",
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
      assets: [
        {
          id: 13,
          name: "vocaport-v1.0.0-android.apk",
          downloadUrl:
            "https://example.com/downloads/v1.0.0/vocaport-v1.0.0-android.apk",
          contentType: "application/vnd.android.package-archive",
          sizeBytes: 122000000,
          downloadCount: 14,
          updatedAt: "2026-06-24T09:10:00.000Z",
        },
      ],
    },
  ],
};
