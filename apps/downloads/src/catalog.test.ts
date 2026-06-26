import { describe, expect, it } from "vitest";
import { inferAssetLabel, selectReleaseSections } from "./catalog";
import { sampleCatalog, sampleGithubReleases } from "./fixtures";
import { buildReleaseCatalog } from "../../../scripts/release-manifest.mjs";

describe("release catalog", () => {
  it("converts GitHub release payloads into public download data", () => {
    const catalog = buildReleaseCatalog({
      owner: "IORLab",
      repo: "VocaPort",
      generatedAt: "2026-06-26T10:00:00.000Z",
      releases: sampleGithubReleases,
    });

    expect(catalog.releases).toHaveLength(3);
    expect(catalog.releases[0]).toMatchObject({
      tagName: "v1.1.0-beta.1",
      isPrerelease: true,
    });
    expect(catalog.releases[1].assets[0]).toMatchObject({
      name: "vocaport-v1.0.1-android-universal-beta.apk",
      downloadUrl:
        "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-android-universal-beta.apk",
    });
  });

  it("highlights latest stable and prerelease while keeping older versions in the archive list", () => {
    const sections = selectReleaseSections(sampleCatalog);

    expect(sections.latestStable?.tagName).toBe("v1.0.1");
    expect(sections.latestPrerelease?.tagName).toBe("v1.1.0-beta.1");
    expect(sections.previousReleases.map((release) => release.tagName)).toEqual([
      "v1.0.0",
    ]);
  });

  it("labels beta android assets explicitly", () => {
    expect(
      inferAssetLabel(
        {
          id: 999,
          name: "vocaport-v0.2.0-beta.1-android-universal-debug.apk",
          downloadUrl: "https://example.com/v0.2.0-beta.1.apk",
          contentType: "application/vnd.android.package-archive",
          sizeBytes: 123,
          downloadCount: 0,
          updatedAt: "2026-06-26T10:00:00.000Z",
        },
        "en",
      ),
    ).toBe("Download Android Beta APK");
    expect(
      inferAssetLabel(
        {
          id: 1000,
          name: "vocaport-v0.2.0-beta.1-android-universal-beta.apk",
          downloadUrl: "https://example.com/v0.2.0-beta.1.apk",
          contentType: "application/vnd.android.package-archive",
          sizeBytes: 123,
          downloadCount: 0,
          updatedAt: "2026-06-26T10:00:00.000Z",
        },
        "zh",
      ),
    ).toBe("下载 Android Beta APK");
  });
});
