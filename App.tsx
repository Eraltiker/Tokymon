
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
  ChevronDown, Cloud, Zap, ShieldCheck, CreditCard
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'stats' | 'settings'>('income');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'branches' | 'users' | 'sync' | 'audit'>('general');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tokymon_theme') === 'dark');
  const [lang] = useState<Language>(() => (localStorage.getItem('tokymon_lang') as Language) || 'vi');
  const t = useTranslation(lang);

  // Core Data State
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
  
  const syncTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  // Đồng bộ hóa dữ liệu ngầm và lưu cục bộ
  useEffect(() => {
    StorageService.saveLocal(data);
    if (syncKey) {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = window.setTimeout(() => {
        handleCloudSync(true);
      }, 1500); // Lưu xong 1.5s là đẩy lên cloud ngay
    }
  }, [data, syncKey]);

  // Polling dữ liệu mới mỗi 15 giây để cập nhật tức thời từ máy khác
  useEffect(() => {
    if (syncKey) {
      pollTimerRef.current = window.setInterval(() => {
        handleCloudSync(true);
      }, 15000);
    }
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, [syncKey]);

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

  useEffect(() => {
    if (currentUser && allowedBranches.length > 0) {
      if (!currentBranchId || !allowedBranches.some(b => b.id === currentBranchId)) {
        const defaultId = allowedBranches[0].id;
        setCurrentBranchId(defaultId);
        localStorage.setItem('tokymon_current_branch', defaultId);
      }
    }
  }, [currentUser, allowedBranches, currentBranchId]);

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

  // Added missing transaction handler functions to resolve build errors.
  const handleAddTransaction = useCallback((transaction: Transaction) => {
    setData(prev => ({
      ...prev,
      transactions: [transaction, ...prev.transactions]
    }));
    addAuditLog('CREATE', 'TRANSACTION', transaction.id, `Thêm ${transaction.type === TransactionType.INCOME ? 'doanh thu' : 'chi phí'}: ${transaction.category} (${formatCurrency(transaction.amount, lang)})`);
  }, [addAuditLog, lang]);

  const handleDeleteTransaction = useCallback((id: string) => {
    const tx = data.transactions.find(t => t.id === id);
    if (!tx) return;
    if (window.confirm(t('confirm_delete'))) {
      const now = new Date().toISOString();
      setData(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t)
      }));
      addAuditLog('DELETE', 'TRANSACTION', id, `Xóa giao dịch: ${tx.category} (${formatCurrency(tx.amount, lang)})`);
    }
  }, [data.transactions, addAuditLog, t, lang]);

  const handleUpdateTransaction = useCallback((updated: Transaction) => {
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === updated.id ? updated : t)
    }));
    addAuditLog('UPDATE', 'TRANSACTION', updated.id, `Cập nhật giao dịch: ${updated.category} (${formatCurrency(updated.amount, lang)})`);
  }, [addAuditLog, lang]);

  const handleCloudSync = async (silent = false) => {
    if (!syncKey) return;
    if (!silent) setIsSyncing(true);
    try {
      const merged = await StorageService.syncWithCloud(syncKey, data);
      setData(merged);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error("Sync failed", e);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  const handleUpdateSyncKey = (val: string) => {
    setSyncKey(val);
    localStorage.setItem('tokymon_sync_key', val);
    if (val) handleCloudSync();
  };

  const currentBranch = activeBranches.find(b => b.id === currentBranchId);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8">
        <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-200 dark:shadow-none mb-10 animate-bounce">
          <UtensilsCrossed className="w-10 h-10 text-white" />
        </div>
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tighter dark:text-white uppercase">Tokymon</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Hệ thống quản lý nội bộ</p>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const user = activeUsers.find(u => u.username === loginForm.username && u.password === loginForm.password);
            if (user) {
              setCurrentUser(user);
              localStorage.setItem('tokymon_user', JSON.stringify(user));
              addAuditLog('LOGIN', 'USER', user.id, 'Đăng nhập thành công');
            } else setLoginError('Thông tin đăng nhập không chính xác!');
          }} className="space-y-4">
            <input type="text" placeholder="Username" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-5 bg-white dark:bg-slate-900 rounded-3xl font-bold border-2 border-transparent focus:border-indigo-500 shadow-sm outline-none dark:text-white transition-all" />
            <input type="password" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-5 bg-white dark:bg-slate-900 rounded-3xl font-bold border-2 border-transparent focus:border-indigo-500 shadow-sm outline-none dark:text-white transition-all" />
            {loginError && <p className="text-rose-500 text-center text-xs font-black uppercase tracking-tight">{loginError}</p>}
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none active:scale-95 transition-all">Truy cập hệ thống</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300 pb-28">
      {/* Top Header - Compact */}
      <header className="px-6 py-4 flex items-center justify-between sticky top-0 z-[100] bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border dark:border-slate-800 cursor-pointer">
              <MapPin className="w-4 h-4 text-indigo-500" />
              <span className="text-[11px] font-black uppercase dark:text-white truncate max-w-[100px]">{currentBranch?.name || 'Chi nhánh'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
            <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[200] overflow-hidden">
              {allowedBranches.map(b => (
                <div key={b.id} onClick={() => { setCurrentBranchId(b.id); localStorage.setItem('tokymon_current_branch', b.id); }} className={`px-5 py-4 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-[10px] font-black uppercase border-l-4 transition-all ${currentBranchId === b.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-500'}`}>
                  {b.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {syncKey && (
            <div className="flex flex-col items-end mr-2">
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{isSyncing ? 'Syncing...' : 'Synced'}</span>
              </div>
              <span className="text-[7px] font-bold text-slate-300 uppercase">{lastSyncTime}</span>
            </div>
          )}
          <button onClick={() => setIsDark(!isDark)} className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border dark:border-slate-800">
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 md:px-8 max-w-5xl mx-auto w-full pt-2">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'income' && <IncomeManager transactions={data.transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={handleUpdateTransaction} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} />}
          {activeTab === 'expense' && <ExpenseManager transactions={data.transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={handleUpdateTransaction} expenseCategories={data.expenseCategories} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} />}
          {activeTab === 'stats' && <Dashboard transactions={activeTransactions} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} lang={lang} currentBranchId={currentBranchId} allowedBranches={allowedBranches} userRole={currentUser.role} />}
          
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {[
                  { id: 'general', label: 'Chung', icon: Settings },
                  { id: 'sync', label: 'Đồng bộ', icon: Database },
                  { id: 'branches', label: 'Chi nhánh', icon: MapPin },
                  { id: 'users', label: 'Nhân sự', icon: Users },
                  { id: 'audit', label: 'Nhật ký', icon: HistoryIcon }
                ].map(sub => (
                  <button key={sub.id} onClick={() => setSettingsSubTab(sub.id as any)} style={{ display: (sub.id === 'branches' || sub.id === 'users') && (currentUser.role !== UserRole.SUPER_ADMIN) ? 'none' : 'flex' }} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 shrink-0 ${settingsSubTab === sub.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
                    <sub.icon className="w-4 h-4" /> {sub.label}
                  </button>
                ))}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border dark:border-slate-800 shadow-sm min-h-[400px]">
                {settingsSubTab === 'sync' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="flex items-center gap-5">
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl"><Cloud className="w-10 h-10 text-emerald-600" /></div>
                      <div>
                        <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter leading-none mb-1">Cài đặt Đám mây</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đồng bộ đa thiết bị tức thời</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2">Mã Sync Key của quán</label>
                        <input type="text" value={syncKey} onChange={e => handleUpdateSyncKey(e.target.value)} placeholder="Nhập mã bí mật..." className="w-full p-5 bg-slate-50 dark:bg-slate-800 rounded-3xl font-black border-2 border-transparent focus:border-indigo-500 outline-none text-sm" />
                      </div>
                      <button onClick={() => handleCloudSync()} className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl flex items-center justify-center gap-3">
                        <Zap className="w-5 h-5" /> Đồng bộ ngay bây giờ
                      </button>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                       <h4 className="text-[11px] font-black text-slate-800 dark:text-white uppercase mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> An toàn dữ liệu</h4>
                       <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Khi nhập cùng một mã <strong>Sync Key</strong> trên nhiều iPhone/PC, dữ liệu sẽ tự động gộp lại và cập nhật lẫn nhau sau mỗi 15 giây. Bạn không bao giờ sợ mất dữ liệu khi đổi máy.</p>
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
                    <h3 className="text-xs font-black uppercase text-slate-400 mb-4 px-2">Nhật ký hệ thống mới nhất</h3>
                    <div className="space-y-3">
                      {data.auditLogs.slice(0, 30).map(log => (
                        <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border dark:border-slate-700">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black text-indigo-500 uppercase">{log.username}</span>
                            <span className="text-[8px] font-bold text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{log.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <button onClick={() => { localStorage.removeItem('tokymon_user'); setCurrentUser(null); }} className="w-full py-5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-900/30">
                <LogOut className="w-4 h-4" /> Đăng xuất khỏi thiết bị
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation - Fixed for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 h-24 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t dark:border-slate-800 flex items-center justify-around px-6 pb-6 z-[200]">
        {[
          { id: 'income', label: 'Thu', icon: Wallet },
          { id: 'expense', label: 'Chi', icon: ArrowDownCircle },
          { id: 'stats', label: 'Báo cáo', icon: LayoutDashboard },
          { id: 'settings', label: 'Cài đặt', icon: Settings }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`flex flex-col items-center gap-1.5 transition-all relative ${activeTab === tab.id ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
          >
            <div className={`p-2 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-indigo-50 dark:bg-indigo-900/30 shadow-sm' : ''}`}>
              <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'stroke-[3]' : 'stroke-[2]'}`} />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-tighter ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
            {activeTab === tab.id && <div className="absolute -bottom-2 w-1 h-1 bg-indigo-600 rounded-full" />}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
