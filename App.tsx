
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
  Sparkles
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'stats' | 'settings'>('income');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'export' | 'branches' | 'users' | 'sync' | 'audit' | 'about'>('general');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tokymon_theme') === 'dark');
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('tokymon_lang') as Language) || 'vi');
  
  const t = useTranslation(lang);
  const [data, setData] = useState<AppData>(() => StorageService.loadLocal());
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
    dataRef.current = data;
    StorageService.saveLocal(data);
  }, [data]);

  const handleCloudSync = useCallback(async (silent = false, specificData?: AppData) => {
    if (!syncKey || syncKey.trim() === '') return;
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
    if (syncKey && currentUser) {
      handleCloudSync(true);
      pollTimerRef.current = window.setInterval(() => handleCloudSync(true), 25000);
    }
    return () => { if (pollTimerRef.current) window.clearInterval(pollTimerRef.current); };
  }, [syncKey, handleCloudSync, currentUser]);

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden font-sans">
        <div className="absolute top-[-40%] left-[-20%] w-[120%] h-[120%] bg-gradient-to-br from-brand-600/10 via-slate-950 to-indigo-900/10 animate-pulse pointer-events-none" />
        <div className="absolute top-8 right-8 z-50">
           <button onClick={toggleLanguage} className="px-5 py-3 glass rounded-2xl border border-white/10 text-white active-scale transition-all flex items-center gap-3 shadow-2xl">
              <Languages className="w-5 h-5 text-brand-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">{lang === 'vi' ? 'Vietnam' : 'Deutsch'}</span>
           </button>
        </div>
        <div className="w-full max-w-[420px] z-10 space-y-12">
          <div className="text-center space-y-8 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="relative inline-block group">
              {data.logoUrl ? (
                <div className="relative p-6 bg-white/5 rounded-[3.5rem] backdrop-blur-2xl border border-white/10 shadow-2xl active-scale transition-transform">
                  <img src={data.logoUrl} alt="Tokymon" className="w-24 h-24 mx-auto object-contain" />
                </div>
              ) : (
                <div className="w-24 h-24 bg-brand-600 rounded-[2.5rem] flex items-center justify-center shadow-vivid mx-auto transform rotate-6 active:rotate-0 transition-all duration-500 relative overflow-hidden">
                  <UtensilsCrossed className="w-12 h-12 text-white" />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">Tokymon</h1>
              <p className="text-[10px] font-black text-brand-400 uppercase tracking-[0.5em] ml-1">Finance Core</p>
            </div>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const user = activeUsers.find(u => u.username.toLowerCase() === loginForm.username.toLowerCase() && u.password === loginForm.password);
            if (user) { setCurrentUser(user); localStorage.setItem('tokymon_user', JSON.stringify(user)); addAuditLog('LOGIN', 'USER', user.id, `Đăng nhập thành công`); } else { setLoginError(t('error_login')); }
          }} className="glass p-10 rounded-[3.5rem] border border-white/10 shadow-2xl space-y-8">
            <div className="space-y-6">
              <div className="space-y-2.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Access ID</label>
                <div className="relative group/input">
                  <input type="text" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-4.5 bg-white/5 rounded-[1.8rem] font-bold border-2 border-transparent focus:border-brand-500 outline-none text-white transition-all pl-12 text-sm" placeholder="Username" required />
                  <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Secure Key</label>
                <div className="relative group/input">
                  <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-4.5 bg-white/5 rounded-[1.8rem] font-bold border-2 border-transparent focus:border-brand-500 outline-none text-white transition-all pl-12 text-sm" placeholder="••••••••" required />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                </div>
              </div>
            </div>
            {loginError && (
              <div className="bg-rose-500/10 p-5 rounded-3xl border border-rose-500/20 flex items-center gap-4">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
                <p className="text-rose-400 text-[10px] font-black uppercase tracking-wider">{loginError}</p>
              </div>
            )}
            <button type="submit" className="w-full py-5 bg-brand-600 hover:bg-brand-500 text-white rounded-[1.8rem] font-black uppercase text-xs tracking-widest active-scale transition-all flex items-center justify-center gap-4 shadow-vivid">
              {t('login')} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center opacity-40">
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">v{SCHEMA_VERSION} • Developed by thPhuoc</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 font-sans pb-[env(safe-area-inset-bottom)]">
      {confirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setConfirmModal(null)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-[2.5rem] p-8 relative z-10 border border-slate-100 dark:border-slate-800 shadow-2xl">
            <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600 mb-6 mx-auto"><AlertTriangle className="w-7 h-7" /></div>
            <h3 className="text-base font-black text-slate-900 dark:text-white text-center uppercase mb-3 tracking-tight">{confirmModal.title}</h3>
            <p className="text-[10px] font-bold text-slate-400 text-center mb-8 leading-relaxed uppercase">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-black uppercase text-[9px] tracking-widest active-scale">{t('cancel')}</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="flex-1 py-4 bg-brand-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest active-scale">{t('save')}</button>
            </div>
          </div>
        </div>
      )}
      
      <header className="px-4 py-2.5 flex items-center justify-between sticky top-0 z-[1000] glass border-b border-white/30 dark:border-slate-800/50 shadow-sm pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          {data.logoUrl ? ( <img src={data.logoUrl} alt="Logo" className="w-8 h-8 object-contain" /> ) : (
            <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-sm"><UtensilsCrossed className="w-4 h-4" /></div>
          )}
          <div className="relative">
            <button onClick={() => setShowBranchDropdown(!showBranchDropdown)} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 active-scale transition-all shadow-sm">
              <div className={`w-1.5 h-1.5 rounded-full ${currentBranchId === ALL_BRANCHES_ID ? 'bg-indigo-500 animate-pulse' : 'bg-brand-500'}`} />
              <span className="text-[10px] font-black uppercase dark:text-white truncate max-w-[90px] tracking-tight">{currentBranchName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {showBranchDropdown && (
              <>
                <div className="fixed inset-0 z-[1001]" onClick={() => setShowBranchDropdown(false)} />
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-[1002] overflow-hidden animate-in slide-in-from-top-2">
                  {isAdmin && (
                    <button onClick={() => { setCurrentBranchId(ALL_BRANCHES_ID); localStorage.setItem('tokymon_current_branch', ALL_BRANCHES_ID); setShowBranchDropdown(false); }} className={`w-full text-left px-5 py-4 hover:bg-brand-600 hover:text-white transition-all flex items-center justify-between border-b border-slate-50 dark:border-slate-800/50 ${currentBranchId === ALL_BRANCHES_ID ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600' : 'dark:text-slate-300 text-slate-600'}`}>
                        <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /><span className="text-[9px] font-black uppercase">{t('all_branches')}</span></div>
                        {currentBranchId === ALL_BRANCHES_ID && <Check className="w-3 h-3" />}
                    </button>
                  )}
                  {dropdownBranches.map(b => (
                    <button key={b.id} onClick={() => { setCurrentBranchId(b.id); setLastSelectedBranchId(b.id); localStorage.setItem('tokymon_current_branch', b.id); setShowBranchDropdown(false); }} className={`w-full text-left px-5 py-4 hover:bg-brand-600 hover:text-white transition-all flex items-center justify-between border-b last:border-0 border-slate-50 dark:border-slate-800/50 ${currentBranchId === b.id ? 'bg-brand-50 dark:bg-brand-900/10 text-brand-600' : 'dark:text-slate-300 text-slate-600'}`}>
                      <span className="text-[9px] font-black uppercase">{b.name}</span>
                      {currentBranchId === b.id && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleLanguage} className="w-9 h-9 glass rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center active-scale transition-all">
             <span className="text-[10px] font-black uppercase dark:text-white">{lang === 'vi' ? 'VN' : 'DE'}</span>
          </button>
          <button onClick={() => setIsDark(!isDark)} className="w-9 h-9 glass rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center active-scale"><Sun className="w-4 h-4 text-amber-500 dark:hidden" /><Moon className="w-4 h-4 text-brand-600 hidden dark:block" /></button>
          <button onClick={() => setConfirmModal({ show: true, title: t('logout'), message: t('confirm_logout'), onConfirm: () => { localStorage.removeItem('tokymon_user'); setCurrentUser(null); } })} className="w-9 h-9 bg-rose-600 text-white rounded-xl shadow-lg active-scale flex items-center justify-center"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="flex-1 px-4 max-w-6xl mx-auto w-full pt-4 pb-24">
        {activeTab === 'income' && (
          currentBranchId === ALL_BRANCHES_ID ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-[2.5rem] border-2 border-dashed dark:border-slate-800/50 animate-ios">
               <LayoutPanelTop className="w-14 h-14 text-slate-300 dark:text-slate-800 mb-6" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('choose_branch_hint')}</p>
               <button onClick={() => setShowBranchDropdown(true)} className="mt-8 px-8 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-[10px] active-scale shadow-vivid">{t('select_branch_btn')}</button>
            </div>
          ) : (
            <IncomeManager transactions={activeTransactions} onAddTransaction={tx => setData(p => ({...p, transactions: [tx, ...p.transactions]}))} onDeleteTransaction={id => setData(p => ({...p, transactions: p.transactions.map(t => t.id === id ? {...t, deletedAt: new Date().toISOString()} : t)}))} onEditTransaction={u => setData(p => ({...p, transactions: p.transactions.map(t => t.id === u.id ? u : t)}))} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} branchName={currentBranchName} lang={lang} />
          )
        )}
        
        {activeTab === 'expense' && (
          currentBranchId === ALL_BRANCHES_ID ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-[2.5rem] border-2 border-dashed dark:border-slate-800/50 animate-ios">
               <ArrowDownCircle className="w-14 h-14 text-slate-300 dark:text-slate-800 mb-6" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('choose_branch_hint')}</p>
               <button onClick={() => setShowBranchDropdown(true)} className="mt-8 px-8 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-[10px] active-scale shadow-vivid">{t('select_branch_btn')}</button>
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
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-1">
              {[ { id: 'general', label: t('branding'), icon: ImageIcon }, { id: 'export', label: 'Excel', icon: FileSpreadsheet }, { id: 'sync', label: 'Cloud', icon: Cloud }, { id: 'branches', label: t('branches'), icon: MapPin }, { id: 'users', label: t('users'), icon: Users }, { id: 'audit', label: 'Log', icon: HistoryIcon }, { id: 'about', label: t('about'), icon: Info }
              ].map(sub => (
                <button key={sub.id} onClick={() => setSettingsSubTab(sub.id as any)} style={{ display: (sub.id === 'branches' || sub.id === 'users') && !isAdmin ? 'none' : 'flex' }} className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 shrink-0 active-scale ${settingsSubTab === sub.id ? 'bg-brand-600 border-brand-600 text-white shadow-lg' : 'bg-white/80 dark:bg-slate-900/80 border-white/20 dark:border-slate-800 text-slate-500'}`}>
                  <sub.icon className="w-3.5 h-3.5" /> {sub.label}
                </button>
              ))}
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[2rem] p-6 border border-white/20 dark:border-slate-800 shadow-soft min-h-[450px] animate-ios">
                {settingsSubTab === 'sync' && (
                  <div className="space-y-8 max-w-sm mx-auto pt-6 text-center">
                    <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner"><Cloud className="w-8 h-8" /></div>
                    <div className="space-y-3">
                      <h3 className="text-base font-black uppercase tracking-tight dark:text-white">Cloud Master Sync</h3>
                      <input type="text" value={syncKey} onChange={e => {setSyncKey(e.target.value); localStorage.setItem('tokymon_sync_key', e.target.value);}} className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl font-bold border-2 border-transparent focus:border-brand-500 outline-none text-[11px] dark:text-white transition-all text-center uppercase" placeholder="Cloud Key ID..." />
                    </div>
                    <button onClick={() => handleCloudSync()} disabled={isSyncing} className="w-full py-4.5 bg-brand-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 active-scale shadow-vivid">
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> {t('cloud_sync')}
                    </button>
                  </div>
                )}
                {settingsSubTab === 'export' && <ExportManager transactions={activeTransactions} branches={activeBranches} lang={lang} />}
                {settingsSubTab === 'branches' && <BranchManager branches={data.branches} setBranches={setBranchesWithDataCleanup} onAudit={addAuditLog} setGlobalConfirm={(m) => setConfirmModal({ ...m, show: true })} onResetBranchData={handleResetBranchData} lang={lang} />}
                {settingsSubTab === 'users' && <UserManager users={data.users} setUsers={val => setData(p => ({...p, users: typeof val === 'function' ? val(p.users) : val}))} branches={activeBranches} onAudit={addAuditLog} currentUserId={currentUser.id} setGlobalConfirm={(m) => setConfirmModal({ ...m, show: true })} lang={lang} />}
                {settingsSubTab === 'general' && ( <div className="space-y-10"><CategoryManager title={t('categories_man')} categories={data.expenseCategories} onUpdate={(cats) => {setData(prev => ({...prev, expenseCategories: cats}));}} lang={lang} /><RecurringManager recurringExpenses={data.recurringExpenses.filter(r => !r.deletedAt)} categories={data.expenseCategories} onUpdate={(recs) => {setData(prev => ({...prev, recurringExpenses: recs}));}} onGenerateTransactions={txs => {setData(prev => ({...prev, transactions: [...txs, ...prev.transactions]}));}} branchId={currentBranchId === ALL_BRANCHES_ID ? allowedBranches[0]?.id : currentBranchId} lang={lang} /></div> )}
                {settingsSubTab === 'audit' && (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto no-scrollbar">
                    {data.auditLogs.slice().reverse().map(log => (
                      <div key={log.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-1.5"><span className="text-[7px] font-black px-1.5 py-0.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-md uppercase">{log.action}</span><span className="text-[7px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleString()}</span></div>
                        <div className="text-[10px] font-bold dark:text-slate-200 uppercase tracking-tight">{log.details}</div>
                        <div className="text-[7px] text-slate-500 font-black uppercase mt-1">Bởi: {log.username}</div>
                      </div>
                    ))}
                  </div>
                )}
                {settingsSubTab === 'about' && (
                  <div className="space-y-10 animate-ios max-w-xl mx-auto py-4">
                    <div className="text-center space-y-4">
                       <div className="relative inline-block">{data.logoUrl ? ( <img src={data.logoUrl} className="w-20 h-20 object-contain mx-auto" alt="Logo" /> ) : (
                           <div className="w-20 h-20 bg-brand-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg"><UtensilsCrossed className="w-10 h-10 text-white" /></div>
                         )}<div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-full border-2 border-white dark:border-slate-900 uppercase">{t('active')}</div>
                       </div>
                       <div><h2 className="text-xl font-black dark:text-white uppercase">Tokymon Finance</h2><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1.5">Version {SCHEMA_VERSION}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700/50"><p className="text-[7px] font-black text-slate-400 uppercase mb-1">{t('system_status')}</p><div className="flex items-center gap-2 text-emerald-500"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[10px] font-black uppercase">{t('online')}</span></div></div>
                       <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700/50"><p className="text-[7px] font-black text-slate-400 uppercase mb-1">Encryption</p><div className="flex items-center gap-2 text-brand-500"><span className="text-[10px] font-black uppercase">AES-256</span></div></div>
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black uppercase dark:text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-500" /> {t('whats_new')}</h3>
                       <div className="bg-brand-50 dark:bg-brand-900/10 p-5 rounded-[1.5rem] border border-brand-100 dark:border-brand-800/50">
                          <ul className="space-y-2.5">
                             {APP_CHANGELOG[0].changes[lang].map((change, i) => (
                               <li key={i} className="flex gap-3 text-[10px] font-bold text-slate-700 dark:text-slate-300"><Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> {change}</li>
                             ))}
                          </ul>
                       </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 px-6 z-[2000] flex justify-center pointer-events-none ios-bottom-nav">
        <nav className="h-16 max-w-md w-full glass border border-white/20 dark:border-slate-800/50 flex items-center justify-around px-3 rounded-[2rem] shadow-2xl pointer-events-auto">
          {[
            { id: 'income', label: t('income'), icon: Wallet },
            { id: 'expense', label: t('expense'), icon: ArrowDownCircle },
            { id: 'stats', label: t('stats'), icon: LayoutDashboard },
            { id: 'settings', label: t('settings'), icon: Settings }
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex flex-col items-center gap-1 relative py-1 rounded-xl flex-1 transition-all active-scale ${activeTab === tab.id ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`}>
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
              <span className={`text-[8px] font-black uppercase tracking-widest ${activeTab === tab.id ? 'opacity-100' : 'opacity-40'}`}>{tab.label}</span>
              {activeTab === tab.id && <div className="absolute -bottom-1 w-1 h-1 bg-brand-600 rounded-full" />}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default App;
