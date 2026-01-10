
import { AppData, SCHEMA_VERSION, INITIAL_EXPENSE_CATEGORIES, Category, Transaction, Branch, User, RecurringTransaction, ReportSettings, UserRole } from '../types';

const DB_NAME = 'TokymonDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';
const DATA_KEY = 'master';

let dbPromise: Promise<IDBDatabase> | null = null;
let isSyncingNow = false; 
let globalSyncCooldownUntil = 0; 

const getDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event: any) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => {
        const db = request.result;
        resolve(db);
      };
      request.onerror = () => { dbPromise = null; reject(request.error); };
    } catch (err) { dbPromise = null; reject(err); }
  });
  return dbPromise;
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  const now = Date.now();
  if (now < globalSyncCooldownUntil) throw new Error("SYNC_COOLDOWN");
  if (!navigator.onLine) throw new Error("OFFLINE");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const isPost = options.method === 'POST';
    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
      headers: isPost ? { 'Content-Type': 'application/json' } : {}
    };
    if (isPost) fetchOptions.body = options.body;

    const res = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (res.status === 429 || res.status === 413) {
      globalSyncCooldownUntil = Date.now() + 180000; // Tăng lên 3 phút nếu bị lỗi
      throw new Error(res.status === 429 ? "RATE_LIMIT" : "PAYLOAD_TOO_LARGE");
    }
    return res;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (retries > 0 && navigator.onLine && err.message !== "SYNC_COOLDOWN") {
      await new Promise(r => setTimeout(r, 5000));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
}

export const StorageService = {
  // Fix: Adjusted constraint to handle both 'updatedAt' and 'timestamp' for merging entities.
  mergeArrays: <T extends { id: string; updatedAt?: string; timestamp?: string; deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const combinedMap = new Map<string, T>();
    if (local) local.forEach(item => item?.id && combinedMap.set(item.id, item));
    if (remote) {
      remote.forEach(item => {
        if (!item?.id) return;
        const existing = combinedMap.get(item.id);
        const itemTime = new Date(item.updatedAt || item.timestamp || 0).getTime();
        const existingTime = existing ? new Date(existing.updatedAt || existing.timestamp || 0).getTime() : 0;
        if (!existing || itemTime > existingTime) {
          combinedMap.set(item.id, item);
        }
      });
    }
    return Array.from(combinedMap.values());
  },

  mergeAppData: (local: AppData, remote: AppData): AppData => {
    return {
      version: SCHEMA_VERSION,
      lastSync: new Date().toISOString(),
      transactions: StorageService.mergeArrays(local.transactions || [], remote.transactions || []),
      branches: StorageService.mergeArrays(local.branches || [], remote.branches || []),
      users: StorageService.mergeArrays(local.users || [], remote.users || []),
      expenseCategories: StorageService.mergeArrays(local.expenseCategories || [], remote.expenseCategories || []),
      recurringExpenses: StorageService.mergeArrays(local.recurringExpenses || [], remote.recurringExpenses || []),
      // Fix: Ensured auditLogs are correctly merged using the updated mergeArrays and then sorted.
      auditLogs: StorageService.mergeArrays(local.auditLogs || [], remote.auditLogs || [])
        .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, 20),
      reportSettings: remote.reportSettings || local.reportSettings
    };
  },

  async syncWithCloud(syncKey: string, localData: AppData, mode: 'poll' | 'push' = 'poll'): Promise<AppData> {
    if (!syncKey || !navigator.onLine || isSyncingNow) return localData;
    if (Date.now() < globalSyncCooldownUntil) return localData;

    isSyncingNow = true;
    const baseUrl = `https://kvdb.io/${syncKey}/tokymon_v1`;
    
    try {
      const dataRes = await fetchWithRetry(`${baseUrl}?nocache=${Date.now()}`, { method: 'GET' });
      let remoteData: AppData | null = null;
      if (dataRes.ok) {
        const text = await dataRes.text();
        if (text) { remoteData = JSON.parse(text); }
      }

      const mergedData = remoteData ? StorageService.mergeAppData(localData, remoteData) : localData;

      // QUAN TRỌNG: Chỉ đẩy 300 giao dịch mới nhất lên Cloud để tránh giới hạn dung lượng kvdb.io
      // Nhưng localData vẫn giữ toàn bộ lịch sử trong IndexedDB
      if (mode === 'push' || JSON.stringify(localData) !== JSON.stringify(remoteData)) {
        const cloudPayload = {
          ...mergedData,
          transactions: mergedData.transactions
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 300), // Giới hạn số lượng giao dịch trên Cloud
          lastSync: new Date().toISOString()
        };

        const pushRes = await fetchWithRetry(baseUrl, { 
          method: 'POST', 
          body: JSON.stringify(cloudPayload)
        });
        if (!pushRes.ok) throw new Error(`Push error: ${pushRes.status}`);
        
        isSyncingNow = false;
        return mergedData;
      }

      isSyncingNow = false;
      return mergedData;
    } catch (e: any) {
      isSyncingNow = false;
      console.warn("Sync Warning:", e.message);
      return localData;
    }
  },

  async saveLocal(data: AppData): Promise<boolean> {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(data, DATA_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  },

  async loadLocal(): Promise<AppData> {
    const db = await getDB();
    const raw: any = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(DATA_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    const empty = StorageService.getEmptyData(false);
    return raw ? { ...empty, ...raw } : empty;
  },

  getEmptyData: (minimal: boolean = true): AppData => {
    const now = new Date().toISOString();
    return {
      version: SCHEMA_VERSION,
      lastSync: '',
      transactions: [],
      branches: [],
      users: minimal ? [] : [{ id: 'admin_root', username: 'admin', password: 'admin123', role: UserRole.SUPER_ADMIN, assignedBranchIds: [], updatedAt: now }],
      expenseCategories: INITIAL_EXPENSE_CATEGORIES.map(c => ({ id: `cat_${Math.random().toString(36).substr(2, 5)}`, name: c, branchId: '', updatedAt: now })),
      recurringExpenses: [],
      auditLogs: [],
      reportSettings: { showSystemTotal: true, showShopRevenue: true, showAppRevenue: true, showCardRevenue: true, showActualCash: true, showProfit: true }
    };
  }
};
