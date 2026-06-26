# VocaPort

VocaPort is a Rust-first (Rust 优先), offline-first (离线优先) vocabulary learning app repository. The current `main` branch already completes the Phase 1 delivery (一期交付): it supports Anki `.apkg` import, preserves (保留) review history, resets study progress, and ships a Rust-backed Web / Desktop study loop while keeping the architecture ready for Android expansion.

## Current Status

- Phase 1 is complete (已完成) and merged into `main`.
- The Web shell now runs on the Rust/WASM runtime (运行时).
- The Desktop Tauri shell now runs on the Rust native runtime (原生运行时).
- Web and Desktop both support import preview, import commit, study start, session resume, answering, and progress reset.
- Interrupted sessions now restore from durable snapshots (持久化快照): Web uses browser storage, and Desktop uses SQLite.
- `apps/downloads` now provides a GitHub Pages download page that can be generated from GitHub Releases.
- The Android build chain (构建链路) is integrated and can produce a multi-ABI (多架构) `universal beta APK` for release distribution (发布分发).
- The latest multi-ABI (多架构) Android beta package has been verified to launch on at least one real device (真机).
- Android prereleases are distributed as Beta APK assets through GitHub Releases and mirrored on the GitHub Pages downloads site.
- Android release automation should load signing material from repository secrets instead of checking keystore files into the repository.

## Repository Layout

- `apps/web`: Web shell and frontend runtime entry.
- `apps/desktop-mobile`: shared frontend shell for Desktop / Android plus the Tauri native shell.
- `apps/downloads`: GitHub Pages download site that surfaces the latest release, the latest prerelease, and older installers.
- `packages/bridge-schema`: shared DTOs (数据传输对象) and bridge types.
- `packages/ts-sdk`: frontend runtime adapter (运行时适配层) plus stub helpers used for tests and fallback scenarios (回退场景).
- `packages/ui`: cross-platform UI components and the Phase 1 workspace screen.
- `crates/core_*`: core domain, events, permission, signature, module registry, and storage contracts.
- `crates/modules/*`: Phase 1 modules for import, quiz generation, and scheduling.
- `fixtures/anki/basic-vocab.apkg`: the smallest import fixture (样例文件).
- `docs/superpowers/specs`: design documents.
- `docs/superpowers/plans`: implementation plans and the Android build report.

## Environment Requirements

- `pnpm@11.7.0`
- A recent Node.js version is recommended; CI currently uses Node.js `24`
- Rust stable toolchain with the `wasm32-unknown-unknown` target
- `wasm-bindgen-cli@0.2.126`
- On macOS, install Homebrew `llvm` if the system `clang` cannot target `wasm32-unknown-unknown`
- Android SDK / NDK / JDK only when you need Android builds

## Quick Start

### 1. Install dependencies

```bash
pnpm install
cargo install wasm-bindgen-cli --version 0.2.126 --locked
```

### 2. Run the baseline checks

```bash
pnpm test
pnpm typecheck
cargo check -p vocaport_native_shell
```

### 3. Start the Web shell

```bash
pnpm --filter @vocaport/web dev
```

### 4. Start the downloads page locally

```bash
pnpm --filter @vocaport/downloads dev
```

### 5. Start the Desktop frontend shell

```bash
pnpm --filter @vocaport/desktop-mobile dev
```

### 6. Start the Tauri Desktop shell

```bash
pnpm --filter @vocaport/desktop-mobile exec tauri dev
```

### 7. Build the Android beta package

First install the Android toolchain (工具链), then run:

```bash
pnpm --filter @vocaport/desktop-mobile run android:init
pnpm --filter @vocaport/desktop-mobile exec tauri android build --apk
```

## Common Commands

| Command | Purpose |
| --- | --- |
| `pnpm test` | Run the TypeScript and Rust test suites |
| `pnpm typecheck` | Run every available TypeScript type check |
| `pnpm build:web` | Build the Web app |
| `pnpm --filter @vocaport/downloads build` | Build the static downloads site |
| `pnpm build:desktop:web` | Build the shared frontend assets for Desktop |
| `cargo test --workspace` | Run the Rust workspace tests |
| `cargo check -p vocaport_native_shell` | Verify the Tauri native shell |

## License

- The repository is currently licensed under `AGPL-3.0-only`; see [`LICENSE`](./LICENSE) for the full text.
- If the project later ships a modified network-facing version, AGPL section 13 requires operators to offer the corresponding source to remote users (远程用户).

## Contributing And CLA

- External contributions must be confirmed under [`CLA.zh.md`](./CLA.zh.md) / [`CLA.en.md`](./CLA.en.md) before merge.
- For now, the confirmation is handled through the pull request template. A dedicated CLA automation flow can be added later if needed.
- The CLA is meant to preserve relicensing flexibility (再授权灵活性) for future dual licensing, commercial licensing, or repository license changes, not to transfer contributor copyright by default.

## Current Limitations

- `packages/ts-sdk` still keeps stub helpers (桩辅助工具), but the main Web / Desktop path already uses the real Rust runtime.
- Android is currently verified on at least one real device, but that evidence should not be generalized to a broad device matrix (机型矩阵) yet.
- Phase 1 does not include iOS, cloud sync, account systems, or runtime third-party plugin execution.
- `apps/desktop-mobile/src-tauri/gen/android` is generated output (生成产物) and should not be treated as the long-term hand-edited source of truth.

## References

- Product / architecture design:
  [`docs/superpowers/specs/2026-06-26-vocaport-design.zh.md`](./docs/superpowers/specs/2026-06-26-vocaport-design.zh.md)
  /
  [`docs/superpowers/specs/2026-06-26-vocaport-design.en.md`](./docs/superpowers/specs/2026-06-26-vocaport-design.en.md)
- Product roadmap:
  [`docs/superpowers/specs/2026-06-26-vocaport-roadmap.zh.md`](./docs/superpowers/specs/2026-06-26-vocaport-roadmap.zh.md)
  /
  [`docs/superpowers/specs/2026-06-26-vocaport-roadmap.en.md`](./docs/superpowers/specs/2026-06-26-vocaport-roadmap.en.md)
- Phase 1 implementation plan:
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-1.zh.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-1.zh.md)
  /
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-1.en.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-1.en.md)
- Phase 2 implementation plan:
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-2.zh.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-2.zh.md)
  /
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-2.en.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-2.en.md)
- Android build and environment report:
  [`docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md)
  /
  [`docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md)
