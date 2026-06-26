# VocaPort Phase 1 Design

> Chinese version (中文版): [2026-06-26-vocaport-design.zh.md](/Users/jay/Code/VocaPort/docs/superpowers/specs/2026-06-26-vocaport-design.zh.md)

> Reading note: advanced terms, domain terms, and higher-difficulty words are followed by short Chinese glosses in parentheses for easier scanning.

## 1. Project Goal

VocaPort is an offline-first (离线优先) vocabulary learning application focused on two core capabilities:

- deck import (词库导入), starting with Anki `.apkg`
- single-word study cards with `4` options and `1` correct answer

Project boundaries:

- the new repository sits at the same directory level as `LunaTV`
- `web` and `desktop` come first
- `android` follows on the same architecture path
- `ios` stays for the final stage
- `Rust` owns the business core (业务内核)
- `TypeScript` stays in the frontend presentation (展示层) and interaction layer

## 2. Phase 1 Scope

### 2.1 Included

- a new standalone (独立的) repository
- web application
- desktop application
- Android architecture path and adapter boundaries
- Anki `.apkg` import
- import of entries, meanings, examples, images, and audio
- import of Anki review history
- resettable (可重置的) study progress without deleting imported history
- one built-in quiz module: `4-option mixed multiple choice`
- image-first options with text fallback (降级回退)
- an FSRS-compatible (兼容的) scheduling data model
- whole-project design aligned with a future online plugin marketplace

### 2.2 Excluded

- iOS client
- account system
- cloud sync
- online image completion
- multiple quiz modes at launch
- runtime third-party plugin installation and execution
- public community marketplace
- complex analytics dashboard

## 3. Global Design Principles

### 3.1 Core Principles

- **Offline-first (离线优先)**: import, study, media access, and progress all work locally by default
- **Rust as the single source of truth (唯一业务真相)**: import normalization (规范化), quiz generation, answer evaluation, scheduling, and module contracts live in Rust
- **TS frontend only (仅前端)**: the frontend does not own business truth and does not maintain a second rule set
- **Extension-ready (可扩展就绪)**: all variable capabilities are designed behind module boundaries
- **Marketplace-ready (市场化就绪)**: contracts, permissions, signatures, and compatibility layers are reserved from day one
- **Phase-1 restraint (克制)**: built-in statically registered modules only, no runtime third-party plugin loading

### 3.2 Architectural Method

The system uses Hexagonal Architecture (六边形架构):

- Rust core crates define domain models, event models, storage contracts, and module contracts
- each platform provides only shell and adapter layers
- changeable capabilities are attached through modules instead of leaking into the core domain

The global project rule is:

> **Marketplace-Ready (面向插件市场), Runtime-Disabled (一期关闭运行时第三方插件) in Phase 1**

## 4. Recommended Tech Stack

### 4.1 Frontend

- `Vite`
- `React`
- `TypeScript` with `strict: true`
- `Tailwind CSS`

Why not copy `LunaTV` directly:

- this project has no strong SSR or SEO requirement
- the main challenge is local decks, local media, and offline behavior
- `Vite + React` is simpler, leaner (更轻量), and more aligned with KISS / YAGNI

### 4.2 Cross-Platform Shell

- `Tauri 2`

### 4.3 Rust

- Rust workspace
- multi-crate decomposition (拆分)
- `serde` for DTO serialization (序列化)
- `thiserror` or an equivalent structured error approach
- `sqlx` or `rusqlite` for native-side storage

### 4.4 Local Storage

- Web: `IndexedDB`
- Desktop / Android: `SQLite`
- Native media: local file system
- Web media: browser cache or `Blob` persistence (持久化)

## 5. Repository Layout

```text
VocaPort/
  apps/
    web/
    desktop-mobile/
  crates/
    core_domain/
    core_events/
    core_storage_contract/
    core_bridge_contract/
    core_module_registry/
    core_permission/
    core_signature/
    modules/
      importer_apkg/
      scheduler_fsrs/
      quiz_mcq/
      media_embedded/
  packages/
    ui/
    bridge-schema/
    ts-sdk/
  docs/
    superpowers/
      specs/
  scripts/
```

Layout rules:

- `apps/` contains platform shells only
- `crates/core_*` contains stable trusted core logic
- `crates/modules/*` contains replaceable (可替换的) capabilities
- `packages/*` contains TS shared assets, bridge types, and frontend SDKs

## 6. Modular Boundaries

### 6.1 Non-Pluggable Core

The following capabilities stay inside the trusted core:

- domain model
- event model
- progress reset semantics (语义)
- storage contracts
- bridge command contracts
- module registration contracts
- permission model
- signature verification model
- compatibility checks

### 6.2 Pluggable Capability Families

These capability families are modular from day one:

- `ImporterModule`
- `SchedulerModule`
- `QuizModule`
- `MediaResolverModule`
- later `DictionaryEnhancerModule`
- later `TtsModule`

### 6.3 Built-In Modules In Phase 1

- `importer_apkg`
- `scheduler_fsrs`
- `quiz_mcq`
- `media_embedded`

## 7. Domain Model

### 7.1 Canonical Objects

#### `Deck`

- `id`
- `name`
- `sourceType`
- `externalDeckId`
- `latestImportRecordId`
- `createdAt`
- `updatedAt`

#### `VocabularyEntry`

- `id`
- `lemma`
- `phonetic`
- `meanings[]`
- `examples[]`
- `tags[]`
- `sourceDeckId`
- `mediaRefs[]`

#### `StudyCard`

- `id`
- `entryId`
- `promptMode`
- `optionPolicy`

Rule:

- `1 card = 1 word`

#### `MediaAsset`

- `id`
- `kind`
- `mimeType`
- `storageKey`
- `origin`

#### `ReviewEvent`

- `id`
- `cardId`
- `source`
- `rating`
- `reviewedAt`
- `scheduledDays`
- `elapsedDays`
- `rawPayload`

Minimum `source` values:

- `anki_import`
- `app_review`

#### `ReviewState`

- `cardId`
- `status`
- `stability`
- `difficulty`
- `dueAt`
- `lastReviewedAt`
- `reviewCount`

#### `StudySession`

- `id`
- `deckId`
- `mode`
- `status`
- `currentQuestion`
- `remainingCardIds[]`
- `answeredCount`
- `startedAt`
- `lastActivityAt`

Rule:

- `currentQuestion` must persist the current prompt and option snapshot so a resumed session stays stable

#### `ProgressReset`

- `id`
- `scope`
- `targetCardId`
- `targetDeckId`
- `resetAt`
- `reason`

#### `ImportRecord`

- `id`
- `deckId`
- `sourceType`
- `fileHash`
- `sourceFingerprint`
- `importedAt`
- `entryCount`
- `reviewEventCount`
- `skippedCount`
- `warningCount`

### 7.2 Modeling Rules

- Anki tables are external source formats, not internal domain truth
- the internal model is canonical (规范化的) and stable
- `ReviewState` must be derived from the event stream instead of trusting imported snapshots directly
- `Deck` is a first-class entity and must not be reconstructed only from `VocabularyEntry.sourceDeckId`
- active study session state and question-option order belong to the Rust core and must be resumable (可恢复的)
- when stable external IDs exist, they are the first choice for upsert / dedupe; `fileHash` only identifies identical import packages

## 8. Import Architecture

### 8.1 Supported Source

Phase 1 officially supports:

- Anki `.apkg`

### 8.2 Import Flow

1. read the `.apkg`
2. compute the `fileHash`
3. unpack the archive
4. read notes, cards, media, and `revlog`
5. run field-mapping rules
6. ask the user to confirm mapping when confidence is not high enough
7. clean HTML, empty values, duplicated meanings, and duplicated examples
8. build media references
9. normalize review history into `ReviewEvent`
10. derive `ReviewState` from the event stream
11. persist canonical entities and import records
12. return an import report

### 8.3 Preview / Commit Contract

`import.previewApkg` must return at least:

- `importId`
- `fileHash`
- `deckName`
- `resolvedDeckId`
- `entryCount`
- `reviewEventCount`
- `mediaCount`
- `fieldCandidates { lemma, meaning, example, image, audio }`
- `unresolvedFields[]`
- `warningMessages[]`
- `isDuplicateFile`
- `reimportTargetDeckId`

`import.commitApkg` must accept at least:

- `importId`
- `confirmedFieldMapping { lemma, meaning, example, image, audio }`
- `targetDeckId`
- `commitMode`

`import.commitApkg` must return at least:

- `deckId`
- `deckName`
- `importedEntryCount`
- `importedCardCount`
- `importedReviewEventCount`
- `skippedCount`
- `warningMessages[]`
- `mediaImportSummary`
- `nextRecommendedAction`

### 8.4 Import Report

The report must include:

- number of imported entries
- number of imported cards
- number of imported review events
- skipped items
- warning messages
- unresolved field mappings
- media import summary

### 8.5 Field-Mapping Policy

- ship one built-in English vocabulary template rule set
- when matching confidence is weak, do not guess aggressively (激进地); ask the user
- `lemma` and `meaning` are required mappings; `example`, `image`, and `audio` may stay optional
- import quality is more important than pretending to be fully automatic

### 8.6 Re-import And Idempotency (幂等性) Policy

- `fileHash` only identifies identical import files; it is not the primary deck identity
- the primary deck identity should prefer `sourceType + externalDeckId`; only fall back to an explicit user-selected target deck when that source identity is missing
- entries, cards, and media should upsert by stable external IDs first; only fall back to deterministic hashes when the source data is incomplete
- review events should dedupe by external review ID first; otherwise use a deterministic event hash
- when the same file is imported again, the product must show an explicit duplicate warning and default to `upsert_existing_deck` instead of silently duplicating data

## 9. Review History And Progress Reset

### 9.1 Review History

- import Anki review history
- preserve key raw fields inside `rawPayload`
- normalize all imported review records into internal `ReviewEvent`

### 9.2 Progress Reset

Reset does not delete history. It creates a `ProgressReset`.

The scheduler only consumes events after the latest relevant reset boundary (边界).

Supported reset scopes:

- single card
- whole deck
- whole account-local dataset

Benefits:

- traceable (可追溯)
- reversible (可恢复)
- does not pollute import archives

### 9.3 Reset Resolution Rules

- when rebuilding one card state, the system checks `card`, `deck`, and `all` reset scopes together
- it uses the latest `resetAt` among the resets that apply to that card
- `card` reset only applies to the target card
- `deck` reset applies to all cards whose `sourceDeckId` matches
- `all` reset applies to the whole local dataset
- `ProgressReset` must be stored in a dedicated `ProgressResetRepository` instead of being mixed into `ReviewEvent`

## 10. Study Flow And Quiz Engine

### 10.1 Study Loop

1. user imports a deck
2. user chooses a deck
3. scheduler selects cards for the current session
4. quiz module generates one question
5. user answers
6. system writes a new `ReviewEvent`
7. system rebuilds `ReviewState`
8. system returns feedback and the next question

Any unfinished study loop must persist as a `StudySession`. On the next app entry, the product resumes that session before creating a new one.

### 10.2 Phase 1 Quiz Mode

Only one quiz module ships in Phase 1:

- `4-option mixed multiple choice`

Rules:

- `1` correct answer
- `3` distractors (干扰项)
- use image options first when available
- fall back to meanings or examples when no usable image exists

### 10.3 Distractor Strategy

Phase 1 uses a minimum-quality distractor policy:

- prefer the same deck
- prefer similar part of speech when available
- prefer similar answer length
- avoid obvious leakage (泄漏) from the correct answer
- avoid repeated roots and near-identical distractors

### 10.4 Answer Feedback

Each answer returns at least:

- `isCorrect`
- `correctOptionId`
- `appliedRating`
- `explanationPayload`
- `nextReviewSuggestion`
- `nextQuestion`
- `isSessionComplete`

`explanationPayload` in Phase 1 should include:

- target word
- correct meaning
- example sentence
- playable audio if it exists

Phase 1 keeps the FSRS rating mapping explicit:

- incorrect answer => `again`
- correct answer by default => `good`
- user taps `mark too hard` => `hard`
- `easy` is reserved for later and is not exposed in the Phase 1 UI

## 11. Scheduler Design

### 11.1 Base Strategy

Phase 1 stores an FSRS-compatible internal model while keeping runtime behavior conservative (克制的):

- import Anki history
- rebuild state from the event stream
- support due-first review
- support random practice

### 11.2 Why This Shape

- future scheduler switching stays cheap
- imported history is not trapped by early table design
- the project does not need to reproduce every Anki internal detail on day one

## 12. Storage Design

### 12.1 Repository Split

Storage contracts are split by responsibility instead of becoming one giant repository.

Phase 1 must ship:

- `DeckRepository`
- `EntryRepository`
- `CardRepository`
- `ReviewEventRepository`
- `ReviewStateRepository`
- `ProgressResetRepository`
- `StudySessionRepository`
- `MediaRepository`
- `SettingsRepository`
- `ImportRecordRepository`

Reserved for the later plugin marketplace:

- `ModuleRepository`

### 12.2 Platform Storage

#### Web

- structured data: `IndexedDB`
- media data: browser cache or `Blob`

#### Desktop / Android

- structured data: `SQLite`
- media data: local file system

### 12.3 Consistency Requirement

Web and native do not need the same physical engine.

They must keep the same:

- schema semantics
- domain contracts
- bridge protocol
- business outputs

## 13. Bridge And Service Layer

### 13.1 Command Families

Frontend calls Rust only through stable bridge commands:

- `import.*`
- `deck.*`
- `review.*`
- `quiz.*`
- `module.*`
- `settings.*`
- `media.*`

Examples:

- `import.previewApkg`
- `import.commitApkg`
- `quiz.getActiveSession`
- `quiz.startSession`
- `quiz.answerQuestion`
- `review.resetProgress`
- `module.listCapabilities`

### 13.2 App Services

Service objects depend on contracts, not concrete implementations:

- `ImportService`
- `ReviewService`
- `QuizService`
- `ModuleService`

The frontend must never call module implementations directly.

## 14. Multi-Platform Delivery Strategy

### 14.1 Web

- `TS UI + Rust/WASM core`
- browser file selection
- IndexedDB adapter
- WASM bootstrap (启动层)
- PWA used only as the web offline shell

### 14.2 Desktop

- `TS UI + Rust native core`
- Tauri shell
- local file system
- native SQLite
- local media cache

### 14.3 Android

- same high-level route as desktop
- mobile file picker, permissions, and cache-directory management added on top

### 14.4 Platform Rule

Platform differences are allowed only inside:

- `FileAccessAdapter`
- `StorageAdapter`
- `MediaCacheAdapter`
- `BridgeRuntimeAdapter`
- `PlatformInfoAdapter`

Business rules must not slide into platform shells.

## 15. Plugin Marketplace Preparation

### 15.1 Phase 1 Policy

Phase 1 allows only:

- built-in modules
- static registration
- explicit capability declaration
- explicit permission declaration

### 15.2 Later Capability Growth

Later phases can open:

- signed official module distribution
- download, install, enable, disable
- rollback
- compatibility resolution (兼容性解析)
- online marketplace

### 15.3 Module Manifest Contract

Every module exposes:

- `moduleId`
- `version`
- `apiVersion`
- `capabilities[]`
- `permissions[]`
- `platformTargets[]`
- `entrypoints`
- `checksum`
- `signature`

Even Phase 1 built-in modules should follow the same manifest shape.

### 15.4 Permission Model

Permissions are deny-by-default (默认拒绝) and explicitly granted:

- `import.apkg.read`
- `media.asset.read`
- `quiz.generate`
- `scheduler.compute`
- `storage.module_scoped`
- `network.none`
- `network.limited`
- `ui.route.register`

### 15.5 Reserved System Components

The project should reserve interfaces and registration points for:

- `ModuleRegistry`
- `PermissionManager`
- `PluginManifestValidator`
- `SignatureVerifier`
- `PluginInstaller`
- `PluginCatalogClient`
- `CompatibilityResolver`
- `SafeModeLoader`

Phase 1 does not need the full marketplace, but these architectural boundaries must already be fixed.

## 16. Frontend Information Architecture

The frontend should not be hard-wired around a single study page.

Recommended top-level areas:

- deck import
- study session
- progress management
- module settings

This keeps future importers, quiz modes, schedulers, and marketplace entry points from forcing a full navigation rewrite.

## 17. Milestones

### M0: Architecture Skeleton

- monorepo created
- Rust workspace created
- TS apps and packages created
- bridge schema defined
- module registry interface defined

### M1: Import Pipeline

- `.apkg` preview
- field-mapping confirmation
- commit import
- canonical entity import
- review-history import
- import report

### M2: Study Loop

- deck selection
- session start
- session resume
- question generation
- answer submission
- event persistence
- state rebuild

### M3: Multi-Platform Delivery

- web usable
- desktop usable
- Android shell validated

### M4: Marketplace Foundation

- manifest contract
- permission contract
- signature-verification contract
- installer and catalog interfaces

## 18. Risks

- Anki templates vary heavily, so field mapping quality may fluctuate (波动)
- imported history cannot be normalized perfectly in every case
- web-side WASM and local media handling are more fragile (脆弱) than native I/O
- Android file permissions and cache management can affect UX
- opening runtime third-party plugins too early introduces supply-chain (供应链) and compatibility risk

## 19. Cut Lines

If schedule pressure rises, keep:

- `.apkg` import
- review-history import
- `4-option` study loop
- progress reset
- Rust core contracts
- marketplace-ready interfaces

Cut these first:

- fancy animation
- multiple quiz modes at launch
- online image completion
- advanced analytics dashboard
- runtime third-party plugin execution
- cloud sync

## 20. Final Recommendation

Phase 1 should be implemented with:

- a monorepo
- Rust as the single business core
- TypeScript used only for frontend and platform presentation
- `Tauri 2` for desktop and Android evolution
- `Rust/WASM` for web-side logic reuse
- statically registered built-in modules for import, scheduling, quiz generation, and media resolution
- contract, permission, signature, and compatibility boundaries reserved for the future marketplace

This keeps Phase 1 small enough to ship while preserving the path toward an extensible (可扩展的) online module ecosystem (生态).
