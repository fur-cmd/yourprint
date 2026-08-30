/* ==========================================================
   YourPrint — storage.js
   Helper IndexedDB untuk menyimpan file pesanan (base64 blob)
   antar halaman. sessionStorage hanya berisi metadata ringkas
   (nama, tipe, jumlah halaman) — blob besar ada di sini.
   API global: window.FileStore
   ========================================================== */
(function () {
  const DB_NAME = 'yourprint-db';
  const DB_VERSION = 1;
  const STORE = 'order-files';

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB tidak didukung'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function getFiles(id) {
    return openDb().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readonly');
      const req = t.objectStore(STORE).get(id);
      req.onsuccess = function () { resolve(req.result ? req.result.files : null); };
      req.onerror = function () { reject(req.error); };
    }));
  }

  function save(id, files) {
    return openDb().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).put({ id: id, files: files || [] });
      t.oncomplete = function () { resolve(); };
      t.onerror = function () { reject(t.error); };
      t.onabort = function () { reject(t.error); };
    }));
  }

  function append(id, files) {
    return getFiles(id).then(existing => {
      const merged = (existing || []).concat(files || []);
      return save(id, merged);
    });
  }

  function remove(id, index) {
    return getFiles(id).then(existing => {
      if (!existing) return;
      existing.splice(index, 1);
      return save(id, existing);
    });
  }

  function clear(id) {
    return openDb().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).delete(id);
      t.oncomplete = function () { resolve(); };
      t.onerror = function () { reject(t.error); };
    })).catch(function () {});
  }

  function supported() {
    return ('indexedDB' in window);
  }

  window.FileStore = {
    save: save,
    load: getFiles,
    append: append,
    remove: remove,
    clear: clear,
    supported: supported
  };
})();