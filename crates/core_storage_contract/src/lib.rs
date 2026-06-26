use core_domain::{Deck, MediaAsset, StudyCard, StudySession, VocabularyEntry};
use core_events::{ImportRecord, ProgressReset, ReviewEvent, ReviewState};

pub trait DeckRepository {
    fn upsert_deck(&mut self, deck: Deck);
}

pub trait EntryRepository {
    fn upsert_entry(&mut self, entry: VocabularyEntry);
}

pub trait CardRepository {
    fn upsert_card(&mut self, card: StudyCard);
}

pub trait ReviewEventRepository {
    fn append_event(&mut self, event: ReviewEvent);
}

pub trait ReviewStateRepository {
    fn save_state(&mut self, state: ReviewState);
}

pub trait ProgressResetRepository {
    fn save_reset(&mut self, reset: ProgressReset);
}

pub trait StudySessionRepository {
    fn save_session(&mut self, session: StudySession);
    fn get_active_session(&self) -> Option<StudySession>;
}

pub trait MediaRepository {
    fn upsert_media(&mut self, asset: MediaAsset);
}

pub trait SettingsRepository {
    fn set_value(&mut self, key: String, value: String);
}

pub trait ImportRecordRepository {
    fn save_import_record(&mut self, record: ImportRecord);
}
