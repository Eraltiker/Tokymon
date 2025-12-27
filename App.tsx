
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
import { useTranslation } from './i18n';
import { 
  UtensilsCrossed, LayoutDashboard, Settings, 
  Wallet, ArrowDownCircle, Sun, Moon, LogOut, 
  History as HistoryIcon, MapPin, Users, RefreshCw, 
  ChevronDown, Cloud, FileSpreadsheet, LayoutPanelTop,
  AlertTriangle, Languages, UserCircle2, 
  ImageIcon, Lock, ArrowRight, Cpu,
  Globe, Check, Info, ShieldCheck, ExternalLink, Zap,
  Sparkles, WifiOff, Wifi, Loader2, PartyPopper, X,
  KeyRound, Fingerprint
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'stats' | 'settings'>('income');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'export' | 'branches' | 'users' | 'sync' | 'audit' | 'about'>('general');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tokymon_theme') === 'dark');
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('tokymon_lang') as Language) || 'vi');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  
  const t = useTranslation(lang);
  const [data, setData] = useState<AppData>(StorageService.getEmptyData());
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{show: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  const [syncKey, setSyncKey] = useState(() => localStorage.getItem('tokymon_sync_key') || 'NZQkBLdrxvnEEMUw928weK');

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('tokymon_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => localStorage.getItem('tokymon_current_branch') || '');
  const [lastSelectedBranchId, setLastSelectedBranchId] = useState<string>(''); 
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const pollTimerRef = useRef<number | null>(null);
  const dataRef = useRef(data);

  useEffect(() => {
    const lastVersion = localStorage.getItem('tokymon_system_version');
    if (lastVersion && lastVersion !== SCHEMA_VERSION && currentUser) {
      setShowUpdateModal(true);
    }
    localStorage.setItem('tokymon_system_version', SCHEMA_VERSION);
  }, [currentUser]);

  useEffect(() => {
    StorageService.loadLocal().then(loadedData => {
      setData(loadedData);
      setIsDataLoaded(true);
    });
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isDataLoaded) {
      dataRef.current = data;
      StorageService.saveLocal(data);
    }
  }, [data, isDataLoaded]);

  const handleCloudSync = useCallback(async (silent = false, specificData?: AppData) => {
    if (!syncKey || syncKey.trim() === '' || !navigator.onLine) return;
    if (!silent) setIsSyncing(true);
    try {
      const targetData = specificData || dataRef.current;
      const merged = await StorageService.syncWithCloud(syncKey, targetData);
      if (JSON.stringify(merged) !== JSON.stringify(dataRef.current)) setData(merged);
      setSyncStatus('SUCCESS');
      if (!silent) setTimeout(() => setSyncStatus('IDLE'), 3000);
    } catch (e: any) { setSyncStatus('ERROR'); } finally {
      if (!silent) setIsSyncing(false);
    }
  }, [syncKey]);

  useEffect(() => {
    if (syncKey && currentUser && isOnline) {
      handleCloudSync(true);
      pollTimerRef.current = window.setInterval(() => handleCloudSync(true), 30000);
    }
    return () => { if (pollTimerRef.current) window.clearInterval(pollTimerRef.current); };
  }, [syncKey, handleCloudSync, currentUser, isOnline]);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('tokymon_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => { localStorage.setItem('tokymon_lang', lang); }, [lang]);

  const toggleLanguage = () => setLang(prev => prev === 'vi' ? 'de' : 'vi');

  const activeBranches = useMemo(() => data.branches.filter(b => !b.deletedAt), [data.branches]);
  const activeTransactions = useMemo(() => {
    const activeBranchIds = new Set(activeBranches.map(b => b.id));
    return data.transactions.filter(tx => !tx.deletedAt && activeBranchIds.has(tx.branchId));
  }, [data.transactions, activeBranches]);

  const activeUsers = useMemo(() => data.users.filter(u => !u.deletedAt), [data.users]);
  const isAdmin = useMemo(() => currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.ADMIN, [currentUser]);

  const allowedBranches = useMemo(() => {
    if (!currentUser) return [];
    let base = activeBranches;
    if (!isAdmin) base = activeBranches.filter(b => currentUser.assignedBranchIds.includes(b.id));
    return base;
  }, [activeBranches, currentUser, isAdmin]);

  const dropdownBranches = useMemo(() => allowedBranches, [allowedBranches]);

  useEffect(() => {
    if (currentUser && dropdownBranches.length > 0) {
      const isValid = dropdownBranches.some(b => b.id === currentBranchId) || currentBranchId === ALL_BRANCHES_ID;
      if (!currentBranchId || !isValid) {
        const first = dropdownBranches[0].id;
        setCurrentBranchId(first);
        localStorage.setItem('tokymon_current_branch', first);
      }
    }
  }, [dropdownBranches, currentBranchId, currentUser]);

  const addAuditLog = useCallback((action: AuditLogEntry['action'], entityType: AuditLogEntry['entityType'], entityId: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLogEntry = {
      id: Date.now().toString(), timestamp: new Date().toISOString(), userId: currentUser.id,
      username: currentUser.username, action, entityType, entityId, details
    };
    setData(prev => ({ ...prev, auditLogs: [newLog, ...prev.auditLogs].slice(0, 500) }));
  }, [currentUser]);

  const handleResetBranchData = (branchId: string) => {
    const branch = data.branches.find(b => b.id === branchId);
    if (!branch) return;
    const now = new Date().toISOString();
    setData(prev => {
      const nextTransactions = prev.transactions.map(t => t.branchId === branchId ? { ...t, deletedAt: now, updatedAt: now } : t);
      const nextData = { ...prev, transactions: nextTransactions };
      addAuditLog('DELETE', 'BRANCH', branchId, `Reset toàn bộ dữ liệu: ${branch.name}`);
      handleCloudSync(true, nextData);
      return nextData;
    });
  };

  const setBranchesWithDataCleanup = (updateFn: (prev: Branch[]) => Branch[]) => {
    setData(prev => {
      const nextBranches = updateFn(prev.branches);
      const now = new Date().toISOString();
      const deletedBranchIds = nextBranches.filter(b => b.deletedAt && !prev.branches.find(oldB => oldB.id === b.id)?.deletedAt).map(b => b.id);
      let nextTransactions = prev.transactions;
      if (deletedBranchIds.length > 0) nextTransactions = prev.transactions.map(t => deletedBranchIds.includes(t.branchId) ? { ...t, deletedAt: now, updatedAt: now } : t);
      return { ...prev, branches: nextBranches, transactions: nextTransactions };
    });
  };

  const currentBranchName = useMemo(() => {
    if (currentBranchId === ALL_BRANCHES_ID) return t('all_branches');
    return activeBranches.find(b => b.id === currentBranchId)?.name || '---';
  }, [currentBranchId, activeBranches, t]);

  const systemInitialBalances = useMemo(() => {
    return activeBranches.reduce((acc, b) => ({
      cash: acc.cash + (b.initialCash || 0), card: acc.card + (b.initialCard || 0)
    }), { cash: 0, card: 0 });
  }, [activeBranches]);

  const currentBranch = activeBranches.find(b => b.id === currentBranchId);
  const reportSettings: ReportSettings = data.reportSettings || {
    showSystemTotal: true, showShopRevenue: true, showAppRevenue: true,
    showCardRevenue: true, showActualCash: true, showProfit: true
  };

  const toggleGlobalReport = () => {
    if (!isAdmin) return;
    if (currentBranchId === ALL_BRANCHES_ID) {
      const targetId = lastSelectedBranchId || allowedBranches[0]?.id;
      setCurrentBranchId(targetId);
      localStorage.setItem('tokymon_current_branch', targetId);
    } else {
      setLastSelectedBranchId(currentBranchId);
      setCurrentBranchId(ALL_BRANCHES_ID);
      localStorage.setItem('tokymon_current_branch', ALL_BRANCHES_ID);
    }
  };

  if (!currentUser) {
    return (
      <div className={`min-h-screen relative flex flex-col items-center justify-center p-6 font-sans transition-colors duration-500 overflow-hidden`}>
        <div className="login-mesh" />
        
        {/* Floating Decorative Blobs */}
        <div className="absolute top-[-5%] left-[-5%] w-72 h-72 bg-brand-600/20 blur-[100px] rounded-full animate-pulse pointer-events-none" />
        <div className="absolute bottom-[5%] right-[-5%] w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full animate-pulse delay-1000 pointer-events-none" />

        <div className="absolute top-8 right-8 z-50 flex items-center gap-3 safe-mt">
           <button onClick={() => setIsDark(!isDark)} className="w-12 h-12 glass rounded-2xl flex items-center justify-center active-scale transition-all shadow-xl">
             {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-brand-600" />}
           </button>
           <button onClick={toggleLanguage} className="px-5 py-3 glass rounded-2xl dark:text-white text-slate-700 active-scale transition-all flex items-center gap-3 shadow-xl group">
              <Languages className="w-4 h-4 text-brand-500" />
              <span className="text-[11px] font-black uppercase tracking-widest">{lang === 'vi' ? 'VI' : 'DE'}</span>
           </button>
        </div>

        <div className="w-full max-w-[440px] z-10 space-y-12 animate-ios">
          <div className="text-center space-y-10">
            <div className="relative inline-block group">
              <div className="absolute -inset-4 bg-gradient-to-tr from-brand-600 to-purple-600 rounded-[3.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
              <div className="relative p-10 bg-white/40 dark:bg-white/5 rounded-[3.5rem] backdrop-blur-3xl border border-white/50 dark:border-white/10 shadow-glass active-scale transition-all duration-500">
                {data.logoUrl ? (
                  <img src={data.logoUrl} alt="Tokymon" className="w-24 h-24 mx-auto object-contain" />
                ) : (
                  <UtensilsCrossed className="w-16 h-16 text-brand-600 dark:text-brand-400 mx-auto" />
                )}
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 uppercase tracking-[-0.08em] leading-none">
                TOKYMON
              </h1>
              <div className="flex items-center justify-center gap-4">
                <div className="h-[1.5px] w-8 bg-brand-500/40" />
                <p className="text-[11px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.6em] translate-x-[0.3em]">Finance Core</p>
                <div className="h-[1.5px] w-8 bg-brand-500/40" />
              </div>
            </div>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const user = activeUsers.find(u => u.username.toLowerCase() === loginForm.username.toLowerCase() && u.password === loginForm.password);
              if (user) { 
                setCurrentUser(user); 
                localStorage.setItem('tokymon_user', JSON.stringify(user)); 
                addAuditLog('LOGIN', 'USER', user.id, `Đăng nhập thành công`); 
              } else { 
                setLoginError(t('error_login')); 
              }
            }} 
            className={`glass p-10 sm:p-12 rounded-[4rem] shadow-2xl space-y-10 relative overflow-hidden group ${loginError ? 'animate-shake' : ''}`}
          >
            {/* Form decorative light */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500/50 to-transparent opacity-50" />

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] ml-2 block">System Identity</label>
                <div className="relative group/input">
                  <input 
                    type="text" 
                    value={loginForm.username} 
                    onChange={e => {setLoginForm({...loginForm, username: e.target.value}); setLoginError('');}} 
                    className="w-full p-7 bg-white/50 dark:bg-black/20 focus:bg-white dark:focus:bg-black/40 rounded-[2.2rem] font-bold border border-white/50 dark:border-white/5 focus:border-brand-500 dark:focus:border-brand-500 outline-none dark:text-white text-slate-900 transition-all pl-16 text-base" 
                    placeholder="Username" 
                    required 
                  />
                  <UserCircle2 className="absolute left-7 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within/input:text-brand-500 transition-colors" />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] ml-2 block">Security Token</label>
                <div className="relative group/input">
                  <input 
                    type="password" 
                    value={loginForm.password} 
                    onChange={e => {setLoginForm({...loginForm, password: e.target.value}); setLoginError('');}} 
                    className="w-full p-7 bg-white/50 dark:bg-black/20 focus:bg-white dark:focus:bg-black/40 rounded-[2.2rem] font-bold border border-white/50 dark:border-white/5 focus:border-brand-500 dark:focus:border-brand-500 outline-none dark:text-white text-slate-900 transition-all pl-16 text-base" 
                    placeholder="••••••••" 
                    required 
                  />
                  <Fingerprint className="absolute left-7 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within/input:text-brand-500 transition-colors" />
                </div>
              </div>
            </div>

            {loginError && (
              <div className="bg-rose-500/10 p-5 rounded-3xl border border-rose-500/20 flex items-center gap-4">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
                <p className="text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-tight">{loginError}</p>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full py-7 bg-slate-900 dark:bg-brand-600 hover:bg-black dark:hover:bg-brand-500 text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.3em] active-scale transition-all flex items-center justify-center gap-4 shadow-vivid mt-4 shimmer-btn"
            >
              {t('login')} <ArrowRight className="w-6 h-6" />
            </button>
          </form>

          <div className="text-center space-y-4 opacity-40 pb-12">
             <div className="flex items-center justify-center gap-4">
                <span className="w-10 h-[1px] bg-slate-400" />
                <Cpu className="w-5 h-5 text-slate-400" />
                <span className="w-10 h-[1px] bg-slate-400" />
             </div>
             <p className="text-[11px] font-black dark:text-slate-400 text-slate-600 uppercase tracking-[0.4em]">Enterprise Security Layer v{SCHEMA_VERSION}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 font-sans pb-[env(safe-area-inset-bottom)]">
      {/* Rest of the App UI remains the same... */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl animate-in fade-in" onClick={() => setShowUpdateModal(false)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 relative z-10 border border-white dark:border-slate-800 shadow-2xl animate-ios">
             <button onClick={() => setShowUpdateModal(false)} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><X className="w-4 h-4" /></button>
             <div className="w-16 h-16 bg-brand-600 text-white rounded-3xl flex items-center justify-center mb-6 shadow-vivid mx-auto"><PartyPopper className="w-8 h-8" /></div>
             <h3 className="text-xl font-black text-center uppercase tracking-tight dark:text-white mb-2">{t('whats_new')}</h3>
             <p className="text-[10px] font-black text-center uppercase tracking-widest text-brand-600 mb-6">Version {SCHEMA_VERSION}</p>
             
             <div className="space-y-4 mb-8">
               {APP_CHANGELOG[0].changes[lang].map((change, i) => (
                 <div key={i} className="flex gap-3 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{change}</p>
                 </div>
               ))}
             </div>

             <button onClick={() => { setShowUpdateModal(false); setActiveTab('settings'); setSettingsSubTab('about'); }} className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest active-scale shadow-lg">
               {t('update_now_btn') || 'Khám phá ngay'}
             </button>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setConfirmModal(null)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-10 relative z-10 border border-white dark:border-slate-800 shadow-2xl">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-3xl flex items-center justify-center text-rose-600 mb-8 mx-auto shadow-sm"><AlertTriangle className="w-8 h-8" /></div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white text-center uppercase mb-4 tracking-tight">{confirmModal.title}</h3>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center mb-10 leading-relaxed uppercase tracking-tight">{confirmModal.message}</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs tracking-widest active-scale border border-slate-200 dark:border-slate-700">{t('cancel')}</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="flex-1 py-5 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest active-scale shadow-lg">{t('save')}</button>
            </div>
          </div>
        </div>
      )}
      
      <header className="px-4 py-3 flex items-center justify-between sticky top-0 z-[1000] glass border-b border-white dark:border-slate-800/50 shadow-sm safe-pt">
        <div className="flex items-center gap-3">
          {data.logoUrl ? ( <img src={data.logoUrl} alt="Logo" className="w-9 h-9 sm:w-11 sm:h-11 object-contain shrink-0" /> ) : (
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-vivid shrink-0"><UtensilsCrossed className="w-5 h-5" /></div>
          )}
          
          <div className="relative">
            <button onClick={() => setShowBranchDropdown(!showBranchDropdown)} className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 active-scale transition-all shadow-sm max-w-[150px] sm:max-w-xs">
              <div className={`w-2 h-2 rounded-full shrink-0 ${currentBranchId === ALL_BRANCHES_ID ? 'bg-indigo-500 animate-pulse' : 'bg-brand-500'}`} />
              <span className="text-[10px] sm:text-[11px] font-black uppercase dark:text-white truncate tracking-tight">{currentBranchName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>
            {showBranchDropdown && (
              <>
                <div className="fixed inset-0 z-[1001]" onClick={() => setShowBranchDropdown(false)} />
                <div className="absolute top-full left-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border-2 border-slate-100 dark:border-slate-800 z-[1002] overflow-hidden animate-in slide-in-from-top-2">
                  {isAdmin && (
                    <button onClick={() => { setCurrentBranchId(ALL_BRANCHES_ID); localStorage.setItem('tokymon_current_branch', ALL_BRANCHES_ID); setShowBranchDropdown(false); }} className={`w-full text-left px-6 py-5 hover:bg-brand-600 hover:text-white transition-all flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 ${currentBranchId === ALL_BRANCHES_ID ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 font-black' : 'dark:text-slate-300 text-slate-700 font-bold'}`}>
                        <div className="flex items-center gap-3"><Globe className="w-5 h-5" /><span className="text-xs font-black uppercase">{t('all_branches')}</span></div>
                        {currentBranchId === ALL_BRANCHES_ID && <Check className="w-4 h-4" />}
                    </button>
                  )}
                  {dropdownBranches.map(b => (
                    <button key={b.id} onClick={() => { setCurrentBranchId(b.id); setLastSelectedBranchId(b.id); localStorage.setItem('tokymon_current_branch', b.id); setShowBranchDropdown(false); }} className={`w-full text-left px-6 py-5 hover:bg-brand-600 hover:text-white transition-all flex items-center justify-between border-b last:border-0 border-slate-50 dark:border-slate-800/50 ${currentBranchId === b.id ? 'bg-brand-50 dark:bg-brand-900/10 text-brand-600 font-black' : 'dark:text-slate-300 text-slate-700 font-bold'}`}>
                      <span className="text-xs font-black uppercase">{b.name}</span>
                      {currentBranchId === b.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <div className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors ${isOnline ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600 animate-pulse'}`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span className="text-[9px] font-black uppercase tracking-[0.1em] hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <button onClick={toggleLanguage} className="w-10 h-10 glass rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center active-scale transition-all shadow-sm">
             <span className="text-[10px] sm:text-[11px] font-black uppercase dark:text-white">{lang === 'vi' ? 'VN' : 'DE'}</span>
          </button>
          <button onClick={() => setIsDark(!isDark)} className="w-10 h-10 glass rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center active-scale shadow-sm">
             {isDark ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5 text-brand-600" />}
          </button>
          <button onClick={() => setConfirmModal({ show: true, title: t('logout'), message: t('confirm_logout'), onConfirm: () => { localStorage.removeItem('tokymon_user'); setCurrentUser(null); } })} className="w-10 h-10 bg-rose-600 text-white rounded-xl shadow-lg active-scale flex items-center justify-center border border-rose-500/50"><LogOut className="w-4.5 h-4.5" /></button>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 max-w-6xl mx-auto w-full pt-6 pb-40">
        {!isDataLoaded ? (
          <div className="flex flex-col items-center justify-center py-40">
            <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Initializing System State...</p>
          </div>
        ) : (
          <div className="animate-ios">
            {activeTab === 'income' && (
              currentBranchId === ALL_BRANCHES_ID ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white/60 dark:bg-slate-900/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed dark:border-slate-800 border-slate-200">
                   <LayoutPanelTop className="w-16 h-16 text-slate-300 dark:text-slate-800 mb-8" />
                   <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t('choose_branch_hint')}</p>
                   <button onClick={() => setShowBranchDropdown(true)} className="mt-10 px-10 py-5 bg-brand-600 text-white rounded-[1.5rem] font-black uppercase text-[11px] active-scale shadow-vivid tracking-widest">{t('select_branch_btn')}</button>
                </div>
              ) : (
                <IncomeManager transactions={activeTransactions} onAddTransaction={tx => setData(p => ({...p, transactions: [tx, ...p.transactions]}))} onDeleteTransaction={id => setData(p => ({...p, transactions: p.transactions.map(t => t.id === id ? {...t, deletedAt: new Date().toISOString()} : t)}))} onEditTransaction={u => setData(p => ({...p, transactions: p.transactions.map(t => t.id === u.id ? u : t)}))} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} branchName={currentBranchName} lang={lang} />
              )
            )}
            
            {activeTab === 'expense' && (
              currentBranchId === ALL_BRANCHES_ID ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white/60 dark:bg-slate-900/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed dark:border-slate-800 border-slate-200">
                   <ArrowDownCircle className="w-16 h-16 text-slate-300 dark:text-slate-800 mb-8" />
                   <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t('choose_branch_hint')}</p>
                   <button onClick={() => setShowBranchDropdown(true)} className="mt-10 px-10 py-5 bg-brand-600 text-white rounded-[1.5rem] font-black uppercase text-[11px] active-scale shadow-vivid tracking-widest">{t('select_branch_btn')}</button>
                </div>
              ) : (
                <ExpenseManager transactions={activeTransactions} onAddTransaction={tx => setData(p => ({...p, transactions: [tx, ...p.transactions]}))} onDeleteTransaction={id => setData(p => ({...p, transactions: p.transactions.map(t => t.id === id ? {...t, deletedAt: new Date().toISOString()} : t)}))} onEditTransaction={u => setData(p => ({...p, transactions: p.transactions.map(t => t.id === u.id ? u : t)}))} expenseCategories={data.expenseCategories} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} branchName={currentBranchName} lang={lang} />
              )
            )}
            
            {activeTab === 'stats' && <Dashboard 
              transactions={activeTransactions} initialBalances={currentBranchId === ALL_BRANCHES_ID ? systemInitialBalances : {cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} 
              lang={lang} currentBranchId={currentBranchId} allowedBranches={allowedBranches} userRole={currentUser.role} reportSettings={reportSettings} onToggleGlobal={toggleGlobalReport} 
            />}
            
            {activeTab === 'settings' && (
              <div className="space-y-8">
                <div className="flex gap-3 overflow-x-auto no-scrollbar px-1 pb-2">
                  {[ { id: 'general', label: t('branding'), icon: ImageIcon }, { id: 'export', label: 'Excel', icon: FileSpreadsheet }, { id: 'sync', label: 'Cloud', icon: Cloud }, { id: 'branches', label: t('branches'), icon: MapPin }, { id: 'users', label: t('users'), icon: Users }, { id: 'audit', label: 'Log', icon: HistoryIcon }, { id: 'about', label: t('about'), icon: Info }
                  ].map(sub => (
                    <button key={sub.id} onClick={() => setSettingsSubTab(sub.id as any)} style={{ display: (sub.id === 'branches' || sub.id === 'users') && !isAdmin ? 'none' : 'flex' }} className={`px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all flex items-center gap-3 shrink-0 active-scale shadow-sm ${settingsSubTab === sub.id ? 'bg-brand-600 border-brand-600 text-white shadow-vivid' : 'bg-white/90 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
                      <sub.icon className="w-4.5 h-4.5" /> {sub.label}
                    </button>
                  ))}
                </div>
                <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2.5rem] p-8 border border-white dark:border-slate-800 shadow-soft min-h-[500px]">
                    {settingsSubTab === 'sync' && (
                      <div className="space-y-12 max-w-sm mx-auto pt-10 text-center">
                        <div className="w-24 h-24 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner border border-brand-100 dark:border-brand-900/30"><Cloud className="w-12 h-12" /></div>
                        <div className="space-y-5">
                          <h3 className="text-2xl font-black uppercase tracking-tight dark:text-white">Cloud Master Sync</h3>
                          <input type="text" value={syncKey} onChange={e => {setSyncKey(e.target.value); localStorage.setItem('tokymon_sync_key', e.target.value);}} className="w-full p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl font-bold border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 outline-none text-base dark:text-white transition-all text-center uppercase tracking-widest shadow-inner" placeholder="Cloud Key ID..." />
                        </div>
                        <button onClick={() => handleCloudSync()} disabled={isSyncing || !isOnline} className="w-full py-6 bg-brand-600 text-white rounded-[2.2rem] font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-4 active-scale shadow-vivid disabled:opacity-50">
                          <RefreshCw className={`w-6 h-6 ${isSyncing ? 'animate-spin' : ''}`} /> {isOnline ? t('cloud_sync') : 'Offline'}
                        </button>
                      </div>
                    )}
                    {settingsSubTab === 'export' && <ExportManager transactions={activeTransactions} branches={activeBranches} lang={lang} />}
                    {settingsSubTab === 'branches' && <BranchManager branches={data.branches} setBranches={setBranchesWithDataCleanup} onAudit={addAuditLog} setGlobalConfirm={(m) => setConfirmModal({ ...m, show: true })} onResetBranchData={handleResetBranchData} lang={lang} />}
                    {settingsSubTab === 'users' && <UserManager users={data.users} setUsers={val => setData(p => ({...p, users: typeof val === 'function' ? val(p.users) : val}))} branches={activeBranches} onAudit={addAuditLog} currentUserId={currentUser.id} setGlobalConfirm={(m) => setConfirmModal({ ...m, show: true })} lang={lang} />}
                    {settingsSubTab === 'general' && ( <div className="space-y-16"><CategoryManager title={t('categories_man')} categories={data.expenseCategories} onUpdate={(cats) => {setData(prev => ({...prev, expenseCategories: cats}));}} lang={lang} /><RecurringManager recurringExpenses={data.recurringExpenses.filter(r => !r.deletedAt)} categories={data.expenseCategories} onUpdate={(recs) => {setData(prev => ({...prev, recurringExpenses: recs}));}} onGenerateTransactions={txs => {setData(prev => ({...prev, transactions: [...txs, ...prev.transactions]}));}} branchId={currentBranchId === ALL_BRANCHES_ID ? allowedBranches[0]?.id : currentBranchId} lang={lang} /></div> )}
                    {settingsSubTab === 'audit' && (
                      <div className="space-y-5 max-h-[600px] overflow-y-auto no-scrollbar pr-2">
                        {data.auditLogs.slice().reverse().map(log => (
                          <div key={log.id} className="p-6 bg-slate-50/50 dark:bg-slate-950/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-start mb-4"><span className="text-[10px] font-black px-3 py-1.5 bg-brand-600 text-white rounded-xl uppercase shadow-sm tracking-widest">{log.action}</span><span className="text-[10px] text-slate-500 font-bold uppercase">{new Date(log.timestamp).toLocaleString()}</span></div>
                            <div className="text-sm font-bold dark:text-slate-200 uppercase tracking-tight leading-relaxed">{log.details}</div>
                            <div className="text-[10px] text-slate-500 font-black uppercase mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/60">By: {log.username}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {settingsSubTab === 'about' && (
                      <div className="space-y-12 animate-ios max-w-xl mx-auto py-6">
                        <div className="text-center space-y-8">
                           <div className="relative inline-block">{data.logoUrl ? ( <img src={data.logoUrl} className="w-24 h-24 object-contain mx-auto" alt="Logo" /> ) : (
                               <div className="w-24 h-24 bg-brand-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-vivid border-2 border-white dark:border-slate-800"><UtensilsCrossed className="w-12 h-12 text-white" /></div>
                             )}<div className="absolute -bottom-3 -right-3 bg-emerald-500 text-white text-[10px] font-black px-3.5 py-1.5 rounded-full border-4 border-white dark:border-slate-950 uppercase tracking-widest shadow-lg">{t('active')}</div>
                           </div>
                           <div><h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter leading-none mb-3">Tokymon Finance</h2><p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.5em]">System Version {SCHEMA_VERSION}</p></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-slate-50/50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/60 shadow-sm"><p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2 tracking-widest">{t('system_status')}</p><div className="flex items-center gap-3 text-emerald-500"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" /><span className="text-xs font-black uppercase tracking-widest">{isOnline ? t('online') : 'Offline'}</span></div></div>
                           <div className="bg-slate-50/50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/60 shadow-sm"><p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2 tracking-widest">Storage</p><div className="flex items-center gap-3 text-brand-600"><ShieldCheck className="w-5 h-5" /><span className="text-xs font-black uppercase tracking-widest">IndexedDB</span></div></div>
                        </div>
                        <div className="space-y-6">
                           <h3 className="text-xs font-black uppercase dark:text-white flex items-center gap-3 tracking-[0.2em]"><Sparkles className="w-5 h-5 text-brand-500" /> {t('whats_new')}</h3>
                           <div className="bg-brand-50/50 dark:bg-brand-900/10 p-8 rounded-[2.5rem] border border-brand-100 dark:border-brand-800/50 shadow-inner">
                              <ul className="space-y-5">
                                 {APP_CHANGELOG[0].changes[lang].map((change, i) => (
                                   <li key={i} className="flex gap-4 text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed"><Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> {change}</li>
                                 ))}
                              </ul>
                           </div>
                        </div>
                        <div className="pt-8 border-t dark:border-slate-800 border-slate-200 text-center">
                           <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-[0.25em]">Developed by <span className="text-brand-600 font-extrabold underline underline-offset-8 decoration-2">thPhuoc</span></p>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 px-6 z-[2000] flex justify-center pointer-events-none pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <nav className="h-20 sm:h-22 max-w-md w-full glass border border-white dark:border-slate-800/80 flex items-center justify-around px-3 rounded-[2.5rem] shadow-2xl pointer-events-auto shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]">
          {[
            { id: 'income', label: t('income'), icon: Wallet },
            { id: 'expense', label: t('expense'), icon: ArrowDownCircle },
            { id: 'stats', label: t('stats'), icon: LayoutDashboard },
            { id: 'settings', label: t('settings'), icon: Settings }
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex flex-col items-center gap-2 relative py-2 rounded-2xl flex-1 transition-all active-scale ${activeTab === tab.id ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-500'}`}>
              <tab.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${activeTab === tab.id ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
              <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
              {activeTab === tab.id && <div className="absolute -bottom-2 w-2 h-2 bg-brand-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.8)]" />}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default App;
