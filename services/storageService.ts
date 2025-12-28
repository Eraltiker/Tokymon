
import { AppData, SCHEMA_VERSION, EXPENSE_CATEGORIES, Transaction, Branch, User, RecurringTransaction, ReportSettings, UserRole } from '../types';

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

  async syncWithCloud(syncKey: string, localData: AppData): Promise<AppData> {
    if (!syncKey || syncKey.trim() === '') return localData;
    const url = `https://kvdb.io/${syncKey}/tokymon_v1`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        const remoteData = await response.json();
        const merged = StorageService.mergeAppData(localData, remoteData);
        await fetch(url, {
          method: 'POST',
          body: JSON.stringify(merged),
          headers: { 'Content-Type': 'application/json' }
        });
        return merged;
      } else if (response.status === 404) {
        await fetch(url, {
          method: 'POST',
          body: JSON.stringify(localData),
          headers: { 'Content-Type': 'application/json' }
        });
        return localData;
      }
    } catch (e) {
      console.error("Cloud Sync Error", e);
    }
    return localData;
  },

  async saveLocal(data: AppData) {
    try {
      const db = await getDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(data, DATA_KEY);
    } catch (e) { console.error("IDB Save Error", e); }
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
        users: data.users && data.users.some((u: any) => u.username === 'admin') 
          ? data.users 
          : [StorageService.getEmptyData().users[0], ...(data.users || [])]
      };
    } catch (e) { return StorageService.getEmptyData(); }
  },

  getEmptyData: (): AppData => ({
    version: SCHEMA_VERSION,
    lastSync: '',
    transactions: [],
    branches: [
      { 
        id: 'br_default', 
        name: 'Tokymon Bad Nauheim', 
        address: 'Bad Nauheim, Germany', 
        initialCash: 0, 
        initialCard: 0, 
        color: '#6366f1', 
        updatedAt: new Date().toISOString() 
      }
    ],
    users: [
      { 
        id: 'admin_root', 
        username: 'admin', 
        password: 'admin123', 
        role: UserRole.SUPER_ADMIN, 
        assignedBranchIds: [], 
        updatedAt: new Date().toISOString() 
      }
    ],
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
  })
};
