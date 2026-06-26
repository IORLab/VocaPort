import type { BridgeRuntimeAdapter } from "@vocaport/ts-sdk";
import {
  createBrowserAppStateSnapshotStore,
  type AppStateSnapshotStore,
} from "./storage";

interface CreateWebRuntimeOptions {
  snapshotStore?: AppStateSnapshotStore;
}

interface WasmWebRuntime {
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

interface WasmWebRuntimeModule {
  PhaseOneWebRuntime: new () => WasmWebRuntime;
}

const mutatingCommands = new Set([
  "import.commitApkg",
  "quiz.startSession",
  "quiz.answerQuestion",
  "review.resetProgress",
]);

let wasmModulePromise: Promise<WasmWebRuntimeModule> | null = null;

async function loadWasmModule() {
  if (!wasmModulePromise) {
    wasmModulePromise = import("./wasm/pkg/vocaport_web_runtime");
  }

  return wasmModulePromise;
}

async function createWasmRuntime(
  snapshotStore: AppStateSnapshotStore,
): Promise<WasmWebRuntime> {
  const module = await loadWasmModule();
  const runtime = new module.PhaseOneWebRuntime();
  const snapshotJson = await snapshotStore.loadSnapshot();

  if (snapshotJson) {
    try {
      runtime.loadSnapshotJson(snapshotJson);
    } catch (error) {
      await snapshotStore.clearSnapshot();
      console.warn("Failed to restore saved web runtime snapshot.", error);
    }
  }

  return runtime;
}

async function persistSnapshot(
  snapshotStore: AppStateSnapshotStore,
  runtime: WasmWebRuntime,
) {
  await snapshotStore.saveSnapshot(runtime.exportSnapshotJson());
}

export function createWebRuntime(
  options: CreateWebRuntimeOptions = {},
): BridgeRuntimeAdapter {
  const snapshotStore =
    options.snapshotStore ?? createBrowserAppStateSnapshotStore();
  let runtimePromise: Promise<WasmWebRuntime> | null = null;

  async function getRuntime() {
    if (!runtimePromise) {
      runtimePromise = createWasmRuntime(snapshotStore);
    }

    return runtimePromise;
  }

  return {
    async healthPing() {
      return (await getRuntime()).healthPing();
    },
    async invoke<TRequest, TResponse>(command: string, payload: TRequest) {
      const runtime = await getRuntime();

      if (command === "module.listCapabilities") {
        return runtime.listCapabilities() as TResponse;
      }

      if (command === "import.previewApkg") {
        const request = payload as {
          fileName: string;
          fileBytes: Uint8Array;
        };

        return runtime.previewApkg(request.fileName, request.fileBytes) as TResponse;
      }

      let response: TResponse;

      if (command === "import.commitApkg") {
        response = runtime.commitApkg(payload) as TResponse;
      } else if (command === "quiz.getActiveSession") {
        response = runtime.getActiveSession() as TResponse;
      } else if (command === "quiz.startSession") {
        response = runtime.startSession(payload) as TResponse;
      } else if (command === "quiz.answerQuestion") {
        response = runtime.answerQuestion(payload) as TResponse;
      } else if (command === "review.resetProgress") {
        response = runtime.resetProgress(payload) as TResponse;
      } else {
        throw new Error(`Unsupported command: ${command}`);
      }

      if (mutatingCommands.has(command)) {
        await persistSnapshot(snapshotStore, runtime);
      }

      return response;
    },
  };
}
