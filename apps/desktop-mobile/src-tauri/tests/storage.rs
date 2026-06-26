use rusqlite::{params, Connection};
use vocaport_native_shell::storage::SqliteReviewEventRepository;

#[test]
fn persists_review_event_rows() {
    let connection = Connection::open_in_memory().unwrap();
    connection
        .execute(
            "CREATE TABLE review_events (id TEXT PRIMARY KEY, card_id TEXT NOT NULL, source TEXT NOT NULL)",
            [],
        )
        .unwrap();

    let repository = SqliteReviewEventRepository { connection };
    repository
        .connection
        .execute(
            "INSERT INTO review_events (id, card_id, source) VALUES (?1, ?2, ?3)",
            params!["e1", "c1", "anki_import"],
        )
        .unwrap();

    let count: i64 = repository
        .connection
        .query_row("SELECT COUNT(*) FROM review_events", [], |row| row.get(0))
        .unwrap();

    assert_eq!(count, 1);
}
