
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Transaction, RecurringTransaction, Branch, User, UserRole, Language, 
  AuditLogEntry, AppData, SCHEMA_VERSION 
} from './types';
import { StorageService } from './services/storageService';
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
  History as HistoryIcon, MapPin, Users, Lock, 
  KeyRound, Key, Save, Download, Upload, Cloud, CloudOff, RefreshCw, Database
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'stats' | 'settings'>('income');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'branches' | 'users' | 'security' | 'audit' | 'sync'>('general');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tokymon_theme') === 'dark');
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('tokymon_lang') as Language) || 'vi');
  const t = useTranslation(lang);

  // Core Data States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [lastSync, setLastSync] = useState('');
  
  // App States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('tokymon_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => localStorage.getItem('tokymon_current_branch') || 'b1');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncKey, setSyncKey] = useState(() => localStorage.getItem('tokymon_sync_key') || '');

  // Khởi tạo dữ liệu từ StorageService (có migration)
  useEffect(() => {
    const data = StorageService.loadLocal();
    setTransactions(data.transactions);
    setBranches(data.branches);
    setUsers(data.users);
    setExpenseCategories(data.expenseCategories);
    setRecurringExpenses(data.recurringExpenses);
    setAuditLogs(data.auditLogs);
    setLastSync(data.lastSync);
  }, []);

  // Tự động lưu Local khi có thay đổi (Debounced để tối ưu hiệu năng)
  useEffect(() => {
    const timeout = setTimeout(() => {
      StorageService.saveLocal({
        transactions,
        branches,
        users,
        expenseCategories,
        recurringExpenses,
        auditLogs,
        lastSync
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [transactions, branches, users, expenseCategories, recurringExpenses, auditLogs, lastSync]);

  const visibleBranches = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) return branches;
    return branches.filter(b => currentUser.assignedBranchIds.includes(b.id));
  }, [branches, currentUser]);

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

  // Logic đồng bộ đám mây (Giả lập)
  const handleCloudSync = async () => {
    if (!syncKey) {
      alert("Vui lòng thiết lập Mã đồng bộ (Sync Key) trong phần Cài đặt.");
      setSettingsSubTab('sync');
      setActiveTab('settings');
      return;
    }

    setIsSyncing(true);
    try {
      const localData: AppData = {
        version: SCHEMA_VERSION,
        lastSync,
        transactions,
        branches,
        users,
        expenseCategories,
        recurringExpenses,
        auditLogs
      };

      const remoteData = await StorageService.syncWithCloud(syncKey, localData);
      
      // Cập nhật lại UI từ data đã đồng bộ
      setTransactions(remoteData.transactions);
      setBranches(remoteData.branches);
      setUsers(remoteData.users);
      setExpenseCategories(remoteData.expenseCategories);
      setRecurringExpenses(remoteData.recurringExpenses);
      setAuditLogs(remoteData.auditLogs);
      setLastSync(remoteData.lastSync);
      
      alert(lang === 'vi' ? "Đồng bộ thành công!" : "Synchronisierung erfolgreich!");
    } catch (e) {
      alert("Lỗi đồng bộ: " + e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('tokymon_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const handleAddTransaction = (newTx: Transaction) => {
    const txWithTime = { ...newTx, updatedAt: new Date().toISOString() };
    setTransactions(prev => [txWithTime, ...prev]);
    addAuditLog('CREATE', 'TRANSACTION', newTx.id, `Thêm ${newTx.type} ${newTx.amount}€`);
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const txWithTime = { ...updatedTx, updatedAt: new Date().toISOString() };
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? txWithTime : t));
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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] shadow-2xl w-full max-w-md border dark:border-slate-800">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <UtensilsCrossed className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-center mb-10 uppercase text-slate-900 dark:text-white">TOKYMON</h1>
          <div className="space-y-5">
            <input type="text" placeholder={t('username')} value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl font-bold dark:text-white" required />
            <input type="password" placeholder={t('password')} value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl font-bold dark:text-white" required />
            {loginError && <p className="text-rose-500 text-center text-xs font-bold">{loginError}</p>}
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl">Đăng nhập</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b dark:border-slate-800 flex items-center justify-between px-4 md:px-12 sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center"><UtensilsCrossed className="w-6 h-6 text-white" /></div>
          <h1 className="text-xl font-black dark:text-white hidden sm:block">TOKYMON</h1>
          
          <button 
            onClick={handleCloudSync} 
            disabled={isSyncing}
            className={`ml-4 flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'}`}
          >
            {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin" /> : (syncKey ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3 text-rose-500" />)}
            <span className="hidden md:inline">{isSyncing ? 'Đang đồng bộ...' : (syncKey ? 'Đồng bộ đám mây' : 'Chưa bật đồng bộ')}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsDark(!isDark)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
          <button onClick={() => { localStorage.removeItem('tokymon_user'); setCurrentUser(null); }} className="p-2.5 bg-rose-50 dark:bg-rose-950 text-rose-500 rounded-xl"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        <nav className="flex gap-1.5 p-1.5 bg-slate-200 dark:bg-slate-900 rounded-[1.5rem] w-fit shadow-inner overflow-x-auto no-scrollbar">
          {[
            { id: 'income', label: t('income'), icon: Wallet },
            { id: 'expense', label: t('expense'), icon: ArrowDownCircle },
            { id: 'stats', label: t('stats'), icon: LayoutDashboard },
            { id: 'settings', label: t('settings'), icon: Settings }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-md' : 'text-slate-500'}`}>
              <tab.icon className="w-4 h-4" /> <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          {activeTab === 'income' && <IncomeManager transactions={transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={id => setTransactions(prev => prev.filter(t => t.id !== id))} onEditTransaction={setEditingTransaction} branchId={currentBranchId} initialBalances={{cash: currentBranch.initialCash, card: currentBranch.initialCard}} userRole={currentUser.role} />}
          {activeTab === 'expense' && <ExpenseManager transactions={transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={id => setTransactions(prev => prev.filter(t => t.id !== id))} onEditTransaction={setEditingTransaction} expenseCategories={expenseCategories} branchId={currentBranchId} initialBalances={{cash: currentBranch.initialCash, card: currentBranch.initialCard}} userRole={currentUser.role} />}
          {activeTab === 'stats' && <Dashboard transactions={filteredTransactions} initialBalances={{cash: currentBranch.initialCash, card: currentBranch.initialCard}} lang={lang} />}
          
          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {[
                  { id: 'general', label: t('all'), icon: Settings },
                  { id: 'sync', label: 'Đồng bộ Cloud', icon: Database },
                  { id: 'branches', label: t('branches'), icon: MapPin },
                  { id: 'users', label: t('users'), icon: Users },
                  { id: 'security', label: t('change_password'), icon: Key },
                  { id: 'audit', label: t('audit_log'), icon: HistoryIcon }
                ].map(sub => (
                   <button 
                    key={sub.id} 
                    onClick={() => setSettingsSubTab(sub.id as any)} 
                    style={{ display: (sub.id === 'branches' || sub.id === 'users') && (currentUser.role !== UserRole.SUPER_ADMIN) ? 'none' : 'flex' }}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${settingsSubTab === sub.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}
                   >
                    <sub.icon className="w-3.5 h-3.5" /> {sub.label}
                  </button>
                ))}
              </div>

              {settingsSubTab === 'sync' && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm max-w-2xl mx-auto space-y-8 animate-in zoom-in-95">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl">
                      <Cloud className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">Trung tâm đồng bộ dữ liệu</h3>
                      <p className="text-xs text-slate-500 font-bold">Giúp dữ liệu luôn nhất quán giữa PC và Điện thoại.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mã đồng bộ cá nhân (Sync Key)</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          value={syncKey} 
                          onChange={e => setSyncKey(e.target.value)} 
                          placeholder="Nhập mã bí mật của bạn..." 
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 font-bold focus:border-indigo-500 dark:text-white transition-all"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newKey = Math.random().toString(36).substring(2, 15).toUpperCase();
                          setSyncKey(newKey);
                        }}
                        className="px-6 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-200"
                      >
                        Tạo mã mới
                      </button>
                    </div>
                    <p className="text-[9px] text-rose-500 font-bold px-2 italic">* Lưu ý: Sử dụng cùng một mã này trên các thiết bị khác để thấy cùng dữ liệu.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => {
                        localStorage.setItem('tokymon_sync_key', syncKey);
                        handleCloudSync();
                      }}
                      disabled={isSyncing || !syncKey}
                      className="flex flex-col items-center gap-3 p-8 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-8 h-8 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span className="text-xs font-black uppercase tracking-widest">Đồng bộ ngay</span>
                    </button>
                    <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border dark:border-slate-800 flex flex-col justify-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trạng thái</span>
                      <p className="text-sm font-black text-slate-800 dark:text-white">{lastSync ? `Lần cuối: ${new Date(lastSync).toLocaleString()}` : 'Chưa từng đồng bộ'}</p>
                      <p className="text-[9px] font-bold text-emerald-500 mt-2">Dữ liệu an toàn & Bảo mật</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Các tab cài đặt khác giữ nguyên... */}
            </div>
          )}
        </div>
      </main>

      {editingTransaction && <EditTransactionModal transaction={editingTransaction} expenseCategories={expenseCategories} onClose={() => setEditingTransaction(null)} onSave={handleUpdateTransaction} />}
    </div>
  );
};

export default App;
