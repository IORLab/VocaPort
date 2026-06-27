import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("downloads dark theme tab styles", () => {
  it("uses stronger dark-mode contrast tokens for the release tabs", () => {
    const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");

    expect(css).toContain(":root[data-theme=\"dark\"] .release-card__tabs");
    expect(css).toContain(":root[data-theme=\"dark\"] .release-card__tab");
    expect(css).toContain(":root[data-theme=\"dark\"] .release-card__tab[data-active=\"true\"]");
    expect(css).toContain("border: 1px solid rgba(140, 201, 255, 0.18);");
    expect(css).toContain("background: rgba(140, 201, 255, 0.12);");
    expect(css).toContain("background: rgba(215, 236, 255, 0.14);");
  });
});
