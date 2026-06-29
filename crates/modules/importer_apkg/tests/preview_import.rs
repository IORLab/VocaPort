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
fn preview_lists_all_available_fields_for_manual_mapping() {
    let fixture_path = format!(
        "{}/../../../fixtures/anki/basic-vocab.apkg",
        env!("CARGO_MANIFEST_DIR")
    );
    let bytes = std::fs::read(fixture_path).unwrap();
    let preview = preview_apkg("basic-vocab.apkg", &bytes).unwrap();

    assert_eq!(
        preview.available_field_names,
        vec![
            "Back".to_string(),
            "Example".to_string(),
            "Front".to_string(),
        ]
    );
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

#[test]
fn preview_and_load_bundle_prefer_collection_anki21_when_available() {
    let bytes = build_apkg_fixture_with_real_anki21_and_placeholder_anki2();

    let preview = preview_apkg("modern.apkg", &bytes).unwrap();

    assert_eq!(preview.deck_name, "Modern Deck");
    assert_eq!(preview.entry_count, 2);
    assert_eq!(
        preview.available_field_names,
        vec![
            "Back".to_string(),
            "Example".to_string(),
            "Front".to_string(),
        ]
    );

    let bundle = load_imported_deck_bundle(
        "modern.apkg",
        &bytes,
        &ConfirmedFieldMapping {
            lemma_field: "Front".to_string(),
            meaning_field: "Back".to_string(),
            example_field: Some("Example".to_string()),
            image_field: None,
            audio_field: None,
        },
        Some("deck-modern"),
    )
    .unwrap();

    assert_eq!(bundle.deck_name, "Modern Deck");
    assert_eq!(bundle.entries.len(), 2);
    assert_eq!(bundle.entries[0].lemma, "なす");
    assert_eq!(bundle.entries[0].meanings, vec!["茄子".to_string()]);
    assert_eq!(bundle.entries[0].examples, vec!["麻婆茄子".to_string()]);
}

#[test]
fn preview_guesses_common_apkg_field_names_beyond_front_and_back() {
    let database = build_collection_database_bytes(
        r#"{"1":{"name":"JLPT Model","flds":[{"name":"NoteID"},{"name":"VocabKanji"},{"name":"VocabDefSC"},{"name":"SentType1"},{"name":"SentKanji1"},{"name":"VocabAudio"}]}}"#,
        r#"{"1":{"name":"JLPT Deck"}}"#,
        &[(
            1001_i64,
            "1\u{1f}食べる\u{1f}吃\u{1f}basic\u{1f}昨日は寿司を食べる\u{1f}taberu.mp3",
        )],
        &[(2001_i64, 1001_i64)],
        &[],
    );
    let bytes = build_apkg_archive(&[("collection.anki21", &database), ("media", b"{}")]);

    let preview = preview_apkg("jlpt.apkg", &bytes).unwrap();

    assert_eq!(
        preview
            .field_candidates
            .lemma
            .as_ref()
            .map(|candidate| candidate.field_name.as_str()),
        Some("VocabKanji")
    );
    assert_eq!(
        preview
            .field_candidates
            .meaning
            .as_ref()
            .map(|candidate| candidate.field_name.as_str()),
        Some("VocabDefSC")
    );
    assert_eq!(
        preview
            .field_candidates
            .example
            .as_ref()
            .map(|candidate| candidate.field_name.as_str()),
        Some("SentKanji1")
    );
    assert_eq!(
        preview
            .field_candidates
            .audio
            .as_ref()
            .map(|candidate| candidate.field_name.as_str()),
        Some("VocabAudio")
    );
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
        let options = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);

        writer.start_file("collection.anki2", options).unwrap();
        writer.write_all(&database_bytes).unwrap();

        writer.start_file("media", options).unwrap();
        writer.write_all(b"{}").unwrap();
        writer.finish().unwrap();
    }

    buffer.into_inner()
}

fn build_apkg_fixture_with_real_anki21_and_placeholder_anki2() -> Vec<u8> {
    let real_database = build_collection_database_bytes(
        r#"{"1":{"name":"Modern Model","flds":[{"name":"Front"},{"name":"Back"},{"name":"Example"}]}}"#,
        r#"{"1":{"name":"Modern Deck"}}"#,
        &[
            (1001_i64, "なす\u{1f}茄子\u{1f}麻婆茄子"),
            (1002_i64, "りんご\u{1f}苹果\u{1f}青森のりんご"),
        ],
        &[(2001_i64, 1001_i64), (2002_i64, 1002_i64)],
        &[],
    );
    let placeholder_database = build_collection_database_bytes(
        r#"{"1":{"name":"Legacy Placeholder","flds":[{"name":"Text"}]}}"#,
        r#"{"1":{"name":"Placeholder Deck"}}"#,
        &[(
            1_i64,
            "请更新至 Anki 的最新版本，然后再次导入 .colpkg/.apkg 文件。",
        )],
        &[(1_i64, 1_i64)],
        &[],
    );

    build_apkg_archive(&[
        ("collection.anki21", &real_database),
        ("collection.anki2", &placeholder_database),
        ("media", b"{}"),
    ])
}

fn build_collection_database_bytes(
    models: &str,
    decks: &str,
    notes: &[(i64, &str)],
    cards: &[(i64, i64)],
    revlog_rows: &[(i64, i64, i64, i64, i64)],
) -> Vec<u8> {
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
            (models, decks),
        )
        .unwrap();

    for (id, fields) in notes {
        connection
            .execute("INSERT INTO notes (id, flds) VALUES (?1, ?2)", (id, fields))
            .unwrap();
    }

    for (card_id, note_id) in cards {
        connection
            .execute(
                "INSERT INTO cards (id, nid) VALUES (?1, ?2)",
                (card_id, note_id),
            )
            .unwrap();
    }

    for (id, card_id, ease, interval_days, last_interval_days) in revlog_rows {
        connection
            .execute(
                "INSERT INTO revlog (id, cid, ease, ivl, lastIvl) VALUES (?1, ?2, ?3, ?4, ?5)",
                (id, card_id, ease, interval_days, last_interval_days),
            )
            .unwrap();
    }

    connection.serialize(MAIN_DB).unwrap().to_vec()
}

fn build_apkg_archive(entries: &[(&str, &[u8])]) -> Vec<u8> {
    let mut buffer = std::io::Cursor::new(Vec::new());
    {
        let mut writer = ZipWriter::new(&mut buffer);
        let options = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);

        for (file_name, file_bytes) in entries {
            writer.start_file(file_name, options).unwrap();
            writer.write_all(file_bytes).unwrap();
        }

        writer.finish().unwrap();
    }

    buffer.into_inner()
}
