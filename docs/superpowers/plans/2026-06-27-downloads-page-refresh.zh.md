# 下载页改版实施计划

> English execution version: [2026-06-27-downloads-page-refresh.en.md](/Users/jay/Code/VocaPort/docs/superpowers/plans/2026-06-27-downloads-page-refresh.en.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 按任务执行。步骤使用 checkbox (`- [ ]`) 语法追踪。

**目标：** 将 `apps/downloads` 改造成参考 LunaTV、但保留 VocaPort 自身语义的下载页：默认首访跟随系统主题，提供可持久化的暗夜模式切换，统一 loading / error / empty / filled 四种状态的页面骨架，并强化 Stable / Preview / Archive 三段结构。

**架构：** 保留现有 `release-first` 数据模型与 `selectReleaseSections()`，将页面外壳、语言状态和主题状态集中到单一 React 组件中；用一个小型 theme helper 处理系统主题与本地持久化；再通过 CSS 变量完成浅色纸面感与暗夜主题的双主题切换。

**技术栈：** `React 18`、`TypeScript`（`strict: true`）、`Vitest`、`@testing-library/react`、`Vite CSS`

## 全局约束

- 仅修改 `apps/downloads` 前端，不引入 Rust、bridge contract 或 GitHub Releases 数据结构变更。
- 继续使用 `selectReleaseSections()` 产出的 `latestStable`、`latestPrerelease`、`previousReleases`。
- 首次访问跟随 `prefers-color-scheme`；用户手动切换后写入 `localStorage`。
- 不新增按操作系统筛选、分页、搜索或营销首页式内容。
- 所有状态都共享同一 Hero、顶部操作区和主题系统。
- 保持中英文切换和发行说明本地化逻辑可用。
- 外链继续新窗口打开。

## 文件结构

- 创建 `apps/downloads/src/theme.ts`
  - 负责主题类型、初始化、切换和持久化 helper。
- 创建 `apps/downloads/src/theme.test.ts`
  - 覆盖主题初始化与持久化单测。
- 修改 `apps/downloads/src/App.tsx`
  - 收敛页面外壳、Hero、主题切换、重点区块、Archive 和状态面板。
- 修改 `apps/downloads/src/main.tsx`
  - 将 loading / error 状态接入统一页面外壳。
- 修改 `apps/downloads/src/i18n.ts`
  - 扩展新版 Hero、分区说明、状态文案、主题切换按钮文案。
- 修改 `apps/downloads/src/App.test.tsx`
  - 覆盖新版骨架、语言切换、主题切换、持久化和三段结构。
- 修改 `apps/downloads/src/index.css`
  - 引入 light / dark token、manifest 风格布局与卡片样式。

### Task 1：建立主题 helper 与单元测试

**文件：**

- Create: `apps/downloads/src/theme.ts`
- Test: `apps/downloads/src/theme.test.ts`

**接口：**

- Consumes: none
- Produces: `Theme = "light" | "dark"`
- Produces: `THEME_STORAGE_KEY`
- Produces: `getInitialTheme(...)`
- Produces: `persistTheme(...)`
- Produces: `toggleTheme(...)`

- [ ] **Step 1: 先写失败测试**

在 `theme.test.ts` 中覆盖以下行为：

- 已保存主题优先于系统主题
- 未保存时回退到系统主题
- `toggleTheme()` 在 `light/dark` 间切换
- `persistTheme()` 会写入 `localStorage`

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @vocaport/downloads test -- src/theme.test.ts`

Expected: FAIL，提示 `./theme` 不存在或缺少导出。

- [ ] **Step 3: 写最小实现**

在 `theme.ts` 中实现：

- `Theme` 类型
- `THEME_STORAGE_KEY`
- `getStoredTheme()`
- `getInitialTheme()`
- `toggleTheme()`
- `persistTheme()`

读取或写入浏览器存储失败时使用 `console.warn()` 并回退到安全默认值。

- [ ] **Step 4: 重新运行测试确认通过**

Run: `pnpm --filter @vocaport/downloads test -- src/theme.test.ts`

Expected: PASS，`theme.test.ts` 全绿。

- [ ] **Step 5: Commit**

```bash
git add apps/downloads/src/theme.ts apps/downloads/src/theme.test.ts
git commit -m "test: add downloads theme helpers"
```

### Task 2：统一页面外壳与状态骨架

**文件：**

- Modify: `apps/downloads/src/App.tsx`
- Modify: `apps/downloads/src/main.tsx`
- Modify: `apps/downloads/src/i18n.ts`
- Test: `apps/downloads/src/App.test.tsx`

**接口：**

- Consumes: `Theme`, `getInitialTheme`, `persistTheme`, `toggleTheme`
- Produces: `DownloadsViewState`
- Produces: `DownloadsExperience`
- Produces: `DownloadsPage`
- Produces: `StatePanel`

- [ ] **Step 1: 先写失败测试**

在 `App.test.tsx` 中新增页面级测试，验证：

- `loading` 状态也显示新版 Hero 和 `Open GitHub Releases`
- `error` 状态显示统一状态面板与 fallback 描述
- `empty` 状态沿用相同页面骨架，而不是旧版单卡

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @vocaport/downloads test -- src/App.test.tsx`

Expected: FAIL，因为当前 `main.tsx` 仍渲染旧的 `status-screen`，且 Hero 没有 GitHub 入口和新版文案。

- [ ] **Step 3: 写最小实现**

实现方向：

- 在 `App.tsx` 中引入 `DownloadsViewState`
- 新增顶层 `DownloadsExperience` 组件持有 `locale` 与 `theme`
- `main.tsx` 不再直接输出旧 loading / error 卡，而是把状态传给 `DownloadsExperience`
- `i18n.ts` 扩展新版 Hero、状态文案和外链按钮文案

`DownloadsPage` 保留为 ready-state 包装组件，便于现有测试与调用方迁移。

- [ ] **Step 4: 重新运行测试确认通过**

Run: `pnpm --filter @vocaport/downloads test -- src/App.test.tsx`

Expected: PASS，新版 loading / error / empty 骨架测试通过；旧断言如果失效则同步更新到新文案。

- [ ] **Step 5: Commit**

```bash
git add apps/downloads/src/App.tsx apps/downloads/src/main.tsx apps/downloads/src/i18n.ts apps/downloads/src/App.test.tsx
git commit -m "feat: unify downloads page shell states"
```

### Task 3：实现 Stable / Preview / Archive 新布局、主题切换与视觉重构

**文件：**

- Modify: `apps/downloads/src/App.tsx`
- Modify: `apps/downloads/src/index.css`
- Modify: `apps/downloads/src/App.test.tsx`

**接口：**

- Consumes: `DownloadsExperience`, `Theme`, `getCopy()`, `selectReleaseSections()`
- Produces: `Hero`
- Produces: `ThemeToggle`
- Produces: `ReleaseSpotlightCard`
- Produces: `ArchiveReleaseList`

- [ ] **Step 1: 先写失败测试**

在 `App.test.tsx` 中新增或更新测试，覆盖：

- Filled 状态渲染 `01 Stable`、`02 Preview`、`Archive`
- 主题切换按钮点击后切换 `document.documentElement.dataset.theme`
- 点击后把主题写入 `localStorage`
- 语言切换后 Hero 文案与发行说明继续联动

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @vocaport/downloads test -- src/App.test.tsx`

Expected: FAIL，因为当前页面没有 `ThemeToggle`、没有 `data-theme` 写入，也没有新版三段结构。

- [ ] **Step 3: 写最小实现**

实现方向：

- Hero 改成“左侧标题 + 右侧操作区”
- 新增 `ThemeToggle`
- 将 `latestStable`、`latestPrerelease` 改造成 spotlight card
- 将 `previousReleases` 改造成紧凑 archive 区
- `index.css` 切换到 CSS variables + `data-theme`
- loading / error / empty / filled 共享浅色纸面或暗夜纸面视觉语言

- [ ] **Step 4: 运行完整验证**

Run: `pnpm --filter @vocaport/downloads test && pnpm --filter @vocaport/downloads typecheck && pnpm --filter @vocaport/downloads build`

Expected:

- `Vitest` PASS
- `tsc` 无报错
- `vite build` 成功输出

- [ ] **Step 5: Commit**

```bash
git add apps/downloads/src/App.tsx apps/downloads/src/index.css apps/downloads/src/App.test.tsx
git commit -m "feat: refresh downloads page layout and themes"
```

## 自检清单

- Spec coverage：三段结构、顶部操作区、主题跟随系统、暗夜模式持久化、统一状态骨架都有对应任务。
- Placeholder scan：执行前不要保留 TODO/TBD；如果代码结构变化，需要同步回填测试与 copy key。
- Type consistency：`Theme`、`DownloadsViewState`、copy key 命名在各文件中必须完全一致。
