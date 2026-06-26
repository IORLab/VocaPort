import type {
  ActiveSessionResponse,
  ImportCommitResponse,
  ImportPreviewRequest,
  ImportPreviewResponse,
  QuestionDto,
} from "@vocaport/bridge-schema";
import type { BridgeRuntimeAdapter } from "@vocaport/ts-sdk";

const previewResponse: ImportPreviewResponse = {
  importId: "preview-1",
  fileHash: "hash-1",
  deckName: "Basic Vocab",
  resolvedDeckId: "deck-basic-vocab",
  fileName: "basic-vocab.apkg",
  entryCount: 1,
  reviewEventCount: 0,
  mediaCount: 0,
  fieldCandidates: {
    lemma: { fieldName: "Front", confidence: 100 },
    meaning: { fieldName: "Back", confidence: 100 },
    example: { fieldName: "Example", confidence: 90 },
  },
  unresolvedFields: [],
  warningMessages: [],
  isDuplicateFile: false,
  reimportTargetDeckId: "deck-basic-vocab",
};

const commitResponse: ImportCommitResponse = {
  deckId: "deck-basic-vocab",
  deckName: "Basic Vocab",
  importedEntryCount: 1,
  importedCardCount: 1,
  importedReviewEventCount: 0,
  skippedCount: 0,
  warningMessages: [],
  mediaImportSummary: "0 embedded assets imported",
  nextRecommendedAction: "start_study",
};

const activeSessionResponse: ActiveSessionResponse = {
  question: undefined,
};

const startSessionResponse: QuestionDto = {
  sessionId: "session-1",
  questionId: "question-1",
  cardId: "card-1",
  promptKind: "lemma",
  promptValue: "apple",
  options: [
    { id: "option-1", kind: "meaning", value: "苹果" },
    { id: "option-2", kind: "meaning", value: "香蕉" },
    { id: "option-3", kind: "meaning", value: "橘子" },
    { id: "option-4", kind: "meaning", value: "葡萄" },
  ],
  remainingCount: 12,
  estimatedRemainingSeconds: 180,
};

export function createWebRuntime(): BridgeRuntimeAdapter {
  return {
    async healthPing() {
      return "vocaport-ready";
    },
    async invoke<TRequest, TResponse>(
      command: string,
      payload: TRequest,
    ): Promise<TResponse> {
      if (command === "module.listCapabilities") {
        return [
          "import.apkg.read",
          "quiz.generate",
          "scheduler.compute",
        ] as unknown as TResponse;
      }

      if (command === "import.previewApkg") {
        const request = payload as ImportPreviewRequest;
        return {
          ...previewResponse,
          fileName: request.fileName,
        } as unknown as TResponse;
      }

      if (command === "import.commitApkg") {
        return commitResponse as unknown as TResponse;
      }

      if (command === "quiz.getActiveSession") {
        return activeSessionResponse as unknown as TResponse;
      }

      if (command === "quiz.startSession") {
        return startSessionResponse as unknown as TResponse;
      }

      if (command === "review.resetProgress") {
        return { ok: true } as unknown as TResponse;
      }

      throw new Error(`Unsupported command: ${command}`);
    },
  };
}
