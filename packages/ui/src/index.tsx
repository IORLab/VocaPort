import { useEffect, useId, useState } from "react";
import type { PropsWithChildren } from "react";
import type {
  ActiveSessionResponse,
  AnswerQuestionRequest,
  AnswerQuestionResponse,
  ImportCommitRequest,
  ImportCommitResponse,
  ImportPreviewRequest,
  ImportPreviewResponse,
  QuestionDto,
  ResetProgressRequest,
  StartSessionRequest,
} from "@vocaport/bridge-schema";
import type { BridgeRuntimeAdapter } from "@vocaport/ts-sdk";

function formatRuntimeError(error: unknown, fallbackMessage: string) {
  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export function PageShell({ children }: PropsWithChildren) {
  return (
    <main className="mx-auto min-h-screen max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">VocaPort</h1>
      </header>
      {children}
    </main>
  );
}

interface PhaseOneWorkspaceProps {
  runtime: BridgeRuntimeAdapter;
  platformName: string;
}

export function PhaseOneWorkspace({
  runtime,
  platformName,
}: PhaseOneWorkspaceProps) {
  const fileInputId = useId();
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [healthStatus, setHealthStatus] = useState("连接中");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [commitSummary, setCommitSummary] = useState<ImportCommitResponse | null>(
    null,
  );
  const [question, setQuestion] = useState<QuestionDto | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [resumeAvailable, setResumeAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void runtime
      .healthPing()
      .then((status) => {
        if (!cancelled) {
          setHealthStatus(status);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setHealthStatus("连接失败");
          setStatusMessage(formatRuntimeError(error, "Runtime 健康检查失败。"));
        }
      });

    void runtime
      .invoke<undefined, string[]>("module.listCapabilities", undefined)
      .then((runtimeCapabilities) => {
        if (!cancelled) {
          setCapabilities(runtimeCapabilities);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatusMessage(formatRuntimeError(error, "读取模块能力失败。"));
        }
      });

    void runtime
      .invoke<undefined, ActiveSessionResponse>("quiz.getActiveSession", undefined)
      .then((response) => {
        if (!cancelled) {
          setResumeAvailable(Boolean(response.question));
          setQuestion(response.question ?? null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatusMessage(formatRuntimeError(error, "恢复会话状态失败。"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [runtime]);

  async function handlePreviewImport() {
    if (!selectedFile) {
      setStatusMessage("请先选择一个 `.apkg` 文件。");
      return;
    }

    try {
      const fileBytes = await readFileBytes(selectedFile);
      const response = await runtime.invoke<
        ImportPreviewRequest,
        ImportPreviewResponse
      >("import.previewApkg", {
        fileName: selectedFile.name,
        fileBytes,
      });

      setPreview(response);
      setCommitSummary(null);
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(formatRuntimeError(error, "导入预览失败。"));
    }
  }

  async function handleCommitImport() {
    if (!preview) {
      setStatusMessage("请先完成导入预览。");
      return;
    }

    try {
      const response = await runtime.invoke<
        ImportCommitRequest,
        ImportCommitResponse
      >("import.commitApkg", {
        importId: preview.importId,
        targetDeckId: preview.resolvedDeckId,
        commitMode: "upsert_existing_deck",
        confirmedFieldMapping: {
          lemmaField: preview.fieldCandidates.lemma?.fieldName ?? "Front",
          meaningField: preview.fieldCandidates.meaning?.fieldName ?? "Back",
          exampleField: preview.fieldCandidates.example?.fieldName,
          imageField: preview.fieldCandidates.image?.fieldName,
          audioField: preview.fieldCandidates.audio?.fieldName,
        },
      });

      setCommitSummary(response);
      setStatusMessage("导入完成");
    } catch (error) {
      setStatusMessage(formatRuntimeError(error, "确认导入失败。"));
    }
  }

  async function handleStartStudy() {
    try {
      const response = await runtime.invoke<StartSessionRequest, QuestionDto>(
        "quiz.startSession",
        {
          deckId:
            commitSummary?.deckId ??
            preview?.resolvedDeckId ??
            "deck-basic-vocab",
          mode: "review_due_first",
          forceNew: false,
        },
      );

      setQuestion(response);
      setResumeAvailable(true);
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(formatRuntimeError(error, "启动学习会话失败。"));
    }
  }

  async function handleResumeSession() {
    try {
      const response = await runtime.invoke<undefined, ActiveSessionResponse>(
        "quiz.getActiveSession",
        undefined,
      );

      if (response.question) {
        setQuestion(response.question);
        setStatusMessage(null);
        return;
      }

      setStatusMessage("当前没有可恢复的会话。");
    } catch (error) {
      setStatusMessage(formatRuntimeError(error, "恢复学习会话失败。"));
    }
  }

  async function handleResetProgress() {
    try {
      await runtime.invoke<ResetProgressRequest, { ok: boolean }>(
        "review.resetProgress",
        {
          scope: "deck",
          targetDeckId:
            commitSummary?.deckId ??
            preview?.resolvedDeckId ??
            "deck-basic-vocab",
          reason: "user-reset",
        },
      );

      setQuestion(null);
      setResumeAvailable(false);
      setStatusMessage("已重置当前词库进度。");
    } catch (error) {
      setStatusMessage(formatRuntimeError(error, "重置学习进度失败。"));
    }
  }

  async function handleAnswerQuestion(selectedOptionId: string) {
    if (!question) {
      setStatusMessage("当前没有可作答的题目。");
      return;
    }

    try {
      const response = await runtime.invoke<
        AnswerQuestionRequest,
        AnswerQuestionResponse
      >("quiz.answerQuestion", {
        sessionId: question.sessionId,
        questionId: question.questionId,
        selectedOptionId,
      });

      if (response.nextQuestion) {
        setQuestion(response.nextQuestion);
        setResumeAvailable(true);
        setStatusMessage(response.isCorrect ? "回答正确。" : "回答错误。");
        return;
      }

      setQuestion(null);
      setResumeAvailable(false);
      setStatusMessage(response.nextReviewSuggestion.summaryText);
    } catch (error) {
      setStatusMessage(formatRuntimeError(error, "提交答案失败。"));
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
              {platformName}
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">开始学习</h2>
          </div>
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            Runtime: {healthStatus}
          </div>
        </div>

        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
          走通一期最短链：导入词库、确认字段、启动学习会话、完成答题、恢复会话、重置当前进度。
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <h3 className="text-sm font-medium text-white">导入词库</h3>
            <label
              className="mt-3 block text-sm text-slate-300"
              htmlFor={fileInputId}
            >
              选择词库文件
            </label>
            <input
              id={fileInputId}
              className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              type="file"
              accept=".apkg"
              onChange={(event) =>
                setSelectedFile(event.target.files?.item(0) ?? null)
              }
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                disabled={!selectedFile}
                type="button"
                onClick={() => void handlePreviewImport()}
              >
                预览导入
              </button>
              <button
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:text-slate-500"
                disabled={!preview}
                type="button"
                onClick={() => void handleCommitImport()}
              >
                确认导入
              </button>
            </div>

            {preview ? (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
                <p className="font-medium text-white">{preview.deckName}</p>
                <p className="mt-2">
                  条目 {preview.entryCount} · 历史 {preview.reviewEventCount} ·
                  媒体 {preview.mediaCount}
                </p>
                <p className="mt-2 text-slate-400">
                  字段映射：{preview.fieldCandidates.lemma?.fieldName} /{" "}
                  {preview.fieldCandidates.meaning?.fieldName}
                </p>
              </div>
            ) : null}

            {commitSummary ? (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                <p className="font-medium text-white">导入完成</p>
                <p className="mt-2">
                  {commitSummary.deckName} · 词条 {commitSummary.importedEntryCount}
                  · 卡片 {commitSummary.importedCardCount}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <h3 className="text-sm font-medium text-white">学习会话</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950"
                type="button"
                onClick={() => void handleStartStudy()}
              >
                开始学习
              </button>
              <button
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:text-slate-500"
                disabled={!resumeAvailable}
                type="button"
                onClick={() => void handleResumeSession()}
              >
                恢复会话
              </button>
              <button
                className="rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-medium text-rose-200"
                type="button"
                onClick={() => void handleResetProgress()}
              >
                重置进度
              </button>
            </div>

            {question ? (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
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
                      className="rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-left text-sm text-slate-100"
                      type="button"
                      onClick={() => void handleAnswerQuestion(option.id)}
                    >
                      {option.value}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {statusMessage ? (
              <p className="mt-4 text-sm text-slate-300">{statusMessage}</p>
            ) : null}
          </section>
        </div>
      </article>

      <aside className="grid gap-4">
        <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="text-lg font-semibold text-white">模块设置</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            当前壳层已接入 importer、scheduler、quiz 三类能力，并为后续 marketplace-ready
            扩展保留入口。
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
            {capabilities.map((capability) => (
              <li
                key={capability}
                className="rounded-full border border-slate-700 px-3 py-1"
              >
                {capability}
              </li>
            ))}
          </ul>
        </article>
      </aside>
    </section>
  );
}

async function readFileBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") {
    return new Uint8Array(await file.arrayBuffer());
  }

  if (typeof FileReader !== "undefined") {
    return await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;
        if (!(result instanceof ArrayBuffer)) {
          reject(new Error("Failed to read binary file contents."));
          return;
        }

        resolve(new Uint8Array(result));
      };
      reader.onerror = () => {
        reject(reader.error ?? new Error("Failed to read selected file."));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  throw new Error("Current environment cannot read binary file contents.");
}
