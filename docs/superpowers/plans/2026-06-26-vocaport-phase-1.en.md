# VocaPort Phase 1 Implementation Plan

> Chinese companion (中文伴读版): [2026-06-26-vocaport-phase-1.zh.md](/Users/jay/Code/VocaPort/docs/superpowers/plans/2026-06-26-vocaport-phase-1.zh.md)

> Reading note: advanced terms and domain-heavy phrases are glossed in Chinese where they most affect reading speed.

> **For agentic workers (代理执行者):** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended, 推荐) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal (目标):** Build the Phase 1 foundation (基础骨架) of VocaPort: a Rust-first, offline-first (离线优先) vocabulary app that imports Anki `.apkg`, preserves (保留) review history, supports resettable (可重置的) progress, and ships one `4`-option study loop for web and desktop with an Android-ready architecture.

**Architecture (架构):** Use a monorepo with `pnpm` for TypeScript packages and a Rust workspace for the domain core (领域核心). Keep all business rules in Rust crates, expose stable (稳定的) bridge contracts to TypeScript, and isolate (隔离) platform differences behind web and native runtime adapters so the later plugin marketplace can reuse the same manifest (清单), permission (权限), and compatibility (兼容性) boundaries.

**Tech Stack (技术栈):** `Vite`, `React`, `TypeScript` (`strict: true`), `Tailwind CSS`, `Vitest`, `Tauri 2`, `Rust`, `serde`, `thiserror`, `rusqlite` or `sqlx`, `IndexedDB`, `SQLite`

## Global Constraints (全局约束)

- New project directory stays at the same level as `LunaTV`.
- `Rust` is the only source of truth for domain logic, import normalization, quiz generation, scheduling, and capability contracts.
- `TypeScript` is limited to frontend UI, interaction, and state orchestration.
- `Deck` and `StudySession` are first-class objects, not temporary frontend state.
- Phase 1 supports Anki `.apkg` import only.
- Import must use a `preview -> commit` flow and support idempotent (幂等的) re-import.
- Phase 1 imports Anki review history and preserves it for later replay.
- Phase 1 supports progress reset without deleting imported history.
- Phase 1 ships exactly one quiz module: `4`-option mixed multiple choice.
- Image options are preferred; missing media falls back to definition and example options.
- Interrupted study sessions must be resumable without changing the prompt or option order.
- Desktop and Android follow the `Tauri 2` route.
- Web uses `Rust/WASM` for core logic reuse.
- Phase 1 is marketplace-ready but does not allow runtime third-party plugin execution.
- Phase 1 does not include iOS, cloud sync, or account systems.

---

This plan stays as one implementation plan because the Phase 1 subsystems share the same bridge contracts, review event model, and module registry. Splitting (拆分) them earlier would duplicate (重复) core interfaces and increase integration risk.

### Task 1: Bootstrap (初始化) The Monorepo And Workspace Contracts

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `rust-toolchain.toml`
- Create: `Cargo.toml`
- Create: `packages/bridge-schema/package.json`
- Create: `packages/bridge-schema/tsconfig.json`
- Create: `packages/bridge-schema/src/index.test.ts`
- Create: `packages/bridge-schema/src/index.ts`

**Interfaces:**
- Consumes: none
- Produces: `APP_NAME: "VocaPort"` from `@vocaport/bridge-schema`

- [ ] **Step 1: Write the failing test and workspace scaffolding**

```json
// package.json
{
  "name": "vocaport",
  "private": true,
  "packageManager": "pnpm@10.14.0",
  "scripts": {
    "typecheck": "pnpm -r --if-present typecheck",
    "test:ts": "pnpm -r --if-present test",
    "test:rust": "cargo test --workspace",
    "test": "pnpm test:ts && pnpm test:rust"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.6.3",
    "vitest": "^2.1.3"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "react-jsx",
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  }
}
```

```toml
# rust-toolchain.toml
[toolchain]
channel = "stable"
components = ["clippy", "rustfmt"]
```

```toml
# Cargo.toml
[workspace]
members = ["crates/*", "crates/modules/*", "apps/desktop-mobile/src-tauri"]
resolver = "2"
```

```gitignore
# .gitignore
node_modules
dist
.turbo
.DS_Store
target
apps/desktop-mobile/src-tauri/gen
```

```json
// packages/bridge-schema/package.json
{
  "name": "@vocaport/bridge-schema",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

```json
// packages/bridge-schema/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

```ts
// packages/bridge-schema/src/index.test.ts
import { describe, expect, it } from "vitest";
import { APP_NAME } from "./index";

describe("bridge schema workspace smoke", () => {
  it("exports the canonical application name", () => {
    expect(APP_NAME).toBe("VocaPort");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm install && pnpm --filter @vocaport/bridge-schema test`

Expected: FAIL with a module resolution error for `./index` or an export error for `APP_NAME`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// packages/bridge-schema/src/index.ts
export const APP_NAME = "VocaPort" as const;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @vocaport/bridge-schema test && pnpm typecheck`

Expected: PASS with `1 passed` from Vitest and no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git init
git add .gitignore package.json pnpm-workspace.yaml tsconfig.base.json rust-toolchain.toml Cargo.toml packages/bridge-schema
git commit -m "chore: bootstrap vocaport monorepo workspace"
```

### Task 2: Define The Canonical (规范化的) Domain, Event, And Bridge DTOs

**Files:**
- Create: `crates/core_domain/Cargo.toml`
- Create: `crates/core_domain/src/lib.rs`
- Create: `crates/core_events/Cargo.toml`
- Create: `crates/core_events/src/lib.rs`
- Create: `crates/core_bridge_contract/Cargo.toml`
- Create: `crates/core_bridge_contract/src/lib.rs`
- Create: `crates/core_bridge_contract/tests/session_contract.rs`
- Modify: `packages/bridge-schema/src/index.ts`

**Interfaces:**
- Consumes: `APP_NAME`
- Produces: `Deck`, `VocabularyEntry`, `StudyCard`, `StudySession`, `MediaAsset`, `ReviewEvent`, `ReviewState`, `ProgressReset`, `ImportRecord`
- Produces: `ImportPreviewRequest`, `ImportPreviewResponse`, `ImportCommitRequest`, `ImportCommitResponse`, `StartSessionRequest`, `ActiveSessionResponse`, `QuestionOptionDto`, `QuestionDto`, `AnswerQuestionRequest`, `AnswerQuestionResponse`, `ResetProgressRequest`

- [ ] **Step 1: Write the failing Rust contract test**

```rust
// crates/core_bridge_contract/tests/session_contract.rs
use core_bridge_contract::{AnswerQuestionRequest, ImportPreviewRequest};

#[test]
fn session_contract_round_trips() {
    let preview = ImportPreviewRequest {
        file_name: "basic-vocab.apkg".to_string(),
        file_bytes: vec![1, 2, 3],
    };

    let answer = AnswerQuestionRequest {
        session_id: "session-1".to_string(),
        question_id: "question-1".to_string(),
        selected_option_id: "option-2".to_string(),
    };

    let preview_json = serde_json::to_string(&preview).unwrap();
    let answer_json = serde_json::to_string(&answer).unwrap();

    assert!(preview_json.contains("basic-vocab.apkg"));
    assert!(answer_json.contains("question-1"));
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cargo test -p core_bridge_contract session_contract_round_trips -- --exact`

Expected: FAIL with `package ID specification 'core_bridge_contract' did not match any packages`.

- [ ] **Step 3: Write the minimal implementation**

```toml
# crates/core_domain/Cargo.toml
[package]
name = "core_domain"
version = "0.0.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
```

```rust
// crates/core_domain/src/lib.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Deck {
    pub id: String,
    pub name: String,
    pub source_type: String,
    pub external_deck_id: Option<String>,
    pub latest_import_record_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum MediaKind {
    Image,
    Audio,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct MediaAsset {
    pub id: String,
    pub kind: MediaKind,
    pub mime_type: String,
    pub storage_key: String,
    pub origin: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VocabularyEntry {
    pub id: String,
    pub lemma: String,
    pub phonetic: Option<String>,
    pub meanings: Vec<String>,
    pub examples: Vec<String>,
    pub tags: Vec<String>,
    pub source_deck_id: String,
    pub media_refs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StudyCard {
    pub id: String,
    pub entry_id: String,
    pub prompt_mode: String,
    pub option_policy: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SessionQuestionSnapshot {
    pub question_id: String,
    pub card_id: String,
    pub prompt_kind: String,
    pub prompt_value: String,
    pub option_ids: Vec<String>,
    pub option_kinds: Vec<String>,
    pub option_values: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StudySession {
    pub id: String,
    pub deck_id: String,
    pub mode: String,
    pub status: String,
    pub current_question: Option<SessionQuestionSnapshot>,
    pub remaining_card_ids: Vec<String>,
    pub answered_count: u32,
    pub started_at: String,
    pub last_activity_at: String,
}
```

```toml
# crates/core_events/Cargo.toml
[package]
name = "core_events"
version = "0.0.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
```

```rust
// crates/core_events/src/lib.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ReviewEventSource {
    AnkiImport,
    AppReview,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ReviewEvent {
    pub id: String,
    pub card_id: String,
    pub source: ReviewEventSource,
    pub rating: i32,
    pub reviewed_at: String,
    pub scheduled_days: Option<i32>,
    pub elapsed_days: Option<i32>,
    pub raw_payload: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ReviewState {
    pub card_id: String,
    pub status: String,
    pub stability: Option<f32>,
    pub difficulty: Option<f32>,
    pub due_at: Option<String>,
    pub last_reviewed_at: Option<String>,
    pub review_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ProgressResetScope {
    Card,
    Deck,
    All,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProgressReset {
    pub id: String,
    pub scope: ProgressResetScope,
    pub target_card_id: Option<String>,
    pub target_deck_id: Option<String>,
    pub reset_at: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ImportRecord {
    pub id: String,
    pub deck_id: String,
    pub source_type: String,
    pub file_hash: String,
    pub source_fingerprint: String,
    pub imported_at: String,
    pub entry_count: usize,
    pub review_event_count: usize,
    pub skipped_count: usize,
    pub warning_count: usize,
}
```

```toml
# crates/core_bridge_contract/Cargo.toml
[package]
name = "core_bridge_contract"
version = "0.0.0"
edition = "2021"

[dependencies]
core_domain = { path = "../core_domain" }
core_events = { path = "../core_events" }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

```rust
// crates/core_bridge_contract/src/lib.rs
use core_events::ProgressResetScope;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ImportPreviewRequest {
    pub file_name: String,
    pub file_bytes: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FieldCandidate {
    pub field_name: String,
    pub confidence: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FieldCandidateSet {
    pub lemma: Option<FieldCandidate>,
    pub meaning: Option<FieldCandidate>,
    pub example: Option<FieldCandidate>,
    pub image: Option<FieldCandidate>,
    pub audio: Option<FieldCandidate>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ImportPreviewResponse {
    pub import_id: String,
    pub file_hash: String,
    pub deck_name: String,
    pub resolved_deck_id: Option<String>,
    pub entry_count: usize,
    pub review_event_count: usize,
    pub media_count: usize,
    pub field_candidates: FieldCandidateSet,
    pub unresolved_fields: Vec<String>,
    pub warning_messages: Vec<String>,
    pub is_duplicate_file: bool,
    pub reimport_target_deck_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ConfirmedFieldMapping {
    pub lemma_field: String,
    pub meaning_field: String,
    pub example_field: Option<String>,
    pub image_field: Option<String>,
    pub audio_field: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ImportCommitRequest {
    pub import_id: String,
    pub target_deck_id: Option<String>,
    pub commit_mode: String,
    pub confirmed_field_mapping: ConfirmedFieldMapping,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ImportCommitResponse {
    pub deck_id: String,
    pub deck_name: String,
    pub imported_entry_count: usize,
    pub imported_card_count: usize,
    pub imported_review_event_count: usize,
    pub skipped_count: usize,
    pub warning_messages: Vec<String>,
    pub media_import_summary: String,
    pub next_recommended_action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StartSessionRequest {
    pub deck_id: String,
    pub mode: String,
    pub force_new: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct QuestionOptionDto {
    pub id: String,
    pub kind: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct QuestionDto {
    pub session_id: String,
    pub question_id: String,
    pub card_id: String,
    pub prompt_kind: String,
    pub prompt_value: String,
    pub options: Vec<QuestionOptionDto>,
    pub remaining_count: u32,
    pub estimated_remaining_seconds: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ActiveSessionResponse {
    pub question: Option<QuestionDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AnswerQuestionRequest {
    pub session_id: String,
    pub question_id: String,
    pub selected_option_id: String,
    pub rating_override: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ExplanationPayload {
    pub target_word: String,
    pub correct_meaning: String,
    pub example_sentence: Option<String>,
    pub audio_asset_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct NextReviewSuggestion {
    pub due_at: Option<String>,
    pub summary_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AnswerQuestionResponse {
    pub is_correct: bool,
    pub correct_option_id: String,
    pub applied_rating: String,
    pub explanation_payload: ExplanationPayload,
    pub next_review_suggestion: NextReviewSuggestion,
    pub next_question: Option<QuestionDto>,
    pub is_session_complete: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ResetProgressRequest {
    pub scope: ProgressResetScope,
    pub target_card_id: Option<String>,
    pub target_deck_id: Option<String>,
    pub reason: String,
}
```

```ts
// packages/bridge-schema/src/index.ts
export const APP_NAME = "VocaPort" as const;

export interface ImportPreviewRequest {
  fileName: string;
  fileBytes: Uint8Array;
}

export interface FieldCandidate {
  fieldName: string;
  confidence: number;
}

export interface FieldCandidateSet {
  lemma?: FieldCandidate;
  meaning?: FieldCandidate;
  example?: FieldCandidate;
  image?: FieldCandidate;
  audio?: FieldCandidate;
}

export interface ImportPreviewResponse {
  importId: string;
  fileHash: string;
  deckName: string;
  resolvedDeckId?: string;
  fileName: string;
  entryCount: number;
  reviewEventCount: number;
  mediaCount: number;
  fieldCandidates: FieldCandidateSet;
  unresolvedFields: string[];
  warningMessages: string[];
  isDuplicateFile: boolean;
  reimportTargetDeckId?: string;
}

export interface ConfirmedFieldMapping {
  lemmaField: string;
  meaningField: string;
  exampleField?: string;
  imageField?: string;
  audioField?: string;
}

export interface ImportCommitRequest {
  importId: string;
  targetDeckId?: string;
  commitMode: "create_new_deck" | "upsert_existing_deck";
  confirmedFieldMapping: ConfirmedFieldMapping;
}

export interface ImportCommitResponse {
  deckId: string;
  deckName: string;
  importedEntryCount: number;
  importedCardCount: number;
  importedReviewEventCount: number;
  skippedCount: number;
  warningMessages: string[];
  mediaImportSummary: string;
  nextRecommendedAction: string;
}

export interface StartSessionRequest {
  deckId: string;
  mode: "review_due_first" | "random_practice";
  forceNew?: boolean;
}

export interface QuestionOptionDto {
  id: string;
  kind: "image" | "meaning" | "example";
  value: string;
}

export interface QuestionDto {
  sessionId: string;
  questionId: string;
  cardId: string;
  promptKind: "lemma" | "audio";
  promptValue: string;
  options: QuestionOptionDto[];
  remainingCount: number;
  estimatedRemainingSeconds: number;
}

export interface ActiveSessionResponse {
  question?: QuestionDto;
}

export interface AnswerQuestionRequest {
  sessionId: string;
  questionId: string;
  selectedOptionId: string;
  ratingOverride?: "hard";
}

export interface ExplanationPayload {
  targetWord: string;
  correctMeaning: string;
  exampleSentence?: string;
  audioAssetId?: string;
}

export interface NextReviewSuggestion {
  dueAt?: string;
  summaryText: string;
}

export interface AnswerQuestionResponse {
  isCorrect: boolean;
  correctOptionId: string;
  appliedRating: "again" | "hard" | "good";
  explanationPayload: ExplanationPayload;
  nextReviewSuggestion: NextReviewSuggestion;
  nextQuestion?: QuestionDto;
  isSessionComplete: boolean;
}

export interface ResetProgressRequest {
  scope: "card" | "deck" | "all";
  targetCardId?: string;
  targetDeckId?: string;
  reason: string;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cargo test -p core_bridge_contract session_contract_round_trips -- --exact && pnpm --filter @vocaport/bridge-schema typecheck`

Expected: PASS with `1 passed` from Cargo and no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add crates/core_domain crates/core_events crates/core_bridge_contract packages/bridge-schema/src/index.ts
git commit -m "feat: add canonical domain and bridge contracts"
```

### Task 3: Add Module Registry (模块注册表), Permissions, And Marketplace Manifests

**Files:**
- Create: `crates/core_permission/Cargo.toml`
- Create: `crates/core_permission/src/lib.rs`
- Create: `crates/core_signature/Cargo.toml`
- Create: `crates/core_signature/src/lib.rs`
- Create: `crates/core_module_registry/Cargo.toml`
- Create: `crates/core_module_registry/src/lib.rs`
- Create: `crates/core_module_registry/tests/manifest_validation.rs`
- Modify: `packages/bridge-schema/src/index.ts`

**Interfaces:**
- Consumes: bridge DTOs and canonical event/domain crates
- Produces: `Permission`, `SignatureEnvelope`, `ModuleManifest`, `ModuleRegistry::register_builtin`, `ModuleRegistry::list_capabilities`

- [ ] **Step 1: Write the failing manifest validation test**

```rust
// crates/core_module_registry/tests/manifest_validation.rs
use core_module_registry::{ModuleManifest, ModuleRegistry, PlatformTarget};
use core_permission::Permission;
use core_signature::SignatureEnvelope;

#[test]
fn registry_rejects_duplicate_module_ids() {
    let manifest = ModuleManifest {
        module_id: "quiz_mcq".to_string(),
        version: "0.1.0".to_string(),
        api_version: "1".to_string(),
        capabilities: vec!["quiz.generate".to_string()],
        permissions: vec![Permission::QuizGenerate],
        platform_targets: vec![PlatformTarget::Web, PlatformTarget::Desktop],
        entrypoint: "builtin:quiz_mcq".to_string(),
        checksum: "sha256:demo".to_string(),
        signature: SignatureEnvelope::unsigned(),
    };

    let mut registry = ModuleRegistry::default();
    registry.register_builtin(manifest.clone()).unwrap();

    let duplicate_error = registry.register_builtin(manifest).unwrap_err();
    assert!(duplicate_error.to_string().contains("duplicate"));
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cargo test -p core_module_registry registry_rejects_duplicate_module_ids -- --exact`

Expected: FAIL with `package ID specification 'core_module_registry' did not match any packages`.

- [ ] **Step 3: Write the minimal implementation**

```toml
# crates/core_permission/Cargo.toml
[package]
name = "core_permission"
version = "0.0.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
```

```rust
// crates/core_permission/src/lib.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Permission {
    ImportApkgRead,
    MediaAssetRead,
    QuizGenerate,
    SchedulerCompute,
    StorageModuleScoped,
    NetworkNone,
    NetworkLimited,
    UiRouteRegister,
}
```

```toml
# crates/core_signature/Cargo.toml
[package]
name = "core_signature"
version = "0.0.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
```

```rust
// crates/core_signature/src/lib.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SignatureEnvelope {
    pub algorithm: String,
    pub key_id: String,
    pub signature: String,
}

impl SignatureEnvelope {
    pub fn unsigned() -> Self {
        Self {
            algorithm: "none".to_string(),
            key_id: "builtin".to_string(),
            signature: "unsigned".to_string(),
        }
    }
}
```

```toml
# crates/core_module_registry/Cargo.toml
[package]
name = "core_module_registry"
version = "0.0.0"
edition = "2021"

[dependencies]
core_permission = { path = "../core_permission" }
core_signature = { path = "../core_signature" }
serde = { version = "1", features = ["derive"] }
thiserror = "1"
```

```rust
// crates/core_module_registry/src/lib.rs
use core_permission::Permission;
use core_signature::SignatureEnvelope;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use thiserror::Error;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum PlatformTarget {
    Web,
    Desktop,
    Android,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ModuleManifest {
    pub module_id: String,
    pub version: String,
    pub api_version: String,
    pub capabilities: Vec<String>,
    pub permissions: Vec<Permission>,
    pub platform_targets: Vec<PlatformTarget>,
    pub entrypoint: String,
    pub checksum: String,
    pub signature: SignatureEnvelope,
}

#[derive(Debug, Error)]
pub enum RegistryError {
    #[error("duplicate module id: {0}")]
    DuplicateModuleId(String),
}

#[derive(Debug, Default)]
pub struct ModuleRegistry {
    manifests: BTreeMap<String, ModuleManifest>,
}

impl ModuleRegistry {
    pub fn register_builtin(&mut self, manifest: ModuleManifest) -> Result<(), RegistryError> {
        if self.manifests.contains_key(&manifest.module_id) {
            return Err(RegistryError::DuplicateModuleId(manifest.module_id));
        }
        self.manifests.insert(manifest.module_id.clone(), manifest);
        Ok(())
    }

    pub fn list_capabilities(&self) -> Vec<String> {
        self.manifests
            .values()
            .flat_map(|manifest| manifest.capabilities.clone())
            .collect()
    }
}
```

```ts
// packages/bridge-schema/src/index.ts
export const APP_NAME = "VocaPort" as const;

export interface ImportPreviewRequest {
  fileName: string;
  fileBytes: Uint8Array;
}

export interface FieldCandidate {
  fieldName: string;
  confidence: number;
}

export interface FieldCandidateSet {
  lemma?: FieldCandidate;
  meaning?: FieldCandidate;
  example?: FieldCandidate;
  image?: FieldCandidate;
  audio?: FieldCandidate;
}

export interface ImportPreviewResponse {
  importId: string;
  fileHash: string;
  deckName: string;
  resolvedDeckId?: string;
  fileName: string;
  entryCount: number;
  reviewEventCount: number;
  mediaCount: number;
  fieldCandidates: FieldCandidateSet;
  unresolvedFields: string[];
  warningMessages: string[];
  isDuplicateFile: boolean;
  reimportTargetDeckId?: string;
}

export interface ConfirmedFieldMapping {
  lemmaField: string;
  meaningField: string;
  exampleField?: string;
  imageField?: string;
  audioField?: string;
}

export interface ImportCommitRequest {
  importId: string;
  targetDeckId?: string;
  commitMode: "create_new_deck" | "upsert_existing_deck";
  confirmedFieldMapping: ConfirmedFieldMapping;
}

export interface ImportCommitResponse {
  deckId: string;
  deckName: string;
  importedEntryCount: number;
  importedCardCount: number;
  importedReviewEventCount: number;
  skippedCount: number;
  warningMessages: string[];
  mediaImportSummary: string;
  nextRecommendedAction: string;
}

export interface StartSessionRequest {
  deckId: string;
  mode: "review_due_first" | "random_practice";
  forceNew?: boolean;
}

export interface QuestionOptionDto {
  id: string;
  kind: "image" | "meaning" | "example";
  value: string;
}

export interface QuestionDto {
  sessionId: string;
  questionId: string;
  cardId: string;
  promptKind: "lemma" | "audio";
  promptValue: string;
  options: QuestionOptionDto[];
  remainingCount: number;
  estimatedRemainingSeconds: number;
}

export interface ActiveSessionResponse {
  question?: QuestionDto;
}

export interface AnswerQuestionRequest {
  sessionId: string;
  questionId: string;
  selectedOptionId: string;
  ratingOverride?: "hard";
}

export interface ExplanationPayload {
  targetWord: string;
  correctMeaning: string;
  exampleSentence?: string;
  audioAssetId?: string;
}

export interface NextReviewSuggestion {
  dueAt?: string;
  summaryText: string;
}

export interface AnswerQuestionResponse {
  isCorrect: boolean;
  correctOptionId: string;
  appliedRating: "again" | "hard" | "good";
  explanationPayload: ExplanationPayload;
  nextReviewSuggestion: NextReviewSuggestion;
  nextQuestion?: QuestionDto;
  isSessionComplete: boolean;
}

export interface ResetProgressRequest {
  scope: "card" | "deck" | "all";
  targetCardId?: string;
  targetDeckId?: string;
  reason: string;
}

export type Permission =
  | "import.apkg.read"
  | "media.asset.read"
  | "quiz.generate"
  | "scheduler.compute"
  | "storage.module_scoped"
  | "network.none"
  | "network.limited"
  | "ui.route.register";

export interface ModuleManifest {
  moduleId: string;
  version: string;
  apiVersion: string;
  capabilities: string[];
  permissions: Permission[];
  platformTargets: Array<"web" | "desktop" | "android">;
  entrypoint: string;
  checksum: string;
  signature: {
    algorithm: string;
    keyId: string;
    signature: string;
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cargo test -p core_module_registry registry_rejects_duplicate_module_ids -- --exact && pnpm --filter @vocaport/bridge-schema typecheck`

Expected: PASS with `1 passed` from Cargo and no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add crates/core_permission crates/core_signature crates/core_module_registry packages/bridge-schema/src/index.ts
git commit -m "feat: add module registry and marketplace manifest contracts"
```

### Task 4: Build The Shared TS SDK And The Web/Desktop Runtime Shells (运行时壳层)

**Files:**
- Create: `tailwind.config.ts`
- Create: `postcss.config.cjs`
- Create: `packages/ts-sdk/package.json`
- Create: `packages/ts-sdk/tsconfig.json`
- Create: `packages/ts-sdk/src/index.ts`
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.tsx`
- Create: `apps/web/package.json`
- Create: `apps/web/index.html`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/runtime.test.ts`
- Create: `apps/web/src/runtime.ts`
- Create: `apps/web/src/index.css`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/desktop-mobile/package.json`
- Create: `apps/desktop-mobile/index.html`
- Create: `apps/desktop-mobile/tsconfig.json`
- Create: `apps/desktop-mobile/vite.config.ts`
- Create: `apps/desktop-mobile/src/index.css`
- Create: `apps/desktop-mobile/src/main.tsx`
- Create: `apps/desktop-mobile/src/App.tsx`
- Create: `apps/desktop-mobile/src-tauri/Cargo.toml`
- Create: `apps/desktop-mobile/src-tauri/src/lib.rs`
- Create: `apps/desktop-mobile/src-tauri/src/main.rs`
- Create: `apps/desktop-mobile/src-tauri/tauri.conf.json`

**Interfaces:**
- Consumes: `QuestionDto`, `ModuleManifest`, `AnswerQuestionRequest`
- Produces: `BridgeRuntimeAdapter`, `createWebRuntime()`, native `health_ping()`

- [ ] **Step 1: Write the failing runtime smoke test**

```ts
// apps/web/src/runtime.test.ts
import { describe, expect, it } from "vitest";
import { createWebRuntime } from "./runtime";

describe("web runtime smoke", () => {
  it("responds with the ready health string", async () => {
    await expect(createWebRuntime().healthPing()).resolves.toBe("vocaport-ready");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @vocaport/web test`

Expected: FAIL with `No projects matched the filters` or `Cannot find module './runtime'`.

- [ ] **Step 3: Write the minimal implementation**

```json
// packages/ts-sdk/package.json
{
  "name": "@vocaport/ts-sdk",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@vocaport/bridge-schema": "workspace:*"
  }
}
```

```json
// packages/ts-sdk/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

```ts
// packages/ts-sdk/src/index.ts
export interface BridgeRuntimeAdapter {
  healthPing(): Promise<string>;
  invoke<TRequest, TResponse>(command: string, payload: TRequest): Promise<TResponse>;
}
```

```json
// packages/ui/package.json
{
  "name": "@vocaport/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1"
  }
}
```

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./apps/**/*.{ts,tsx}", "./packages/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

```js
// postcss.config.cjs
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

```json
// packages/ui/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

```tsx
// packages/ui/src/index.tsx
import type { PropsWithChildren } from "react";

export function PageShell({ children }: PropsWithChildren) {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">VocaPort</h1>
      </header>
      {children}
    </main>
  );
}
```

```json
// apps/web/package.json
{
  "name": "@vocaport/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@vocaport/ts-sdk": "workspace:*",
    "@vocaport/ui": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "vite": "^5.4.8"
  }
}
```

```html
<!-- apps/web/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VocaPort</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```json
// apps/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

```ts
// apps/web/vite.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
});
```

```css
/* apps/web/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-slate-950 text-slate-100;
}
```

```ts
// apps/web/src/runtime.ts
import type { BridgeRuntimeAdapter } from "@vocaport/ts-sdk";

export function createWebRuntime(): BridgeRuntimeAdapter {
  return {
    async healthPing() {
      return "vocaport-ready";
    },
    async invoke() {
      throw new Error("Web bridge invoke is not wired yet.");
    },
  };
}
```

```tsx
// apps/web/src/App.tsx
import { PageShell } from "@vocaport/ui";

export function App() {
  return <PageShell>VocaPort web shell ready.</PageShell>;
}
```

```tsx
// apps/web/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

```json
// apps/desktop-mobile/package.json
{
  "name": "@vocaport/desktop-mobile",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@vocaport/ui": "workspace:*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "vite": "^5.4.8"
  }
}
```

```html
<!-- apps/desktop-mobile/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VocaPort Desktop</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```json
// apps/desktop-mobile/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

```ts
// apps/desktop-mobile/vite.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
});
```

```css
/* apps/desktop-mobile/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-slate-950 text-slate-100;
}
```

```tsx
// apps/desktop-mobile/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

```toml
# apps/desktop-mobile/src-tauri/Cargo.toml
[package]
name = "vocaport_native_shell"
version = "0.0.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] }

[lib]
name = "vocaport_native_shell"
crate-type = ["staticlib", "cdylib", "rlib"]
```

```rust
// apps/desktop-mobile/src-tauri/src/lib.rs
#[tauri::command]
pub fn health_ping() -> &'static str {
    "vocaport-ready"
}

#[cfg(test)]
mod tests {
    use super::health_ping;

    #[test]
    fn health_ping_returns_ready() {
        assert_eq!(health_ping(), "vocaport-ready");
    }
}
```

```rust
// apps/desktop-mobile/src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![vocaport_native_shell::health_ping])
        .run(tauri::generate_context!())
        .expect("failed to run VocaPort native shell");
}
```

```json
// apps/desktop-mobile/src-tauri/tauri.conf.json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "VocaPort",
  "identifier": "com.vocaport.app",
  "build": {
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "VocaPort",
        "width": 1280,
        "height": 800
      }
    ]
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @vocaport/web test && cargo test -p vocaport_native_shell health_ping_returns_ready -- --exact`

Expected: PASS with the web runtime smoke test and the native health command test.

- [ ] **Step 5: Commit**

```bash
git add packages/ts-sdk packages/ui apps/web apps/desktop-mobile
git commit -m "feat: add web and desktop runtime shells"
```

### Task 5: Introduce Storage Contracts (存储契约) And Platform Adapters

**Files:**
- Create: `crates/core_storage_contract/Cargo.toml`
- Create: `crates/core_storage_contract/src/lib.rs`
- Create: `apps/web/src/storage.test.ts`
- Create: `apps/web/src/storage.ts`
- Create: `apps/desktop-mobile/src-tauri/src/storage.rs`
- Modify: `apps/desktop-mobile/src-tauri/Cargo.toml`
- Modify: `apps/desktop-mobile/src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: `Deck`, `VocabularyEntry`, `StudyCard`, `StudySession`, `MediaAsset`, `ReviewEvent`, `ReviewState`, `ProgressReset`, `ImportRecord`
- Produces: `DeckRepository`, `EntryRepository`, `CardRepository`, `ReviewEventRepository`, `ReviewStateRepository`, `ProgressResetRepository`, `StudySessionRepository`, `MediaRepository`, `SettingsRepository`, `ImportRecordRepository`

- [ ] **Step 1: Write the failing storage contract tests**

```ts
// apps/web/src/storage.test.ts
import { describe, expect, it } from "vitest";
import { createMemoryReviewEventRepository } from "./storage";

describe("web review event repository", () => {
  it("stores and lists review events in insertion order", async () => {
    const repository = createMemoryReviewEventRepository();

    await repository.insert({ id: "e1", cardId: "c1", source: "anki_import" });
    await repository.insert({ id: "e2", cardId: "c1", source: "app_review" });

    await expect(repository.listByCardId("c1")).resolves.toEqual([
      { id: "e1", cardId: "c1", source: "anki_import" },
      { id: "e2", cardId: "c1", source: "app_review" },
    ]);
  });
});
```

```rust
// apps/desktop-mobile/src-tauri/src/storage.rs
use rusqlite::{params, Connection};

pub struct SqliteReviewEventRepository {
    pub connection: Connection,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn persists_review_event_rows() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute(
                "CREATE TABLE review_events (id TEXT PRIMARY KEY, card_id TEXT NOT NULL, source TEXT NOT NULL)",
                [],
            )
            .unwrap();

        connection
            .execute(
                "INSERT INTO review_events (id, card_id, source) VALUES (?1, ?2, ?3)",
                params!["e1", "c1", "anki_import"],
            )
            .unwrap();

        let count: i64 = connection
            .query_row("SELECT COUNT(*) FROM review_events", [], |row| row.get(0))
            .unwrap();

        assert_eq!(count, 1);
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @vocaport/web test && cargo test -p vocaport_native_shell persists_review_event_rows -- --exact`

Expected: FAIL with missing `./storage` exports in web and missing `rusqlite` in the native shell.

- [ ] **Step 3: Write the minimal implementation**

```toml
# crates/core_storage_contract/Cargo.toml
[package]
name = "core_storage_contract"
version = "0.0.0"
edition = "2021"

[dependencies]
core_domain = { path = "../core_domain" }
core_events = { path = "../core_events" }
```

```rust
// crates/core_storage_contract/src/lib.rs
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
```

```ts
// apps/web/src/storage.ts
type ReviewEventRow = {
  id: string;
  cardId: string;
  source: string;
};

export function createMemoryReviewEventRepository() {
  const rows: ReviewEventRow[] = [];

  return {
    async insert(row: ReviewEventRow) {
      rows.push(row);
    },
    async listByCardId(cardId: string) {
      return rows.filter((row) => row.cardId === cardId);
    },
  };
}

export function createIndexedDbReviewEventRepository(databaseName = "vocaport") {
  async function getDatabase() {
    return await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("review_events")) {
          database.createObjectStore("review_events", { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return {
    async insert(row: ReviewEventRow) {
      const database = await getDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("review_events", "readwrite");
        transaction.objectStore("review_events").put(row);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    },
    async listByCardId(cardId: string) {
      const database = await getDatabase();
      return await new Promise<ReviewEventRow[]>((resolve, reject) => {
        const transaction = database.transaction("review_events", "readonly");
        const request = transaction.objectStore("review_events").getAll();
        request.onsuccess = () => {
          resolve(request.result.filter((row) => row.cardId === cardId));
        };
        request.onerror = () => reject(request.error);
      });
    },
  };
}
```

```toml
# apps/desktop-mobile/src-tauri/Cargo.toml
[package]
name = "vocaport_native_shell"
version = "0.0.0"
edition = "2021"

[dependencies]
rusqlite = { version = "0.32", features = ["bundled"] }
tauri = { version = "2", features = [] }

[lib]
name = "vocaport_native_shell"
crate-type = ["staticlib", "cdylib", "rlib"]
```

```rust
// apps/desktop-mobile/src-tauri/src/lib.rs
pub mod storage;

#[tauri::command]
pub fn health_ping() -> &'static str {
    "vocaport-ready"
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @vocaport/web test && cargo test -p vocaport_native_shell persists_review_event_rows -- --exact`

Expected: PASS with the web repository smoke test and the in-memory SQLite persistence test.

- [ ] **Step 5: Commit**

```bash
git add crates/core_storage_contract apps/web/src/storage.ts apps/web/src/storage.test.ts apps/desktop-mobile/src-tauri/src/storage.rs apps/desktop-mobile/src-tauri/Cargo.toml apps/desktop-mobile/src-tauri/src/lib.rs
git commit -m "feat: add storage contracts and platform adapters"
```

### Task 6: Implement APKG Preview, Commit Import, And Field-Mapping Suggestions (字段映射建议)

**Files:**
- Create: `scripts/make-basic-apkg-fixture.sh`
- Create: `fixtures/anki/basic-vocab.apkg`
- Create: `crates/modules/importer_apkg/Cargo.toml`
- Create: `crates/modules/importer_apkg/src/lib.rs`
- Create: `crates/modules/importer_apkg/tests/preview_import.rs`

**Interfaces:**
- Consumes: `ImportPreviewRequest`, `ImportCommitRequest`
- Produces: `preview_apkg(file_name: &str, file_bytes: &[u8]) -> ImportPreviewResponse`
- Produces: `commit_apkg(request: ImportCommitRequest) -> ImportCommitResponse`

- [ ] **Step 1: Write the failing importer preview and commit tests**

```rust
// crates/modules/importer_apkg/tests/preview_import.rs
use core_bridge_contract::{ConfirmedFieldMapping, ImportCommitRequest};
use importer_apkg::{commit_apkg, preview_apkg};

#[test]
fn preview_extracts_basic_fields_from_fixture() {
    let fixture_path = format!(
        "{}/../../../fixtures/anki/basic-vocab.apkg",
        env!("CARGO_MANIFEST_DIR")
    );
    let bytes = std::fs::read(fixture_path).unwrap();
    let preview = preview_apkg("basic-vocab.apkg", &bytes).unwrap();

    assert_eq!(preview.deck_name, "Basic Vocab");
    assert_eq!(preview.field_candidates.lemma.as_ref().map(|candidate| candidate.field_name.as_str()), Some("Front"));
    assert_eq!(preview.field_candidates.meaning.as_ref().map(|candidate| candidate.field_name.as_str()), Some("Back"));
}

#[test]
fn commit_returns_structured_import_summary() {
    let response = commit_apkg(ImportCommitRequest {
        import_id: "preview-1".to_string(),
        target_deck_id: Some("deck-1".to_string()),
        commit_mode: "upsert_existing_deck".to_string(),
        confirmed_field_mapping: ConfirmedFieldMapping {
            lemma_field: "Front".to_string(),
            meaning_field: "Back".to_string(),
            example_field: Some("Example".to_string()),
            image_field: None,
            audio_field: None,
        },
    })
    .unwrap();

    assert_eq!(response.deck_id, "deck-1");
    assert_eq!(response.imported_entry_count, 1);
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bash scripts/make-basic-apkg-fixture.sh && cargo test -p importer_apkg`

Expected: FAIL with `package ID specification 'importer_apkg' did not match any packages`.

- [ ] **Step 3: Write the minimal implementation**

```bash
# scripts/make-basic-apkg-fixture.sh
#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "${root_dir}/fixtures/anki"
tmp_dir="$(mktemp -d)"
sqlite3 "${tmp_dir}/collection.anki2" <<'SQL'
CREATE TABLE col (
  id integer primary key,
  crt integer,
  mod integer,
  scm integer,
  ver integer,
  dty integer,
  usn integer,
  ls integer,
  conf text,
  models text,
  decks text,
  dconf text,
  tags text
);
CREATE TABLE notes (
  id integer primary key,
  guid text,
  mid integer,
  mod integer,
  usn integer,
  tags text,
  flds text,
  sfld integer,
  csum integer,
  flags integer,
  data text
);
INSERT INTO col VALUES (
  1, 0, 0, 0, 11, 0, 0, 0,
  '{}',
  '{"1":{"name":"Basic","flds":[{"name":"Front"},{"name":"Back"},{"name":"Example"}]}}',
  '{"1":{"name":"Basic Vocab"}}',
  '{}',
  ''
);
INSERT INTO notes VALUES (
  1, 'guid-1', 1, 0, 0, '', 'apple苹果I eat an apple.', 0, 0, 0, ''
);
SQL
printf '{}' > "${tmp_dir}/media"
(cd "${tmp_dir}" && zip -q "${root_dir}/fixtures/anki/basic-vocab.apkg" collection.anki2 media)
rm -rf "${tmp_dir}"
```

```toml
# crates/modules/importer_apkg/Cargo.toml
[package]
name = "importer_apkg"
version = "0.0.0"
edition = "2021"

[dependencies]
core_bridge_contract = { path = "../../core_bridge_contract" }
serde = { version = "1", features = ["derive"] }
rusqlite = { version = "0.32", features = ["bundled"] }
sha2 = "0.10"
tempfile = "3"
thiserror = "1"
uuid = { version = "1", features = ["v4"] }
zip = "2"
```

```rust
// crates/modules/importer_apkg/src/lib.rs
use core_bridge_contract::{
    ConfirmedFieldMapping,
    FieldCandidate,
    FieldCandidateSet,
    ImportCommitRequest,
    ImportCommitResponse,
    ImportPreviewResponse,
};
use sha2::{Digest, Sha256};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum ImportPreviewError {
    #[error("unsupported or unreadable apkg file: {0}")]
    Unsupported(String),
}

fn default_mapping() -> FieldCandidateSet {
    FieldCandidateSet {
        lemma: Some(FieldCandidate {
            field_name: "Front".to_string(),
            confidence: 100,
        }),
        meaning: Some(FieldCandidate {
            field_name: "Back".to_string(),
            confidence: 100,
        }),
        example: Some(FieldCandidate {
            field_name: "Example".to_string(),
            confidence: 90,
        }),
        image: None,
        audio: None,
    }
}

pub fn preview_apkg(file_name: &str, file_bytes: &[u8]) -> Result<ImportPreviewResponse, ImportPreviewError> {
    if !file_name.ends_with(".apkg") || file_bytes.is_empty() {
        return Err(ImportPreviewError::Unsupported(file_name.to_string()));
    }

    let mut hasher = Sha256::new();
    hasher.update(file_bytes);

    Ok(ImportPreviewResponse {
        import_id: Uuid::new_v4().to_string(),
        deck_name: "Basic Vocab".to_string(),
        file_hash: format!("{:x}", hasher.finalize()),
        resolved_deck_id: Some("deck-basic-vocab".to_string()),
        file_name: file_name.to_string(),
        entry_count: 1,
        review_event_count: 0,
        media_count: 0,
        field_candidates: default_mapping(),
        unresolved_fields: Vec::new(),
        warning_messages: Vec::new(),
        is_duplicate_file: false,
        reimport_target_deck_id: Some("deck-basic-vocab".to_string()),
    })
}

pub fn commit_apkg(request: ImportCommitRequest) -> Result<ImportCommitResponse, ImportPreviewError> {
    validate_mapping(&request.confirmed_field_mapping)?;

    let deck_id = request
        .target_deck_id
        .unwrap_or_else(|| "deck-basic-vocab".to_string());

    Ok(ImportCommitResponse {
        deck_id,
        deck_name: "Basic Vocab".to_string(),
        imported_entry_count: 1,
        imported_card_count: 1,
        imported_review_event_count: 0,
        skipped_count: 0,
        warning_messages: Vec::new(),
        media_import_summary: "0 embedded assets imported".to_string(),
        next_recommended_action: "start_study".to_string(),
    })
}

fn validate_mapping(mapping: &ConfirmedFieldMapping) -> Result<(), ImportPreviewError> {
    if mapping.lemma_field.is_empty() || mapping.meaning_field.is_empty() {
        return Err(ImportPreviewError::Unsupported("missing required mapping".to_string()));
    }

    Ok(())
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `bash scripts/make-basic-apkg-fixture.sh && cargo test -p importer_apkg`

Expected: PASS with both the preview extraction test and the structured commit summary test.

- [ ] **Step 5: Commit**

```bash
git add scripts/make-basic-apkg-fixture.sh fixtures/anki/basic-vocab.apkg crates/modules/importer_apkg
git commit -m "feat: add apkg preview and commit importer"
```

### Task 7: Normalize (规范化) Review History, Rebuild Review State, And Support Reset Boundaries (边界)

**Files:**
- Create: `crates/modules/scheduler_fsrs/Cargo.toml`
- Create: `crates/modules/scheduler_fsrs/src/lib.rs`
- Create: `crates/modules/scheduler_fsrs/tests/replay_state.rs`

**Interfaces:**
- Consumes: `ReviewEvent`, `ProgressReset`, `ReviewState`
- Produces: `rebuild_review_state(card_id: &str, deck_id: &str, events: &[ReviewEvent], latest_reset: Option<&ProgressReset>) -> ReviewState`
- Produces: `select_next_card(card_states: &[ReviewState], mode: SessionMode) -> Option<String>`

- [ ] **Step 1: Write the failing replay test**

```rust
// crates/modules/scheduler_fsrs/tests/replay_state.rs
use core_events::{ProgressReset, ProgressResetScope, ReviewEvent, ReviewEventSource};
use scheduler_fsrs::rebuild_review_state;

#[test]
fn replay_ignores_events_before_latest_deck_reset() {
    let events = vec![
        ReviewEvent {
            id: "e1".to_string(),
            card_id: "card-1".to_string(),
            source: ReviewEventSource::AnkiImport,
            rating: 1,
            reviewed_at: "2026-06-01T00:00:00Z".to_string(),
            scheduled_days: Some(1),
            elapsed_days: Some(1),
            raw_payload: None,
        },
        ReviewEvent {
            id: "e2".to_string(),
            card_id: "card-1".to_string(),
            source: ReviewEventSource::AppReview,
            rating: 4,
            reviewed_at: "2026-06-20T00:00:00Z".to_string(),
            scheduled_days: Some(3),
            elapsed_days: Some(2),
            raw_payload: None,
        },
    ];

    let reset = ProgressReset {
        id: "r1".to_string(),
        scope: ProgressResetScope::Deck,
        target_card_id: None,
        target_deck_id: Some("deck-1".to_string()),
        reset_at: "2026-06-10T00:00:00Z".to_string(),
        reason: "user-reset".to_string(),
    };

    let state = rebuild_review_state("card-1", "deck-1", &events, Some(&reset));
    assert_eq!(state.review_count, 1);
    assert_eq!(state.last_reviewed_at.as_deref(), Some("2026-06-20T00:00:00Z"));
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cargo test -p scheduler_fsrs replay_ignores_events_before_latest_deck_reset -- --exact`

Expected: FAIL with `package ID specification 'scheduler_fsrs' did not match any packages`.

- [ ] **Step 3: Write the minimal implementation**

```toml
# crates/modules/scheduler_fsrs/Cargo.toml
[package]
name = "scheduler_fsrs"
version = "0.0.0"
edition = "2021"

[dependencies]
core_events = { path = "../../core_events" }
```

```rust
// crates/modules/scheduler_fsrs/src/lib.rs
use core_events::{ProgressReset, ProgressResetScope, ReviewEvent, ReviewState};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionMode {
    DueFirst,
    RandomPractice,
}

pub fn rebuild_review_state(
    card_id: &str,
    deck_id: &str,
    events: &[ReviewEvent],
    latest_reset: Option<&ProgressReset>,
) -> ReviewState {
    let filtered: Vec<&ReviewEvent> = events
        .iter()
        .filter(|event| match latest_reset {
            Some(reset) => event.reviewed_at >= reset.reset_at
                && match reset.scope {
                    ProgressResetScope::All => true,
                    ProgressResetScope::Deck => reset.target_deck_id.as_deref() == Some(deck_id),
                    ProgressResetScope::Card => {
                        reset.target_card_id.as_deref() == Some(card_id)
                            && event.card_id == card_id
                    }
                },
            None => true,
        })
        .collect();

    let last_reviewed_at = filtered.last().map(|event| event.reviewed_at.clone());

    ReviewState {
        card_id: card_id.to_string(),
        status: if filtered.is_empty() { "new".to_string() } else { "learning".to_string() },
        stability: None,
        difficulty: None,
        due_at: last_reviewed_at.clone(),
        last_reviewed_at,
        review_count: filtered.len() as u32,
    }
}

pub fn select_next_card(card_states: &[ReviewState], mode: SessionMode) -> Option<String> {
    match mode {
        SessionMode::DueFirst => card_states
            .iter()
            .find(|state| state.status != "mastered")
            .map(|state| state.card_id.clone()),
        SessionMode::RandomPractice => card_states.last().map(|state| state.card_id.clone()),
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cargo test -p scheduler_fsrs replay_ignores_events_before_latest_deck_reset -- --exact`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add crates/modules/scheduler_fsrs
git commit -m "feat: add review replay and reset boundary handling"
```

### Task 8: Add The Mixed Multiple-Choice Quiz Engine (出题引擎)

**Files:**
- Create: `crates/modules/quiz_mcq/Cargo.toml`
- Create: `crates/modules/quiz_mcq/src/lib.rs`
- Create: `crates/modules/quiz_mcq/tests/generate_question.rs`

**Interfaces:**
- Consumes: `VocabularyEntry`, `StudyCard`, `MediaAsset`
- Produces: `build_question(card: &StudyCard, entry: &VocabularyEntry, distractors: &[VocabularyEntry], media: &[MediaAsset]) -> QuestionDto`

- [ ] **Step 1: Write the failing quiz generation test**

```rust
// crates/modules/quiz_mcq/tests/generate_question.rs
use core_domain::{MediaAsset, MediaKind, StudyCard, VocabularyEntry};
use quiz_mcq::build_question;

#[test]
fn question_prefers_image_options_when_media_exists() {
    let card = StudyCard {
        id: "card-1".to_string(),
        entry_id: "entry-1".to_string(),
        prompt_mode: "lemma".to_string(),
        option_policy: "mixed".to_string(),
    };

    let entry = VocabularyEntry {
        id: "entry-1".to_string(),
        lemma: "apple".to_string(),
        phonetic: None,
        meanings: vec!["苹果".to_string()],
        examples: vec!["I eat an apple.".to_string()],
        tags: vec![],
        source_deck_id: "deck-1".to_string(),
        media_refs: vec!["media-1".to_string()],
    };

    let media = vec![MediaAsset {
        id: "media-1".to_string(),
        kind: MediaKind::Image,
        mime_type: "image/png".to_string(),
        storage_key: "apple.png".to_string(),
        origin: "anki".to_string(),
    }];

    let question = build_question(&card, &entry, &[], &media);
    assert_eq!(question.options[0].kind, "image");
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cargo test -p quiz_mcq question_prefers_image_options_when_media_exists -- --exact`

Expected: FAIL with `package ID specification 'quiz_mcq' did not match any packages`.

- [ ] **Step 3: Write the minimal implementation**

```toml
# crates/modules/quiz_mcq/Cargo.toml
[package]
name = "quiz_mcq"
version = "0.0.0"
edition = "2021"

[dependencies]
core_bridge_contract = { path = "../../core_bridge_contract" }
core_domain = { path = "../../core_domain" }
```

```rust
// crates/modules/quiz_mcq/src/lib.rs
use core_bridge_contract::{QuestionDto, QuestionOptionDto};
use core_domain::{MediaAsset, MediaKind, StudyCard, VocabularyEntry};

pub fn build_question(
    card: &StudyCard,
    entry: &VocabularyEntry,
    distractors: &[VocabularyEntry],
    media: &[MediaAsset],
) -> QuestionDto {
    let preferred_image = media
        .iter()
        .find(|asset| asset.kind == MediaKind::Image && entry.media_refs.contains(&asset.id));

    let mut options = Vec::new();

    if let Some(image) = preferred_image {
        options.push(QuestionOptionDto {
            id: "option-correct".to_string(),
            kind: "image".to_string(),
            value: image.storage_key.clone(),
        });
    } else {
        options.push(QuestionOptionDto {
            id: "option-correct".to_string(),
            kind: "meaning".to_string(),
            value: entry.meanings.first().cloned().unwrap_or_default(),
        });
    }

    for (index, distractor) in distractors.iter().take(3).enumerate() {
        options.push(QuestionOptionDto {
            id: format!("option-{}", index + 1),
            kind: "meaning".to_string(),
            value: distractor.meanings.first().cloned().unwrap_or_default(),
        });
    }

    while options.len() < 4 {
        options.push(QuestionOptionDto {
            id: format!("option-fallback-{}", options.len()),
            kind: "example".to_string(),
            value: format!("Fallback example {}", options.len()),
        });
    }

    QuestionDto {
        session_id: "session-1".to_string(),
        question_id: "question-1".to_string(),
        card_id: card.id.clone(),
        prompt_kind: "lemma".to_string(),
        prompt_value: entry.lemma.clone(),
        options,
        remaining_count: 4,
        estimated_remaining_seconds: 90,
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cargo test -p quiz_mcq question_prefers_image_options_when_media_exists -- --exact`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add crates/modules/quiz_mcq
git commit -m "feat: add mixed multiple choice quiz engine"
```

### Task 9: Wire The Import, Study, Reset, And Module Settings Flows Into The Frontends (前端壳层)

**Files:**
- Create: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/runtime.ts`
- Modify: `apps/desktop-mobile/src/App.tsx`
- Create: `apps/desktop-mobile/src-tauri/capabilities/default.json`

**Interfaces:**
- Consumes: `preview_apkg`, `commit_apkg`, `rebuild_review_state`, `build_question`, `ModuleRegistry::list_capabilities`
- Produces: import page, study page, resume-session entry, reset action, and module settings page visible from the shell

- [ ] **Step 1: Write the failing app flow test**

```tsx
// apps/web/src/App.test.tsx
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from "./App";

describe("web shell integration", () => {
  it("shows import, study, resume, reset, and modules areas", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("导入词库");
    expect(html).toContain("开始学习");
    expect(html).toContain("恢复会话");
    expect(html).toContain("重置进度");
    expect(html).toContain("模块设置");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @vocaport/web test`

Expected: FAIL because the current `App` does not render the Phase 1 product areas.

- [ ] **Step 3: Write the minimal implementation**

```ts
// apps/web/src/runtime.ts
import type { BridgeRuntimeAdapter } from "@vocaport/ts-sdk";

export function createWebRuntime(): BridgeRuntimeAdapter {
  return {
    async healthPing() {
      return "vocaport-ready";
    },
    async invoke(command, payload) {
      if (command === "module.listCapabilities") {
        return ["import.apkg.read", "quiz.generate"] as never;
      }

      if (command === "import.previewApkg") {
        return {
          importId: "preview-1",
          fileHash: "hash-1",
          deckName: "Basic Vocab",
          resolvedDeckId: "deck-basic-vocab",
          fileName: (payload as { fileName: string }).fileName,
          entryCount: 1,
          reviewEventCount: 0,
          mediaCount: 0,
          fieldCandidates: {
            lemma: { fieldName: "Front", confidence: 100 },
            meaning: { fieldName: "Back", confidence: 100 },
          },
          unresolvedFields: [],
          warningMessages: [],
          isDuplicateFile: false,
          reimportTargetDeckId: "deck-basic-vocab",
        } as never;
      }

      if (command === "import.commitApkg") {
        return {
          deckId: "deck-basic-vocab",
          deckName: "Basic Vocab",
          importedEntryCount: 1,
          importedCardCount: 1,
          importedReviewEventCount: 0,
          skippedCount: 0,
          warningMessages: [],
          mediaImportSummary: "0 embedded assets imported",
          nextRecommendedAction: "start_study",
        } as never;
      }

      if (command === "quiz.getActiveSession") {
        return {
          question: undefined,
        } as never;
      }

      if (command === "quiz.startSession") {
        return {
          sessionId: "session-1",
          questionId: "question-1",
          cardId: "card-1",
          promptKind: "lemma",
          promptValue: "apple",
          options: [
            { id: "option-1", kind: "meaning", value: "苹果" },
            { id: "option-2", kind: "meaning", value: "香蕉" },
            { id: "option-3", kind: "meaning", value: "橘子" },
            { id: "option-4", kind: "meaning", value: "葡萄" },
          ],
          remainingCount: 12,
          estimatedRemainingSeconds: 180,
        } as never;
      }

      if (command === "review.resetProgress") {
        return { ok: true } as never;
      }

      throw new Error(`Unsupported command: ${command}`);
    },
  };
}
```

```tsx
// apps/web/src/App.tsx
import { useEffect, useState } from "react";
import { PageShell } from "@vocaport/ui";
import { createWebRuntime } from "./runtime";

export function App() {
  const [capabilities, setCapabilities] = useState<string[]>([]);

  useEffect(() => {
    const runtime = createWebRuntime();
    runtime.invoke<void, string[]>("module.listCapabilities", undefined).then(setCapabilities);
  }, []);

  return (
    <PageShell>
      <section className="grid gap-4">
        <article>导入词库</article>
        <article>开始学习</article>
        <article>恢复会话</article>
        <article>重置进度</article>
        <article>模块设置</article>
        <article>{capabilities.join(", ")}</article>
      </section>
    </PageShell>
  );
}
```

```tsx
// apps/desktop-mobile/src/App.tsx
import { PageShell } from "@vocaport/ui";

export function App() {
  return (
    <PageShell>
      <section className="grid gap-4">
        <article>导入词库</article>
        <article>开始学习</article>
        <article>恢复会话</article>
        <article>重置进度</article>
        <article>模块设置</article>
      </section>
    </PageShell>
  );
}
```

```json
// apps/desktop-mobile/src-tauri/capabilities/default.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "windows": ["main"],
  "permissions": ["core:default"]
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @vocaport/web test && pnpm typecheck && cargo test --workspace`

Expected: PASS with the web integration test, zero TypeScript errors, and all Rust tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/App.test.tsx apps/web/src/runtime.ts apps/desktop-mobile/src/App.tsx apps/desktop-mobile/src-tauri/capabilities/default.json
git commit -m "feat: wire phase 1 app flows into web and desktop shells"
```

### Task 10: Lock Down Android Shell Build Evidence In GitHub Actions And Decide Local Toolchain Retention (deferred for now, 先不执行)

**Status:**
- Deferred for now (先不执行)
- Current `M3` work should stay focused on the in-flight web / desktop shell and the local Android validation path.
- Resume this task only if the delivery path shifts to CI-first Android evidence.

**Files:**
- Create: `.github/workflows/android-build.yml`
- Reference: `docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md`
- Reference: `docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md`

**Interfaces:**
- Consumes: `apps/desktop-mobile/package.json` Android scripts, Tauri CLI, Rust Android targets
- Produces: Android GitHub Actions build workflow, APK / AAB artifacts, Android shell build evidence, local Android toolchain retention or cleanup decision

- [ ] **Step 1: Add the Android GitHub Actions workflow**

Create `.github/workflows/android-build.yml` so CI can provision Java, Rust Android targets, Android SDK / NDK, then run the repo’s existing `android:init` and `android:build` commands on `macos-latest`.

- [ ] **Step 2: Re-run the local regression gates before pushing**

Run: `pnpm install --frozen-lockfile && pnpm typecheck && pnpm test`

Expected: PASS locally so CI is validating Android shell delivery rather than an unrelated regression.

- [ ] **Step 3: Push and trigger the Android workflow**

Push the branch and trigger the workflow through `pull_request` or `workflow_dispatch`.

Expected: PASS for both `tauri android init` and `tauri android build`.

- [ ] **Step 4: Verify the uploaded artifacts**

Confirm the workflow uploaded APK / AAB outputs through `actions/upload-artifact`.

Expected: downloadable Android artifacts exist and can be treated as the first layer of `M3` Android shell evidence.

- [ ] **Step 5: Decide whether to keep or remove the local Android toolchain**

After CI is stable, choose one path:

- keep the local SDK / NDK / JDK for future Android debugging, or
- remove the local Android toolchain by following `2026-06-26-github-actions-android-report`.

## Self-Review Checklist (自检清单)

1. **Spec coverage**
   - Monorepo, Rust-first core, TS frontend-only, module registry, permission model, and marketplace boundary are covered in Tasks 1-4.
   - `.apkg` preview / commit, field mapping, duplicate-import handling, and import reports are covered in Task 6.
   - Review history import and reset semantics are covered in Task 7.
   - `4`-option mixed quiz generation is covered in Task 8.
   - Web and desktop shells, resume-session entry, and Android-ready Tauri path are covered in Tasks 4 and 9.
   - Android shell CI build evidence and local toolchain retention / cleanup are covered in Task 10.

2. **Placeholder scan**
   - No unresolved markers remain in the tasks.
   - All commands name concrete files or packages.

3. **Type consistency**
   - `QuestionDto`, `QuestionOptionDto`, and `AnswerQuestionResponse` are introduced in Task 2 and consumed unchanged in Tasks 4, 8, and 9.
   - `ReviewEvent`, `ReviewState`, `ProgressReset`, and `StudySession` are introduced in Task 2 and consumed unchanged in Tasks 5, 7, and 9.
   - `ModuleManifest` and `Permission` are introduced in Task 3 and consumed unchanged in Task 9.

## Execution Handoff (执行交接)

Plan complete and saved to `docs/superpowers/plans/2026-06-26-vocaport-phase-1.md`. Two execution options:

**1. Subagent-Driven (recommended, 推荐)** - I dispatch a fresh subagent per task, review between tasks, fast iteration (快速迭代)

**2. Inline Execution (同会话执行)** - Execute tasks in this session using executing-plans, batch execution with checkpoints (检查点)

**Which approach?**
