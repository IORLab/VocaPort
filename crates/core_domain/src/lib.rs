use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Deck {
    pub id: String,
    pub name: String,
    pub source_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_deck_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_import_record_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MediaKind {
    Image,
    Audio,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MediaAsset {
    pub id: String,
    pub kind: MediaKind,
    pub mime_type: String,
    pub storage_key: String,
    pub origin: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VocabularyEntry {
    pub id: String,
    pub lemma: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phonetic: Option<String>,
    pub meanings: Vec<String>,
    pub examples: Vec<String>,
    pub tags: Vec<String>,
    pub source_deck_id: String,
    pub media_refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StudyCard {
    pub id: String,
    pub entry_id: String,
    pub prompt_mode: String,
    pub option_policy: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SessionQuestionSnapshot {
    pub question_id: String,
    pub card_id: String,
    pub prompt_kind: String,
    pub prompt_value: String,
    pub option_ids: Vec<String>,
    pub option_kinds: Vec<String>,
    pub option_values: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct StudySession {
    pub id: String,
    pub deck_id: String,
    pub mode: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_question: Option<SessionQuestionSnapshot>,
    pub remaining_card_ids: Vec<String>,
    pub answered_count: u32,
    pub started_at: String,
    pub last_activity_at: String,
}
