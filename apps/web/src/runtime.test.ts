import { describe, expect, it } from "vitest";
import { createWebRuntime } from "./runtime";

describe("web runtime smoke", () => {
  it("responds with the ready health string", async () => {
    await expect(createWebRuntime().healthPing()).resolves.toBe("vocaport-ready");
  });
});
