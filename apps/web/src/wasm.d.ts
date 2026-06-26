declare module "./wasm/pkg/vocaport_web_runtime" {
  export class PhaseOneWebRuntime {
    constructor();
    healthPing(): string;
    listCapabilities(): string[];
    previewApkg(fileName: string, fileBytes: Uint8Array): unknown;
    commitApkg(request: unknown): unknown;
    getActiveSession(): unknown;
    startSession(request: unknown): unknown;
    answerQuestion(request: unknown): unknown;
    resetProgress(request: unknown): unknown;
    exportSnapshotJson(): string;
    loadSnapshotJson(snapshotJson: string): void;
  }
}
