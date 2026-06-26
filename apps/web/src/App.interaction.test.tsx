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
  it("lets the user preview import, commit import, answer a question, and reset progress", async () => {
    const user = userEvent.setup();

    localStorage.clear();
    render(<App />);

    const fileInput = screen.getByLabelText("选择词库文件");
    await user.upload(fileInput, await loadBasicApkgFile());

    await user.click(screen.getByRole("button", { name: "预览导入" }));
    expect(await screen.findByText("Basic Vocab")).toBeTruthy();

    const importSection = screen
      .getByRole("heading", { name: "导入词库" })
      .closest("section");

    expect(importSection).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "确认导入" }));
    expect(
      await within(importSection as HTMLElement).findByText("导入完成"),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "开始学习" }));
    expect(await screen.findByText("apple")).toBeTruthy();
    expect(await screen.findByRole("button", { name: "苹果" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "苹果" }));
    expect(await screen.findByText("本轮学习已完成。")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "重置进度" }));
    expect(await screen.findByText("已重置当前词库进度。")).toBeTruthy();
  });
});
