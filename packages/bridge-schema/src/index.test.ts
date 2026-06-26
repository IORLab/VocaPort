import { describe, expect, it } from "vitest";
import { APP_NAME } from "./index";

describe("bridge schema workspace smoke", () => {
  it("exports the canonical application name", () => {
    expect(APP_NAME).toBe("VocaPort");
  });
});
