import type { ImportCommitResponse, ImportPreviewResponse } from "@vocaport/bridge-schema";

export interface ImportFieldMappingForm {
  lemmaField: string;
  meaningField: string;
  exampleField: string;
  imageField: string;
  audioField: string;
}

interface ImportPanelProps {
  fileInputId: string;
  selectedFileName?: string;
  preview: ImportPreviewResponse | null;
  commitSummary: ImportCommitResponse | null;
  fieldMapping: ImportFieldMappingForm | null;
  canPreview: boolean;
  canCommit: boolean;
  onFileChange(file: File | null): void;
  onPreviewImport(): void;
  onCommitImport(): void;
  onFieldMappingChange(
    fieldName: keyof ImportFieldMappingForm,
    value: string,
  ): void;
}

interface MappingSelectProps {
  label: string;
  optional?: boolean;
  options: string[];
  value: string;
  onChange(value: string): void;
}

function MappingSelect({
  label,
  optional = false,
  options,
  value,
  onChange,
}: MappingSelectProps) {
  return (
    <label className="block text-sm text-slate-300">
      <span>{label}</span>
      <select
        className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {optional ? <option value="">不导入</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ImportPanel({
  fileInputId,
  selectedFileName,
  preview,
  commitSummary,
  fieldMapping,
  canPreview,
  canCommit,
  onFileChange,
  onPreviewImport,
  onCommitImport,
  onFieldMappingChange,
}: ImportPanelProps) {
  const availableFieldNames = preview?.availableFieldNames ?? [];

  return (
    <section className="rounded-[1.9rem] border border-slate-800 bg-slate-900/75 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Import Desk
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">导入词库</h3>
        </div>
        {selectedFileName ? (
          <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300">
            {selectedFileName}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        先拿到真实 `.apkg` 预览，再由你确认字段映射后写入本地库。
      </p>

      <label className="mt-5 block text-sm text-slate-300" htmlFor={fileInputId}>
        选择词库文件
      </label>
      <input
        accept=".apkg"
        className="mt-2 block w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        id={fileInputId}
        type="file"
        onChange={(event) => onFileChange(event.target.files?.item(0) ?? null)}
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="rounded-2xl bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          disabled={!canPreview}
          type="button"
          onClick={onPreviewImport}
        >
          预览导入
        </button>
        <button
          className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:text-slate-500"
          disabled={!canCommit}
          type="button"
          onClick={onCommitImport}
        >
          确认导入
        </button>
      </div>

      {preview ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">{preview.deckName}</p>
            <p className="mt-2">
              条目 {preview.entryCount} · 历史 {preview.reviewEventCount} · 媒体{" "}
              {preview.mediaCount}
            </p>
          </div>

          {fieldMapping ? (
            <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">字段确认</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Phase 2 先覆盖文本型词库，图片和音频字段可暂时不导入。
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <MappingSelect
                  label="词形字段"
                  options={availableFieldNames}
                  value={fieldMapping.lemmaField}
                  onChange={(value) => onFieldMappingChange("lemmaField", value)}
                />
                <MappingSelect
                  label="释义字段"
                  options={availableFieldNames}
                  value={fieldMapping.meaningField}
                  onChange={(value) => onFieldMappingChange("meaningField", value)}
                />
                <MappingSelect
                  label="例句字段"
                  optional
                  options={availableFieldNames}
                  value={fieldMapping.exampleField}
                  onChange={(value) => onFieldMappingChange("exampleField", value)}
                />
                <MappingSelect
                  label="图片字段"
                  optional
                  options={availableFieldNames}
                  value={fieldMapping.imageField}
                  onChange={(value) => onFieldMappingChange("imageField", value)}
                />
                <MappingSelect
                  label="音频字段"
                  optional
                  options={availableFieldNames}
                  value={fieldMapping.audioField}
                  onChange={(value) => onFieldMappingChange("audioField", value)}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.4rem] border border-dashed border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-500">
          预览后会在这里展示词库摘要和可调整的字段映射。
        </div>
      )}

      {commitSummary ? (
        <div className="mt-5 rounded-[1.4rem] border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          <p className="font-medium text-white">导入完成</p>
          <p className="mt-2">
            {commitSummary.deckName} · 词条 {commitSummary.importedEntryCount} · 卡片{" "}
            {commitSummary.importedCardCount}
          </p>
        </div>
      ) : null}
    </section>
  );
}
