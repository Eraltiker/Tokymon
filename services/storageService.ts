
import { AppData, SCHEMA_VERSION, EXPENSE_CATEGORIES, Transaction, Branch, User, RecurringTransaction } from '../types';

const STORAGE_KEY = 'tokymon_master_data';

export const StorageService = {
  // Hàm gộp mảng dựa trên ID và thời gian cập nhật mới nhất
  mergeArrays: <T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const map = new Map<string, T>();
    
    // Nạp dữ liệu local vào map
    (local || []).forEach(item => {
      if (item && item.id) map.set(item.id, item);
    });

    // Duyệt dữ liệu remote, nếu remote mới hơn hoặc local chưa có thì ghi đè
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
    // Đảm bảo các mảng không bị undefined trước khi gộp
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
    } catch (e) {
      console.error("Lưu LocalStorage thất bại", e);
    }
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
    
    const BUCKET_URL = `https://kvdb.io/${sanitizedId}/main`;

    try {
      // 1. Thử lấy dữ liệu từ Cloud
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
            console.warn("Dữ liệu Cloud bị lỗi định dạng, sẽ khởi tạo lại.");
          }
        }
      }

      // 2. Gộp dữ liệu
      const merged = remoteData ? StorageService.mergeAppData(localData, remoteData) : localData;

      // 3. Đẩy dữ liệu lên Cloud
      const saveResponse = await fetch(BUCKET_URL, {
        method: 'PUT',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });

      if (!saveResponse.ok) {
        throw new Error(`Cloud không phản hồi (${saveResponse.status})`);
      }

      return merged;
    } catch (error: any) {
      console.error("Lỗi kĩ thuật đồng bộ:", error);
      throw error;
    }
  }
};
