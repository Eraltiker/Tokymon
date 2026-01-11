
import { AppData, SCHEMA_VERSION, INITIAL_EXPENSE_CATEGORIES, Category, Transaction, Branch, User, RecurringTransaction, ReportSettings, UserRole } from '../types';

// DANH SÁCH CÁC KEY CŨ ĐÃ TỪNG CHỨA DỮ LIỆU - KHÔNG ĐƯỢC BỎ SÓT
const POSSIBLE_KEYS = ['tokymon_v1', 'main', 'app_data'];
const PRIMARY_KEY = 'app_data';

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
   * ĐÃ SỬA LỖI: Quét tất cả POSSIBLE_KEYS để không mất dữ liệu cũ.
   */
  static async syncWithCloud(syncKey: string, localData: AppData, mode: 'poll' | 'push'): Promise<AppData> {
    // Nếu PUSH, chúng ta đẩy lên PRIMARY_KEY để hợp nhất dần về một mối
    if (mode === 'push') {
      const url = `https://kvdb.io/${syncKey}/${PRIMARY_KEY}`;
      console.log(`[Storage] Đang lưu dữ liệu vào key chính: ${PRIMARY_KEY}...`);
      const payload = { ...localData, lastSync: new Date().toISOString() };
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Push thất bại: ${response.status}`);
      return payload;
    }

    // Nếu POLL, quét TẤT CẢ các key có thể chứa dữ liệu
    console.log("[Storage] Đang truy tìm dữ liệu cũ trên các key:", POSSIBLE_KEYS);
    let currentMergedData = { ...localData };

    for (const key of POSSIBLE_KEYS) {
      try {
        const url = `https://kvdb.io/${syncKey}/${key}?t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) continue;

        const text = await response.text();
        if (!text || text === "null" || text.trim() === "" || text.trim() === "[]") continue;

        const remoteData: AppData = JSON.parse(text);
        console.log(`[Storage] Đã tìm thấy dữ liệu tại key: ${key}. Đang thực hiện gộp...`);
        currentMergedData = this.mergeAppData(currentMergedData, remoteData);
      } catch (e) {
        console.warn(`[Storage] Không thể đọc key ${key}:`, e);
      }
    }

    return currentMergedData;
  }

  private static mergeAppData(local: AppData, remote: AppData): AppData {
    // Gộp tất cả các mảng dữ liệu quan trọng, ưu tiên bản ghi có updatedAt mới nhất
    const mergedTransactions = this.safeMergeArrays(local.transactions || [], remote.transactions || []);
    const mergedBranches = this.safeMergeArrays(local.branches || [], remote.branches || []);
    const mergedUsers = this.safeMergeArrays(local.users || [], remote.users || []);
    const mergedCategories = this.safeMergeArrays(local.expenseCategories || [], remote.expenseCategories || []);
    const mergedRecurring = this.safeMergeArrays(local.recurringExpenses || [], remote.recurringExpenses || []);

    // Đảm bảo admin luôn tồn tại
    if (!mergedUsers.some(u => u.username === 'admin')) {
      mergedUsers.push(this.getEmptyData().users[0]);
    }

    const rTime = new Date(remote.lastSync || 0).getTime();
    const lTime = new Date(local.lastSync || 0).getTime();
    const finalSync = rTime > lTime ? remote.lastSync : local.lastSync;

    return {
      ...remote, // Giữ các settings từ remote nếu có
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
    // Nạp local vào map trước
    local.forEach(item => { if (item && item.id) map.set(item.id, item); });
    
    // Duyệt remote, nếu id đã có thì so sánh thời gian cập nhật
    remote.forEach(remoteItem => {
      if (!remoteItem || !remoteItem.id) return;
      const localItem = map.get(remoteItem.id);
      if (!localItem) {
        map.set(remoteItem.id, remoteItem);
      } else {
        const rTime = new Date(remoteItem.updatedAt || 0).getTime();
        const lTime = new Date(localItem.updatedAt || 0).getTime();
        if (rTime >= lTime) map.set(remoteItem.id, remoteItem);
      }
    });
    return Array.from(map.values());
  }

  static mergeArrays = this.safeMergeArrays;
}
