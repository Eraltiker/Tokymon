
import { AppData, SCHEMA_VERSION, INITIAL_EXPENSE_CATEGORIES, Category, Transaction, Branch, User, RecurringTransaction, ReportSettings, UserRole } from '../types';

const DB_NAME = 'TokymonDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';
const DATA_KEY = 'master';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event: any) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          dbPromise = null;
          indexedDB.deleteDatabase(DB_NAME);
          window.location.reload();
          reject(new Error("Database Store missing, re-initializing..."));
          return;
        }
        resolve(db);
      };

      request.onerror = () => { 
        dbPromise = null; 
        reject(request.error); 
      };

      request.onblocked = () => {
        console.warn("IndexedDB blocked by another tab. Please close other Tokymon tabs.");
      };
    } catch (err) {
      dbPromise = null;
      reject(err);
    }
  });
  return dbPromise;
};

export const StorageService = {
  mergeArrays: <T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const combinedMap = new Map<string, T>();
    const allItems = [...(local || []), ...(remote || [])];

    for (const item of allItems) {
      if (!item || !item.id) continue;
      
      const existing = combinedMap.get(item.id);
      if (!existing) {
        combinedMap.set(item.id, item);
        continue;
      }

      const existingTime = new Date(existing.updatedAt || 0).getTime();
      const itemTime = new Date(item.updatedAt || 0).getTime();

      if (itemTime > existingTime) {
        combinedMap.set(item.id, item);
      } else if (itemTime === existingTime) {
        if (item.deletedAt && !existing.deletedAt) {
          combinedMap.set(item.id, item);
        }
      }
    }
    
    return Array.from(combinedMap.values());
  },

  mergeAppData: (local: AppData, remote: AppData): AppData => {
    const version = (parseFloat(local.version) > parseFloat(remote.version)) ? local.version : remote.version;
    
    return {
      version: version || SCHEMA_VERSION,
      lastSync: new Date().toISOString(),
      transactions: StorageService.mergeArrays(local.transactions || [], remote.transactions || []),
      branches: StorageService.mergeArrays(local.branches || [], remote.branches || []),
      users: StorageService.mergeArrays(local.users || [], remote.users || []),
      expenseCategories: StorageService.mergeArrays(local.expenseCategories || [], remote.expenseCategories || []),
      recurringExpenses: StorageService.mergeArrays(local.recurringExpenses || [], remote.recurringExpenses || []),
      auditLogs: [...(local.auditLogs || []), ...(remote.auditLogs || [])]
        .filter((v, i, a) => v && v.id && a.findIndex(t => t.id === v.id) === i)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 1000),
      reportSettings: remote.reportSettings || local.reportSettings,
      logoUrl: remote.logoUrl || local.logoUrl
    };
  },

  async syncWithCloud(syncKey: string, localData: AppData, forcePush: boolean = false): Promise<AppData> {
    if (!syncKey || syncKey.trim() === '') return localData;
    
    const url = `https://kvdb.io/${syncKey}/tokymon_v1?t=${Date.now()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // Rút ngắn timeout đồng bộ còn 6s
    
    try {
      if (forcePush) {
        await fetch(url, { 
          method: 'POST', 
          body: JSON.stringify(localData), 
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          priority: 'high' as any
        });
        clearTimeout(timeoutId);
        return { ...localData, lastSync: new Date().toISOString() };
      }
      
      const response = await fetch(url, { 
        cache: 'no-store',
        signal: controller.signal,
        priority: 'high' as any
      });
      
      let remoteData: AppData;
      
      if (response.ok) {
        const text = await response.text();
        remoteData = text ? JSON.parse(text) : StorageService.getEmptyData(true);
      } else { 
        remoteData = StorageService.getEmptyData(true); 
      }

      const merged = StorageService.mergeAppData(localData, remoteData);
      
      // Đẩy bản merge lên Cloud ở chế độ background
      fetch(url, { 
        method: 'POST', 
        body: JSON.stringify(merged), 
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        priority: 'low' as any
      }).catch(err => console.warn("Background cloud update failed", err));
      
      clearTimeout(timeoutId);
      return merged;
    } catch (e) { 
      clearTimeout(timeoutId);
      console.warn("Tokymon Sync: Operating in Local mode.", e);
      return { ...localData, lastSync: localData.lastSync || 'Offline' }; 
    }
  },

  async saveLocal(data: AppData): Promise<boolean> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(data, DATA_KEY);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
        
        transaction.oncomplete = () => resolve(true);
      });
    } catch (e) { 
      console.error("Critical: IndexedDB Save Failed", e);
      return false;
    }
  },

  async loadLocal(): Promise<AppData> {
    try {
      const db = await getDB();
      const rawData = await new Promise<any>((resolve, reject) => {
        try {
          const transaction = db.transaction(STORE_NAME, 'readonly');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.get(DATA_KEY);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        } catch (err) {
          reject(err);
        }
      });

      const emptyTemplate = StorageService.getEmptyData(false);
      
      if (!rawData) {
        await StorageService.saveLocal(emptyTemplate);
        return emptyTemplate;
      }
      
      return {
        ...emptyTemplate,
        ...rawData,
        version: SCHEMA_VERSION,
        transactions: rawData.transactions || [],
        branches: rawData.branches || [],
        users: rawData.users || [],
        expenseCategories: rawData.expenseCategories || emptyTemplate.expenseCategories,
        recurringExpenses: rawData.recurringExpenses || [],
        auditLogs: rawData.auditLogs || []
      };
    } catch (e) { 
      console.error("IDB Load Error, falling back to empty data", e);
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
      expenseCategories: INITIAL_EXPENSE_CATEGORIES.map(c => ({ 
        id: `cat_init_${Math.random().toString(36).substr(2, 5)}`, 
        name: c, 
        branchId: '', 
        updatedAt: now 
      })),
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
