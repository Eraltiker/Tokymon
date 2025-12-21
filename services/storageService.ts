
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
    if (!bucketId || bucketId.trim() === '') return localData;
    
    const BUCKET_URL = `https://kvdb.io/buckets/${bucketId.trim()}/values/main`;

    try {
      // 1. Thử lấy dữ liệu từ Cloud
      const response = await fetch(BUCKET_URL);
      let remoteData: AppData | null = null;
      
      if (response.ok) {
        const text = await response.text();
        if (text) {
          remoteData = JSON.parse(text);
        }
      } else if (response.status !== 404) {
        // Nếu không phải 404 và cũng không phải 200 (ví dụ 500), coi như lỗi mạng
        throw new Error(`Cloud Error: ${response.status}`);
      }

      // 2. Hợp nhất dữ liệu (Nếu cloud trống thì merged chính là local)
      const merged = remoteData ? StorageService.mergeAppData(localData, remoteData) : localData;

      // 3. Đẩy bản hợp nhất lên Cloud (Cập nhật hoặc Khởi tạo lần đầu)
      const saveResponse = await fetch(BUCKET_URL, {
        method: 'POST',
        body: JSON.stringify(merged)
      });

      if (!saveResponse.ok) {
        throw new Error("Không thể ghi dữ liệu lên Cloud");
      }

      return merged;
    } catch (error) {
      console.error("Lỗi đồng bộ:", error);
      throw error; // Ném lỗi để App.tsx xử lý UI
    }
  }
};
