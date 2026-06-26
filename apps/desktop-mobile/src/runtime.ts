import { createPhaseOneStubRuntime } from "@vocaport/ts-sdk";

const nativeCommandMap = {
  "module.listCapabilities": "list_capabilities",
  "import.previewApkg": "preview_apkg",
  "import.commitApkg": "commit_apkg",
  "quiz.getActiveSession": "get_active_session",
  "quiz.startSession": "start_session",
  "quiz.answerQuestion": "answer_question",
  "review.resetProgress": "reset_progress",
} as const;

function hasNativeTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function healthPingFromNativeShell() {
  if (hasNativeTauriRuntime()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("native_health_ping");
  }

  return "vocaport-ready";
}

export function createDesktopRuntime() {
  const fallbackRuntime = createPhaseOneStubRuntime({
    healthPing: healthPingFromNativeShell,
  });

  return createPhaseOneStubRuntime({
    healthPing: healthPingFromNativeShell,
    async invoke<TRequest, TResponse>(command: string, payload: TRequest) {
      if (!hasNativeTauriRuntime()) {
        return fallbackRuntime.invoke<TRequest, TResponse>(command, payload);
      }

      const { invoke } = await import("@tauri-apps/api/core");

      if (command === "module.listCapabilities") {
        return invoke<TResponse>(nativeCommandMap[command]);
      }

      if (command === "import.previewApkg") {
        const request = payload as {
          fileName: string;
          fileBytes: Uint8Array;
        };

        return invoke<TResponse>(nativeCommandMap[command], {
          file_name: request.fileName,
          file_bytes: request.fileBytes,
        });
      }

      if (
        command === "import.commitApkg" ||
        command === "quiz.startSession" ||
        command === "quiz.answerQuestion" ||
        command === "review.resetProgress"
      ) {
        return invoke<TResponse>(nativeCommandMap[command], {
          request: payload,
        });
      }

      if (command === "quiz.getActiveSession") {
        return invoke<TResponse>(nativeCommandMap[command]);
      }

      return fallbackRuntime.invoke<TRequest, TResponse>(command, payload);
    },
  });
}
