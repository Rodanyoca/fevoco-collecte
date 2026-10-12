const DB_NAME = 'fevoco-collecte';
const DB_VERSION = 1;
let connection;
export function openDB() {
  if (connection) return connection;
  connection = new Promise((resolve,reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('people')) db.createObjectStore('people', {keyPath:'key'});
      if (!db.objectStoreNames.contains('config')) db.createObjectStore('config');
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = undefined; };
      resolve(db);
    };
    request.onerror = () => { connection = undefined; reject(request.error); };
    request.onblocked = () => { connection = undefined; reject(new Error('Fermez les autres onglets de collecte puis réessayez.')); };
  });
  return connection;
}
async function transact(storeName, mode, operation) {
  const db = await openDB();
  return new Promise((resolve,reject) => {
    const transaction = db.transaction(storeName, mode);
    let result;
    const request = operation(transaction.objectStore(storeName));
    request.onsuccess = () => { result = request.result; };
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error || request.error);
    transaction.onabort = () => reject(transaction.error || new Error('Enregistrement interrompu.'));
  });
}
export const loadPeople = () => transact('people','readonly',store => store.getAll());
export const loadClub = async () => await transact('config','readonly',store => store.get('club')) || '';
export const saveClub = name => transact('config','readwrite',store => store.put(name,'club'));
export const savePerson = person => transact('people','readwrite',store => store.put(person));
export const deletePerson = key => transact('people','readwrite',store => store.delete(key));
