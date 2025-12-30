
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

// Template chi phí định kỳ mặc định cho chi nhánh mới
export const DEFAULT_RECURRING_TEMPLATE = [
  { category: 'Tiền nhà / Điện', amount: 0, day: 1, note: 'Tiền nhà định kỳ' },
  { category: 'Lương công nhân', amount: 0, day: 1, note: 'Lương nhân viên' },
  { category: 'Bảo hiểm', amount: 0, day: 1, note: 'Bảo hiểm kinh doanh' },
  { category: 'Rác', amount: 0, day: 1, note: 'Tiền rác hàng tháng' }
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

export const SCHEMA_VERSION = "1.0.6 (Branch Auto-Seed)";
export const ALL_BRANCHES_ID = "all_branches_system";

export const APP_CHANGELOG = [
  {
    version: "1.0.6",
    date: "2024-05-28",
    changes: {
      vi: [
        "Tự động khởi tạo dữ liệu mẫu: Khi tạo chi nhánh mới, hệ thống tự động gán bộ danh mục và chi phí định kỳ mặc định.",
        "Cải thiện trải nghiệm quản lý: Giúp Quản lý chi nhánh mới bắt đầu nhanh hơn mà không cần nhập liệu thủ công từ đầu."
      ],
      de: [
        "Automatische Dateninitialisierung: Beim Erstellen einer neuen Filiale weist das System automatisch Standardkategorien und wiederkehrende Ausgaben zu.",
        "Verbesserte Verwaltung: Hilft neuen Filialleitern, schneller zu starten."
      ]
    }
  },
  {
    version: "1.0.5",
    date: "2024-05-27",
    changes: {
      vi: [
        "Tối ưu hóa dữ liệu: Mỗi chi nhánh hiện có danh mục chi phí và chi phí định kỳ riêng biệt.",
        "Cải thiện giao diện cài đặt: Yêu cầu chọn chi nhánh cụ thể để cấu hình chuyên sâu."
      ],
      de: [
        "Datenoptimierung: Jede Filiale hat jetzt eigene Ausgabenkategorien und regelmäßige Ausgaben.",
        "Verbesserte Einstellungen: Auswahl einer bestimmten Filiale für die Tiefenkonfiguration erforderlich."
      ]
    }
  }
];

export const formatCurrency = (val: number, lang: Language = 'vi') => 
  new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'de-DE', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(val);
