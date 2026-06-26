# VocaPort

VocaPort is a Rust-first (Rust 优先), offline-first (离线优先) vocabulary learning app repository. The current `main` branch already contains the Phase 1 foundation (一期基础骨架): the goal is to support Anki `.apkg` import, preserve (保留) review history, reset study progress, and ship runnable Web / Desktop shells while keeping the architecture ready for Android expansion.

## Current Status

- The Phase 1 foundation (一期基础骨架) has been merged into `main`.
- The Web shell is runnable.
- The Desktop Tauri shell is runnable locally.
- `apps/downloads` now provides a GitHub Pages download page that can be generated from GitHub Releases.
- The Android build chain (构建链路) is integrated and can produce a multi-ABI (多架构) `universal debug APK`.
- The latest multi-ABI (多架构) Android package has been verified to launch on at least one real device (真机).
- The import / study flow is still demonstrated by the stub runtime (桩运行时) in `packages/ts-sdk`; the full Rust business pipeline (业务链路) is not wired into the frontend runtime yet.

## Repository Layout

- `apps/web`: Web shell and frontend runtime entry.
- `apps/desktop-mobile`: shared frontend shell for Desktop / Android plus the Tauri native shell.
- `apps/downloads`: GitHub Pages download site that surfaces the latest release, the latest prerelease, and older installers.
- `packages/bridge-schema`: shared DTOs (数据传输对象) and bridge types.
- `packages/ts-sdk`: frontend runtime adapter (运行时适配层); currently includes the stub runtime.
- `packages/ui`: cross-platform UI components and the Phase 1 workspace screen.
- `crates/core_*`: core domain, events, permission, signature, module registry, and storage contracts.
- `crates/modules/*`: Phase 1 modules for import, quiz generation, and scheduling.
- `fixtures/anki/basic-vocab.apkg`: the smallest import fixture (样例文件).
- `docs/superpowers/specs`: design documents.
- `docs/superpowers/plans`: implementation plans and the Android build report.

## Environment Requirements

- `pnpm@11.7.0`
- A recent Node.js version is recommended; CI currently uses Node.js `24`
- Rust stable toolchain
- Android SDK / NDK / JDK only when you need Android builds

## Quick Start

### 1. Install dependencies

```bash
pnpm install
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

### 7. Build the Android debug package

First install the Android toolchain (工具链), then run:

```bash
pnpm --filter @vocaport/desktop-mobile run android:init
pnpm --filter @vocaport/desktop-mobile exec tauri android build --debug --apk
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

## Current Limitations

- The import and study flow inside `packages/ts-sdk` is still stubbed (桩实现) and should not be treated as a completed end-to-end workflow.
- Android is currently verified on at least one real device, but that evidence should not be generalized to a broad device matrix (机型矩阵) yet.
- While this repository stays private, the GitHub Pages workflow for `apps/downloads` is skipped automatically because the current plan does not support Pages for it.
- Phase 1 does not include iOS, cloud sync, account systems, or runtime third-party plugin execution.
- `apps/desktop-mobile/src-tauri/gen/android` is generated output (生成产物) and should not be treated as the long-term hand-edited source of truth.

## References

- Product / architecture design:
  [`docs/superpowers/specs/2026-06-26-vocaport-design.zh.md`](./docs/superpowers/specs/2026-06-26-vocaport-design.zh.md)
  /
  [`docs/superpowers/specs/2026-06-26-vocaport-design.en.md`](./docs/superpowers/specs/2026-06-26-vocaport-design.en.md)
- Phase 1 implementation plan:
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-1.zh.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-1.zh.md)
  /
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-1.en.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-1.en.md)
- Android build and environment report:
  [`docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md)
  /
  [`docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md)
