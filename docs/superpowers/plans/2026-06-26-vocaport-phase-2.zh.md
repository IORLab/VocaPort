# VocaPort 第二阶段实现计划

> 说明：本文件是中文伴读版，结构、结论、范围、任务顺序与英文执行版保持一致。代码块、命令、路径与预期输出请直接对照英文版 [2026-06-26-vocaport-phase-2.en.md](/Users/jay/Code/VocaPort/docs/superpowers/plans/2026-06-26-vocaport-phase-2.en.md) 的同名任务执行。

**目标：** 交付 VocaPort 的第一版可用 Beta：以 Android 为第一优先级，但继续复用同一套 Rust 核心和共享 UI，让用户可以安装 Beta、导入真实文本型 Anki `.apkg`、选择当前词库、确认字段映射、恢复或重置学习进度，并完成完整学习闭环。

**架构：** 保持 `Rust` 为唯一业务内核，把 Phase 2 的新增复杂度集中在三层：一是 Rust 服务补齐词库库状态和导入决策模型；二是 Web / Tauri runtime 把新命令继续透传到同一核心；三是共享 UI 从“一页式演示流”升级为“面向手机的多区块工作区”。Android 发布链路只做 Beta 语义升级，不另起第二套产品实现。

**技术栈：** `Vite`、`React`、`TypeScript`（`strict: true`）、`Tailwind CSS`、`Vitest`、`Tauri 2`、`Rust`、`serde`、`thiserror`、`rusqlite`、`IndexedDB`、`SQLite`、`GitHub Actions`

## 全局约束

- `Rust` 继续是词库状态、导入决策、学习状态和快照恢复的唯一真相源。
- `TypeScript` 继续只负责 UI、运行时桥接和用户交互编排。
- Phase 2 仍然是 `offline-first`、`local-first`。
- Phase 2 不引入 iOS、云同步、账号系统和运行时第三方插件执行。
- Phase 2 先以文本型词库为官方 Beta 路径；图片或音频播放不作为这一阶段的完成条件。
- Web 和 Desktop 壳层继续保持很薄，共享 UI 继续集中在 `packages/ui`。
- 下载页必须能准确表达 Beta 语义，避免继续把工程验证产物伪装成正式发布物。
- 每个任务都必须有单独的验证命令和单独的提交点。

---

本计划保持为一份统一实现计划，因为词库库状态、导入字段确认、运行时桥接、共享 UI 和 Beta 发布语义都围绕同一组 bridge contract 演进。现在拆成多份计划只会让接口和验收口径重复。

### Task 1：补齐词库库状态与“当前词库”桥接契约

**目标：**

- 让 Rust 服务真正知道“有哪些词库”和“当前词库是谁”
- 让前端不再依赖“刚导入的那个词库”这种脆弱隐式状态

**文件：**

- 修改 `packages/bridge-schema/src/index.ts`
- 修改 `packages/bridge-schema/src/index.test.ts`
- 修改 `crates/core_bridge_contract/src/lib.rs`
- 修改 `crates/core_bridge_contract/tests/session_contract.rs`
- 修改 `crates/core_app_service/src/lib.rs`
- 新建 `crates/core_app_service/tests/library_flow.rs`

**接口产物：**

- `DeckSummaryDto`
- `ListDecksResponse`
- `SelectDeckRequest`
- `SelectDeckResponse`
- `PhaseOneService::list_decks`
- `PhaseOneService::select_deck`

**执行步骤：**

1. 先写 bridge contract 和 Rust 服务的失败测试，固定“词库列表 + 当前词库”行为。
2. 跑 `pnpm --filter @vocaport/bridge-schema test` 与 `cargo test -p core_app_service --test library_flow`，确认在接口未补齐前失败。
3. 在 Rust 服务快照里持久化 `current_deck_id`，并补齐 `list_decks` / `select_deck`。
4. 重新跑 bridge 与服务测试，确认当前词库状态能跨快照恢复。
5. 提交一次独立 commit。

### Task 2：补齐导入字段确认所需的预览数据

**目标：**

- 不再强迫 UI 只能接受自动猜测的字段映射
- 让用户在导入前显式确认或调整字段选择

**文件：**

- 修改 `packages/bridge-schema/src/index.ts`
- 修改 `crates/core_bridge_contract/src/lib.rs`
- 修改 `crates/modules/importer_apkg/src/lib.rs`
- 修改 `crates/modules/importer_apkg/tests/preview_import.rs`

**接口产物：**

- `ImportPreviewResponse.availableFieldNames`

**执行步骤：**

1. 先写 importer 失败测试，固定“预览返回所有可选字段名”的契约。
2. 跑 `cargo test -p importer_apkg preview_lists_all_available_fields_for_manual_mapping`，确认失败。
3. 在 importer 预览结果里加入稳定排序后的字段名列表，并同步到 bridge DTO。
4. 重跑 importer、bridge 和 `bridge-schema` 检查，确认字段确认 UI 所需数据已经具备。
5. 提交一次独立 commit。

### Task 3：把新词库命令贯通到 Web / Native runtime

**目标：**

- 让 `library.listDecks` / `library.selectDeck` 在 Web、WASM、Desktop、Android 上都走同一套 Rust 核心
- 保证当前词库选择能像会话快照一样被恢复

**文件：**

- 修改 `packages/ts-sdk/src/index.ts`
- 修改 `apps/web/src/runtime.ts`
- 修改 `apps/web/src/runtime.test.ts`
- 修改 `crates/core_web_wasm/src/lib.rs`
- 修改 `apps/desktop-mobile/src/runtime.ts`
- 修改 `apps/desktop-mobile/src-tauri/src/lib.rs`

**接口产物：**

- 运行时命令 `library.listDecks`
- 运行时命令 `library.selectDeck`

**执行步骤：**

1. 先写 Web runtime 失败测试，固定“导入后能列出词库，并且当前词库选择能跨 runtime 重建恢复”。
2. 跑 `pnpm --filter @vocaport/web test`，确认失败。
3. 给 stub runtime、WASM runtime、Tauri runtime 和 native command map 同步加上两个新命令。
4. 重跑 `pnpm --filter @vocaport/web test` 和 `cargo check -p vocaport_native_shell`，确认桥接路径全通。
5. 提交一次独立 commit。

### Task 4：把共享工作区从演示页升级为移动端优先 Beta 工作区

**目标：**

- 从“一页式演示流”升级到真正能持续使用的导入 / 词库 / 学习工作区
- 让手机端可清楚区分空态、导入态、已导入态、学习态和恢复态

**文件：**

- 修改 `packages/ui/src/index.tsx`
- 新建 `packages/ui/src/phase-one-workspace.tsx`
- 新建 `packages/ui/src/workspace-tabs.tsx`
- 新建 `packages/ui/src/import-panel.tsx`
- 新建 `packages/ui/src/library-panel.tsx`
- 新建 `packages/ui/src/study-panel.tsx`
- 修改 `apps/web/src/App.interaction.test.tsx`
- 修改 `apps/desktop-mobile/src/App.test.tsx`

**接口产物：**

- `PhaseOneWorkspace` 的多区块移动端导航
- 导入字段确认表单
- 词库列表与“设为当前词库”动作

**执行步骤：**

1. 先扩展 Web 交互测试，固定完整 Beta 主线：预览导入、调整字段、确认导入、切换到词库、设为当前词库、开始学习、恢复或重置。
2. 跑 `pnpm --filter @vocaport/web test` 与 `pnpm --filter @vocaport/desktop-mobile test`，确认失败。
3. 把共享 UI 拆成更小的 panel 文件，在 `packages/ui` 内补齐导入、词库、学习三个区块及其状态管理。
4. 重跑 Web / Desktop 测试与 `pnpm typecheck`，确认工作区结构升级后两个壳层仍然只负责最薄接线。
5. 提交一次独立 commit。

### Task 5：把发布链路和下载页口径升级为 Beta 语义

**目标：**

- 不再把 Android 下载资产继续表述成“普通 APK”
- 让发布工作流、下载页和 README 对同一件事使用同一套 Beta 口径

**文件：**

- 修改 `.github/workflows/publish-android-release.yml`
- 修改 `apps/downloads/src/catalog.ts`
- 修改 `apps/downloads/src/catalog.test.ts`
- 修改 `README.md`
- 修改 `README.zh.md`
- 修改 `README.en.md`

**接口产物：**

- `Download Android Beta APK` / `下载 Android Beta APK`
- 统一的 Beta APK 产物命名约定

**执行步骤：**

1. 先写下载页失败测试，固定“带 beta 语义的 Android 资产必须显示为 Beta APK”。
2. 跑 `pnpm --filter @vocaport/downloads test`，确认失败。
3. 更新下载页标签推断逻辑、Android 发布工作流中的资产命名，以及 README 里的 Beta 发布说明。
4. 重跑 `pnpm --filter @vocaport/downloads test`、`pnpm --filter @vocaport/downloads build` 和根级 `pnpm test`，确认产品口径与自动化口径一致。
5. 提交一次独立 commit。

## 执行完成的统一验证

- `pnpm typecheck`
- `pnpm test`
- `pnpm --filter @vocaport/web build`
- `pnpm --filter @vocaport/downloads build`
- `cargo check -p vocaport_native_shell`

## 执行移交

计划完成并保存到 `docs/superpowers/plans/2026-06-26-vocaport-phase-2.md`。后续执行建议二选一：

1. `Subagent-Driven`：每个 Task 单独派发、逐个 review，推荐。
2. `Inline Execution`：留在当前会话内按 Task 顺序直接做。
