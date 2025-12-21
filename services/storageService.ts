
import { AppData, SCHEMA_VERSION, EXPENSE_CATEGORIES } from '../types';

const STORAGE_KEY = 'tokymon_master_data';

export const StorageService = {
  // Lưu dữ liệu vào localStorage kèm metadata
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
      console.error("Lỗi khi lưu dữ liệu:", e);
    }
  },

  // Load và thực hiện migration nếu cần
  loadLocal: (): AppData => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return StorageService.getEmptyData();

    try {
      let data = JSON.parse(raw);
      
      // Migration logic: Nếu version cũ, thực hiện chuyển đổi cấu trúc ở đây
      if (data.version !== SCHEMA_VERSION) {
        console.log(`Migrating data from ${data.version} to ${SCHEMA_VERSION}`);
        data.version = SCHEMA_VERSION;
        // Ví dụ: Bổ sung updatedAt cho dữ liệu cũ nếu thiếu
        data.transactions = data.transactions.map((t: any) => ({ ...t, updatedAt: t.updatedAt || new Date().toISOString() }));
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
    // Fix: Use the exported EXPENSE_CATEGORIES constant
    expenseCategories: EXPENSE_CATEGORIES,
    recurringExpenses: [],
    auditLogs: []
  }),

  // Giả lập API đồng bộ đám mây
  // Trong thực tế, đây sẽ là call tới Firebase/Supabase/REST API
  syncWithCloud: async (syncKey: string, localData: AppData): Promise<AppData> => {
    // Giả lập delay mạng
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Logic: Gửi syncKey và localData lên server.
    // Server sẽ merge và trả về data mới nhất.
    // Ở đây ta giả lập bằng cách trả về chính data đó nhưng cập nhật timestamp sync.
    const syncedData = {
      ...localData,
      lastSync: new Date().toISOString()
    };
    
    return syncedData;
  }
};