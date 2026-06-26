// @vitest-environment jsdom

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

async function loadBasicApkgFile() {
  const bytes = await readFile(
    resolve(process.cwd(), "../../fixtures/anki/basic-vocab.apkg"),
  );

  return new File([bytes], "basic-vocab.apkg", {
    type: "application/octet-stream",
  });
}

describe("web app usability", () => {
  it("lets the user preview import, adjust fields, set the current deck, resume study, and reset progress", async () => {
    const user = userEvent.setup();

    localStorage.clear();
    const firstView = render(<App />);

    const fileInput = screen.getByLabelText("选择词库文件");
    await user.upload(fileInput, await loadBasicApkgFile());

    await user.click(screen.getByRole("button", { name: "预览导入" }));
    expect(await screen.findByText("Basic Vocab")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("例句字段"), "Example");

    const importSection = screen
      .getByRole("heading", { name: "导入词库" })
      .closest("section");

    expect(importSection).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "确认导入" }));
    expect(
      await within(importSection as HTMLElement).findByText("导入完成"),
    ).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "词库" }));
    const librarySection = screen
      .getByRole("heading", { name: "词库总览" })
      .closest("section");
    expect(librarySection).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "设为当前词库" }));
    expect(
      await within(librarySection as HTMLElement).findByRole("button", {
        name: "当前词库",
      }),
    ).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "学习" }));
    await user.click(screen.getByRole("button", { name: "开始学习" }));
    expect(await screen.findByText("apple")).toBeTruthy();

    firstView.unmount();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: "学习" }));
    await user.click(screen.getByRole("button", { name: "恢复会话" }));
    expect(await screen.findByText("apple")).toBeTruthy();
    expect(await screen.findByRole("button", { name: "苹果" })).toBeTruthy();
    const studySection = screen
      .getByRole("heading", { name: "学习会话" })
      .closest("section");
    expect(studySection).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "苹果" }));
    expect(
      await within(studySection as HTMLElement).findByText("本轮学习已完成。"),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "重置进度" }));
    expect(
      await within(studySection as HTMLElement).findByText("已重置当前词库进度。"),
    ).toBeTruthy();
  });
});
