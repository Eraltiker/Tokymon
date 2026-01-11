
import { AppData, SCHEMA_VERSION, INITIAL_EXPENSE_CATEGORIES, Category, Transaction, Branch, User, RecurringTransaction, ReportSettings, UserRole } from '../types';

// Danh sách các key có thể chứa dữ liệu trong bucket
const POSSIBLE_KEYS = ['app_data', 'tokymon_v1', 'main'];

export class StorageService {
  static getEmptyData(): AppData {
    return {
      version: SCHEMA_VERSION,
      lastSync: new Date(0).toISOString(),
      transactions: [],
      branches: [],
      users: [
        { id: '1', username: 'admin', password: '123', role: UserRole.SUPER_ADMIN, assignedBranchIds: [], updatedAt: new Date().toISOString() }
      ],
      expenseCategories: [],
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
    };
  }

  static async loadLocal(): Promise<AppData> {
    const saved = localStorage.getItem('tokymon_master_data');
    if (!saved) return this.getEmptyData();
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.transactions) parsed.transactions = [];
      if (!parsed.branches) parsed.branches = [];
      if (!parsed.users || parsed.users.length === 0) {
        parsed.users = this.getEmptyData().users;
      }
      return parsed;
    } catch {
      return this.getEmptyData();
    }
  }

  static async saveLocal(data: AppData): Promise<void> {
    localStorage.setItem('tokymon_master_data', JSON.stringify(data));
  }

  /**
   * Đồng bộ với Cloud (KVDB.io)
   * Thử nghiệm nhiều Key khác nhau để tìm dữ liệu cũ
   */
  static async syncWithCloud(syncKey: string, localData: AppData, mode: 'poll' | 'push'): Promise<AppData> {
    // Nếu là PUSH, luôn đẩy vào key mặc định 'app_data'
    if (mode === 'push') {
      const url = `https://kvdb.io/${syncKey}/app_data?t=${Date.now()}`;
      console.log("[Storage] Đang đẩy dữ liệu lên Cloud (app_data)...");
      const payload = { ...localData, lastSync: new Date().toISOString() };
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Push thất bại: ${response.status}`);
      return payload;
    }

    // Nếu là POLL, thử tìm kiếm dữ liệu ở các key khả thi
    console.log("[Storage] Bắt đầu tìm kiếm dữ liệu trên Cloud...");
    
    for (const key of POSSIBLE_KEYS) {
      const url = `https://kvdb.io/${syncKey}/${key}?t=${Date.now()}`;
      try {
        console.log(`[Storage] Đang kiểm tra Key: ${key}...`);
        const response = await fetch(url);
        
        if (response.status === 404) continue;
        if (!response.ok) continue;

        const text = await response.text();
        if (!text || text === "null" || text.trim() === "" || text.trim() === "[]") {
          console.log(`[Storage] Key ${key} trống hoặc rỗng.`);
          continue;
        }

        const remoteData: AppData = JSON.parse(text);
        
        // Kiểm tra xem dữ liệu có thực sự chứa transactions hoặc branches không
        const hasContent = (remoteData.transactions && remoteData.transactions.length > 0) || 
                           (remoteData.branches && remoteData.branches.length > 0);
        
        if (hasContent) {
          console.log(`[Storage] Đã tìm thấy dữ liệu hợp lệ tại Key: ${key}`);
          return this.mergeAppData(localData, remoteData);
        } else {
          console.log(`[Storage] Key ${key} tồn tại nhưng không chứa dữ liệu giao dịch.`);
        }
      } catch (e) {
        console.warn(`[Storage] Lỗi khi đọc Key ${key}, bỏ qua...`);
      }
    }

    // Nếu duyệt hết các key mà không thấy gì
    console.warn("[Storage] Không tìm thấy dữ liệu cũ trên bất kỳ Key nào.");
    
    // Nếu local có dữ liệu, tự động đẩy lên app_data lần đầu
    if (localData.transactions.length > 0 || localData.branches.length > 0) {
      console.log("[Storage] Tự động khởi tạo app_data từ dữ liệu Local...");
      return await this.syncWithCloud(syncKey, localData, 'push');
    }

    return localData;
  }

  private static mergeAppData(local: AppData, remote: AppData): AppData {
    // Nếu máy hiện tại trống (Local chưa có gì), lấy 100% từ Cloud
    const isLocalEmpty = (local.transactions.length === 0 && local.branches.length === 0);
    if (isLocalEmpty) {
      console.log("[Storage] Phát hiện thiết bị mới. Đang nạp toàn bộ dữ liệu từ Cloud.");
      return {
        ...remote,
        lastSync: remote.lastSync || new Date().toISOString()
      };
    }

    // Nếu cả hai đều có dữ liệu, gộp an toàn
    const mergedTransactions = this.safeMergeArrays(local.transactions || [], remote.transactions || []);
    const mergedBranches = this.safeMergeArrays(local.branches || [], remote.branches || []);
    const mergedUsers = this.safeMergeArrays(local.users || [], remote.users || []);
    const mergedCategories = this.safeMergeArrays(local.expenseCategories || [], remote.expenseCategories || []);
    const mergedRecurring = this.safeMergeArrays(local.recurringExpenses || [], remote.recurringExpenses || []);

    // Bảo vệ admin
    if (!mergedUsers.some(u => u.username === 'admin')) {
      mergedUsers.push(this.getEmptyData().users[0]);
    }

    const rTime = new Date(remote.lastSync || 0).getTime() || 0;
    const lTime = new Date(local.lastSync || 0).getTime() || 0;
    const finalSync = rTime > lTime ? remote.lastSync : local.lastSync;

    return {
      ...remote,
      transactions: mergedTransactions,
      branches: mergedBranches,
      users: mergedUsers,
      expenseCategories: mergedCategories,
      recurringExpenses: mergedRecurring,
      lastSync: finalSync || new Date().toISOString()
    };
  }

  static safeMergeArrays<T extends { id: string; updatedAt: string }>(local: T[], remote: T[]): T[] {
    const map = new Map<string, T>();
    local.forEach(item => { if (item && item.id) map.set(item.id, item); });
    remote.forEach(remoteItem => {
      if (!remoteItem || !remoteItem.id) return;
      const localItem = map.get(remoteItem.id);
      if (!localItem) {
        map.set(remoteItem.id, remoteItem);
      } else {
        const rTime = new Date(remoteItem.updatedAt || 0).getTime() || 0;
        const lTime = new Date(localItem.updatedAt || 0).getTime() || 0;
        if (rTime >= lTime) map.set(remoteItem.id, remoteItem);
      }
    });
    return Array.from(map.values());
  }

  static mergeArrays = this.safeMergeArrays;
}
