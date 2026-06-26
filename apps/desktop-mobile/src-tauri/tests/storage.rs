use std::time::{SystemTime, UNIX_EPOCH};
use vocaport_native_shell::storage::SqliteAppStateStore;

#[test]
fn persists_and_loads_app_state_snapshots() {
    let database_path = std::env::temp_dir().join(format!(
        "vocaport-storage-test-{}.sqlite3",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    let store = SqliteAppStateStore::new(&database_path);

    store.save_snapshot("{\"hello\":\"world\"}").unwrap();

    let loaded = store.load_snapshot().unwrap();
    assert_eq!(loaded.as_deref(), Some("{\"hello\":\"world\"}"));

    let _ = std::fs::remove_file(database_path);
}
