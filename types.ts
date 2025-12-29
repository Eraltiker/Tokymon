
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface Category {
  id: string;
  name: string;
  updatedAt: string;
  deletedAt?: string;
}

export const INITIAL_EXPENSE_CATEGORIES: string[] = [
  'Tiền nhà / Điện', 'Rác', 'Lương công nhân', 'Nguyên liệu', 'Thuế', 'Bonus', 'Gutschein', 'Sai', 'Nợ / Tiền ứng', 'Chi phí khác', 'Bảo hiểm'
];

export enum ExpenseSource {
  SHOP_CASH = 'SHOP_CASH',
  WALLET = 'WALLET',
  CARD = 'CARD'
}

export const EXPENSE_SOURCE_LABELS: Record<ExpenseSource, string> = {
  [ExpenseSource.SHOP_CASH]: 'Tiền Quán',
  [ExpenseSource.WALLET]: 'Ví Tổng',
  [ExpenseSource.CARD]: 'Thẻ/Bank'
};

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  VIEWER = 'VIEWER'
}

export type Language = 'vi' | 'de';

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: Language;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  initialCash: number;
  initialCard: number;
  color?: string; 
  updatedAt: string;
  deletedAt?: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  assignedBranchIds: string[];
  preferences?: UserPreferences;
  updatedAt: string;
  deletedAt?: string;
}

export interface IncomeBreakdown {
  cash: number;
  card: number;
  delivery?: number;
  actualCash?: number;
  tip?: number;
}

export interface HistoryEntry {
  timestamp: string;
  amount: number;
  category: string;
  note: string;
  incomeBreakdown?: IncomeBreakdown;
  expenseSource?: ExpenseSource;
  isPaid?: boolean;
}

export interface Transaction {
  id: string;
  branchId: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  note: string;
  incomeBreakdown?: IncomeBreakdown;
  expenseSource?: ExpenseSource;
  isRecurring?: boolean;
  isPaid?: boolean; 
  debtorName?: string;
  updatedAt: string;
  deletedAt?: string;
  history: HistoryEntry[];
}

export interface RecurringTransaction {
  id: string;
  branchId: string;
  amount: number;
  category: string;
  expenseSource: ExpenseSource;
  dayOfMonth: number;
  note: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';
  entityType: 'TRANSACTION' | 'USER' | 'BRANCH' | 'CATEGORY';
  entityId: string;
  details: string;
}

export interface ReportSettings {
  showSystemTotal: boolean;
  showShopRevenue: boolean;
  showAppRevenue: boolean;
  showCardRevenue: boolean;
  showActualCash: boolean;
  showProfit: boolean;
}

export interface AppData {
  version: string;
  lastSync: string;
  transactions: Transaction[];
  branches: Branch[];
  users: User[];
  expenseCategories: Category[];
  recurringExpenses: RecurringTransaction[];
  auditLogs: AuditLogEntry[];
  reportSettings?: ReportSettings;
  logoUrl?: string; 
}

export const SCHEMA_VERSION = "1.0.4 (Hard Tombstone Fix)";
export const ALL_BRANCHES_ID = "all_branches_system";

export const APP_CHANGELOG = [
  {
    version: "1.0.4",
    date: "2024-05-26",
    changes: {
      vi: [
        "Sửa lỗi 'Dữ liệu hồi sinh': Buộc hệ thống giữ lại vết tích xóa (Tombstone) vĩnh viễn trong Database để đồng bộ chính xác trên tất cả thiết bị.",
        "Cập nhật tab About: Hiển thị nhật ký thay đổi và thông tin hỗ trợ kỹ thuật.",
        "Tối ưu hóa dung lượng lưu trữ: Tự động nén dữ liệu cũ nhưng vẫn giữ nguyên tính toàn vẹn.",
        "Gia cố bảo mật: Mã hóa nhẹ dữ liệu Local trước khi lưu vào IndexedDB."
      ],
      de: [
        "Behebung des 'Wiederauferstehungs-Fehlers': Das System behält Löschmarkierungen (Tombstones) nun permanent in der Datenbank, um eine korrekte Synchronisierung auf allen Geräten zu gewährleisten.",
        "About-Tab aktualisiert: Anzeige des Änderungsprotokolls und technischer Support-Informationen.",
        "Speicherplatzoptimierung: Automatische Komprimierung alter Daten bei gleichzeitiger Wahrung der Integrität.",
        "Sicherheitsverbesserung: Leichte Verschlüsselung lokaler Daten vor dem Speichern in IndexedDB."
      ]
    }
  },
  {
    version: "1.0.3",
    date: "2024-05-25",
    changes: {
      vi: ["Chuyển đổi Hạng mục sang ID-based.", "Cải thiện Atomic Update."],
      de: ["Umstellung der Kategorien auf ID-basiert.", "Verbessertes Atomic Update."]
    }
  }
];

export const formatCurrency = (val: number, lang: Language = 'vi') => 
  new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'de-DE', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(val);
