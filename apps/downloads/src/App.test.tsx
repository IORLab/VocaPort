// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DownloadsExperience, DownloadsPage } from "./App";
import { sampleCatalog } from "./fixtures";
import { getCopy } from "./i18n";
import { THEME_STORAGE_KEY } from "./theme";

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

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  mockMatchMedia(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("downloads page", () => {
  it("reuses the refreshed shell for loading, error, and empty states", () => {
    const { rerender } = render(
      <DownloadsExperience state={{ status: "loading" }} />,
    );

    expect(
      screen.getByRole("heading", { name: "Official build manifest" }),
    ).toBeTruthy();
    expect(screen.getByText("Syncing public installers…")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Open GitHub Releases" }),
    ).toBeTruthy();

    rerender(
      <DownloadsExperience
        state={{ status: "error", message: "Failed to load release catalog: 500" }}
      />,
    );

    expect(
      screen.getByText("Release data is temporarily unavailable."),
    ).toBeTruthy();
    expect(screen.getByText("Failed to load release catalog: 500")).toBeTruthy();

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

    expect(screen.getByText("No public installers yet.")).toBeTruthy();
  });

  it("renders the stable, preview, and archive sections in the refreshed layout", () => {
    render(<DownloadsPage catalog={sampleCatalog} />);

    expect(screen.getByText("01")).toBeTruthy();
    const latestStableSection = screen
      .getByRole("heading", { name: "Stable" })
      .closest("section");

    expect(latestStableSection).toBeTruthy();
    expect(
      within(latestStableSection as HTMLElement)
        .getByRole("link", {
          name: /Download Android Universal Beta APK/,
        })
        .getAttribute("href"),
    ).toBe(
      "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-android-universal-beta.apk",
    );
    expect(
      within(latestStableSection as HTMLElement)
        .getByRole("link", {
          name: "Download macOS Intel DMG",
        })
        .getAttribute("href"),
    ).toBe(
      "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-macos-intel.dmg",
    );
    expect(
      within(latestStableSection as HTMLElement)
        .getByRole("link", {
          name: "Download macOS arm64 DMG",
        })
        .getAttribute("href"),
    ).toBe(
      "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-macos-arm64.dmg",
    );
    expect(
      within(latestStableSection as HTMLElement)
        .getByRole("link", {
          name: "Download Windows x64 MSI",
        })
        .getAttribute("href"),
    ).toBe(
      "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-windows-x64.msi",
    );
    expect(
      within(latestStableSection as HTMLElement)
        .getByRole("link", {
          name: "Download Linux x64 AppImage",
        })
        .getAttribute("href"),
    ).toBe(
      "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-linux-x64.AppImage",
    );
    expect(
      within(latestStableSection as HTMLElement)
        .getByRole("link", {
          name: "Download Linux x64 DEB",
        })
        .getAttribute("href"),
    ).toBe(
      "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-linux-x64.deb",
    );

    expect(screen.getByText("02")).toBeTruthy();
    const latestPrereleaseSection = screen
      .getByRole("heading", { name: "Preview" })
      .closest("section");

    expect(latestPrereleaseSection).toBeTruthy();
    expect(
      within(latestPrereleaseSection as HTMLElement).getByText(
        "v1.1.0-beta.1",
      ),
    ).toBeTruthy();
    expect(
      within(latestPrereleaseSection as HTMLElement)
        .getByRole("link", {
          name: "Download macOS Intel DMG",
        })
        .getAttribute("href"),
    ).toBe(
      "https://example.com/downloads/v1.1.0-beta.1/vocaport-v1.1.0-beta.1-macos-intel.dmg",
    );
    expect(
      within(latestPrereleaseSection as HTMLElement)
        .getByRole("link", {
          name: "Download macOS arm64 DMG",
        })
        .getAttribute("href"),
    ).toBe(
      "https://example.com/downloads/v1.1.0-beta.1/vocaport-v1.1.0-beta.1-macos-arm64.dmg",
    );

    const moreDownloadsSection = screen
      .getByRole("heading", { name: "Archive" })
      .closest("section");

    expect(moreDownloadsSection).toBeTruthy();
    expect(
      within(moreDownloadsSection as HTMLElement).getByRole("heading", {
        name: "VocaPort v1.0.0",
      }),
    ).toBeTruthy();
    expect(
      within(moreDownloadsSection as HTMLElement)
        .getByRole("link", {
          name: "View on GitHub",
        })
        .getAttribute("href"),
    ).toBe("https://example.com/releases/v1.0.0");
  });

  it("toggles the theme and persists the manual choice", async () => {
    const user = userEvent.setup();

    render(<DownloadsPage catalog={sampleCatalog} />);

    expect(document.documentElement.dataset.theme).toBe("light");

    await user.click(
      screen.getByRole("button", { name: "Switch to dark mode" }),
    );

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("shows a friendly empty state when no release assets exist yet", () => {
    render(
      <DownloadsPage
        catalog={{
          owner: "IORLab",
          repo: "VocaPort",
          generatedAt: "2026-06-26T10:00:00.000Z",
          releases: [],
        }}
      />,
    );

    expect(screen.getByText(getCopy("en").emptyTitle)).toBeTruthy();
  });

  it("switches language and expands localized release notes inline", async () => {
    const user = userEvent.setup();

    render(<DownloadsPage catalog={sampleCatalog} />);

    expect(
      screen.getByRole("heading", { name: getCopy("en").heroTitle }),
    ).toBeTruthy();

    const latestPrereleaseSection = screen
      .getByRole("heading", { name: "Preview" })
      .closest("section");

    expect(latestPrereleaseSection).toBeTruthy();

    await user.click(
      within(latestPrereleaseSection as HTMLElement).getByRole("button", {
        name: "Release notes",
      }),
    );

    expect(screen.getByText("Included in this release")).toBeTruthy();
    expect(
      screen.getByText(
        "The Web / Desktop / Android shells are now publicly available.",
      ),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "中文" }));

    expect(
      screen.getByRole("heading", { name: getCopy("zh").heroTitle }),
    ).toBeTruthy();
    expect(screen.getByText("本次包含")).toBeTruthy();
    expect(
      screen.getByText("Web / Desktop / Android 壳层已公开可用。"),
    ).toBeTruthy();
  });
});
