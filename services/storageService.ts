
import { AppData, SCHEMA_VERSION, EXPENSE_CATEGORIES, Transaction, Branch, User, RecurringTransaction, ReportSettings } from '../types';

const DB_NAME = 'TokymonDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';
const DATA_KEY = 'master';

// Singleton DB Promise for instant access
let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  
  return dbPromise;
};

export const StorageService = {
  mergeArrays: <T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const map = new Map<string, T>();
    (local || []).forEach(item => { if (item?.id) map.set(item.id, item); });
    (remote || []).forEach(remoteItem => {
      if (!remoteItem?.id) return;
      const localItem = map.get(remoteItem.id);
      if (!localItem || new Date(remoteItem.updatedAt || 0).getTime() > new Date(localItem.updatedAt || 0).getTime()) {
        map.set(remoteItem.id, remoteItem);
      }
    });
    return Array.from(map.values());
  },

  mergeAppData: (local: AppData, remote: AppData): AppData => {
    return {
      version: SCHEMA_VERSION,
      lastSync: new Date().toISOString(),
      transactions: StorageService.mergeArrays(local.transactions || [], remote.transactions || []),
      branches: StorageService.mergeArrays(local.branches || [], remote.branches || []),
      users: StorageService.mergeArrays(local.users || [], remote.users || []),
      expenseCategories: Array.from(new Set([...(local.expenseCategories || []), ...(remote.expenseCategories || [])])),
      recurringExpenses: StorageService.mergeArrays(local.recurringExpenses || [], remote.recurringExpenses || []),
      auditLogs: [...(local.auditLogs || []), ...(remote.auditLogs || [])]
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
        .slice(-500),
      reportSettings: remote.reportSettings || local.reportSettings,
      logoUrl: remote.logoUrl || local.logoUrl
    };
  },

  async saveLocal(data: AppData) {
    try {
      const db = await getDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(data, DATA_KEY);
    } catch (e) {
      console.error("IDB Save Error", e);
    }
  },

  async loadLocal(): Promise<AppData> {
    try {
      const db = await getDB();
      const data = await new Promise<any>((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(DATA_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });

      if (!data) return StorageService.getEmptyData();
      
      return {
        ...StorageService.getEmptyData(),
        ...data,
        transactions: data.transactions || [],
        branches: data.branches || [],
        users: data.users || [],
        auditLogs: data.auditLogs || []
      };
    } catch (e) {
      return StorageService.getEmptyData();
    }
  },

  getEmptyData: (): AppData => ({
    version: SCHEMA_VERSION,
    lastSync: '',
    transactions: [],
    branches: [],
    users: [{ id: 'admin_root', username: 'admin', password: 'admin', role: 'SUPER_ADMIN' as any, assignedBranchIds: [], updatedAt: new Date().toISOString() }],
    expenseCategories: EXPENSE_CATEGORIES,
    recurringExpenses: [],
    auditLogs: [],
    reportSettings: {
      showSystemTotal: true,
      showShopRevenue: true,
      showAppRevenue: true,
      showCardRevenue: true,
      showActualCash: true,
      showProfit: true
    }
  }),

  syncWithCloud: async (bucketId: string, localData: AppData): Promise<AppData> => {
    if (!navigator.onLine) throw new Error("Offline");
    const sanitizedId = bucketId?.trim();
    if (!sanitizedId) return localData;
    
    const BUCKET_URL = `https://kvdb.io/${sanitizedId}/main`;
    try {
      const response = await fetch(BUCKET_URL);
      let remoteData: AppData | null = null;
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim() !== "null") remoteData = JSON.parse(text);
      }
      const merged = remoteData ? StorageService.mergeAppData(localData, remoteData) : localData;
      await fetch(BUCKET_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });
      return merged;
    } catch (error) {
      throw error;
    }
  }
};
