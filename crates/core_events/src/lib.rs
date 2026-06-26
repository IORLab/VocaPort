use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ReviewEventSource {
    AnkiImport,
    AppReview,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ReviewEvent {
    pub id: String,
    pub card_id: String,
    pub source: ReviewEventSource,
    pub rating: i32,
    pub reviewed_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scheduled_days: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub elapsed_days: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_payload: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ReviewState {
    pub card_id: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stability: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub difficulty: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub due_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_reviewed_at: Option<String>,
    pub review_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProgressResetScope {
    Card,
    Deck,
    All,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProgressReset {
    pub id: String,
    pub scope: ProgressResetScope,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_card_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_deck_id: Option<String>,
    pub reset_at: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportRecord {
    pub id: String,
    pub deck_id: String,
    pub source_type: String,
    pub file_hash: String,
    pub source_fingerprint: String,
    pub imported_at: String,
    pub entry_count: usize,
    pub review_event_count: usize,
    pub skipped_count: usize,
    pub warning_count: usize,
}
