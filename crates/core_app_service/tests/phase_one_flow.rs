use core_app_service::PhaseOneService;
use core_bridge_contract::{
    AnswerQuestionRequest, ConfirmedFieldMapping, ImportCommitMode, ImportCommitRequest,
    ResetProgressRequest, StartSessionRequest,
};
use serde_json::Value;

fn fixture_bytes() -> Vec<u8> {
    let fixture_path = format!(
        "{}/../../fixtures/anki/basic-vocab.apkg",
        env!("CARGO_MANIFEST_DIR")
    );

    std::fs::read(fixture_path).unwrap()
}

#[test]
fn preview_commit_start_resume_and_answer_stays_inside_the_same_rust_service() {
    let mut service = PhaseOneService::default();

    let preview = service
        .preview_apkg("basic-vocab.apkg", &fixture_bytes())
        .unwrap();

    let commit = service
        .commit_apkg(ImportCommitRequest {
            import_id: preview.import_id.clone(),
            target_deck_id: preview.resolved_deck_id.clone(),
            commit_mode: ImportCommitMode::UpsertExistingDeck,
            confirmed_field_mapping: ConfirmedFieldMapping {
                lemma_field: "Front".to_string(),
                meaning_field: "Back".to_string(),
                example_field: Some("Example".to_string()),
                image_field: None,
                audio_field: None,
            },
        })
        .unwrap();

    assert_eq!(commit.imported_entry_count, 1);

    let question = service
        .start_session(StartSessionRequest {
            deck_id: commit.deck_id.clone(),
            mode: core_bridge_contract::SessionMode::ReviewDueFirst,
            force_new: Some(true),
        })
        .unwrap();

    assert_eq!(question.prompt_value, "apple");

    let resumed = service.get_active_session().unwrap();
    assert_eq!(resumed.question.as_ref(), Some(&question));

    let answer = service
        .answer_question(AnswerQuestionRequest {
            session_id: question.session_id.clone(),
            question_id: question.question_id.clone(),
            selected_option_id: question.options[0].id.clone(),
            rating_override: None,
        })
        .unwrap();

    assert!(answer.is_correct);
    assert!(answer.is_session_complete);
    assert!(service.get_active_session().unwrap().question.is_none());
}

#[test]
fn snapshot_round_trips_imported_state_and_active_session() {
    let mut service = PhaseOneService::default();

    let preview = service
        .preview_apkg("basic-vocab.apkg", &fixture_bytes())
        .unwrap();

    let commit = service
        .commit_apkg(ImportCommitRequest {
            import_id: preview.import_id.clone(),
            target_deck_id: preview.resolved_deck_id.clone(),
            commit_mode: ImportCommitMode::UpsertExistingDeck,
            confirmed_field_mapping: ConfirmedFieldMapping {
                lemma_field: "Front".to_string(),
                meaning_field: "Back".to_string(),
                example_field: Some("Example".to_string()),
                image_field: None,
                audio_field: None,
            },
        })
        .unwrap();

    let question = service
        .start_session(StartSessionRequest {
            deck_id: commit.deck_id.clone(),
            mode: core_bridge_contract::SessionMode::ReviewDueFirst,
            force_new: Some(true),
        })
        .unwrap();

    let snapshot = service.export_snapshot_json().unwrap();
    let mut restored = PhaseOneService::from_snapshot_json(&snapshot).unwrap();
    let resumed = restored.get_active_session().unwrap();

    assert_eq!(resumed.question.as_ref(), Some(&question));

    let answer = restored
        .answer_question(AnswerQuestionRequest {
            session_id: question.session_id.clone(),
            question_id: question.question_id.clone(),
            selected_option_id: question.options[0].id.clone(),
            rating_override: None,
        })
        .unwrap();

    assert!(answer.is_session_complete);
}

#[test]
fn reset_progress_keeps_review_history_and_adds_a_reset_boundary() {
    let mut service = PhaseOneService::default();

    let preview = service
        .preview_apkg("basic-vocab.apkg", &fixture_bytes())
        .unwrap();

    let commit = service
        .commit_apkg(ImportCommitRequest {
            import_id: preview.import_id.clone(),
            target_deck_id: preview.resolved_deck_id.clone(),
            commit_mode: ImportCommitMode::UpsertExistingDeck,
            confirmed_field_mapping: ConfirmedFieldMapping {
                lemma_field: "Front".to_string(),
                meaning_field: "Back".to_string(),
                example_field: Some("Example".to_string()),
                image_field: None,
                audio_field: None,
            },
        })
        .unwrap();

    let question = service
        .start_session(StartSessionRequest {
            deck_id: commit.deck_id.clone(),
            mode: core_bridge_contract::SessionMode::ReviewDueFirst,
            force_new: Some(true),
        })
        .unwrap();

    service
        .answer_question(AnswerQuestionRequest {
            session_id: question.session_id.clone(),
            question_id: question.question_id.clone(),
            selected_option_id: question.options[0].id.clone(),
            rating_override: None,
        })
        .unwrap();

    let snapshot_before_reset =
        serde_json::from_str::<Value>(&service.export_snapshot_json().unwrap()).unwrap();
    let review_events_before_reset = snapshot_before_reset["decks"][commit.deck_id.as_str()]
        ["review_events"]
        .as_array()
        .unwrap()
        .len();

    service
        .reset_progress(ResetProgressRequest {
            scope: core_bridge_contract::ProgressResetScope::Deck,
            target_card_id: None,
            target_deck_id: Some(commit.deck_id.clone()),
            reason: "user-reset".to_string(),
        })
        .unwrap();

    let snapshot_after_reset =
        serde_json::from_str::<Value>(&service.export_snapshot_json().unwrap()).unwrap();
    let deck_snapshot = &snapshot_after_reset["decks"][commit.deck_id.as_str()];
    let review_events_after_reset = deck_snapshot["review_events"].as_array().unwrap().len();
    let resets_after_reset = deck_snapshot["resets"].as_array().unwrap().len();

    assert_eq!(review_events_before_reset, 1);
    assert_eq!(review_events_after_reset, 1);
    assert_eq!(resets_after_reset, 1);
}
