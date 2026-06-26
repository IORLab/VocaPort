pub mod storage;

use core_app_service::PhaseOneService;
use core_bridge_contract::{
    ActiveSessionResponse, AnswerQuestionRequest, AnswerQuestionResponse, ImportCommitRequest,
    ImportCommitResponse, ImportPreviewResponse, ListDecksResponse, ResetProgressRequest,
    SelectDeckRequest, SelectDeckResponse, StartSessionRequest,
};
use std::error::Error;
use std::sync::Arc;
use std::sync::Mutex;
use storage::SqliteAppStateStore;
use tauri::Manager;

pub fn health_ping() -> &'static str {
    "vocaport-ready"
}

struct AppState {
    service: Mutex<PhaseOneService>,
    store: Arc<SqliteAppStateStore>,
}

#[tauri::command]
fn native_health_ping() -> &'static str {
    health_ping()
}

#[tauri::command]
fn list_capabilities(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    let service = state
        .service
        .lock()
        .map_err(|_| "failed to lock PhaseOneService".to_string())?;

    Ok(service.list_capabilities())
}

#[tauri::command]
fn preview_apkg(
    state: tauri::State<'_, AppState>,
    file_name: String,
    file_bytes: Vec<u8>,
) -> Result<ImportPreviewResponse, String> {
    let mut service = state
        .service
        .lock()
        .map_err(|_| "failed to lock PhaseOneService".to_string())?;

    service
        .preview_apkg(&file_name, &file_bytes)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn commit_apkg(
    state: tauri::State<'_, AppState>,
    request: ImportCommitRequest,
) -> Result<ImportCommitResponse, String> {
    let mut service = state
        .service
        .lock()
        .map_err(|_| "failed to lock PhaseOneService".to_string())?;
    let response = service.commit_apkg(request).map_err(|error| error.to_string())?;
    let snapshot_json = service
        .export_snapshot_json()
        .map_err(|error| error.to_string())?;
    drop(service);

    state
        .store
        .save_snapshot(&snapshot_json)
        .map_err(|error| error.to_string())?;

    Ok(response)
}

#[tauri::command]
fn list_decks(state: tauri::State<'_, AppState>) -> Result<ListDecksResponse, String> {
    let service = state
        .service
        .lock()
        .map_err(|_| "failed to lock PhaseOneService".to_string())?;

    service.list_decks().map_err(|error| error.to_string())
}

#[tauri::command]
fn select_deck(
    state: tauri::State<'_, AppState>,
    request: SelectDeckRequest,
) -> Result<SelectDeckResponse, String> {
    let mut service = state
        .service
        .lock()
        .map_err(|_| "failed to lock PhaseOneService".to_string())?;
    let response = service.select_deck(request).map_err(|error| error.to_string())?;
    let snapshot_json = service
        .export_snapshot_json()
        .map_err(|error| error.to_string())?;
    drop(service);

    state
        .store
        .save_snapshot(&snapshot_json)
        .map_err(|error| error.to_string())?;

    Ok(response)
}

#[tauri::command]
fn get_active_session(
    state: tauri::State<'_, AppState>,
) -> Result<ActiveSessionResponse, String> {
    let service = state
        .service
        .lock()
        .map_err(|_| "failed to lock PhaseOneService".to_string())?;

    service.get_active_session().map_err(|error| error.to_string())
}

#[tauri::command]
fn start_session(
    state: tauri::State<'_, AppState>,
    request: StartSessionRequest,
) -> Result<core_bridge_contract::QuestionDto, String> {
    let mut service = state
        .service
        .lock()
        .map_err(|_| "failed to lock PhaseOneService".to_string())?;
    let response = service.start_session(request).map_err(|error| error.to_string())?;
    let snapshot_json = service
        .export_snapshot_json()
        .map_err(|error| error.to_string())?;
    drop(service);

    state
        .store
        .save_snapshot(&snapshot_json)
        .map_err(|error| error.to_string())?;

    Ok(response)
}

#[tauri::command]
fn answer_question(
    state: tauri::State<'_, AppState>,
    request: AnswerQuestionRequest,
) -> Result<AnswerQuestionResponse, String> {
    let mut service = state
        .service
        .lock()
        .map_err(|_| "failed to lock PhaseOneService".to_string())?;
    let response = service
        .answer_question(request)
        .map_err(|error| error.to_string())?;
    let snapshot_json = service
        .export_snapshot_json()
        .map_err(|error| error.to_string())?;
    drop(service);

    state
        .store
        .save_snapshot(&snapshot_json)
        .map_err(|error| error.to_string())?;

    Ok(response)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ResetProgressResponse {
    ok: bool,
}

#[tauri::command]
fn reset_progress(
    state: tauri::State<'_, AppState>,
    request: ResetProgressRequest,
) -> Result<ResetProgressResponse, String> {
    let mut service = state
        .service
        .lock()
        .map_err(|_| "failed to lock PhaseOneService".to_string())?;
    service
        .reset_progress(request)
        .map_err(|error| error.to_string())?;
    let snapshot_json = service
        .export_snapshot_json()
        .map_err(|error| error.to_string())?;
    drop(service);

    state
        .store
        .save_snapshot(&snapshot_json)
        .map_err(|error| error.to_string())?;

    Ok(ResetProgressResponse { ok: true })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| -> Result<(), Box<dyn Error>> {
            let app_data_dir = app.path().app_local_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;

            let store = Arc::new(SqliteAppStateStore::new(
                app_data_dir.join("phase-one-state.sqlite3"),
            ));
            let service = match store.load_snapshot()? {
                Some(snapshot_json) => PhaseOneService::from_snapshot_json(&snapshot_json)?,
                None => PhaseOneService::default(),
            };

            app.manage(AppState {
                service: Mutex::new(service),
                store,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            native_health_ping,
            list_capabilities,
            preview_apkg,
            commit_apkg,
            list_decks,
            select_deck,
            get_active_session,
            start_session,
            answer_question,
            reset_progress
        ])
        .run(tauri::generate_context!())
        .expect("error while running VocaPort");
}
