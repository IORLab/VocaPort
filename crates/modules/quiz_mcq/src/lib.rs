use core_bridge_contract::{
    QuestionDto, QuestionOptionDto, QuestionOptionKind, QuestionPromptKind,
};
use core_domain::{MediaAsset, MediaKind, StudyCard, VocabularyEntry};

pub fn build_question(
    card: &StudyCard,
    entry: &VocabularyEntry,
    distractors: &[VocabularyEntry],
    media: &[MediaAsset],
) -> QuestionDto {
    let prefer_image = image_value_for_entry(entry, media).is_some();
    let mut options = Vec::with_capacity(4);

    options.push(build_option(
        "option-correct".to_string(),
        entry,
        media,
        prefer_image,
    ));

    for (index, distractor) in distractors.iter().take(3).enumerate() {
        options.push(build_option(
            format!("option-{}", index + 1),
            distractor,
            media,
            prefer_image,
        ));
    }

    while options.len() < 4 {
        options.push(QuestionOptionDto {
            id: format!("option-fallback-{}", options.len()),
            kind: QuestionOptionKind::Example,
            value: entry
                .examples
                .first()
                .cloned()
                .unwrap_or_else(|| format!("Fallback example {}", options.len())),
        });
    }

    QuestionDto {
        session_id: "session-1".to_string(),
        question_id: "question-1".to_string(),
        card_id: card.id.clone(),
        prompt_kind: prompt_kind_for_card(card),
        prompt_value: entry.lemma.clone(),
        options,
        remaining_count: 4,
        estimated_remaining_seconds: 90,
    }
}

fn build_option(
    option_id: String,
    entry: &VocabularyEntry,
    media: &[MediaAsset],
    prefer_image: bool,
) -> QuestionOptionDto {
    if prefer_image {
        if let Some(storage_key) = image_value_for_entry(entry, media) {
            return QuestionOptionDto {
                id: option_id,
                kind: QuestionOptionKind::Image,
                value: storage_key,
            };
        }
    }

    if let Some(meaning) = entry.meanings.first() {
        return QuestionOptionDto {
            id: option_id,
            kind: QuestionOptionKind::Meaning,
            value: meaning.clone(),
        };
    }

    if let Some(example) = entry.examples.first() {
        return QuestionOptionDto {
            id: option_id,
            kind: QuestionOptionKind::Example,
            value: example.clone(),
        };
    }

    QuestionOptionDto {
        id: option_id,
        kind: QuestionOptionKind::Example,
        value: entry.lemma.clone(),
    }
}

fn image_value_for_entry(entry: &VocabularyEntry, media: &[MediaAsset]) -> Option<String> {
    media.iter().find_map(|asset| {
        if asset.kind == MediaKind::Image && entry.media_refs.contains(&asset.id) {
            Some(asset.storage_key.clone())
        } else {
            None
        }
    })
}

fn prompt_kind_for_card(card: &StudyCard) -> QuestionPromptKind {
    if card.prompt_mode.eq_ignore_ascii_case("audio") {
        QuestionPromptKind::Audio
    } else {
        QuestionPromptKind::Lemma
    }
}
