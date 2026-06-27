# VocaPort

VocaPort 是一个 Rust 优先、离线优先的词汇学习应用仓库。当前 `main` 分支已经完成第一阶段交付：支持 Anki `.apkg` 导入、保留复习历史、支持重置学习进度，并交付基于 Rust 业务内核的 Web / Desktop 学习闭环，同时为 Android 延展保留架构空间。

## 当前状态

- 第一阶段已完成并已合入 `main`。
- Web 壳层已接入 Rust/WASM 运行时，可直接运行。
- Desktop Tauri 壳层已接入 Rust Native 运行时，可在本机启动。
- Web / Desktop 都支持导入、确认导入、开始学习、恢复当前会话、答题、重置进度。
- 中断会话现在可以通过快照持久化恢复；Web 使用浏览器本地存储，Desktop 使用 SQLite。
- `apps/downloads` 已提供 GitHub Pages 下载页，可从 GitHub Releases 生成公开下载列表。
- GitHub Release 自动化现已并行构建 Android 与 Desktop 安装包，命名会显式带上平台与架构，例如 `android-universal`、`macos-intel`、`macos-arm64`、`windows-x64`、`linux-x64`。
- 最新多架构 Android Beta 包已经在至少一台真机上验证可正常启动。
- 公开发布产物会先完整上传到 GitHub Releases，再统一同步到 GitHub Pages 下载页。
- Android 发布自动化应从仓库 secrets 读取签名材料，而不是把 keystore 文件直接放进仓库。

## 仓库结构

- `apps/web`：Web 端壳层与前端运行时入口。
- `apps/desktop-mobile`：Desktop / Android 共用前端壳层与 Tauri Native 壳。
- `apps/downloads`：GitHub Pages 下载页，展示最新 release、最新 prerelease 与历史安装包列表。
- `packages/bridge-schema`：前后端共享 DTO 与桥接类型。
- `packages/ts-sdk`：前端运行时适配层，也保留测试 / fallback 用的 stub helper。
- `packages/ui`：跨端 UI 组件与一期工作区界面。
- `crates/core_*`：核心领域、事件、权限、签名、模块注册与存储契约。
- `crates/modules/*`：导入、题型、调度等一期模块。
- `fixtures/anki/basic-vocab.apkg`：最小导入样例。
- `docs/superpowers/specs`：设计文档。
- `docs/superpowers/plans`：实现计划与 Android 构建报告。

## 环境要求

- `pnpm@11.7.0`
- Node.js 建议使用与 CI 接近的较新版本；当前 CI 使用 Node.js `24`
- Rust stable toolchain（需包含 `wasm32-unknown-unknown` target）
- `wasm-bindgen-cli@0.2.126`
- 在 macOS 上构建 Web/WASM 时，如果系统 `clang` 不支持 `wasm32-unknown-unknown`，需要安装 Homebrew `llvm`
- 仅在需要构建 Android 时安装 Android SDK / NDK / JDK

## 快速开始

### 1. 安装依赖

```bash
pnpm install
cargo install wasm-bindgen-cli --version 0.2.126 --locked
```

### 2. 跑通基础校验

```bash
pnpm test
pnpm typecheck
cargo check -p vocaport_native_shell
```

### 3. 启动 Web 壳层

```bash
pnpm --filter @vocaport/web dev
```

### 4. 启动下载页

```bash
pnpm --filter @vocaport/downloads dev
```

### 5. 启动 Desktop 前端壳层

```bash
pnpm --filter @vocaport/desktop-mobile dev
```

### 6. 启动 Tauri Desktop 壳层

```bash
pnpm --filter @vocaport/desktop-mobile exec tauri dev
```

### 7. 构建 Android Beta 包

先确保本机已经安装 Android 工具链，再执行：

```bash
pnpm --filter @vocaport/desktop-mobile run android:init
pnpm --filter @vocaport/desktop-mobile exec tauri android build --apk
```

## 发布流程

以后统一使用“推送 git tag”作为发布入口。例如：

```bash
git tag -a v0.1.0-beta.3 -m "VocaPort v0.1.0-beta.3"
git push origin v0.1.0-beta.3
```

包含 `-alpha`、`-beta`、`-rc` 或 `-preview` 的 tag 会自动识别为 prerelease。GitHub Actions 会自动创建或复用对应的 GitHub Release，构建 Android 与 Desktop 产物，上传全部安装包，再刷新 GitHub Pages 下载站。

本地不再需要执行 `gh auth login` 或 `gh release create`。发布流程统一由 GitHub Actions 内置的仓库 `GITHUB_TOKEN` 自动管理 GitHub Release。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm test` | 运行 TS 与 Rust 测试 |
| `pnpm typecheck` | 运行所有可用的 TypeScript 类型检查 |
| `pnpm build:web` | 构建 Web 端 |
| `pnpm --filter @vocaport/downloads build` | 构建下载页静态站点 |
| `pnpm build:desktop:web` | 构建 Desktop 共用前端资源 |
| `cargo test --workspace` | 运行 Rust workspace 测试 |
| `cargo check -p vocaport_native_shell` | 校验 Tauri Native 壳 |

## 开源协议

- 当前仓库按 `AGPL-3.0-only` 发布，完整协议见 [`LICENSE`](./LICENSE)。
- 如果未来部署了带 AGPL 覆盖修改的联网版本，需要按 AGPL 第 13 节向远程用户提供对应源码入口。

## 贡献与 CLA

- 外部贡献在合并前必须确认 [`CLA.zh.md`](./CLA.zh.md) / [`CLA.en.md`](./CLA.en.md)。
- 当前先通过 pull request 模板中的勾选项完成确认；后续如果需要，可以再接入自动化 CLA 流程。
- `CLA` 的目标不是转走贡献者版权，而是为项目保留后续双授权、商用授权或协议调整的再授权空间。

## 当前限制

- `packages/ts-sdk` 里仍保留 stub helper，但主 Web / Desktop 路径已经走真实 Rust runtime。
- Android 当前只确认“至少一台真机可正常启动”，还不能外推为全部机型都已验证通过。
- 一期不包含 iOS、云同步、账号系统和运行时第三方插件执行。
- `apps/desktop-mobile/src-tauri/gen/android` 是生成产物目录，不应被当作长期维护的手写源码入口。

## 参考文档

- 产品 / 架构设计：
  [`docs/superpowers/specs/2026-06-26-vocaport-design.zh.md`](./docs/superpowers/specs/2026-06-26-vocaport-design.zh.md)
  /
  [`docs/superpowers/specs/2026-06-26-vocaport-design.en.md`](./docs/superpowers/specs/2026-06-26-vocaport-design.en.md)
- 总路线图：
  [`docs/superpowers/specs/2026-06-26-vocaport-roadmap.zh.md`](./docs/superpowers/specs/2026-06-26-vocaport-roadmap.zh.md)
  /
  [`docs/superpowers/specs/2026-06-26-vocaport-roadmap.en.md`](./docs/superpowers/specs/2026-06-26-vocaport-roadmap.en.md)
- 一期实现计划：
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-1.zh.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-1.zh.md)
  /
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-1.en.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-1.en.md)
- 二期实现计划：
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-2.zh.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-2.zh.md)
  /
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-2.en.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-2.en.md)
- Android 构建与环境报告：
  [`docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md)
  /
  [`docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md)
