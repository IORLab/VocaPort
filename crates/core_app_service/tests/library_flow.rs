use core_app_service::PhaseOneService;
use core_bridge_contract::{
    ConfirmedFieldMapping, ImportCommitMode, ImportCommitRequest, SelectDeckRequest,
};

#[test]
fn current_deck_survives_snapshot_round_trip() {
    let fixture_path = format!(
        "{}/../../fixtures/anki/basic-vocab.apkg",
        env!("CARGO_MANIFEST_DIR")
    );
    let bytes = std::fs::read(fixture_path).unwrap();
    let mut service = PhaseOneService::default();

    let preview = service.preview_apkg("basic-vocab.apkg", &bytes).unwrap();
    let response = service
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

    service
        .select_deck(SelectDeckRequest {
            deck_id: response.deck_id.clone(),
        })
        .unwrap();

    let snapshot = service.export_snapshot_json().unwrap();
    let restored = PhaseOneService::from_snapshot_json(&snapshot).unwrap();
    let listing = restored.list_decks().unwrap();

    assert_eq!(listing.decks.len(), 1);
    assert!(listing.decks[0].is_current_deck);
    assert_eq!(listing.decks[0].deck_id, response.deck_id);
}
