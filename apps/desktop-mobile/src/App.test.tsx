// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("desktop app usability", () => {
  it("lets the user preview import and start study from the desktop shell", async () => {
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

    await user.click(screen.getByRole("button", { name: "开始学习" }));
    expect(await screen.findByText("apple")).toBeTruthy();
  });
});
