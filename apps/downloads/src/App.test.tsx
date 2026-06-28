// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DownloadsExperience, DownloadsPage } from "./App";
import { sampleCatalog } from "./fixtures";
import { THEME_STORAGE_KEY } from "./theme";

interface MockNavigatorUserAgentDataHighEntropyValues {
  architecture?: string;
  bitness?: string;
  model?: string;
  platform?: string;
}

interface MockNavigatorUserAgentData {
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?: (
    hints: string[],
  ) => Promise<MockNavigatorUserAgentDataHighEntropyValues>;
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

function mockCurrentDevice(
  overrides: {
    platform?: string;
    userAgent?: string;
    userAgentData?: MockNavigatorUserAgentData;
  } = {},
) {
  Object.defineProperty(window.navigator, "platform", {
    configurable: true,
    value: overrides.platform ?? "MacIntel",
  });
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value:
      overrides.userAgent ??
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  });
  Object.defineProperty(window.navigator, "userAgentData", {
    configurable: true,
    value:
      overrides.userAgentData ??
      ({
        mobile: false,
        platform: "macOS",
        getHighEntropyValues: vi.fn().mockResolvedValue({
          architecture: "arm",
          bitness: "64",
          platform: "macOS",
        }),
      } satisfies MockNavigatorUserAgentData),
  });
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("lang");
  mockMatchMedia(false);
  mockCurrentDevice();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("downloads page", () => {
  it("reuses the LunaTV-style shell for loading, error, and empty states", () => {
    const { rerender } = render(
      <DownloadsExperience state={{ status: "loading" }} />,
    );

    expect(
      screen.getByRole("heading", { name: "Build Ledger" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Release" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Prerelease" })).toBeTruthy();
    expect(screen.getByText("Loading release data...")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Open GitHub Releases" }),
    ).toBeTruthy();

    rerender(
      <DownloadsExperience
        state={{ status: "error", message: "Failed to load release catalog: 500" }}
      />,
    );

    expect(screen.getByText("Failed to load release data")).toBeTruthy();
    expect(
      screen.getByText("Refresh later or open GitHub Releases directly."),
    ).toBeTruthy();

    rerender(
      <DownloadsExperience
        state={{
          status: "ready",
          catalog: {
            owner: "IORLab",
            repo: "VocaPort",
            generatedAt: "2026-06-26T10:00:00.000Z",
            releases: [],
          },
        }}
      />,
    );

    expect(
      screen.getByText("No stable builds are available right now."),
    ).toBeTruthy();
    expect(
      screen.getByText("No prerelease builds are available right now."),
    ).toBeTruthy();
  });

  it("renders release and prerelease lists without the old archive section", async () => {
    const user = userEvent.setup();

    render(<DownloadsPage catalog={sampleCatalog} />);

    const releaseSection = screen
      .getByRole("heading", { name: "Release" })
      .closest("section");
    const prereleaseSection = screen
      .getByRole("heading", { name: "Prerelease" })
      .closest("section");

    expect(releaseSection).toBeTruthy();
    expect(prereleaseSection).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Archive" })).toBeNull();

    expect(
      within(releaseSection as HTMLElement).getByText("VocaPort v1.0.1"),
    ).toBeTruthy();
    expect(
      within(releaseSection as HTMLElement).getByText("VocaPort v1.0.0"),
    ).toBeTruthy();
    expect(
      within(prereleaseSection as HTMLElement).getByText("VocaPort v1.1.0-beta.1"),
    ).toBeTruthy();

    await user.click(
      within(releaseSection as HTMLElement).getByText("VocaPort v1.0.1"),
    );

    const stableCard = within(releaseSection as HTMLElement)
      .getByText("VocaPort v1.0.1")
      .closest("details");

    expect(stableCard?.hasAttribute("open")).toBe(true);
    expect(
      within(stableCard as HTMLElement)
        .getByRole("link", { name: "Open Release Page" })
        .getAttribute("href"),
    ).toBe("https://example.com/releases/v1.0.1");
    expect(
      within(stableCard as HTMLElement).getByText(
        "vocaport-v1.0.1-android-universal-beta.apk",
      ),
    ).toBeTruthy();
    expect(
      within(stableCard as HTMLElement)
        .getAllByRole("link", { name: "Download" })[0]
        .getAttribute("href"),
    ).toBe(
      "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-android-universal-beta.apk",
    );
  });

  it("marks the best matching download row and button for the current device", async () => {
    const user = userEvent.setup();

    render(<DownloadsPage catalog={sampleCatalog} />);

    const releaseSection = screen
      .getByRole("heading", { name: "Release" })
      .closest("section");

    expect(releaseSection).toBeTruthy();

    await user.click(
      within(releaseSection as HTMLElement).getByText("VocaPort v1.0.1"),
    );

    const stableCard = within(releaseSection as HTMLElement)
      .getByText("VocaPort v1.0.1")
      .closest("details");

    expect(stableCard?.hasAttribute("open")).toBe(true);

    const currentDeviceRow = await within(
      stableCard as HTMLElement,
    ).findByText("This device");
    const assetRow = currentDeviceRow.closest("li");

    expect(assetRow?.getAttribute("data-current-device")).toBe("true");
    expect(
      within(assetRow as HTMLElement).getByText("vocaport-v1.0.1-macos-arm64.dmg"),
    ).toBeTruthy();
    expect(
      within(assetRow as HTMLElement)
        .getByRole("link", { name: "Download" })
        .getAttribute("data-current-device"),
    ).toBe("true");
  });

  it("switches release card tabs and localizes release notes", async () => {
    const user = userEvent.setup();

    render(<DownloadsPage catalog={sampleCatalog} />);

    const prereleaseSection = screen
      .getByRole("heading", { name: "Prerelease" })
      .closest("section");

    expect(prereleaseSection).toBeTruthy();

    await user.click(
      within(prereleaseSection as HTMLElement).getByText(
        "VocaPort v1.1.0-beta.1",
      ),
    );

    const prereleaseCard = within(prereleaseSection as HTMLElement)
      .getByText("VocaPort v1.1.0-beta.1")
      .closest("details");

    expect(prereleaseCard?.hasAttribute("open")).toBe(true);

    await user.click(
      within(prereleaseCard as HTMLElement).getByRole("tab", {
        name: "Release Notes",
      }),
    );

    expect(
      within(prereleaseCard as HTMLElement).getByText("Included in this release"),
    ).toBeTruthy();
    expect(
      within(prereleaseCard as HTMLElement).getByText(
        "The Web / Desktop / Android shells are now publicly available.",
      ),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "中文" }));

    expect(screen.getByRole("heading", { name: "构建账本" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "查看 GitHub Releases" }),
    ).toBeTruthy();
    expect(
      within(prereleaseCard as HTMLElement).getByText("本次包含"),
    ).toBeTruthy();
    expect(
      within(prereleaseCard as HTMLElement).getByText(
        "Web / Desktop / Android 壳层已公开可用。",
      ),
    ).toBeTruthy();
  });

  it("uses an icon-only theme button and persists the manual choice", async () => {
    const user = userEvent.setup();

    render(<DownloadsPage catalog={sampleCatalog} />);

    const toggleButton = screen.getByRole("button", {
      name: "Switch to dark mode",
    });

    expect(toggleButton.textContent?.trim()).toBe("");
    expect(toggleButton.querySelector("svg")).toBeTruthy();
    expect(document.documentElement.dataset.theme).toBe("light");

    await user.click(toggleButton);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});
