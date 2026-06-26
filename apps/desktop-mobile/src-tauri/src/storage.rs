use rusqlite::Connection;

pub struct SqliteReviewEventRepository {
    pub connection: Connection,
}
