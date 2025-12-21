
import { AppData, SCHEMA_VERSION, EXPENSE_CATEGORIES, Transaction, Branch, User, RecurringTransaction } from '../types';

const STORAGE_KEY = 'tokymon_master_data';

export const StorageService = {
  mergeArrays: <T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const map = new Map<string, T>();
    (local || []).forEach(item => map.set(item.id, item));
    (remote || []).forEach(remoteItem => {
      const localItem = map.get(remoteItem.id);
      if (!localItem || new Date(remoteItem.updatedAt) > new Date(localItem.updatedAt)) {
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
        .slice(-500)
    };
  },

  saveLocal: (data: AppData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  },

  loadLocal: (): AppData => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return StorageService.getEmptyData();
    try {
      const data = JSON.parse(raw);
      return {
        ...StorageService.getEmptyData(),
        ...data
      };
    } catch (e) {
      return StorageService.getEmptyData();
    }
  },

  getEmptyData: (): AppData => ({
    version: SCHEMA_VERSION,
    lastSync: '',
    transactions: [],
    branches: [{ id: 'b1', name: 'Tokymon Berlin', address: 'Alexanderplatz', initialCash: 0, initialCard: 0, updatedAt: new Date().toISOString() }],
    users: [{ id: 'admin_root', username: 'admin', password: 'admin', role: 'SUPER_ADMIN' as any, assignedBranchIds: ['b1'], updatedAt: new Date().toISOString() }],
    expenseCategories: EXPENSE_CATEGORIES,
    recurringExpenses: [],
    auditLogs: []
  }),

  syncWithCloud: async (bucketId: string, localData: AppData): Promise<AppData> => {
    const sanitizedId = bucketId?.trim();
    if (!sanitizedId) return localData;
    
    // Sử dụng URL đơn giản nhất của KVDB.io
    const BUCKET_URL = `https://kvdb.io/${sanitizedId}/main`;

    try {
      // 1. Thử lấy dữ liệu hiện tại từ Cloud
      const response = await fetch(BUCKET_URL, {
        method: 'GET',
        mode: 'cors'
      });

      let remoteData: AppData | null = null;
      
      if (response.ok) {
        const text = await response.text();
        if (text && text !== "null" && text.trim() !== "") {
          try {
            remoteData = JSON.parse(text);
          } catch (pError) {
            console.warn("Dữ liệu Cloud không hợp lệ, sẽ được ghi đè.");
          }
        }
      }

      // 2. Hợp nhất dữ liệu local và cloud (ưu tiên cái mới nhất theo updatedAt)
      const merged = remoteData ? StorageService.mergeAppData(localData, remoteData) : localData;

      // 3. Sử dụng PUT để ghi đè dữ liệu lên Cloud (KVDB khuyến khích PUT cho việc set giá trị)
      const saveResponse = await fetch(BUCKET_URL, {
        method: 'PUT',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(merged)
      });

      if (!saveResponse.ok) {
        throw new Error(`Cloud từ chối (Mã lỗi: ${saveResponse.status})`);
      }

      return merged;
    } catch (error: any) {
      console.error("Lỗi đồng bộ:", error);
      throw new Error(error.message || "Lỗi kết nối mạng");
    }
  }
};
