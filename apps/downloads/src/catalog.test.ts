import { describe, expect, it } from "vitest";
import { selectReleaseSections } from "./catalog";
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
      name: "vocaport-v1.0.1-android.apk",
      downloadUrl:
        "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-android.apk",
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
});
