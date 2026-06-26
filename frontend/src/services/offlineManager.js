const DB_NAME = 'UniTrackOfflineSync';
const STORE_NAME = 'mutationQueue';
const DB_VERSION = 1;

/**
 * Initializes the IndexedDB for offline sync.
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
    };
  });
}

/**
 * Adds an API request to the offline queue.
 * @param {Object} requestData - { url, method, body, params, tempId, timestamp }
 */
export async function queueRequest(requestData) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Add a timestamp to ensure chronological replay
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
      // Sort by timestamp just in case
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
