// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DownloadsPage } from "./App";
import { sampleCatalog } from "./fixtures";

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
          name: "Release notes",
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
});
