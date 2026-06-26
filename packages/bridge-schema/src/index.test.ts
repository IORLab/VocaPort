import { describe, expect, it } from "vitest";
import type {
  DeckSummaryDto,
  ListDecksResponse,
  SelectDeckRequest,
} from "./index";
import { APP_NAME } from "./index";

describe("bridge schema workspace smoke", () => {
  it("exports the canonical application name", () => {
    expect(APP_NAME).toBe("VocaPort");
  });
});

describe("phase 2 library contracts", () => {
  it("exports the current-deck DTOs", () => {
    const response: ListDecksResponse = {
      decks: [
        {
          deckId: "deck-basic-vocab",
          deckName: "Basic Vocab",
          entryCount: 1,
          cardCount: 1,
          reviewEventCount: 0,
          dueCount: 1,
          hasActiveSession: false,
          isCurrentDeck: true,
        } satisfies DeckSummaryDto,
      ],
    };

    const request: SelectDeckRequest = { deckId: response.decks[0].deckId };
    expect(request.deckId).toBe("deck-basic-vocab");
  });
});
