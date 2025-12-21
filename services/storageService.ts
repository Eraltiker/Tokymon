
import { AppData, SCHEMA_VERSION, EXPENSE_CATEGORIES, Transaction, Branch, User, RecurringTransaction } from '../types';

const STORAGE_KEY = 'tokymon_master_data';

export const StorageService = {
  encodeSyncCode: (data: AppData): string => {
    try {
      const str = JSON.stringify(data);
      const bytes = new TextEncoder().encode(str);
      let binString = "";
      bytes.forEach((byte) => { binString += String.fromCharCode(byte); });
      return btoa(binString);
    } catch (e) {
      return "";
    }
  },

  decodeSyncCode: (code: string): AppData | null => {
    try {
      const binString = atob(code);
      const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
      const str = new TextDecoder().decode(bytes);
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  },

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
    // Đảm bảo các mảng luôn tồn tại để tránh lỗi
    const mergedTransactions = StorageService.mergeArrays(local.transactions || [], remote.transactions || []);
    const mergedBranches = StorageService.mergeArrays(local.branches || [], remote.branches || []);
    const mergedUsers = StorageService.mergeArrays(local.users || [], remote.users || []);
    const mergedRecurring = StorageService.mergeArrays(local.recurringExpenses || [], remote.recurringExpenses || []);
    
    // Gộp danh mục (vì là mảng string đơn giản, ta gộp và loại bỏ trùng lặp)
    const mergedCategories = Array.from(new Set([...(local.expenseCategories || []), ...(remote.expenseCategories || [])]));

    return {
      version: SCHEMA_VERSION,
      lastSync: new Date().toISOString(),
      transactions: mergedTransactions,
      branches: mergedBranches,
      users: mergedUsers,
      expenseCategories: mergedCategories,
      recurringExpenses: mergedRecurring,
      auditLogs: [...(local.auditLogs || []), ...(remote.auditLogs || []).filter(r => !(local.auditLogs || []).some(l => l.id === r.id))].slice(-500)
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
      // Đảm bảo dữ liệu cũ vẫn tương thích
      return {
        ...StorageService.getEmptyData(),
        ...data,
        transactions: (data.transactions || []).map((tx: any) => ({ ...tx, history: tx.history || [] }))
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

  syncWithCloud: async (syncKey: string, localData: AppData): Promise<AppData> => {
    // Giả lập gọi API lên Cloud Server
    const cloudKey = `tokymon_cloud_v3_${syncKey}`;
    const cloudDataRaw = localStorage.getItem(cloudKey);
    const cloudData: AppData = cloudDataRaw ? JSON.parse(cloudDataRaw) : StorageService.getEmptyData();
    
    // Thuật toán Merge 2 chiều
    const merged = StorageService.mergeAppData(localData, cloudData);
    
    // Cập nhật ngược lại Cloud
    localStorage.setItem(cloudKey, JSON.stringify(merged));
    return merged;
  }
};
