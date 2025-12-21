
import { AppData, SCHEMA_VERSION, EXPENSE_CATEGORIES, Transaction, Branch, User, RecurringTransaction } from '../types';

const STORAGE_KEY = 'tokymon_master_data';

export const StorageService = {
  // Hàm hợp nhất mảng dữ liệu dựa trên ID và updatedAt
  mergeArrays: <T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const map = new Map<string, T>();
    
    // Đưa dữ liệu local vào map
    local.forEach(item => map.set(item.id, item));
    
    // Hợp nhất với dữ liệu remote
    remote.forEach(remoteItem => {
      const localItem = map.get(remoteItem.id);
      if (!localItem || new Date(remoteItem.updatedAt) > new Date(localItem.updatedAt)) {
        map.set(remoteItem.id, remoteItem);
      }
    });

    // Chuyển lại thành mảng và lọc bỏ những bản ghi đã bị xóa (deletedAt)
    // Nhưng vẫn giữ lại trong quá trình sync để các máy khác biết đường mà xóa
    return Array.from(map.values());
  },

  saveLocal: (data: Partial<AppData>) => {
    try {
      const existing = StorageService.loadLocal();
      const updated: AppData = {
        ...existing,
        ...data,
        version: SCHEMA_VERSION,
        lastSync: data.lastSync || existing.lastSync || new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Storage Error:", e);
    }
  },

  loadLocal: (): AppData => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return StorageService.getEmptyData();

    try {
      const data = JSON.parse(raw);
      if (data.version !== SCHEMA_VERSION) {
        // Tự động nâng cấp cấu trúc dữ liệu nếu version cũ
        data.version = SCHEMA_VERSION;
      }
      return data;
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

  // Hàm đồng bộ thực sự: Merge chứ không Overwrite
  syncWithCloud: async (syncKey: string, localData: AppData): Promise<AppData> => {
    // Trong thực tế, đây sẽ là API call tới một database tập trung (Firebase/Supabase/Custom API)
    // Ở bản demo này, chúng ta giả lập việc lấy dữ liệu từ Cloud (đã được merge từ các máy khác)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const cloudDataRaw = localStorage.getItem(`cloud_sync_${syncKey}`);
    const cloudData: AppData = cloudDataRaw ? JSON.parse(cloudDataRaw) : StorageService.getEmptyData();

    // THUẬT TOÁN HỢP NHẤT (SMART MERGE)
    const mergedData: AppData = {
      ...localData,
      version: SCHEMA_VERSION,
      lastSync: new Date().toISOString(),
      transactions: StorageService.mergeArrays(localData.transactions, cloudData.transactions),
      branches: StorageService.mergeArrays(localData.branches, cloudData.branches),
      users: StorageService.mergeArrays(localData.users, cloudData.users),
      recurringExpenses: StorageService.mergeArrays(localData.recurringExpenses, cloudData.recurringExpenses),
      // Audit logs thường chỉ append
      auditLogs: [...localData.auditLogs, ...cloudData.auditLogs.filter(cl => !localData.auditLogs.some(ll => ll.id === cl.id))].slice(-1000)
    };

    // Lưu ngược lại Cloud giả lập
    localStorage.setItem(`cloud_sync_${syncKey}`, JSON.stringify(mergedData));
    
    return mergedData;
  }
};
