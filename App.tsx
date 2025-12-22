
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Transaction, RecurringTransaction, Branch, User, UserRole, Language, 
  AuditLogEntry, AppData, SCHEMA_VERSION, TransactionType, formatCurrency, ReportSettings 
} from './types';
import { StorageService } from './services/storageService';
import Dashboard from './components/Dashboard';
import IncomeManager from './components/IncomeManager';
import ExpenseManager from './components/ExpenseManager';
import CategoryManager from './components/CategoryManager';
import RecurringManager from './components/RecurringManager';
import BranchManager from './components/BranchManager';
import UserManager from './components/UserManager';
import ExportManager from './components/ExportManager';
import ReportSettingsManager from './components/ReportSettingsManager';
import { useTranslation } from './i18n';
import { 
  UtensilsCrossed, LayoutDashboard, Settings, 
  Wallet, ArrowDownCircle, Sun, Moon, LogOut, 
  History as HistoryIcon, MapPin, Users, RefreshCw, Database, 
  ChevronDown, Cloud, Zap, ShieldCheck, CreditCard, Wifi, WifiOff, AlertTriangle,
  Fingerprint, Sparkles, FileSpreadsheet, LayoutPanelTop
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'stats' | 'settings'>('income');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'display' | 'export' | 'branches' | 'users' | 'sync' | 'audit'>('general');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tokymon_theme') === 'dark');
  const [lang] = useState<Language>(() => (localStorage.getItem('tokymon_lang') as Language) || 'vi');
  const t = useTranslation(lang);

  const [data, setData] = useState<AppData>(() => StorageService.loadLocal());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [syncErrorMessage, setSyncErrorMessage] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  
  const [syncKey, setSyncKey] = useState(() => {
    return localStorage.getItem('tokymon_sync_key') || 'NZQkBLdrxvnEEMUw928weK';
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('tokymon_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => localStorage.getItem('tokymon_current_branch') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  const pollTimerRef = useRef<number | null>(null);
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
    StorageService.saveLocal(data);
  }, [data]);

  const handleCloudSync = useCallback(async (silent = false, specificData?: AppData) => {
    if (!syncKey || syncKey.trim() === '') return;
    if (!silent) setIsSyncing(true);
    
    try {
      const targetData = specificData || dataRef.current;
      const merged = await StorageService.syncWithCloud(syncKey, targetData);
      setData(merged);
      setSyncStatus('SUCCESS');
      setSyncErrorMessage('');
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      if (!silent) setTimeout(() => setSyncStatus('IDLE'), 3000);
    } catch (e: any) {
      console.error("Cloud Sync Error:", e);
      setSyncStatus('ERROR');
      setSyncErrorMessage(e.message || "Lỗi đồng bộ");
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [syncKey]);

  useEffect(() => {
    if (syncKey && currentUser) {
      handleCloudSync(true);
      pollTimerRef.current = window.setInterval(() => {
        handleCloudSync(true);
      }, 20000);
    }
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, [syncKey, handleCloudSync, currentUser]);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('tokymon_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const activeTransactions = useMemo(() => data.transactions.filter(tx => !tx.deletedAt), [data.transactions]);
  const activeBranches = useMemo(() => data.branches.filter(b => !b.deletedAt), [data.branches]);
  const activeUsers = useMemo(() => data.users.filter(u => !u.deletedAt), [data.users]);

  // Phân quyền chi nhánh chặt chẽ
  const allowedBranches = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) return activeBranches;
    return activeBranches.filter(b => currentUser.assignedBranchIds.includes(b.id));
  }, [activeBranches, currentUser]);

  useEffect(() => {
    if (currentUser && allowedBranches.length > 0) {
      const isCurrentBranchValid = allowedBranches.some(b => b.id === currentBranchId);
      if (!currentBranchId || !isCurrentBranchValid) {
        const firstBranch = allowedBranches[0].id;
        setCurrentBranchId(firstBranch);
        localStorage.setItem('tokymon_current_branch', firstBranch);
      }
    }
  }, [allowedBranches, currentBranchId, currentUser]);

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
    setData(prev => ({ ...prev, auditLogs: [newLog, ...prev.auditLogs].slice(0, 500) }));
  }, [currentUser]);

  const handleLogout = () => {
    if (window.confirm("Bạn muốn đăng xuất khỏi hệ thống Tokymon?")) {
      // Xóa tất cả session
      localStorage.removeItem('tokymon_user');
      localStorage.removeItem('tokymon_current_branch');
      setCurrentUser(null);
      setCurrentBranchId('');
      setActiveTab('income');
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    }
  };

  const handleAddTransaction = (transaction: Transaction) => {
    const newData = { ...data, transactions: [transaction, ...data.transactions] };
    setData(newData);
    addAuditLog('CREATE', 'TRANSACTION', transaction.id, `Thêm giao dịch: ${transaction.category}`);
    handleCloudSync(true, newData);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm("Xác nhận xóa giao dịch này?")) {
      const now = new Date().toISOString();
      const newData = {
        ...data,
        transactions: data.transactions.map(t => t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t)
      };
      setData(newData);
      addAuditLog('DELETE', 'TRANSACTION', id, `Xóa giao dịch`);
      handleCloudSync(true, newData);
    }
  };

  const handleUpdateTransaction = (updated: Transaction) => {
    const newData = {
      ...data,
      transactions: data.transactions.map(t => t.id === updated.id ? updated : t)
    };
    setData(newData);
    addAuditLog('UPDATE', 'TRANSACTION', updated.id, `Cập nhật giao dịch`);
    handleCloudSync(true, newData);
  };

  const currentBranch = activeBranches.find(b => b.id === currentBranchId);

  const reportSettings: ReportSettings = data.reportSettings || {
    showSystemTotal: true,
    showShopRevenue: true,
    showAppRevenue: true,
    showCardRevenue: true,
    showActualCash: true,
    showProfit: true
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden relative">
        <div className="absolute top-0 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse delay-700" />
        
        <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl mb-8 rotate-3 relative z-10">
          <UtensilsCrossed className="w-10 h-10 text-white" />
        </div>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          const user = activeUsers.find(u => u.username.toLowerCase() === loginForm.username.toLowerCase() && u.password === loginForm.password);
          if (user) { 
            setCurrentUser(user); 
            localStorage.setItem('tokymon_user', JSON.stringify(user)); 
          } else {
            setLoginError('Tài khoản hoặc mật khẩu không chính xác!');
          }
        }} className="w-full max-w-[340px] space-y-4 relative z-10 animate-in fade-in zoom-in duration-300">
          <div className="text-center space-y-1 mb-8">
             <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Tokymon</h1>
             <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Financial Management System</p>
          </div>
          
          <div className="space-y-3">
            <div className="relative group">
              <input type="text" placeholder="Tên đăng nhập" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-500 outline-none dark:text-white transition-all pl-12 shadow-sm" />
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
            </div>
            <div className="relative group">
              <input type="password" placeholder="Mật khẩu" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-500 outline-none dark:text-white transition-all pl-12 shadow-sm" />
              <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
            </div>
          </div>

          {loginError && <p className="text-rose-500 text-center text-[10px] font-black uppercase bg-rose-50 dark:bg-rose-900/20 py-3 rounded-xl border border-rose-100 dark:border-rose-900/30">{loginError}</p>}
          
          <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-xl active:scale-[0.98] transition-all text-xs tracking-widest hover:bg-indigo-700">
            Đăng nhập hệ thống
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300 pb-20">
      <header className="px-4 py-3 flex items-center justify-between sticky top-0 z-[100] glass border-b border-white/20 dark:border-slate-800/50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative group">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 transition-all cursor-pointer active:scale-95">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase dark:text-white truncate max-w-[100px]">{currentBranch?.name || 'Chi nhánh'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
            <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[200] overflow-hidden">
              <div className="p-3 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Chọn chi nhánh làm việc</p>
              </div>
              {allowedBranches.map(b => (
                <div key={b.id} onClick={() => { setCurrentBranchId(b.id); localStorage.setItem('tokymon_current_branch', b.id); }} className={`px-4 py-3 cursor-pointer hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-between ${currentBranchId === b.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                  <span className="text-[10px] font-black uppercase">{b.name}</span>
                  {currentBranchId === b.id && <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 px-2.5 py-2 rounded-xl border ${syncStatus === 'ERROR' ? 'border-rose-500' : 'dark:border-slate-800'}`}>
             <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-spin border' : syncStatus === 'ERROR' ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
             <span className={`text-[9px] font-black uppercase leading-none ${syncStatus === 'ERROR' ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>{lastSyncTime || 'Ready'}</span>
          </div>
          
          <button onClick={() => setIsDark(!isDark)} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 active:scale-90">
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 max-w-6xl mx-auto w-full pt-4">
        {activeTab === 'income' && <IncomeManager transactions={data.transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={handleUpdateTransaction} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} branchName={currentBranch?.name} />}
        {activeTab === 'expense' && <ExpenseManager transactions={data.transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={handleUpdateTransaction} expenseCategories={data.expenseCategories} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} branchName={currentBranch?.name} />}
        {activeTab === 'stats' && <Dashboard transactions={activeTransactions} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} lang={lang} currentBranchId={currentBranchId} allowedBranches={allowedBranches} userRole={currentUser.role} reportSettings={reportSettings} />}
        
        {activeTab === 'settings' && (
          <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'general', label: 'Hạng mục', icon: Settings },
                { id: 'display', label: 'Báo cáo', icon: LayoutPanelTop },
                { id: 'export', label: 'Xuất Excel', icon: FileSpreadsheet },
                { id: 'sync', label: 'Cloud', icon: Cloud },
                { id: 'branches', label: 'Cơ sở', icon: MapPin },
                { id: 'users', label: 'User', icon: Users },
                { id: 'audit', label: 'Logs', icon: HistoryIcon }
              ].map(sub => (
                <button key={sub.id} onClick={() => setSettingsSubTab(sub.id as any)} style={{ display: (sub.id === 'branches' || sub.id === 'users') && (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.role !== UserRole.ADMIN) ? 'none' : 'flex' }} className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all flex items-center gap-2 shrink-0 ${settingsSubTab === sub.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
                  <sub.icon className="w-3.5 h-3.5" /> {sub.label}
                </button>
              ))}
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-6 border dark:border-slate-800 shadow-sm min-h-[450px]">
              {settingsSubTab === 'sync' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600"><Zap className="w-6 h-6" /></div>
                    <div>
                      <h3 className="text-sm font-black dark:text-white uppercase leading-none mb-1">Thiết lập đồng bộ Cloud</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Đồng bộ dữ liệu đa thiết bị qua KVDB</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <input type="text" value={syncKey} onChange={e => {setSyncKey(e.target.value); localStorage.setItem('tokymon_sync_key', e.target.value);}} placeholder="Nhập Cloud ID..." className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black border-2 border-transparent focus:border-indigo-500 outline-none text-xs dark:text-white" />
                    <button onClick={() => handleCloudSync()} disabled={isSyncing} className="w-full py-4.5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-100 dark:shadow-none">
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> Đồng bộ ngay lập tức
                    </button>
                  </div>
                </div>
              )}

              {settingsSubTab === 'display' && <ReportSettingsManager settings={reportSettings} onUpdate={val => {setData({...data, reportSettings: val}); handleCloudSync(true, {...data, reportSettings: val});}} />}
              {settingsSubTab === 'export' && <ExportManager transactions={data.transactions} branches={data.branches} />}
              {settingsSubTab === 'branches' && <BranchManager branches={data.branches} setBranches={bs => {const val = typeof bs === 'function' ? bs(data.branches) : bs; setData({...data, branches: val}); handleCloudSync(true, {...data, branches: val});}} onAudit={addAuditLog} />}
              {settingsSubTab === 'users' && <UserManager users={data.users} setUsers={us => {const val = typeof us === 'function' ? us(data.users) : us; setData({...data, users: val}); handleCloudSync(true, {...data, users: val});}} branches={activeBranches} onAudit={addAuditLog} currentUserId={currentUser.id} />}
              {settingsSubTab === 'general' && (
                <div className="space-y-8">
                  <CategoryManager title="Hạng mục Chi phí" categories={data.expenseCategories} onUpdate={(cats) => {setData({...data, expenseCategories: cats}); handleCloudSync(true, {...data, expenseCategories: cats});}} />
                  <RecurringManager recurringExpenses={data.recurringExpenses.filter(r => !r.deletedAt)} categories={data.expenseCategories} onUpdate={(recs) => {setData({...data, recurringExpenses: recs}); handleCloudSync(true, {...data, recurringExpenses: recs});}} onGenerateTransactions={txs => {setData({...data, transactions: [...txs, ...data.transactions]}); handleCloudSync(true, {...data, transactions: [...txs, ...data.transactions]});}} branchId={currentBranchId} />
                </div>
              )}
              {settingsSubTab === 'audit' && (
                <div className="space-y-4 h-[500px] overflow-y-auto custom-scrollbar pr-2">
                  {data.auditLogs.slice().reverse().map(log => (
                    <div key={log.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800 flex items-start gap-4">
                      <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 font-black text-[10px] uppercase">{log.username[0]}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-black text-indigo-500 uppercase">{log.username}</span>
                          <span className="text-[8px] font-bold text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button onClick={handleLogout} className="w-full py-5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 border border-rose-100 dark:border-rose-900/30 active:scale-[0.98] transition-all hover:bg-rose-100 dark:hover:bg-rose-900/40">
              <LogOut className="w-4 h-4" /> Đăng xuất khỏi hệ thống
            </button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-4 left-6 right-6 h-18 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border dark:border-slate-800 flex items-center justify-around px-4 rounded-[2.5rem] shadow-2xl z-[200]">
        {[
          { id: 'income', label: 'Doanh Thu', icon: Wallet },
          { id: 'expense', label: 'Chi Phí', icon: ArrowDownCircle },
          { id: 'stats', label: 'Báo cáo', icon: LayoutDashboard },
          { id: 'settings', label: 'Cài đặt', icon: Settings }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1 transition-all relative py-2 rounded-2xl flex-1 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 hover:text-indigo-400'}`}>
            {activeTab === tab.id && <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-full animate-in fade-in slide-in-from-top-1" />}
            <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className={`text-[8px] font-black uppercase tracking-tight ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
