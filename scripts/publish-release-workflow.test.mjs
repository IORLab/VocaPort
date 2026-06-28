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

  it("uses ad-hoc macOS signing and bundle verification without Apple certificate dependencies", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain('export APPLE_SIGNING_IDENTITY="-"');
    expect(workflow).toContain("Verify macOS app bundle signature");
    expect(workflow).toContain('codesign --verify --deep --strict --verbose=4 "$app_path"');
    expect(workflow).toContain('codesign -dv --verbose=4 "$app_path" 2>&1 | grep -q "Signature=adhoc"');
    expect(workflow).not.toContain("Validate macOS signing secrets");
    expect(workflow).not.toContain("Import Apple signing certificate");
    expect(workflow).not.toContain("APPLE_CERTIFICATE");
    expect(workflow).not.toContain("APPLE_CERTIFICATE_PASSWORD");
    expect(workflow).not.toContain("APPLE_API_KEY_B64");
    expect(workflow).not.toContain("APPLE_ID");
    expect(workflow).not.toContain("APPLE_PASSWORD");
    expect(workflow).not.toContain("APPLE_TEAM_ID");
    expect(workflow).not.toContain("spctl --assess --type open");
    expect(workflow).not.toContain("xcrun stapler validate");
  });

  it("keeps Android signature verification and adds Windows/Linux smoke checks", async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain('"$apksigner_path" verify --verbose "$signed_apk"');
    expect(workflow).toContain("Verify Windows installers and first launch");
    expect(workflow).toContain("Get-AuthenticodeSignature");
    expect(workflow).toContain("taskkill.exe");
    expect(workflow).toContain("Write-Warning");
    expect(workflow).toContain("Verify Linux packages and first launch");
    expect(workflow).toContain("xvfb-run -a");
    expect(workflow).toContain('dpkg -i "$deb_path"');
  });
});

async function readWorkflow() {
  return readFile(workflowPath, "utf8");
}
