export function buildReleaseCatalog({
  owner,
  repo,
  generatedAt = new Date().toISOString(),
  releases,
}) {
  return {
    owner,
    repo,
    generatedAt,
    releases: releases
      .filter((release) => !release.draft)
      .map(mapRelease)
      .filter((release) => release.assets.length > 0)
      .sort(
        (left, right) =>
          new Date(right.publishedAt).getTime() -
          new Date(left.publishedAt).getTime(),
      ),
  };
}

function mapRelease(release) {
  return {
    id: release.id,
    name: release.name || release.tag_name,
    tagName: release.tag_name,
    htmlUrl: release.html_url,
    isPrerelease: release.prerelease,
    publishedAt: release.published_at,
    releaseNotesMarkdown: release.body || "",
    assets: release.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      downloadUrl: asset.browser_download_url,
      contentType: asset.content_type,
      sizeBytes: asset.size,
      downloadCount: asset.download_count,
      updatedAt: asset.updated_at,
    })),
  };
}
