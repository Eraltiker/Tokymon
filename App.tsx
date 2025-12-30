
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Transaction, Branch, User, Category, UserRole, Language, UserPreferences,
  AuditLogEntry, AppData, SCHEMA_VERSION, TransactionType, ReportSettings, ALL_BRANCHES_ID,
  APP_CHANGELOG, INITIAL_EXPENSE_CATEGORIES, DEFAULT_RECURRING_TEMPLATE, RecurringTransaction, ExpenseSource
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
  Database, CloudCheck, Languages, Copy, CheckCircle, Wrench, WifiOff,
  Code, Github, ExternalLink, ScrollText, CheckCircle2,
  User as UserIcon, Lock
} from 'lucide-react';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 phút
const GLOBAL_SYNC_KEY = 'NZQkBLdrxvnEEMUw928weK';
const SYNC_DEBOUNCE_MS = 8000;

const App = () => {
  const validateSessionOnStartup = () => {
    try {
      const savedUser = localStorage.getItem('tokymon_user');
      const lastActivity = localStorage.getItem('tokymon_last_activity');
      if (!savedUser) return null;
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
        if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
          localStorage.removeItem('tokymon_user');
          localStorage.removeItem('tokymon_last_activity');
          localStorage.removeItem('tokymon_last_tab');
          return null;
        }
      }
      return JSON.parse(savedUser);
    } catch (e) { return null; }
  };

  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'stats' | 'settings'>(() => {
    if (!localStorage.getItem('tokymon_user')) return 'stats';
    return (localStorage.getItem('tokymon_last_tab') as any) || 'stats';
  });
  
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'export' | 'branches' | 'users' | 'sync' | 'audit' | 'about' | 'guide'>('general');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tokymon_theme') === 'dark');
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('tokymon_lang');
    return (saved === 'vi' || saved === 'de') ? saved : 'vi';
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const { t } = useTranslation(lang);
  const [data, setData] = useState<AppData>(StorageService.getEmptyData());
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncInProgressRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{show: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  
  const [currentUser, setCurrentUser] = useState<User | null>(validateSessionOnStartup);
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => localStorage.getItem('tokymon_current_branch') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const inactivityTimerRef = useRef<number | null>(null);
  const dataRef = useRef(data);
  const syncDebounceRef = useRef<number | null>(null);

  const isAdmin = currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.ADMIN;
  const isSuperAdmin = currentUser?.role === UserRole.SUPER_ADMIN;

  const handleCloudSync = useCallback(async (silent = false, specificData?: AppData, forcePush: boolean = false) => {
    if (!navigator.onLine || isSyncInProgressRef.current) return;
    
    isSyncInProgressRef.current = true;
    if (!silent) setIsSyncing(true);
    
    try {
      const targetData = specificData || dataRef.current;
      const merged = await StorageService.syncWithCloud(GLOBAL_SYNC_KEY, targetData, forcePush);
      
      setData(prev => {
        dataRef.current = merged;
        if (currentUser) {
          const updatedProfile = merged.users.find(u => u.id === currentUser.id);
          if (updatedProfile && JSON.stringify(updatedProfile) !== JSON.stringify(currentUser)) {
             setCurrentUser(updatedProfile);
             localStorage.setItem('tokymon_user', JSON.stringify(updatedProfile));
          }
        }
        StorageService.saveLocal(merged);
        return merged;
      });
      
      setSyncStatus('SUCCESS');
      if (!silent) setTimeout(() => setSyncStatus('IDLE'), 3000);
    } catch (e: any) { 
      setSyncStatus('ERROR'); 
    } finally {
      if (!silent) setIsSyncing(false);
      isSyncInProgressRef.current = false;
    }
  }, [currentUser]);

  const atomicUpdate = useCallback(async (updater: (prev: AppData) => AppData, immediateSync = false) => {
    const nextData = updater(dataRef.current);
    dataRef.current = nextData;
    setData(nextData);
    
    StorageService.saveLocal(nextData);
    
    if (immediateSync && navigator.onLine) {
      await handleCloudSync(true, nextData);
    }
  }, [handleCloudSync]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('tokymon_user');
    localStorage.removeItem('tokymon_last_activity');
    setCurrentUser(null);
    if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (!currentUser) return;
    localStorage.setItem('tokymon_last_activity', Date.now().toString());
    if (inactivityTimerRef.current) window.clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = window.setTimeout(() => handleLogout(), INACTIVITY_TIMEOUT);
  }, [currentUser, handleLogout]);

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
    if (isDataLoaded && isOnline) {
      if (syncDebounceRef.current) window.clearTimeout(syncDebounceRef.current);
      syncDebounceRef.current = window.setTimeout(() => handleCloudSync(true), SYNC_DEBOUNCE_MS);
    }
  }, [data, isDataLoaded, isOnline, handleCloudSync]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tokymon_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tokymon_theme', 'light');
    }
  }, [isDark]);

  const activeBranches = useMemo(() => data.branches.filter(b => !b.deletedAt), [data.branches]);
  const activeTransactions = useMemo(() => {
    const activeBranchIds = new Set(activeBranches.map(b => b.id));
    return data.transactions.filter(tx => !tx.deletedAt && activeBranchIds.has(tx.branchId));
  }, [data.transactions, activeBranches]);

  const branchCategories = useMemo(() => {
    if (currentBranchId === ALL_BRANCHES_ID) return [];
    return data.expenseCategories.filter(c => c.branchId === currentBranchId);
  }, [data.expenseCategories, currentBranchId]);

  const branchRecurringExpenses = useMemo(() => {
    if (currentBranchId === ALL_BRANCHES_ID) return [];
    return data.recurringExpenses.filter(r => r.branchId === currentBranchId);
  }, [data.recurringExpenses, currentBranchId]);

  const allowedBranches = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return activeBranches;
    const assignedIds = currentUser.assignedBranchIds || [];
    return activeBranches.filter(b => assignedIds.includes(b.id));
  }, [activeBranches, currentUser, isAdmin]);

  useEffect(() => {
    if (currentUser) {
      const isValid = allowedBranches.some(b => b.id === currentBranchId) || currentBranchId === ALL_BRANCHES_ID;
      if (!currentBranchId || !isValid) {
        let targetId = '';
        if (isAdmin) {
          targetId = ALL_BRANCHES_ID;
        } else if (allowedBranches.length > 0) {
          targetId = allowedBranches[0].id;
        }
        
        if (targetId) {
          setCurrentBranchId(targetId);
          localStorage.setItem('tokymon_current_branch', targetId);
        }
      }
    }
  }, [allowedBranches, currentBranchId, currentUser, isAdmin]);

  const addAuditLog = useCallback((action: AuditLogEntry['action'], entityType: AuditLogEntry['entityType'], entityId: string, details: string) => {
    if (!currentUser) return;
    atomicUpdate(prev => ({
      ...prev,
      auditLogs: [{
        id: Date.now().toString(), timestamp: new Date().toISOString(), userId: currentUser.id,
        username: currentUser.username, action, entityType, entityId, details
      }, ...prev.auditLogs].slice(0, 1000)
    }));
  }, [currentUser, atomicUpdate]);

  const handleDeleteTransaction = async (id: string) => {
    const now = new Date().toISOString();
    await atomicUpdate(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t)
    }), true);
    addAuditLog('DELETE', 'TRANSACTION', id, `Xóa giao dịch`);
    resetInactivityTimer();
  };

  const handleResetBranchData = async (branchId: string) => {
    const now = new Date().toISOString();
    await atomicUpdate(prev => ({
      ...prev,
      transactions: prev.transactions.map(tx => tx.branchId === branchId ? { ...tx, deletedAt: now, updatedAt: now } : tx)
    }), true);
    addAuditLog('DELETE', 'BRANCH', branchId, `Reset dữ liệu chi nhánh`);
    resetInactivityTimer();
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = data.users.filter(u => !u.deletedAt).find(u => 
      u.username.trim().toLowerCase() === loginForm.username.trim().toLowerCase() && 
      u.password.trim() === loginForm.password.trim()
    );
    if (user) { 
      setCurrentUser(user); 
      localStorage.setItem('tokymon_user', JSON.stringify(user)); 
      localStorage.setItem('tokymon_last_activity', Date.now().toString());
      addAuditLog('LOGIN', 'USER', user.id, `Đăng nhập`); 
    } else { 
      setLoginError(t('error_login')); 
    }
  };

  const toggleTheme = () => setIsDark(!isDark);
  const toggleLanguage = () => {
    const nextLang = lang === 'vi' ? 'de' : 'vi';
    setLang(nextLang);
    localStorage.setItem('tokymon_lang', nextLang);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <div className="login-mesh" />
        <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-rose-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-full max-w-[380px] z-10 space-y-8 animate-ios">
          <div className="text-center space-y-6">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-vivid flex items-center justify-center mx-auto border border-white dark:border-slate-800 animate-float relative z-10">
                <UtensilsCrossed className="w-12 h-12 text-brand-600 dark:text-brand-400" />
              </div>
              <div className="absolute inset-0 bg-brand-500/20 blur-2xl rounded-full animate-pulse" />
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-slate-950 dark:text-white tracking-tighter uppercase leading-none">TOKYMON</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400 opacity-60">Finance Manager</p>
            </div>
          </div>

          <div className="glass p-1 rounded-[3rem] shadow-2xl relative">
            <div className="bg-white/40 dark:bg-slate-900/40 p-8 rounded-[2.8rem] space-y-6">
              <div className="text-center">
                 <h2 className="text-lg font-black uppercase text-slate-800 dark:text-slate-100 tracking-tight">{t('login_welcome')}</h2>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="relative group">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                  <input type="text" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-4.5 pl-14 bg-slate-50/50 dark:bg-black/20 rounded-2xl font-bold border border-slate-200 dark:border-white/5 outline-none dark:text-white text-slate-950 transition-all focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50" placeholder={t('username')} required />
                </div>
                
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                  <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-4.5 pl-14 bg-slate-50/50 dark:bg-black/20 rounded-2xl font-bold border border-slate-200 dark:border-white/5 outline-none dark:text-white text-slate-950 transition-all focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/50" placeholder={t('password')} required />
                </div>

                {loginError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-shake">
                    <p className="text-rose-500 text-[10px] font-black uppercase text-center">{loginError}</p>
                  </div>
                )}

                <button type="submit" className="w-full h-15 bg-brand-600 hover:bg-brand-500 text-white rounded-[1.8rem] font-black uppercase shadow-vivid flex items-center justify-center gap-3 active-scale transition-all group overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative z-10">{t('login')}</span>
                  <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </div>
          </div>

          <div className="text-center space-y-4 pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200/50 dark:bg-slate-800/50 rounded-full border border-slate-300 dark:border-slate-700 backdrop-blur-sm opacity-80">
              <Code className="w-3.5 h-3.5 text-brand-600" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                {t('dev_by')} <span className="text-brand-600 dark:text-brand-400">thPhuoc</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 opacity-40">
              <div className="h-px w-8 bg-slate-400" />
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">
                {t('ver')} {SCHEMA_VERSION.split(' ')[0]}
              </p>
              <div className="h-px w-8 bg-slate-400" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentBranchName = currentBranchId === ALL_BRANCHES_ID ? t('all_branches') : activeBranches.find(b => b.id === currentBranchId)?.name || '---';
  const activeBranchColor = currentBranchId === ALL_BRANCHES_ID ? '#4f46e5' : activeBranches.find(b => b.id === currentBranchId)?.color || '#4f46e5';

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 font-sans pb-[env(safe-area-inset-bottom)]" style={{ '--brand-dynamic': activeBranchColor } as any}>
      <header className="px-4 py-3 flex items-center justify-between sticky top-0 z-[1000] glass border-b border-white dark:border-slate-800/60 shadow-sm safe-pt">
        <div className="flex items-center gap-3 min-w-0 max-w-[50%]">
           <div className="relative w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: activeBranchColor }}><UtensilsCrossed className="w-5 h-5" /></div>
           <button onClick={() => setShowBranchDropdown(!showBranchDropdown)} className="flex flex-col items-start min-w-0 text-left active-scale transition-all">
              <div className="flex items-center gap-1.5 w-full"><span className="text-[13px] font-black uppercase dark:text-white truncate tracking-tighter leading-none">{currentBranchName}</span><ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showBranchDropdown ? 'rotate-180' : ''}`} /></div>
              <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{currentUser?.role}</p>
           </button>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
           <button onClick={toggleTheme} className="w-9 h-9 sm:w-10 sm:h-10 text-slate-500 dark:text-slate-400 rounded-xl bg-white/50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center active-scale transition-all">
             {isDark ? <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
           </button>
           <button onClick={toggleLanguage} className="w-9 h-9 sm:w-10 sm:h-10 text-slate-500 dark:text-slate-400 rounded-xl bg-white/50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center active-scale transition-all text-[9px] font-black uppercase">
             {lang === 'vi' ? 'DE' : 'VI'}
           </button>
           <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
              {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudCheck className="w-3 h-3" />}
           </div>
           <button onClick={() => setConfirmModal({ show: true, title: t('logout'), message: t('confirm_logout'), onConfirm: handleLogout })} className="w-9 h-9 sm:w-10 sm:h-10 text-rose-500 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center active-scale transition-all"><LogOut className="w-4 h-4" /></button>
        </div>
        {showBranchDropdown && (
          <><div className="fixed inset-0 z-[1001]" onClick={() => setShowBranchDropdown(false)} /><div className="absolute top-full left-4 mt-2 w-64 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 z-[1002] overflow-hidden animate-in slide-in-from-top-2">{isAdmin && (<button onClick={() => { setCurrentBranchId(ALL_BRANCHES_ID); setShowBranchDropdown(false); }} className={`w-full text-left px-6 py-4.5 transition-all flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 ${currentBranchId === ALL_BRANCHES_ID ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 font-black' : 'dark:text-slate-300 text-slate-700 font-bold'}`}><div className="flex items-center gap-3"><Globe className="w-4.5 h-4.5" /><span className="text-[11px] font-black uppercase">{t('all_branches')}</span></div>{currentBranchId === ALL_BRANCHES_ID && <Check className="w-3.5 h-3.5" />}</button>)}<div className="max-h-[60vh] overflow-y-auto no-scrollbar">{allowedBranches.map(b => (<button key={b.id} onClick={() => { setCurrentBranchId(b.id); setShowBranchDropdown(false); }} className={`w-full text-left px-6 py-4.5 transition-all flex items-center justify-between border-b last:border-0 border-slate-50 dark:border-slate-800/50 ${currentBranchId === b.id ? 'bg-slate-50 dark:bg-slate-800/50 font-black' : 'dark:text-slate-300 text-slate-700 font-bold'}`} style={{ color: currentBranchId === b.id ? b.color : 'inherit' }}><div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} /><span className="text-[11px] font-black uppercase">{b.name}</span></div>{currentBranchId === b.id && <Check className="w-3.5 h-3.5" />}</button>))}</div></div></>
        )}
      </header>
      <main className="flex-1 px-4 max-w-6xl mx-auto w-full pt-4 pb-32">
        {!isDataLoaded ? (
          <div className="flex flex-col items-center justify-center py-40"><Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tokymon Loading...</p></div>
        ) : (
          <div className="animate-ios">
            {activeTab === 'income' && <IncomeManager transactions={activeTransactions} onAddTransaction={tx => atomicUpdate(p => ({...p, transactions: [tx, ...p.transactions]}), true)} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={u => atomicUpdate(p => ({...p, transactions: p.transactions.map(t => t.id === u.id ? u : t)}), true)} branchId={currentBranchId} initialBalances={{cash: 0, card: 0}} userRole={currentUser.role} branchName={currentBranchName} lang={lang} />}
            {activeTab === 'expense' && <ExpenseManager transactions={activeTransactions} onAddTransaction={tx => atomicUpdate(p => ({...p, transactions: [tx, ...p.transactions]}), true)} onDeleteTransaction={handleDeleteTransaction} onEditTransaction={u => atomicUpdate(p => ({...p, transactions: p.transactions.map(t => t.id === u.id ? u : t)}), true)} expenseCategories={branchCategories.map(c => c.name)} branchId={currentBranchId} initialBalances={{cash: 0, card: 0}} userRole={currentUser.role} branchName={currentBranchName} lang={lang} />}
            {activeTab === 'stats' && <Dashboard transactions={activeTransactions} initialBalances={{cash: 0, card: 0}} lang={lang} currentBranchId={currentBranchId} allowedBranches={allowedBranches} userRole={currentUser.role} reportSettings={data.reportSettings || StorageService.getEmptyData().reportSettings!} />}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="flex gap-2 overflow-x-auto no-scrollbar px-1 pb-2">{[ { id: 'general', label: t('branding'), icon: LayoutGrid }, { id: 'guide', label: t('guide'), icon: HelpCircle }, { id: 'export', label: 'Excel', icon: FileSpreadsheet }, { id: 'sync', label: 'Cloud', icon: Cloud }, { id: 'branches', label: t('branches'), icon: MapPin }, { id: 'users', label: t('users'), icon: Users }, { id: 'audit', label: 'Log', icon: HistoryIcon }, { id: 'about', label: t('about'), icon: Info } ].map(sub => { const isVisible = (sub.id === 'branches' || sub.id === 'users') ? isAdmin : (sub.id === 'sync' ? isSuperAdmin : true); if (!isVisible) return null; return ( <button key={sub.id} onClick={() => setSettingsSubTab(sub.id as any)} style={{ backgroundColor: settingsSubTab === sub.id ? activeBranchColor : '' }} className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 shrink-0 active-scale ${settingsSubTab === sub.id ? 'bg-slate-900 border-transparent text-white shadow-vivid' : 'bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-500'}`} > <sub.icon className="w-3.5 h-3.5" /> {sub.label} </button> ); })}</div>
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] p-5 border border-white/20 dark:border-slate-800 shadow-ios min-h-[450px]">
                    {settingsSubTab === 'guide' && <GuideCenter lang={lang} />}
                    {settingsSubTab === 'sync' && isSuperAdmin && (
                      <div className="space-y-8 max-w-md mx-auto pt-6">
                        <div className="text-center space-y-3"><div className="w-20 h-20 bg-brand-50/50 dark:bg-brand-900/10 text-brand-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner" style={{ color: activeBranchColor }}><Database className="w-10 h-10" /></div><h3 className="text-xl font-black uppercase dark:text-white">Cloud Vault</h3></div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border-2 border-slate-200 dark:border-slate-800 space-y-4"><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase text-slate-400">Bucket ID</span><button onClick={() => { navigator.clipboard.writeText(GLOBAL_SYNC_KEY); alert('ID Copied'); }} className="p-2"><Copy className="w-3.5 h-3.5" /></button></div><div className="bg-white dark:bg-slate-900 p-4 rounded-xl font-mono text-[10px] break-all">{GLOBAL_SYNC_KEY}</div></div>
                        <button onClick={() => handleCloudSync()} disabled={isSyncing || !isOnline} className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase text-[11px] flex items-center justify-center gap-3 active-scale shadow-vivid" style={{ backgroundColor: activeBranchColor }}><RefreshCw className={isSyncing ? 'animate-spin' : ''} /> {isSyncing ? 'Syncing...' : 'Sync Now'}</button>
                      </div>
                    )}
                    {settingsSubTab === 'export' && <ExportManager transactions={activeTransactions} branches={activeBranches} lang={lang} />}
                    {settingsSubTab === 'branches' && isAdmin && (
                      <BranchManager 
                        branches={data.branches} 
                        setBranches={update => atomicUpdate(prev => {
                          const oldBranchIds = new Set(prev.branches.map(b => b.id));
                          const newBranches = typeof update === 'function' ? update(prev.branches) : update;
                          
                          // Tìm các chi nhánh mới được thêm vào
                          const addedBranches = newBranches.filter(b => !oldBranchIds.has(b.id) && !b.deletedAt);
                          
                          let nextCategories = [...prev.expenseCategories];
                          let nextRecurring = [...prev.recurringExpenses];
                          
                          // Thực hiện gieo mầm dữ liệu cho chi nhánh mới
                          addedBranches.forEach(branch => {
                            const now = new Date().toISOString();
                            // 1. Thêm danh mục mặc định
                            const defaultCats: Category[] = INITIAL_EXPENSE_CATEGORIES.map(name => ({
                              id: `cat_${branch.id}_${Math.random().toString(36).substr(2, 9)}`,
                              name,
                              branchId: branch.id,
                              updatedAt: now
                            }));
                            nextCategories = [...nextCategories, ...defaultCats];
                            
                            // 2. Thêm chi phí định kỳ mặc định
                            const defaultRecs: RecurringTransaction[] = DEFAULT_RECURRING_TEMPLATE.map(t => ({
                              id: `rec_${branch.id}_${Math.random().toString(36).substr(2, 9)}`,
                              branchId: branch.id,
                              amount: t.amount,
                              category: t.category,
                              dayOfMonth: t.day,
                              note: t.note,
                              expenseSource: ExpenseSource.WALLET,
                              updatedAt: now
                            }));
                            nextRecurring = [...nextRecurring, ...defaultRecs];
                          });
                          
                          return {
                            ...prev,
                            branches: newBranches,
                            expenseCategories: nextCategories,
                            recurringExpenses: nextRecurring
                          };
                        }, true)} 
                        onAudit={addAuditLog} 
                        setGlobalConfirm={setConfirmModal} 
                        onResetBranchData={handleResetBranchData} 
                        lang={lang} 
                      />
                    )}
                    {settingsSubTab === 'users' && isAdmin && <UserManager users={data.users} setUsers={update => atomicUpdate(p => ({...p, users: typeof update === 'function' ? update(p.users) : update}), true)} branches={activeBranches} onAudit={addAuditLog} currentUserId={currentUser.id} setGlobalConfirm={setConfirmModal} lang={lang} />}
                    {settingsSubTab === 'general' && (
                      <div className="space-y-10">
                        {currentBranchId === ALL_BRANCHES_ID ? (
                          <div className="p-10 flex flex-col items-center justify-center text-center space-y-6 animate-ios">
                             <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[2.2rem] flex items-center justify-center text-slate-400">
                                <LayoutGrid className="w-10 h-10" />
                             </div>
                             <div className="space-y-2">
                               <h3 className="text-lg font-black uppercase dark:text-white">{t('choose_branch_to_config')}</h3>
                               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t('choose_branch_to_config_sub')}</p>
                             </div>
                             <button onClick={() => setShowBranchDropdown(true)} className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-vivid active-scale">
                               {t('select_branch_btn')}
                             </button>
                          </div>
                        ) : (
                          <>
                            <CategoryManager 
                              title={t('categories_man')} 
                              categories={branchCategories} 
                              branchId={currentBranchId}
                              onUpdate={(updates) => {
                                atomicUpdate(prev => {
                                  const existingMap = new Map(prev.expenseCategories.map(c => [c.id, c]));
                                  updates.forEach(u => existingMap.set(u.id, u));
                                  return { ...prev, expenseCategories: Array.from(existingMap.values()) };
                                }, true);
                              }} 
                              lang={lang} 
                              onAudit={addAuditLog} 
                            />
                            <RecurringManager 
                              recurringExpenses={branchRecurringExpenses} 
                              categories={branchCategories.map(c => c.name)} 
                              onUpdate={(updates) => {
                                atomicUpdate(prev => {
                                  const otherBranchExpenses = prev.recurringExpenses.filter(r => r.branchId !== currentBranchId);
                                  return { ...prev, recurringExpenses: [...otherBranchExpenses, ...updates] };
                                }, true);
                              }} 
                              onGenerateTransactions={txs => atomicUpdate(prev => ({...prev, transactions: [...txs, ...prev.transactions]}), true)} 
                              branchId={currentBranchId} 
                              lang={lang} 
                            />
                          </>
                        )}
                      </div>
                    )}
                    {settingsSubTab === 'audit' && (<div className="space-y-4 max-h-[600px] overflow-y-auto no-scrollbar pr-2">{data.auditLogs.slice().reverse().map(log => (<div key={log.id} className="p-5 bg-slate-50 dark:bg-slate-950/40 rounded-3xl border border-slate-100 dark:border-slate-800 flex justify-between"><div className="flex flex-col gap-1"><span className="text-[9px] font-black text-brand-600 uppercase" style={{ color: activeBranchColor }}>{log.action}</span><span className="text-xs font-bold dark:text-slate-200">{log.details}</span></div><span className="text-[8px] text-slate-400 font-bold uppercase">{new Date(log.timestamp).toLocaleString()}</span></div>))}</div>)}
                    {settingsSubTab === 'about' && (
                      <div className="space-y-8 animate-ios">
                        <div className="flex flex-col items-center text-center space-y-4">
                           <div className="w-20 h-20 bg-brand-600 rounded-[2rem] flex items-center justify-center text-white shadow-vivid animate-float"><UtensilsCrossed className="w-10 h-10" /></div>
                           <div>
                              <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Tokymon Finance</h2>
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Enterprise Edition v{SCHEMA_VERSION.split(' ')[0]}</p>
                           </div>
                        </div>
                        <div className="space-y-6">
                           <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border dark:border-slate-800">
                              <div className="flex items-center gap-3 mb-4">
                                 <ScrollText className="w-5 h-5 text-brand-600" />
                                 <h4 className="text-[11px] font-black uppercase dark:text-white tracking-widest">{t('whats_new')}</h4>
                              </div>
                              <div className="space-y-6">
                                 {APP_CHANGELOG.map((log) => (
                                   <div key={log.version} className="space-y-3">
                                      <div className="flex justify-between items-center">
                                         <span className="px-3 py-1 bg-brand-600 text-white text-[9px] font-black rounded-lg">v{log.version}</span>
                                         <span className="text-[9px] font-bold text-slate-400">{log.date}</span>
                                      </div>
                                      <ul className="space-y-2 pl-2">
                                         {(log.changes[lang] || log.changes['vi'] || []).map((change: string, i: number) => (
                                           <li key={i} className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex gap-2">
                                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> 
                                              <span>{change}</span>
                                           </li>
                                         ))}
                                      </ul>
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <div className="fixed bottom-0 left-0 right-0 px-6 z-[2000] flex justify-center pointer-events-none pb-[calc(1rem+env(safe-area-inset-bottom))]"><nav className="h-16 max-w-md w-full glass border border-white/40 dark:border-slate-800 flex items-center justify-around px-2 rounded-[2rem] shadow-2xl pointer-events-auto">{[ { id: 'income', label: t('income'), icon: Wallet }, { id: 'expense', label: t('expense'), icon: ArrowDownCircle }, { id: 'stats', label: t('stats'), icon: LayoutDashboard }, { id: 'settings', label: t('settings'), icon: Settings } ].map(tab => ( <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1.5 relative py-1.5 rounded-xl flex-1 transition-all active-scale ${activeTab === tab.id ? 'opacity-100' : 'text-slate-400'}`} style={{ color: activeTab === tab.id ? activeBranchColor : '' }}> <tab.icon className="w-5 h-5" /> <span className={`text-[8px] font-black uppercase tracking-widest ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span> {activeTab === tab.id && <div className="absolute -top-2 w-6 h-1 rounded-full" style={{ backgroundColor: activeBranchColor }} />} </button> ))}</nav></div>
      {confirmModal && confirmModal.show && (<div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300"><div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 animate-ios"><div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center mb-6"><AlertTriangle className="w-7 h-7" /></div><h3 className="text-xl font-black dark:text-white uppercase tracking-tight mb-2">{confirmModal.title}</h3><p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8">{confirmModal.message}</p><div className="flex gap-3"><button onClick={() => setConfirmModal(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest active-scale">Hủy</button><button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest active-scale shadow-lg shadow-rose-600/20">Đồng ý</button></div></div></div>)}
    </div>
  );
};

export default App;
