
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
   * Quy tắc:
   * 1. Bản ghi mới nhất (updatedAt lớn nhất) thắng.
   * 2. Nếu updatedAt bằng nhau: Bản ghi nào có deletedAt THẮNG (Ưu tiên xóa).
   * 3. Nếu một bên đã xóa và bên kia vẫn sống: Chỉ cho phép "sống lại" nếu bản ghi sống có updatedAt MỚI HƠN hẳn bản ghi xóa.
   */
  mergeArrays: <T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const combinedMap = new Map<string, T>();
    
    // Gộp tất cả IDs từ cả 2 nguồn
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
          // Local mới hơn: Nếu local đã xóa, remote không được hồi sinh nó
          combinedMap.set(id, l);
        } else if (rTime > lTime) {
          // Remote mới hơn: Chấp nhận dữ liệu từ Cloud
          combinedMap.set(id, r);
        } else {
          // Thời gian bằng nhau: Ưu tiên trạng thái đã xóa (Tombstone)
          if (l.deletedAt || r.deletedAt) {
            combinedMap.set(id, l.deletedAt ? l : r);
          } else {
            combinedMap.set(id, l);
          }
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
        const res = await fetch(url, {
          method: 'POST',
          body: JSON.stringify(localData),
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.status === 429) return localData;
        return { ...localData, lastSync: new Date().toISOString() };
      }

      // Lấy dữ liệu từ Cloud
      const response = await fetch(url, { cache: 'no-store' });
      if (response.status === 429) return localData;

      let remoteData: AppData;
      if (response.ok) {
        const text = await response.text();
        try {
          remoteData = JSON.parse(text);
        } catch (e) {
          remoteData = StorageService.getEmptyData();
        }
      } else {
        remoteData = StorageService.getEmptyData();
      }

      // Gộp dữ liệu
      const merged = StorageService.mergeAppData(localData, remoteData);
      
      // Đẩy ngược lại Cloud ngay lập tức bản gộp (để chốt các Tombstones)
      await fetch(url, {
        method: 'POST',
        body: JSON.stringify(merged),
        headers: { 'Content-Type': 'application/json' }
      });

      return merged;
    } catch (e) {
      console.error("Sync Failure:", e);
      throw e;
    }
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

      if (!data) return StorageService.getEmptyData();
      const empty = StorageService.getEmptyData();
      return {
        ...empty,
        ...data,
        transactions: data.transactions || [],
        branches: data.branches || empty.branches,
        users: data.users || empty.users,
        expenseCategories: data.expenseCategories || empty.expenseCategories,
        recurringExpenses: data.recurringExpenses || [],
        auditLogs: data.auditLogs || []
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
