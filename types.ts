
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface Category {
  id: string;
  name: string;
  branchId: string;
  updatedAt: string;
  deletedAt?: string;
}

export const INITIAL_EXPENSE_CATEGORIES: string[] = [
  'Tiền nhà / Điện', 'Rác', 'Lương công nhân', 'Nguyên liệu', 'Thuế', 'Bonus', 'Gutschein', 'Sai', 'Nợ / Tiền ứng', 'Bảo hiểm', 'Chi phí khác'
];

export enum ExpenseSource {
  SHOP_CASH = 'SHOP_CASH',
  WALLET = 'WALLET',
  CARD = 'CARD'
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: Language;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  VIEWER = 'VIEWER'
}

export type Language = 'vi' | 'de';

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
  updatedAt: string;
  deletedAt?: string;
  preferences?: UserPreferences;
}

export interface IncomeBreakdown {
  cash: number;
  card: number;
  delivery?: number;
  coins?: number;
}

export interface HistoryEntry {
  timestamp: string;
  amount: number;
  category: string;
  notes: string[]; // Thay đổi từ note sang notes
  editorName?: string;
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
  notes: string[]; // Thay đổi từ note sang notes
  authorName?: string;
  lastEditorName?: string;
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
  notes: string[]; // Đồng bộ dữ liệu ghi chú
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

export const APP_CHANGELOG = [
  {
    version: '1.1.0',
    changes: {
      vi: ['Hỗ trợ thêm nhiều khung ghi chú linh hoạt', 'Gợi ý ghi chú thông minh từ dữ liệu cũ', 'Nút ẩn/hiện tiền xu và ghi chú tối ưu diện tích'],
      de: ['Unterstützung für mehrere flexible Notizfelder', 'Intelligente Notizvorschläge aus alten Daten', 'Optimierte Schaltflächen zum Ein-/Ausblenden von Münzen und Notizen']
    }
  }
];

export const SCHEMA_VERSION = "1.1.0 (Multi-Note & Smart suggestions)";
export const ALL_BRANCHES_ID = "all_branches_system";

export const formatCurrency = (val: number, lang: Language = 'vi') => 
  new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'de-DE', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(val);

export const EXPENSE_SOURCE_LABELS: Record<ExpenseSource, string> = {
  [ExpenseSource.SHOP_CASH]: 'Tiền Quán',
  [ExpenseSource.WALLET]: 'Ví Tổng',
  [ExpenseSource.CARD]: 'Thẻ/Bank'
};

export const DEFAULT_RECURRING_TEMPLATE = {
  amount: 0,
  category: '',
  expenseSource: ExpenseSource.WALLET,
  dayOfMonth: 1,
  notes: []
};
