import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("web shell integration", () => {
  it("shows import, study, resume, reset, and modules areas", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("导入词库");
    expect(html).toContain("开始学习");
    expect(html).toContain("恢复会话");
    expect(html).toContain("重置进度");
    expect(html).toContain("模块设置");
  });
});
