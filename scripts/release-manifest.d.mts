import type { ReleaseCatalog } from "../apps/downloads/src/types";

export interface GitHubReleaseAssetPayload {
  id: number;
  name: string;
  browser_download_url: string;
  content_type: string;
  size: number;
  download_count: number;
  updated_at: string;
}

export interface GitHubReleasePayload {
  id: number;
  name: string | null;
  tag_name: string;
  html_url: string;
  body?: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  assets: GitHubReleaseAssetPayload[];
}

export interface BuildReleaseCatalogOptions {
  owner: string;
  repo: string;
  generatedAt?: string;
  releases: GitHubReleasePayload[];
}

export function buildReleaseCatalog(
  options: BuildReleaseCatalogOptions,
): ReleaseCatalog;
