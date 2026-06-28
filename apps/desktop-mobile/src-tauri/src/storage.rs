use rusqlite::{Connection, OptionalExtension};
use std::path::{Path, PathBuf};

pub struct SqliteAppStateStore {
    database_path: PathBuf,
}

impl SqliteAppStateStore {
    pub fn new(database_path: impl AsRef<Path>) -> Self {
        Self {
            database_path: database_path.as_ref().to_path_buf(),
        }
    }

    pub fn save_snapshot(&self, snapshot_json: &str) -> rusqlite::Result<()> {
        let connection = self.open_connection()?;
        connection.execute(
            "INSERT INTO app_state (id, snapshot_json) VALUES (1, ?1)
             ON CONFLICT(id) DO UPDATE SET snapshot_json = excluded.snapshot_json",
            [snapshot_json],
        )?;

        Ok(())
    }

    pub fn load_snapshot(&self) -> rusqlite::Result<Option<String>> {
        let connection = self.open_connection()?;

        connection
            .query_row(
                "SELECT snapshot_json FROM app_state WHERE id = 1",
                [],
                |row| row.get::<_, String>(0),
            )
            .optional()
    }

    fn open_connection(&self) -> rusqlite::Result<Connection> {
        let connection = Connection::open(&self.database_path)?;
        initialize_schema(&connection)?;
        Ok(connection)
    }
}

fn initialize_schema(connection: &Connection) -> rusqlite::Result<()> {
    connection.execute(
        "CREATE TABLE IF NOT EXISTS app_state (
            id INTEGER PRIMARY KEY CHECK(id = 1),
            snapshot_json TEXT NOT NULL
        )",
        [],
    )?;

    Ok(())
}
