pub use core_domain::{
    Deck, MediaAsset, MediaKind, SessionQuestionSnapshot, StudyCard, StudySession, VocabularyEntry,
};
pub use core_events::{
    ImportRecord, ProgressReset, ProgressResetScope, ReviewEvent, ReviewEventSource, ReviewState,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreviewRequest {
    pub file_name: String,
    pub file_bytes: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FieldCandidate {
    pub field_name: String,
    pub confidence: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FieldCandidateSet {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lemma: Option<FieldCandidate>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meaning: Option<FieldCandidate>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub example: Option<FieldCandidate>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<FieldCandidate>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio: Option<FieldCandidate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreviewResponse {
    pub import_id: String,
    pub file_hash: String,
    pub deck_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolved_deck_id: Option<String>,
    pub file_name: String,
    pub entry_count: usize,
    pub review_event_count: usize,
    pub media_count: usize,
    pub field_candidates: FieldCandidateSet,
    pub unresolved_fields: Vec<String>,
    pub warning_messages: Vec<String>,
    pub is_duplicate_file: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reimport_target_deck_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmedFieldMapping {
    pub lemma_field: String,
    pub meaning_field: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub example_field: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_field: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_field: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ImportCommitMode {
    CreateNewDeck,
    UpsertExistingDeck,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportCommitRequest {
    pub import_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_deck_id: Option<String>,
    pub commit_mode: ImportCommitMode,
    pub confirmed_field_mapping: ConfirmedFieldMapping,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportCommitResponse {
    pub deck_id: String,
    pub deck_name: String,
    pub imported_entry_count: usize,
    pub imported_card_count: usize,
    pub imported_review_event_count: usize,
    pub skipped_count: usize,
    pub warning_messages: Vec<String>,
    pub media_import_summary: String,
    pub next_recommended_action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SessionMode {
    ReviewDueFirst,
    RandomPractice,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StartSessionRequest {
    pub deck_id: String,
    pub mode: SessionMode,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub force_new: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum QuestionOptionKind {
    Image,
    Meaning,
    Example,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuestionOptionDto {
    pub id: String,
    pub kind: QuestionOptionKind,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum QuestionPromptKind {
    Lemma,
    Audio,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuestionDto {
    pub session_id: String,
    pub question_id: String,
    pub card_id: String,
    pub prompt_kind: QuestionPromptKind,
    pub prompt_value: String,
    pub options: Vec<QuestionOptionDto>,
    pub remaining_count: u32,
    pub estimated_remaining_seconds: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ActiveSessionResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub question: Option<QuestionDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RatingOverride {
    Hard,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AnswerQuestionRequest {
    pub session_id: String,
    pub question_id: String,
    pub selected_option_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rating_override: Option<RatingOverride>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExplanationPayload {
    pub target_word: String,
    pub correct_meaning: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub example_sentence: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audio_asset_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NextReviewSuggestion {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub due_at: Option<String>,
    pub summary_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AppliedRating {
    Again,
    Hard,
    Good,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AnswerQuestionResponse {
    pub is_correct: bool,
    pub correct_option_id: String,
    pub applied_rating: AppliedRating,
    pub explanation_payload: ExplanationPayload,
    pub next_review_suggestion: NextReviewSuggestion,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_question: Option<QuestionDto>,
    pub is_session_complete: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ResetProgressRequest {
    pub scope: ProgressResetScope,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_card_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_deck_id: Option<String>,
    pub reason: String,
}
