import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const scriptPath = fileURLToPath(new URL("./prepare-release-assets.mjs", import.meta.url));
const tempDirs = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((directory) => rm(directory, { force: true, recursive: true })));
  tempDirs.length = 0;
});

describe("prepare-release-assets", () => {
  it("copies the macOS bundle that matches the requested architecture", async () => {
    const workspace = await createTempWorkspace();
    const searchRoot = join(workspace, "input");
    const outputDir = join(workspace, "output");

    await writeFixture(
      join(searchRoot, "target", "aarch64-apple-darwin", "release", "bundle", "dmg", "VocaPort-arm64.dmg"),
      "arm64 build",
    );
    await writeFixture(
      join(searchRoot, "target", "x86_64-apple-darwin", "release", "bundle", "dmg", "VocaPort-intel.dmg"),
      "intel build",
    );

    await runPrepareReleaseAssets([
      "--profile",
      "macos",
      "--architecture",
      "intel",
      "--release-tag",
      "v1.2.3",
      "--search-root",
      searchRoot,
      "--output-dir",
      outputDir,
    ]);

    const copiedAsset = await readFile(
      join(outputDir, "vocaport-v1.2.3-macos-intel.dmg"),
      "utf8",
    );

    expect(copiedAsset).toBe("intel build");
  });

  it("prepares both Windows installers with x64 naming", async () => {
    const workspace = await createTempWorkspace();
    const searchRoot = join(workspace, "input");
    const outputDir = join(workspace, "output");

    await writeFixture(
      join(searchRoot, "target", "release", "bundle", "msi", "VocaPort_1.2.3_x64_en-US.msi"),
      "windows msi",
    );
    await writeFixture(
      join(searchRoot, "target", "release", "bundle", "nsis", "VocaPort_1.2.3_x64-setup.exe"),
      "windows exe",
    );

    await runPrepareReleaseAssets([
      "--profile",
      "windows",
      "--architecture",
      "x64",
      "--release-tag",
      "v1.2.3",
      "--search-root",
      searchRoot,
      "--output-dir",
      outputDir,
    ]);

    expect(
      await readFile(join(outputDir, "vocaport-v1.2.3-windows-x64.msi"), "utf8"),
    ).toBe("windows msi");
    expect(
      await readFile(
        join(outputDir, "vocaport-v1.2.3-windows-x64-setup.exe"),
        "utf8",
      ),
    ).toBe("windows exe");
  });

  it("keeps the Android universal beta naming convention", async () => {
    const workspace = await createTempWorkspace();
    const searchRoot = join(workspace, "input");
    const outputDir = join(workspace, "output");

    await writeFixture(
      join(
        searchRoot,
        "app",
        "build",
        "outputs",
        "apk",
        "universal",
        "release",
        "app-universal-release.apk",
      ),
      "android apk",
    );

    await runPrepareReleaseAssets([
      "--profile",
      "android",
      "--architecture",
      "universal",
      "--release-tag",
      "v1.2.3",
      "--search-root",
      searchRoot,
      "--output-dir",
      outputDir,
    ]);

    expect(
      await readFile(
        join(outputDir, "vocaport-v1.2.3-android-universal-beta.apk"),
        "utf8",
      ),
    ).toBe("android apk");
  });
});

async function createTempWorkspace() {
  const directory = await mkdtemp(join(tmpdir(), "vocaport-release-assets-"));
  tempDirs.push(directory);
  return directory;
}

async function writeFixture(filePath, contents) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

async function runPrepareReleaseAssets(args) {
  await execFileAsync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
  });
}
