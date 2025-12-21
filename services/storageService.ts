
import { AppData, SCHEMA_VERSION, EXPENSE_CATEGORIES, Transaction, Branch, User, RecurringTransaction } from '../types';

const STORAGE_KEY = 'tokymon_master_data';

export const StorageService = {
  // Hàm hợp nhất mảng dữ liệu dựa trên ID và thời gian cập nhật (updatedAt)
  mergeArrays: <T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const map = new Map<string, T>();
    
    // Nạp dữ liệu hiện tại vào map
    local.forEach(item => map.set(item.id, item));
    
    // Hợp nhất với dữ liệu mới
    remote.forEach(remoteItem => {
      const localItem = map.get(remoteItem.id);
      // Nếu chưa có hoặc bản ghi mới có thời gian cập nhật muộn hơn thì ghi đè
      if (!localItem || new Date(remoteItem.updatedAt) > new Date(localItem.updatedAt)) {
        map.set(remoteItem.id, remoteItem);
      }
    });

    return Array.from(map.values());
  },

  // Hợp nhất toàn bộ dữ liệu ứng dụng
  mergeAppData: (local: AppData, remote: AppData): AppData => {
    return {
      version: SCHEMA_VERSION,
      lastSync: new Date().toISOString(),
      transactions: StorageService.mergeArrays(local.transactions, remote.transactions),
      branches: StorageService.mergeArrays(local.branches, remote.branches),
      users: StorageService.mergeArrays(local.users, remote.users),
      expenseCategories: Array.from(new Set([...local.expenseCategories, ...remote.expenseCategories])),
      recurringExpenses: StorageService.mergeArrays(local.recurringExpenses, remote.recurringExpenses),
      auditLogs: [...local.auditLogs, ...remote.auditLogs.filter(r => !local.auditLogs.some(l => l.id === r.id))].slice(-500)
    };
  },

  saveLocal: (data: AppData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Lỗi lưu trữ cục bộ:", e);
    }
  },

  loadLocal: (): AppData => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return StorageService.getEmptyData();
    try {
      const data = JSON.parse(raw);
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

  // Xuất dữ liệu ra file
  exportToFile: (data: AppData) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tokymon_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Giả lập đồng bộ Cloud (Thực tế sẽ gọi API)
  // Để đồng bộ thực sự qua Internet, bạn cần một Database (Firebase/Supabase)
  // Ở đây tôi cải tiến để nó chuẩn bị sẵn cấu trúc cho API thật
  syncWithCloud: async (syncKey: string, localData: AppData): Promise<AppData> => {
    // Đây là nơi bạn sẽ gọi: fetch('https://your-api.com/sync', { method: 'POST', body: localData })
    // Hiện tại chúng tôi vẫn dùng localStorage làm 'Cloud giả lập' để demo logic
    await new Promise(resolve => setTimeout(resolve, 800));
    const cloudDataRaw = localStorage.getItem(`cloud_storage_${syncKey}`);
    const cloudData: AppData = cloudDataRaw ? JSON.parse(cloudDataRaw) : StorageService.getEmptyData();

    const merged = StorageService.mergeAppData(localData, cloudData);
    localStorage.setItem(`cloud_storage_${syncKey}`, JSON.stringify(merged));
    return merged;
  }
};
