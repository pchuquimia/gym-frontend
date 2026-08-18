const DATABASE_NAME = "apex-exercise-catalog";
const STORE_NAME = "catalogs";
const DATABASE_VERSION = 1;
const FALLBACK_PREFIX = "apex_catalog:";

const openDatabase = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const fallbackRead = (key) => {
  if (typeof localStorage === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(`${FALLBACK_PREFIX}${key}`));
  } catch {
    return null;
  }
};

const fallbackWrite = (key, value) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${FALLBACK_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // IndexedDB is the primary store; quota failures in the fallback are safe.
  }
};

export const readCachedSystemCatalog = async (key) => {
  try {
    const database = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
    });
  } catch {
    return fallbackRead(key);
  }
};

export const writeCachedSystemCatalog = async (key, value) => {
  try {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(value, key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch {
    fallbackWrite(key, value);
  }
};
