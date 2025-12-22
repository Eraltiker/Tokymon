
import { Language } from './types';

export const translations = {
  vi: {
    // General
    income: "Doanh Thu",
    expense: "Chi Phí",
    stats: "Báo Cáo",
    settings: "Cài Đặt",
    branch: "Chi nhánh",
    branches: "Hệ thống Chi nhánh",
    users: "Quản lý Tài khoản",
    logout: "Đăng xuất",
    save: "Xác nhận Lưu",
    delete: "Xóa",
    edit: "Chỉnh sửa",
    cancel: "Hủy bỏ",
    total: "Tổng cộng",
    note: "Ghi chú",
    date: "Ngày",
    category: "Hạng mục",
    amount: "Số tiền",
    source: "Nguồn chi",
    history: "Lịch sử",
    all: "Tất cả",
    search: "Tìm kiếm giao dịch...",
    filter: "Bộ lọc",
    
    // Header & Navigation
    lang_vi: "Tiếng Việt",
    lang_de: "Tiếng Đức",
    audit_log: "Nhật ký hệ thống",
    recurring: "Chi phí cố định",
    categories_man: "Danh mục chi phí",
    
    // Login
    login_title: "TOKYMON ERP",
    login_subtitle: "Hệ thống quản lý tài chính nội bộ",
    username: "Tên đăng nhập",
    password: "Mật khẩu",
    login_btn: "Vào hệ thống",
    
    // Dashboard Labels
    revenue_total: "Tổng Doanh Thu",
    profit_total: "Lợi Nhuận Thuần",
    cash_on_hand: "Tiền Mặt Thực Tế",
    debt_total: "Dư Nợ NCC",
    margin: "Tỷ suất LN",
    cash_income: "Tiền mặt",
    card_income: "Quẹt thẻ",
    shop_total_revenue: "Doanh thu tại Shop",
    tab_monthly: "Phân tích nguồn thu",
    vs_prev_month: "so với tháng trước",
    monthly_summary: "Tổng kết tài chính",
    growth: "Tăng trưởng",
    assets_report: "Báo cáo nguồn vốn",
    current_balance: "Số dư hiện tại",
    initial_balance: "Vốn đầu kỳ",

    // Forms
    kasse_input: "Doanh thu tại Shop",
    app_input: "Doanh thu Giao hàng (App)",
    card_total_input: "Khách trả bằng Thẻ",
    payment_source: "Hình thức chi",
    shop_cash: "Tiền mặt tại Shop",
    master_wallet: "Quỹ chung",
    card_bank: "Chuyển khoản/Thẻ",
    debt_vendor: "Ghi nợ NCC",
    vendor_name: "Tên nhà cung cấp",

    // Initial Balances
    initial_cash: "Vốn tiền mặt",
    initial_card: "Vốn trong thẻ",
    change_password: "Thay đổi mật khẩu",
    current_password: "Mật khẩu hiện tại",
    new_password: "Mật khẩu mới",
    confirm_password: "Xác nhận mật khẩu",

    // Alerts
    no_data: "Không có dữ liệu hiển thị.",
    insufficient_funds: "Cảnh báo: Số dư không đủ!",
    duplicate_revenue: "Lỗi: Ngày này đã được chốt doanh thu.",
    branch_added: "Đã khởi tạo chi nhánh.",
    user_added: "Đã tạo tài khoản mới.",
    confirm_delete: "Bạn có chắc chắn muốn xóa dữ liệu này?",
    prev_day: "Ngày trước",
    next_day: "Ngày sau",
    password_changed: "Cập nhật mật khẩu thành công!",
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
    kasse_input: "Umsatz Shop",
    app_input: "Umsatz Liefer-App",
    card_total_input: "Kartenzahlung",
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
    insufficient_funds: "Warnung: Guthaben nicht ausreichend!",
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
