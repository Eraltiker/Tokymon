
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
  History as HistoryIcon, MapPin, Users, RefreshCw, Database, CheckCircle2, ChevronDown
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
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => localStorage.getItem('tokymon_current_branch') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncKey, setSyncKey] = useState(() => localStorage.getItem('tokymon_sync_key') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Lọc dữ liệu "sống"
  const activeTransactions = useMemo(() => transactions.filter(tx => !tx.deletedAt), [transactions]);
  const activeBranches = useMemo(() => branches.filter(b => !b.deletedAt), [branches]);
  const activeUsers = useMemo(() => users.filter(u => !u.deletedAt), [users]);
  const activeRecurring = useMemo(() => recurringExpenses.filter(r => !r.deletedAt), [recurringExpenses]);

  // Chi nhánh mà User có quyền truy cập
  const allowedBranches = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) return activeBranches;
    return activeBranches.filter(b => currentUser.assignedBranchIds.includes(b.id));
  }, [activeBranches, currentUser]);

  // Cập nhật currentBranchId nếu nó không hợp lệ hoặc trống
  useEffect(() => {
    if (currentUser && allowedBranches.length > 0) {
      if (!currentBranchId || !allowedBranches.some(b => b.id === currentBranchId)) {
        const defaultId = allowedBranches[0].id;
        setCurrentBranchId(defaultId);
        localStorage.setItem('tokymon_current_branch', defaultId);
      }
    }
  }, [currentUser, allowedBranches, currentBranchId]);

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
    
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('tokymon_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

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
    } catch (e) {
      if (!silent) alert("Sync failed: " + e);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

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
    addAuditLog('CREATE', 'TRANSACTION', tx.id, `Thêm ${tx.type} ${tx.amount}€ tại chi nhánh ${currentBranchId}`);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm("Xóa giao dịch này?")) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : t));
      addAuditLog('DELETE', 'TRANSACTION', id, `Xóa giao dịch`);
    }
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const tx = { ...updatedTx, updatedAt: new Date().toISOString() };
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? tx : t));
    addAuditLog('UPDATE', 'TRANSACTION', tx.id, `Cập nhật giao dịch`);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = activeUsers.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('tokymon_user', JSON.stringify(user));
      setLoginError('');
    } else {
      setLoginError('Sai thông tin đăng nhập!');
    }
  };

  const handleBranchChange = (id: string) => {
    setCurrentBranchId(id);
    localStorage.setItem('tokymon_current_branch', id);
  };

  if (!currentUser) {
     return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
          <form onSubmit={handleLogin} className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] shadow-2xl w-full max-w-md border dark:border-slate-800 transition-all">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-600/20">
              <UtensilsCrossed className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-center mb-10 uppercase text-slate-900 dark:text-white leading-none tracking-tight">TOKYMON</h1>
            <div className="space-y-5">
              <input type="text" placeholder="Tên đăng nhập" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold dark:text-white outline-none transition-all" required />
              <input type="password" placeholder="Mật khẩu" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl font-bold dark:text-white outline-none transition-all" required />
              {loginError && <p className="text-rose-500 text-center text-xs font-bold bg-rose-50 dark:bg-rose-900/20 py-2 rounded-lg">{loginError}</p>}
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95">Đăng nhập</button>
            </div>
          </form>
        </div>
      );
  }

  const currentBranch = activeBranches.find(b => b.id === currentBranchId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <header className="h-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b dark:border-slate-800 flex items-center justify-between px-4 md:px-12 sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><UtensilsCrossed className="w-6 h-6 text-white" /></div>
          
          <div className="hidden lg:flex flex-col">
            <h1 className="text-xl font-black dark:text-white leading-none tracking-tight">TOKYMON</h1>
            <div className="flex items-center gap-2 mt-1.5">
               <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isSyncing ? 'Đang đồng bộ...' : (lastSync ? `Đã đồng bộ: ${new Date(lastSync).toLocaleTimeString()}` : 'Cục bộ')}</span>
            </div>
          </div>

          <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800 hidden md:block" />

          {/* Branch Switcher Dropdown */}
          <div className="relative group">
            <div className="flex items-center gap-3 px-5 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-indigo-500/30">
              <MapPin className="w-4 h-4 text-indigo-500" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chi nhánh hiện tại</span>
                <span className="text-xs font-black text-slate-800 dark:text-white uppercase truncate max-w-[120px]">
                  {currentBranch?.name || 'Chọn chi nhánh'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
            
            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[200] overflow-hidden">
               <div className="p-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh sách cơ sở của bạn</span>
               </div>
               <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {allowedBranches.map(b => (
                    <div 
                      key={b.id} 
                      onClick={() => handleBranchChange(b.id)}
                      className={`px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all border-l-4 ${currentBranchId === b.id ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-transparent'}`}
                    >
                      <div className={`p-2 rounded-xl ${currentBranchId === b.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-xs font-black uppercase ${currentBranchId === b.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{b.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold truncate">{b.address}</span>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setIsDark(!isDark)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
          <button onClick={() => handleCloudSync(false)} className={`p-3 rounded-2xl transition-all ${isSyncing ? 'bg-indigo-50 text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'}`}>
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { localStorage.removeItem('tokymon_user'); setCurrentUser(null); }} className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-900 transition-all"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8 pb-32">
        <nav className="flex gap-2 p-2 bg-white dark:bg-slate-900 rounded-[2rem] w-fit shadow-lg shadow-slate-200/50 dark:shadow-none border dark:border-slate-800 overflow-x-auto no-scrollbar">
          {[
            { id: 'income', label: t('income'), icon: Wallet },
            { id: 'expense', label: t('expense'), icon: ArrowDownCircle },
            { id: 'stats', label: t('stats'), icon: LayoutDashboard },
            { id: 'settings', label: t('settings'), icon: Settings }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <tab.icon className="w-4 h-4" /> <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {!currentBranchId && activeTab !== 'settings' ? (
            <div className="py-24 text-center space-y-4">
              <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-amber-300">
                <MapPin className="w-10 h-10 text-amber-500" />
              </div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Chưa chọn chi nhánh</h2>
              <p className="text-slate-400 font-bold max-w-sm mx-auto">Vui lòng chọn một chi nhánh ở phía trên góc trái để bắt đầu nhập liệu.</p>
            </div>
          ) : (
            <>
              {activeTab === 'income' && <IncomeManager transactions={transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={handleUpdateTransaction} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} />}
              {activeTab === 'expense' && <ExpenseManager transactions={transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={handleUpdateTransaction} expenseCategories={expenseCategories} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} />}
              {activeTab === 'stats' && <Dashboard transactions={activeTransactions} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} lang={lang} currentBranchId={currentBranchId} allowedBranches={allowedBranches} userRole={currentUser.role} />}
              
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
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap ${settingsSubTab === sub.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-indigo-300'}`}
                      >
                        <sub.icon className="w-4 h-4" /> {sub.label}
                      </button>
                    ))}
                  </div>

                  {settingsSubTab === 'sync' && (
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border dark:border-slate-800 shadow-xl max-w-2xl mx-auto space-y-8 animate-in zoom-in-95">
                      <div className="flex items-center gap-5">
                        <div className="p-5 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl">
                          <Database className="w-10 h-10 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black dark:text-white uppercase tracking-tight leading-none mb-2">Đồng bộ đám mây</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Mã bí mật giúp gộp dữ liệu đa thiết bị</p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="flex gap-3">
                          <input 
                            type="text" 
                            value={syncKey} 
                            onChange={e => setSyncKey(e.target.value)} 
                            placeholder="Nhập mã bí mật..." 
                            className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-indigo-500 font-bold dark:text-white transition-all outline-none"
                          />
                          <button 
                            onClick={() => { localStorage.setItem('tokymon_sync_key', syncKey); handleCloudSync(); }}
                            className="px-8 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase shadow-xl shadow-indigo-600/20 active:scale-95 transition-all whitespace-nowrap"
                          >
                            Lưu & Sync
                          </button>
                        </div>
                        <div className="flex items-start gap-3 p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                          <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed uppercase tracking-tighter">
                            Hệ thống sử dụng thuật toán Hợp nhất (Merge) thông minh. Giao dịch mới nhất trên PC hoặc Mobile sẽ được giữ lại, không làm mất dữ liệu của nhau.
                          </p>
                        </div>
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
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
