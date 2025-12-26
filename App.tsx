
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Transaction, Branch, User, UserRole, Language, 
  AuditLogEntry, AppData, SCHEMA_VERSION, TransactionType, ReportSettings, ALL_BRANCHES_ID 
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
  ChevronDown, Cloud, ShieldCheck, FileSpreadsheet, LayoutPanelTop,
  AlertTriangle, Heart, Languages, Code2, UserCircle2, 
  Image as ImageIcon, Upload, Trash2, Shield, Info,
  Sparkles, Lock, ArrowRight, Github, MonitorSmartphone, Cpu
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'stats' | 'settings'>('income');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'export' | 'branches' | 'users' | 'sync' | 'audit'>('general');
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
      
      if (JSON.stringify(merged) !== JSON.stringify(dataRef.current)) {
        setData(merged);
      }
      
      setSyncStatus('SUCCESS');
      if (!silent) setTimeout(() => setSyncStatus('IDLE'), 3000);
    } catch (e: any) {
      setSyncStatus('ERROR');
    } finally {
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

  useEffect(() => {
    localStorage.setItem('tokymon_lang', lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => prev === 'vi' ? 'de' : 'vi');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setData(prev => ({ ...prev, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const activeTransactions = useMemo(() => data.transactions.filter(tx => !tx.deletedAt), [data.transactions]);
  const activeBranches = useMemo(() => data.branches.filter(b => !b.deletedAt), [data.branches]);
  const activeUsers = useMemo(() => data.users.filter(u => !u.deletedAt), [data.users]);

  const isAdmin = useMemo(() => currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.ADMIN, [currentUser]);

  const allowedBranches = useMemo(() => {
    if (!currentUser) return [];
    let base = activeBranches;
    if (!isAdmin) {
      base = activeBranches.filter(b => currentUser.assignedBranchIds.includes(b.id));
    }
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
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      username: currentUser.username,
      action, entityType, entityId, details
    };
    setData(prev => ({ ...prev, auditLogs: [newLog, ...prev.auditLogs].slice(0, 500) }));
  }, [currentUser]);

  const handleResetBranchData = (branchId: string) => {
    const branch = data.branches.find(b => b.id === branchId);
    if (!branch) return;

    const now = new Date().toISOString();
    setData(prev => {
      const nextTransactions = prev.transactions.map(t => 
        t.branchId === branchId ? { ...t, deletedAt: now, updatedAt: now } : t
      );
      const nextData = { ...prev, transactions: nextTransactions };
      
      addAuditLog('DELETE', 'BRANCH', branchId, `Reset toàn bộ dữ liệu của chi nhánh: ${branch.name}`);
      handleCloudSync(true, nextData);
      return nextData;
    });
  };

  const currentBranchName = useMemo(() => {
    if (currentBranchId === ALL_BRANCHES_ID) return t('all_branches');
    return activeBranches.find(b => b.id === currentBranchId)?.name || '---';
  }, [currentBranchId, activeBranches, t]);

  const systemInitialBalances = useMemo(() => {
    return activeBranches.reduce((acc, b) => ({
      cash: acc.cash + (b.initialCash || 0),
      card: acc.card + (b.initialCard || 0)
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* Dynamic Background Effects */}
        <div className="absolute top-[-40%] left-[-20%] w-[120%] h-[120%] bg-gradient-to-br from-brand-600/10 via-slate-950 to-indigo-900/10 animate-pulse pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-700 pointer-events-none" />

        {/* Language Switcher */}
        <div className="absolute top-8 right-8 z-50">
           <button onClick={toggleLanguage} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 backdrop-blur-3xl rounded-2xl border border-white/10 text-white transition-all active:scale-90 flex items-center gap-3 shadow-2xl">
              <Languages className="w-4 h-4 text-brand-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">{lang === 'vi' ? 'Vietnam' : 'Deutsch'}</span>
           </button>
        </div>

        <div className="w-full max-w-[420px] z-10 space-y-12">
          {/* Brand Header */}
          <div className="text-center space-y-8 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="relative inline-block group">
              {data.logoUrl ? (
                <div className="relative p-4 bg-white/5 rounded-[3rem] backdrop-blur-xl border border-white/10 shadow-2xl">
                  <img 
                    src={data.logoUrl} 
                    alt="Tokymon" 
                    className="w-32 h-32 mx-auto object-contain transition-transform duration-700 group-hover:scale-110" 
                    style={{ mixBlendMode: 'plus-lighter' }}
                  />
                  <div className="absolute -inset-2 bg-brand-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-brand-600 to-indigo-700 rounded-[3rem] flex items-center justify-center shadow-[0_0_60px_rgba(79,70,229,0.3)] mx-auto transform rotate-6 group-hover:rotate-0 transition-all duration-700 relative overflow-hidden">
                  <UtensilsCrossed className="w-14 h-14 text-white relative z-10" />
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">Tokymon</h1>
              <div className="flex items-center justify-center gap-4">
                <div className="h-px w-10 bg-brand-500/40"></div>
                <p className="text-[11px] font-black text-brand-400 uppercase tracking-[0.5em]">Finance Core</p>
                <div className="h-px w-10 bg-brand-500/40"></div>
              </div>
            </div>
          </div>

          {/* Login Box */}
          <form onSubmit={(e) => {
            e.preventDefault();
            const user = activeUsers.find(u => u.username.toLowerCase() === loginForm.username.toLowerCase() && u.password === loginForm.password);
            if (user) { 
              setCurrentUser(user); 
              localStorage.setItem('tokymon_user', JSON.stringify(user)); 
              addAuditLog('LOGIN', 'USER', user.id, `Đăng nhập thành công`);
            } else { setLoginError(t('error_login')); }
          }} className="bg-white/5 backdrop-blur-[60px] p-10 rounded-[3.5rem] border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] space-y-8 relative overflow-hidden group">
            <div className="space-y-6 relative z-10">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] ml-2">Access ID</label>
                <div className="relative group/input">
                  <input 
                    type="text" 
                    value={loginForm.username} 
                    onChange={e => setLoginForm({...loginForm, username: e.target.value})} 
                    className="w-full p-5 bg-black/40 rounded-[1.8rem] font-bold border-2 border-white/5 focus:border-brand-500 focus:bg-black/60 outline-none text-white transition-all pl-14" 
                    placeholder="Username"
                    required 
                  />
                  <UserCircle2 className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 group-focus-within/input:text-brand-400 transition-colors" />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] ml-2">Secure Key</label>
                <div className="relative group/input">
                  <input 
                    type="password" 
                    value={loginForm.password} 
                    onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                    className="w-full p-5 bg-black/40 rounded-[1.8rem] font-bold border-2 border-white/5 focus:border-brand-500 focus:bg-black/60 outline-none text-white transition-all pl-14" 
                    placeholder="••••••••"
                    required 
                  />
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500 group-focus-within/input:text-brand-400 transition-colors" />
                </div>
              </div>
            </div>
            
            {loginError && (
              <div className="bg-rose-500/10 p-4 rounded-[1.8rem] border border-rose-500/20 flex items-center gap-4 animate-in slide-in-from-top-3">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <p className="text-rose-400 text-[11px] font-black uppercase tracking-wider">{loginError}</p>
              </div>
            )}

            <button type="submit" className="w-full py-6 bg-brand-600 hover:bg-brand-500 text-white rounded-[2rem] font-black uppercase text-[15px] tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] active:scale-[0.97] transition-all relative overflow-hidden group/btn mt-2">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-[1.2s] ease-in-out" />
              <div className="relative z-10 flex items-center justify-center gap-4">
                {t('login')}
                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
              </div>
            </button>
          </form>

          {/* Designer Footer */}
          <div className="text-center space-y-8 animate-in fade-in duration-1000 delay-700">
             <div className="flex items-center justify-center gap-6 opacity-20">
               <div className="h-px w-16 bg-white"></div>
               <Cpu className="w-5 h-5 text-white" />
               <div className="h-px w-16 bg-white"></div>
             </div>
             <div className="space-y-3">
                <div className="inline-flex flex-col items-center gap-2">
                   <div className="flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                      <Code2 className="w-4 h-4 text-brand-400" />
                      <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">
                        Handcrafted by <span className="text-brand-400">thPhuoc</span>
                      </p>
                   </div>
                   <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block">v{SCHEMA_VERSION} • Enterprise Financial Solutions</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300 font-sans">
      {confirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => setConfirmModal(null)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-4xl p-8 relative z-10 border border-slate-100 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center text-brand-600 mb-6 mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white text-center uppercase mb-3 tracking-tight">{confirmModal.title}</h3>
            <p className="text-[11px] font-bold text-slate-400 text-center mb-8 leading-relaxed uppercase">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">{t('cancel')}</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">{t('save')}</button>
            </div>
          </div>
        </div>
      )}
      
      <header className="px-5 py-4 flex items-center justify-between sticky top-0 z-[1000] glass border-b border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          {data.logoUrl ? (
            <img 
              src={data.logoUrl} 
              alt="Logo" 
              className="w-10 h-10 object-contain drop-shadow-md" 
              style={{ mixBlendMode: isDark ? 'screen' : 'multiply' }}
            />
          ) : (
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-soft">
               <UtensilsCrossed className="w-5 h-5" />
            </div>
          )}
          <div className="relative">
            <button 
              type="button"
              onClick={() => setShowBranchDropdown(!showBranchDropdown)}
              className="flex items-center gap-3 px-4 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 cursor-pointer active:scale-95 transition-all shadow-sm"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase dark:text-white truncate max-w-[120px] tracking-tight">{currentBranchName}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showBranchDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showBranchDropdown && (
              <>
                <div className="fixed inset-0 z-[1001]" onClick={() => setShowBranchDropdown(false)} />
                <div className="absolute top-full left-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-[1002] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                  <div className="p-3 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Chọn chi nhánh</p>
                  </div>
                  {dropdownBranches.map(b => (
                    <button 
                      key={b.id} 
                      type="button"
                      onClick={() => { setCurrentBranchId(b.id); setLastSelectedBranchId(b.id); localStorage.setItem('tokymon_current_branch', b.id); setShowBranchDropdown(false); }} 
                      className={`w-full text-left px-5 py-4 hover:bg-brand-600 hover:text-white transition-all flex items-center justify-between border-b last:border-0 border-slate-50 dark:border-slate-800/50 ${currentBranchId === b.id ? 'bg-brand-50 dark:bg-brand-900/10 text-brand-600' : 'dark:text-slate-300 text-slate-600'}`}
                    >
                      <span className="text-[10px] font-black uppercase">{b.name}</span>
                      {currentBranchId === b.id && <div className="w-5 h-5 bg-brand-600 rounded-full flex items-center justify-center text-white"><ShieldCheck className="w-3 h-3" /></div>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setIsDark(!isDark)} className="w-11 h-11 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 transition-all active:scale-90 flex items-center justify-center">
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-brand-600" />}
          </button>
          <button 
            type="button"
            onClick={() => setConfirmModal({ show: true, title: t('logout'), message: t('confirm_logout'), onConfirm: () => { localStorage.removeItem('tokymon_user'); setCurrentUser(null); } })}
            className="w-11 h-11 bg-rose-500 text-white rounded-2xl shadow-lg flex items-center justify-center active:scale-90 transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 max-w-6xl mx-auto w-full pt-6 pb-36">
        {activeTab === 'income' && (
          currentBranchId === ALL_BRANCHES_ID ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-4xl border-2 border-dashed border-slate-100 dark:border-slate-800">
               <LayoutPanelTop className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-6" />
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center px-10 leading-loose">Vui lòng chọn một chi nhánh <br/> để nhập doanh thu</p>
            </div>
          ) : (
            <IncomeManager transactions={data.transactions} onAddTransaction={tx => setData(p => ({...p, transactions: [tx, ...p.transactions]}))} onDeleteTransaction={id => setData(p => ({...p, transactions: p.transactions.map(t => t.id === id ? {...t, deletedAt: new Date().toISOString()} : t)}))} onEditTransaction={u => setData(p => ({...p, transactions: p.transactions.map(t => t.id === u.id ? u : t)}))} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} branchName={currentBranchName} lang={lang} />
          )
        )}
        
        {activeTab === 'expense' && (
          currentBranchId === ALL_BRANCHES_ID ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-900 rounded-4xl border-2 border-dashed border-slate-100 dark:border-slate-800">
               <ArrowDownCircle className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-6" />
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center px-10 leading-loose">Vui lòng chọn một chi nhánh <br/> để nhập chi phí</p>
            </div>
          ) : (
            <ExpenseManager transactions={data.transactions} onAddTransaction={tx => setData(p => ({...p, transactions: [tx, ...p.transactions]}))} onDeleteTransaction={id => setData(p => ({...p, transactions: p.transactions.map(t => t.id === id ? {...t, deletedAt: new Date().toISOString()} : t)}))} onEditTransaction={u => setData(p => ({...p, transactions: p.transactions.map(t => t.id === u.id ? u : t)}))} expenseCategories={data.expenseCategories} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} branchName={currentBranchName} lang={lang} />
          )
        )}
        
        {activeTab === 'stats' && <Dashboard 
          transactions={activeTransactions} 
          initialBalances={currentBranchId === ALL_BRANCHES_ID ? systemInitialBalances : {cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} 
          lang={lang} 
          currentBranchId={currentBranchId} 
          allowedBranches={allowedBranches} 
          userRole={currentUser.role} 
          reportSettings={reportSettings}
          onToggleGlobal={toggleGlobalReport} 
        />}
        
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2">
              {[
                { id: 'general', label: t('branding'), icon: ImageIcon },
                { id: 'export', label: 'Excel', icon: FileSpreadsheet },
                { id: 'sync', label: 'Cloud', icon: Cloud },
                { id: 'branches', label: t('branches'), icon: MapPin },
                { id: 'users', label: t('users'), icon: Users },
                { id: 'audit', label: 'Log', icon: HistoryIcon }
              ].map(sub => (
                <button 
                  key={sub.id} 
                  type="button"
                  onClick={() => setSettingsSubTab(sub.id as any)} 
                  style={{ display: (sub.id === 'branches' || sub.id === 'users') && !isAdmin ? 'none' : 'flex' }} 
                  className={`px-5 py-4 rounded-2xl text-[9px] font-black uppercase tracking-wider border transition-all flex items-center gap-2.5 shrink-0 ${settingsSubTab === sub.id ? 'bg-brand-600 border-brand-600 text-white shadow-lg translate-y-[-2px]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}
                >
                  <sub.icon className="w-4 h-4" /> {sub.label}
                </button>
              ))}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-5xl p-8 border border-slate-100 dark:border-slate-800 shadow-soft min-h-[500px]">
                {settingsSubTab === 'sync' && (
                  <div className="space-y-6 max-w-sm mx-auto pt-6 text-center">
                    <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-3xl flex items-center justify-center text-brand-600 mx-auto mb-2">
                      <Cloud className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Cloud Bucket ID</label>
                      <input type="text" value={syncKey} onChange={e => {setSyncKey(e.target.value); localStorage.setItem('tokymon_sync_key', e.target.value);}} placeholder="ID..." className="w-full p-4.5 bg-slate-50 dark:bg-slate-950 rounded-2xl font-bold border-2 border-transparent focus:border-brand-500 outline-none text-sm dark:text-white transition-all shadow-inner text-center" />
                    </div>
                    <button type="button" onClick={() => handleCloudSync()} disabled={isSyncing} className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-vivid active:scale-95 transition-all">
                      <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} /> {t('cloud_sync')}
                    </button>
                  </div>
                )}
                
                {settingsSubTab === 'export' && <ExportManager transactions={data.transactions} branches={data.branches} lang={lang} />}
                
                {settingsSubTab === 'branches' && <BranchManager branches={data.branches} setBranches={fn => setData(p => ({...p, branches: fn(p.branches)}))} onAudit={addAuditLog} setGlobalConfirm={(m) => setConfirmModal({ ...m, show: true })} onResetBranchData={handleResetBranchData} lang={lang} />}
                
                {settingsSubTab === 'users' && <UserManager users={data.users} setUsers={val => setData(p => ({...p, users: typeof val === 'function' ? val(p.users) : val}))} branches={activeBranches} onAudit={addAuditLog} currentUserId={currentUser.id} setGlobalConfirm={(m) => setConfirmModal({ ...m, show: true })} lang={lang} />}
                
                {settingsSubTab === 'general' && (
                  <div className="space-y-12">
                    {/* Branding / Logo Section */}
                    {isAdmin && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center text-brand-600 shadow-soft">
                             <ImageIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-base font-black dark:text-white uppercase tracking-tight leading-none mb-1">{t('branding')}</h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tùy chỉnh nhận diện thương hiệu</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row items-center gap-10 bg-slate-50 dark:bg-slate-950/50 p-8 rounded-4xl border-2 border-dashed dark:border-slate-800">
                           <div className="w-32 h-32 bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 flex items-center justify-center overflow-hidden shadow-vivid relative group">
                              {data.logoUrl ? (
                                <img 
                                  src={data.logoUrl} 
                                  alt="Preview" 
                                  className="w-full h-full object-contain" 
                                  style={{ mixBlendMode: isDark ? 'screen' : 'multiply' }}
                                />
                              ) : (
                                <UtensilsCrossed className="w-12 h-12 text-slate-200 dark:text-slate-800" />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                <ImageIcon className="w-8 h-8 text-white" />
                              </div>
                           </div>
                           <div className="flex-1 space-y-6 text-center md:text-left">
                              <div className="space-y-1">
                                <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">{t('custom_logo')}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed max-w-xs">{t('logo_hint')}</p>
                              </div>
                              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                <label className="px-6 py-3.5 bg-brand-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-vivid active:scale-95 transition-all flex items-center gap-3 cursor-pointer">
                                  <Upload className="w-4 h-4" /> {t('upload_logo')}
                                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                </label>
                                {data.logoUrl && (
                                  <button onClick={() => setData(prev => ({ ...prev, logoUrl: undefined }))} className="px-6 py-3.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-3">
                                    <Trash2 className="w-4 h-4" /> {t('reset_logo')}
                                  </button>
                                )}
                              </div>
                           </div>
                        </div>
                      </div>
                    )}

                    <div className="h-px bg-slate-100 dark:bg-slate-800" />

                    <CategoryManager title={t('categories_man')} categories={data.expenseCategories} onUpdate={(cats) => {setData(prev => ({...prev, expenseCategories: cats}));}} lang={lang} />
                    
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                    
                    <RecurringManager recurringExpenses={data.recurringExpenses.filter(r => !r.deletedAt)} categories={data.expenseCategories} onUpdate={(recs) => {setData(prev => ({...prev, recurringExpenses: recs}));}} onGenerateTransactions={txs => {setData(prev => ({...prev, transactions: [...txs, ...prev.transactions]}));}} branchId={currentBranchId === ALL_BRANCHES_ID ? allowedBranches[0]?.id : currentBranchId} lang={lang} />
                  
                    {/* Credits in Settings */}
                    <div className="pt-10 flex flex-col items-center gap-4 opacity-40">
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] dark:text-white flex items-center gap-2">
                         <Code2 className="w-4 h-4 text-brand-500" /> Developed by thPhuoc
                       </p>
                       <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                            <span className="text-[8px] font-black uppercase tracking-widest">Premium Quality</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MonitorSmartphone className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase tracking-widest">Secure & Fast</span>
                          </div>
                       </div>
                    </div>
                  </div>
                )}
                
                {settingsSubTab === 'audit' && (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    <div className="flex items-center gap-3 mb-4">
                      <HistoryIcon className="w-5 h-5 text-brand-500" />
                      <h3 className="text-xs font-black uppercase dark:text-white">Nhật ký hoạt động</h3>
                    </div>
                    {data.auditLogs.slice().reverse().map(log => (
                      <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                           <span className="text-[9px] font-black px-2 py-0.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-md uppercase tracking-widest">{log.action}</span>
                           <span className="text-[8px] text-slate-400 font-bold uppercase">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-[11px] font-bold dark:text-slate-200 uppercase tracking-tight">{log.details}</div>
                        <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                          <UserCircle2 className="w-2.5 h-2.5" /> {log.username}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}
      </main>

      {/* Modern Floating Navigation */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-[2000] flex justify-center pointer-events-none">
        <nav className="h-20 max-w-md w-full glass border border-white/10 dark:border-slate-800/80 flex items-center justify-around px-4 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] pointer-events-auto backdrop-blur-3xl">
          {[
            { id: 'income', label: t('income'), icon: Wallet },
            { id: 'expense', label: t('expense'), icon: ArrowDownCircle },
            { id: 'stats', label: t('stats'), icon: LayoutDashboard },
            { id: 'settings', label: t('settings'), icon: Settings }
          ].map(tab => (
            <button 
              key={tab.id} 
              type="button"
              onClick={() => { setActiveTab(tab.id as any); window.scrollTo({ top: 0, behavior: 'smooth' }); }} 
              className={`flex flex-col items-center gap-1.5 relative py-2 rounded-2xl flex-1 transition-all active:scale-[0.8] ${activeTab === tab.id ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 hover:text-slate-500'}`}
            >
              {activeTab === tab.id && (
                <div className="absolute -top-3 w-10 h-1 bg-brand-600 dark:bg-brand-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.6)] animate-in zoom-in duration-500" />
              )}
              <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'stroke-[2.5] scale-110' : 'stroke-[2]'}`} />
              <span className={`text-[9px] font-black uppercase tracking-tight transition-all ${activeTab === tab.id ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-0.5'}`}>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default App;
