import { readFile } from "node:fs/promises";
import type {
  ImportCommitRequest,
  ImportPreviewRequest,
  ImportPreviewResponse,
  QuestionDto,
  StartSessionRequest,
} from "@vocaport/bridge-schema";
import { beforeEach, describe, expect, it } from "vitest";
import { createWebRuntime } from "./runtime";

beforeEach(() => {
  const globalState = globalThis as typeof globalThis & {
    __VOCAPORT_MEMORY_SNAPSHOTS__?: Map<string, string>;
  };

  globalState.__VOCAPORT_MEMORY_SNAPSHOTS__?.clear();
});

async function loadBasicApkgFixture() {
  const fixturePath = new URL(
    "../../../fixtures/anki/basic-vocab.apkg",
    import.meta.url,
  );

  return new Uint8Array(await readFile(fixturePath));
}

describe("web runtime smoke", () => {
  it("responds with the ready health string", async () => {
    await expect(createWebRuntime().healthPing()).resolves.toBe("vocaport-ready");
  });

  it("previews a real apkg fixture through the Rust core", async () => {
    const runtime = createWebRuntime();
    const preview = await runtime.invoke<ImportPreviewRequest, ImportPreviewResponse>(
      "import.previewApkg",
      {
        fileName: "basic-vocab.apkg",
        fileBytes: await loadBasicApkgFixture(),
      },
    );

    expect(preview.deckName).toBe("Basic Vocab");
    expect(preview.fileHash).toMatch(/^[0-9a-f]{64}$/);
    expect(preview.importId).not.toBe("preview-1");
  });

  it("restores the active session after recreating the runtime", async () => {
    const fixtureBytes = await loadBasicApkgFixture();
    const firstRuntime = createWebRuntime();
    const preview = await firstRuntime.invoke<
      ImportPreviewRequest,
      ImportPreviewResponse
    >("import.previewApkg", {
      fileName: "basic-vocab.apkg",
      fileBytes: fixtureBytes,
    });

    await firstRuntime.invoke<ImportCommitRequest, { deckId: string }>(
      "import.commitApkg",
      {
        importId: preview.importId,
        targetDeckId: preview.resolvedDeckId,
        commitMode: "upsert_existing_deck",
        confirmedFieldMapping: {
          lemmaField: preview.fieldCandidates.lemma?.fieldName ?? "Front",
          meaningField: preview.fieldCandidates.meaning?.fieldName ?? "Back",
          exampleField: preview.fieldCandidates.example?.fieldName,
          imageField: preview.fieldCandidates.image?.fieldName,
          audioField: preview.fieldCandidates.audio?.fieldName,
        },
      },
    );

    const firstQuestion = await firstRuntime.invoke<StartSessionRequest, QuestionDto>(
      "quiz.startSession",
      {
        deckId: preview.resolvedDeckId ?? "deck-basic-vocab",
        mode: "review_due_first",
        forceNew: false,
      },
    );

    const secondRuntime = createWebRuntime();
    const resumed = await secondRuntime.invoke<
      undefined,
      { question?: QuestionDto }
    >("quiz.getActiveSession", undefined);

    expect(resumed.question).toEqual(firstQuestion);
  });
});
