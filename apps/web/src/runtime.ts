import type { BridgeRuntimeAdapter } from "@vocaport/ts-sdk";

export function createWebRuntime(): BridgeRuntimeAdapter {
  return {
    async healthPing() {
      return "vocaport-ready";
    },
    async invoke<TRequest, TResponse>(
      _command: string,
      _payload: TRequest,
    ): Promise<TResponse> {
      throw new Error("Web bridge invoke is not wired yet.");
    },
  };
}
