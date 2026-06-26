import { useEffect, useState } from "react";
import type { ActiveSessionResponse } from "@vocaport/bridge-schema";
import { PageShell } from "@vocaport/ui";
import { createWebRuntime } from "./runtime";

export function App() {
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [hasResumeSession, setHasResumeSession] = useState(false);

  useEffect(() => {
    const runtime = createWebRuntime();

    void runtime
      .invoke<undefined, string[]>("module.listCapabilities", undefined)
      .then(setCapabilities);

    void runtime
      .invoke<undefined, ActiveSessionResponse>("quiz.getActiveSession", undefined)
      .then((response) => setHasResumeSession(Boolean(response.question)));
  }, []);

  return (
    <PageShell>
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Study Loop
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-white">开始学习</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            进入一期唯一题型的学习闭环：选词库、抽题、作答、回写事件，再继续下一题。
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <h3 className="text-sm font-medium text-white">恢复会话</h3>
              <p className="mt-2 text-sm text-slate-400">
                {hasResumeSession
                  ? "检测到未完成会话，可直接回到上一题。"
                  : "当前没有进行中的会话，下一次将从新会话开始。"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <h3 className="text-sm font-medium text-white">重置进度</h3>
              <p className="mt-2 text-sm text-slate-400">
                支持 card / deck / all 三级 reset，且不删除已导入历史。
              </p>
            </div>
          </div>
        </article>

        <aside className="grid gap-4">
          <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h3 className="text-lg font-semibold text-white">导入词库</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              支持 `.apkg` 的 preview → commit 双阶段导入，并保留字段映射建议。
            </p>
          </article>

          <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h3 className="text-lg font-semibold text-white">模块设置</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              当前已接入的内建能力会显示在这里，后续可扩展到 marketplace-ready 边界。
            </p>
            <p className="mt-3 text-xs text-slate-500">
              {capabilities.length > 0
                ? capabilities.join(" · ")
                : "能力清单加载中"}
            </p>
          </article>
        </aside>
      </section>
    </PageShell>
  );
}
