# VocaPort

- 中文说明：[`README.zh.md`](./README.zh.md)
- English guide: [`README.en.md`](./README.en.md)

## Current Snapshot / 当前快照

- Phase 1 is complete on `main`.
- Web now runs on the Rust/WASM runtime, and Desktop runs on the Rust native runtime.
- Import preview, commit, study start, answer submission, resume, and progress reset are wired end-to-end.
- Interrupted sessions now restore from durable snapshots on both Web and Desktop.
- A dedicated downloads page can be built from GitHub Releases through GitHub Pages.
- GitHub release automation now builds Android and Desktop installers in parallel, with platform-and-architecture names such as `android-universal`, `macos-intel`, `macos-arm64`, `windows-x64`, and `linux-x64`.
- The latest multi-ABI Android beta package has been verified to launch on at least one real device.
- Public release assets are distributed through GitHub Releases and mirrored on the GitHub Pages downloads site after the full asset set finishes uploading.
- Android release automation should load signing material from repository secrets instead of checking keystore files into the repo.

## Quick Start / 快速开始

```bash
pnpm install
cargo install wasm-bindgen-cli --version 0.2.126 --locked
pnpm test
pnpm typecheck
pnpm --filter @vocaport/web dev
pnpm --filter @vocaport/downloads dev
pnpm --filter @vocaport/desktop-mobile exec tauri dev
```

## Release Flow / 发布流程

Use a git tag push as the only supported release entrypoint. Example:

```bash
git tag -a v0.1.0-beta.3 -m "VocaPort v0.1.0-beta.3"
git push origin v0.1.0-beta.3
```

Tags containing `-alpha`, `-beta`, `-rc`, or `-preview` are treated as prereleases automatically. GitHub Actions will create or reuse the matching GitHub Release, build the Android and Desktop assets, upload them, and then refresh the GitHub Pages downloads site.

Local `gh auth login` and `gh release create` are no longer part of the release flow. The workflow uses the repository `GITHUB_TOKEN` inside GitHub Actions to manage the GitHub Release automatically.

## License / 开源协议

- `VocaPort` is currently licensed under `AGPL-3.0-only`.
- See [`LICENSE`](./LICENSE) for the full license text.
- External contributions must also follow [`CLA.zh.md`](./CLA.zh.md) / [`CLA.en.md`](./CLA.en.md).

## References / 参考资料

- Product and architecture design:
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
- Android build report:
  [`docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md)
  /
  [`docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md)
