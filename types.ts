
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

export const SCHEMA_VERSION = "3.5.3";
export const ALL_BRANCHES_ID = "all_branches_system";

export const APP_CHANGELOG = [
  {
    version: "3.5.3",
    date: "2024-06-20",
    changes: {
      vi: [
        "iOS Fix Pro: Khắc phục triệt để lỗi quét hóa đơn trên iPhone/iPad.",
        "Bộ nhớ tối ưu: Quy trình xử lý ảnh mới không gây lag trình duyệt mobile.",
        "AI Precision: Cải thiện độ chính xác khi đọc số tiền và ngày tháng.",
        "Camera Ultra: Tương thích tốt hơn với hệ thống camera của iOS Safari."
      ],
      de: [
        "iOS Fix Pro: Belegscan-Fehler auf iPhone/iPad endgültig behoben.",
        "Speicheroptimierung: Neuer Bildverarbeitungsprozess ohne Mobile-Lag.",
        "KI-Präzision: Verbesserte Genauigkeit beim Lesen von Beträgen und Daten.",
        "Camera Ultra: Bessere Kompatibilität mit iOS Safari-Kamerasystemen."
      ]
    }
  },
  {
    version: "3.5.2",
    date: "2024-06-15",
    changes: {
      vi: [
        "iOS Elite UI: Giao diện đăng nhập mới phong cách Apple.",
        "Smooth Motion: Hiệu ứng chuyển cảnh mượt mà 120Hz."
      ],
      de: [
        "iOS Elite UI: Neues Login-Interface im Apple-Stil.",
        "Smooth Motion: 120Hz Übergangseffekte."
      ]
    }
  }
];

export const formatCurrency = (val: number, lang: Language = 'vi') => 
  new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'de-DE', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(val);
