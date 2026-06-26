use core_bridge_contract::{ConfirmedFieldMapping, ImportCommitMode, ImportCommitRequest};
use importer_apkg::{commit_apkg, preview_apkg};

#[test]
fn preview_extracts_basic_fields_from_fixture() {
    let fixture_path = format!(
        "{}/../../../fixtures/anki/basic-vocab.apkg",
        env!("CARGO_MANIFEST_DIR")
    );
    let bytes = std::fs::read(fixture_path).unwrap();
    let preview = preview_apkg("basic-vocab.apkg", &bytes).unwrap();

    assert_eq!(preview.deck_name, "Basic Vocab");
    assert_eq!(
        preview
            .field_candidates
            .lemma
            .as_ref()
            .map(|candidate| candidate.field_name.as_str()),
        Some("Front")
    );
    assert_eq!(
        preview
            .field_candidates
            .meaning
            .as_ref()
            .map(|candidate| candidate.field_name.as_str()),
        Some("Back")
    );
}

#[test]
fn commit_returns_structured_import_summary() {
    let response = commit_apkg(ImportCommitRequest {
        import_id: "preview-1".to_string(),
        target_deck_id: Some("deck-1".to_string()),
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

    assert_eq!(response.deck_id, "deck-1");
    assert_eq!(response.imported_entry_count, 1);
}
