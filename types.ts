
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

export const SCHEMA_VERSION = "3.3.0";
export const ALL_BRANCHES_ID = "all_branches_system";

export const APP_CHANGELOG = [
  {
    version: "3.3.0",
    date: "2024-05-28",
    changes: {
      vi: [
        "Nâng cấp Smart Scan: Hỗ trợ triệt để Camera & File Browser trên iOS",
        "Tối ưu hóa bộ nhớ: Chống crash Safari khi quét hóa đơn độ phân giải cao",
        "Giao diện Zero-Overlap: Sửa lỗi chồng chéo layout trên màn hình tai thỏ",
        "Cơ chế Tự động cập nhật: Tự động hiển thị tính năng mới sau mỗi bản update"
      ],
      de: [
        "Smart Scan Upgrade: Volle Unterstützung für Kamera & Dateibrowser auf iOS",
        "Speicheroptimierung: Verhindert Safari-Crashes bei hochauflösenden Scans",
        "Zero-Overlap UI: Layout-Fehler auf Notch-Displays behoben",
        "Auto-Update-Mechanismus: Zeigt neue Funktionen nach jedem Update automatisch an"
      ]
    }
  },
  {
    version: "3.2.5",
    date: "2024-05-27",
    changes: {
      vi: ["Tái thiết kế màn hình Đăng nhập theo phong cách Glassmorphism cao cấp", "Cải thiện độ tương phản và hiển thị của các ô nhập liệu"],
      de: ["Neugestaltung des Login-Bildschirms im Premium-Glassmorphism-Stil", "Verbesserter Kontrast und Anzeige von Eingabefeldern"]
    }
  }
];

export const formatCurrency = (val: number, lang: Language = 'vi') => 
  new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'de-DE', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(val);
