# VocaPort 第一阶段实现计划

> 说明：本文件是中文伴读版，结构、结论、范围、任务顺序与英文执行版保持一致。代码块、命令、路径与预期输出请直接对照英文版 [2026-06-26-vocaport-phase-1.en.md](/Users/jay/Code/VocaPort/docs/superpowers/plans/2026-06-26-vocaport-phase-1.en.md) 的同名任务执行。

**目标：** 建立 VocaPort 第一阶段的可交付基础：以 Rust 为唯一业务内核，离线优先，支持 Anki `.apkg` 导入、复习历史保留、可重置学习进度，并交付一个面向 Web 和 Desktop 的 `4` 选 `1` 学习闭环，同时保证后续可以平滑扩展到 Android。

**架构：** 使用 monorepo；TypeScript 侧用 `pnpm` 管理前端包，Rust 侧用 workspace 管理核心 crate。所有业务规则都落在 Rust；TypeScript 只负责 UI、交互和桥接编排。平台差异通过 Web / Native adapter 隔离，同时固定好未来插件市场需要的 manifest、permission、signature 和 compatibility 边界。

**技术栈：** `Vite`、`React`、`TypeScript`（`strict: true`）、`Tailwind CSS`、`Vitest`、`Tauri 2`、`Rust`、`serde`、`thiserror`、`rusqlite` 或 `sqlx`、`IndexedDB`、`SQLite`

## 全局约束

- 新项目目录与 `LunaTV` 同级。
- `Rust` 是领域逻辑、导入规范化、出题、调度和能力契约的唯一真相源。
- `TypeScript` 只负责前端 UI、交互和状态编排。
- `Deck` 与 `StudySession` 是一等对象，不能退化成前端临时状态。
- 一期只支持 Anki `.apkg` 导入。
- 导入必须走 `preview -> commit` 两阶段，并支持幂等重导入。
- 一期必须导入 Anki 复习历史，并支持后续重放与重算。
- 一期必须支持重置学习进度，但不能删除已导入历史。
- 一期只上线一个题型模块：`4` 选 `1` 混合选项题。
- 有图时优先图片选项；缺图时退化为释义和例句选项。
- 中断的学习会话必须可恢复，且恢复后题干与选项不能漂移。
- Desktop 和 Android 走 `Tauri 2` 路线。
- Web 端通过 `Rust/WASM` 复用核心逻辑。
- 一期必须为插件市场预留接口，但不得开放运行时第三方插件执行。
- 一期不包含 iOS、云同步和账号系统。

---

本计划保持为一份统一实现计划，因为第一阶段的子系统共享同一套 bridge contract、review event model 和 module registry。过早拆成多份计划会导致核心接口重复、集成成本升高。

### Task 1：初始化 Monorepo 与工作区契约

**目标：**

- 建立前端与 Rust 的顶层工作区
- 固定 `pnpm`、TypeScript、Rust toolchain 和基础脚本
- 先用一个最小的 `bridge-schema` 包证明工作区可运行

**文件：**

- 创建根目录 `.gitignore`、`package.json`、`pnpm-workspace.yaml`、`tsconfig.base.json`、`rust-toolchain.toml`、`Cargo.toml`
- 创建 `packages/bridge-schema` 的 `package.json`、`tsconfig.json`、`src/index.test.ts`、`src/index.ts`

**接口产物：**

- `APP_NAME: "VocaPort"`

**执行步骤：**

1. 先写 `bridge-schema` 的失败测试和根工作区脚手架。
2. 运行包测试，确认在 `APP_NAME` 尚未导出前失败。
3. 仅补最小实现：导出 `APP_NAME`。
4. 再跑 TS 测试和 `typecheck`，确认通过。
5. 提交一次基础工作区 commit。

### Task 2：定义规范化领域对象、事件对象和 Bridge DTO

**目标：**

- 固定所有后续模块共享的核心数据模型
- 明确导入、学习、判题、进度重置的桥接请求/响应形状

**文件：**

- 创建 `crates/core_domain`
- 创建 `crates/core_events`
- 创建 `crates/core_bridge_contract`
- 修改 `packages/bridge-schema/src/index.ts`

**接口产物：**

- `Deck`
- `VocabularyEntry`
- `StudyCard`
- `StudySession`
- `MediaAsset`
- `ReviewEvent`
- `ReviewState`
- `ProgressReset`
- `ImportRecord`
- `ImportPreviewRequest`
- `ImportPreviewResponse`
- `ImportCommitRequest`
- `ImportCommitResponse`
- `StartSessionRequest`
- `ActiveSessionResponse`
- `QuestionOptionDto`
- `QuestionDto`
- `AnswerQuestionRequest`
- `AnswerQuestionResponse`
- `ResetProgressRequest`

**执行步骤：**

1. 先写 Rust 侧 bridge contract 的 round-trip 失败测试。
2. 跑 `cargo test`，确认在 crate 不存在时失败。
3. 分别建立 `core_domain`、`core_events`、`core_bridge_contract` 的最小实现。
4. 同步补齐 TS 侧 `bridge-schema` 类型。
5. 重新跑 Rust 和 TS 检查，确认契约一致。

### Task 3：加入模块注册、权限模型和市场化 Manifest

**目标：**

- 固定未来插件市场最关键的系统边界
- 先用内建模块注册证明 manifest 规则成立

**文件：**

- 创建 `crates/core_permission`
- 创建 `crates/core_signature`
- 创建 `crates/core_module_registry`
- 修改 `packages/bridge-schema/src/index.ts`

**接口产物：**

- `Permission`
- `SignatureEnvelope`
- `ModuleManifest`
- `ModuleRegistry::register_builtin`
- `ModuleRegistry::list_capabilities`

**执行步骤：**

1. 先写“重复 module id 必须失败”的注册测试。
2. 跑测试，确认 crate 尚未存在时失败。
3. 实现权限枚举、签名 envelope、平台目标、manifest 和 registry。
4. 同步补齐 TS 侧 manifest 与 permission 类型。
5. 重新跑 Rust / TS 检查，确认市场化基础契约可工作。

### Task 4：搭建共享 TS SDK 与 Web / Desktop 运行时壳层

**目标：**

- 让 Web 和 Desktop 拥有最小可启动壳
- 固定 bridge runtime adapter 的前端接入方式
- 把 `Tailwind CSS`、`Vite` 和 `Tauri 2` 放进同一骨架

**文件：**

- 创建 `tailwind.config.ts`、`postcss.config.cjs`
- 创建 `packages/ts-sdk`
- 创建 `packages/ui`
- 创建 `apps/web`
- 创建 `apps/desktop-mobile`
- 创建 `apps/desktop-mobile/src-tauri`

**接口产物：**

- `BridgeRuntimeAdapter`
- `createWebRuntime()`
- Native `health_ping()`

**执行步骤：**

1. 先写 Web runtime 的 smoke test。
2. 在无 runtime 实现时运行测试，确认失败。
3. 建立 `ts-sdk`、`ui`、Web 壳、Desktop 壳、Tailwind 与 Tauri 最小启动代码。
4. 补一个统一的 `health_ping()` 命令，证明 Web 与 Native 都有可测试入口。
5. 跑 Web test 与 Rust native test，确认壳层可启动。

### Task 5：引入存储契约与平台适配器

**目标：**

- 固定仓储接口拆分
- 为 Web 和 Native 分别提供最小可测试的存储实现

**文件：**

- 创建 `crates/core_storage_contract`
- 创建 `apps/web/src/storage.ts`
- 创建 `apps/web/src/storage.test.ts`
- 创建 `apps/desktop-mobile/src-tauri/src/storage.rs`
- 修改 `apps/desktop-mobile/src-tauri/Cargo.toml`
- 修改 `apps/desktop-mobile/src-tauri/src/lib.rs`

**接口产物：**

- `DeckRepository`
- `EntryRepository`
- `CardRepository`
- `ReviewEventRepository`
- `ReviewStateRepository`
- `ProgressResetRepository`
- `StudySessionRepository`
- `MediaRepository`
- `SettingsRepository`
- `ImportRecordRepository`

**执行步骤：**

1. 先写 Web 端内存仓储测试和 Native 端 SQLite 持久化测试。
2. 在缺失实现前先跑一次，确认失败。
3. 定义 Rust 侧 storage contract。
4. 实现 Web 内存版仓储和 IndexedDB 适配器雏形。
5. 实现 Native 侧最小 SQLite 仓储验证，并重新通过测试。

### Task 6：实现 APKG 预览导入、提交导入与字段映射建议

**目标：**

- 打通 `.apkg` 的 `preview -> commit` 导入链路
- 给前端一个可确认字段映射、可识别重复导入、可提交导入的结构化结果

**文件：**

- 创建 `scripts/make-basic-apkg-fixture.sh`
- 创建 `fixtures/anki/basic-vocab.apkg`
- 创建 `crates/modules/importer_apkg`

**接口产物：**

- `preview_apkg(file_name: &str, file_bytes: &[u8]) -> ImportPreviewResponse`
- `commit_apkg(request: ImportCommitRequest) -> ImportCommitResponse`

**执行步骤：**

1. 先写 `.apkg` fixture 的 preview / commit 失败测试。
2. 跑脚本生成 fixture，再运行测试，确认在模块不存在时失败。
3. 实现最小 `preview_apkg`：校验文件、计算 hash、返回 deck 名称、计数、字段建议和重复导入提示。
4. 实现最小 `commit_apkg`：接收确认后的字段映射，写入规范化实体并返回导入摘要。
5. 重新跑测试，确认 preview / commit 契约闭环。
6. 提交导入能力。

### Task 7：规范化复习历史、重建状态并支持 Reset 边界

**目标：**

- 把导入历史统一归一化为事件流
- 用最新 reset 边界重建 `ReviewState`
- 为后续 due-first / random 模式提供最小调度入口

**文件：**

- 创建 `crates/modules/scheduler_fsrs`

**接口产物：**

- `rebuild_review_state(card_id: &str, deck_id: &str, events: &[ReviewEvent], latest_reset: Option<&ProgressReset>) -> ReviewState`
- `select_next_card(card_states: &[ReviewState], mode: SessionMode) -> Option<String>`

**执行步骤：**

1. 先写“deck scope reset 生效且 reset 之前事件必须被忽略”的测试。
2. 在调度器模块不存在时先跑失败。
3. 实现 `SessionMode`、事件过滤、deck / card / all 三类 reset 解析、状态重建和最小选卡逻辑。
4. 重新跑测试，确认 reset 边界语义生效。
5. 提交 review replay 与 reset 支持。

### Task 8：加入混合型 4 选 1 出题引擎

**目标：**

- 交付一期唯一题型模块
- 先实现“有图优先，无图退化”的核心规则

**文件：**

- 创建 `crates/modules/quiz_mcq`

**接口产物：**

- `build_question(card: &StudyCard, entry: &VocabularyEntry, distractors: &[VocabularyEntry], media: &[MediaAsset]) -> QuestionDto`

**执行步骤：**

1. 先写“存在图片媒体时，第一优先选项应为 image”的测试。
2. 在题型模块缺失时先跑失败。
3. 实现最小 `build_question`：正确选项优先图像，否则回退释义；不足的干扰项用 fallback 填满到 4 个。
4. 重新跑测试，确认题型规则成立。
5. 提交题目引擎。

### Task 9：把导入、学习、重置和模块设置接到前端壳层

**目标：**

- 让 Web / Desktop 壳层至少把五个核心入口显示出来
- 用 runtime stub 先把导入、恢复会话、开题、重置、能力查询的命令入口串起来

**文件：**

- 创建 `apps/web/src/App.test.tsx`
- 修改 `apps/web/src/App.tsx`
- 修改 `apps/web/src/runtime.ts`
- 修改 `apps/desktop-mobile/src/App.tsx`
- 创建 `apps/desktop-mobile/src-tauri/capabilities/default.json`

**接口产物：**

- 导入入口
- 学习入口
- 恢复当前会话入口
- 进度重置入口
- 模块设置入口

**执行步骤：**

1. 先写 Web 壳层集成测试，要求页面出现“导入词库 / 开始学习 / 恢复会话 / 重置进度 / 模块设置”。
2. 在当前 `App` 尚未具备这些区域时先跑失败。
3. 扩展 Web runtime 的 stub，让它能响应 `module.listCapabilities`、`import.previewApkg`、`import.commitApkg`、`quiz.getActiveSession`、`quiz.startSession`、`review.resetProgress`。
4. 更新 Web / Desktop 壳层页面结构，露出五个核心入口。
5. 重新跑 Web test、`typecheck` 和全量 Rust test，确认前端入口与底层契约对齐。

### Task 10：用 GitHub Actions 固化 Android 壳构建证据，并决策本机工具链清理（先不执行）

**状态：**

- 先不执行
- 当前 `M3` 推进先聚焦已在进行中的 Web / Desktop 壳与 Android 本机验证链路
- 需要切换到 CI 路线时，再恢复执行本任务

**目标：**

- 为 `M3` 的 `Android 壳验证通过` 补一条可复现的 CI 构建证据链
- 把 Android 壳验证从“依赖本机环境”收束为“优先依赖干净 CI 环境”
- 在 CI 路线稳定后，明确本机 Android SDK / NDK / JDK 的保留或清理策略

**文件：**

- 创建 `.github/workflows/android-build.yml`
- 参考 `docs/superpowers/plans/2026-06-26-github-actions-android-report.zh.md`
- 参考 `docs/superpowers/plans/2026-06-26-github-actions-android-report.en.md`

**接口产物：**

- Android GitHub Actions build workflow
- APK / AAB artifact 上传能力
- Android 壳构建证据
- 本机 Android 工具链保留 / 清理决策

**执行步骤：**

1. 新增 Android GitHub Actions workflow，在 `macos-latest` 上安装 `JDK`、Rust Android targets、Android SDK / NDK，并复用仓库已有的 `android:init` 与 `android:build` 脚本。
2. 先在本地确认 `pnpm install --frozen-lockfile`、`pnpm typecheck`、`pnpm test` 仍然通过，避免把明显回归直接推到 CI。
3. 推送分支并触发 workflow，要求 `tauri android init` 与 `tauri android build` 成功执行。
4. 校验 workflow 已上传 APK / AAB artifact，把该构建结果记为 `M3` 的 Android 壳第一层证据。
5. 根据是否还需要本机 Android 调试，二选一执行：保留本机 SDK / NDK / JDK；或按 `2026-06-26-github-actions-android-report` 中的顺序清理本机 Android 工具链。

## 自检清单

### 1. Spec 覆盖检查

- Monorepo、Rust-first core、TS frontend-only、module registry、permission model 和 marketplace boundary 覆盖在 Task 1-4。
- `.apkg` 的 preview / commit、字段映射、重复导入策略与导入报告覆盖在 Task 6。
- 复习历史导入与进度重置覆盖在 Task 7。
- `4` 选 `1` 混合题型覆盖在 Task 8。
- Web / Desktop 壳、恢复当前会话入口与 Android-ready 路线覆盖在 Task 4 和 Task 9。
- Android 壳的 CI 构建证据与本机工具链清理决策覆盖在 Task 10。

### 2. 占位与模糊项检查

- 任务里没有未解决的占位标记。
- 所有命令都指向具体文件、包或模块。

### 3. 类型一致性检查

- `QuestionDto`、`QuestionOptionDto`、`AnswerQuestionResponse` 在 Task 2 定义，并在 Task 4、8、9 使用。
- `ReviewEvent`、`ReviewState`、`ProgressReset`、`StudySession` 在 Task 2 定义，并在 Task 5、7、9 使用。
- `ModuleManifest` 与 `Permission` 在 Task 3 定义，并在 Task 9 使用。

## 执行交接

实现计划已保存。执行时有两种方式：

1. **Subagent-Driven（推荐）**
   - 每个任务单独派发一个执行代理
   - 任务间做 review
   - 节奏更稳，适合这类多模块工程

2. **Inline Execution**
   - 在同一会话里顺序完成任务
   - 适合集中推进，但中途需要更注意回归

如果后续开始落代码，优先选 `Subagent-Driven`。
