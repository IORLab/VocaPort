import { describe, expect, it, vi } from "vitest";
import {
  THEME_STORAGE_KEY,
  getInitialTheme,
  persistTheme,
  toggleTheme,
} from "./theme";

describe("getInitialTheme", () => {
  it("prefers the stored theme over the system preference", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue("light"),
      setItem: vi.fn(),
    };
    const matchMedia = vi.fn().mockReturnValue({ matches: true });

    expect(getInitialTheme({ storage, matchMedia })).toBe("light");
  });

  it("falls back to the system theme when nothing is stored", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    };
    const matchMedia = vi.fn().mockReturnValue({ matches: true });

    expect(getInitialTheme({ storage, matchMedia })).toBe("dark");
  });
});

describe("toggleTheme", () => {
  it("switches between light and dark", () => {
    expect(toggleTheme("light")).toBe("dark");
    expect(toggleTheme("dark")).toBe("light");
  });
});

describe("persistTheme", () => {
  it("writes the selected theme into storage", () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
    };

    persistTheme("dark", storage);

    expect(storage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "dark");
  });
});
