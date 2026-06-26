export type {
  ActiveSessionResponse,
  AnswerQuestionRequest,
  AnswerQuestionResponse,
  ImportCommitRequest,
  ImportCommitResponse,
  ImportPreviewRequest,
  ImportPreviewResponse,
  ModuleManifest,
  QuestionDto,
  ResetProgressRequest,
  StartSessionRequest,
} from "@vocaport/bridge-schema";

import type {
  ActiveSessionResponse,
  AnswerQuestionRequest,
  AnswerQuestionResponse,
  ImportCommitRequest,
  ImportCommitResponse,
  ImportPreviewRequest,
  ImportPreviewResponse,
  QuestionDto,
  ResetProgressRequest,
  StartSessionRequest,
} from "@vocaport/bridge-schema";

export interface BridgeRuntimeAdapter {
  healthPing(): Promise<string>;
  invoke<TRequest, TResponse>(
    command: string,
    payload: TRequest,
  ): Promise<TResponse>;
}

const previewResponse: ImportPreviewResponse = {
  importId: "preview-1",
  fileHash: "hash-1",
  deckName: "Basic Vocab",
  resolvedDeckId: "deck-basic-vocab",
  fileName: "basic-vocab.apkg",
  entryCount: 1,
  reviewEventCount: 0,
  mediaCount: 0,
  availableFieldNames: ["Back", "Example", "Front"],
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

const baseQuestion: QuestionDto = {
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

interface CreatePhaseOneStubRuntimeOptions {
  healthPing?: () => Promise<string>;
  invoke?: <TRequest, TResponse>(
    command: string,
    payload: TRequest,
  ) => Promise<TResponse>;
}

export function createPhaseOneStubRuntime(
  options: CreatePhaseOneStubRuntimeOptions = {},
): BridgeRuntimeAdapter {
  let activeSession: ActiveSessionResponse = {
    question: undefined,
  };

  return {
    async healthPing() {
      return options.healthPing ? options.healthPing() : "vocaport-ready";
    },
    async invoke<TRequest, TResponse>(
      command: string,
      payload: TRequest,
    ): Promise<TResponse> {
      if (options.invoke) {
        return options.invoke(command, payload);
      }

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
        const request = payload as ImportCommitRequest;

        return {
          ...commitResponse,
          deckId: request.targetDeckId ?? commitResponse.deckId,
        } as unknown as TResponse;
      }

      if (command === "quiz.getActiveSession") {
        return activeSession as unknown as TResponse;
      }

      if (command === "quiz.startSession") {
        const request = payload as StartSessionRequest;
        const question = {
          ...baseQuestion,
          sessionId: `${request.deckId}-session`,
        } satisfies QuestionDto;
        activeSession = { question };
        return question as unknown as TResponse;
      }

      if (command === "quiz.answerQuestion") {
        const request = payload as AnswerQuestionRequest;
        const question = activeSession.question;

        if (!question) {
          throw new Error("There is no active question to answer.");
        }

        const response = {
          isCorrect: request.selectedOptionId === question.options[0]?.id,
          correctOptionId: question.options[0]?.id ?? "option-1",
          appliedRating:
            request.selectedOptionId === question.options[0]?.id ? "good" : "again",
          explanationPayload: {
            targetWord: question.promptValue,
            correctMeaning: question.options[0]?.value ?? question.promptValue,
            exampleSentence: "I eat an apple.",
          },
          nextReviewSuggestion: {
            summaryText: "本轮学习已完成。",
          },
          nextQuestion: undefined,
          isSessionComplete: true,
        } satisfies AnswerQuestionResponse;

        activeSession = { question: undefined };
        return response as unknown as TResponse;
      }

      if (command === "review.resetProgress") {
        const request = payload as ResetProgressRequest;
        activeSession = { question: undefined };
        return {
          ok: true,
          scope: request.scope,
        } as unknown as TResponse;
      }

      throw new Error(`Unsupported command: ${command}`);
    },
  };
}
