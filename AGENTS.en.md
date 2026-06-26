# VocaPort Agent Guide

This file is the project-level guide for agents (代理) and automation (自动化) inside this repository. It only captures repository-specific facts and constraints (约束), and it does not repeat generic model instructions.

## Project Scope

- The current repository goal is to deliver the Phase 1 foundation (一期基础骨架) of VocaPort.
- The core direction is Rust-first (Rust 优先), offline-first (离线优先), and Anki `.apkg` import first.
- The current `main` branch already contains the Phase 1 baseline (基础工作): Web shell, Desktop shell, Rust workspace, bridge contracts, module registry, and the first import / quiz / scheduler foundations.
- The Android build chain (构建链路) is integrated, and the latest multi-ABI package has been verified to launch on at least one real device.

## Non-Negotiable Architecture Rules

- `Rust` is the single source of truth (唯一真相源) for business rules, import normalization, quiz generation, scheduling, and capability contracts.
- `TypeScript` is limited to UI, interaction, runtime orchestration (运行时编排), and bridge calls; do not move domain logic into the frontend.
- Any bridge DTO, command name, or response field change must be updated together in:
  `crates/core_*` / `crates/modules/*`, `packages/bridge-schema`, `packages/ts-sdk`, and the related tests.
- `packages/ts-sdk` still uses a stub runtime (桩运行时). If you wire in the real Rust runtime, replace the stub explicitly instead of piling more business complexity onto it.
- `apps/desktop-mobile/src-tauri/gen/android` is a generated directory (生成目录). Prefer regeneration through `android:init` or the Tauri flow instead of maintaining generated files by hand.

## Workspace Map

- `apps/web`: Web shell.
- `apps/desktop-mobile`: shared frontend shell for Desktop / Android.
- `apps/desktop-mobile/src-tauri`: Tauri native shell.
- `packages/bridge-schema`: shared cross-language contracts.
- `packages/ts-sdk`: frontend runtime adapter layer.
- `packages/ui`: cross-platform UI components.
- `crates/core_*`: core domain and system boundaries.
- `crates/modules/*`: Phase 1 module implementations.
- `fixtures/anki/basic-vocab.apkg`: the smallest import fixture.
- `docs/superpowers/specs`: design documents.
- `docs/superpowers/plans`: implementation plans and Android reports.

## Common Commands

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install frontend dependencies |
| `pnpm test` | Run the TypeScript and Rust tests |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm --filter @vocaport/web dev` | Start the Web shell |
| `pnpm --filter @vocaport/desktop-mobile exec tauri dev` | Start the Tauri Desktop shell |
| `cargo test --workspace` | Run the Rust workspace tests |
| `cargo check -p vocaport_native_shell` | Verify the native shell |
| `pnpm --filter @vocaport/desktop-mobile exec tauri android build --debug --apk` | Build the Android debug package |

## Verification Baseline

- For documentation-only changes, at minimum run `git diff --stat` and manually review links, commands, and status wording.
- For TypeScript / React / UI changes, run `pnpm typecheck` and `pnpm test`.
- For Rust crate changes, run `cargo test --workspace`.
- For Tauri native shell changes, at minimum run `cargo check -p vocaport_native_shell`.
- For Android shell or packaging changes, run the Android build command when the toolchain (工具链) is available.

## Known Risks

- Android is currently validated on at least one real device. If startup regresses again, collect fresh `adb logcat` evidence before claiming a root cause or fix.
- The current frontend import / study flow is mostly a stub demo (演示), so do not describe the repository as if the Rust end-to-end pipeline were already fully connected.
- `build succeeds` for Android only means the shell can produce artifacts (构建产物); it does not prove that the app is usable on real devices.

## Documentation Rules

- Formal docs should normally be added in both `*.zh.md` and `*.en.md`.
- Fixed entry files such as `README.md` and `AGENTS.md` stay as compatibility entry points and should link to the Chinese and English bodies.
- Design and planning history belongs in `docs/superpowers/specs` and `docs/superpowers/plans`.

## Recommended Reading

- [`README.en.md`](./README.en.md)
- [`docs/superpowers/specs/2026-06-26-vocaport-design.en.md`](./docs/superpowers/specs/2026-06-26-vocaport-design.en.md)
- [`docs/superpowers/plans/2026-06-26-vocaport-phase-1.en.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-1.en.md)
- [`docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md)
