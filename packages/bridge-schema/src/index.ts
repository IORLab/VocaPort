export const APP_NAME = "VocaPort" as const;

export type MediaKind = "image" | "audio";

export interface Deck {
  id: string;
  name: string;
  sourceType: string;
  externalDeckId?: string;
  latestImportRecordId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  mimeType: string;
  storageKey: string;
  origin: string;
}

export interface VocabularyEntry {
  id: string;
  lemma: string;
  phonetic?: string;
  meanings: string[];
  examples: string[];
  tags: string[];
  sourceDeckId: string;
  mediaRefs: string[];
}

export interface StudyCard {
  id: string;
  entryId: string;
  promptMode: string;
  optionPolicy: string;
}

export type StudySessionMode = "review_due_first" | "random_practice";
export type QuestionPromptKind = "lemma" | "audio";
export type QuestionOptionKind = "image" | "meaning" | "example";

export interface SessionQuestionSnapshot {
  questionId: string;
  cardId: string;
  promptKind: QuestionPromptKind;
  promptValue: string;
  optionIds: string[];
  optionKinds: QuestionOptionKind[];
  optionValues: string[];
}

export interface StudySession {
  id: string;
  deckId: string;
  mode: StudySessionMode;
  status: string;
  currentQuestion?: SessionQuestionSnapshot;
  remainingCardIds: string[];
  answeredCount: number;
  startedAt: string;
  lastActivityAt: string;
}

export type ReviewEventSource = "anki_import" | "app_review";

export interface ReviewEvent {
  id: string;
  cardId: string;
  source: ReviewEventSource;
  rating: number;
  reviewedAt: string;
  scheduledDays?: number;
  elapsedDays?: number;
  rawPayload?: string;
}

export interface ReviewState {
  cardId: string;
  status: string;
  stability?: number;
  difficulty?: number;
  dueAt?: string;
  lastReviewedAt?: string;
  reviewCount: number;
}

export type ProgressResetScope = "card" | "deck" | "all";

export interface ProgressReset {
  id: string;
  scope: ProgressResetScope;
  targetCardId?: string;
  targetDeckId?: string;
  resetAt: string;
  reason: string;
}

export interface ImportRecord {
  id: string;
  deckId: string;
  sourceType: string;
  fileHash: string;
  sourceFingerprint: string;
  importedAt: string;
  entryCount: number;
  reviewEventCount: number;
  skippedCount: number;
  warningCount: number;
}

export interface ImportPreviewRequest {
  fileName: string;
  fileBytes: Uint8Array;
}

export interface FieldCandidate {
  fieldName: string;
  confidence: number;
}

export interface FieldCandidateSet {
  lemma?: FieldCandidate;
  meaning?: FieldCandidate;
  example?: FieldCandidate;
  image?: FieldCandidate;
  audio?: FieldCandidate;
}

export interface ImportPreviewResponse {
  importId: string;
  fileHash: string;
  deckName: string;
  resolvedDeckId?: string;
  fileName: string;
  entryCount: number;
  reviewEventCount: number;
  mediaCount: number;
  availableFieldNames: string[];
  fieldCandidates: FieldCandidateSet;
  unresolvedFields: string[];
  warningMessages: string[];
  isDuplicateFile: boolean;
  reimportTargetDeckId?: string;
}

export interface ConfirmedFieldMapping {
  lemmaField: string;
  meaningField: string;
  exampleField?: string;
  imageField?: string;
  audioField?: string;
}

export type ImportCommitMode = "create_new_deck" | "upsert_existing_deck";

export interface ImportCommitRequest {
  importId: string;
  targetDeckId?: string;
  commitMode: ImportCommitMode;
  confirmedFieldMapping: ConfirmedFieldMapping;
}

export interface ImportCommitResponse {
  deckId: string;
  deckName: string;
  importedEntryCount: number;
  importedCardCount: number;
  importedReviewEventCount: number;
  skippedCount: number;
  warningMessages: string[];
  mediaImportSummary: string;
  nextRecommendedAction: string;
}

export interface DeckSummaryDto {
  deckId: string;
  deckName: string;
  entryCount: number;
  cardCount: number;
  reviewEventCount: number;
  dueCount: number;
  hasActiveSession: boolean;
  isCurrentDeck: boolean;
  lastImportedAt?: string;
}

export interface ListDecksResponse {
  decks: DeckSummaryDto[];
}

export interface SelectDeckRequest {
  deckId: string;
}

export interface SelectDeckResponse {
  deckId: string;
}

export interface StartSessionRequest {
  deckId: string;
  mode: StudySessionMode;
  forceNew?: boolean;
}

export interface QuestionOptionDto {
  id: string;
  kind: QuestionOptionKind;
  value: string;
}

export interface QuestionDto {
  sessionId: string;
  questionId: string;
  cardId: string;
  promptKind: QuestionPromptKind;
  promptValue: string;
  options: QuestionOptionDto[];
  remainingCount: number;
  estimatedRemainingSeconds: number;
}

export interface ActiveSessionResponse {
  question?: QuestionDto;
}

export type RatingOverride = "hard";

export interface AnswerQuestionRequest {
  sessionId: string;
  questionId: string;
  selectedOptionId: string;
  ratingOverride?: RatingOverride;
}

export interface ExplanationPayload {
  targetWord: string;
  correctMeaning: string;
  exampleSentence?: string;
  audioAssetId?: string;
}

export interface NextReviewSuggestion {
  dueAt?: string;
  summaryText: string;
}

export type AppliedRating = "again" | "hard" | "good";

export interface AnswerQuestionResponse {
  isCorrect: boolean;
  correctOptionId: string;
  appliedRating: AppliedRating;
  explanationPayload: ExplanationPayload;
  nextReviewSuggestion: NextReviewSuggestion;
  nextQuestion?: QuestionDto;
  isSessionComplete: boolean;
}

export interface ResetProgressRequest {
  scope: ProgressResetScope;
  targetCardId?: string;
  targetDeckId?: string;
  reason: string;
}

export type Permission =
  | "import.apkg.read"
  | "media.asset.read"
  | "quiz.generate"
  | "scheduler.compute"
  | "storage.module_scoped"
  | "network.none"
  | "network.limited"
  | "ui.route.register";

export type PlatformTarget = "web" | "desktop" | "android";

export interface SignatureEnvelope {
  algorithm: string;
  keyId: string;
  signature: string;
}

export interface ModuleManifest {
  moduleId: string;
  version: string;
  apiVersion: string;
  capabilities: string[];
  permissions: Permission[];
  platformTargets: PlatformTarget[];
  entrypoint: string;
  checksum: string;
  signature: SignatureEnvelope;
}
