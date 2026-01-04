
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Transaction, Branch, User, Category, UserRole, Language,
  AppData, SCHEMA_VERSION, TransactionType,
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
  MapPin, Users,
  ChevronDown, Cloud, FileSpreadsheet, LayoutGrid, 
  ArrowRight, Store, Info, CheckCircle2, User as UserIcon, X
} from 'lucide-react';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
const GLOBAL_SYNC_KEY = 'NZQkBLdrxvnEEMUw928weK';
const SYNC_DEBOUNCE_MS = 5000; 

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
  const [lang, setLang] = useState<Language>(() => localStorage.getItem('tokymon_lang') as any || 'vi');
  
  const { t } = useTranslation(lang);
  const [data, setData] = useState<AppData>(StorageService.getEmptyData());
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(validateSessionOnStartup);
  const [currentBranchId, setCurrentBranchId] = useState<string>(() => localStorage.getItem('tokymon_current_branch') || '');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [confirmModal, setConfirmModal] = useState<{show: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  
  const dataRef = useRef(data);
  const syncDebounceRef = useRef<number | null>(null);

  const isAdmin = currentUser?.role === UserRole.SUPER_ADMIN || currentUser?.role === UserRole.ADMIN;

  const handleCloudSync = useCallback(async (silent = false) => {
    if (!navigator.onLine) return;
    if (!silent) setIsSyncing(true);
    try {
      const merged = await StorageService.syncWithCloud(GLOBAL_SYNC_KEY, dataRef.current);
      setData(merged);
      dataRef.current = merged;
      await StorageService.saveLocal(merged);
    } catch (e) {} finally { if (!silent) setIsSyncing(false); }
  }, []);

  const atomicUpdate = useCallback(async (updater: (prev: AppData) => AppData, immediateSync = false) => {
    const nextData = updater(dataRef.current);
    dataRef.current = nextData;
    setData(nextData);
    await StorageService.saveLocal(nextData);
    if (immediateSync) await handleCloudSync(true);
    else {
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
      syncDebounceRef.current = window.setTimeout(() => handleCloudSync(true), SYNC_DEBOUNCE_MS);
    }
  }, [handleCloudSync]);

  useEffect(() => {
    StorageService.loadLocal().then(loaded => {
      setData(loaded);
      dataRef.current = loaded;
      setIsDataLoaded(true);
      if (navigator.onLine) handleCloudSync(true);
    });
  }, [handleCloudSync]);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('tokymon_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const activeBranches = useMemo(() => data.branches.filter(b => !b.deletedAt), [data.branches]);
  const allowedBranches = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return activeBranches;
    return activeBranches.filter(b => currentUser.assignedBranchIds?.includes(b.id));
  }, [activeBranches, currentUser, isAdmin]);

  useEffect(() => {
    if (currentUser && allowedBranches.length > 0) {
      if (!currentBranchId || !allowedBranches.find(b => b.id === currentBranchId)) {
        const firstId = allowedBranches[0].id;
        setCurrentBranchId(firstId);
        localStorage.setItem('tokymon_current_branch', firstId);
      }
    }
  }, [allowedBranches, currentBranchId, currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('tokymon_user');
    setCurrentUser(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = data.users.find(u => !u.deletedAt && u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('tokymon_user', JSON.stringify(user));
      localStorage.setItem('tokymon_last_activity', Date.now().toString());
    } else setLoginError(t('error_login'));
  };

  const currentBranch = useMemo(() => allowedBranches.find(b => b.id === currentBranchId), [allowedBranches, currentBranchId]);

  if (!currentUser) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <div className="login-mesh" />
        <div className="w-full max-w-[400px] z-10 flex flex-col items-center gap-8 animate-ios">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-premium flex items-center justify-center mx-auto border border-white/50 animate-float">
              <UtensilsCrossed className="w-12 h-12 text-brand-600" />
            </div>
            <h1 className="text-4xl font-black dark:text-white tracking-tighter uppercase leading-none">TOKYMON</h1>
          </div>
          <div className="w-full glass p-1 rounded-[3.2rem] shadow-premium relative border border-white/40">
            <div className="bg-white/40 dark:bg-slate-900/60 p-8 rounded-[3rem] space-y-8">
              <div className="text-center space-y-2">
                 <h2 className="text-xl font-black uppercase text-slate-800 dark:text-slate-100">{t('login_welcome')}</h2>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-60">Finance Pro Release</p>
              </div>
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <input type="text" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full h-15 px-6 bg-white/50 dark:bg-slate-950/40 rounded-2xl font-bold border border-slate-200 outline-none text-sm" placeholder={t('username')} required />
                <input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full h-15 px-6 bg-white/50 dark:bg-slate-950/40 rounded-2xl font-bold border border-slate-200 outline-none text-sm" placeholder={t('password')} required />
                {loginError && <p className="text-rose-500 text-[10px] font-black uppercase text-center">{loginError}</p>}
                <button type="submit" className="w-full h-15 bg-brand-600 text-white rounded-[1.8rem] font-black uppercase shadow-vivid flex items-center justify-center gap-3 transition-all active-scale">
                  <span>{t('login')}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 font-sans pb-32">
      <header className="px-4 py-3 flex items-center justify-between sticky top-0 z-[100] glass border-b border-white dark:border-slate-800/60 shadow-sm safe-pt">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: currentBranch?.color }}><UtensilsCrossed className="w-5 h-5" /></div>
           <button onClick={() => allowedBranches.length > 1 && setShowBranchSelector(true)} className="flex flex-col items-start active-scale text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[14px] font-black uppercase dark:text-white truncate tracking-tighter leading-none">{currentBranch?.name || '---'}</span>
                {allowedBranches.length > 1 && <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </div>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{currentUser.role}</p>
           </button>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setIsDark(!isDark)} className="w-10 h-10 text-slate-500 rounded-xl bg-white/50 border border-slate-100 flex items-center justify-center active-scale transition-all shadow-sm">
             {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
           </button>
           <button onClick={() => setLang(lang === 'vi' ? 'de' : 'vi')} className="h-10 px-3 rounded-xl bg-white/80 border border-slate-200 flex items-center gap-2 active-scale transition-all shadow-sm">
             <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-slate-100">
                <img src={`https://flagcdn.com/w40/${lang === 'vi' ? 'vn' : 'de'}.png`} className="w-full h-full object-cover scale-150" />
             </div>
           </button>
           <button onClick={() => setConfirmModal({ show: true, title: t('logout'), message: t('confirm_logout'), onConfirm: handleLogout })} className="w-10 h-10 text-rose-500 rounded-xl bg-white border border-slate-100 flex items-center justify-center active-scale transition-all shadow-sm"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      {/* Modern Branch Selector Card Grid */}
      {showBranchSelector && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-xl space-y-6">
              <div className="flex justify-between items-center px-4">
                 <h2 className="text-xl font-black text-white uppercase tracking-tighter">Hệ thống Tokymon</h2>
                 <button onClick={() => setShowBranchSelector(false)} className="w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center active-scale"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {allowedBranches.map(b => (
                   <button 
                    key={b.id} 
                    onClick={() => { setCurrentBranchId(b.id); localStorage.setItem('tokymon_current_branch', b.id); setShowBranchSelector(false); }}
                    className={`p-6 rounded-[2.5rem] border-2 text-left transition-all active-scale group relative overflow-hidden ${currentBranchId === b.id ? 'bg-white border-white shadow-premium scale-[1.02]' : 'bg-slate-900/60 border-slate-800'}`}
                   >
                     <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-5 -mr-8 -mt-8 rounded-full" style={{ color: b.color }} />
                     <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg text-white" style={{ backgroundColor: b.color || '#6366f1' }}>
                        <Store className="w-6 h-6" />
                     </div>
                     <h4 className={`text-base font-black uppercase tracking-tight mb-1 ${currentBranchId === b.id ? 'text-slate-900' : 'text-white'}`}>{b.name}</h4>
                     <p className={`text-[10px] font-bold uppercase tracking-widest leading-tight ${currentBranchId === b.id ? 'text-slate-500' : 'text-slate-400'}`}>{b.address || 'Chi nhánh Tokymon'}</p>
                     {currentBranchId === b.id && <div className="absolute top-6 right-6 w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-emerald-500/20" />}
                   </button>
                 ))}
              </div>
              <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-60">Vui lòng chọn cơ sở để xem báo cáo chi tiết</p>
           </div>
        </div>
      )}

      <main className="flex-1 px-2 sm:px-4 max-w-6xl mx-auto w-full pt-4">
        {activeTab === 'stats' && <Dashboard transactions={data.transactions} initialBalances={{cash: 0, card: 0}} lang={lang} currentBranchId={currentBranchId} allowedBranches={allowedBranches} reportSettings={data.reportSettings!} />}
        {activeTab === 'income' && <IncomeManager transactions={data.transactions} onAddTransaction={tx => atomicUpdate(p => ({...p, transactions: [tx, ...p.transactions]}), true)} onDeleteTransaction={id => atomicUpdate(p => ({...p, transactions: p.transactions.map(t => t.id === id ? {...t, deletedAt: new Date().toISOString()} : t)}), true)} onEditTransaction={u => atomicUpdate(p => ({...p, transactions: p.transactions.map(t => t.id === u.id ? u : t)}), true)} branchId={currentBranchId} initialBalances={{cash: 0, card: 0}} userRole={currentUser.role} branchName={currentBranch?.name} lang={lang} currentUsername={currentUser.username} />}
        {activeTab === 'expense' && <ExpenseManager transactions={data.transactions} onAddTransaction={tx => atomicUpdate(p => ({...p, transactions: [tx, ...p.transactions]}), true)} onDeleteTransaction={id => atomicUpdate(p => ({...p, transactions: p.transactions.map(t => t.id === id ? {...t, deletedAt: new Date().toISOString()} : t)}), true)} onEditTransaction={u => atomicUpdate(p => ({...p, transactions: p.transactions.map(t => t.id === u.id ? u : t)}), true)} expenseCategories={data.expenseCategories.filter(c => c.branchId === currentBranchId).map(c => c.name)} branchId={currentBranchId} initialBalances={{cash: 0, card: 0}} userRole={currentUser.role} branchName={currentBranch?.name} lang={lang} currentUsername={currentUser.username} />}
        {activeTab === 'settings' && (
          <div className="space-y-6">
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {[ { id: 'general', label: t('branding'), icon: LayoutGrid }, { id: 'export', label: 'Excel', icon: FileSpreadsheet }, { id: 'sync', label: 'Cloud', icon: Cloud }, { id: 'branches', label: t('branches'), icon: MapPin }, { id: 'users', label: t('users'), icon: Users }, { id: 'about', label: t('about'), icon: Info } ].map(sub => {
                  if ((sub.id === 'branches' || sub.id === 'users' || sub.id === 'sync') && !isAdmin) return null;
                  return (
                    <button key={sub.id} onClick={() => setSettingsSubTab(sub.id as any)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 active-scale ${settingsSubTab === sub.id ? 'bg-slate-900 border-slate-900 text-white shadow-vivid' : 'bg-white border-slate-200 text-slate-500'}`}>
                      <sub.icon className="w-4 h-4" /> {sub.label}
                    </button>
                  );
                })}
             </div>
             <div className="bg-white dark:bg-slate-900/90 rounded-[3rem] p-6 border dark:border-slate-800 shadow-ios min-h-[500px]">
                {settingsSubTab === 'export' && <ExportManager transactions={data.transactions} branches={data.branches} lang={lang} />}
                {settingsSubTab === 'branches' && isAdmin && <BranchManager branches={data.branches} setBranches={update => atomicUpdate(prev => ({ ...prev, branches: typeof update === 'function' ? update(prev.branches) : update }), true)} onAudit={() => {}} setGlobalConfirm={setConfirmModal} onResetBranchData={() => {}} lang={lang} />}
                {settingsSubTab === 'users' && isAdmin && <UserManager users={data.users} setUsers={update => atomicUpdate(prev => ({ ...prev, users: typeof update === 'function' ? update(prev.users) : update }), true)} branches={data.branches} onAudit={() => {}} currentUserId={currentUser.id} setGlobalConfirm={setConfirmModal} lang={lang} />}
                {settingsSubTab === 'general' && (
                  <div className="space-y-8">
                    <CategoryManager title={t('categories_man')} categories={data.expenseCategories.filter(c => c.branchId === currentBranchId)} branchId={currentBranchId} onUpdate={updates => atomicUpdate(prev => ({ ...prev, expenseCategories: StorageService.mergeArrays(prev.expenseCategories, updates) }), true)} lang={lang} onAudit={() => {}} />
                    <RecurringManager recurringExpenses={data.recurringExpenses.filter(r => r.branchId === currentBranchId)} categories={data.expenseCategories.filter(c => c.branchId === currentBranchId).map(c => c.name)} onUpdate={updates => atomicUpdate(prev => ({ ...prev, recurringExpenses: StorageService.mergeArrays(prev.recurringExpenses, updates) }), true)} onGenerateTransactions={txs => atomicUpdate(prev => ({ ...prev, transactions: [...txs, ...prev.transactions] }), true)} branchId={currentBranchId} lang={lang} />
                  </div>
                )}
                {settingsSubTab === 'about' && (
                  <div className="text-center space-y-8 py-10">
                     <div className="w-20 h-20 bg-brand-600 rounded-[2rem] flex items-center justify-center text-white shadow-vivid mx-auto animate-float"><UtensilsCrossed className="w-10 h-10" /></div>
                     <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Tokymon Finance</h2>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">v{SCHEMA_VERSION.split(' ')[0]}</p>
                     <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Professional Financial Edition
                     </div>
                  </div>
                )}
             </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 px-6 z-[200] flex justify-center pb-8 safe-pb">
        <nav className="h-20 max-w-md w-full glass border border-white/40 dark:border-slate-800 flex items-center justify-around px-2 rounded-[2.5rem] shadow-2xl">
          {[ 
            { id: 'stats', label: t('stats'), icon: LayoutDashboard }, 
            { id: 'income', label: t('income'), icon: Wallet }, 
            { id: 'expense', label: t('expense'), icon: ArrowDownCircle }, 
            { id: 'settings', label: t('settings'), icon: Settings } 
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); localStorage.setItem('tokymon_last_tab', tab.id); }} className={`flex flex-col items-center gap-1.5 flex-1 transition-all active-scale ${activeTab === tab.id ? 'text-brand-600 dark:text-white' : 'text-slate-400'}`}>
              <tab.icon className="w-6 h-6" />
              <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {confirmModal && confirmModal.show && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-ios">
            <h3 className="text-xl font-black dark:text-white uppercase mb-2">{confirmModal.title}</h3>
            <p className="text-sm font-bold text-slate-500 mb-8">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black uppercase text-[10px] dark:text-slate-300">Hủy</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px]">Đồng ý</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
