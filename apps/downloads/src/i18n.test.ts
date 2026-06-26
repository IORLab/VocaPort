import { describe, expect, it } from "vitest";
import { getLocalizedReleaseNotes } from "./i18n";

const bilingualReleaseNotes = `## 中文

第一段中文说明。

---

## English

First English paragraph.
`;

describe("getLocalizedReleaseNotes", () => {
  it("strips divider lines around localized sections", () => {
    expect(getLocalizedReleaseNotes(bilingualReleaseNotes, "zh")).toBe(
      "第一段中文说明。",
    );
    expect(getLocalizedReleaseNotes(bilingualReleaseNotes, "en")).toBe(
      "First English paragraph.",
    );
  });
});
