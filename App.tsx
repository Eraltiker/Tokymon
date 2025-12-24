
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
import ReportSettingsManager from './components/ReportSettingsManager';
import { useTranslation } from './i18n';
import { 
  UtensilsCrossed, LayoutDashboard, Settings, 
  Wallet, ArrowDownCircle, Sun, Moon, LogOut, 
  History as HistoryIcon, MapPin, Users, RefreshCw, 
  ChevronDown, Cloud, Zap, ShieldCheck, FileSpreadsheet, LayoutPanelTop,
  AlertTriangle, Check, X, Clock, Code2, Heart, Languages
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'stats' | 'settings'>('income');
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'display' | 'export' | 'branches' | 'users' | 'sync' | 'audit'>('general');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('tokymon_theme') === 'dark');
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('tokymon_lang') as Language) || 'vi');
  
  const t = useTranslation(lang);
  
  const [data, setData] = useState<AppData>(() => StorageService.loadLocal());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
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
      const now = new Date();
      setLastSyncTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="absolute top-6 right-6">
           <button onClick={toggleLanguage} className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex items-center gap-2 border dark:border-slate-800">
              <Languages className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px] font-black uppercase dark:text-white">{lang === 'vi' ? 'Tiếng Việt' : 'Deutsch'}</span>
           </button>
        </div>
        <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl mb-8">
          <UtensilsCrossed className="w-10 h-10 text-white" />
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          const user = activeUsers.find(u => u.username.toLowerCase() === loginForm.username.toLowerCase() && u.password === loginForm.password);
          if (user) { 
            setCurrentUser(user); 
            localStorage.setItem('tokymon_user', JSON.stringify(user)); 
          } else { setLoginError(t('error_login')); }
        }} className="w-full max-w-[340px] space-y-4">
          <div className="text-center mb-8">
             <h1 className="text-4xl font-black dark:text-white uppercase tracking-tighter">Tokymon</h1>
             <div className="flex flex-col items-center gap-1 mt-1">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Finance System v{SCHEMA_VERSION}</p>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('developed_by')} <span className="text-indigo-400">thPhuoc</span></p>
             </div>
          </div>
          <input type="text" placeholder={t('username')} value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-500 outline-none dark:text-white" />
          <input type="password" placeholder={t('password')} value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl font-bold border-2 border-transparent focus:border-indigo-500 outline-none dark:text-white" />
          {loginError && <p className="text-rose-500 text-center text-[10px] font-black uppercase">{loginError}</p>}
          <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">{t('login')}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300 pb-28">
      {confirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setConfirmModal(null)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 relative z-10 border-4 border-indigo-500 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white text-center uppercase mb-2">{confirmModal.title}</h3>
            <p className="text-xs font-bold text-slate-500 text-center mb-8 leading-relaxed uppercase">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">{t('cancel')}</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">{t('save')}</button>
            </div>
          </div>
        </div>
      )}
      
      <header className="px-4 py-3 flex items-center justify-between sticky top-0 z-[1000] bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              type="button"
              onClick={() => setShowBranchDropdown(!showBranchDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border dark:border-slate-700 cursor-pointer"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-black uppercase dark:text-white truncate max-w-[120px]">{currentBranchName}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showBranchDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showBranchDropdown && (
              <>
                <div className="fixed inset-0 z-[1001]" onClick={() => setShowBranchDropdown(false)} />
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border dark:border-slate-800 z-[1002] overflow-hidden">
                  {dropdownBranches.map(b => (
                    <button 
                      key={b.id} 
                      type="button"
                      onClick={() => { setCurrentBranchId(b.id); setLastSelectedBranchId(b.id); localStorage.setItem('tokymon_current_branch', b.id); setShowBranchDropdown(false); }} 
                      className={`w-full text-left px-4 py-3 hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-between ${currentBranchId === b.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                    >
                      <span className="text-[10px] font-black uppercase">{b.name}</span>
                      {currentBranchId === b.id && <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" onClick={toggleLanguage} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border dark:border-slate-700 flex items-center gap-1">
             <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400">{lang === 'vi' ? 'VI' : 'DE'}</span>
          </button>
          <button type="button" onClick={() => setIsDark(!isDark)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border dark:border-slate-700">
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
          <button 
            type="button"
            onClick={() => setConfirmModal({ show: true, title: t('logout'), message: t('confirm_logout'), onConfirm: () => { localStorage.removeItem('tokymon_user'); setCurrentUser(null); } })}
            className="p-2.5 bg-rose-500 text-white rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 max-w-6xl mx-auto w-full pt-4 relative z-10">
        {activeTab === 'income' && (
          currentBranchId === ALL_BRANCHES_ID ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed dark:border-slate-800">
               <LayoutPanelTop className="w-12 h-12 text-slate-300 mb-4" />
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center px-10">
                 {lang === 'vi' ? 'Chuyển sang chi nhánh cụ thể để nhập doanh thu' : 'Wählen Sie eine Filiale aus, um Einnahmen zu erfassen'}
               </p>
               <button onClick={toggleGlobalReport} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">
                 {lang === 'vi' ? 'Về chi nhánh trước' : 'Zurück zur Filiale'}
               </button>
            </div>
          ) : (
            <IncomeManager transactions={data.transactions} onAddTransaction={tx => setData(p => ({...p, transactions: [tx, ...p.transactions]}))} onDeleteTransaction={id => setData(p => ({...p, transactions: p.transactions.map(t => t.id === id ? {...t, deletedAt: new Date().toISOString()} : t)}))} onEditTransaction={u => setData(p => ({...p, transactions: p.transactions.map(t => t.id === u.id ? u : t)}))} branchId={currentBranchId} initialBalances={{cash: currentBranch?.initialCash || 0, card: currentBranch?.initialCard || 0}} userRole={currentUser.role} branchName={currentBranchName} lang={lang} />
          )
        )}
        
        {activeTab === 'expense' && (
          currentBranchId === ALL_BRANCHES_ID ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed dark:border-slate-800">
               <ArrowDownCircle className="w-12 h-12 text-slate-300 mb-4" />
               <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center px-10">
                 {lang === 'vi' ? 'Chuyển sang chi nhánh cụ thể để nhập chi phí' : 'Wählen Sie eine Filiale aus, um Ausgaben zu erfassen'}
               </p>
               <button onClick={toggleGlobalReport} className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">
                 {lang === 'vi' ? 'Về chi nhánh trước' : 'Zurück zur Filiale'}
               </button>
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
          <div className="space-y-6 pb-20">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'general', label: t('categories_man'), icon: Settings },
                { id: 'display', label: t('stats'), icon: LayoutPanelTop },
                { id: 'export', label: 'Excel', icon: FileSpreadsheet },
                { id: 'sync', label: 'Cloud', icon: Cloud },
                { id: 'branches', label: t('branches'), icon: MapPin },
                { id: 'users', label: t('users'), icon: Users },
                { id: 'audit', label: t('audit_log'), icon: HistoryIcon }
              ].map(sub => (
                <button 
                  key={sub.id} 
                  type="button"
                  onClick={() => setSettingsSubTab(sub.id as any)} 
                  style={{ display: (sub.id === 'branches' || sub.id === 'users') && !isAdmin ? 'none' : 'flex' }} 
                  className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all flex items-center gap-2 shrink-0 ${settingsSubTab === sub.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}
                >
                  <sub.icon className="w-3.5 h-3.5" /> {sub.label}
                </button>
              ))}
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] p-6 border dark:border-slate-800 shadow-sm min-h-[450px] flex flex-col">
              <div className="flex-1">
                {settingsSubTab === 'sync' && (
                  <div className="space-y-6">
                    <input type="text" value={syncKey} onChange={e => {setSyncKey(e.target.value); localStorage.setItem('tokymon_sync_key', e.target.value);}} placeholder="Nhập Cloud ID..." className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-black border-2 border-transparent focus:border-indigo-500 outline-none text-xs dark:text-white" />
                    <button type="button" onClick={() => handleCloudSync()} disabled={isSyncing} className="w-full py-4.5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> {t('cloud_sync')}
                    </button>
                  </div>
                )}
                {settingsSubTab === 'display' && <ReportSettingsManager settings={reportSettings} onUpdate={val => {setData(prev => ({ ...prev, reportSettings: val }));}} />}
                {settingsSubTab === 'export' && <ExportManager transactions={data.transactions} branches={data.branches} lang={lang} />}
                {settingsSubTab === 'branches' && (
                  <BranchManager 
                    branches={data.branches} 
                    setBranches={fn => setData(p => ({...p, branches: fn(p.branches)}))} 
                    onAudit={addAuditLog}
                    setGlobalConfirm={(m) => setConfirmModal({ ...m, show: true })}
                    onResetBranchData={handleResetBranchData}
                    lang={lang}
                  />
                )}
                {settingsSubTab === 'users' && <UserManager users={data.users} setUsers={val => setData(p => ({...p, users: typeof val === 'function' ? val(p.users) : val}))} branches={activeBranches} onAudit={addAuditLog} currentUserId={currentUser.id} setGlobalConfirm={(m) => setConfirmModal({ ...m, show: true })} lang={lang} />}
                {settingsSubTab === 'general' && (
                  <div className="space-y-8">
                    <CategoryManager title={t('categories_man')} categories={data.expenseCategories} onUpdate={(cats) => {setData(prev => ({...prev, expenseCategories: cats}));}} lang={lang} />
                    <RecurringManager recurringExpenses={data.recurringExpenses.filter(r => !r.deletedAt)} categories={data.expenseCategories} onUpdate={(recs) => {setData(prev => ({...prev, recurringExpenses: recs}));}} onGenerateTransactions={txs => {setData(prev => ({...prev, transactions: [...txs, ...prev.transactions]}));}} branchId={currentBranchId === ALL_BRANCHES_ID ? allowedBranches[0]?.id : currentBranchId} lang={lang} />
                  </div>
                )}
                {settingsSubTab === 'audit' && (
                  <div className="space-y-4 h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {data.auditLogs.slice().reverse().map(log => (
                      <div key={log.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800 flex items-start gap-4">
                        <div className="flex-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {log.details} <span className="text-[8px] text-slate-400 font-normal ml-2">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-12 pt-8 border-t dark:border-slate-800 flex flex-col items-center gap-4">
                 <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('system_info')}</span>
                 </div>
                 <div className="flex flex-col items-center">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('version')} {SCHEMA_VERSION}</p>
                    <p className="text-[9px] font-bold text-slate-400 mt-1 flex items-center gap-1.5 uppercase">
                      Made with <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500" /> by <span className="text-indigo-600 dark:text-indigo-400 font-black">thPhuoc</span>
                    </p>
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-4 left-6 right-6 h-18 bg-white dark:bg-slate-900 border dark:border-slate-800 flex items-center justify-around px-4 rounded-[2.5rem] shadow-2xl z-[500]">
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
            className={`flex flex-col items-center gap-1 relative py-2 rounded-2xl flex-1 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`}
          >
            {activeTab === tab.id && <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-full" />}
            <tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className={`text-[8px] font-black uppercase tracking-tight ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
