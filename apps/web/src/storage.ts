import type { ReviewEventSource } from "@vocaport/bridge-schema";

const DATABASE_VERSION = 2;
const REVIEW_EVENT_STORE_NAME = "review_events";
const APP_STATE_STORE_NAME = "app_state";
const DEFAULT_DATABASE_NAME = "vocaport";
const DEFAULT_SNAPSHOT_KEY = "phase-one-state";

export interface ReviewEventRow {
  id: string;
  cardId: string;
  source: ReviewEventSource;
}

export interface ReviewEventRepository {
  insert(row: ReviewEventRow): Promise<void>;
  listByCardId(cardId: string): Promise<ReviewEventRow[]>;
}

export interface AppStateSnapshotStore {
  loadSnapshot(): Promise<string | null>;
  saveSnapshot(snapshotJson: string): Promise<void>;
  clearSnapshot(): Promise<void>;
}

interface SnapshotRow {
  id: string;
  snapshotJson: string;
}

async function getDatabase(
  databaseName = DEFAULT_DATABASE_NAME,
): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment.");
  }

  return await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(REVIEW_EVENT_STORE_NAME)) {
        database.createObjectStore(REVIEW_EVENT_STORE_NAME, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(APP_STATE_STORE_NAME)) {
        database.createObjectStore(APP_STATE_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createMemoryReviewEventRepository(): ReviewEventRepository {
  const rows: ReviewEventRow[] = [];

  return {
    async insert(row) {
      rows.push(row);
    },
    async listByCardId(cardId) {
      return rows.filter((row) => row.cardId === cardId);
    },
  };
}

export function createIndexedDbReviewEventRepository(
  databaseName = DEFAULT_DATABASE_NAME,
): ReviewEventRepository {
  return {
    async insert(row) {
      const database = await getDatabase(databaseName);

      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(REVIEW_EVENT_STORE_NAME, "readwrite");
        transaction.objectStore(REVIEW_EVENT_STORE_NAME).put(row);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          const error =
            transaction.error ??
            new Error("Failed to insert review event into IndexedDB.");
          database.close();
          reject(error);
        };
        transaction.onabort = () => {
          const error =
            transaction.error ??
            new Error("IndexedDB transaction was aborted while inserting.");
          database.close();
          reject(error);
        };
      });
    },
    async listByCardId(cardId) {
      const database = await getDatabase(databaseName);

      return await new Promise<ReviewEventRow[]>((resolve, reject) => {
        const transaction = database.transaction(REVIEW_EVENT_STORE_NAME, "readonly");
        const request = transaction.objectStore(REVIEW_EVENT_STORE_NAME).getAll();

        request.onsuccess = () => {
          const rows = request.result as ReviewEventRow[];
          database.close();
          resolve(rows.filter((row) => row.cardId === cardId));
        };
        request.onerror = () => {
          const error =
            request.error ??
            new Error("Failed to list review events from IndexedDB.");
          database.close();
          reject(error);
        };
        transaction.onabort = () => {
          const error =
            transaction.error ??
            new Error("IndexedDB transaction was aborted while reading.");
          database.close();
          reject(error);
        };
      });
    },
  };
}

function getMemorySnapshotRegistry() {
  const globalState = globalThis as typeof globalThis & {
    __VOCAPORT_MEMORY_SNAPSHOTS__?: Map<string, string>;
  };

  if (!globalState.__VOCAPORT_MEMORY_SNAPSHOTS__) {
    globalState.__VOCAPORT_MEMORY_SNAPSHOTS__ = new Map<string, string>();
  }

  return globalState.__VOCAPORT_MEMORY_SNAPSHOTS__;
}

export function createMemoryAppStateSnapshotStore(
  storageKey = DEFAULT_SNAPSHOT_KEY,
): AppStateSnapshotStore {
  const snapshots = getMemorySnapshotRegistry();

  return {
    async loadSnapshot() {
      return snapshots.get(storageKey) ?? null;
    },
    async saveSnapshot(snapshotJson) {
      snapshots.set(storageKey, snapshotJson);
    },
    async clearSnapshot() {
      snapshots.delete(storageKey);
    },
  };
}

export function createLocalStorageAppStateSnapshotStore(
  storageKey = DEFAULT_SNAPSHOT_KEY,
): AppStateSnapshotStore {
  return {
    async loadSnapshot() {
      if (typeof localStorage === "undefined") {
        throw new Error("localStorage is not available in this environment.");
      }

      return localStorage.getItem(storageKey);
    },
    async saveSnapshot(snapshotJson) {
      if (typeof localStorage === "undefined") {
        throw new Error("localStorage is not available in this environment.");
      }

      localStorage.setItem(storageKey, snapshotJson);
    },
    async clearSnapshot() {
      if (typeof localStorage === "undefined") {
        throw new Error("localStorage is not available in this environment.");
      }

      localStorage.removeItem(storageKey);
    },
  };
}

export function createIndexedDbAppStateSnapshotStore(
  databaseName = DEFAULT_DATABASE_NAME,
  storageKey = DEFAULT_SNAPSHOT_KEY,
): AppStateSnapshotStore {
  return {
    async loadSnapshot() {
      const database = await getDatabase(databaseName);

      return await new Promise<string | null>((resolve, reject) => {
        const transaction = database.transaction(APP_STATE_STORE_NAME, "readonly");
        const request = transaction.objectStore(APP_STATE_STORE_NAME).get(storageKey);

        request.onsuccess = () => {
          const row = request.result as SnapshotRow | undefined;
          database.close();
          resolve(row?.snapshotJson ?? null);
        };
        request.onerror = () => {
          database.close();
          reject(
            request.error ??
              new Error("Failed to load app state snapshot from IndexedDB."),
          );
        };
        transaction.onabort = () => {
          database.close();
          reject(
            transaction.error ??
              new Error("IndexedDB transaction was aborted while loading."),
          );
        };
      });
    },
    async saveSnapshot(snapshotJson) {
      const database = await getDatabase(databaseName);

      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(APP_STATE_STORE_NAME, "readwrite");
        transaction.objectStore(APP_STATE_STORE_NAME).put({
          id: storageKey,
          snapshotJson,
        } satisfies SnapshotRow);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(
            transaction.error ??
              new Error("Failed to save app state snapshot into IndexedDB."),
          );
        };
        transaction.onabort = () => {
          database.close();
          reject(
            transaction.error ??
              new Error("IndexedDB transaction was aborted while saving."),
          );
        };
      });
    },
    async clearSnapshot() {
      const database = await getDatabase(databaseName);

      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(APP_STATE_STORE_NAME, "readwrite");
        transaction.objectStore(APP_STATE_STORE_NAME).delete(storageKey);
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(
            transaction.error ??
              new Error("Failed to clear app state snapshot from IndexedDB."),
          );
        };
        transaction.onabort = () => {
          database.close();
          reject(
            transaction.error ??
              new Error("IndexedDB transaction was aborted while clearing."),
          );
        };
      });
    },
  };
}

export function createBrowserAppStateSnapshotStore() {
  if (typeof indexedDB !== "undefined") {
    return createIndexedDbAppStateSnapshotStore();
  }

  if (typeof localStorage !== "undefined") {
    return createLocalStorageAppStateSnapshotStore();
  }

  return createMemoryAppStateSnapshotStore();
}
