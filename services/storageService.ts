
import { AppData, SCHEMA_VERSION, EXPENSE_CATEGORIES, Transaction, Branch, User, RecurringTransaction } from '../types';

const STORAGE_KEY = 'tokymon_master_data';

export const StorageService = {
  // Mã hóa chuỗi Unicode sang Base64 an toàn
  encodeSyncCode: (data: AppData): string => {
    try {
      const str = JSON.stringify(data);
      const bytes = new TextEncoder().encode(str);
      let binString = "";
      bytes.forEach((byte) => { binString += String.fromCharCode(byte); });
      return btoa(binString);
    } catch (e) {
      console.error("Encoding error:", e);
      return "";
    }
  },

  // Giải mã Base64 sang đối tượng dữ liệu
  decodeSyncCode: (code: string): AppData | null => {
    try {
      const binString = atob(code);
      const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
      const str = new TextDecoder().decode(bytes);
      return JSON.parse(str);
    } catch (e) {
      console.error("Decoding error:", e);
      return null;
    }
  },

  mergeArrays: <T extends { id: string; updatedAt: string; deletedAt?: string }>(local: T[], remote: T[]): T[] => {
    const map = new Map<string, T>();
    local.forEach(item => map.set(item.id, item));
    remote.forEach(remoteItem => {
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
      auditLogs: [...(local.auditLogs || []), ...(remote.auditLogs || []).filter(r => !(local.auditLogs || []).some(l => l.id === r.id))].slice(-500)
    };
  },

  saveLocal: (data: AppData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Local storage save error:", e);
    }
  },

  loadLocal: (): AppData => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return StorageService.getEmptyData();
    try {
      const data = JSON.parse(raw);
      if (data.transactions) {
        data.transactions = data.transactions.map((tx: any) => ({
          ...tx,
          history: tx.history || []
        }));
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

  exportToFile: (data: AppData) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tokymon_sync_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  syncWithCloud: async (syncKey: string, localData: AppData): Promise<AppData> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const cloudKey = `cloud_v2_${syncKey}`;
    const cloudDataRaw = localStorage.getItem(cloudKey);
    const cloudData: AppData = cloudDataRaw ? JSON.parse(cloudDataRaw) : StorageService.getEmptyData();
    const merged = StorageService.mergeAppData(localData, cloudData);
    localStorage.setItem(cloudKey, JSON.stringify(merged));
    return merged;
  }
};
