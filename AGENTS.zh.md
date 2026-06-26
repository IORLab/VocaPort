# VocaPort 协作约定

本文件是仓库内代理与自动化工具的项目级协作说明，重点只放“这个仓库特有的事实与约束”，不重复通用模型提示词。

## 项目定位

- 当前仓库目标是交付 VocaPort 一期基础骨架。
- 核心方向是 Rust 优先、离线优先、Anki `.apkg` 导入优先。
- 当前 `main` 已合入一期基础工作：Web 壳、Desktop 壳、Rust workspace、桥接契约、模块注册、导入 / 题型 / 调度模块基础。
- Android 构建链路已接入，最新多架构安装包已经在至少一台真机上验证可正常启动。

## 不可破坏的架构约束

- `Rust` 是业务规则、导入规范化、出题、调度、能力契约的唯一真相源。
- `TypeScript` 只负责 UI、交互、运行时编排和 bridge 调用，不要把领域逻辑搬到前端。
- 任何 bridge DTO、命令名或响应字段变更，都必须同步更新：
  `crates/core_*` / `crates/modules/*`、`packages/bridge-schema`、`packages/ts-sdk`、相关测试。
- `packages/ts-sdk` 当前仍使用 stub runtime；如果接入真实 Rust runtime，必须明确替换 stub，不要在 stub 上继续堆业务复杂度。
- `apps/desktop-mobile/src-tauri/gen/android` 是生成目录；优先通过 `android:init` 或 Tauri 生成流程再生，不要长期手改生成产物。

## 工作区地图

- `apps/web`：Web 壳层。
- `apps/desktop-mobile`：Desktop / Android 共用前端壳层。
- `apps/desktop-mobile/src-tauri`：Tauri Native 壳。
- `packages/bridge-schema`：跨语言共享契约。
- `packages/ts-sdk`：前端运行时适配层。
- `packages/ui`：跨端 UI 组件。
- `crates/core_*`：核心领域与系统边界。
- `crates/modules/*`：一期模块实现。
- `fixtures/anki/basic-vocab.apkg`：最小导入样例。
- `docs/superpowers/specs`：设计文档。
- `docs/superpowers/plans`：实现计划与 Android 相关报告。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm install` | 安装前端依赖 |
| `pnpm test` | 运行 TS + Rust 测试 |
| `pnpm typecheck` | 运行 TypeScript 类型检查 |
| `pnpm --filter @vocaport/web dev` | 启动 Web 壳 |
| `pnpm --filter @vocaport/desktop-mobile exec tauri dev` | 启动 Tauri Desktop 壳 |
| `cargo test --workspace` | 运行 Rust workspace 测试 |
| `cargo check -p vocaport_native_shell` | 校验 Native 壳 |
| `pnpm --filter @vocaport/desktop-mobile exec tauri android build --debug --apk` | 构建 Android 调试包 |

## 验证基线

- 只改文档时，至少执行 `git diff --stat` 并人工复核链接、命令和状态表述。
- 改动 TypeScript / React / UI 时，执行 `pnpm typecheck` 和 `pnpm test`。
- 改动 Rust crate 时，执行 `cargo test --workspace`。
- 改动 Tauri Native 壳时，至少执行 `cargo check -p vocaport_native_shell`。
- 改动 Android 壳或打包流程时，在工具链完整的前提下执行 Android 构建命令。

## 已知风险

- Android 现阶段只验证了“至少一台真机可正常启动”；如果后续再出现启动回归，先拿新的 `adb logcat`，再判断根因和修复是否成立。
- 当前前端导入 / 学习流程主要是 stub 演示，不要把现状误写成“Rust 端到端链路已经完整打通”。
- Android `build succeeds` 只说明能产出构建物，不说明真机可用。

## 文档规则

- 正式文档默认补齐 `*.zh.md` 与 `*.en.md`。
- `README.md`、`AGENTS.md` 这类固定入口文件保留为兼容入口，并指向中英文正文。
- 设计与计划历史统一放在 `docs/superpowers/specs` 与 `docs/superpowers/plans`。

## 推荐阅读

- [`README.zh.md`](./README.zh.md)
- [`docs/superpowers/specs/2026-06-26-vocaport-design.zh.md`](./docs/superpowers/specs/2026-06-26-vocaport-design.zh.md)
- [`docs/superpowers/plans/2026-06-26-vocaport-phase-1.zh.md`](./docs/superpowers/plans/2026-06-26-vocaport-phase-1.zh.md)
- [`docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md`](./docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md)
