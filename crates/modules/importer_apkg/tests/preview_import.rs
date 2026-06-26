use core_bridge_contract::{ConfirmedFieldMapping, ImportCommitMode, ImportCommitRequest};
use importer_apkg::{commit_apkg, load_imported_deck_bundle, preview_apkg};
use rusqlite::{Connection, MAIN_DB};
use std::io::Write;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

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

#[test]
fn load_imported_deck_bundle_imports_review_history_from_revlog() {
    let bytes = build_apkg_fixture_with_review_history();
    let preview = preview_apkg("history.apkg", &bytes).unwrap();
    assert_eq!(preview.review_event_count, 1);

    let bundle = load_imported_deck_bundle(
        "history.apkg",
        &bytes,
        &ConfirmedFieldMapping {
            lemma_field: "Front".to_string(),
            meaning_field: "Back".to_string(),
            example_field: Some("Example".to_string()),
            image_field: None,
            audio_field: None,
        },
        Some("deck-history"),
    )
    .unwrap();

    assert_eq!(bundle.entries.len(), 1);
    assert_eq!(bundle.cards.len(), 1);
    assert_eq!(bundle.review_events.len(), 1);
    assert_eq!(bundle.review_events[0].card_id, bundle.cards[0].id);
    assert_eq!(bundle.review_events[0].rating, 3);
    assert_eq!(bundle.review_events[0].scheduled_days, Some(5));
    assert_eq!(bundle.review_events[0].elapsed_days, Some(2));
}

fn build_apkg_fixture_with_review_history() -> Vec<u8> {
    let connection = Connection::open_in_memory().unwrap();

    connection
        .execute(
            "CREATE TABLE col (models TEXT NOT NULL, decks TEXT NOT NULL)",
            [],
        )
        .unwrap();
    connection
        .execute(
            "CREATE TABLE notes (id INTEGER PRIMARY KEY, flds TEXT NOT NULL)",
            [],
        )
        .unwrap();
    connection
        .execute(
            "CREATE TABLE cards (id INTEGER PRIMARY KEY, nid INTEGER NOT NULL)",
            [],
        )
        .unwrap();
    connection
        .execute(
            "CREATE TABLE revlog (id INTEGER PRIMARY KEY, cid INTEGER NOT NULL, ease INTEGER NOT NULL, ivl INTEGER NOT NULL, lastIvl INTEGER NOT NULL)",
            [],
        )
        .unwrap();

    connection
        .execute(
            "INSERT INTO col (models, decks) VALUES (?1, ?2)",
            (
                r#"{"1":{"name":"Basic Model","flds":[{"name":"Front"},{"name":"Back"},{"name":"Example"}]}}"#,
                r#"{"1":{"name":"Basic Vocab"}}"#,
            ),
        )
        .unwrap();
    connection
        .execute(
            "INSERT INTO notes (id, flds) VALUES (?1, ?2)",
            (1001_i64, "apple\u{1f}苹果\u{1f}I eat an apple."),
        )
        .unwrap();
    connection
        .execute(
            "INSERT INTO cards (id, nid) VALUES (?1, ?2)",
            (2001_i64, 1001_i64),
        )
        .unwrap();
    connection
        .execute(
            "INSERT INTO revlog (id, cid, ease, ivl, lastIvl) VALUES (?1, ?2, ?3, ?4, ?5)",
            (1_719_500_400_000_i64, 2001_i64, 3_i64, 5_i64, 2_i64),
        )
        .unwrap();

    let serialized = connection.serialize(MAIN_DB).unwrap();
    let database_bytes = serialized.to_vec();

    let mut buffer = std::io::Cursor::new(Vec::new());
    {
        let mut writer = ZipWriter::new(&mut buffer);
        let options =
            SimpleFileOptions::default().compression_method(CompressionMethod::Stored);

        writer
            .start_file("collection.anki2", options)
            .unwrap();
        writer.write_all(&database_bytes).unwrap();

        writer.start_file("media", options).unwrap();
        writer.write_all(b"{}").unwrap();
        writer.finish().unwrap();
    }

    buffer.into_inner()
}
