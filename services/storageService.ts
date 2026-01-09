
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

export const StorageService = {
  // Merge cực nhanh sử dụng Map và xử lý Tombstone (Xóa mềm)
  mergeArrays: <T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const combinedMap = new Map<string, T>();
    const all = [...(local || []), ...(remote || [])];

    for (const item of all) {
      if (!item?.id) continue;
      const existing = combinedMap.get(item.id);
      if (!existing) {
        combinedMap.set(item.id, item);
        continue;
      }
      const existingTime = new Date(existing.updatedAt).getTime();
      const itemTime = new Date(item.updatedAt).getTime();

      if (itemTime > existingTime) {
        combinedMap.set(item.id, item);
      } else if (itemTime === existingTime && item.deletedAt) {
        combinedMap.set(item.id, item);
      }
    }
    return Array.from(combinedMap.values());
  },

  mergeAppData: (local: AppData, remote: AppData): AppData => {
    return {
      version: SCHEMA_VERSION,
      lastSync: new Date().toISOString(),
      transactions: StorageService.mergeArrays(local.transactions, remote.transactions),
      branches: StorageService.mergeArrays(local.branches, remote.branches),
      users: StorageService.mergeArrays(local.users, remote.users),
      expenseCategories: StorageService.mergeArrays(local.expenseCategories, remote.expenseCategories),
      recurringExpenses: StorageService.mergeArrays(local.recurringExpenses, remote.recurringExpenses),
      // Chỉ giữ 50 audit logs mới nhất để tiết kiệm băng thông Cloud
      auditLogs: [...(local.auditLogs || []), ...(remote.auditLogs || [])]
        .filter((v, i, a) => v?.id && a.findIndex(t => t.id === v.id) === i)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50),
      reportSettings: remote.reportSettings || local.reportSettings,
      logoUrl: remote.logoUrl || local.logoUrl
    };
  },

  async syncWithCloud(syncKey: string, localData: AppData, mode: 'poll' | 'push' = 'poll'): Promise<AppData> {
    if (!syncKey) return localData;
    const baseUrl = `https://kvdb.io/${syncKey}/tokymon_v1`;
    const metaUrl = `https://kvdb.io/${syncKey}/tokymon_meta`;
    
    try {
      const now = new Date().toISOString();

      // 1. CHẾ ĐỘ PUSH: Đẩy dữ liệu ngay lập tức
      if (mode === 'push') {
        const payload = JSON.stringify(localData);
        await Promise.all([
          fetch(baseUrl, { method: 'POST', body: payload, priority: 'high' as any }),
          fetch(metaUrl, { method: 'POST', body: JSON.stringify({ updatedAt: now, size: payload.length }), priority: 'high' as any })
        ]);
        return { ...localData, lastSync: now };
      }

      // 2. CHẾ ĐỘ POLL: Kiểm tra Metadata trước khi tải nặng
      const metaRes = await fetch(`${metaUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (metaRes.ok) {
        const remoteMeta = await metaRes.json();
        const localLastSync = localData.lastSync ? new Date(localData.lastSync).getTime() : 0;
        const remoteLastUpdate = remoteMeta.updatedAt ? new Date(remoteMeta.updatedAt).getTime() : 0;

        // Nếu Cloud không có gì mới hơn Local, bỏ qua tải dữ liệu (Tiết kiệm thời gian)
        if (remoteLastUpdate <= localLastSync && localLastSync !== 0) {
          return localData;
        }
      }

      // 3. TẢI VÀ MERGE NẾU CÓ THAY ĐỔI
      const dataRes = await fetch(`${baseUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (!dataRes.ok) throw new Error("Fetch failed");
      
      const remoteData = await dataRes.json();
      const merged = StorageService.mergeAppData(localData, remoteData);
      
      // Cập nhật ngược lại Cloud nếu dữ liệu Local có cái mới hơn
      if (merged.lastSync !== remoteData.lastSync) {
         this.syncWithCloud(syncKey, merged, 'push').catch(() => {});
      }
      
      return merged;
    } catch (e) {
      console.warn("Sync optimized fallback:", e);
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
