use core_events::{ProgressReset, ProgressResetScope, ReviewEvent, ReviewState};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionMode {
    DueFirst,
    RandomPractice,
}

pub fn rebuild_review_state(
    card_id: &str,
    deck_id: &str,
    events: &[ReviewEvent],
    latest_reset: Option<&ProgressReset>,
) -> ReviewState {
    let applies_reset =
        latest_reset.is_some_and(|reset| reset_applies_to_card(reset, card_id, deck_id));

    let filtered: Vec<&ReviewEvent> = events
        .iter()
        .filter(|event| event.card_id == card_id)
        .filter(|event| match latest_reset {
            Some(reset) if applies_reset => event.reviewed_at >= reset.reset_at,
            _ => true,
        })
        .collect();

    let last_reviewed_at = filtered.last().map(|event| event.reviewed_at.clone());

    ReviewState {
        card_id: card_id.to_string(),
        status: if filtered.is_empty() {
            "new".to_string()
        } else {
            "learning".to_string()
        },
        stability: None,
        difficulty: None,
        due_at: last_reviewed_at.clone(),
        last_reviewed_at,
        review_count: filtered.len() as u32,
    }
}

pub fn select_next_card(card_states: &[ReviewState], mode: SessionMode) -> Option<String> {
    match mode {
        SessionMode::DueFirst => card_states
            .iter()
            .filter(|state| state.status != "mastered")
            .min_by_key(|state| state.due_at.as_deref().unwrap_or("9999-12-31T23:59:59Z"))
            .map(|state| state.card_id.clone()),
        SessionMode::RandomPractice => card_states
            .iter()
            .rev()
            .find(|state| state.status != "mastered")
            .map(|state| state.card_id.clone()),
    }
}

fn reset_applies_to_card(reset: &ProgressReset, card_id: &str, deck_id: &str) -> bool {
    match reset.scope {
        ProgressResetScope::All => true,
        ProgressResetScope::Deck => reset.target_deck_id.as_deref() == Some(deck_id),
        ProgressResetScope::Card => reset.target_card_id.as_deref() == Some(card_id),
    }
}
