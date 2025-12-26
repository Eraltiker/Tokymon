
import { AppData, SCHEMA_VERSION, EXPENSE_CATEGORIES, Transaction, Branch, User, RecurringTransaction, ReportSettings } from '../types';

const DB_NAME = 'TokymonDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';
const DATA_KEY = 'master';

/**
 * Wrapper cho IndexedDB để thao tác như LocalStorage nhưng mạnh mẽ hơn
 */
const idb = {
  db: null as IDBDatabase | null,
  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  },
  async get(key: string): Promise<any> {
    const db = await this.open();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  },
  async set(key: string, val: any): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(val, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

export const StorageService = {
  mergeArrays: <T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const map = new Map<string, T>();
    (local || []).forEach(item => {
      if (item && item.id) map.set(item.id, item);
    });
    (remote || []).forEach(remoteItem => {
      if (!remoteItem || !remoteItem.id) return;
      const localItem = map.get(remoteItem.id);
      if (!localItem) {
        map.set(remoteItem.id, remoteItem);
      } else {
        const localTime = new Date(localItem.updatedAt || 0).getTime();
        const remoteTime = new Date(remoteItem.updatedAt || 0).getTime();
        if (remoteTime > localTime) {
          map.set(remoteItem.id, remoteItem);
        }
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
      await idb.set(DATA_KEY, data);
    } catch (e) {
      console.error("Lưu IndexedDB thất bại, fallback sang LocalStorage", e);
      localStorage.setItem('tokymon_fallback', JSON.stringify(data));
    }
  },

  async loadLocal(): Promise<AppData> {
    const data = await idb.get(DATA_KEY);
    if (!data) {
      // Thử đọc từ fallback cũ nếu có
      const legacy = localStorage.getItem('tokymon_master_data') || localStorage.getItem('tokymon_fallback');
      if (legacy) return JSON.parse(legacy);
      return StorageService.getEmptyData();
    }
    return {
      ...StorageService.getEmptyData(),
      ...data
    };
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
    // Chỉ đồng bộ khi online
    if (!navigator.onLine) {
      throw new Error("Offline mode: Sync suspended");
    }

    const sanitizedId = bucketId?.trim();
    if (!sanitizedId) return localData;
    const BUCKET_URL = `https://kvdb.io/${sanitizedId}/main`;
    try {
      const response = await fetch(BUCKET_URL, {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });
      let remoteData: AppData | null = null;
      if (response.ok) {
        const text = await response.text();
        if (text && text !== "null" && text.trim() !== "") {
          try {
            remoteData = JSON.parse(text);
          } catch (pError) {
            console.warn("Dữ liệu Cloud bị lỗi định dạng");
          }
        }
      }
      const merged = remoteData ? StorageService.mergeAppData(localData, remoteData) : localData;
      const saveResponse = await fetch(BUCKET_URL, {
        method: 'PUT',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });
      if (!saveResponse.ok) {
        throw new Error(`Cloud error (${saveResponse.status})`);
      }
      return merged;
    } catch (error: any) {
      console.error("Lỗi kĩ thuật đồng bộ:", error);
      throw error;
    }
  }
};
