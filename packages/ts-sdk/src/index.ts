export type {
  AnswerQuestionRequest,
  ModuleManifest,
  QuestionDto,
} from "@vocaport/bridge-schema";

export interface BridgeRuntimeAdapter {
  healthPing(): Promise<string>;
  invoke<TRequest, TResponse>(
    command: string,
    payload: TRequest,
  ): Promise<TResponse>;
}
