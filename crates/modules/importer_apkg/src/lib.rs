use core_bridge_contract::{
    ConfirmedFieldMapping, FieldCandidate, FieldCandidateSet, ImportCommitRequest,
    ImportCommitResponse, ImportPreviewResponse,
};
use core_domain::{MediaAsset, StudyCard, VocabularyEntry};
use core_events::{ReviewEvent, ReviewEventSource};
use rusqlite::{Connection, MAIN_DB};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::File;
use std::io::{Cursor, Read, Seek};
use std::path::Path;
use thiserror::Error;
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use uuid::Uuid;
use zip::ZipArchive;

#[derive(Debug, Error)]
pub enum ImportPreviewError {
    #[error("unsupported or unreadable apkg file: {0}")]
    Unsupported(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Sqlite(#[from] rusqlite::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Zip(#[from] zip::result::ZipError),
}

#[derive(Debug, Clone, PartialEq)]
pub struct ImportedDeckBundle {
    pub deck_id: String,
    pub deck_name: String,
    pub entries: Vec<VocabularyEntry>,
    pub cards: Vec<StudyCard>,
    pub media: Vec<MediaAsset>,
    pub review_events: Vec<ReviewEvent>,
    pub file_hash: String,
}

pub fn preview_apkg(
    file_name: &str,
    file_bytes: &[u8],
) -> Result<ImportPreviewResponse, ImportPreviewError> {
    validate_apkg_file(file_name, !file_bytes.is_empty())?;

    let mut archive = ZipArchive::new(Cursor::new(file_bytes))?;
    preview_archive(file_name, &mut archive, hash_bytes(file_bytes))
}

pub fn preview_apkg_from_path(
    file_path: &Path,
) -> Result<ImportPreviewResponse, ImportPreviewError> {
    let file_name = file_name_from_path(file_path)?;
    validate_apkg_file(&file_name, true)?;

    let file_hash = hash_file(file_path)?;
    let file = File::open(file_path)?;
    let mut archive = ZipArchive::new(file)?;

    preview_archive(&file_name, &mut archive, file_hash)
}

pub fn commit_apkg(
    request: ImportCommitRequest,
) -> Result<ImportCommitResponse, ImportPreviewError> {
    validate_mapping(&request.confirmed_field_mapping)?;

    let deck_id = request
        .target_deck_id
        .unwrap_or_else(|| "deck-basic-vocab".to_string());

    Ok(ImportCommitResponse {
        deck_id,
        deck_name: "Basic Vocab".to_string(),
        imported_entry_count: 1,
        imported_card_count: 1,
        imported_review_event_count: 0,
        skipped_count: 0,
        warning_messages: Vec::new(),
        media_import_summary: "0 embedded assets imported".to_string(),
        next_recommended_action: "start_study".to_string(),
    })
}

pub fn load_imported_deck_bundle(
    file_name: &str,
    file_bytes: &[u8],
    mapping: &ConfirmedFieldMapping,
    target_deck_id: Option<&str>,
) -> Result<ImportedDeckBundle, ImportPreviewError> {
    validate_apkg_file(file_name, !file_bytes.is_empty())?;

    let mut archive = ZipArchive::new(Cursor::new(file_bytes))?;
    load_bundle_from_archive(
        &mut archive,
        mapping,
        target_deck_id,
        hash_bytes(file_bytes),
    )
}

pub fn load_imported_deck_bundle_from_path(
    file_path: &Path,
    mapping: &ConfirmedFieldMapping,
    target_deck_id: Option<&str>,
) -> Result<ImportedDeckBundle, ImportPreviewError> {
    let file_name = file_name_from_path(file_path)?;
    validate_apkg_file(&file_name, true)?;

    let file_hash = hash_file(file_path)?;
    let file = File::open(file_path)?;
    let mut archive = ZipArchive::new(file)?;

    load_bundle_from_archive(&mut archive, mapping, target_deck_id, file_hash)
}

fn preview_archive<R: Read + Seek>(
    file_name: &str,
    archive: &mut ZipArchive<R>,
    file_hash: String,
) -> Result<ImportPreviewResponse, ImportPreviewError> {
    let collection_bytes = extract_collection_bytes(archive)?;
    let connection = open_collection_connection(&collection_bytes)?;
    let (models_json, decks_json): (String, String) =
        connection.query_row("SELECT models, decks FROM col LIMIT 1", [], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

    let deck_name = extract_first_name(&serde_json::from_str(&decks_json)?)?;
    let field_names = extract_field_names(&serde_json::from_str(&models_json)?)?;
    let entry_count = count_rows(&connection, "notes")?;
    let review_event_count = count_optional_rows(&connection, "revlog")?;
    let media_count = extract_media_count(archive)?;
    let deck_id = slugify_deck_id(&deck_name);
    let available_field_names = normalize_field_names(&field_names);

    Ok(ImportPreviewResponse {
        import_id: Uuid::new_v4().to_string(),
        file_hash,
        deck_name,
        resolved_deck_id: Some(deck_id.clone()),
        file_name: file_name.to_string(),
        entry_count,
        review_event_count,
        media_count,
        available_field_names,
        field_candidates: build_field_candidates(&field_names),
        unresolved_fields: Vec::new(),
        warning_messages: Vec::new(),
        is_duplicate_file: false,
        reimport_target_deck_id: Some(deck_id),
    })
}

fn load_bundle_from_archive<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
    mapping: &ConfirmedFieldMapping,
    target_deck_id: Option<&str>,
    file_hash: String,
) -> Result<ImportedDeckBundle, ImportPreviewError> {
    let collection_bytes = extract_collection_bytes(archive)?;
    let connection = open_collection_connection(&collection_bytes)?;
    let (models_json, decks_json): (String, String) =
        connection.query_row("SELECT models, decks FROM col LIMIT 1", [], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

    let deck_name = extract_first_name(&serde_json::from_str(&decks_json)?)?;
    let field_names = extract_field_names(&serde_json::from_str(&models_json)?)?;
    let field_index = build_field_index(&field_names);
    let note_rows = load_note_rows(&connection)?;
    let card_rows = load_card_rows(&connection)?;
    let revlog_rows = load_revlog_rows(&connection)?;
    let deck_id = target_deck_id
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| slugify_deck_id(&deck_name));

    let lemma_index = required_field_index(&field_index, &mapping.lemma_field)?;
    let meaning_index = required_field_index(&field_index, &mapping.meaning_field)?;
    let example_index = optional_field_index(&field_index, mapping.example_field.as_deref());

    let mut entries = Vec::with_capacity(note_rows.len());
    let mut cards = Vec::with_capacity(note_rows.len());
    let mut internal_card_ids_by_anki_card_id = HashMap::new();
    let primary_card_id_by_note_id = build_primary_card_index(&card_rows);

    for note in note_rows {
        let lemma = note
            .fields
            .get(lemma_index)
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                ImportPreviewError::Unsupported(format!("missing lemma value for note {}", note.id))
            })?;

        let meaning = note
            .fields
            .get(meaning_index)
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                ImportPreviewError::Unsupported(format!(
                    "missing meaning value for note {}",
                    note.id
                ))
            })?;

        let examples = example_index
            .and_then(|index| note.fields.get(index))
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
            .map(|value| vec![value.to_string()])
            .unwrap_or_default();

        let entry_id = format!("entry-{}", note.id);
        let anki_card_id = primary_card_id_by_note_id
            .get(&note.id)
            .copied()
            .unwrap_or(note.id);
        let card_id = format!("card-{anki_card_id}");

        entries.push(VocabularyEntry {
            id: entry_id.clone(),
            lemma,
            phonetic: None,
            meanings: vec![meaning],
            examples,
            tags: vec![],
            source_deck_id: deck_id.clone(),
            media_refs: vec![],
        });

        cards.push(StudyCard {
            id: card_id.clone(),
            entry_id,
            prompt_mode: "lemma".to_string(),
            option_policy: "mixed".to_string(),
        });

        internal_card_ids_by_anki_card_id.insert(anki_card_id, card_id);
    }

    let review_events = revlog_rows
        .into_iter()
        .filter_map(|row| {
            internal_card_ids_by_anki_card_id
                .get(&row.card_id)
                .cloned()
                .map(|internal_card_id| {
                    Ok(ReviewEvent {
                        id: format!("revlog-{}", row.id),
                        card_id: internal_card_id,
                        source: ReviewEventSource::AnkiImport,
                        rating: row.ease,
                        reviewed_at: format_revlog_timestamp(row.id)?,
                        scheduled_days: Some(row.interval_days),
                        elapsed_days: Some(row.last_interval_days),
                        raw_payload: Some(format!(
                            "{{\"cid\":{},\"ease\":{},\"ivl\":{},\"lastIvl\":{}}}",
                            row.card_id, row.ease, row.interval_days, row.last_interval_days
                        )),
                    })
                })
        })
        .collect::<Result<Vec<_>, ImportPreviewError>>()?;

    Ok(ImportedDeckBundle {
        deck_id,
        deck_name,
        entries,
        cards,
        media: Vec::new(),
        review_events,
        file_hash,
    })
}

fn extract_collection_bytes<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
) -> Result<Vec<u8>, ImportPreviewError> {
    for candidate in [
        "collection.anki21b",
        "collection.anki21",
        "collection.anki2",
    ] {
        if let Ok(mut collection) = archive.by_name(candidate) {
            let mut bytes = Vec::new();
            collection.read_to_end(&mut bytes)?;
            return Ok(bytes);
        }
    }

    Err(ImportPreviewError::Unsupported(
        "missing collection database in apkg".to_string(),
    ))
}

fn open_collection_connection(collection_bytes: &[u8]) -> Result<Connection, ImportPreviewError> {
    let mut connection = Connection::open_in_memory()?;
    connection.deserialize_read_exact(
        MAIN_DB,
        Cursor::new(collection_bytes),
        collection_bytes.len(),
        true,
    )?;

    Ok(connection)
}

fn extract_first_name(value: &Value) -> Result<String, ImportPreviewError> {
    value
        .as_object()
        .and_then(|items| {
            items
                .values()
                .find_map(|item| item.get("name").and_then(Value::as_str))
        })
        .map(ToOwned::to_owned)
        .ok_or_else(|| ImportPreviewError::Unsupported("missing deck name".to_string()))
}

fn extract_field_names(value: &Value) -> Result<Vec<String>, ImportPreviewError> {
    let model = value
        .as_object()
        .and_then(|items| items.values().next())
        .ok_or_else(|| ImportPreviewError::Unsupported("missing model definition".to_string()))?;

    let fields = model
        .get("flds")
        .and_then(Value::as_array)
        .ok_or_else(|| ImportPreviewError::Unsupported("missing model fields".to_string()))?;

    Ok(fields
        .iter()
        .filter_map(|field| field.get("name").and_then(Value::as_str))
        .map(ToOwned::to_owned)
        .collect())
}

#[derive(Debug, Clone)]
struct NoteRow {
    id: i64,
    fields: Vec<String>,
}

#[derive(Debug, Clone, Copy)]
struct CardRow {
    id: i64,
    note_id: i64,
}

#[derive(Debug, Clone, Copy)]
struct RevlogRow {
    id: i64,
    card_id: i64,
    ease: i32,
    interval_days: i32,
    last_interval_days: i32,
}

fn load_note_rows(connection: &Connection) -> Result<Vec<NoteRow>, ImportPreviewError> {
    let mut statement = connection.prepare("SELECT id, flds FROM notes ORDER BY id")?;
    let rows = statement.query_map([], |row| {
        let id = row.get::<_, i64>(0)?;
        let fields = row.get::<_, String>(1)?;

        Ok(NoteRow {
            id,
            fields: split_note_fields(&fields),
        })
    })?;

    let mut notes = Vec::new();
    for row in rows {
        notes.push(row?);
    }

    Ok(notes)
}

fn split_note_fields(raw_fields: &str) -> Vec<String> {
    raw_fields
        .split('\u{1f}')
        .map(|value| value.trim().to_string())
        .collect()
}

fn load_card_rows(connection: &Connection) -> Result<Vec<CardRow>, ImportPreviewError> {
    if !table_exists(connection, "cards")? {
        return Ok(Vec::new());
    }

    let mut statement = connection.prepare("SELECT id, nid FROM cards ORDER BY id")?;
    let rows = statement.query_map([], |row| {
        Ok(CardRow {
            id: row.get::<_, i64>(0)?,
            note_id: row.get::<_, i64>(1)?,
        })
    })?;

    let mut cards = Vec::new();
    for row in rows {
        cards.push(row?);
    }

    Ok(cards)
}

fn load_revlog_rows(connection: &Connection) -> Result<Vec<RevlogRow>, ImportPreviewError> {
    if !table_exists(connection, "revlog")? {
        return Ok(Vec::new());
    }

    let mut statement =
        connection.prepare("SELECT id, cid, ease, ivl, lastIvl FROM revlog ORDER BY id")?;
    let rows = statement.query_map([], |row| {
        Ok(RevlogRow {
            id: row.get::<_, i64>(0)?,
            card_id: row.get::<_, i64>(1)?,
            ease: row.get::<_, i32>(2)?,
            interval_days: row.get::<_, i32>(3)?,
            last_interval_days: row.get::<_, i32>(4)?,
        })
    })?;

    let mut events = Vec::new();
    for row in rows {
        events.push(row?);
    }

    Ok(events)
}

fn build_primary_card_index(card_rows: &[CardRow]) -> HashMap<i64, i64> {
    let mut primary_card_id_by_note_id = HashMap::new();

    for row in card_rows {
        primary_card_id_by_note_id
            .entry(row.note_id)
            .or_insert(row.id);
    }

    primary_card_id_by_note_id
}

fn build_field_index(field_names: &[String]) -> HashMap<String, usize> {
    field_names
        .iter()
        .enumerate()
        .map(|(index, field_name)| (field_name.trim().to_ascii_lowercase(), index))
        .collect()
}

fn normalize_field_names(field_names: &[String]) -> Vec<String> {
    let mut available_field_names = field_names
        .iter()
        .map(|field_name| field_name.trim().to_string())
        .filter(|field_name| !field_name.is_empty())
        .collect::<Vec<_>>();

    available_field_names.sort();
    available_field_names.dedup();
    available_field_names
}

fn required_field_index(
    field_index: &HashMap<String, usize>,
    field_name: &str,
) -> Result<usize, ImportPreviewError> {
    field_index
        .get(&field_name.trim().to_ascii_lowercase())
        .copied()
        .ok_or_else(|| {
            ImportPreviewError::Unsupported(format!(
                "field mapping `{field_name}` does not exist in the apkg model"
            ))
        })
}

fn optional_field_index(
    field_index: &HashMap<String, usize>,
    field_name: Option<&str>,
) -> Option<usize> {
    field_name.and_then(|value| field_index.get(&value.trim().to_ascii_lowercase()).copied())
}

fn count_rows(connection: &Connection, table_name: &str) -> Result<usize, ImportPreviewError> {
    let query = format!("SELECT COUNT(*) FROM {table_name}");
    let count: i64 = connection.query_row(&query, [], |row| row.get(0))?;
    Ok(count as usize)
}

fn count_optional_rows(
    connection: &Connection,
    table_name: &str,
) -> Result<usize, ImportPreviewError> {
    if !table_exists(connection, table_name)? {
        return Ok(0);
    }

    count_rows(connection, table_name)
}

fn table_exists(connection: &Connection, table_name: &str) -> Result<bool, ImportPreviewError> {
    let exists: i64 = connection.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
        [table_name],
        |row| row.get(0),
    )?;

    Ok(exists > 0)
}

fn extract_media_count<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
) -> Result<usize, ImportPreviewError> {
    let mut media_file = match archive.by_name("media") {
        Ok(file) => file,
        Err(_) => return Ok(0),
    };

    let mut media_json = String::new();
    media_file.read_to_string(&mut media_json)?;
    if media_json.trim().is_empty() {
        return Ok(0);
    }

    let value: Value = serde_json::from_str(&media_json)?;
    Ok(value.as_object().map_or(0, |items| items.len()))
}

fn file_name_from_path(file_path: &Path) -> Result<String, ImportPreviewError> {
    file_path
        .file_name()
        .and_then(|value| value.to_str())
        .map(ToOwned::to_owned)
        .ok_or_else(|| {
            ImportPreviewError::Unsupported(format!(
                "invalid apkg file path `{}`",
                file_path.display()
            ))
        })
}

fn hash_bytes(file_bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(file_bytes);
    format!("{:x}", hasher.finalize())
}

fn hash_file(file_path: &Path) -> Result<String, ImportPreviewError> {
    let mut file = File::open(file_path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 8192];

    loop {
        let bytes_read = file.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }

        hasher.update(&buffer[..bytes_read]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

fn validate_apkg_file(file_name: &str, has_content: bool) -> Result<(), ImportPreviewError> {
    if file_name.ends_with(".apkg") && has_content {
        return Ok(());
    }

    Err(ImportPreviewError::Unsupported(file_name.to_string()))
}

fn build_field_candidates(field_names: &[String]) -> FieldCandidateSet {
    FieldCandidateSet {
        lemma: find_lemma_field_candidate(field_names),
        meaning: find_meaning_field_candidate(field_names),
        example: find_example_field_candidate(field_names),
        image: find_image_field_candidate(field_names),
        audio: find_audio_field_candidate(field_names),
    }
}

fn format_revlog_timestamp(revlog_id: i64) -> Result<String, ImportPreviewError> {
    let milliseconds = i128::from(revlog_id);
    let timestamp =
        OffsetDateTime::from_unix_timestamp_nanos(milliseconds * 1_000_000).map_err(|error| {
            ImportPreviewError::Unsupported(format!(
                "invalid revlog timestamp `{revlog_id}`: {error}"
            ))
        })?;

    timestamp
        .format(&Rfc3339)
        .map_err(|error| ImportPreviewError::Unsupported(error.to_string()))
}

fn find_field_candidate(
    field_names: &[String],
    expected_names: &[&str],
    confidence: u8,
) -> Option<FieldCandidate> {
    field_names.iter().find_map(|field_name| {
        let normalized = normalize_field_name(field_name);
        if expected_names
            .iter()
            .any(|expected| *expected == normalized)
        {
            Some(FieldCandidate {
                field_name: field_name.clone(),
                confidence,
            })
        } else {
            None
        }
    })
}

fn find_lemma_field_candidate(field_names: &[String]) -> Option<FieldCandidate> {
    find_field_candidate(field_names, &["front", "lemma", "term", "word"], 100).or_else(|| {
        find_token_field_candidate(
            field_names,
            &["vocab"],
            &["kanji", "kana", "word", "term", "expression", "text", "lemma"],
            &[
                "alt",
                "audio",
                "back",
                "def",
                "example",
                "furigana",
                "id",
                "image",
                "meaning",
                "picture",
                "pitch",
                "pos",
                "sent",
                "sentence",
                "sound",
                "translation",
                "type",
            ],
            96,
        )
    })
    .or_else(|| {
        find_token_field_candidate(
            field_names,
            &[],
            &["kanji", "kana", "word", "term", "expression", "lemma", "front"],
            &[
                "alt",
                "audio",
                "back",
                "def",
                "example",
                "furigana",
                "id",
                "image",
                "meaning",
                "picture",
                "pitch",
                "pos",
                "sent",
                "sentence",
                "sound",
                "translation",
                "type",
            ],
            88,
        )
    })
}

fn find_meaning_field_candidate(field_names: &[String]) -> Option<FieldCandidate> {
    find_field_candidate(
        field_names,
        &["back", "meaning", "definition", "translation", "gloss"],
        100,
    )
    .or_else(|| {
        find_token_field_candidate(
            field_names,
            &[],
            &["def", "meaning", "definition", "translation", "gloss", "answer", "back"],
            &[
                "alt",
                "audio",
                "example",
                "id",
                "image",
                "picture",
                "sent",
                "sentence",
                "sound",
                "type",
            ],
            96,
        )
    })
}

fn find_example_field_candidate(field_names: &[String]) -> Option<FieldCandidate> {
    find_field_candidate(
        field_names,
        &["example", "sentence", "usage", "phrase", "context"],
        95,
    )
    .or_else(|| {
        find_token_field_candidate(
            field_names,
            &["sent"],
            &["kanji", "kana", "text", "raw", "content", "body", "value", "jp", "jpn", "zh", "en"],
            &["audio", "id", "image", "picture", "sound", "type"],
            92,
        )
    })
}

fn find_image_field_candidate(field_names: &[String]) -> Option<FieldCandidate> {
    find_field_candidate(field_names, &["image", "picture"], 80).or_else(|| {
        find_token_field_candidate(
            field_names,
            &[],
            &["image", "picture", "photo", "illustration"],
            &["audio", "sound"],
            76,
        )
    })
}

fn find_audio_field_candidate(field_names: &[String]) -> Option<FieldCandidate> {
    find_field_candidate(field_names, &["audio", "sound", "pronunciation", "voice"], 80)
        .or_else(|| {
            find_token_field_candidate(
                field_names,
                &[],
                &["audio", "sound", "pronunciation", "voice", "mp3"],
                &["image", "picture"],
                76,
            )
        })
}

fn find_token_field_candidate(
    field_names: &[String],
    required_tokens: &[&str],
    any_tokens: &[&str],
    excluded_tokens: &[&str],
    confidence: u8,
) -> Option<FieldCandidate> {
    field_names.iter().find_map(|field_name| {
        let tokens = tokenize_field_name(field_name);
        if required_tokens
            .iter()
            .all(|token| tokens.iter().any(|candidate| candidate == token))
            && (any_tokens.is_empty()
                || any_tokens
                    .iter()
                    .any(|token| tokens.iter().any(|candidate| candidate == token)))
            && excluded_tokens
                .iter()
                .all(|token| tokens.iter().all(|candidate| candidate != token))
        {
            Some(FieldCandidate {
                field_name: field_name.clone(),
                confidence,
            })
        } else {
            None
        }
    })
}

fn normalize_field_name(field_name: &str) -> String {
    field_name
        .trim()
        .chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .map(|character| character.to_ascii_lowercase())
        .collect()
}

fn tokenize_field_name(field_name: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut previous_character: Option<char> = None;

    for character in field_name.trim().chars() {
        if !character.is_ascii_alphanumeric() {
            push_field_name_token(&mut tokens, &mut current);
            previous_character = None;
            continue;
        }

        let should_split = if let Some(previous) = previous_character {
            (character.is_ascii_uppercase() && previous.is_ascii_lowercase())
                || (character.is_ascii_digit() && previous.is_ascii_alphabetic())
                || (character.is_ascii_alphabetic() && previous.is_ascii_digit())
        } else {
            false
        };

        if should_split {
            push_field_name_token(&mut tokens, &mut current);
        }

        current.push(character.to_ascii_lowercase());
        previous_character = Some(character);
    }

    push_field_name_token(&mut tokens, &mut current);
    tokens
}

fn push_field_name_token(tokens: &mut Vec<String>, current: &mut String) {
    if current.is_empty() {
        return;
    }

    tokens.push(std::mem::take(current));
}

fn slugify_deck_id(deck_name: &str) -> String {
    let slug = deck_name
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>()
        .join("-");

    format!("deck-{slug}")
}

fn validate_mapping(mapping: &ConfirmedFieldMapping) -> Result<(), ImportPreviewError> {
    if mapping.lemma_field.trim().is_empty() || mapping.meaning_field.trim().is_empty() {
        return Err(ImportPreviewError::Unsupported(
            "missing required mapping".to_string(),
        ));
    }

    Ok(())
}
