import { useEffect, useId, useState } from "react";
import type {
  ActiveSessionResponse,
  AnswerQuestionRequest,
  AnswerQuestionResponse,
  DeckSummaryDto,
  ImportCommitRequest,
  ImportCommitResponse,
  ImportPreviewFromPathRequest,
  ImportPreviewRequest,
  ImportPreviewResponse,
  ListDecksResponse,
  QuestionDto,
  ResetProgressRequest,
  SelectDeckRequest,
  StartSessionRequest,
} from "@vocaport/bridge-schema";
import type { BridgeRuntimeAdapter } from "@vocaport/ts-sdk";
import {
  ImportPanel,
  type ImportFieldMappingForm,
} from "./import-panel";
import { LibraryPanel } from "./library-panel";
import { StudyPanel } from "./study-panel";
import {
  WorkspaceTabs,
  type WorkspaceTabId,
} from "./workspace-tabs";

interface DeckDownloadSource {
  label: string;
  description: string;
  href: string;
}

const deckDownloadSources: DeckDownloadSource[] = [
  {
    label: "AnkiWeb 共享牌组",
    description: "官方共享 deck 目录",
    href: "https://ankiweb.net/shared/decks",
  },
  {
    label: "AnkiHub",
    description: "社区协作 deck 平台",
    href: "https://www.ankihub.net/",
  },
  {
    label: "Awesome Anki",
    description: "整理过的 deck 与工具索引",
    href: "https://github.com/tianshanghong/awesome-anki",
  },
];

function formatRuntimeError(error: unknown, fallbackMessage: string) {
  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function buildInitialFieldMapping(
  preview: ImportPreviewResponse,
): ImportFieldMappingForm {
  return {
    lemmaField:
      preview.fieldCandidates.lemma?.fieldName ??
      preview.availableFieldNames[0] ??
      "",
    meaningField:
      preview.fieldCandidates.meaning?.fieldName ??
      preview.availableFieldNames[0] ??
      "",
    exampleField: preview.fieldCandidates.example?.fieldName ?? "",
    imageField: preview.fieldCandidates.image?.fieldName ?? "",
    audioField: preview.fieldCandidates.audio?.fieldName ?? "",
  };
}

function toOptionalField(value: string) {
  return value.trim().length > 0 ? value : undefined;
}

interface NativeImportSelection {
  fileName: string;
  filePath: string;
}

type SelectedImportFile =
  | {
      kind: "browser-file";
      displayName: string;
      file: File;
    }
  | {
      kind: "native-path";
      displayName: string;
      filePath: string;
    };

interface PhaseOneWorkspaceProps {
  openExternalUrl?: (url: string) => Promise<void> | void;
  pickImportFile?: () => Promise<NativeImportSelection | null>;
  runtime: BridgeRuntimeAdapter;
  platformName: string;
}

export function PhaseOneWorkspace({
  openExternalUrl,
  pickImportFile,
  runtime,
  platformName,
}: PhaseOneWorkspaceProps) {
  const fileInputId = useId();
  const [activeTabId, setActiveTabId] = useState<WorkspaceTabId>("import");
  const [healthStatus, setHealthStatus] = useState("连接中");
  const [selectedImport, setSelectedImport] = useState<SelectedImportFile | null>(
    null,
  );
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [fieldMapping, setFieldMapping] = useState<ImportFieldMappingForm | null>(
    null,
  );
  const [commitSummary, setCommitSummary] = useState<ImportCommitResponse | null>(
    null,
  );
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [decks, setDecks] = useState<DeckSummaryDto[]>([]);
  const [question, setQuestion] = useState<QuestionDto | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [resumeAvailable, setResumeAvailable] = useState(false);

  const currentDeck = decks.find((deck) => deck.isCurrentDeck) ?? null;

  async function refreshDecks() {
    const response = await runtime.invoke<undefined, ListDecksResponse>(
      "library.listDecks",
      undefined,
    );
    setDecks(response.decks);
    return response.decks;
  }

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

    void refreshDecks().catch((error) => {
      if (!cancelled) {
        setStatusMessage(formatRuntimeError(error, "读取词库列表失败。"));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [runtime]);

  async function previewImport(selection: SelectedImportFile) {
    setIsPreviewing(true);
    setStatusMessage("正在预览词库…");

    try {
      const response =
        selection.kind === "native-path"
          ? await runtime.invoke<
              ImportPreviewFromPathRequest,
              ImportPreviewResponse
            >("import.previewApkgFromPath", {
              filePath: selection.filePath,
            })
          : await runtime.invoke<ImportPreviewRequest, ImportPreviewResponse>(
              "import.previewApkg",
              {
                fileName: selection.file.name,
                fileBytes: await readFileBytes(selection.file),
              },
            );

      setPreview(response);
      setFieldMapping(buildInitialFieldMapping(response));
      setCommitSummary(null);
      setActiveTabId("import");
      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(formatRuntimeError(error, "导入预览失败。"));
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handlePreviewImport() {
    if (!selectedImport) {
      setStatusMessage("请先选择一个 `.apkg` 文件。");
      return;
    }

    await previewImport(selectedImport);
  }

  function handleFieldMappingChange(
    fieldName: keyof ImportFieldMappingForm,
    value: string,
  ) {
    setFieldMapping((current) =>
      current
        ? {
            ...current,
            [fieldName]: value,
          }
        : current,
    );
  }

  async function handleCommitImport() {
    if (!preview || !fieldMapping) {
      setStatusMessage("请先完成导入预览并确认字段映射。");
      return;
    }

    if (!fieldMapping.lemmaField || !fieldMapping.meaningField) {
      setStatusMessage("词形字段和释义字段不能为空。");
      return;
    }

    setIsImporting(true);
    setStatusMessage("正在导入词库…");

    try {
      const response = await runtime.invoke<
        ImportCommitRequest,
        ImportCommitResponse
      >("import.commitApkg", {
        importId: preview.importId,
        targetDeckId: preview.resolvedDeckId,
        commitMode: "upsert_existing_deck",
        confirmedFieldMapping: {
          lemmaField: fieldMapping.lemmaField,
          meaningField: fieldMapping.meaningField,
          exampleField: toOptionalField(fieldMapping.exampleField),
          imageField: toOptionalField(fieldMapping.imageField),
          audioField: toOptionalField(fieldMapping.audioField),
        },
      });

      setCommitSummary(response);
      await refreshDecks();
      setActiveTabId("library");
      setStatusMessage("导入完成，请在词库页确认当前词库。");
    } catch (error) {
      setStatusMessage(formatRuntimeError(error, "确认导入失败。"));
    } finally {
      setIsImporting(false);
    }
  }

  async function handlePickImportFile() {
    if (!pickImportFile) {
      return;
    }

    try {
      const selection = await pickImportFile();
      if (!selection) {
        return;
      }

      const nextImport: SelectedImportFile = {
        kind: "native-path",
        displayName: selection.fileName,
        filePath: selection.filePath,
      };

      resetSelectedImportState();
      setSelectedImport(nextImport);
      setStatusMessage(null);
      await previewImport(nextImport);
    } catch (error) {
      setStatusMessage(formatRuntimeError(error, "选择词库文件失败。"));
    }
  }

  function handleBrowserFileChange(file: File | null) {
    resetSelectedImportState();
    setSelectedImport(
      file
        ? {
            kind: "browser-file",
            displayName: file.name,
            file,
          }
        : null,
    );
    setStatusMessage(null);
  }

  function resetSelectedImportState() {
    setPreview(null);
    setFieldMapping(null);
    setCommitSummary(null);
  }

  async function handleSelectDeck(deckId: string) {
    try {
      await runtime.invoke<SelectDeckRequest, { deckId: string }>(
        "library.selectDeck",
        {
          deckId,
        },
      );
      await refreshDecks();
      setStatusMessage("已切换当前词库。");
    } catch (error) {
      setStatusMessage(formatRuntimeError(error, "切换当前词库失败。"));
    }
  }

  async function handleStartStudy() {
    if (decks.length > 0 && !currentDeck) {
      setActiveTabId("library");
      setStatusMessage("请先选择当前词库。");
      return;
    }

    const targetDeckId =
      currentDeck?.deckId ??
      commitSummary?.deckId ??
      preview?.resolvedDeckId;

    if (!targetDeckId) {
      setStatusMessage("请先导入并选择一个可学习的词库。");
      return;
    }

    try {
      const response = await runtime.invoke<StartSessionRequest, QuestionDto>(
        "quiz.startSession",
        {
          deckId: targetDeckId,
          mode: "review_due_first",
          forceNew: false,
        },
      );

      setQuestion(response);
      setResumeAvailable(true);
      setActiveTabId("study");
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
        setResumeAvailable(true);
        setActiveTabId("study");
        setStatusMessage(null);
        return;
      }

      setResumeAvailable(false);
      setStatusMessage("当前没有可恢复的会话。");
    } catch (error) {
      setStatusMessage(formatRuntimeError(error, "恢复学习会话失败。"));
    }
  }

  async function handleResetProgress() {
    const targetDeckId =
      currentDeck?.deckId ??
      commitSummary?.deckId ??
      preview?.resolvedDeckId;

    if (!targetDeckId) {
      setStatusMessage("还没有可重置的词库。");
      return;
    }

    try {
      await runtime.invoke<ResetProgressRequest, { ok: boolean }>(
        "review.resetProgress",
        {
          scope: "deck",
          targetDeckId,
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

  async function handleOpenDeckSource(url: string) {
    try {
      if (openExternalUrl) {
        await openExternalUrl(url);
      } else {
        openUrlInBrowser(url);
      }

      setStatusMessage(null);
    } catch (error) {
      setStatusMessage(formatRuntimeError(error, "打开外部链接失败。"));
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

  const tabs = [
    {
      id: "import" as const,
      label: "导入",
      detail: "读取 `.apkg`，确认字段后落盘。",
      badge: preview ? "ready" : undefined,
    },
    {
      id: "library" as const,
      label: "词库",
      detail: "查看 deck 列表并显式选择当前词库。",
      badge: decks.length > 0 ? String(decks.length) : undefined,
    },
    {
      id: "study" as const,
      label: "学习",
      detail: "开始学习、恢复会话、重置进度。",
      badge: resumeAvailable ? "resume" : undefined,
    },
  ];

  return (
    <section className="space-y-6">
      <article className="overflow-hidden rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92))] p-5 shadow-[0_26px_90px_rgba(2,6,23,0.46)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500">
              {platformName} Beta Workspace
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-white">
              从导入确认一路走到学习闭环
            </h2>
          </div>
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            Runtime: {healthStatus}
          </div>
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          这不是一次性演示页，而是一个面向手机优先的本地词库工作台：先确认导入字段，再明确当前词库，最后进入可恢复、可重置的学习流程。
        </p>

        {statusMessage ? (
          <div className="mt-5 rounded-[1.4rem] border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
            {statusMessage}
          </div>
        ) : null}
      </article>

      <WorkspaceTabs
        activeTabId={activeTabId}
        tabs={tabs}
        onSelect={setActiveTabId}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div role="tabpanel">
          {activeTabId === "import" ? (
            <ImportPanel
              canCommit={Boolean(
                preview &&
                  fieldMapping?.lemmaField &&
                  fieldMapping.meaningField &&
                  !isPreviewing &&
                  !isImporting,
              )}
              canPreview={Boolean(selectedImport) && !isPreviewing && !isImporting}
              commitSummary={commitSummary}
              fieldMapping={fieldMapping}
              fileInputId={fileInputId}
              isImporting={isImporting}
              isPreviewing={isPreviewing}
              preview={preview}
              selectedFileName={selectedImport?.displayName}
              onCommitImport={() => void handleCommitImport()}
              onFieldMappingChange={handleFieldMappingChange}
              onFileChange={handleBrowserFileChange}
              onPickNativeFile={
                pickImportFile ? () => void handlePickImportFile() : undefined
              }
              onPreviewImport={() => void handlePreviewImport()}
            />
          ) : null}

          {activeTabId === "library" ? (
            <LibraryPanel
              decks={decks}
              onSelectDeck={(deckId) => void handleSelectDeck(deckId)}
            />
          ) : null}

          {activeTabId === "study" ? (
            <StudyPanel
              currentDeck={currentDeck}
              hasDecks={decks.length > 0}
              question={question}
              resumeAvailable={resumeAvailable}
              statusMessage={statusMessage}
              onAnswerQuestion={(optionId) => void handleAnswerQuestion(optionId)}
              onResetProgress={() => void handleResetProgress()}
              onResumeSession={() => void handleResumeSession()}
              onStartStudy={() => void handleStartStudy()}
            />
          ) : null}
        </div>

        <aside className="grid gap-4">
          <article className="rounded-[1.7rem] border border-slate-800 bg-slate-900/75 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              Deck Sources
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">下载词库</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              去外部站点找 `.apkg` 或可导入 deck，下载后回到这里继续导入。
            </p>
            <ul className="mt-4 grid gap-2.5">
              {deckDownloadSources.map((source) => (
                <li key={source.href}>
                  <a
                    className="group flex items-center justify-between gap-3 rounded-[1.2rem] border border-slate-800 bg-slate-950/70 px-3 py-3 transition hover:border-sky-400/40 hover:bg-slate-950"
                    href={source.href}
                    onClick={(event) => {
                      event.preventDefault();
                      void handleOpenDeckSource(source.href);
                    }}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {source.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {source.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-sky-300 transition group-hover:text-sky-200">
                      打开
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-[1.7rem] border border-slate-800 bg-slate-900/75 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
            <h3 className="text-lg font-semibold text-white">当前聚焦</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {currentDeck
                ? `当前词库：${currentDeck.deckName}`
                : "还没有当前词库，先去词库页显式选中一个 deck。"}
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}

function openUrlInBrowser(url: string) {
  if (typeof window === "undefined" || typeof window.open !== "function") {
    throw new Error("Current environment cannot open external URLs.");
  }

  window.open(url, "_blank", "noopener,noreferrer");
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
