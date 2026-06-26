use core_bridge_contract::{
    ActiveSessionResponse, AnswerQuestionRequest, AnswerQuestionResponse, AppliedRating, Deck,
    DeckSummaryDto, ExplanationPayload, ImportCommitRequest, ImportCommitResponse,
    ImportPreviewResponse, ListDecksResponse, NextReviewSuggestion, ProgressResetScope,
    QuestionDto, QuestionOptionKind, QuestionPromptKind, ResetProgressRequest, SelectDeckRequest,
    SelectDeckResponse, SessionMode, StartSessionRequest,
};
use core_domain::{SessionQuestionSnapshot, StudyCard, StudySession, VocabularyEntry};
use core_events::{ImportRecord, ProgressReset, ReviewEvent, ReviewEventSource, ReviewState};
use importer_apkg::{commit_apkg, load_imported_deck_bundle, preview_apkg, ImportPreviewError};
use quiz_mcq::build_question;
use scheduler_fsrs::{rebuild_review_state, select_next_card};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum PhaseOneServiceError {
    #[error(transparent)]
    Import(#[from] ImportPreviewError),
    #[error("unknown import preview `{0}`")]
    MissingImportPreview(String),
    #[error("deck `{0}` has not been imported yet")]
    MissingDeck(String),
    #[error("no study cards are available for deck `{0}`")]
    NoCardsAvailable(String),
    #[error("there is no active study session")]
    MissingActiveSession,
    #[error("the submitted answer does not match the active question")]
    SessionQuestionMismatch,
    #[error(transparent)]
    SnapshotSerialization(#[from] serde_json::Error),
}

#[derive(Debug, Default)]
pub struct PhaseOneService {
    pending_imports: HashMap<String, PendingImport>,
    decks: HashMap<String, DeckState>,
    current_deck_id: Option<String>,
    active_session: Option<ActiveSessionState>,
    session_sequence: u32,
    question_sequence: u32,
    event_sequence: u32,
    reset_sequence: u32,
    timestamp_sequence: u32,
}

impl PhaseOneService {
    pub fn export_snapshot_json(&self) -> Result<String, PhaseOneServiceError> {
        Ok(serde_json::to_string(&PhaseOneServiceSnapshot {
            decks: self.decks.clone(),
            current_deck_id: self.current_deck_id.clone(),
            active_session: self.active_session.clone(),
            session_sequence: self.session_sequence,
            question_sequence: self.question_sequence,
            event_sequence: self.event_sequence,
            reset_sequence: self.reset_sequence,
            timestamp_sequence: self.timestamp_sequence,
        })?)
    }

    pub fn from_snapshot_json(snapshot_json: &str) -> Result<Self, PhaseOneServiceError> {
        let snapshot: PhaseOneServiceSnapshot = serde_json::from_str(snapshot_json)?;
        let current_deck_id = snapshot
            .current_deck_id
            .filter(|deck_id| snapshot.decks.contains_key(deck_id));

        Ok(Self {
            pending_imports: HashMap::new(),
            decks: snapshot.decks,
            current_deck_id,
            active_session: snapshot.active_session,
            session_sequence: snapshot.session_sequence,
            question_sequence: snapshot.question_sequence,
            event_sequence: snapshot.event_sequence,
            reset_sequence: snapshot.reset_sequence,
            timestamp_sequence: snapshot.timestamp_sequence,
        })
    }

    pub fn list_capabilities(&self) -> Vec<String> {
        vec![
            "import.apkg.read".to_string(),
            "quiz.generate".to_string(),
            "scheduler.compute".to_string(),
        ]
    }

    pub fn list_decks(&self) -> Result<ListDecksResponse, PhaseOneServiceError> {
        let mut decks = self
            .decks
            .iter()
            .map(|(deck_id, state)| DeckSummaryDto {
                deck_id: deck_id.clone(),
                deck_name: state._deck.name.clone(),
                entry_count: state.entries.len(),
                card_count: state.cards.len(),
                review_event_count: state.review_events.len(),
                due_count: state.cards.len(),
                has_active_session: self
                    .active_session
                    .as_ref()
                    .is_some_and(|session| session.session.deck_id == *deck_id),
                is_current_deck: self.current_deck_id.as_deref() == Some(deck_id.as_str()),
                last_imported_at: state
                    ._latest_import_record
                    .as_ref()
                    .map(|record| record.imported_at.clone()),
            })
            .collect::<Vec<_>>();

        decks.sort_by(|left, right| {
            left.deck_name
                .cmp(&right.deck_name)
                .then_with(|| left.deck_id.cmp(&right.deck_id))
        });

        Ok(ListDecksResponse { decks })
    }

    pub fn select_deck(
        &mut self,
        request: SelectDeckRequest,
    ) -> Result<SelectDeckResponse, PhaseOneServiceError> {
        if !self.decks.contains_key(&request.deck_id) {
            return Err(PhaseOneServiceError::MissingDeck(request.deck_id));
        }

        self.current_deck_id = Some(request.deck_id.clone());

        Ok(SelectDeckResponse {
            deck_id: request.deck_id,
        })
    }

    pub fn preview_apkg(
        &mut self,
        file_name: &str,
        file_bytes: &[u8],
    ) -> Result<ImportPreviewResponse, PhaseOneServiceError> {
        let preview = preview_apkg(file_name, file_bytes)?;
        self.pending_imports.insert(
            preview.import_id.clone(),
            PendingImport {
                file_name: file_name.to_string(),
                file_bytes: file_bytes.to_vec(),
                preview: preview.clone(),
            },
        );

        Ok(preview)
    }

    pub fn commit_apkg(
        &mut self,
        request: ImportCommitRequest,
    ) -> Result<ImportCommitResponse, PhaseOneServiceError> {
        let pending = self
            .pending_imports
            .remove(&request.import_id)
            .ok_or_else(|| PhaseOneServiceError::MissingImportPreview(request.import_id.clone()))?;
        let import_summary = commit_apkg(request.clone())?;
        let bundle = load_imported_deck_bundle(
            &pending.file_name,
            &pending.file_bytes,
            &request.confirmed_field_mapping,
            request
                .target_deck_id
                .as_deref()
                .or(pending.preview.resolved_deck_id.as_deref()),
        )?;
        let imported_at = self.next_timestamp();
        let import_record_id = format!("import-{}", request.import_id);

        let deck = Deck {
            id: bundle.deck_id.clone(),
            name: bundle.deck_name.clone(),
            source_type: "anki_apkg".to_string(),
            external_deck_id: None,
            latest_import_record_id: Some(import_record_id.clone()),
            created_at: imported_at.clone(),
            updated_at: imported_at.clone(),
        };
        let import_record = ImportRecord {
            id: import_record_id,
            deck_id: bundle.deck_id.clone(),
            source_type: "anki_apkg".to_string(),
            file_hash: bundle.file_hash.clone(),
            source_fingerprint: pending.preview.file_name.clone(),
            imported_at,
            entry_count: bundle.entries.len(),
            review_event_count: bundle.review_events.len(),
            skipped_count: 0,
            warning_count: 0,
        };

        self.decks.insert(
            bundle.deck_id.clone(),
            DeckState {
                _deck: deck,
                entries: bundle.entries,
                cards: bundle.cards,
                media: bundle.media,
                review_events: bundle.review_events,
                resets: Vec::new(),
                _latest_import_record: Some(import_record),
            },
        );

        Ok(ImportCommitResponse {
            deck_id: bundle.deck_id,
            deck_name: bundle.deck_name,
            imported_entry_count: self
                .decks
                .get(&import_summary.deck_id)
                .map(|state| state.entries.len())
                .unwrap_or(import_summary.imported_entry_count),
            imported_card_count: self
                .decks
                .get(&import_summary.deck_id)
                .map(|state| state.cards.len())
                .unwrap_or(import_summary.imported_card_count),
            imported_review_event_count: self
                .decks
                .get(&import_summary.deck_id)
                .map(|state| state.review_events.len())
                .unwrap_or(import_summary.imported_review_event_count),
            skipped_count: 0,
            warning_messages: import_summary.warning_messages,
            media_import_summary: format!(
                "{} embedded assets imported",
                self.decks
                    .get(&import_summary.deck_id)
                    .map(|state| state.media.len())
                    .unwrap_or(0)
            ),
            next_recommended_action: import_summary.next_recommended_action,
        })
    }

    pub fn start_session(
        &mut self,
        request: StartSessionRequest,
    ) -> Result<QuestionDto, PhaseOneServiceError> {
        if request.force_new != Some(true) {
            if let Some(active_session) = &self.active_session {
                if active_session.session.deck_id == request.deck_id {
                    return Ok(active_session.question.clone());
                }
            }
        }

        let deck_state = self
            .decks
            .get(&request.deck_id)
            .ok_or_else(|| PhaseOneServiceError::MissingDeck(request.deck_id.clone()))?;
        if deck_state.cards.is_empty() {
            return Err(PhaseOneServiceError::NoCardsAvailable(request.deck_id));
        }

        self.session_sequence += 1;
        let session_id = format!("session-{}", self.session_sequence);
        let card_ids = deck_state
            .cards
            .iter()
            .map(|card| card.id.clone())
            .collect::<Vec<_>>();
        let (question, correct_option_id, next_remaining) =
            self.build_next_question(&request.deck_id, &request.mode, &card_ids, &session_id)?;
        let started_at = self.next_timestamp();

        self.active_session = Some(ActiveSessionState {
            session: StudySession {
                id: session_id.clone(),
                deck_id: request.deck_id,
                mode: session_mode_label(&request.mode).to_string(),
                status: "active".to_string(),
                current_question: Some(snapshot_from_question(&question)),
                remaining_card_ids: next_remaining,
                answered_count: 0,
                started_at: started_at.clone(),
                last_activity_at: started_at,
            },
            session_mode: request.mode,
            question: question.clone(),
            correct_option_id,
        });

        Ok(question)
    }

    pub fn get_active_session(&self) -> Result<ActiveSessionResponse, PhaseOneServiceError> {
        Ok(ActiveSessionResponse {
            question: self.active_session.as_ref().map(|session| session.question.clone()),
        })
    }

    pub fn answer_question(
        &mut self,
        request: AnswerQuestionRequest,
    ) -> Result<AnswerQuestionResponse, PhaseOneServiceError> {
        let mut active_session = self
            .active_session
            .take()
            .ok_or(PhaseOneServiceError::MissingActiveSession)?;
        if active_session.session.id != request.session_id
            || active_session.question.question_id != request.question_id
        {
            self.active_session = Some(active_session);
            return Err(PhaseOneServiceError::SessionQuestionMismatch);
        }

        let deck_id = active_session.session.deck_id.clone();
        let question_card_id = active_session.question.card_id.clone();
        let deck_state = self
            .decks
            .get(&deck_id)
            .ok_or_else(|| {
                PhaseOneServiceError::MissingDeck(deck_id.clone())
            })?;
        let card = deck_state
            .cards
            .iter()
            .find(|candidate| candidate.id == question_card_id)
            .cloned()
            .ok_or(PhaseOneServiceError::SessionQuestionMismatch)?;
        let entry = deck_state
            .entries
            .iter()
            .find(|candidate| candidate.id == card.entry_id)
            .cloned()
            .ok_or(PhaseOneServiceError::SessionQuestionMismatch)?;
        let is_correct = request.selected_option_id == active_session.correct_option_id;
        let current_correct_option_id = active_session.correct_option_id.clone();
        let reviewed_at = self.next_timestamp();
        let last_activity_at = self.next_timestamp();

        self.event_sequence += 1;
        self.decks
            .get_mut(&deck_id)
            .ok_or_else(|| PhaseOneServiceError::MissingDeck(deck_id.clone()))?
            .review_events
            .push(ReviewEvent {
                id: format!("event-{}", self.event_sequence),
                card_id: card.id.clone(),
                source: ReviewEventSource::AppReview,
                rating: if is_correct { 4 } else { 1 },
                reviewed_at,
                scheduled_days: None,
                elapsed_days: None,
                raw_payload: None,
            });

        active_session.session.answered_count += 1;
        active_session.session.last_activity_at = last_activity_at;

        let correct_meaning = entry
            .meanings
            .first()
            .cloned()
            .unwrap_or_else(|| active_session.question.prompt_value.clone());

        let response = if active_session.session.remaining_card_ids.is_empty() {
            AnswerQuestionResponse {
                is_correct,
                correct_option_id: current_correct_option_id,
                applied_rating: applied_rating_for(is_correct, request.rating_override.is_some()),
                explanation_payload: ExplanationPayload {
                    target_word: entry.lemma.clone(),
                    correct_meaning,
                    example_sentence: entry.examples.first().cloned(),
                    audio_asset_id: None,
                },
                next_review_suggestion: NextReviewSuggestion {
                    due_at: None,
                    summary_text: "本轮学习已完成。".to_string(),
                },
                next_question: None,
                is_session_complete: true,
            }
        } else {
                let (next_question, next_correct_option_id, next_remaining) = self.build_next_question(
                &deck_id,
                &active_session.session_mode,
                &active_session.session.remaining_card_ids,
                &active_session.session.id,
            )?;
            active_session.correct_option_id = next_correct_option_id.clone();
            active_session.question = next_question.clone();
            active_session.session.current_question = Some(snapshot_from_question(&next_question));
            active_session.session.remaining_card_ids = next_remaining;

            let response = AnswerQuestionResponse {
                is_correct,
                correct_option_id: current_correct_option_id,
                applied_rating: applied_rating_for(is_correct, request.rating_override.is_some()),
                explanation_payload: ExplanationPayload {
                    target_word: entry.lemma.clone(),
                    correct_meaning,
                    example_sentence: entry.examples.first().cloned(),
                    audio_asset_id: None,
                },
                next_review_suggestion: NextReviewSuggestion {
                    due_at: None,
                    summary_text: "已切换到下一题。".to_string(),
                },
                next_question: Some(next_question),
                is_session_complete: false,
            };

            self.active_session = Some(active_session);
            response
        };

        Ok(response)
    }

    pub fn reset_progress(
        &mut self,
        request: ResetProgressRequest,
    ) -> Result<(), PhaseOneServiceError> {
        self.reset_sequence += 1;
        let reset = ProgressReset {
            id: format!("reset-{}", self.reset_sequence),
            scope: request.scope.clone(),
            target_card_id: request.target_card_id.clone(),
            target_deck_id: request.target_deck_id.clone(),
            reset_at: self.next_timestamp(),
            reason: request.reason,
        };

        match reset.scope {
            ProgressResetScope::All => {
                for deck_state in self.decks.values_mut() {
                    deck_state.resets.push(reset.clone());
                }
                self.active_session = None;
            }
            ProgressResetScope::Deck => {
                if let Some(deck_id) = &reset.target_deck_id {
                    let deck_state = self
                        .decks
                        .get_mut(deck_id)
                        .ok_or_else(|| PhaseOneServiceError::MissingDeck(deck_id.clone()))?;
                    deck_state.resets.push(reset.clone());
                    if self
                        .active_session
                        .as_ref()
                        .is_some_and(|session| session.session.deck_id == *deck_id)
                    {
                        self.active_session = None;
                    }
                }
            }
            ProgressResetScope::Card => {
                if let Some(active_session) = &self.active_session {
                    if active_session.session.current_question.as_ref().and_then(|snapshot| {
                        snapshot
                            .card_id
                            .eq(reset.target_card_id.as_deref().unwrap_or_default())
                            .then_some(())
                    }).is_some() {
                        self.active_session = None;
                    }
                }
                if let Some(target_card_id) = &reset.target_card_id {
                    for deck_state in self.decks.values_mut() {
                        if deck_state.cards.iter().any(|card| card.id == *target_card_id) {
                            deck_state.resets.push(reset.clone());
                            break;
                        }
                    }
                }
            }
        }

        Ok(())
    }

    fn build_next_question(
        &mut self,
        deck_id: &str,
        mode: &SessionMode,
        candidate_card_ids: &[String],
        session_id: &str,
    ) -> Result<(QuestionDto, String, Vec<String>), PhaseOneServiceError> {
        let deck_state = self
            .decks
            .get(deck_id)
            .ok_or_else(|| PhaseOneServiceError::MissingDeck(deck_id.to_string()))?;
        let scheduler_mode = scheduler_mode_for(mode);
        let card_states = candidate_card_ids
            .iter()
            .filter_map(|card_id| {
                let latest_reset = latest_reset_for(&deck_state.resets, card_id, deck_id);
                let review_state = rebuild_review_state(
                    card_id,
                    deck_id,
                    &deck_state.review_events,
                    latest_reset,
                );

                candidate_card_ids
                    .iter()
                    .any(|candidate| candidate == card_id)
                    .then_some(review_state)
            })
            .collect::<Vec<ReviewState>>();
        let next_card_id = select_next_card(&card_states, scheduler_mode)
            .ok_or_else(|| PhaseOneServiceError::NoCardsAvailable(deck_id.to_string()))?;
        let card = deck_state
            .cards
            .iter()
            .find(|candidate| candidate.id == next_card_id)
            .ok_or_else(|| PhaseOneServiceError::NoCardsAvailable(deck_id.to_string()))?;
        let entry = deck_state
            .entries
            .iter()
            .find(|candidate| candidate.id == card.entry_id)
            .ok_or_else(|| PhaseOneServiceError::NoCardsAvailable(deck_id.to_string()))?;
        let distractors = deck_state
            .entries
            .iter()
            .filter(|candidate| candidate.id != entry.id)
            .cloned()
            .collect::<Vec<VocabularyEntry>>();
        let mut question = build_question(card, entry, &distractors, &deck_state.media);

        self.question_sequence += 1;
        question.session_id = session_id.to_string();
        question.question_id = format!("question-{}", self.question_sequence);
        question.remaining_count = candidate_card_ids.len() as u32;

        let remaining_card_ids = candidate_card_ids
            .iter()
            .filter(|candidate| **candidate != next_card_id)
            .cloned()
            .collect::<Vec<_>>();

        Ok((question.clone(), question.options[0].id.clone(), remaining_card_ids))
    }

    fn next_timestamp(&mut self) -> String {
        let seconds = self.timestamp_sequence % 60;
        self.timestamp_sequence += 1;
        format!("2026-06-26T00:00:{seconds:02}Z")
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PendingImport {
    file_name: String,
    file_bytes: Vec<u8>,
    preview: ImportPreviewResponse,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct DeckState {
    _deck: Deck,
    entries: Vec<VocabularyEntry>,
    cards: Vec<StudyCard>,
    media: Vec<core_domain::MediaAsset>,
    review_events: Vec<ReviewEvent>,
    resets: Vec<ProgressReset>,
    _latest_import_record: Option<ImportRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ActiveSessionState {
    session: StudySession,
    session_mode: SessionMode,
    question: QuestionDto,
    correct_option_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PhaseOneServiceSnapshot {
    decks: HashMap<String, DeckState>,
    current_deck_id: Option<String>,
    active_session: Option<ActiveSessionState>,
    session_sequence: u32,
    question_sequence: u32,
    event_sequence: u32,
    reset_sequence: u32,
    timestamp_sequence: u32,
}

fn scheduler_mode_for(mode: &SessionMode) -> scheduler_fsrs::SessionMode {
    match mode {
        SessionMode::ReviewDueFirst => scheduler_fsrs::SessionMode::DueFirst,
        SessionMode::RandomPractice => scheduler_fsrs::SessionMode::RandomPractice,
    }
}

fn session_mode_label(mode: &SessionMode) -> &'static str {
    match mode {
        SessionMode::ReviewDueFirst => "review_due_first",
        SessionMode::RandomPractice => "random_practice",
    }
}

fn question_prompt_label(prompt_kind: &QuestionPromptKind) -> &'static str {
    match prompt_kind {
        QuestionPromptKind::Lemma => "lemma",
        QuestionPromptKind::Audio => "audio",
    }
}

fn question_option_kind_label(option_kind: &QuestionOptionKind) -> &'static str {
    match option_kind {
        QuestionOptionKind::Image => "image",
        QuestionOptionKind::Meaning => "meaning",
        QuestionOptionKind::Example => "example",
    }
}

fn snapshot_from_question(question: &QuestionDto) -> SessionQuestionSnapshot {
    SessionQuestionSnapshot {
        question_id: question.question_id.clone(),
        card_id: question.card_id.clone(),
        prompt_kind: question_prompt_label(&question.prompt_kind).to_string(),
        prompt_value: question.prompt_value.clone(),
        option_ids: question.options.iter().map(|option| option.id.clone()).collect(),
        option_kinds: question
            .options
            .iter()
            .map(|option| question_option_kind_label(&option.kind).to_string())
            .collect(),
        option_values: question
            .options
            .iter()
            .map(|option| option.value.clone())
            .collect(),
    }
}

fn applied_rating_for(is_correct: bool, hard_override: bool) -> AppliedRating {
    if !is_correct {
        AppliedRating::Again
    } else if hard_override {
        AppliedRating::Hard
    } else {
        AppliedRating::Good
    }
}

fn latest_reset_for<'a>(
    resets: &'a [ProgressReset],
    card_id: &str,
    deck_id: &str,
) -> Option<&'a ProgressReset> {
    resets.iter().rev().find(|reset| match reset.scope {
        ProgressResetScope::All => true,
        ProgressResetScope::Deck => reset.target_deck_id.as_deref() == Some(deck_id),
        ProgressResetScope::Card => reset.target_card_id.as_deref() == Some(card_id),
    })
}
