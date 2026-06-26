pub mod storage;

pub fn health_ping() -> &'static str {
    "vocaport-ready"
}

#[tauri::command]
fn native_health_ping() -> &'static str {
    health_ping()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![native_health_ping])
        .run(tauri::generate_context!())
        .expect("error while running VocaPort");
}
