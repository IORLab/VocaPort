import { PageShell } from "@vocaport/ui";

export function App() {
  return (
    <PageShell>
      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-xl font-semibold text-white">导入词库</h2>
          <p className="mt-2 text-sm text-slate-400">
            Desktop 壳层已预留 `.apkg` 导入入口和字段映射确认区域。
          </p>
        </article>
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-xl font-semibold text-white">开始学习</h2>
          <p className="mt-2 text-sm text-slate-400">
            会话启动、恢复、重置和模块入口已经在桌面壳层占位。
          </p>
        </article>
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-xl font-semibold text-white">恢复会话</h2>
          <p className="mt-2 text-sm text-slate-400">
            后续会直接复用 Rust 侧持久化的 `StudySession` 快照。
          </p>
        </article>
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-xl font-semibold text-white">重置进度</h2>
          <p className="mt-2 text-sm text-slate-400">
            reset 会写入独立事件边界，不会破坏已导入历史。
          </p>
        </article>
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 md:col-span-2">
          <h2 className="text-xl font-semibold text-white">模块设置</h2>
          <p className="mt-2 text-sm text-slate-400">
            当前桌面壳层已经为导入器、调度器和题型模块保留展示位。
          </p>
        </article>
      </section>
    </PageShell>
  );
}
