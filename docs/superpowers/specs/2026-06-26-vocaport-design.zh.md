# VocaPort 第一阶段设计方案

> English version: [2026-06-26-vocaport-design.en.md](/Users/jay/Code/VocaPort/docs/superpowers/specs/2026-06-26-vocaport-design.en.md)

## 1. 项目目标

VocaPort 是一个离线优先的背单词应用，第一阶段聚焦两件事：

- 词库导入：支持 Anki `.apkg`
- 卡片学习：`1 卡片 = 1 单词`，`4` 个选项，`1` 个正确答案

项目边界：

- 新项目目录与 `LunaTV` 同级
- 优先提供 `web` 版与 `desktop` 版
- `android` 作为后续同一架构下的移动端延伸
- `ios` 留到最后
- `Rust` 负责底层业务内核
- `TypeScript` 只负责前端界面、交互和状态编排

## 2. 一期范围

### 2.1 一期要做

- 新建独立项目仓库
- Web 应用
- Desktop 应用
- Android 的架构路径与适配边界
- Anki `.apkg` 导入
- 导入词条、释义、例句、图片、音频
- 导入 Anki 复习历史
- 支持后续重置学习进度，但不删除已导入历史
- 首发 1 个题型模块：`4 选 1 混合选项题`
- 图片优先，无图时退化为释义/例句选项
- 预埋 FSRS 兼容的调度数据模型
- 全项目按“后期在线插件市场”方向设计

### 2.2 一期不做

- iOS 客户端
- 账号体系
- 云同步
- 在线补图
- 多题型同时上线
- 运行时第三方插件安装与执行
- 社区插件市场
- 复杂数据统计面板

## 3. 全局设计原则

### 3.1 核心原则

- **离线优先**：导入、学习、媒体访问、本地进度都默认本地完成
- **Rust 唯一业务源**：导入规范化、出题、判题、调度、模块契约全部以 Rust 为准
- **TS 只做前端**：前端不保存业务真相，不维护第二套业务规则
- **可扩展优先**：所有可变化能力都按模块边界设计
- **市场化就绪**：从第一天开始就为后期在线插件市场预留协议、权限、签名与兼容层
- **一期克制**：先做静态注册的内建模块，不开放运行时第三方插件

### 3.2 总体方法

采用 **Hexagonal Architecture**：

- Rust 内核定义领域模型、事件模型、存储契约、模块契约
- 各平台只做适配层和壳层
- 可变化能力通过模块接入，不直接污染核心域模型

整个项目的总原则是：

> **Marketplace-Ready, Runtime-Disabled in Phase 1**

即：

- 现在就按“未来有在线插件市场”设计
- 第一阶段只允许内建模块静态注册

## 4. 技术选型

### 4.1 前端

- `Vite`
- `React`
- `TypeScript`，启用 `strict: true`
- `Tailwind CSS`

说明：

- 不建议照搬 `LunaTV` 当前公开仓库的 `Next.js` 中心架构
- 这个项目没有 SSR/SEO 刚需，核心是离线词库与本地能力
- `Vite + React` 更符合 KISS/YAGNI

### 4.2 跨端壳

- `Tauri 2`

### 4.3 Rust

- Rust workspace
- 多 crate 拆分
- `serde` 负责 DTO 序列化
- `thiserror` 或等价方案负责结构化错误
- Native 侧数据库建议 `sqlx` 或 `rusqlite`

### 4.4 本地存储

- Web：`IndexedDB`
- Desktop / Android：`SQLite`
- Native 媒体资源：本地文件系统
- Web 媒体资源：浏览器缓存或 `Blob` 持久化

## 5. 仓库结构

```text
VocaPort/
  apps/
    web/
    desktop-mobile/
  crates/
    core_domain/
    core_events/
    core_storage_contract/
    core_bridge_contract/
    core_module_registry/
    core_permission/
    core_signature/
    modules/
      importer_apkg/
      scheduler_fsrs/
      quiz_mcq/
      media_embedded/
  packages/
    ui/
    bridge-schema/
    ts-sdk/
  docs/
    superpowers/
      specs/
  scripts/
```

### 5.1 结构约束

- `apps/` 只放平台壳
- `crates/core_*` 只放稳定核心
- `crates/modules/*` 只放可替换的能力模块
- `packages/*` 只放 TS 共享资源、桥接类型和前端 SDK

## 6. 模块化边界

### 6.1 不可插件化的核心

以下能力必须保持在可信核心内：

- 领域模型
- 事件模型
- 进度重置语义
- 存储契约
- Bridge 命令契约
- 模块注册契约
- 权限模型
- 签名校验模型
- 兼容性检查

### 6.2 可模块化能力

以下能力从第一天就按模块设计：

- `ImporterModule`
- `SchedulerModule`
- `QuizModule`
- `MediaResolverModule`
- 后续可加 `DictionaryEnhancerModule`
- 后续可加 `TtsModule`

### 6.3 一期内建模块

- `importer_apkg`
- `scheduler_fsrs`
- `quiz_mcq`
- `media_embedded`

## 7. 领域模型

### 7.1 规范化核心对象

#### `Deck`

- `id`
- `name`
- `sourceType`
- `externalDeckId`
- `latestImportRecordId`
- `createdAt`
- `updatedAt`

#### `VocabularyEntry`

- `id`
- `lemma`
- `phonetic`
- `meanings[]`
- `examples[]`
- `tags[]`
- `sourceDeckId`
- `mediaRefs[]`

#### `StudyCard`

- `id`
- `entryId`
- `promptMode`
- `optionPolicy`

规则：

- `1 card = 1 word`

#### `MediaAsset`

- `id`
- `kind`
- `mimeType`
- `storageKey`
- `origin`

#### `ReviewEvent`

- `id`
- `cardId`
- `source`
- `rating`
- `reviewedAt`
- `scheduledDays`
- `elapsedDays`
- `rawPayload`

其中 `source` 至少包含：

- `anki_import`
- `app_review`

#### `ReviewState`

- `cardId`
- `status`
- `stability`
- `difficulty`
- `dueAt`
- `lastReviewedAt`
- `reviewCount`

#### `StudySession`

- `id`
- `deckId`
- `mode`
- `status`
- `currentQuestion`
- `remainingCardIds[]`
- `answeredCount`
- `startedAt`
- `lastActivityAt`

规则：

- `currentQuestion` 必须保存当前题干和选项快照，保证中断恢复后题目不漂移

#### `ProgressReset`

- `id`
- `scope`
- `targetCardId`
- `targetDeckId`
- `resetAt`
- `reason`

#### `ImportRecord`

- `id`
- `deckId`
- `sourceType`
- `fileHash`
- `sourceFingerprint`
- `importedAt`
- `entryCount`
- `reviewEventCount`
- `skippedCount`
- `warningCount`

### 7.2 建模规则

- Anki 表结构只作为外部输入格式，不直接进入业务层
- 内部统一以规范化对象为准
- `ReviewState` 必须由事件流推导，不直接信任外部状态快照
- `Deck` 是一等对象，不能只靠 `VocabularyEntry.sourceDeckId` 反推词库
- 当前学习会话和题目选项顺序属于 Rust 内核状态，必须可恢复
- 外部稳定 ID 存在时优先用于 upsert / 去重；`fileHash` 只用于识别完全相同的导入包

## 8. 导入架构

### 8.1 支持范围

一期只承诺正式支持：

- Anki `.apkg`

### 8.2 导入流程

1. 读取 `.apkg`
2. 计算 `fileHash`
3. 解包归档
4. 读取 notes、cards、media、revlog 等数据
5. 运行字段映射规则
6. 识别不准时让用户确认字段映射
7. 清洗 HTML、空值、重复释义和重复例句
8. 建立媒体引用
9. 将复习历史归一化成 `ReviewEvent`
10. 从事件流推导 `ReviewState`
11. 写入规范化实体与导入记录
12. 返回导入报告

### 8.3 Preview / Commit 契约

`import.previewApkg` 至少返回：

- `importId`
- `fileHash`
- `deckName`
- `resolvedDeckId`
- `entryCount`
- `reviewEventCount`
- `mediaCount`
- `fieldCandidates { lemma, meaning, example, image, audio }`
- `unresolvedFields[]`
- `warningMessages[]`
- `isDuplicateFile`
- `reimportTargetDeckId`

`import.commitApkg` 至少接收：

- `importId`
- `confirmedFieldMapping { lemma, meaning, example, image, audio }`
- `targetDeckId`
- `commitMode`

`import.commitApkg` 至少返回：

- `deckId`
- `deckName`
- `importedEntryCount`
- `importedCardCount`
- `importedReviewEventCount`
- `skippedCount`
- `warningMessages[]`
- `mediaImportSummary`
- `nextRecommendedAction`

### 8.4 导入报告

导入报告至少包含：

- 导入词条数
- 导入卡片数
- 导入历史数
- 跳过项目数
- 警告项
- 无法映射字段
- 媒体导入摘要

### 8.5 字段映射策略

- 先内置一套英语单词卡模板规则
- 规则命中不足时，不做激进猜测，直接要求用户确认
- `lemma` 和 `meaning` 是必填映射；`example`、`image`、`audio` 可以为空
- 导入质量优先于“全自动”

### 8.6 重导入与幂等策略

- `fileHash` 只用于识别完全相同的导入文件，不等于词库主身份
- 词库主身份优先使用 `sourceType + externalDeckId`；缺失时才回退到用户显式选择的目标词库
- 词条、卡片、媒体优先按外部稳定 ID 做 upsert；无法取得稳定 ID 时才回退到确定性 hash
- 复习历史优先按外部 review ID 去重；缺失时回退到事件关键字段 hash
- 再次导入相同文件时必须给出重复警告，默认走 `upsert_existing_deck`，而不是静默重复造数据

## 9. 复习历史与进度重置

### 9.1 复习历史

- 导入 Anki 复习历史
- 保留原始历史关键字段到 `rawPayload`
- 所有外部历史都统一归一化为内部 `ReviewEvent`

### 9.2 进度重置

重置不删除历史，只新增 `ProgressReset`。

调度器只消费“最新相关 reset 之后”的事件。

支持重置范围：

- 单卡
- 词库
- 全部

这样可以保证：

- 可追溯
- 可恢复
- 不污染原始导入记录

### 9.3 Reset 解析规则

- 重建单卡状态时，同时检查 `card`、`deck`、`all` 三类 reset
- 取“适用于该卡片且 `resetAt` 最新”的那一条作为事件过滤边界
- `card` reset 只命中目标卡片
- `deck` reset 命中 `sourceDeckId` 相同的全部卡片
- `all` reset 命中当前本地数据集内全部卡片
- `ProgressReset` 必须单独持久化到 `ProgressResetRepository`，不能混入 `ReviewEvent`

## 10. 学习流程与出题引擎

### 10.1 一期学习闭环

1. 用户导入词库
2. 用户选择词库
3. 调度器选出本轮卡片
4. 出题模块生成一题
5. 用户作答
6. 系统写入新 `ReviewEvent`
7. 系统重算 `ReviewState`
8. 返回反馈与下一题

未完成的学习会话必须持久化为 `StudySession`。再次进入应用时，优先恢复现有会话，而不是重新抽题。

### 10.2 一期题型

一期只上线一个题型模块：

- `4 选 1 混合选项题`

规则：

- `1` 个正确答案
- `3` 个干扰项
- 有图时优先图片
- 缺图时退化为释义或例句

### 10.3 干扰项策略

首期干扰项采用最小可用品质策略：

- 优先同词库
- 优先相近词性
- 优先相近长度
- 避免与正确答案文本明显互相泄漏
- 避免重复词根和近乎相同的干扰项

### 10.4 判题结果

每次作答至少返回：

- `isCorrect`
- `correctOptionId`
- `appliedRating`
- `explanationPayload`
- `nextReviewSuggestion`
- `nextQuestion`
- `isSessionComplete`

`explanationPayload` 一期至少包含：

- 目标单词
- 正确释义
- 示例句
- 可播放音频（如存在）

一期的 FSRS rating 映射保持固定：

- 答错：`again`
- 正常答对：`good`
- 用户点击 `标记太难`：`hard`
- `easy` 保留给后续版本，不在一期 UI 暴露

## 11. 调度器设计

### 11.1 基本策略

一期就采用 FSRS 兼容的数据模型，但行为保持克制：

- 支持导入 Anki 历史
- 支持按事件流重算状态
- 支持到期优先复习
- 支持随机练习模式

### 11.2 设计原因

- 后续切换或增强调度算法成本低
- 已导入历史不会被早期表结构绑死
- 不需要一开始就完全复刻 Anki 内部实现

## 12. 存储设计

### 12.1 Repository 切分

存储契约按职责拆分，不允许做成巨型仓储。

一期必须落地：

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

为后续插件市场预留：

- `ModuleRepository`

### 12.2 各端存储

#### Web

- 结构化数据：`IndexedDB`
- 媒体数据：浏览器缓存或 `Blob`

#### Desktop / Android

- 结构化数据：`SQLite`
- 媒体数据：本地文件系统

### 12.3 一致性要求

Web 和 Native 不要求相同底层引擎，但必须保证：

- schema 语义一致
- 领域契约一致
- bridge 协议一致
- 核心业务输出一致

## 13. Bridge 与服务层

### 13.1 命令分组

前端与 Rust 之间只走稳定命令协议：

- `import.*`
- `deck.*`
- `review.*`
- `quiz.*`
- `module.*`
- `settings.*`
- `media.*`

示例：

- `import.previewApkg`
- `import.commitApkg`
- `quiz.getActiveSession`
- `quiz.startSession`
- `quiz.answerQuestion`
- `review.resetProgress`
- `module.listCapabilities`

### 13.2 服务层

应用服务只依赖契约，不依赖具体模块实现：

- `ImportService`
- `ReviewService`
- `QuizService`
- `ModuleService`

前端不得直接调用模块实现。

## 14. 多端落地策略

### 14.1 Web

- `TS UI + Rust/WASM core`
- 浏览器文件选择
- IndexedDB 适配器
- WASM 启动层
- PWA 只作为 Web 端离线壳

### 14.2 Desktop

- `TS UI + Rust native core`
- Tauri 壳
- 本地文件系统
- Native SQLite
- 本地媒体缓存

### 14.3 Android

- 与 Desktop 共享同一高层思路
- 补充移动端文件选择、权限申请、缓存目录管理

### 14.4 平台约束

平台差异只能出现在：

- `FileAccessAdapter`
- `StorageAdapter`
- `MediaCacheAdapter`
- `BridgeRuntimeAdapter`
- `PlatformInfoAdapter`

业务规则不得下沉到平台壳中。

## 15. 插件市场准备

### 15.1 一期策略

一期只允许：

- 内建模块
- 静态注册
- 显式能力声明
- 显式权限声明

### 15.2 后续能力

后续逐步打开：

- 官方签名模块分发
- 下载、安装、启用、禁用
- 回滚
- 兼容性解析
- 在线插件市场

### 15.3 模块 Manifest 契约

每个模块统一暴露：

- `moduleId`
- `version`
- `apiVersion`
- `capabilities[]`
- `permissions[]`
- `platformTargets[]`
- `entrypoints`
- `checksum`
- `signature`

一期内建模块也必须遵守同一 Manifest 结构。

### 15.4 权限模型

权限默认拒绝，显式授权。初始权限词汇建议至少包含：

- `import.apkg.read`
- `media.asset.read`
- `quiz.generate`
- `scheduler.compute`
- `storage.module_scoped`
- `network.none`
- `network.limited`
- `ui.route.register`

### 15.5 预留的系统组件

从一开始就保留这些系统组件的接口与注册点：

- `ModuleRegistry`
- `PermissionManager`
- `PluginManifestValidator`
- `SignatureVerifier`
- `PluginInstaller`
- `PluginCatalogClient`
- `CompatibilityResolver`
- `SafeModeLoader`

一期不需要做完整市场功能，但这些组件的边界必须在架构上固定。

## 16. 前端信息架构

前端不能围绕单个背词页面硬编码，建议从第一阶段开始分成：

- 词库导入
- 学习会话
- 进度管理
- 模块设置

这样后面加导入器、题型、调度器和市场入口时，不需要重做整体导航。

## 17. 里程碑

### M0：架构骨架

- monorepo 建立
- Rust workspace 建立
- TS apps/packages 建立
- bridge schema 定义完成
- module registry 接口建立

### M1：导入链路

- `.apkg` 预览
- 字段映射确认
- `commit` 导入
- 规范化实体导入
- 复习历史导入
- 导入报告

### M2：学习闭环

- 词库选择
- 学习会话启动
- 学习会话恢复
- 出题
- 作答
- 事件持久化
- 状态重算

### M3：多端交付

- Web 可用
- Desktop 可用
- Android 壳验证通过

### M4：市场化基础

- Manifest 契约
- 权限契约
- 签名校验契约
- 安装器与目录客户端的接口建立

## 18. 风险

- Anki 模板差异很大，字段映射会有波动
- 导入历史到内部事件流的归一化不一定百分百完整
- Web 端 WASM 与本地媒体处理链路比 Native 更脆弱
- Android 文件权限与缓存管理会影响体验
- 过早开放运行时第三方插件会直接引入供应链和兼容性风险

## 19. 裁剪原则

如果一期时间紧，必须优先保留：

- `.apkg` 导入
- 复习历史导入
- `4 选 1` 学习闭环
- 进度重置
- Rust 核心契约
- 市场化接口边界

优先裁掉：

- 花哨动画
- 多题型同时上线
- 在线补图
- 高级统计面板
- 运行时第三方插件执行
- 云同步

## 20. 最终建议

第一阶段按以下方式落地：

- 用 monorepo 建项目
- 用 Rust 持有唯一业务内核
- 用 TS 只做前端与平台展示
- 用 `Tauri 2` 承接 Desktop 与 Android 路线
- 用 `Rust/WASM` 支撑 Web 端核心逻辑复用
- 用静态注册的内建模块完成导入、调度、出题、媒体解析
- 从一开始就固定好未来插件市场需要的契约、权限、签名和兼容性边界

这样可以保证一期足够克制，同时不堵死后期在线插件市场、题型扩展、调度切换和多端演进的路径。
