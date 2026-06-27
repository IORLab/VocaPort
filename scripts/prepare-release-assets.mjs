import { cp, mkdir, readdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const profiles = {
  android: [
    {
      id: "android-apk",
      matcher: /app-universal-release\.apk$/i,
      outputName: ({ releaseTag, architecture }) =>
        `vocaport-${releaseTag}-android-${architecture}-beta.apk`,
    },
  ],
  linux: [
    {
      id: "linux-appimage",
      matcher: /\.appimage$/i,
      outputName: ({ releaseTag, architecture }) =>
        `vocaport-${releaseTag}-linux-${architecture}.AppImage`,
    },
    {
      id: "linux-deb",
      matcher: /\.deb$/i,
      outputName: ({ releaseTag, architecture }) =>
        `vocaport-${releaseTag}-linux-${architecture}.deb`,
    },
  ],
  macos: [
    {
      id: "macos-dmg",
      matcher: /\.dmg$/i,
      outputName: ({ releaseTag, architecture }) =>
        `vocaport-${releaseTag}-macos-${architecture}.dmg`,
    },
  ],
  windows: [
    {
      id: "windows-msi",
      matcher: /\.msi$/i,
      outputName: ({ releaseTag, architecture }) =>
        `vocaport-${releaseTag}-windows-${architecture}.msi`,
    },
    {
      id: "windows-setup-exe",
      matcher: /setup\.exe$/i,
      outputName: ({ releaseTag, architecture }) =>
        `vocaport-${releaseTag}-windows-${architecture}-setup.exe`,
    },
  ],
};

const architecturePathHints = {
  android: {
    universal: ["universal"],
  },
  linux: {
    x64: ["x64", "x86_64"],
  },
  macos: {
    arm64: ["arm64", "aarch64-apple-darwin"],
    intel: ["intel", "x64", "x86_64-apple-darwin"],
  },
  windows: {
    x64: ["x64", "x86_64"],
  },
};

async function main() {
  const {
    architecture,
    outputDir,
    profile,
    releaseTag,
    searchRoot,
  } = parseArgs(process.argv.slice(2));
  const specs = profiles[profile];

  if (!specs) {
    throw new Error(`Unsupported profile "${profile}".`);
  }

  const sourceFiles = await collectFiles(resolve(searchRoot));
  const preparedAssets = [];

  await mkdir(resolve(outputDir), { recursive: true });

  for (const spec of specs) {
    const sourcePath = pickMatch(sourceFiles, spec.matcher, spec.id, {
      architecture,
      profile,
    });
    const outputPath = join(
      resolve(outputDir),
      spec.outputName({ architecture, releaseTag }),
    );

    await cp(sourcePath, outputPath);
    preparedAssets.push(outputPath);
  }

  console.log(
    `Prepared ${preparedAssets.length} ${profile} asset(s) for ${architecture}:`,
  );
  for (const assetPath of preparedAssets) {
    console.log(assetPath);
  }
}

async function collectFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function pickMatch(files, matcher, specId, { architecture, profile }) {
  const matches = files.filter((filePath) => matcher.test(basename(filePath)));

  if (matches.length === 0) {
    throw new Error(`Missing asset for ${specId}.`);
  }

  const narrowedMatches = narrowMatchesByArchitecture(matches, {
    architecture,
    profile,
  });

  if (narrowedMatches.length === 1) {
    return narrowedMatches[0];
  }

  if (narrowedMatches.length > 1) {
    throw new Error(
      `Multiple ${profile}/${architecture} assets matched ${specId}: ${narrowedMatches.join(", ")}`,
    );
  }

  if (matches.length === 1) {
    return matches[0];
  }

  throw new Error(
    `Multiple assets matched ${specId}; narrow --search-root or add architecture hints: ${matches.join(", ")}`,
  );
}

function narrowMatchesByArchitecture(matches, { architecture, profile }) {
  const hints = architecturePathHints[profile]?.[architecture];

  if (!hints || hints.length === 0) {
    return matches;
  }

  return matches.filter((filePath) => {
    const normalizedPath = filePath.toLowerCase();
    return hints.some((hint) => normalizedPath.includes(hint.toLowerCase()));
  });
}

function parseArgs(args) {
  const values = new Map();

  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    values.set(key, value);
  }

  const profile = values.get("--profile");
  const architecture = values.get("--architecture");
  const releaseTag = values.get("--release-tag");
  const searchRoot = values.get("--search-root");
  const outputDir = values.get("--output-dir");

  if (!profile || !architecture || !releaseTag || !searchRoot || !outputDir) {
    throw new Error(
      "Usage: node scripts/prepare-release-assets.mjs --profile <android|linux|macos|windows> --architecture <name> --release-tag <tag> --search-root <path> --output-dir <path>",
    );
  }

  return {
    architecture,
    outputDir,
    profile,
    releaseTag,
    searchRoot,
  };
}

await main();
