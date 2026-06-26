# VocaPort Product Roadmap

> Chinese companion (中文伴读版): [2026-06-26-vocaport-roadmap.zh.md](/Users/jay/Code/VocaPort/docs/superpowers/specs/2026-06-26-vocaport-roadmap.zh.md)

> Status (状态): active from June 26, 2026. This roadmap is capability-based (按能力分阶段), not calendar-bound (不绑定固定日历).

## 1. Current Baseline

- `main` already contains the completed Phase 1 delivery.
- Web now uses the Rust/WASM runtime, and Desktop now uses the Rust native runtime.
- The Android shell can build, and at least one real device has already been verified to launch it successfully.
- `.apkg` preview/commit, study start/answer/resume/reset, and durable snapshot restore are wired end-to-end.
- The GitHub Releases -> GitHub Pages download path already exists, but the Android artifact flow is still engineering-oriented (工程验证导向) and should not yet be treated as a public beta release process.

## 2. Roadmap Rules

- Use outcome-driven (按结果驱动的) phases, not date-driven promises. Every phase needs a clear exit gate.
- Keep `Rust` as the single source of truth. `TypeScript` remains limited to UI, platform shells, and bridge orchestration (桥接编排).
- Productize (产品化) Android into the first durable local beta before pulling in heavier capabilities.
- Stay `offline-first` and `local-first` through Phase 4. Do not pull in accounts or cloud sync just to look “complete.”
- Do not allow runtime third-party plugin execution before Phase 4. Permission, signature, and compatibility boundaries must harden first.
- Keep Phase 3+ at milestone granularity (里程碑粒度) to avoid fake precision while product assumptions are still moving.

## 3. Roadmap Overview

| Phase | Positioning | Key Deliverables | Exit Gate |
| --- | --- | --- | --- |
| Phase 1 | Foundation | Rust core, `.apkg` import, study loop, snapshot restore, real Web/Desktop runtimes, Android shell validation | Completed and merged into `main` |
| Phase 2 | First usable beta | deck library, field-mapping confirmation, mobile-first workspace, current-deck selection, beta release semantics | A user can install a beta build, import a real text-first `.apkg`, choose the active deck, resume or reset progress safely, and finish a full study loop |
| Phase 3 | Learning quality expansion | media rendering, stronger feedback, basic statistics, multi-deck operations | Both text-first and media-rich decks can be studied reliably, and the state remains explainable (可解释) |
| Phase 4 | Signed extension ecosystem | signed module packs, installer, permission prompts, compatibility resolution, read-only catalog client | Trusted extensions can be installed, disabled, and rolled back safely without damaging existing data |
| Phase 5 | Multi-device and distribution expansion | encrypted backup/sync, optional accounts, iOS path, broader distribution | One user can recover state across devices without losing the offline-first experience |

## 4. Phase Notes

### Phase 1: Foundation (complete)

- This phase answered the architecture question: does the Rust-first, offline-first structure actually hold under a real end-to-end flow?
- The important output was not polish. It was a working core: import, study, restore, reset, and shared runtime boundaries.
- That foundation is complete, but it is still not the same thing as a user-facing first version.

### Phase 2: First usable beta

- This is the first phase that should be treated as the first real version of the app.
- The job is not another deep rewrite. The job is to turn the current engineering slice into a product loop that a user can keep using.

Phase 2 must add:

- a deck library plus a clear “current deck” concept
- explicit field-mapping review and re-import decisions
- mobile-first navigation, empty states, error states, and recovery states
- beta artifact naming and release semantics that match the downloads page

Phase 2 explicitly does not include:

- iOS
- cloud sync or accounts
- runtime third-party plugin execution
- media-heavy study flows or a wide mode explosion

### Phase 3: Learning quality expansion

- This phase turns “usable” into “more like a real learning product.”
- The center of gravity shifts to media asset rendering, feedback quality, basic statistics, and multi-deck operations.
- It belongs after Phase 2 because all of those features depend on a stable deck library model, stable import decisions, and a trustworthy current-deck state.

### Phase 4: Signed extension ecosystem

- This is where “marketplace-ready” stops being a static boundary and becomes a real trusted extension model.
- The first deliverable should not be an open public marketplace. It should be a curated (受控的), signed, rollback-safe module-pack mechanism.
- That sequencing matches common supply-chain security (供应链安全) practice and keeps risk contained.

### Phase 5: Multi-device and distribution expansion

- This is the right moment for sync, accounts, iOS, and broader distribution.
- Sync amplifies every earlier modeling mistake. Shipping it too early only multiplies bugs across devices.
- By placing it last, we protect the local state model first and then extend distribution with fewer unknowns.

## 5. Dependency Logic

- Phase 2 comes before Phase 3 because media, statistics, and multi-deck study all depend on stable library state.
- Phase 3 comes before Phase 4 because the host UI and capability boundaries need to be stable before extensions are opened up.
- Phase 5 stays last because sync and cross-device recovery only make sense on top of a reliable local state machine.

## 6. Items We Intentionally Do Not Pull Forward

- No iOS in Phase 2.
- No accounts in Phase 2 or Phase 3.
- No runtime third-party plugins in Phase 2 or Phase 3.
- No cloud dependency in Phase 2 just to make the product look larger than it is.

## 7. Conclusion

- Phase 1 proved the architecture and is complete.
- Phase 2 is now the mainline because it delivers the first installable, usable, verifiable beta.
- Later phases should stay milestone-shaped until the product and technical constraints are more settled.
