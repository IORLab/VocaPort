# VocaPort Phase 2 Implementation Plan

> Chinese companion (中文伴读版): [2026-06-26-vocaport-phase-2.zh.md](/Users/jay/Code/VocaPort/docs/superpowers/plans/2026-06-26-vocaport-phase-2.zh.md)

> Reading note: advanced terms and domain-heavy phrases are glossed in Chinese where they most affect reading speed.

> **For agentic workers (代理执行者):** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended, 推荐) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal (目标):** Ship the first usable VocaPort beta: an Android-first but shared-core build that lets a user install a beta, import a real text-first Anki `.apkg`, choose the current deck, review or adjust field mapping before commit, resume or reset progress safely, and complete the full study loop without relying on debug-only assumptions.

**Architecture (架构):** Keep `Rust` as the single source of truth for deck state, import decisions, session recovery, and snapshot persistence. Extend the existing bridge contracts with library-aware state, pass the new commands through both WASM and Tauri adapters, and upgrade the shared UI from a single demo flow to a mobile-first workspace that still reuses the same runtime contract on Web and Desktop. Beta release semantics should be upgraded in the existing GitHub Releases / Pages path instead of building a second distribution system.

**Tech Stack (技术栈):** `Vite`, `React`, `TypeScript` (`strict: true`), `Tailwind CSS`, `Vitest`, `Tauri 2`, `Rust`, `serde`, `thiserror`, `rusqlite`, `IndexedDB`, `SQLite`, `GitHub Actions`

## Global Constraints (全局约束)

- `Rust` remains the only source of truth for deck library state, import decisions, study state, and snapshot restore.
- `TypeScript` remains limited to UI, runtime bridging, and interaction orchestration (交互编排).
- Phase 2 stays `offline-first` and `local-first`.
- Phase 2 does not add iOS, cloud sync, accounts, or runtime third-party plugin execution.
- The official Phase 2 beta path is still text-first; image or audio playback is not required for completion.
- Web and Desktop shells stay thin. Shared UI logic continues to live in `packages/ui`.
- New DTOs must round-trip cleanly between `packages/bridge-schema` and `crates/core_bridge_contract`.
- The downloads page must stop presenting Android beta artifacts as generic APKs.
- Each task must end with focused verification and a separate commit.

---

This plan stays as one implementation plan because library state, import review, runtime bridging, shared UI, and beta release semantics all evolve around the same bridge contracts. Splitting them now would duplicate interfaces and blur the acceptance boundary.

### Task 1: Add Library-Aware State And Current-Deck Contracts

**Files:**

- Modify: `packages/bridge-schema/src/index.ts`
- Modify: `packages/bridge-schema/src/index.test.ts`
- Modify: `crates/core_bridge_contract/src/lib.rs`
- Modify: `crates/core_bridge_contract/tests/session_contract.rs`
- Modify: `crates/core_app_service/src/lib.rs`
- Create: `crates/core_app_service/tests/library_flow.rs`

**Interfaces:**

- Produces: `DeckSummaryDto`
- Produces: `ListDecksResponse`
- Produces: `SelectDeckRequest`
- Produces: `SelectDeckResponse`
- Produces: `PhaseOneService::list_decks(&self) -> Result<ListDecksResponse, PhaseOneServiceError>`
- Produces: `PhaseOneService::select_deck(&mut self, request: SelectDeckRequest) -> Result<SelectDeckResponse, PhaseOneServiceError>`

- [ ] **Step 1: Write the failing bridge and service tests**

```ts
// packages/bridge-schema/src/index.test.ts
import { describe, expect, it } from "vitest";
import type {
  DeckSummaryDto,
  ListDecksResponse,
  SelectDeckRequest,
} from "./index";

describe("phase 2 library contracts", () => {
  it("exports the current-deck DTOs", () => {
    const response: ListDecksResponse = {
      decks: [
        {
          deckId: "deck-basic-vocab",
          deckName: "Basic Vocab",
          entryCount: 1,
          cardCount: 1,
          reviewEventCount: 0,
          dueCount: 1,
          hasActiveSession: false,
          isCurrentDeck: true,
        } satisfies DeckSummaryDto,
      ],
    };

    const request: SelectDeckRequest = { deckId: response.decks[0].deckId };
    expect(request.deckId).toBe("deck-basic-vocab");
  });
});
```

```rust
// crates/core_app_service/tests/library_flow.rs
use core_app_service::PhaseOneService;
use core_bridge_contract::{
    ConfirmedFieldMapping, ImportCommitMode, ImportCommitRequest, SelectDeckRequest,
};

#[test]
fn current_deck_survives_snapshot_round_trip() {
    let fixture_path = format!(
        "{}/../../fixtures/anki/basic-vocab.apkg",
        env!("CARGO_MANIFEST_DIR")
    );
    let bytes = std::fs::read(fixture_path).unwrap();
    let mut service = PhaseOneService::default();

    let preview = service.preview_apkg("basic-vocab.apkg", &bytes).unwrap();
    let response = service
        .commit_apkg(ImportCommitRequest {
            import_id: preview.import_id.clone(),
            target_deck_id: preview.resolved_deck_id.clone(),
            commit_mode: ImportCommitMode::UpsertExistingDeck,
            confirmed_field_mapping: ConfirmedFieldMapping {
                lemma_field: "Front".to_string(),
                meaning_field: "Back".to_string(),
                example_field: Some("Example".to_string()),
                image_field: None,
                audio_field: None,
            },
        })
        .unwrap();

    service
        .select_deck(SelectDeckRequest {
            deck_id: response.deck_id.clone(),
        })
        .unwrap();

    let snapshot = service.export_snapshot_json().unwrap();
    let restored = PhaseOneService::from_snapshot_json(&snapshot).unwrap();
    let listing = restored.list_decks().unwrap();

    assert_eq!(listing.decks.len(), 1);
    assert!(listing.decks[0].is_current_deck);
    assert_eq!(listing.decks[0].deck_id, response.deck_id);
}
```

- [ ] **Step 2: Run the focused checks and confirm they fail**

Run:

```bash
pnpm --filter @vocaport/bridge-schema test
cargo test -p core_app_service --test library_flow
```

Expected:

- `bridge-schema` fails because the new DTO exports do not exist yet.
- `core_app_service` fails because `list_decks` and `select_deck` do not exist yet.

- [ ] **Step 3: Implement the smallest library-aware contract and service state**

```ts
// packages/bridge-schema/src/index.ts
export interface DeckSummaryDto {
  deckId: string;
  deckName: string;
  entryCount: number;
  cardCount: number;
  reviewEventCount: number;
  dueCount: number;
  hasActiveSession: boolean;
  isCurrentDeck: boolean;
  lastImportedAt?: string;
}

export interface ListDecksResponse {
  decks: DeckSummaryDto[];
}

export interface SelectDeckRequest {
  deckId: string;
}

export interface SelectDeckResponse {
  deckId: string;
}
```

```rust
// crates/core_bridge_contract/src/lib.rs
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DeckSummaryDto {
    pub deck_id: String,
    pub deck_name: String,
    pub entry_count: usize,
    pub card_count: usize,
    pub review_event_count: usize,
    pub due_count: usize,
    pub has_active_session: bool,
    pub is_current_deck: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_imported_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ListDecksResponse {
    pub decks: Vec<DeckSummaryDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SelectDeckRequest {
    pub deck_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SelectDeckResponse {
    pub deck_id: String,
}
```

```rust
// crates/core_app_service/src/lib.rs
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

pub fn list_decks(&self) -> Result<ListDecksResponse, PhaseOneServiceError> {
    let decks = self
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
        .collect();

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
```

- [ ] **Step 4: Re-run the focused checks and confirm they pass**

Run:

```bash
pnpm --filter @vocaport/bridge-schema typecheck
pnpm --filter @vocaport/bridge-schema test
cargo test -p core_bridge_contract
cargo test -p core_app_service --test library_flow
```

Expected:

- All bridge tests pass.
- The service round-trips `current_deck_id` through snapshot export and restore.

- [ ] **Step 5: Commit**

```bash
git add packages/bridge-schema/src/index.ts \
  packages/bridge-schema/src/index.test.ts \
  crates/core_bridge_contract/src/lib.rs \
  crates/core_bridge_contract/tests/session_contract.rs \
  crates/core_app_service/src/lib.rs \
  crates/core_app_service/tests/library_flow.rs
git commit -m "feat: add current deck library contracts"
```

### Task 2: Expose Full Preview Field Choices For Import Review

**Files:**

- Modify: `packages/bridge-schema/src/index.ts`
- Modify: `crates/core_bridge_contract/src/lib.rs`
- Modify: `crates/modules/importer_apkg/src/lib.rs`
- Modify: `crates/modules/importer_apkg/tests/preview_import.rs`

**Interfaces:**

- Produces: `ImportPreviewResponse.availableFieldNames: string[]`

- [ ] **Step 1: Write the failing importer contract test**

```rust
// crates/modules/importer_apkg/tests/preview_import.rs
#[test]
fn preview_lists_all_available_fields_for_manual_mapping() {
    let fixture_path = format!(
        "{}/../../../fixtures/anki/basic-vocab.apkg",
        env!("CARGO_MANIFEST_DIR")
    );
    let bytes = std::fs::read(fixture_path).unwrap();
    let preview = preview_apkg("basic-vocab.apkg", &bytes).unwrap();

    assert_eq!(
        preview.available_field_names,
        vec![
            "Back".to_string(),
            "Example".to_string(),
            "Front".to_string(),
        ]
    );
}
```

- [ ] **Step 2: Run the importer test and confirm it fails**

Run:

```bash
cargo test -p importer_apkg preview_lists_all_available_fields_for_manual_mapping
```

Expected:

- The test fails because `available_field_names` is missing from `ImportPreviewResponse`.

- [ ] **Step 3: Add a stable field-name list to the preview DTO**

```ts
// packages/bridge-schema/src/index.ts
export interface ImportPreviewResponse {
  importId: string;
  fileHash: string;
  deckName: string;
  resolvedDeckId?: string;
  fileName: string;
  entryCount: number;
  reviewEventCount: number;
  mediaCount: number;
  availableFieldNames: string[];
  fieldCandidates: FieldCandidateSet;
  unresolvedFields: string[];
  warningMessages: string[];
  isDuplicateFile: boolean;
  reimportTargetDeckId?: string;
}
```

```rust
// crates/core_bridge_contract/src/lib.rs
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportPreviewResponse {
    pub import_id: String,
    pub file_hash: String,
    pub deck_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolved_deck_id: Option<String>,
    pub file_name: String,
    pub entry_count: usize,
    pub review_event_count: usize,
    pub media_count: usize,
    pub available_field_names: Vec<String>,
    pub field_candidates: FieldCandidateSet,
    pub unresolved_fields: Vec<String>,
    pub warning_messages: Vec<String>,
    pub is_duplicate_file: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reimport_target_deck_id: Option<String>,
}
```

```rust
// crates/modules/importer_apkg/src/lib.rs
let mut available_field_names = model_fields
    .iter()
    .map(|field| field.name.clone())
    .collect::<Vec<_>>();
available_field_names.sort();
available_field_names.dedup();

Ok(ImportPreviewResponse {
    import_id,
    file_hash,
    deck_name,
    resolved_deck_id,
    file_name: file_name.to_string(),
    entry_count,
    review_event_count,
    media_count,
    available_field_names,
    field_candidates,
    unresolved_fields,
    warning_messages,
    is_duplicate_file,
    reimport_target_deck_id,
})
```

- [ ] **Step 4: Re-run the focused checks and confirm they pass**

Run:

```bash
cargo test -p importer_apkg
cargo test -p core_bridge_contract
pnpm --filter @vocaport/bridge-schema typecheck
```

Expected:

- Import preview tests pass.
- Bridge serialization still uses the expected camelCase field names.

- [ ] **Step 5: Commit**

```bash
git add packages/bridge-schema/src/index.ts \
  crates/core_bridge_contract/src/lib.rs \
  crates/modules/importer_apkg/src/lib.rs \
  crates/modules/importer_apkg/tests/preview_import.rs
git commit -m "feat: expose import preview field choices"
```

### Task 3: Wire Library Commands Through WASM And Native Runtimes

**Files:**

- Modify: `packages/ts-sdk/src/index.ts`
- Modify: `apps/web/src/runtime.ts`
- Modify: `apps/web/src/runtime.test.ts`
- Modify: `crates/core_web_wasm/src/lib.rs`
- Modify: `apps/desktop-mobile/src/runtime.ts`
- Modify: `apps/desktop-mobile/src-tauri/src/lib.rs`

**Interfaces:**

- Consumes: `ListDecksResponse`, `SelectDeckRequest`, `SelectDeckResponse`
- Produces: runtime command `library.listDecks`
- Produces: runtime command `library.selectDeck`

- [ ] **Step 1: Write the failing runtime persistence test**

```ts
// apps/web/src/runtime.test.ts
it("restores the current deck selection after recreating the runtime", async () => {
  const fixtureBytes = await loadBasicApkgFixture();
  const firstRuntime = createWebRuntime();
  const preview = await firstRuntime.invoke<
    ImportPreviewRequest,
    ImportPreviewResponse
  >("import.previewApkg", {
    fileName: "basic-vocab.apkg",
    fileBytes: fixtureBytes,
  });

  const commit = await firstRuntime.invoke<ImportCommitRequest, { deckId: string }>(
    "import.commitApkg",
    {
      importId: preview.importId,
      targetDeckId: preview.resolvedDeckId,
      commitMode: "upsert_existing_deck",
      confirmedFieldMapping: {
        lemmaField: "Front",
        meaningField: "Back",
        exampleField: "Example",
      },
    },
  );

  await firstRuntime.invoke("library.selectDeck", { deckId: commit.deckId });

  const secondRuntime = createWebRuntime();
  const listing = await secondRuntime.invoke<
    undefined,
    { decks: Array<{ deckId: string; isCurrentDeck: boolean }> }
  >("library.listDecks", undefined);

  expect(listing.decks).toHaveLength(1);
  expect(listing.decks[0]).toMatchObject({
    deckId: commit.deckId,
    isCurrentDeck: true,
  });
});
```

- [ ] **Step 2: Run the web runtime suite and confirm it fails**

Run:

```bash
pnpm --filter @vocaport/web test
```

Expected:

- The suite fails because `library.listDecks` and `library.selectDeck` are not recognized yet.

- [ ] **Step 3: Add the new commands to every runtime boundary**

```ts
// packages/ts-sdk/src/index.ts
if (command === "library.listDecks") {
  return {
    decks: activeDecks,
  } as TResponse;
}

if (command === "library.selectDeck") {
  const request = payload as { deckId: string };
  activeDecks = activeDecks.map((deck) => ({
    ...deck,
    isCurrentDeck: deck.deckId === request.deckId,
  }));
  return { deckId: request.deckId } as TResponse;
}
```

```ts
// apps/web/src/runtime.ts
const mutatingCommands = new Set([
  "import.commitApkg",
  "library.selectDeck",
  "quiz.startSession",
  "quiz.answerQuestion",
  "review.resetProgress",
]);

if (command === "library.listDecks") {
  return runtime.listDecks() as TResponse;
}

if (command === "library.selectDeck") {
  response = runtime.selectDeck(payload) as TResponse;
}
```

```rust
// crates/core_web_wasm/src/lib.rs
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
```

```ts
// apps/desktop-mobile/src/runtime.ts
const nativeCommandMap = {
  "module.listCapabilities": "list_capabilities",
  "library.listDecks": "list_decks",
  "library.selectDeck": "select_deck",
  "import.previewApkg": "preview_apkg",
  "import.commitApkg": "commit_apkg",
  "quiz.getActiveSession": "get_active_session",
  "quiz.startSession": "start_session",
  "quiz.answerQuestion": "answer_question",
  "review.resetProgress": "reset_progress",
} as const;
```

```rust
// apps/desktop-mobile/src-tauri/src/lib.rs
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
    let snapshot_json = service.export_snapshot_json().map_err(|error| error.to_string())?;
    drop(service);

    state
        .store
        .save_snapshot(&snapshot_json)
        .map_err(|error| error.to_string())?;

    Ok(response)
}
```

- [ ] **Step 4: Re-run the focused checks and confirm they pass**

Run:

```bash
pnpm --filter @vocaport/web test
cargo check -p vocaport_native_shell
```

Expected:

- Web runtime tests pass with snapshot-backed current-deck restore.
- Native shell still compiles with the new command handlers.

- [ ] **Step 5: Commit**

```bash
git add packages/ts-sdk/src/index.ts \
  apps/web/src/runtime.ts \
  apps/web/src/runtime.test.ts \
  crates/core_web_wasm/src/lib.rs \
  apps/desktop-mobile/src/runtime.ts \
  apps/desktop-mobile/src-tauri/src/lib.rs
git commit -m "feat: wire library commands through runtimes"
```

### Task 4: Upgrade The Shared Workspace Into A Mobile-First Beta Flow

**Files:**

- Modify: `packages/ui/src/index.tsx`
- Create: `packages/ui/src/phase-one-workspace.tsx`
- Create: `packages/ui/src/workspace-tabs.tsx`
- Create: `packages/ui/src/import-panel.tsx`
- Create: `packages/ui/src/library-panel.tsx`
- Create: `packages/ui/src/study-panel.tsx`
- Modify: `apps/web/src/App.interaction.test.tsx`
- Modify: `apps/desktop-mobile/src/App.test.tsx`

**Interfaces:**

- Consumes: `library.listDecks`
- Consumes: `library.selectDeck`
- Consumes: `ImportPreviewResponse.availableFieldNames`
- Produces: a three-area `PhaseOneWorkspace` with import, library, and study sections

- [ ] **Step 1: Extend the integration test to describe the beta user journey**

```tsx
// apps/web/src/App.interaction.test.tsx
it("lets the user preview import, adjust mapping, select the current deck, and start study", async () => {
  const user = userEvent.setup();

  localStorage.clear();
  render(<App />);

  expect(screen.getByText("还没有导入词库")).toBeTruthy();

  const fileInput = screen.getByLabelText("选择词库文件");
  await user.upload(fileInput, await loadBasicApkgFile());
  await user.click(screen.getByRole("button", { name: "预览导入" }));

  expect(await screen.findByText("Basic Vocab")).toBeTruthy();
  await user.selectOptions(screen.getByLabelText("释义字段"), "Back");
  await user.click(screen.getByRole("button", { name: "确认导入" }));

  await user.click(screen.getByRole("button", { name: "词库" }));
  expect(await screen.findByText("当前词库")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "设为当前词库" }));

  await user.click(screen.getByRole("button", { name: "学习" }));
  await user.click(screen.getByRole("button", { name: "开始学习" }));

  expect(await screen.findByText("apple")).toBeTruthy();
});
```

- [ ] **Step 2: Run the UI suites and confirm they fail**

Run:

```bash
pnpm --filter @vocaport/web test
pnpm --filter @vocaport/desktop-mobile test
```

Expected:

- Web fails because the new field-mapping controls, tabs, and current-deck UI do not exist yet.
- Desktop fails if the shared UI assumptions no longer match the old one-page layout.

- [ ] **Step 3: Split the shared UI into focused panels and add the beta states**

```tsx
// packages/ui/src/phase-one-workspace.tsx
type WorkspaceTab = "library" | "import" | "study";

export function PhaseOneWorkspace({
  runtime,
  platformName,
}: PhaseOneWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("library");
  const [decks, setDecks] = useState<DeckSummaryDto[]>([]);
  const [fieldMapping, setFieldMapping] = useState<ConfirmedFieldMapping | null>(
    null,
  );
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [question, setQuestion] = useState<QuestionDto | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    void runtime
      .invoke<undefined, ListDecksResponse>("library.listDecks", undefined)
      .then((response) => setDecks(response.decks))
      .catch((error) => setStatusMessage(formatRuntimeError(error, "读取词库列表失败。")));
  }, [runtime]);

  return (
    <section className="grid gap-6">
      <WorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />
      <LibraryPanel
        decks={decks}
        onSelectDeck={(deckId) => void handleSelectDeck(deckId)}
        visible={activeTab === "library"}
      />
      <ImportPanel
        preview={preview}
        fieldMapping={fieldMapping}
        onFieldMappingChange={setFieldMapping}
        visible={activeTab === "import"}
      />
      <StudyPanel
        platformName={platformName}
        question={question}
        visible={activeTab === "study"}
      />
      {statusMessage ? <p className="text-sm text-slate-300">{statusMessage}</p> : null}
    </section>
  );
}
```

```tsx
// packages/ui/src/import-panel.tsx
<label htmlFor="meaning-field">释义字段</label>
<select
  id="meaning-field"
  value={fieldMapping.meaningField}
  onChange={(event) =>
    onFieldMappingChange({
      ...fieldMapping,
      meaningField: event.target.value,
    })
  }
>
  {preview.availableFieldNames.map((fieldName) => (
    <option key={fieldName} value={fieldName}>
      {fieldName}
    </option>
  ))}
</select>
```

```tsx
// packages/ui/src/library-panel.tsx
{decks.length === 0 ? (
  <p className="text-sm text-slate-400">还没有导入词库</p>
) : (
  decks.map((deck) => (
    <article key={deck.deckId}>
      <h3>{deck.deckName}</h3>
      <p>条目 {deck.entryCount} · 待学 {deck.dueCount}</p>
      <button type="button" onClick={() => onSelectDeck(deck.deckId)}>
        {deck.isCurrentDeck ? "当前词库" : "设为当前词库"}
      </button>
    </article>
  ))
)}
```

- [ ] **Step 4: Re-run the UI and workspace verification**

Run:

```bash
pnpm --filter @vocaport/web test
pnpm --filter @vocaport/desktop-mobile test
pnpm typecheck
```

Expected:

- Web integration tests pass through the new import -> library -> study flow.
- Desktop still passes while keeping its shell thin.
- Workspace typing remains strict with no `any`.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/index.tsx \
  packages/ui/src/phase-one-workspace.tsx \
  packages/ui/src/workspace-tabs.tsx \
  packages/ui/src/import-panel.tsx \
  packages/ui/src/library-panel.tsx \
  packages/ui/src/study-panel.tsx \
  apps/web/src/App.interaction.test.tsx \
  apps/desktop-mobile/src/App.test.tsx
git commit -m "feat: upgrade shared workspace for beta flow"
```

### Task 5: Align Release Workflow And Downloads UI Around Beta Semantics

**Files:**

- Modify: `.github/workflows/publish-android-release.yml`
- Modify: `apps/downloads/src/catalog.ts`
- Modify: `apps/downloads/src/catalog.test.ts`
- Modify: `README.md`
- Modify: `README.zh.md`
- Modify: `README.en.md`

**Interfaces:**

- Produces: `Download Android Beta APK`
- Produces: `下载 Android Beta APK`
- Produces: a stable beta naming convention for Android release assets

- [ ] **Step 1: Write the failing downloads-label test**

```ts
// apps/downloads/src/catalog.test.ts
import { inferAssetLabel } from "./catalog";

it("labels beta android assets explicitly", () => {
  expect(
    inferAssetLabel(
      {
        name: "vocaport-v0.2.0-beta.1-android-universal-beta.apk",
        url: "https://example.com/v0.2.0-beta.1.apk",
        size: 123,
        downloadCount: 0,
        contentType: "application/vnd.android.package-archive",
      },
      "en",
    ),
  ).toBe("Download Android Beta APK");
});
```

- [ ] **Step 2: Run the downloads suite and confirm it fails**

Run:

```bash
pnpm --filter @vocaport/downloads test
```

Expected:

- The test fails because beta Android assets are still labeled as generic APK downloads.

- [ ] **Step 3: Update the label logic, workflow naming, and README release notes**

```ts
// apps/downloads/src/catalog.ts
if (
  normalizedName.endsWith(".apk") ||
  asset.contentType === "application/vnd.android.package-archive"
) {
  if (normalizedName.includes("beta")) {
    return locale === "zh"
      ? "下载 Android Beta APK"
      : "Download Android Beta APK";
  }

  return locale === "zh" ? "下载 Android APK" : "Download Android APK";
}
```

```yaml
# .github/workflows/publish-android-release.yml
- name: Build universal Android beta APK
  run: pnpm --filter @vocaport/desktop-mobile exec tauri android build --apk

- name: Prepare Android release asset
  run: |
    source_path="$(find apps/desktop-mobile/src-tauri/gen/android/app/build/outputs/apk -name 'app-universal-release*.apk' | head -n 1)"
    if [ -z "$source_path" ]; then
      echo "Missing release APK output." >&2
      exit 1
    fi
    asset_name="vocaport-${RELEASE_TAG}-android-universal-beta.apk"
```

```md
<!-- README.en.md -->
- Android prereleases are distributed as Beta APK assets through GitHub Releases and mirrored on the GitHub Pages downloads site.
- The release workflow should read Android signing material from repository secrets instead of hardcoding keystore files into the repo.
```

- [ ] **Step 4: Re-run the downloads and repository verification**

Run:

```bash
pnpm --filter @vocaport/downloads test
pnpm --filter @vocaport/downloads build
pnpm test
```

Expected:

- Downloads tests pass with explicit beta wording.
- The downloads site still builds.
- Repository tests stay green after the release-language update.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/publish-android-release.yml \
  apps/downloads/src/catalog.ts \
  apps/downloads/src/catalog.test.ts \
  README.md \
  README.zh.md \
  README.en.md
git commit -m "feat: align beta release semantics"
```

## Final Verification

Run:

```bash
pnpm typecheck
pnpm test
pnpm --filter @vocaport/web build
pnpm --filter @vocaport/downloads build
cargo check -p vocaport_native_shell
```

Expected:

- TypeScript packages still typecheck cleanly.
- Rust and TypeScript tests pass together.
- Web and downloads production builds complete.
- Native shell still compiles.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-26-vocaport-phase-2.md`. Two execution options:

1. `Subagent-Driven` (recommended) - dispatch a fresh worker per task, review after each task.
2. `Inline Execution` - stay in this session and implement the tasks in order.
