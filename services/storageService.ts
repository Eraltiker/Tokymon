
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
  /**
   * CƠ CHẾ GỘP DỮ LIỆU CHỐNG PHỤC HỒI (Anti-Resurrection Merge)
   */
  mergeArrays: <T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const combinedMap = new Map<string, T>();
    const allIds = new Set([
      ...(local || []).map(i => i.id),
      ...(remote || []).map(i => i.id)
    ]);

    allIds.forEach(id => {
      const l = (local || []).find(i => i.id === id);
      const r = (remote || []).find(i => i.id === id);

      if (l && r) {
        const lTime = new Date(l.updatedAt).getTime();
        const rTime = new Date(r.updatedAt).getTime();
        
        if (lTime > rTime) {
          combinedMap.set(id, l);
        } else if (rTime > lTime) {
          combinedMap.set(id, r);
        } else {
          // Nếu thời gian bằng nhau, ưu tiên bản ghi đã bị đánh dấu xóa (Tombstone)
          combinedMap.set(id, (l.deletedAt || r.deletedAt) ? (l.deletedAt ? l : r) : l);
        }
      } else if (l) {
        combinedMap.set(id, l);
      } else if (r) {
        combinedMap.set(id, r);
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
      expenseCategories: Array.from(new Set([...(local.expenseCategories || []), ...(remote.expenseCategories || [])])),
      recurringExpenses: StorageService.mergeArrays(local.recurringExpenses || [], remote.recurringExpenses || []),
      auditLogs: [...(local.auditLogs || []), ...(remote.auditLogs || [])]
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
        .slice(-500),
      reportSettings: remote.reportSettings || local.reportSettings,
      logoUrl: remote.logoUrl || local.logoUrl
    };
  },

  async syncWithCloud(syncKey: string, localData: AppData, forcePush: boolean = false): Promise<AppData> {
    if (!syncKey || syncKey.trim() === '') return localData;
    const url = `https://kvdb.io/${syncKey}/tokymon_v1`;
    try {
      if (forcePush) {
        await fetch(url, { method: 'POST', body: JSON.stringify(localData), headers: { 'Content-Type': 'application/json' } });
        return { ...localData, lastSync: new Date().toISOString() };
      }
      
      const response = await fetch(url, { cache: 'no-store' });
      let remoteData: AppData;
      
      if (response.ok) {
        try { 
          const text = await response.text();
          remoteData = text ? JSON.parse(text) : StorageService.getEmptyData(true);
        } catch (e) { 
          remoteData = StorageService.getEmptyData(true); 
        }
      } else { 
        remoteData = StorageService.getEmptyData(true); 
      }

      const merged = StorageService.mergeAppData(localData, remoteData);
      
      // Đẩy bản gộp lên Cloud để "chốt" các Tombstones
      await fetch(url, { method: 'POST', body: JSON.stringify(merged), headers: { 'Content-Type': 'application/json' } });
      
      return merged;
    } catch (e) { throw e; }
  },

  async saveLocal(data: AppData) {
    try {
      const db = await getDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(data, DATA_KEY);
    } catch (e) { console.error("IDB Error", e); }
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

      // Quan trọng: Nếu IDB trống (lần đầu chạy), trả về minimal=true để không tự tạo chi nhánh mẫu
      if (!data) return StorageService.getEmptyData(true);
      
      const empty = StorageService.getEmptyData(true);
      return {
        ...empty,
        ...data,
        transactions: data.transactions || [],
        branches: data.branches || [],
        users: data.users || [],
        expenseCategories: data.expenseCategories || empty.expenseCategories,
        recurringExpenses: data.recurringExpenses || [],
        auditLogs: data.auditLogs || []
      };
    } catch (e) { 
      return StorageService.getEmptyData(true); 
    }
  },

  /**
   * getEmptyData: Trả về cấu trúc dữ liệu trắng.
   * @param minimal Nếu true, không bao gồm dữ liệu mẫu. 
   * Mặc định hiện tại là TRUE để tránh lỗi phục hồi chi nhánh cũ.
   */
  getEmptyData: (minimal: boolean = true): AppData => ({
    version: SCHEMA_VERSION,
    lastSync: '',
    transactions: [],
    branches: minimal ? [] : [
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
    users: minimal ? [] : [
      { 
        id: 'admin_root', 
        username: 'admin', 
        password: 'admin123', 
        role: UserRole.SUPER_ADMIN, 
        assignedBranchIds: [], 
        preferences: { theme: 'dark', language: 'vi' }, 
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
