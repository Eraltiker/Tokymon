
import { Language } from './types';

export const translations = {
  vi: {
    // General
    income: "Doanh Thu",
    expense: "Chi Phí",
    stats: "Báo Cáo",
    settings: "Cài Đặt",
    branch: "Chi nhánh",
    branches: "Quản lý Chi nhánh",
    users: "Quản lý User",
    logout: "Đăng xuất",
    save: "Lưu Giao Dịch",
    delete: "Xóa",
    edit: "Sửa",
    cancel: "Hủy",
    total: "Tổng cộng",
    note: "Ghi chú",
    date: "Ngày",
    category: "Danh mục",
    amount: "Số tiền",
    source: "Nguồn tiền",
    history: "Lịch sử",
    all: "Tất cả",
    search: "Tìm kiếm...",
    filter: "Bộ lọc",
    
    // Header & Navigation
    lang_vi: "Tiếng Việt",
    lang_de: "Tiếng Đức",
    audit_log: "Nhật ký hoạt động",
    recurring: "Chi phí định kỳ",
    categories_man: "Quản lý danh mục",
    
    // Login
    login_title: "TOKYMON LOGIN",
    login_subtitle: "Quản lý tài chính nhà hàng",
    username: "Tên đăng nhập",
    password: "Mật khẩu",
    login_btn: "Đăng nhập",
    
    // Dashboard Labels
    revenue_total: "Doanh Thu Tổng",
    profit_total: "Lợi Nhuận",
    cash_on_hand: "Tiền Mặt Thực Tế",
    debt_total: "Tổng Nợ NCC",
    margin: "Tỷ Suất LN",
    cash_income: "Tiền Mặt",
    card_income: "Tiền Thẻ",
    shop_total_revenue: "Doanh Thu Thực Tế",
    tab_monthly: "Cơ cấu doanh thu",
    vs_prev_month: "so với tháng trước",
    monthly_summary: "Tổng kết tháng",
    growth: "Tăng trưởng",
    assets_report: "Nguồn Vốn Hiện Có",
    current_balance: "Số dư hiện tại",
    initial_balance: "Số dư đầu kỳ",

    // Forms
    kasse_input: "Kasse (Tại quán)",
    app_input: "App (Online)",
    card_total_input: "Tổng Tiền Thẻ",
    payment_source: "Nguồn thanh toán",
    shop_cash: "Tiền Quán",
    master_wallet: "Ví Tổng",
    card_bank: "Thẻ/Bank",
    debt_vendor: "Ghi nợ NCC",
    vendor_name: "Tên nhà cung cấp",

    // Initial Balances
    initial_cash: "Tiền mặt ban đầu",
    initial_card: "Tiền thẻ ban đầu",
    change_password: "Đổi mật khẩu",
    current_password: "Mật khẩu hiện tại",
    new_password: "Mật khẩu mới",
    confirm_password: "Xác nhận mật khẩu mới",

    // Alerts
    no_data: "Không có dữ liệu.",
    insufficient_funds: "Cảnh báo: Nguồn tiền không đủ!",
    duplicate_revenue: "Lỗi: Ngày này đã được nhập doanh thu.",
    branch_added: "Đã thêm chi nhánh mới.",
    user_added: "Đã thêm user mới.",
    confirm_delete: "Bạn có chắc chắn muốn xóa?",
    prev_day: "Ngày trước",
    next_day: "Ngày sau",
    password_changed: "Đổi mật khẩu thành công!",
    password_mismatch: "Mật khẩu xác nhận không khớp!"
  },
  de: {
    // General
    income: "Einnahmen",
    expense: "Ausgaben",
    stats: "Berichte",
    settings: "Einst.",
    branch: "Filiale",
    branches: "Filialen",
    users: "Benutzer",
    logout: "Abmelden",
    save: "Speichern",
    delete: "Löschen",
    edit: "Bearb.",
    cancel: "Abbrechen",
    total: "Gesamt",
    note: "Notiz",
    date: "Datum",
    category: "Kategorie",
    amount: "Betrag",
    source: "Quelle",
    history: "Verlauf",
    all: "Alle",
    search: "Suche...",
    filter: "Filter",

    // Header & Navigation
    lang_vi: "Vietnamesisch",
    lang_de: "Deutsch",
    audit_log: "Aktivitätsprotokoll",
    recurring: "Daueraufträge",
    categories_man: "Kategorien",

    // Login
    login_title: "TOKYMON LOGIN",
    login_subtitle: "Restaurant Management",
    username: "Benutzername",
    password: "Passwort",
    login_btn: "Anmelden",

    // Dashboard Labels
    revenue_total: "Gesamtumsatz",
    profit_total: "Gewinn",
    cash_on_hand: "Bargeldbestand",
    debt_total: "Verbindlichkeiten",
    margin: "Marge",
    cash_income: "Bargeld",
    card_income: "Kartenzahlung",
    shop_total_revenue: "Umsatz im Laden",
    tab_monthly: "Umsatzstruktur",
    vs_prev_month: "vs. Vormonat",
    monthly_summary: "Monatsbericht",
    growth: "Wachstum",
    assets_report: "Kapitalbestand",
    current_balance: "Aktueller Stand",
    initial_balance: "Anfangsbestand",

    // Forms
    kasse_input: "Kasse (Im Laden)",
    app_input: "App (Online)",
    card_total_input: "Kartenzahlung Gesamt",
    payment_source: "Zahlungsquelle",
    shop_cash: "Ladenkasse",
    master_wallet: "Hauptwallet",
    card_bank: "Karte/Bank",
    debt_vendor: "Lieferanten-Schulden",
    vendor_name: "Lieferant Name",

    // Initial Balances
    initial_cash: "Anfangskapital Bar",
    initial_card: "Anfangskapital Karte",
    change_password: "Passwort ändern",
    current_password: "Aktuelles Passwort",
    new_password: "Neues Passwort",
    confirm_password: "Passwort xác nhận",

    // Alerts
    no_data: "Keine Daten.",
    insufficient_funds: "Warnung: Guthaben không đủ!",
    duplicate_revenue: "Fehler: Umsatz existiert bereits.",
    branch_added: "Filiale hinzugefügt.",
    user_added: "Benutzer hinzugefügt.",
    confirm_delete: "Sind Sie sicher?",
    prev_day: "Vorheriger Tag",
    next_day: "Nächster Tag",
    password_changed: "Passwort geändert!",
    password_mismatch: "Passwörter stimmen nicht überein!"
  }
};

export const useTranslation = (lang: Language) => {
  return (key: keyof typeof translations['vi']) => {
    return translations[lang][key] || key;
  };
};
