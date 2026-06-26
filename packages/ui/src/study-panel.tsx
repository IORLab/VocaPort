import type { DeckSummaryDto, QuestionDto } from "@vocaport/bridge-schema";

interface StudyPanelProps {
  currentDeck: DeckSummaryDto | null;
  hasDecks: boolean;
  question: QuestionDto | null;
  resumeAvailable: boolean;
  statusMessage: string | null;
  onStartStudy(): void;
  onResumeSession(): void;
  onResetProgress(): void;
  onAnswerQuestion(optionId: string): void;
}

export function StudyPanel({
  currentDeck,
  hasDecks,
  question,
  resumeAvailable,
  statusMessage,
  onStartStudy,
  onResumeSession,
  onResetProgress,
  onAnswerQuestion,
}: StudyPanelProps) {
  return (
    <section className="rounded-[1.9rem] border border-slate-800 bg-slate-900/75 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Study Loop
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">学习会话</h3>
        </div>
        {currentDeck ? (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
            {currentDeck.deckName}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        先锁定当前词库，再开始、恢复或重置同一条学习链路。
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="rounded-2xl bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          disabled={hasDecks && !currentDeck}
          type="button"
          onClick={onStartStudy}
        >
          开始学习
        </button>
        <button
          className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:text-slate-500"
          disabled={!resumeAvailable}
          type="button"
          onClick={onResumeSession}
        >
          恢复会话
        </button>
        <button
          className="rounded-2xl border border-rose-500/40 px-4 py-2 text-sm font-medium text-rose-200 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          disabled={!currentDeck && !question}
          type="button"
          onClick={onResetProgress}
        >
          重置进度
        </button>
      </div>

      {!currentDeck && hasDecks ? (
        <div className="mt-5 rounded-[1.4rem] border border-dashed border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-500">
          先到词库页选择一个当前词库，再开启新的学习回合。
        </div>
      ) : null}

      {question ? (
        <div className="mt-5 rounded-[1.4rem] border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            当前题目
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {question.promptValue}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {question.options.map((option) => (
              <button
                key={option.id}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-left text-sm text-slate-100 transition hover:border-slate-500"
                type="button"
                onClick={() => onAnswerQuestion(option.id)}
              >
                {option.value}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {statusMessage ? (
        <p className="mt-5 text-sm text-slate-300">{statusMessage}</p>
      ) : null}
    </section>
  );
}
