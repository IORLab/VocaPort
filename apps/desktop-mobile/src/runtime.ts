import { createPhaseOneStubRuntime } from "@vocaport/ts-sdk";

async function healthPingFromNativeShell() {
  if (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in window
  ) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("native_health_ping");
  }

  return "vocaport-ready";
}

export function createDesktopRuntime() {
  return createPhaseOneStubRuntime({
    healthPing: healthPingFromNativeShell,
  });
}
