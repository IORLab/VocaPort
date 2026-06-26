import type { ReviewEventSource } from "@vocaport/bridge-schema";

export interface ReviewEventRow {
  id: string;
  cardId: string;
  source: ReviewEventSource;
}

export interface ReviewEventRepository {
  insert(row: ReviewEventRow): Promise<void>;
  listByCardId(cardId: string): Promise<ReviewEventRow[]>;
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
  databaseName = "vocaport",
): ReviewEventRepository {
  async function getDatabase(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
      throw new Error("IndexedDB is not available in this environment.");
    }

    return await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("review_events")) {
          database.createObjectStore("review_events", { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return {
    async insert(row) {
      const database = await getDatabase();

      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("review_events", "readwrite");
        transaction.objectStore("review_events").put(row);
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
      const database = await getDatabase();

      return await new Promise<ReviewEventRow[]>((resolve, reject) => {
        const transaction = database.transaction("review_events", "readonly");
        const request = transaction.objectStore("review_events").getAll();

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
