
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
  KeyRound, Key, Save, Download, Upload, Cloud, CloudOff, RefreshCw, Database, CheckCircle2
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
  
  // Fix: Added missing login state variables
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Lọc bỏ các bản ghi đã bị xóa khi hiển thị
  const activeTransactions = useMemo(() => transactions.filter(tx => !tx.deletedAt), [transactions]);
  const activeBranches = useMemo(() => branches.filter(b => !b.deletedAt), [branches]);
  const activeUsers = useMemo(() => users.filter(u => !u.deletedAt), [users]);
  const activeRecurring = useMemo(() => recurringExpenses.filter(r => !r.deletedAt), [recurringExpenses]);

  // Load ban đầu
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

  // Lưu local tự động
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
    }, 1000);
    return () => clearTimeout(timeout);
  }, [transactions, branches, users, expenseCategories, recurringExpenses, auditLogs, lastSync]);

  // AUTO SYNC khi vào app
  useEffect(() => {
    if (syncKey && currentUser) {
      setTimeout(() => handleCloudSync(true), 1500);
    }
  }, [currentUser]);

  const visibleBranches = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) return activeBranches;
    return activeBranches.filter(b => currentUser.assignedBranchIds.includes(b.id));
  }, [activeBranches, currentUser]);

  const currentBranch = useMemo(() => activeBranches.find(b => b.id === currentBranchId) || activeBranches[0], [activeBranches, currentBranchId]);
  const filteredTransactions = useMemo(() => activeTransactions.filter(t => t.branchId === currentBranchId), [activeTransactions, currentBranchId]);

  const handleCloudSync = async (silent = false) => {
    if (!syncKey) return;
    if (!silent) setIsSyncing(true);
    
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

      const mergedData = await StorageService.syncWithCloud(syncKey, localData);
      
      setTransactions(mergedData.transactions);
      setBranches(mergedData.branches);
      setUsers(mergedData.users);
      setExpenseCategories(mergedData.expenseCategories);
      setRecurringExpenses(mergedData.recurringExpenses);
      setAuditLogs(mergedData.auditLogs);
      setLastSync(mergedData.lastSync);
      
      if (!silent) console.log("Sync completed");
    } catch (e) {
      if (!silent) alert("Sync failed: " + e);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  // Fix: Added missing addAuditLog function
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

  const handleAddTransaction = (newTx: Transaction) => {
    const tx = { ...newTx, updatedAt: new Date().toISOString() };
    setTransactions(prev => [tx, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm("Xóa giao dịch này?")) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : t));
    }
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const tx = { ...updatedTx, updatedAt: new Date().toISOString() };
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? tx : t));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = activeUsers.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('tokymon_user', JSON.stringify(user));
    } else {
      setLoginError('Sai thông tin đăng nhập!');
    }
  };

  // ... (Giao diện giữ nguyên các phần đã có, chỉ bổ sung status bar đồng bộ)

  if (!currentUser) {
     return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <form onSubmit={handleLogin} className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] shadow-2xl w-full max-w-md border dark:border-slate-800">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <UtensilsCrossed className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-center mb-10 uppercase text-slate-900 dark:text-white leading-none">TOKYMON</h1>
            <div className="space-y-5">
              <input type="text" placeholder="Tên đăng nhập" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl font-bold dark:text-white outline-none" required />
              <input type="password" placeholder="Mật khẩu" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl font-bold dark:text-white outline-none" required />
              {loginError && <p className="text-rose-500 text-center text-xs font-bold">{loginError}</p>}
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Đăng nhập</button>
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
          <div className="hidden md:block">
            <h1 className="text-xl font-black dark:text-white leading-none">TOKYMON</h1>
            <div className="flex items-center gap-2 mt-1">
               <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isSyncing ? 'Đang đồng bộ...' : (lastSync ? `Đã đồng bộ ${new Date(lastSync).toLocaleTimeString()}` : 'Chưa đồng bộ')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsDark(!isDark)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all">
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
          <button onClick={() => handleCloudSync(false)} className={`p-2.5 rounded-xl transition-all ${isSyncing ? 'bg-indigo-50 text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { localStorage.removeItem('tokymon_user'); setCurrentUser(null); }} className="p-2.5 bg-rose-50 dark:bg-rose-950 text-rose-500 rounded-xl hover:bg-rose-100 transition-all"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 pb-24">
        <nav className="flex gap-1.5 p-1.5 bg-slate-200 dark:bg-slate-900 rounded-[1.5rem] w-fit shadow-inner overflow-x-auto no-scrollbar">
          {[
            { id: 'income', label: t('income'), icon: Wallet },
            { id: 'expense', label: t('expense'), icon: ArrowDownCircle },
            { id: 'stats', label: t('stats'), icon: LayoutDashboard },
            { id: 'settings', label: t('settings'), icon: Settings }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}>
              <tab.icon className="w-4 h-4" /> <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'income' && <IncomeManager transactions={transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={handleUpdateTransaction} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} />}
          {activeTab === 'expense' && <ExpenseManager transactions={transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={handleUpdateTransaction} expenseCategories={expenseCategories} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} />}
          {activeTab === 'stats' && <Dashboard transactions={filteredTransactions} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} lang={lang} />}
          
          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {[
                  { id: 'general', label: t('all'), icon: Settings },
                  { id: 'sync', label: 'Cloud Sync', icon: Database },
                  { id: 'branches', label: t('branches'), icon: MapPin },
                  { id: 'users', label: t('users'), icon: Users },
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
                      <p className="text-xs text-slate-500 font-bold">Dữ liệu sẽ được hợp nhất (Merge) thay vì ghi đè.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mã đồng bộ cá nhân (Sync Key)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={syncKey} 
                        onChange={e => setSyncKey(e.target.value)} 
                        placeholder="Nhập mã bí mật..." 
                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 font-bold focus:border-indigo-500 dark:text-white transition-all outline-none"
                      />
                      <button 
                        onClick={() => { localStorage.setItem('tokymon_sync_key', syncKey); handleCloudSync(); }}
                        className="px-8 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                      >
                        Lưu & Sync
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold px-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 
                      Dữ liệu trên Mobile và PC sẽ được tự động gộp lại dựa trên thời gian cập nhật.
                    </p>
                  </div>
                </div>
              )}

              {settingsSubTab === 'branches' && currentUser.role === UserRole.SUPER_ADMIN && (
                <BranchManager branches={branches} setBranches={setBranches} onAudit={addAuditLog} />
              )}
              {settingsSubTab === 'users' && currentUser.role === UserRole.SUPER_ADMIN && (
                <UserManager users={users} setUsers={setUsers} branches={activeBranches} onAudit={addAuditLog} currentUserId={currentUser.id} />
              )}
              {settingsSubTab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <CategoryManager title={t('categories_man')} categories={expenseCategories} onUpdate={setExpenseCategories} />
                  <RecurringManager recurringExpenses={activeRecurring} onUpdate={setRecurringExpenses} categories={expenseCategories} onGenerateTransactions={txs => setTransactions(prev => [...txs, ...prev])} branchId={currentBranchId} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
