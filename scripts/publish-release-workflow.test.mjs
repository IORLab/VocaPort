import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workflowPath = join(
  repoRoot,
  ".github",
  "workflows",
  "publish-android-release.yml",
);

describe("publish-release workflow", () => {
  it("does not disable macOS code signing when building targeted desktop bundles", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain('args+=(--target "${{ matrix.target }}")');
    expect(workflow).not.toContain("--no-sign");
  });

  it("requires Apple signing and notarization steps before macOS assets are uploaded", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("Validate macOS signing secrets");
    expect(workflow).toContain("Import Apple signing certificate");
    expect(workflow).toContain("APPLE_CERTIFICATE");
    expect(workflow).toContain("APPLE_CERTIFICATE_PASSWORD");
    expect(workflow).toContain("APPLE_API_KEY_B64");
    expect(workflow).toContain("APPLE_ID");
    expect(workflow).toContain("APPLE_PASSWORD");
    expect(workflow).toContain("APPLE_TEAM_ID");
    expect(workflow).toContain("APPLE_SIGNING_IDENTITY");
    expect(workflow).toContain("xcrun stapler validate");
    expect(workflow).toContain("spctl --assess --type open");
  });
});

async function readWorkflow() {
  return readFile(workflowPath, "utf8");
}
