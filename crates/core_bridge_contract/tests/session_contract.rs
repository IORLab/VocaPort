use core_bridge_contract::{
    AnswerQuestionRequest, DeckSummaryDto, ImportPreviewRequest, ListDecksResponse,
    ResetProgressRequest, SelectDeckRequest,
};
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

#[test]
fn deck_selection_contract_uses_frontend_field_names() {
    let request = SelectDeckRequest {
        deck_id: "deck-basic-vocab".to_string(),
    };
    let response = ListDecksResponse {
        decks: vec![DeckSummaryDto {
            deck_id: "deck-basic-vocab".to_string(),
            deck_name: "Basic Vocab".to_string(),
            entry_count: 1,
            card_count: 1,
            review_event_count: 0,
            due_count: 1,
            has_active_session: false,
            is_current_deck: true,
            last_imported_at: Some("2026-06-26T00:00:00Z".to_string()),
        }],
    };

    let request_json = serde_json::to_string(&request).unwrap();
    let response_json = serde_json::to_string(&response).unwrap();

    assert!(request_json.contains("\"deckId\":\"deck-basic-vocab\""));
    assert!(!request_json.contains("deck_id"));
    assert!(response_json.contains("\"isCurrentDeck\":true"));
    assert!(response_json.contains("\"lastImportedAt\":\"2026-06-26T00:00:00Z\""));
}
