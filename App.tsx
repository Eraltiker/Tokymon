
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import BranchManager from './components/BranchManager';
import UserManager from './components/UserManager';
import { useTranslation } from './i18n';
import { 
  UtensilsCrossed, LayoutDashboard, Settings, 
  Wallet, ArrowDownCircle, Sun, Moon, LogOut, 
  History as HistoryIcon, MapPin, Users, RefreshCw, Database, 
  CheckCircle2, ChevronDown, Download, Upload, Copy, ClipboardCheck, Key, Link, AlertTriangle, CloudRain, Cloud
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'stats' | 'settings'>('income');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'branches' | 'users' | 'security' | 'audit' | 'sync'>('general');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tokymon_theme') === 'dark');
  const [lang] = useState<Language>(() => (localStorage.getItem('tokymon_lang') as Language) || 'vi');
  const t = useTranslation(lang);

  // Core Data State
  const [data, setData] = useState<AppData>(() => StorageService.loadLocal());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<string>('');
  const [syncKey, setSyncKey] = useState(() => localStorage.getItem('tokymon_sync_key') || '');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('tokymon_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => localStorage.getItem('tokymon_current_branch') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  
  const syncTimerRef = useRef<number | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  // 1. Lưu Local mỗi khi Data thay đổi
  useEffect(() => {
    StorageService.saveLocal(data);
    // 2. Kích hoạt Auto-Sync ngầm khi dữ liệu thay đổi (Debounced)
    if (syncKey) {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = window.setTimeout(() => {
        handleCloudSync(true);
      }, 2000);
    }
  }, [data, syncKey]);

  // 3. Cơ chế Polling - Tự động tải dữ liệu từ máy khác mỗi 30s
  useEffect(() => {
    if (syncKey) {
      pollTimerRef.current = window.setInterval(() => {
        handleCloudSync(true);
      }, 30000);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
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

  const handleCloudSync = async (silent = false) => {
    if (!syncKey) return;
    if (!silent) setIsSyncing(true);
    try {
      const merged = await StorageService.syncWithCloud(syncKey, data);
      setData(merged);
      setLastSyncStatus(new Date().toLocaleTimeString());
    } catch (e) {
      if (!silent) alert("Lỗi kết nối đồng bộ!");
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  const handleUpdateSyncKey = (val: string) => {
    setSyncKey(val);
    localStorage.setItem('tokymon_sync_key', val);
    if (val) handleCloudSync();
  };

  const handleImportCode = () => {
    if (!pasteInput.trim()) return;
    const decoded = StorageService.decodeSyncCode(pasteInput);
    if (decoded) {
      const merged = StorageService.mergeAppData(data, decoded);
      setData(merged);
      setPasteInput('');
      alert("Đã gộp dữ liệu thành công!");
      addAuditLog('UPDATE', 'TRANSACTION', 'sync', 'Gộp dữ liệu qua Sync Code');
    } else {
      alert("Mã đồng bộ không hợp lệ!");
    }
  };

  const handleCopySyncCode = async () => {
    const code = StorageService.encodeSyncCode(data);
    if (!code) { setCopyError(true); return; }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
        setCopySuccess(true);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = code; document.body.appendChild(textArea);
        textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);
        setCopySuccess(true);
      }
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  const handleAddTransaction = (newTx: Transaction) => {
    const tx = { ...newTx, updatedAt: new Date().toISOString(), history: newTx.history || [] };
    setData(prev => ({ ...prev, transactions: [tx, ...prev.transactions] }));
    addAuditLog('CREATE', 'TRANSACTION', tx.id, `Thêm giao dịch: ${tx.amount}€`);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm("Xóa giao dịch này?")) {
      const now = new Date().toISOString();
      setData(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t)
      }));
      addAuditLog('DELETE', 'TRANSACTION', id, `Xóa giao dịch`);
    }
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const tx = { ...updatedTx, updatedAt: new Date().toISOString() };
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === updatedTx.id ? tx : t)
    }));
    addAuditLog('UPDATE', 'TRANSACTION', tx.id, `Cập nhật giao dịch`);
  };

  const currentBranch = activeBranches.find(b => b.id === currentBranchId);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <form onSubmit={(e) => {
          e.preventDefault();
          const user = activeUsers.find(u => u.username === loginForm.username && u.password === loginForm.password);
          if (user) {
            setCurrentUser(user);
            localStorage.setItem('tokymon_user', JSON.stringify(user));
          } else setLoginError('Sai thông tin!');
        }} className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border dark:border-slate-800">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><UtensilsCrossed className="w-8 h-8 text-white" /></div>
          <h1 className="text-2xl font-black text-center mb-8 uppercase tracking-tighter dark:text-white">Tokymon Admin</h1>
          <div className="space-y-4">
            <input type="text" placeholder="User" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 dark:text-white" />
            <input type="password" placeholder="Pass" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500 dark:text-white" />
            {loginError && <p className="text-rose-500 text-center text-xs font-bold">{loginError}</p>}
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-all">Đăng nhập</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b dark:border-slate-800 flex items-center justify-between px-4 md:px-12 sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0"><UtensilsCrossed className="w-5 h-5 text-white" /></div>
          <div className="relative group">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-200 transition-all border border-transparent hover:border-indigo-500/30">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-black uppercase dark:text-white truncate max-w-[120px]">{currentBranch?.name || 'Chọn CS'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border dark:border-slate-800 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[200]">
              {allowedBranches.map(b => (
                <div key={b.id} onClick={() => { setCurrentBranchId(b.id); localStorage.setItem('tokymon_current_branch', b.id); }} className={`px-4 py-3 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-xs font-black uppercase border-l-4 ${currentBranchId === b.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-500'}`}>
                  {b.name}
                </div>
              ))}
            </div>
          </div>
          {syncKey && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-full border border-emerald-100 dark:border-emerald-900/50">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Live Sync: {lastSyncStatus || 'Active'}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsDark(!isDark)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl active:scale-90 transition-all">
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
          <button onClick={() => handleCloudSync()} className={`p-2.5 rounded-xl transition-all active:scale-90 ${isSyncing ? 'bg-indigo-100 text-indigo-600 animate-spin' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { localStorage.removeItem('tokymon_user'); setCurrentUser(null); }} className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-xl active:scale-90 transition-all"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 pb-24">
        <nav className="flex gap-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-2xl w-fit shadow-sm border dark:border-slate-800 overflow-x-auto no-scrollbar">
          {[
            { id: 'income', label: t('income'), icon: Wallet },
            { id: 'expense', label: t('expense'), icon: ArrowDownCircle },
            { id: 'stats', label: t('stats'), icon: LayoutDashboard },
            { id: 'settings', label: t('settings'), icon: Settings }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <tab.icon className="w-4 h-4" /> <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'income' && <IncomeManager transactions={data.transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={handleUpdateTransaction} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} />}
          {activeTab === 'expense' && <ExpenseManager transactions={data.transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={handleUpdateTransaction} expenseCategories={data.expenseCategories} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} />}
          {activeTab === 'stats' && <Dashboard transactions={activeTransactions} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} lang={lang} currentBranchId={currentBranchId} allowedBranches={allowedBranches} userRole={currentUser.role} />}
          
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {[
                  { id: 'general', label: t('all'), icon: Settings },
                  { id: 'sync', label: 'Sync & Backup', icon: Database },
                  { id: 'branches', label: t('branches'), icon: MapPin },
                  { id: 'users', label: t('users'), icon: Users },
                  { id: 'audit', label: t('audit_log'), icon: HistoryIcon }
                ].map(sub => (
                  <button key={sub.id} onClick={() => setSettingsSubTab(sub.id as any)} style={{ display: (sub.id === 'branches' || sub.id === 'users') && (currentUser.role !== UserRole.SUPER_ADMIN) ? 'none' : 'flex' }} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${settingsSubTab === sub.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-indigo-300'}`}>
                    <sub.icon className="w-3.5 h-3.5" /> {sub.label}
                  </button>
                ))}
              </div>

              {settingsSubTab === 'sync' && (
                <div className="space-y-6">
                  {/* Cloud Real-time Sync */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-2xl"><Cloud className="w-8 h-8 text-emerald-600" /></div>
                        <div>
                          <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter leading-none">Đồng bộ đám mây (Cloud)</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cập nhật dữ liệu tức thời giữa các máy</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <input 
                           type="text" 
                           value={syncKey} 
                           onChange={e => handleUpdateSyncKey(e.target.value)}
                           placeholder="Nhập mã Sync Key..." 
                           className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-black text-xs outline-none focus:border-emerald-500 w-full md:w-48"
                         />
                         <button onClick={() => handleCloudSync()} className="p-3.5 bg-emerald-600 text-white rounded-xl shadow-lg active:scale-90 transition-all"><RefreshCw className="w-5 h-5" /></button>
                      </div>
                    </div>
                    <div className="p-5 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                       <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 leading-relaxed">
                         <strong className="block mb-1">HƯỚNG DẪN:</strong>
                         1. Đặt một mã bí mật bất kỳ (VD: "tokymon_vip_123") vào ô Sync Key trên máy tính.<br/>
                         2. Nhập chính xác mã đó vào iPhone/iPad của bạn.<br/>
                         3. Dữ liệu sẽ tự động nhảy sang nhau sau mỗi lần nhập hoặc mỗi 30 giây ngầm.
                       </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in zoom-in-95">
                    {/* Sync Chain - Copy From Device */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-950 rounded-2xl"><Link className="w-8 h-8 text-indigo-600" /></div>
                        <div>
                          <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter leading-none">Xuất mã (Thủ công)</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dùng khi không có mạng Cloud</p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={handleCopySyncCode} 
                        className={`w-full py-8 rounded-3xl font-black uppercase text-xs tracking-widest flex flex-col items-center gap-3 transition-all active:scale-95 border-2 border-dashed ${copySuccess ? 'bg-emerald-500 border-emerald-500 text-white' : copyError ? 'bg-rose-500 border-rose-500 text-white' : 'bg-slate-50 dark:bg-slate-800 text-indigo-600 border-indigo-200 dark:border-indigo-900'}`}
                      >
                        {copySuccess ? <ClipboardCheck className="w-8 h-8" /> : copyError ? <AlertTriangle className="w-8 h-8" /> : <Copy className="w-8 h-8" />}
                        {copySuccess ? "ĐÃ SAO CHÉP MÃ" : copyError ? "LỖI SAO CHÉP!" : "SAO CHÉP MÃ DỮ LIỆU"}
                      </button>
                    </div>

                    {/* Sync Chain - Paste To Device */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-2xl"><Database className="w-8 h-8 text-amber-600" /></div>
                        <div>
                          <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter leading-none">Nhập mã (Thủ công)</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gộp mã từ máy khác vào máy này</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <textarea value={pasteInput} onChange={e => setPasteInput(e.target.value)} placeholder="Dán mã dữ liệu vào đây..." className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-indigo-500 font-mono text-[10px] outline-none dark:text-white" />
                        <button onClick={handleImportCode} className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-amber-700 active:scale-95 transition-all">XÁC NHẬN GỘP DỮ LIỆU</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsSubTab === 'branches' && currentUser.role === UserRole.SUPER_ADMIN && (
                <BranchManager branches={data.branches} setBranches={(bs: any) => setData(prev => ({ ...prev, branches: typeof bs === 'function' ? bs(prev.branches) : bs }))} onAudit={addAuditLog} />
              )}
              {settingsSubTab === 'users' && currentUser.role === UserRole.SUPER_ADMIN && (
                <UserManager users={data.users} setUsers={(us: any) => setData(prev => ({ ...prev, users: typeof us === 'function' ? us(prev.users) : us }))} branches={activeBranches} onAudit={addAuditLog} currentUserId={currentUser.id} />
              )}
              {settingsSubTab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CategoryManager title={t('categories_man')} categories={data.expenseCategories} onUpdate={(cats) => setData(prev => ({ ...prev, expenseCategories: cats }))} />
                  <RecurringManager recurringExpenses={data.recurringExpenses.filter(r => !r.deletedAt)} onUpdate={(recs) => setData(prev => ({ ...prev, recurringExpenses: recs }))} categories={data.expenseCategories} onGenerateTransactions={txs => setData(prev => ({ ...prev, transactions: [...txs, ...prev.transactions] }))} branchId={currentBranchId} />
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
