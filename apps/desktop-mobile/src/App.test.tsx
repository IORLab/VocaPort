// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const mockInvoke = vi.fn();
const mockOpenDialog = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: mockOpenDialog,
}));

afterEach(() => {
  cleanup();
  mockInvoke.mockReset();
  mockOpenDialog.mockReset();
  delete (window as typeof window & { __TAURI_INTERNALS__?: object })
    .__TAURI_INTERNALS__;
});

describe("desktop app usability", () => {
  it("opens deck source shortcuts from the shell", async () => {
    const user = userEvent.setup();
    const openSpy = vi.fn();

    Object.defineProperty(window, "open", {
      configurable: true,
      value: openSpy,
    });

    render(<App />);

    await user.click(
      screen.getByRole("link", { name: /AnkiWeb 共享牌组/i }),
    );

    expect(openSpy).toHaveBeenCalledWith(
      "https://ankiweb.net/shared/decks",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("lets the user preview import, choose the current deck, and start study from the desktop shell", async () => {
    const user = userEvent.setup();

    render(<App />);

    const fileInput = screen.getByLabelText("选择词库文件");
    await user.upload(
      fileInput,
      new File(["demo"], "basic-vocab.apkg", {
        type: "application/octet-stream",
      }),
    );

    await user.click(screen.getByRole("button", { name: "预览导入" }));
    expect(await screen.findByText("Basic Vocab")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "确认导入" }));

    await user.click(screen.getByRole("tab", { name: "词库" }));
    await user.click(screen.getByRole("button", { name: "设为当前词库" }));
    expect(
      await screen.findByRole("button", { name: "当前词库" }),
    ).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "学习" }));
    await user.click(screen.getByRole("button", { name: "开始学习" }));
    expect(await screen.findByText("apple")).toBeTruthy();
  });

  it("uses the native desktop picker and path-based preview for large apkg files", async () => {
    const user = userEvent.setup();
    (window as typeof window & { __TAURI_INTERNALS__?: object })
      .__TAURI_INTERNALS__ = {};

    mockOpenDialog.mockResolvedValue("/Users/jay/Downloads/eggrolls-JLPT10k-v3.5.apkg");
    mockInvoke.mockImplementation(async (command: string, payload?: unknown) => {
      if (command === "native_health_ping") {
        return "vocaport-ready";
      }

      if (command === "list_decks") {
        return {
          decks: [],
        };
      }

      if (command === "get_active_session") {
        return {
          question: undefined,
        };
      }

      if (command === "preview_apkg_from_path") {
        expect(payload).toEqual({
          request: {
            filePath: "/Users/jay/Downloads/eggrolls-JLPT10k-v3.5.apkg",
          },
        });

        return {
          importId: "preview-native",
          fileHash: "hash-native",
          deckName: "eggrolls-JLPT10k-v3.5",
          resolvedDeckId: "deck-eggrolls",
          fileName: "eggrolls-JLPT10k-v3.5.apkg",
          entryCount: 10622,
          reviewEventCount: 0,
          mediaCount: 26956,
          availableFieldNames: ["Back", "Example", "Front"],
          fieldCandidates: {
            lemma: { fieldName: "Front", confidence: 100 },
            meaning: { fieldName: "Back", confidence: 100 },
          },
          unresolvedFields: [],
          warningMessages: [],
          isDuplicateFile: false,
          reimportTargetDeckId: "deck-eggrolls",
        };
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    render(<App />);

    expect(screen.queryByLabelText("选择词库文件")).toBeNull();

    await user.click(screen.getByRole("button", { name: "选择词库文件" }));
    expect(mockOpenDialog).toHaveBeenCalledOnce();

    expect(await screen.findByText("eggrolls-JLPT10k-v3.5")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "确认导入" }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(mockInvoke).toHaveBeenCalledWith("preview_apkg_from_path", {
      request: {
        filePath: "/Users/jay/Downloads/eggrolls-JLPT10k-v3.5.apkg",
      },
    });
  });

  it("keeps required mappings empty when preview has no reliable field candidates", async () => {
    const user = userEvent.setup();
    (window as typeof window & { __TAURI_INTERNALS__?: object })
      .__TAURI_INTERNALS__ = {};

    mockOpenDialog.mockResolvedValue("/Users/jay/Downloads/eggrolls-JLPT10k-v3.5.apkg");
    mockInvoke.mockImplementation(async (command: string) => {
      if (command === "native_health_ping") {
        return "vocaport-ready";
      }

      if (command === "list_decks") {
        return {
          decks: [],
        };
      }

      if (command === "get_active_session") {
        return {
          question: undefined,
        };
      }

      if (command === "preview_apkg_from_path") {
        return {
          importId: "preview-native",
          fileHash: "hash-native",
          deckName: "eggrolls-JLPT10k-v3.5",
          resolvedDeckId: "deck-eggrolls",
          fileName: "eggrolls-JLPT10k-v3.5.apkg",
          entryCount: 10622,
          reviewEventCount: 0,
          mediaCount: 26956,
          availableFieldNames: ["Alt1", "NoteID", "VocabDefSC", "VocabKanji"],
          fieldCandidates: {
            lemma: undefined,
            meaning: undefined,
            example: undefined,
            image: undefined,
            audio: undefined,
          },
          unresolvedFields: [],
          warningMessages: [],
          isDuplicateFile: false,
          reimportTargetDeckId: "deck-eggrolls",
        };
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    render(<App />);

    await user.click(screen.getByRole("button", { name: "选择词库文件" }));

    expect(
      (await screen.findByRole("combobox", { name: "词形字段" }) as HTMLSelectElement)
        .value,
    ).toBe("");
    expect(
      (screen.getByRole("combobox", { name: "释义字段" }) as HTMLSelectElement).value,
    ).toBe("");
    expect(
      (screen.getByRole("button", { name: "确认导入" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
