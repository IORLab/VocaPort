use core_app_service::{PhaseOneService, PhaseOneServiceError};
use core_bridge_contract::{
    ActiveSessionResponse, AnswerQuestionRequest, AnswerQuestionResponse, ImportCommitRequest,
    ImportCommitResponse, ImportPreviewResponse, ListDecksResponse, ResetProgressRequest,
    SelectDeckRequest, SelectDeckResponse, StartSessionRequest,
};
use js_sys::Uint8Array;
use serde::{de::DeserializeOwned, Serialize};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct PhaseOneWebRuntime {
    service: PhaseOneService,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ResetProgressResponse {
    ok: bool,
}

#[wasm_bindgen]
impl PhaseOneWebRuntime {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            service: PhaseOneService::default(),
        }
    }

    #[wasm_bindgen(js_name = healthPing)]
    pub fn health_ping(&self) -> String {
        "vocaport-ready".to_string()
    }

    #[wasm_bindgen(js_name = listCapabilities)]
    pub fn list_capabilities(&self) -> Result<JsValue, JsValue> {
        serialize_response(self.service.list_capabilities())
    }

    #[wasm_bindgen(js_name = previewApkg)]
    pub fn preview_apkg(
        &mut self,
        file_name: String,
        file_bytes: Uint8Array,
    ) -> Result<JsValue, JsValue> {
        let response = self
            .service
            .preview_apkg(&file_name, &file_bytes.to_vec())
            .map_err(js_error)?;

        serialize_response(response)
    }

    #[wasm_bindgen(js_name = commitApkg)]
    pub fn commit_apkg(&mut self, request: JsValue) -> Result<JsValue, JsValue> {
        let request = deserialize_request::<ImportCommitRequest>(request)?;
        let response = self.service.commit_apkg(request).map_err(js_error)?;

        serialize_response(response)
    }

    #[wasm_bindgen(js_name = listDecks)]
    pub fn list_decks(&self) -> Result<JsValue, JsValue> {
        let response = self.service.list_decks().map_err(js_error)?;
        serialize_response(response)
    }

    #[wasm_bindgen(js_name = selectDeck)]
    pub fn select_deck(&mut self, request: JsValue) -> Result<JsValue, JsValue> {
        let request = deserialize_request::<SelectDeckRequest>(request)?;
        let response = self.service.select_deck(request).map_err(js_error)?;
        serialize_response(response)
    }

    #[wasm_bindgen(js_name = getActiveSession)]
    pub fn get_active_session(&self) -> Result<JsValue, JsValue> {
        let response = self.service.get_active_session().map_err(js_error)?;
        serialize_response(response)
    }

    #[wasm_bindgen(js_name = startSession)]
    pub fn start_session(&mut self, request: JsValue) -> Result<JsValue, JsValue> {
        let request = deserialize_request::<StartSessionRequest>(request)?;
        let response = self.service.start_session(request).map_err(js_error)?;

        serialize_response(response)
    }

    #[wasm_bindgen(js_name = answerQuestion)]
    pub fn answer_question(&mut self, request: JsValue) -> Result<JsValue, JsValue> {
        let request = deserialize_request::<AnswerQuestionRequest>(request)?;
        let response = self.service.answer_question(request).map_err(js_error)?;

        serialize_response(response)
    }

    #[wasm_bindgen(js_name = resetProgress)]
    pub fn reset_progress(&mut self, request: JsValue) -> Result<JsValue, JsValue> {
        let request = deserialize_request::<ResetProgressRequest>(request)?;
        self.service.reset_progress(request).map_err(js_error)?;

        serialize_response(ResetProgressResponse { ok: true })
    }

    #[wasm_bindgen(js_name = exportSnapshotJson)]
    pub fn export_snapshot_json(&self) -> Result<String, JsValue> {
        self.service.export_snapshot_json().map_err(js_error)
    }

    #[wasm_bindgen(js_name = loadSnapshotJson)]
    pub fn load_snapshot_json(&mut self, snapshot_json: String) -> Result<(), JsValue> {
        self.service = PhaseOneService::from_snapshot_json(&snapshot_json).map_err(js_error)?;
        Ok(())
    }
}

fn deserialize_request<T>(value: JsValue) -> Result<T, JsValue>
where
    T: DeserializeOwned,
{
    serde_wasm_bindgen::from_value(value).map_err(|error| JsValue::from_str(&error.to_string()))
}

fn serialize_response<T>(value: T) -> Result<JsValue, JsValue>
where
    T: Serialize,
{
    serde_wasm_bindgen::to_value(&value).map_err(|error| JsValue::from_str(&error.to_string()))
}

fn js_error(error: PhaseOneServiceError) -> JsValue {
    JsValue::from_str(&error.to_string())
}

#[allow(dead_code)]
fn _assert_bridge_types(
    _: (
        ActiveSessionResponse,
        AnswerQuestionResponse,
        ImportCommitResponse,
        ImportPreviewResponse,
        ListDecksResponse,
        SelectDeckResponse,
    ),
) {
}
