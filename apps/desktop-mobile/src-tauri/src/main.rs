fn main() {
    // Keep the native shell compiling before full Tauri wiring lands in later tasks.
    let _ = tauri::Builder::default();
}
