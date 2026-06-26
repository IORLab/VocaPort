import { describe, expect, it } from "vitest";
import { createMemoryReviewEventRepository } from "./storage";

describe("web review event repository", () => {
  it("stores and lists review events in insertion order", async () => {
    const repository = createMemoryReviewEventRepository();

    await repository.insert({ id: "e1", cardId: "c1", source: "anki_import" });
    await repository.insert({ id: "e2", cardId: "c1", source: "app_review" });

    await expect(repository.listByCardId("c1")).resolves.toEqual([
      { id: "e1", cardId: "c1", source: "anki_import" },
      { id: "e2", cardId: "c1", source: "app_review" },
    ]);
  });
});
