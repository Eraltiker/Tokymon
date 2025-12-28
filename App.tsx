
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Transaction, Branch, User, UserRole, Language, 
  AuditLogEntry, AppData, SCHEMA_VERSION, TransactionType, ReportSettings, ALL_BRANCHES_ID,
  APP_CHANGELOG
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
import GuideCenter from './components/GuideCenter';
import { useTranslation } from './i18n';
import { 
  UtensilsCrossed, LayoutDashboard, Settings, 
  Wallet, ArrowDownCircle, Sun, Moon, LogOut, 
  History as HistoryIcon, MapPin, Users, RefreshCw, 
  ChevronDown, Cloud, FileSpreadsheet, LayoutPanelTop,
  AlertTriangle, UserCircle2, 
  ArrowRight,
  Globe, Check, Info, ShieldCheck,
  Loader2, PartyPopper, X,
  Heart, LockKeyhole, HelpCircle, LayoutGrid, Terminal, ShieldAlert,
  Database, CloudCheck, Languages, Copy, CheckCircle, Wrench, WifiOff
} from 'lucide-react';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 phút
const GLOBAL_SYNC_KEY = 'NZQkBLdrxvnEEMUw928weK';
const SYNC_DEBOUNCE_MS = 25000; // Tránh lỗi 429 từ kvdb.io

const App = () => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'stats' | 'settings'>(() => {
    return (localStorage.getItem('tokymon_last_tab') as any) || 'stats';
  });
  
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'export' | 'branches' | 'users' | 'sync' | 'audit' | 'about' | 'guide'>('general');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tokymon_theme') === 'dark');
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('tokymon_lang') as Language) || 'vi');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const { t } = useTranslation(lang);
  const [data, setData] = useState<AppData>(StorageService.getEmptyData());
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncInProgressRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{show: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('tokymon_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => localStorage.getItem('tokymon_current_branch') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const inactivityTimerRef = useRef<number | null>(null);
  const dataRef = useRef(data);
  const syncDebounceRef = useRef<number | null>(null);

  const isAdmin = currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.ADMIN;
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    localStorage.setItem('tokymon_last_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (currentBranchId) {
      localStorage.setItem('tokymon_current_branch', currentBranchId);
    }
  }, [currentBranchId]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('tokymon_user');
    setCurrentUser(null);
    if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (!currentUser) return;
    if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
    
    inactivityTimerRef.current = window.setTimeout(() => {
      handleLogout();
    }, INACTIVITY_TIMEOUT);
  }, [currentUser, handleLogout]);

  useEffect(() => {
    if (currentUser) {
      const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
      events.forEach(event => window.addEventListener(event, resetInactivityTimer));
      resetInactivityTimer();
      return () => {
        events.forEach(event => window.removeEventListener(event, resetInactivityTimer));
        if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
      };
    }
  }, [currentUser, resetInactivityTimer]);

  const handleCloudSync = useCallback(async (silent = false, specificData?: AppData, forcePush: boolean = false) => {
    if (!navigator.onLine) {
      setSyncStatus('IDLE');
      return;
    }
    
    if (isSyncInProgressRef.current) return;
    isSyncInProgressRef.current = true;
    
    if (!silent) setIsSyncing(true);
    try {
      const targetData = specificData || dataRef.current;
      const merged = await StorageService.syncWithCloud(GLOBAL_SYNC_KEY, targetData, forcePush);
      
      setData(prev => {
        const hasChanges = JSON.stringify(prev) !== JSON.stringify(merged);
        if (hasChanges) {
          dataRef.current = merged;
          return merged;
        }
        return prev;
      });
      
      setSyncStatus('SUCCESS');
      if (!silent) setTimeout(() => setSyncStatus('IDLE'), 3000);
    } catch (e: any) { 
      setSyncStatus('ERROR'); 
      console.error("Sync Failed", e);
    } finally {
      if (!silent) setIsSyncing(false);
      isSyncInProgressRef.current = false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      const loadedData = await StorageService.loadLocal();
      if (isMounted) {
        setData(loadedData);
        dataRef.current = loadedData;
        setIsDataLoaded(true);
        if (navigator.onLine) handleCloudSync(true, loadedData);
      }
    };
    initData();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleCloudSync]);

  useEffect(() => {
    if (isDataLoaded) {
      StorageService.saveLocal(data);
      dataRef.current = data;
      
      if (isOnline) {
        if (syncDebounceRef.current) window.clearTimeout(syncDebounceRef.current);
        syncDebounceRef.current = window.setTimeout(() => handleCloudSync(true), SYNC_DEBOUNCE_MS);
      }
    }
  }, [data, isDataLoaded, isOnline, handleCloudSync]);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('tokymon_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleLanguage = () => {
    const next = lang === 'vi' ? 'de' : 'vi';
    setLang(next);
    localStorage.setItem('tokymon_lang', next);
  };

  const activeBranches = useMemo(() => data.branches.filter(b => !b.deletedAt), [data.branches]);
  const activeTransactions = useMemo(() => {
    const activeBranchIds = new Set(activeBranches.map(b => b.id));
    return data.transactions.filter(tx => !tx.deletedAt && activeBranchIds.has(tx.branchId));
  }, [data.transactions, activeBranches]);

  const activeUsers = useMemo(() => data.users.filter(u => !u.deletedAt), [data.users]);

  const allowedBranches = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return activeBranches;
    return activeBranches.filter(b => currentUser.assignedBranchIds.includes(b.id));
  }, [activeBranches, currentUser, isAdmin]);

  useEffect(() => {
    if (currentUser && allowedBranches.length > 0) {
      const isValid = allowedBranches.some(b => b.id === currentBranchId) || currentBranchId === ALL_BRANCHES_ID;
      if (!currentBranchId || !isValid) {
        const first = isAdmin ? ALL_BRANCHES_ID : allowedBranches[0].id;
        setCurrentBranchId(first);
      }
    }
  }, [allowedBranches, currentBranchId, currentUser, isAdmin]);

  const addAuditLog = useCallback((action: AuditLogEntry['action'], entityType: AuditLogEntry['entityType'], entityId: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLogEntry = {
      id: Date.now().toString(), timestamp: new Date().toISOString(), userId: currentUser.id,
      username: currentUser.username, action, entityType, entityId, details
    };
    setData(prev => ({ ...prev, auditLogs: [newLog, ...prev.auditLogs].slice(0, 500) }));
  }, [currentUser]);

  const handleDeleteTransaction = (id: string) => {
    const now = new Date().toISOString();
    setData(p => ({
      ...p, 
      transactions: p.transactions.map(t => 
        t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t
      )
    }));
    addAuditLog('DELETE', 'TRANSACTION', id, `Xóa giao dịch`);
  };

  const handleResetBranchData = (branchId: string) => {
    setData(prev => ({...prev, transactions: prev.transactions.filter(tx => tx.branchId !== branchId)}));
    addAuditLog('DELETE', 'BRANCH', branchId, `Reset dữ liệu chi nhánh`);
  };

  const currentBranchName = currentBranchId === ALL_BRANCHES_ID ? t('all_branches') : activeBranches.find(b => b.id === currentBranchId)?.name || '---';
  const activeBranchColor = currentBranchId === ALL_BRANCHES_ID ? '#4f46e5' : activeBranches.find(b => b.id === currentBranchId)?.color || '#4f46e5';

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = activeUsers.find(u => 
      u.username.trim().toLowerCase() === loginForm.username.trim().toLowerCase() && 
      u.password.trim() === loginForm.password.trim()
    );
    if (user) { 
      setCurrentUser(user); 
      localStorage.setItem('tokymon_user', JSON.stringify(user)); 
      addAuditLog('LOGIN', 'USER', user.id, `Đăng nhập thành công`); 
    } else { 
      setLoginError(t('error_login')); 
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-6 font-sans overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-[360px] z-10 space-y-8 animate-ios">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-vivid flex items-center justify-center mx-auto border border-white dark:border-slate-800">
              <UtensilsCrossed className="w-10 h-10 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-950 dark:text-white tracking-tighter uppercase leading-none">TOKYMON</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">{t('login_sub')}</p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="glass p-8 rounded-[2.5rem] shadow-2xl space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  value={loginForm.username} 
                  onChange={e => {setLoginForm({...loginForm, username: e.target.value}); setLoginError('');}} 
                  className="w-full p-4 bg-slate-50 dark:bg-black/30 rounded-2xl font-bold border border-slate-200 dark:border-white/5 outline-none dark:text-white text-slate-950 pl-12 text-[15px] focus:border-brand-500 transition-colors" 
                  placeholder={t('username')} 
                  autoCapitalize="none"
                  required 
                />
                <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              </div>
              <div className="relative">
                <input 
                  type="password" 
                  value={loginForm.password} 
                  onChange={e => {setLoginForm({...loginForm, password: e.target.value}); setLoginError('');}} 
                  className="w-full p-4 bg-slate-50 dark:bg-black/30 rounded-2xl font-bold border border-slate-200 dark:border-white/5 outline-none dark:text-white text-slate-950 pl-12 text-[15px] focus:border-brand-500 transition-colors" 
                  placeholder={t('password')} 
                  required 
                />
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 flex items-center gap-2 animate-shake">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <p className="text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase">{loginError}</p>
              </div>
            )}

            <button type="submit" className="w-full h-14 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest active-scale shadow-vivid flex items-center justify-center gap-2">
               {t('login')} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="flex justify-center gap-4 pt-2">
             <button 
               onClick={toggleLanguage} 
               className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 active-scale transition-all"
             >
                <Languages className="w-4 h-4 text-brand-600" />
                <span className="text-[10px] font-black uppercase tracking-widest dark:text-slate-200">
                  {lang === 'vi' ? 'Tiếng Việt' : 'Deutsch'}
                </span>
             </button>
          </div>

          <div className="text-center space-y-2 opacity-60">
             <div className="flex items-center justify-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('dev_by')} <span className="text-brand-600">thPhuoc</span></span>
             </div>
             <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t('ver')} {SCHEMA_VERSION}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 font-sans pb-[env(safe-area-inset-bottom)]" style={{ '--brand-dynamic': activeBranchColor } as any}>
      <header className="px-4 py-3 flex items-center justify-between sticky top-0 z-[1000] glass border-b border-white dark:border-slate-800/60 shadow-sm safe-pt">
        <div className="flex items-center gap-3 min-w-0 max-w-[50%]">
           <div className="relative w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-vivid shrink-0" style={{ backgroundColor: activeBranchColor }}>
              <UtensilsCrossed className="w-5 h-5" />
           </div>
           <button onClick={() => setShowBranchDropdown(!showBranchDropdown)} className="flex flex-col items-start min-w-0">
              <div className="flex items-center gap-1.5 w-full">
                <span className="text-[13px] font-black uppercase dark:text-white truncate tracking-tighter leading-none">{currentBranchName}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showBranchDropdown ? 'rotate-180' : ''}`} />
              </div>
              <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-0.5">{currentUser?.role}</p>
           </button>
        </div>

        <div className="flex items-center gap-2">
           <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
              {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : (syncStatus === 'SUCCESS' ? <CheckCircle className="w-3 h-3" /> : (syncStatus === 'ERROR' ? <AlertTriangle className="w-3 h-3 text-rose-500" /> : <CloudCheck className="w-3 h-3" />))}
              <span className="text-[8px] font-black uppercase tracking-widest">
                {!isOnline ? 'Offline' : (isSyncing ? 'Syncing...' : (syncStatus === 'ERROR' ? 'Sync Error' : 'Synced'))}
              </span>
           </div>
           <div className="p-1 rounded-full border border-white dark:border-slate-700/50 flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/40">
             <button onClick={toggleLanguage} className="w-8 h-8 rounded-lg flex items-center justify-center active-scale text-slate-600 dark:text-slate-300">
               <span className="text-[9px] font-black uppercase">{lang === 'vi' ? 'VN' : 'DE'}</span>
             </button>
             <button onClick={() => setIsDark(!isDark)} className="w-8 h-8 rounded-lg flex items-center justify-center active-scale">
               {isDark ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-brand-600" />}
             </button>
             <button onClick={() => setConfirmModal({ show: true, title: t('logout'), message: t('confirm_logout'), onConfirm: handleLogout })} className="w-8 h-8 text-rose-500 rounded-lg active-scale flex items-center justify-center">
               <LogOut className="w-3.5 h-3.5" />
             </button>
           </div>
        </div>

        {showBranchDropdown && (
          <>
            <div className="fixed inset-0 z-[1001]" onClick={() => setShowBranchDropdown(false)} />
            <div className="absolute top-full left-4 mt-2 w-64 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 z-[1002] overflow-hidden animate-in slide-in-from-top-2">
              {isAdmin && (
                <button onClick={() => { setCurrentBranchId(ALL_BRANCHES_ID); setShowBranchDropdown(false); }} className={`w-full text-left px-6 py-4.5 transition-all flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 ${currentBranchId === ALL_BRANCHES_ID ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 font-black' : 'dark:text-slate-300 text-slate-700 font-bold'}`}>
                    <div className="flex items-center gap-3"><Globe className="w-4.5 h-4.5" /><span className="text-[11px] font-black uppercase">{t('all_branches')}</span></div>
                    {currentBranchId === ALL_BRANCHES_ID && <Check className="w-3.5 h-3.5" />}
                </button>
              )}
              <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                {allowedBranches.map(b => (
                  <button key={b.id} onClick={() => { setCurrentBranchId(b.id); setShowBranchDropdown(false); }} className={`w-full text-left px-6 py-4.5 transition-all flex items-center justify-between border-b last:border-0 border-slate-50 dark:border-slate-800/50 ${currentBranchId === b.id ? 'bg-slate-50 dark:bg-slate-800/50 font-black' : 'dark:text-slate-300 text-slate-700 font-bold'}`} style={{ color: currentBranchId === b.id ? b.color : 'inherit' }}>
                    <div className="flex items-center gap-3">
                       <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                       <span className="text-[11px] font-black uppercase">{b.name}</span>
                    </div>
                    {currentBranchId === b.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </header>

      <main className="flex-1 px-4 max-w-6xl mx-auto w-full pt-4 pb-32">
        {!isDataLoaded ? (
          <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tokymon Engine Warming Up...</p>
          </div>
        ) : (
          <div className="animate-ios">
            {activeTab === 'income' && (
              currentBranchId === ALL_BRANCHES_ID ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white/60 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800"><LayoutPanelTop className="w-12 h-12 text-slate-300 mb-6" /><p className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('choose_branch_hint')}</p><button onClick={() => setShowBranchDropdown(true)} className="mt-8 px-8 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest" style={{ backgroundColor: activeBranchColor }}>{t('select_branch_btn')}</button></div>
              ) : (
                <IncomeManager transactions={activeTransactions} onAddTransaction={tx => setData(p => ({...p, transactions: [tx, ...p.transactions]}))} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={u => setData(p => ({...p, transactions: p.transactions.map(t => t.id === u.id ? u : t)}))} branchId={currentBranchId} initialBalances={{cash: 0, card: 0}} userRole={currentUser.role} branchName={currentBranchName} lang={lang} />
              )
            )}
            {activeTab === 'expense' && (
              currentBranchId === ALL_BRANCHES_ID ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white/60 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800"><ArrowDownCircle className="w-12 h-12 text-slate-300 mb-6" /><p className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('choose_branch_hint')}</p><button onClick={() => setShowBranchDropdown(true)} className="mt-8 px-8 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest" style={{ backgroundColor: activeBranchColor }}>{t('select_branch_btn')}</button></div>
              ) : (
                <ExpenseManager transactions={activeTransactions} onAddTransaction={tx => setData(p => ({...p, transactions: [tx, ...p.transactions]}))} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={u => setData(p => ({...p, transactions: p.transactions.map(t => t.id === u.id ? u : t)}))} expenseCategories={data.expenseCategories} branchId={currentBranchId} initialBalances={{cash: 0, card: 0}} userRole={currentUser.role} branchName={currentBranchName} lang={lang} />
              )
            )}
            {activeTab === 'stats' && <Dashboard transactions={activeTransactions} initialBalances={{cash: 0, card: 0}} lang={lang} currentBranchId={currentBranchId} allowedBranches={allowedBranches} userRole={currentUser.role} reportSettings={data.reportSettings || StorageService.getEmptyData().reportSettings!} />}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="flex gap-2 overflow-x-auto no-scrollbar px-1 pb-2">
                  {[ 
                    { id: 'general', label: t('branding'), icon: LayoutGrid }, 
                    { id: 'guide', label: t('guide'), icon: HelpCircle },
                    { id: 'export', label: 'Excel', icon: FileSpreadsheet }, 
                    { id: 'sync', label: 'Cloud', icon: Cloud }, 
                    { id: 'branches', label: t('branches'), icon: MapPin }, 
                    { id: 'users', label: t('users'), icon: Users }, 
                    { id: 'audit', label: 'Log', icon: HistoryIcon }, 
                    { id: 'about', label: t('about'), icon: Info }
                  ].map(sub => {
                    const isVisible = (sub.id === 'branches' || sub.id === 'users') ? isAdmin : (sub.id === 'sync' ? isSuperAdmin : true);
                    if (!isVisible) return null;

                    return (
                      <button 
                        key={sub.id} 
                        onClick={() => setSettingsSubTab(sub.id as any)} 
                        style={{ 
                          backgroundColor: settingsSubTab === sub.id ? activeBranchColor : ''
                        }} 
                        className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 shrink-0 active-scale ${settingsSubTab === sub.id ? 'bg-slate-900 border-transparent text-white shadow-vivid' : 'bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-500'}`}
                      >
                        <sub.icon className="w-3.5 h-3.5" /> {sub.label}
                      </button>
                    );
                  })}
                </div>
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] p-5 border border-white/20 dark:border-slate-800 shadow-ios min-h-[450px]">
                    {settingsSubTab === 'guide' && <GuideCenter lang={lang} />}
                    {settingsSubTab === 'sync' && isSuperAdmin && (
                      <div className="space-y-8 max-w-md mx-auto pt-6 animate-ios">
                        <div className="text-center space-y-3">
                           <div className="w-20 h-20 bg-brand-50/50 dark:bg-brand-900/10 text-brand-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner border border-brand-100 dark:border-brand-900/20" style={{ color: activeBranchColor }}><Database className="w-10 h-10" /></div>
                           <h3 className="text-xl font-black uppercase dark:text-white tracking-tight">Enterprise Cloud Vault</h3>
                           <div className="flex items-center justify-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-50'}`} />
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isOnline ? 'Cloud Active' : 'Offline Mode'}</p>
                           </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border-2 border-slate-200 dark:border-slate-800 space-y-4">
                           <div className="flex items-center justify-between">
                             <span className="text-[9px] font-black uppercase text-slate-400">Cloud Bucket ID (Permanent)</span>
                             <button onClick={() => { navigator.clipboard.writeText(GLOBAL_SYNC_KEY); alert('Bucket ID copied!'); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                               <Copy className="w-3.5 h-3.5 text-brand-600" />
                             </button>
                           </div>
                           <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 font-mono text-[11px] font-bold dark:text-brand-400 break-all">
                              {GLOBAL_SYNC_KEY}
                           </div>
                        </div>

                        <div className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 border-2 border-emerald-200 dark:border-emerald-800 rounded-[2rem] space-y-3">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-sm">
                                {syncStatus === 'ERROR' ? <ShieldAlert className="w-5 h-5 text-rose-500" /> : <ShieldCheck className="w-5 h-5 text-emerald-600" />}
                             </div>
                             <div className="min-w-0">
                               <p className="text-[9px] font-black uppercase text-emerald-600 leading-none" style={{ color: syncStatus === 'ERROR' ? '#f43f5e' : '' }}>Status</p>
                               <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase truncate">
                                 {syncStatus === 'ERROR' ? (lang === 'vi' ? 'Lỗi kết nối' : 'Sync Error') : (data.lastSync ? `Last Sync: ${new Date(data.lastSync).toLocaleString()}` : 'Never Synced')}
                               </p>
                             </div>
                           </div>
                        </div>

                        <div className="space-y-3">
                          <button 
                            onClick={() => handleCloudSync()} 
                            disabled={isSyncing || !isOnline} 
                            className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 active-scale shadow-vivid disabled:opacity-40 transition-all" 
                            style={{ backgroundColor: activeBranchColor }}
                          >
                            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} /> 
                            {isSyncing ? 'Synchronizing...' : (lang === 'vi' ? 'Đồng bộ lại ngay' : 'Sync Now')}
                          </button>

                          {syncStatus === 'ERROR' && (
                            <button 
                              onClick={() => {
                                if(window.confirm(lang === 'vi' ? 'Sử dụng dữ liệu máy này để ghi đè lên Cloud và đồng nhất tất cả các máy khác?' : 'Use this device data to overwrite cloud and fix all other devices?')) {
                                  handleCloudSync(false, undefined, true);
                                }
                              }} 
                              className="w-full py-5 bg-rose-500/10 text-rose-600 border border-rose-200 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 active-scale transition-all"
                            >
                              <Wrench className="w-4 h-4" /> 
                              {lang === 'vi' ? 'Sửa lỗi Cloud (Ghi đè)' : 'Force Repair Cloud'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {settingsSubTab === 'export' && <ExportManager transactions={activeTransactions} branches={activeBranches} lang={lang} />}
                    {settingsSubTab === 'branches' && isAdmin && <BranchManager branches={data.branches} setBranches={(update: any) => setData(p => ({...p, branches: update(p.branches)}))} onAudit={addAuditLog} setGlobalConfirm={setConfirmModal} onResetBranchData={handleResetBranchData} lang={lang} />}
                    {settingsSubTab === 'users' && isAdmin && <UserManager users={data.users} setUsers={val => setData(p => ({...p, users: typeof val === 'function' ? val(p.users) : val}))} branches={activeBranches} onAudit={addAuditLog} currentUserId={currentUser.id} setGlobalConfirm={setConfirmModal} lang={lang} />}
                    {settingsSubTab === 'general' && ( <div className="space-y-10"><CategoryManager title={t('categories_man')} categories={data.expenseCategories} onUpdate={(cats) => setData(prev => ({...prev, expenseCategories: cats}))} lang={lang} /><RecurringManager recurringExpenses={data.recurringExpenses.filter(r => !r.deletedAt)} categories={data.expenseCategories} onUpdate={(recs) => setData(prev => ({...prev, recurringExpenses: recs}))} onGenerateTransactions={txs => setData(prev => ({...prev, transactions: [...txs, ...prev.transactions]}))} branchId={currentBranchId === ALL_BRANCHES_ID ? allowedBranches[0]?.id : currentBranchId} lang={lang} /></div> )}
                    {settingsSubTab === 'audit' && (
                      <div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar pr-2">
                        {data.auditLogs.slice().reverse().map(log => (
                          <div key={log.id} className="p-5 bg-slate-50 dark:bg-slate-950/40 rounded-3xl border border-slate-100 dark:border-slate-800"><div className="flex justify-between items-start mb-2"><span className="text-[9px] font-black px-2 py-1 bg-brand-600 text-white rounded-lg uppercase" style={{ backgroundColor: activeBranchColor }}>{log.action}</span><span className="text-[9px] text-slate-400 font-bold uppercase">{new Date(log.timestamp).toLocaleString()}</span></div><div className="text-xs font-bold dark:text-slate-200 uppercase tracking-tight">{log.details}</div></div>
                        ))}
                      </div>
                    )}
                    {settingsSubTab === 'about' && (
                      <div className="space-y-6 animate-ios max-w-xl mx-auto py-2">
                        <div className="text-center space-y-4">
                           <div className="relative inline-block">
                               <div className="w-14 h-14 bg-brand-600 rounded-[1.4rem] mx-auto flex items-center justify-center shadow-vivid" style={{ backgroundColor: activeBranchColor }}><UtensilsCrossed className="w-7 h-7 text-white" /></div>
                               <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[8px] font-black px-1 py-0.5 rounded-full border border-white dark:border-slate-900 uppercase leading-none">{t('active')}</div>
                           </div>
                           <div>
                              <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter leading-none mb-1">Tokymon Official</h2>
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('ver')} {SCHEMA_VERSION}</p>
                           </div>
                        </div>
                        <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center gap-4">
                           <ShieldCheck className="w-8 h-8 text-blue-600 shrink-0" />
                           <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase text-blue-600 mb-1">{t('enterprise_security')}</p>
                              <p className="text-[11px] font-bold dark:text-blue-300">Dữ liệu được bảo mật bằng mã hóa đồng bộ đa lớp.</p>
                           </div>
                        </div>
                        <div className="pt-6 border-t dark:border-slate-800 border-slate-100 text-center">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Developed with <Heart className="w-3 h-3 text-rose-500 inline mx-1 fill-rose-500" /> by <span className="text-brand-600 font-extrabold" style={{ color: activeBranchColor }}>thPhuoc</span></p>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 px-6 z-[2000] flex justify-center pointer-events-none pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <nav className="h-16 max-w-md w-full glass border border-white/40 dark:border-slate-800 flex items-center justify-around px-2 rounded-[2rem] shadow-2xl pointer-events-auto">
          {[
            { id: 'income', label: t('income'), icon: Wallet },
            { id: 'expense', label: t('expense'), icon: ArrowDownCircle },
            { id: 'stats', label: t('stats'), icon: LayoutDashboard },
            { id: 'settings', label: t('settings'), icon: Settings }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1.5 relative py-1.5 rounded-xl flex-1 transition-all active-scale ${activeTab === tab.id ? 'opacity-100' : 'text-slate-400'}`} style={{ color: activeTab === tab.id ? activeBranchColor : '' }}>
              <tab.icon className="w-5 h-5" />
              <span className={`text-[8px] font-black uppercase tracking-widest ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
              {activeTab === tab.id && <div className="absolute -top-2 w-6 h-1 rounded-full" style={{ backgroundColor: activeBranchColor }} />}
            </button>
          ))}
        </nav>
      </div>

      {confirmModal && confirmModal.show && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 animate-ios">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center mb-6"><AlertTriangle className="w-7 h-7" /></div>
              <h3 className="text-xl font-black dark:text-white uppercase tracking-tight mb-2">{confirmModal.title}</h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8">{confirmModal.message}</p>
              <div className="flex gap-3">
                 <button onClick={() => setConfirmModal(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest active-scale">Hủy</button>
                 <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active-scale shadow-lg shadow-rose-600/20">Đồng ý</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
