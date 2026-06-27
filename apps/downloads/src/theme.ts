export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "vocaport-downloads-theme";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface MatchMediaResult {
  matches: boolean;
}

export interface ThemeDependencies {
  storage?: StorageLike;
  matchMedia?: (query: string) => MatchMediaResult;
}

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function getStoredTheme(storage?: StorageLike): Theme | null {
  if (!storage) {
    return null;
  }

  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch (error) {
    console.warn("Failed to read the downloads theme preference.", error);
    return null;
  }
}

export function getInitialTheme(deps: ThemeDependencies = {}): Theme {
  const storedTheme = getStoredTheme(deps.storage);

  if (storedTheme) {
    return storedTheme;
  }

  return deps.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function persistTheme(theme: Theme, storage?: StorageLike) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn("Failed to persist the downloads theme preference.", error);
  }
}

export function toggleTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}
