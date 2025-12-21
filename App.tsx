
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES, RecurringTransaction, Branch, User, UserRole, Language, AuditLogEntry, AppNotification, TransactionType } from './types';
import Dashboard from './components/Dashboard';
import IncomeManager from './components/IncomeManager';
import ExpenseManager from './components/ExpenseManager';
import CategoryManager from './components/CategoryManager';
import RecurringManager from './components/RecurringManager';
import EditTransactionModal from './components/EditTransactionModal';
import BranchManager from './components/BranchManager';
import UserManager from './components/UserManager';
import { useTranslation } from './i18n';
import { 
  UtensilsCrossed, LayoutDashboard, Settings, 
  Wallet, ArrowDownCircle, Sun, Moon, LogOut, 
  Bell, BellRing, History as HistoryIcon, 
  AlertTriangle, CheckCircle2, Info, Trash2, Languages,
  Tag, CalendarClock, ShieldCheck, MapPin, Users, Lock, KeyRound, Key, Save, Download, Upload
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'stats' | 'settings'>('income');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'branches' | 'users' | 'security' | 'audit'>('general');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tokymon_theme') === 'dark');
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('tokymon_lang') as Language) || 'vi');
  const t = useTranslation(lang);

  const [passForm, setPassForm] = useState({ old: '', new: '', confirm: '' });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('tokymon_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('tokymon_branches');
    return saved ? JSON.parse(saved) : [{ id: 'b1', name: 'Tokymon Berlin', address: 'Alexanderplatz', initialCash: 0, initialCard: 0 }];
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('tokymon_users');
    if (saved) return JSON.parse(saved);
    return [{ 
      id: 'admin_root', 
      username: 'admin', 
      password: 'admin', 
      role: UserRole.SUPER_ADMIN, 
      assignedBranchIds: ['b1'] 
    }];
  });

  const [currentBranchId, setCurrentBranchId] = useState<string>(() => localStorage.getItem('tokymon_current_branch') || 'b1');

  const visibleBranches = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) return branches;
    return branches.filter(b => currentUser.assignedBranchIds.includes(b.id));
  }, [branches, currentUser]);

  useEffect(() => {
    if (visibleBranches.length > 0 && !visibleBranches.find(b => b.id === currentBranchId)) {
      setCurrentBranchId(visibleBranches[0].id);
    }
  }, [visibleBranches, currentBranchId]);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('tokymon_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('tokymon_audit_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('tokymon_expense_categories');
    return saved ? JSON.parse(saved) : EXPENSE_CATEGORIES;
  });

  const [recurringExpenses, setRecurringExpenses] = useState<RecurringTransaction[]>(() => {
    const saved = localStorage.getItem('tokymon_recurring');
    return saved ? JSON.parse(saved) : [];
  });

  const currentBranch = useMemo(() => branches.find(b => b.id === currentBranchId) || branches[0], [branches, currentBranchId]);
  const filteredTransactions = useMemo(() => transactions.filter(t => t.branchId === currentBranchId), [transactions, currentBranchId]);

  const addAuditLog = useCallback((action: AuditLogEntry['action'], entityType: AuditLogEntry['entityType'], entityId: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      username: currentUser.username,
      action,
      entityType,
      entityId,
      details
    };
    setAuditLogs(prev => [newLog, ...prev].slice(0, 1000));
  }, [currentUser]);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('tokymon_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('tokymon_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('tokymon_transactions', JSON.stringify(transactions));
    localStorage.setItem('tokymon_branches', JSON.stringify(branches));
    localStorage.setItem('tokymon_users', JSON.stringify(users));
    localStorage.setItem('tokymon_audit_logs', JSON.stringify(auditLogs));
    localStorage.setItem('tokymon_expense_categories', JSON.stringify(expenseCategories));
    localStorage.setItem('tokymon_recurring', JSON.stringify(recurringExpenses));
    localStorage.setItem('tokymon_current_branch', currentBranchId);
  }, [transactions, branches, users, auditLogs, expenseCategories, recurringExpenses, currentBranchId]);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const handleAddTransaction = (newTx: Transaction) => {
    setTransactions(prev => [newTx, ...prev]);
    addAuditLog('CREATE', 'TRANSACTION', newTx.id, `Thêm ${newTx.type} ${newTx.amount}€`);
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    if (window.confirm(t('confirm_delete'))) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      addAuditLog('DELETE', 'TRANSACTION', id, `Xóa giao dịch ${tx.amount}€`);
    }
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
    setEditingTransaction(null);
    addAuditLog('UPDATE', 'TRANSACTION', updatedTx.id, `Sửa giao dịch`);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('tokymon_user', JSON.stringify(user));
      addAuditLog('LOGIN', 'USER', user.id, 'Đăng nhập hệ thống');
    } else {
      setLoginError(lang === 'vi' ? 'Sai tên đăng nhập hoặc mật khẩu!' : 'Falscher Benutzername oder Passwort!');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tokymon_user');
    setCurrentUser(null);
  };

  const handlePassChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (passForm.old !== currentUser.password) return alert(lang === 'vi' ? 'Mật khẩu hiện tại không đúng!' : 'Aktuelles Passwort ist falsch!');
    if (passForm.new !== passForm.confirm) return alert(t('password_mismatch'));
    
    const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, password: passForm.new } : u);
    setUsers(updatedUsers);
    setCurrentUser({ ...currentUser, password: passForm.new });
    localStorage.setItem('tokymon_user', JSON.stringify({ ...currentUser, password: passForm.new }));
    setPassForm({ old: '', new: '', confirm: '' });
    alert(t('password_changed'));
    addAuditLog('UPDATE', 'USER', currentUser.id, 'Đổi mật khẩu cá nhân');
  };

  const exportBackup = () => {
    const data = {
      transactions,
      branches,
      users,
      expenseCategories,
      recurringExpenses,
      auditLogs,
      version: "1.0",
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tokymon_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.transactions) setTransactions(data.transactions);
        if (data.branches) setBranches(data.branches);
        if (data.users) setUsers(data.users);
        if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
        if (data.recurringExpenses) setRecurringExpenses(data.recurringExpenses);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
        alert(lang === 'vi' ? "Khôi phục dữ liệu thành công!" : "Daten erfolgreich wiederhergestellt!");
      } catch (err) {
        alert(lang === 'vi' ? "File không hợp lệ!" : "Ungültige Datei!");
      }
    };
    reader.readAsText(file);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-all duration-500">
        <form onSubmit={handleLogin} className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3rem] shadow-2xl w-full max-w-md border dark:border-slate-800 animate-slide-up">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-600/20">
            <UtensilsCrossed className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-center mb-2 uppercase tracking-tighter text-slate-900 dark:text-white leading-none">TOKYMON</h1>
          <p className="text-center text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-10">{t('login_subtitle')}</p>
          
          <div className="space-y-5">
            <div className="relative">
              <Users className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder={t('username')} 
                value={loginForm.username} 
                onChange={e => setLoginForm({...loginForm, username: e.target.value})} 
                className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-indigo-600 dark:text-white transition-all" 
                required 
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                placeholder={t('password')} 
                value={loginForm.password} 
                onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold outline-none focus:border-indigo-600 dark:text-white transition-all" 
                required 
              />
            </div>

            {loginError && (
              <p className="text-rose-500 text-center text-xs font-bold animate-pulse">{loginError}</p>
            )}

            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3">
              <KeyRound className="w-5 h-5" /> {t('login_btn')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-500">
      <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b dark:border-slate-800 flex items-center justify-between px-4 md:px-12 sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20"><UtensilsCrossed className="w-6 h-6 text-white" /></div>
          <div className="hidden lg:block">
            <h1 className="text-xl font-black tracking-tighter dark:text-white leading-none">TOKYMON</h1>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Finance Manager</span>
          </div>
          
          {(currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) && (
            <div className="ml-4 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl border dark:border-slate-700 max-w-[150px] md:max-w-none shadow-sm">
              <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
              <select value={currentBranchId} onChange={e => setCurrentBranchId(e.target.value)} className="bg-transparent text-xs font-black uppercase outline-none cursor-pointer dark:text-white truncate max-w-[100px] md:max-w-none">
                 {visibleBranches.map(b => <option key={b.id} value={b.id} className="dark:bg-slate-900">{b.name}</option>)}
              </select>
            </div>
          )}

          {!(currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) && (
             <div className="ml-4 flex items-center gap-2 bg-indigo-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-indigo-100 dark:border-slate-700">
               <MapPin className="w-4 h-4 text-indigo-500 shrink-0" />
               <span className="text-xs font-black uppercase dark:text-white truncate max-w-[100px] md:max-w-none">{currentBranch.name}</span>
             </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={() => setIsDark(!isDark)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all">
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
          <button onClick={handleLogout} className="p-2.5 bg-rose-50 dark:bg-rose-950 text-rose-500 rounded-xl hover:bg-rose-100 transition-all"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 md:space-y-8">
        <nav className="flex gap-1.5 p-1.5 bg-slate-200 dark:bg-slate-900 rounded-[1.5rem] w-fit shadow-inner overflow-x-auto no-scrollbar">
          {[
            { id: 'income', label: t('income'), icon: Wallet },
            { id: 'expense', label: t('expense'), icon: ArrowDownCircle },
            { id: 'stats', label: t('stats'), icon: LayoutDashboard },
            { id: 'settings', label: t('settings'), icon: Settings }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <tab.icon className="w-4 h-4" /> <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8">
          {activeTab === 'income' && (
            <IncomeManager transactions={transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={setEditingTransaction} branchId={currentBranchId} initialBalances={{cash: currentBranch.initialCash, card: currentBranch.initialCard}} lang={lang} userRole={currentUser.role} />
          )}
          {activeTab === 'expense' && (
            <ExpenseManager transactions={transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={setEditingTransaction} expenseCategories={expenseCategories} branchId={currentBranchId} initialBalances={{cash: currentBranch.initialCash, card: currentBranch.initialCard}} lang={lang} userRole={currentUser.role} />
          )}
          {activeTab === 'stats' && <Dashboard transactions={filteredTransactions} initialBalances={{cash: currentBranch.initialCash, card: currentBranch.initialCard}} lang={lang} />}
          
          {activeTab === 'settings' && (
            <div className="space-y-8 pb-10">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {[
                  { id: 'general', label: t('all'), icon: Settings },
                  { id: 'branches', label: t('branches'), icon: MapPin },
                  { id: 'users', label: t('users'), icon: Users },
                  { id: 'security', label: t('change_password'), icon: Key },
                  { id: 'audit', label: t('audit_log'), icon: HistoryIcon }
                ].map(sub => (
                   <button 
                    key={sub.id} 
                    onClick={() => setSettingsSubTab(sub.id as any)} 
                    style={{ display: (sub.id === 'branches' || sub.id === 'users') && (currentUser.role !== UserRole.SUPER_ADMIN) ? 'none' : 'flex' }}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all flex items-center gap-2 ${settingsSubTab === sub.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}
                   >
                    <sub.icon className="w-3.5 h-3.5" /> {sub.label}
                  </button>
                ))}
              </div>

              {settingsSubTab === 'general' && (
                <div className="space-y-8">
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2"><Save className="w-4 h-4 text-indigo-500" /> Sao lưu dữ liệu (Dự phòng)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button onClick={exportBackup} className="flex items-center justify-center gap-2 p-5 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                        <Download className="w-4 h-4" /> Tải về bản sao lưu (.json)
                      </button>
                      <label className="flex items-center justify-center gap-2 p-5 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 hover:text-white transition-all cursor-pointer">
                        <Upload className="w-4 h-4" /> Khôi phục từ bản sao lưu
                        <input type="file" accept=".json" onChange={importBackup} className="hidden" />
                      </label>
                    </div>
                    <p className="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest italic text-center">
                      Mẹo: Hãy tải bản sao lưu hàng tuần để đảm bảo dữ liệu luôn an toàn nếu trình duyệt bị xóa cache.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <CategoryManager title={t('categories_man')} categories={expenseCategories} onUpdate={setExpenseCategories} />
                    <RecurringManager recurringExpenses={recurringExpenses} onUpdate={setRecurringExpenses} categories={expenseCategories} onGenerateTransactions={txs => setTransactions(prev => [...txs, ...prev])} branchId={currentBranchId} />
                  </div>
                </div>
              )}

              {settingsSubTab === 'branches' && currentUser.role === UserRole.SUPER_ADMIN && (
                <BranchManager branches={branches} setBranches={setBranches} onAudit={addAuditLog} />
              )}
              {settingsSubTab === 'users' && currentUser.role === UserRole.SUPER_ADMIN && (
                <UserManager users={users} setUsers={setUsers} branches={branches} onAudit={addAuditLog} />
              )}

              {settingsSubTab === 'security' && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm max-w-md mx-auto">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-8"><Key className="w-5 h-5 text-indigo-500" /> {t('change_password')}</h3>
                  <form onSubmit={handlePassChange} className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t('current_password')}</label>
                      <input type="password" value={passForm.old} onChange={e => setPassForm({...passForm, old: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-bold outline-none focus:border-indigo-500 dark:text-white transition-all" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t('new_password')}</label>
                      <input type="password" value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-bold outline-none focus:border-indigo-500 dark:text-white transition-all" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{t('confirm_password')}</label>
                      <input type="password" value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-bold outline-none focus:border-indigo-500 dark:text-white transition-all" required />
                    </div>
                    <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">
                      <Save className="w-5 h-5" /> Cập nhật mật khẩu
                    </button>
                  </form>
                </div>
              )}
              
              {settingsSubTab === 'audit' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm">
                  <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2"><HistoryIcon className="w-4 h-4 text-indigo-500" /> {t('audit_log')}</h3>
                    <button onClick={() => setAuditLogs([])} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase tracking-widest sticky top-0 z-10">
                        <tr><th className="px-6 py-4">{t('date')}</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Action</th><th className="px-6 py-4">Details</th></tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-800 font-bold">
                        {auditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4 text-slate-400">{new Date(log.timestamp).toLocaleString(lang === 'vi' ? 'vi-VN' : 'de-DE')}</td>
                            <td className="px-6 py-4 dark:text-slate-200">{log.username}</td>
                            <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[9px] ${log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' : log.action === 'DELETE' ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'}`}>{log.action}</span></td>
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 italic">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {editingTransaction && <EditTransactionModal transaction={editingTransaction} expenseCategories={expenseCategories} onClose={() => setEditingTransaction(null)} onSave={handleUpdateTransaction} />}
    </div>
  );
};

export default App;
