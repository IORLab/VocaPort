use core_bridge_contract::{AnswerQuestionRequest, ImportPreviewRequest, ResetProgressRequest};
use core_events::ProgressResetScope;

#[test]
fn session_contract_round_trips() {
    let preview = ImportPreviewRequest {
        file_name: "basic-vocab.apkg".to_string(),
        file_bytes: vec![1, 2, 3],
    };

    let answer = AnswerQuestionRequest {
        session_id: "session-1".to_string(),
        question_id: "question-1".to_string(),
        selected_option_id: "option-2".to_string(),
        rating_override: None,
    };

    let preview_json = serde_json::to_string(&preview).unwrap();
    let answer_json = serde_json::to_string(&answer).unwrap();

    assert!(preview_json.contains("basic-vocab.apkg"));
    assert!(preview_json.contains("fileName"));
    assert!(!preview_json.contains("file_name"));
    assert!(answer_json.contains("question-1"));
}

#[test]
fn reset_contract_uses_frontend_field_names() {
    let request = ResetProgressRequest {
        scope: ProgressResetScope::Deck,
        target_card_id: None,
        target_deck_id: Some("deck-1".to_string()),
        reason: "user-requested".to_string(),
    };

    let json = serde_json::to_string(&request).unwrap();

    assert!(json.contains("\"scope\":\"deck\""));
    assert!(json.contains("\"targetDeckId\":\"deck-1\""));
    assert!(!json.contains("target_deck_id"));
}
