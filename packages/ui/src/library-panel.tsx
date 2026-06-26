import type { DeckSummaryDto } from "@vocaport/bridge-schema";

interface LibraryPanelProps {
  decks: DeckSummaryDto[];
  onSelectDeck(deckId: string): void;
}

export function LibraryPanel({ decks, onSelectDeck }: LibraryPanelProps) {
  return (
    <section className="rounded-[1.9rem] border border-slate-800 bg-slate-900/75 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
          Library Ledger
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white">词库总览</h3>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        当前 deck 选择会跨快照恢复，后续学习和重置都围绕这个显式选择执行。
      </p>

      {decks.length === 0 ? (
        <div className="mt-5 rounded-[1.4rem] border border-dashed border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-500">
          还没有可管理的词库。先去导入页确认一个真实词库。
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {decks.map((deck) => (
            <article
              key={deck.deckId}
              className="rounded-[1.4rem] border border-slate-800 bg-slate-950/80 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{deck.deckName}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    词条 {deck.entryCount} · 卡片 {deck.cardCount} · 复习记录{" "}
                    {deck.reviewEventCount}
                  </p>
                </div>

                {deck.isCurrentDeck ? (
                  <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs text-sky-200">
                    当前词库
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-default disabled:border-sky-400/40 disabled:bg-sky-400/10 disabled:text-sky-200"
                  disabled={deck.isCurrentDeck}
                  type="button"
                  onClick={() => onSelectDeck(deck.deckId)}
                >
                  {deck.isCurrentDeck ? "当前词库" : "设为当前词库"}
                </button>
                {deck.hasActiveSession ? (
                  <span className="text-xs uppercase tracking-[0.18em] text-amber-200">
                    有待恢复会话
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
