const DB_NAME = 'UniTrackOfflineSync';
const STORE_NAME = 'mutationQueue';
const CACHE_STORE_NAME = 'apiCache';
const DB_VERSION = 2; // Incremented version to create the new store

/**
 * Initializes the IndexedDB for offline sync and caching.
 */
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // tempId will be used to uniquely identify offline mutations
        db.createObjectStore(STORE_NAME, { keyPath: 'tempId' });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        // key will be the API url + params
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

// ==================== MUTATION QUEUE ====================

/**
 * Adds an API request to the offline queue.
 */
export async function queueRequest(requestData) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    requestData.timestamp = Date.now();
    const request = store.add(requestData);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Retrieves all queued requests, ordered chronologically.
 */
export async function getQueuedRequests() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result || [];
      results.sort((a, b) => a.timestamp - b.timestamp);
      resolve(results);
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Removes a request from the queue after successful sync.
 */
export async function removeQueuedRequest(tempId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(tempId);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Clears the entire queue.
 */
export async function clearQueue() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

// ==================== API CACHE ====================

/**
 * Saves a GET response to IndexedDB for offline access.
 */
export async function setPersistentCache(key, data) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.put({ key, data, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Failed to set persistent cache", err);
  }
}

/**
 * Retrieves a GET response from IndexedDB.
 */
export async function getPersistentCache(key) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CACHE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Failed to get persistent cache", err);
    return null;
  }
}
