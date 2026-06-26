// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DownloadsPage } from "./App";
import { sampleCatalog } from "./fixtures";
import { getCopy } from "./i18n";

afterEach(() => {
  cleanup();
});

describe("downloads page", () => {
  it("renders latest stable, latest preview, and older release downloads", () => {
    render(<DownloadsPage catalog={sampleCatalog} />);

    const latestStableSection = screen.getByText("Latest stable release").closest(
      "section",
    );

    expect(latestStableSection).toBeTruthy();
    expect(
      within(latestStableSection as HTMLElement)
        .getByRole("link", {
          name: /Download Android APK/,
        })
        .getAttribute("href"),
    ).toBe(
      "https://example.com/downloads/v1.0.1/vocaport-v1.0.1-android.apk",
    );

    const latestPrereleaseSection = screen.getByText("Latest prerelease").closest(
      "section",
    );

    expect(latestPrereleaseSection).toBeTruthy();
    expect(
      within(latestPrereleaseSection as HTMLElement).getByText(
        "v1.1.0-beta.1",
      ),
    ).toBeTruthy();

    const moreDownloadsSection = screen
      .getByRole("heading", { name: "More downloads" })
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

    expect(screen.getByText("No downloadable packages yet.")).toBeTruthy();
  });

  it("switches language and expands localized release notes inline", async () => {
    const user = userEvent.setup();

    render(<DownloadsPage catalog={sampleCatalog} />);

    expect(
      screen.getByRole("heading", { name: getCopy("en").heroTitle }),
    ).toBeTruthy();

    const latestPrereleaseSection = screen.getByText("Latest prerelease").closest(
      "section",
    );

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
