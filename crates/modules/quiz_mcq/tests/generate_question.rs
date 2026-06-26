use core_bridge_contract::QuestionOptionKind;
use core_domain::{MediaAsset, MediaKind, StudyCard, VocabularyEntry};
use quiz_mcq::build_question;

#[test]
fn question_prefers_image_options_when_media_exists() {
    let card = StudyCard {
        id: "card-1".to_string(),
        entry_id: "entry-1".to_string(),
        prompt_mode: "lemma".to_string(),
        option_policy: "mixed".to_string(),
    };

    let entry = VocabularyEntry {
        id: "entry-1".to_string(),
        lemma: "apple".to_string(),
        phonetic: None,
        meanings: vec!["苹果".to_string()],
        examples: vec!["I eat an apple.".to_string()],
        tags: vec![],
        source_deck_id: "deck-1".to_string(),
        media_refs: vec!["media-1".to_string()],
    };

    let media = vec![MediaAsset {
        id: "media-1".to_string(),
        kind: MediaKind::Image,
        mime_type: "image/png".to_string(),
        storage_key: "apple.png".to_string(),
        origin: "anki".to_string(),
    }];

    let question = build_question(&card, &entry, &[], &media);
    assert_eq!(question.options[0].kind, QuestionOptionKind::Image);
    assert_eq!(question.options.len(), 4);
}

#[test]
fn question_falls_back_to_meaning_without_image_media() {
    let card = StudyCard {
        id: "card-2".to_string(),
        entry_id: "entry-2".to_string(),
        prompt_mode: "lemma".to_string(),
        option_policy: "mixed".to_string(),
    };

    let entry = VocabularyEntry {
        id: "entry-2".to_string(),
        lemma: "banana".to_string(),
        phonetic: None,
        meanings: vec!["香蕉".to_string()],
        examples: vec!["Bananas are yellow.".to_string()],
        tags: vec![],
        source_deck_id: "deck-1".to_string(),
        media_refs: vec![],
    };

    let question = build_question(&card, &entry, &[], &[]);
    assert_eq!(question.options[0].kind, QuestionOptionKind::Meaning);
    assert_eq!(question.options[0].value, "香蕉");
}
