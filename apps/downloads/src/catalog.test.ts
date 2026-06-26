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
    expect(catalog.releases[1].assets.map((asset) => asset.name)).toEqual([
      "vocaport-v1.0.1-android-universal-beta.apk",
      "vocaport-v1.0.1-macos-intel.dmg",
      "vocaport-v1.0.1-macos-arm64.dmg",
      "vocaport-v1.0.1-windows-x64.msi",
      "vocaport-v1.0.1-linux-x64.AppImage",
      "vocaport-v1.0.1-linux-x64.deb",
    ]);
  });

  it("highlights latest stable and prerelease while keeping older versions in the archive list", () => {
    const sections = selectReleaseSections(sampleCatalog);

    expect(sections.latestStable?.tagName).toBe("v1.0.1");
    expect(sections.latestPrerelease?.tagName).toBe("v1.1.0-beta.1");
    expect(sections.previousReleases.map((release) => release.tagName)).toEqual([
      "v1.0.0",
    ]);
  });

  it("labels platform assets with architecture when the filename encodes it", () => {
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
    ).toBe("Download Android Universal Beta APK");
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
    ).toBe("下载 Android 通用版 Beta APK");
    expect(
      inferAssetLabel(
        {
          id: 1001,
          name: "vocaport-v0.2.0-windows-x64.msi",
          downloadUrl: "https://example.com/v0.2.0.msi",
          contentType: "application/x-msi",
          sizeBytes: 123,
          downloadCount: 0,
          updatedAt: "2026-06-26T10:00:00.000Z",
        },
        "en",
      ),
    ).toBe("Download Windows x64 MSI");
    expect(
      inferAssetLabel(
        {
          id: 1002,
          name: "vocaport-v0.2.0-linux-x64.AppImage",
          downloadUrl: "https://example.com/v0.2.0.AppImage",
          contentType: "application/octet-stream",
          sizeBytes: 123,
          downloadCount: 0,
          updatedAt: "2026-06-26T10:00:00.000Z",
        },
        "en",
      ),
    ).toBe("Download Linux x64 AppImage");
    expect(
      inferAssetLabel(
        {
          id: 1003,
          name: "vocaport-v0.2.0-macos-arm64.dmg",
          downloadUrl: "https://example.com/v0.2.0.dmg",
          contentType: "application/x-apple-diskimage",
          sizeBytes: 123,
          downloadCount: 0,
          updatedAt: "2026-06-26T10:00:00.000Z",
        },
        "zh",
      ),
    ).toBe("下载 macOS arm64 DMG");
  });
});
