
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export const EXPENSE_CATEGORIES = [
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

export interface Branch {
  id: string;
  name: string;
  address: string;
  initialCash: number;
  initialCard: number;
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
  entityType: 'TRANSACTION' | 'USER' | 'BRANCH';
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
  expenseCategories: string[];
  recurringExpenses: RecurringTransaction[];
  auditLogs: AuditLogEntry[];
  reportSettings?: ReportSettings;
  logoUrl?: string; 
}

export const SCHEMA_VERSION = "3.2.5";
export const ALL_BRANCHES_ID = "all_branches_system";

export const APP_CHANGELOG = [
  {
    version: "3.2.5",
    date: "2024-05-27",
    changes: {
      vi: ["Tái thiết kế màn hình Đăng nhập theo phong cách Glassmorphism cao cấp", "Cải thiện độ tương phản và hiển thị của các ô nhập liệu", "Tối ưu hóa bố cục logo và tiêu đề chuyên nghiệp hơn", "Chuyển đổi ngôn ngữ mượt mà ngay tại màn hình chờ"],
      de: ["Neugestaltung des Login-Bildschirms im Premium-Glassmorphism-Stil", "Verbesserter Kontrast und Anzeige von Eingabefeldern", "Optimiertes Logo-Layout und professionelle Titel", "Reibungslose Sprachumschaltung im Standby-Bildschirm"]
    }
  },
  {
    version: "3.2.4",
    date: "2024-05-26",
    changes: {
      vi: ["Tối ưu Typography: Tăng kích thước font chữ toàn hệ thống", "Theme Light mới: Chống chói, tăng độ tương phản đọc", "Cải thiện bố cục Dashboard trực quan hơn", "Tăng kích thước các nút bấm và ô nhập liệu"],
      de: ["Typography-Optimierung: Größere Schriftarten im gesamten System", "Neues Light-Theme: Blendfrei mit besserem Kontrast", "Verbessertes Dashboard-Layout", "Größere Schaltflächen und Eingabefelder"]
    }
  }
];

export const formatCurrency = (val: number, lang: Language = 'vi') => 
  new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'de-DE', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(val);
