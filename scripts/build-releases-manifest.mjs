import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildReleaseCatalog } from "./release-manifest.mjs";

async function main() {
  const { owner, output, repo } = parseArgs(process.argv.slice(2));
  const releases = await fetchAllReleases({
    owner,
    repo,
    token: process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN,
  });

  const catalog = buildReleaseCatalog({
    owner,
    repo,
    releases,
  });

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  console.log(
    `Wrote ${catalog.releases.length} public releases to ${output}.`,
  );
}

async function fetchAllReleases({ owner, repo, token }) {
  const releases = [];

  for (let page = 1; page < 100; page += 1) {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100&page=${page}`,
      {
        headers: buildHeaders(token),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch releases: ${response.status} ${response.statusText}`,
      );
    }

    const batch = await response.json();

    if (!Array.isArray(batch)) {
      throw new Error("GitHub releases API returned a non-array response");
    }

    releases.push(...batch);

    if (batch.length < 100) {
      return releases;
    }
  }

  throw new Error("Release pagination exceeded the safety limit");
}

function buildHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "User-Agent": "vocaport-release-manifest",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function parseArgs(args) {
  const values = new Map();

  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    values.set(key, value);
  }

  const owner = values.get("--owner");
  const repo = values.get("--repo");
  const output = values.get("--output");

  if (!owner || !repo || !output) {
    throw new Error(
      "Usage: node scripts/build-releases-manifest.mjs --owner <owner> --repo <repo> --output <path>",
    );
  }

  return { owner, output, repo };
}

await main();
