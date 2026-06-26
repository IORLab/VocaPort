# VocaPort

- 中文说明：[`README.zh.md`](./README.zh.md)
- English guide: [`README.en.md`](./README.en.md)

## Current Snapshot / 当前快照

- Phase 1 foundation has been merged into `main`.
- Web and Desktop shells are runnable.
- A dedicated downloads page can be built from GitHub Releases through GitHub Pages.
- The Android build chain can produce a universal debug APK.
- The latest multi-ABI Android package has been verified to launch on at least one real device.
- The import / study flow is still backed by the stub runtime in `packages/ts-sdk`, so the end-to-end Rust bridge is not fully wired yet.

## Quick Start / 快速开始

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm --filter @vocaport/web dev
pnpm --filter @vocaport/downloads dev
pnpm --filter @vocaport/desktop-mobile exec tauri dev
```

## License / 开源协议

- `VocaPort` is currently licensed under `AGPL-3.0-only`.
- See [`LICENSE`](./LICENSE) for the full license text.
- External contributions must also follow [`CLA.zh.md`](./CLA.zh.md) / [`CLA.en.md`](./CLA.en.md).

## References / 参考资料

- Product and architecture design:
  [`docs/superpowers/specs/2026-06-26-vocaport-design.zh.md`](./docs/superpowers/specs/2026-06-26-vocaport-design.zh.md)
  /
  [`docs/superpowers/specs/2026-06-26-vocaport-design.en.md`](./docs/superpowers/specs/2026-06-26-vocaport-design.en.md)
- Phase 1 implementation plan:
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-1.zh.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-1.zh.md)
  /
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-1.en.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-1.en.md)
- Android build report:
  [`docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md)
  /
  [`docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md)
