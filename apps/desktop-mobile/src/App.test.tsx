// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

afterEach(() => {
  cleanup();
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
});
