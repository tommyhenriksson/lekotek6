/**
 * IndexedDB Wrapper för Lekotek
 * 
 * Detta är en enkel wrapper runt IndexedDB som ger ett localStorage-liknande API
 * men med stöd för mycket större datamängder (inklusive bilder).
 * 
 * All data lagras offline i användarens webbläsare.
 * Ingen data skickas till externa servrar.
 */

const DB_NAME = 'LekotekDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';

// Typ för data som lagras i IndexedDB
interface StoredData {
  key: string;
  value: any;
  timestamp: number;
}

/**
 * Öppnar eller skapar IndexedDB-databasen
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] Kunde inte öppna databasen:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Skapa object store om den inte finns
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('[IndexedDB] Object store skapad');
      }
    };
  });
};

/**
 * Sparar data till IndexedDB
 */
export const setItem = async (key: string, value: any): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const data: StoredData = {
      key,
      value,
      timestamp: Date.now(),
    };
    
    const request = store.put(data);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('[IndexedDB] Kunde inte spara data:', request.error);
        reject(request.error);
      };
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[IndexedDB] Fel vid sparning:', error);
    throw error;
  }
};

/**
 * Hämtar data från IndexedDB
 */
export const getItem = async (key: string): Promise<any | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result as StoredData | undefined;
        resolve(result ? result.value : null);
      };
      request.onerror = () => {
        console.error('[IndexedDB] Kunde inte hämta data:', request.error);
        reject(request.error);
      };
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[IndexedDB] Fel vid hämtning:', error);
    return null;
  }
};

/**
 * Tar bort data från IndexedDB
 */
export const removeItem = async (key: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('[IndexedDB] Kunde inte ta bort data:', request.error);
        reject(request.error);
      };
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[IndexedDB] Fel vid borttagning:', error);
    throw error;
  }
};

/**
 * Hämtar alla nycklar från IndexedDB
 */
export const getAllKeys = async (): Promise<string[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => {
        console.error('[IndexedDB] Kunde inte hämta nycklar:', request.error);
        reject(request.error);
      };
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[IndexedDB] Fel vid hämtning av nycklar:', error);
    return [];
  }
};

/**
 * Rensar all data från IndexedDB (används för reset)
 */
export const clear = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('[IndexedDB] Kunde inte rensa databasen:', request.error);
        reject(request.error);
      };
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[IndexedDB] Fel vid rensning:', error);
    throw error;
  }
};

/**
 * Migrerar data från localStorage till IndexedDB
 * Körs automatiskt vid första körningen efter uppdatering
 */
export const migrateFromLocalStorage = async (localStorageKey: string): Promise<boolean> => {
  try {
    console.log('[IndexedDB] Kontrollerar om migrering behövs...');
    
    // Kontrollera om data redan finns i IndexedDB
    const existingData = await getItem(localStorageKey);
    if (existingData) {
      console.log('[IndexedDB] Data finns redan i IndexedDB, hoppar över migrering');
      return false;
    }
    
    // Hämta data från localStorage
    const localData = localStorage.getItem(localStorageKey);
    if (!localData) {
      console.log('[IndexedDB] Ingen data att migrera från localStorage');
      return false;
    }
    
    console.log('[IndexedDB] Startar migrering från localStorage till IndexedDB...');
    
    // Spara data till IndexedDB
    const parsedData = JSON.parse(localData);
    await setItem(localStorageKey, parsedData);
    
    console.log('[IndexedDB] Migrering slutförd!');
    console.log('[IndexedDB] Data bevaras i localStorage som backup');
    
    return true;
  } catch (error) {
    console.error('[IndexedDB] Fel vid migrering:', error);
    return false;
  }
};

/**
 * Kontrollerar om IndexedDB är tillgängligt i webbläsaren
 */
export const isIndexedDBAvailable = (): boolean => {
  try {
    return 'indexedDB' in window && indexedDB !== null;
  } catch {
    return false;
  }
};
