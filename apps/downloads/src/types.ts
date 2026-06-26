export interface ReleaseAsset {
  id: number;
  name: string;
  downloadUrl: string;
  contentType: string;
  sizeBytes: number;
  downloadCount: number;
  updatedAt: string;
}

export interface ReleaseRecord {
  id: number;
  name: string;
  tagName: string;
  htmlUrl: string;
  isPrerelease: boolean;
  publishedAt: string;
  assets: ReleaseAsset[];
}

export interface ReleaseCatalog {
  owner: string;
  repo: string;
  generatedAt: string;
  releases: ReleaseRecord[];
}
