
import { AppData, SCHEMA_VERSION, INITIAL_EXPENSE_CATEGORIES, Category, Transaction, Branch, User, RecurringTransaction, ReportSettings, UserRole } from '../types';

const DB_NAME = 'TokymonDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';
const DATA_KEY = 'master';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { dbPromise = null; reject(request.error); };
  });
  return dbPromise;
};

export const StorageService = {
  mergeArrays: <T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const combinedMap = new Map<string, T>();
    const allItems = [...(local || []), ...(remote || [])];

    allItems.forEach(item => {
      const existing = combinedMap.get(item.id);
      if (!existing) {
        combinedMap.set(item.id, item);
      } else {
        const existingTime = new Date(existing.updatedAt).getTime();
        const itemTime = new Date(item.updatedAt).getTime();

        // 1. Luôn ưu tiên bản ghi có dấu xóa (deletedAt) mới nhất
        if (item.deletedAt && !existing.deletedAt) {
          combinedMap.set(item.id, item);
        } else if (!item.deletedAt && existing.deletedAt) {
          // Giữ bản ghi đã xóa
          combinedMap.set(item.id, existing);
        } else {
          // 2. Nếu cả hai đều sống hoặc cả hai đều xóa, chọn cái mới hơn theo thời gian
          if (itemTime > existingTime) {
            combinedMap.set(item.id, item);
          }
        }
      }
    });
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
      auditLogs: [...(local.auditLogs || []), ...(remote.auditLogs || [])]
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
        .slice(-1000),
      reportSettings: remote.reportSettings || local.reportSettings,
      logoUrl: remote.logoUrl || local.logoUrl
    };
  },

  async syncWithCloud(syncKey: string, localData: AppData, forcePush: boolean = false): Promise<AppData> {
    if (!syncKey || syncKey.trim() === '') return localData;
    const url = `https://kvdb.io/${syncKey}/tokymon_v1`;
    try {
      if (forcePush) {
        const pushResponse = await fetch(url, { 
          method: 'POST', 
          body: JSON.stringify(localData), 
          headers: { 'Content-Type': 'application/json' } 
        });
        if (!pushResponse.ok) throw new Error("Cloud Push Failed");
        return { ...localData, lastSync: new Date().toISOString() };
      }
      
      const response = await fetch(url, { cache: 'no-store' });
      let remoteData: AppData;
      
      if (response.ok) {
        const text = await response.text();
        remoteData = text ? JSON.parse(text) : StorageService.getEmptyData(true);
      } else { 
        remoteData = StorageService.getEmptyData(true); 
      }

      const merged = StorageService.mergeAppData(localData, remoteData);
      
      await fetch(url, { 
        method: 'POST', 
        body: JSON.stringify(merged), 
        headers: { 'Content-Type': 'application/json' } 
      });
      
      return merged;
    } catch (e) { 
      console.error("Sync Error:", e);
      throw e; 
    }
  },

  async saveLocal(data: AppData) {
    try {
      const db = await getDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, DATA_KEY);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (e) { 
      console.error("IDB Save Error", e); 
    }
  },

  async loadLocal(): Promise<AppData> {
    try {
      const db = await getDB();
      const rawData = await new Promise<any>((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(DATA_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });

      if (!rawData) {
        const empty = StorageService.getEmptyData(false);
        await StorageService.saveLocal(empty);
        return empty;
      }
      
      const now = new Date().toISOString();
      const expenseCategories = (rawData.expenseCategories || []).map((c: any) => {
        if (typeof c === 'string') {
          return { id: c, name: c, branchId: '', updatedAt: now };
        }
        return c;
      });

      return {
        ...StorageService.getEmptyData(true),
        ...rawData,
        expenseCategories: expenseCategories.length > 0 ? expenseCategories : StorageService.getEmptyData(true).expenseCategories,
        version: SCHEMA_VERSION
      };
    } catch (e) { 
      console.error("Load Error, falling back to empty state", e);
      return StorageService.getEmptyData(false); 
    }
  },

  getEmptyData: (minimal: boolean = true): AppData => {
    const now = new Date().toISOString();
    const defaultUsers: User[] = [
      { 
        id: 'admin_root', 
        username: 'admin', 
        password: 'admin123', 
        role: UserRole.SUPER_ADMIN, 
        assignedBranchIds: [], 
        preferences: { theme: 'dark', language: 'vi' }, 
        updatedAt: now 
      }
    ];

    return {
      version: SCHEMA_VERSION,
      lastSync: '',
      transactions: [],
      branches: [],
      users: minimal ? [] : defaultUsers,
      expenseCategories: INITIAL_EXPENSE_CATEGORIES.map(c => ({ id: `cat_init_${Math.random().toString(36).substr(2, 5)}`, name: c, branchId: '', updatedAt: now })),
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
    };
  }
};
