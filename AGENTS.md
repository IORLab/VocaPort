# VocaPort Agent Guide

- 中文协作说明：[`AGENTS.zh.md`](./AGENTS.zh.md)
- English guide: [`AGENTS.en.md`](./AGENTS.en.md)

## Critical Rules / 关键规则

- Keep business logic in Rust crates; keep TypeScript limited to UI, interaction, and bridge orchestration.
- Keep bridge DTOs and commands synchronized across Rust contracts, `packages/bridge-schema`, `packages/ts-sdk`, and tests.
- Treat `apps/desktop-mobile/src-tauri/gen/android` as generated output, not hand-maintained source.
- If Android startup regresses again, collect fresh `adb logcat` evidence before claiming a root cause or fix.
- Keep formal docs bilingual with `*.zh.md` and `*.en.md`; use unsuffixed files as entry points when needed.

## Baseline Verification / 基线验证

```bash
pnpm test
pnpm typecheck
cargo test --workspace
cargo check -p vocaport_native_shell
```
