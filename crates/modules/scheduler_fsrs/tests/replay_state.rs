use core_events::{ProgressReset, ProgressResetScope, ReviewEvent, ReviewEventSource};
use scheduler_fsrs::rebuild_review_state;

#[test]
fn replay_ignores_events_before_latest_deck_reset() {
    let events = vec![
        ReviewEvent {
            id: "e1".to_string(),
            card_id: "card-1".to_string(),
            source: ReviewEventSource::AnkiImport,
            rating: 1,
            reviewed_at: "2026-06-01T00:00:00Z".to_string(),
            scheduled_days: Some(1),
            elapsed_days: Some(1),
            raw_payload: None,
        },
        ReviewEvent {
            id: "e2".to_string(),
            card_id: "card-1".to_string(),
            source: ReviewEventSource::AppReview,
            rating: 4,
            reviewed_at: "2026-06-20T00:00:00Z".to_string(),
            scheduled_days: Some(3),
            elapsed_days: Some(2),
            raw_payload: None,
        },
    ];

    let reset = ProgressReset {
        id: "r1".to_string(),
        scope: ProgressResetScope::Deck,
        target_card_id: None,
        target_deck_id: Some("deck-1".to_string()),
        reset_at: "2026-06-10T00:00:00Z".to_string(),
        reason: "user-reset".to_string(),
    };

    let state = rebuild_review_state("card-1", "deck-1", &events, Some(&reset));
    assert_eq!(state.review_count, 1);
    assert_eq!(
        state.last_reviewed_at.as_deref(),
        Some("2026-06-20T00:00:00Z")
    );
}

#[test]
fn replay_only_counts_events_for_requested_card() {
    let events = vec![
        ReviewEvent {
            id: "e1".to_string(),
            card_id: "card-1".to_string(),
            source: ReviewEventSource::AppReview,
            rating: 3,
            reviewed_at: "2026-06-21T00:00:00Z".to_string(),
            scheduled_days: Some(2),
            elapsed_days: Some(1),
            raw_payload: None,
        },
        ReviewEvent {
            id: "e2".to_string(),
            card_id: "card-2".to_string(),
            source: ReviewEventSource::AppReview,
            rating: 4,
            reviewed_at: "2026-06-22T00:00:00Z".to_string(),
            scheduled_days: Some(4),
            elapsed_days: Some(1),
            raw_payload: None,
        },
    ];

    let state = rebuild_review_state("card-1", "deck-1", &events, None);
    assert_eq!(state.review_count, 1);
    assert_eq!(
        state.last_reviewed_at.as_deref(),
        Some("2026-06-21T00:00:00Z")
    );
}
