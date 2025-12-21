
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Transaction, RecurringTransaction, Branch, User, UserRole, Language, 
  AuditLogEntry, AppData, SCHEMA_VERSION, TransactionType, formatCurrency 
} from './types';
import { StorageService } from './services/storageService';
import Dashboard from './components/Dashboard';
import IncomeManager from './components/IncomeManager';
import ExpenseManager from './components/ExpenseManager';
import CategoryManager from './components/CategoryManager';
import RecurringManager from './components/RecurringManager';
import BranchManager from './components/BranchManager';
import UserManager from './components/UserManager';
import { useTranslation } from './i18n';
import { 
  UtensilsCrossed, LayoutDashboard, Settings, 
  Wallet, ArrowDownCircle, Sun, Moon, LogOut, 
  History as HistoryIcon, MapPin, Users, RefreshCw, Database, 
  ChevronDown, Cloud, Zap, ShieldCheck, CreditCard, Wifi, WifiOff
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'stats' | 'settings'>('income');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'branches' | 'users' | 'sync' | 'audit'>('general');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tokymon_theme') === 'dark');
  const [lang] = useState<Language>(() => (localStorage.getItem('tokymon_lang') as Language) || 'vi');
  const t = useTranslation(lang);

  const [data, setData] = useState<AppData>(() => StorageService.loadLocal());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [syncKey, setSyncKey] = useState(() => localStorage.getItem('tokymon_sync_key') || '');
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
    if (!syncKey) return;
    if (!silent) setIsSyncing(true);
    try {
      const targetData = specificData || dataRef.current;
      const merged = await StorageService.syncWithCloud(syncKey, targetData);
      setData(merged);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error("Lỗi đồng bộ");
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [syncKey]);

  useEffect(() => {
    if (syncKey) {
      handleCloudSync(true);
      pollTimerRef.current = window.setInterval(() => {
        handleCloudSync(true);
      }, 10000);
    }
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, [syncKey, handleCloudSync]);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('tokymon_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const activeTransactions = useMemo(() => data.transactions.filter(tx => !tx.deletedAt), [data.transactions]);
  const activeBranches = useMemo(() => data.branches.filter(b => !b.deletedAt), [data.branches]);
  const activeUsers = useMemo(() => data.users.filter(u => !u.deletedAt), [data.users]);

  const allowedBranches = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) return activeBranches;
    return activeBranches.filter(b => currentUser.assignedBranchIds.includes(b.id));
  }, [activeBranches, currentUser]);

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

  const handleAddTransaction = (transaction: Transaction) => {
    const newData = { ...data, transactions: [transaction, ...data.transactions] };
    setData(newData);
    addAuditLog('CREATE', 'TRANSACTION', transaction.id, `Thêm giao dịch: ${transaction.category}`);
    handleCloudSync(true, newData);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm("Xác nhận xóa?")) {
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

  const handleUpdateSyncKey = (val: string) => {
    setSyncKey(val);
    localStorage.setItem('tokymon_sync_key', val);
  };

  const currentBranch = activeBranches.find(b => b.id === currentBranchId);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl mb-12">
          <UtensilsCrossed className="w-12 h-12 text-white" />
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          const user = activeUsers.find(u => u.username === loginForm.username && u.password === loginForm.password);
          if (user) { setCurrentUser(user); localStorage.setItem('tokymon_user', JSON.stringify(user)); }
          else setLoginError('Sai tài khoản hoặc mật khẩu!');
        }} className="w-full max-w-sm space-y-4">
          <h1 className="text-3xl font-black text-center dark:text-white uppercase mb-8 tracking-tighter">Tokymon Admin</h1>
          <input type="text" placeholder="Username" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-5 bg-white dark:bg-slate-900 rounded-3xl font-bold border-2 border-transparent focus:border-indigo-500 shadow-sm outline-none dark:text-white" />
          <input type="password" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-5 bg-white dark:bg-slate-900 rounded-3xl font-bold border-2 border-transparent focus:border-indigo-500 shadow-sm outline-none dark:text-white" />
          {loginError && <p className="text-rose-500 text-center text-xs font-bold uppercase">{loginError}</p>}
          <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase shadow-xl active:scale-95 transition-all">Đăng nhập</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors duration-300 pb-24">
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-[100] bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl border-b dark:border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700">
              <MapPin className="w-4 h-4 text-indigo-500" />
              <span className="text-[11px] font-black uppercase dark:text-white">{currentBranch?.name || 'Chọn cơ sở'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
            <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[200]">
              {allowedBranches.map(b => (
                <div key={b.id} onClick={() => { setCurrentBranchId(b.id); localStorage.setItem('tokymon_current_branch', b.id); }} className="px-5 py-4 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-[10px] font-black uppercase border-l-4 border-transparent hover:border-indigo-500 transition-all">
                  {b.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syncKey ? (
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-2xl border dark:border-slate-700">
               <div className="flex flex-col items-end">
                  <span className="text-[7px] font-black text-slate-400 uppercase leading-none">Cloud Sync</span>
                  <span className="text-[9px] font-black text-slate-900 dark:text-white leading-none mt-1">{lastSyncTime || 'Sẵn sàng'}</span>
               </div>
               <div className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-2xl">
               <WifiOff className="w-4 h-4" />
               <span className="text-[8px] font-black uppercase">Chưa kết nối</span>
            </div>
          )}
          <button onClick={() => setIsDark(!isDark)} className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700">
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-8 max-w-5xl mx-auto w-full pt-4">
        {activeTab === 'income' && <IncomeManager transactions={data.transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={handleUpdateTransaction} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} />}
        {activeTab === 'expense' && <ExpenseManager transactions={data.transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={handleUpdateTransaction} expenseCategories={data.expenseCategories} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} />}
        {activeTab === 'stats' && <Dashboard transactions={activeTransactions} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} lang={lang} currentBranchId={currentBranchId} allowedBranches={allowedBranches} userRole={currentUser.role} />}
        
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {[
                { id: 'general', label: 'Cài đặt', icon: Settings },
                { id: 'sync', label: 'Kết nối Cloud', icon: Cloud },
                { id: 'branches', label: 'Cơ sở', icon: MapPin },
                { id: 'users', label: 'Nhân sự', icon: Users },
                { id: 'audit', label: 'Nhật ký', icon: HistoryIcon }
              ].map(sub => (
                <button key={sub.id} onClick={() => setSettingsSubTab(sub.id as any)} style={{ display: (sub.id === 'branches' || sub.id === 'users') && (currentUser.role !== UserRole.SUPER_ADMIN) ? 'none' : 'flex' }} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 shrink-0 ${settingsSubTab === sub.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                  <sub.icon className="w-4 h-4" /> {sub.label}
                </button>
              ))}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 border dark:border-slate-700 shadow-sm">
              {settingsSubTab === 'sync' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl"><Zap className="w-10 h-10 text-indigo-600" /></div>
                    <div>
                      <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter leading-none mb-1">Kết nối KVDB.io</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đồng bộ dữ liệu đa thiết bị</p>
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2">KVDB Bucket ID</label>
                      <input 
                        type="text" 
                        value={syncKey} 
                        onChange={e => handleUpdateSyncKey(e.target.value)} 
                        placeholder="Dán mã NZQkBL... vào đây" 
                        className="w-full p-5 bg-slate-50 dark:bg-slate-900 rounded-3xl font-black border-2 border-transparent focus:border-indigo-500 outline-none text-sm transition-all dark:text-white" 
                      />
                      <p className="text-[9px] font-medium text-slate-400 px-2 italic">Dán mã <strong>NZQkBLdrxvnEEMUw928weK</strong> để bắt đầu sử dụng bucket của bạn.</p>
                    </div>
                    <button onClick={() => handleCloudSync()} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                      <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} /> Đồng bộ dữ liệu ngay
                    </button>
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-indigo-100 dark:border-slate-700">
                     <h4 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Trạng thái</h4>
                     <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                       Phần mềm sẽ tự động đồng bộ mỗi 10 giây. Sau khi nhập mã vào iPhone, bạn chỉ cần nhập liệu, dữ liệu sẽ tự động xuất hiện trên Máy tính và ngược lại.
                     </p>
                  </div>
                </div>
              )}

              {settingsSubTab === 'branches' && <BranchManager branches={data.branches} setBranches={(bs: any) => setData(prev => ({ ...prev, branches: typeof bs === 'function' ? bs(prev.branches) : bs }))} onAudit={addAuditLog} />}
              {settingsSubTab === 'users' && <UserManager users={data.users} setUsers={(us: any) => setData(prev => ({ ...prev, users: typeof us === 'function' ? us(prev.users) : us }))} branches={activeBranches} onAudit={addAuditLog} currentUserId={currentUser.id} />}
              {settingsSubTab === 'general' && (
                <div className="space-y-8">
                  <CategoryManager title="Hạng mục Chi phí" categories={data.expenseCategories} onUpdate={(cats) => setData(prev => ({ ...prev, expenseCategories: cats }))} />
                  <RecurringManager recurringExpenses={data.recurringExpenses.filter(r => !r.deletedAt)} onUpdate={(recs) => setData(prev => ({ ...prev, recurringExpenses: recs }))} categories={data.expenseCategories} onGenerateTransactions={txs => setData(prev => ({ ...prev, transactions: [...txs, ...prev.transactions] }))} branchId={currentBranchId} />
                </div>
              )}
              {settingsSubTab === 'audit' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-4 px-2">Nhật ký hoạt động</h3>
                  <div className="space-y-3 overflow-y-auto max-h-[400px] no-scrollbar">
                    {data.auditLogs.slice().reverse().map(log => (
                      <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border dark:border-slate-700">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-black text-indigo-500 uppercase">{log.username}</span>
                          <span className="text-[8px] font-bold text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-white">{log.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button onClick={() => { localStorage.removeItem('tokymon_user'); setCurrentUser(null); }} className="w-full py-5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-900/30 active:scale-95">
              <LogOut className="w-4 h-4" /> Đăng xuất
            </button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 h-24 bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border-t dark:border-slate-700 flex items-center justify-around px-6 pb-8 z-[200]">
        {[
          { id: 'income', label: 'Doanh Thu', icon: Wallet },
          { id: 'expense', label: 'Chi Phí', icon: ArrowDownCircle },
          { id: 'stats', label: 'Báo Cáo', icon: LayoutDashboard },
          { id: 'settings', label: 'Cài Đặt', icon: Settings }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex flex-col items-center gap-1.5 transition-all relative ${activeTab === tab.id ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
          >
            <div className={`p-2 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}>
              <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'stroke-[3]' : 'stroke-[2]'}`} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-tighter ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
