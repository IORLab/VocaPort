# VocaPort

VocaPort 是一个 Rust 优先、离线优先的词汇学习应用仓库。当前 `main` 分支已经合入第一阶段基础骨架：目标是打通 Anki `.apkg` 导入、保留复习历史、支持重置学习进度，并交付可运行的 Web / Desktop 壳层，同时为 Android 延展保留架构空间。

## 当前状态

- 一期基础骨架已经合入 `main`。
- Web 壳层可直接运行。
- Desktop Tauri 壳层可在本机启动。
- `apps/downloads` 已提供 GitHub Pages 下载页，可从 GitHub Releases 生成公开下载列表。
- Android 构建链路已经接入，并能产出多架构 `universal debug APK`。
- 最新多架构 Android 包已经在至少一台真机上验证可正常启动。
- 导入 / 学习流程目前主要由 `packages/ts-sdk` 中的 stub runtime 演示，尚未把完整 Rust 业务链路真正接到前端运行时。

## 仓库结构

- `apps/web`：Web 端壳层与前端运行时入口。
- `apps/desktop-mobile`：Desktop / Android 共用前端壳层与 Tauri Native 壳。
- `apps/downloads`：GitHub Pages 下载页，展示最新 release、最新 prerelease 与历史安装包列表。
- `packages/bridge-schema`：前后端共享 DTO 与桥接类型。
- `packages/ts-sdk`：前端运行时适配层；当前包含 stub runtime。
- `packages/ui`：跨端 UI 组件与一期工作区界面。
- `crates/core_*`：核心领域、事件、权限、签名、模块注册与存储契约。
- `crates/modules/*`：导入、题型、调度等一期模块。
- `fixtures/anki/basic-vocab.apkg`：最小导入样例。
- `docs/superpowers/specs`：设计文档。
- `docs/superpowers/plans`：实现计划与 Android 构建报告。

## 环境要求

- `pnpm@11.7.0`
- Node.js 建议使用与 CI 接近的较新版本；当前 CI 使用 Node.js `24`
- Rust stable toolchain
- 仅在需要构建 Android 时安装 Android SDK / NDK / JDK

## 快速开始

### 1. 安装依赖

```bash
pnpm install
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

### 7. 构建 Android 调试包

先确保本机已经安装 Android 工具链，再执行：

```bash
pnpm --filter @vocaport/desktop-mobile run android:init
pnpm --filter @vocaport/desktop-mobile exec tauri android build --debug --apk
```

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

- `packages/ts-sdk` 里的学习和导入流程仍是 stub 行为，不能视为真实端到端业务已完成。
- Android 当前只确认“至少一台真机可正常启动”，还不能外推为全部机型都已验证通过。
- 一期不包含 iOS、云同步、账号系统和运行时第三方插件执行。
- `apps/desktop-mobile/src-tauri/gen/android` 是生成产物目录，不应被当作长期维护的手写源码入口。

## 参考文档

- 产品 / 架构设计：
  [`docs/superpowers/specs/2026-06-26-vocaport-design.zh.md`](./docs/superpowers/specs/2026-06-26-vocaport-design.zh.md)
  /
  [`docs/superpowers/specs/2026-06-26-vocaport-design.en.md`](./docs/superpowers/specs/2026-06-26-vocaport-design.en.md)
- 一期实现计划：
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-1.zh.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-1.zh.md)
  /
  [`docs/superpowers/plans/2026-06-26-vocaport-phase-1.en.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-1.en.md)
- Android 构建与环境报告：
  [`docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md)
  /
  [`docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md)
