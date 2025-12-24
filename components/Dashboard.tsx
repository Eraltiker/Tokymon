
import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, formatCurrency, Language, Branch, UserRole, ReportSettings, ExpenseSource, ALL_BRANCHES_ID } from '../types';
import { useTranslation } from '../i18n';
import { 
  AlertCircle, TrendingUp, Layers, ChevronLeft, ChevronRight, 
  Wallet, Banknote, CreditCard, Activity, 
  BarChart3, Zap, LayoutDashboard, Info, RefreshCcw
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  initialBalances: { cash: number; card: number };
  lang: Language;
  currentBranchId: string;
  allowedBranches: Branch[];
  userRole?: UserRole;
  reportSettings: ReportSettings;
  onToggleGlobal?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  initialBalances, 
  lang, 
  currentBranchId, 
  allowedBranches, 
  userRole, 
  reportSettings,
  onToggleGlobal
}) => {
  const t = useTranslation(lang);
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DAILY_REPORT' | 'GENERAL_BALANCE' | 'LIABILITIES'>('OVERVIEW');
  const isSystemView = currentBranchId === ALL_BRANCHES_ID;
  const isAdmin = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN;

  // Lọc giao dịch
  const branchTransactions = useMemo(() => {
    if (isSystemView) return transactions.filter(tx => !tx.deletedAt);
    return transactions.filter(tx => tx.branchId === currentBranchId && !tx.deletedAt);
  }, [transactions, isSystemView, currentBranchId]);

  // Giao dịch tháng
  const monthTransactions = useMemo(() => {
    return branchTransactions.filter(tx => tx.date.startsWith(currentMonth));
  }, [branchTransactions, currentMonth]);

  // Thống kê
  const stats = useMemo(() => {
    let totalIn = 0, totalOut = 0, totalDebt = 0;
    const categoryMap: Record<string, number> = {};

    monthTransactions.forEach(tx => {
      const amount = tx.amount || 0;
      if (tx.type === TransactionType.INCOME) {
        totalIn += amount;
      } else {
        totalOut += amount;
        if (tx.isPaid === false) totalDebt += amount;
        categoryMap[tx.category] = (categoryMap[tx.category] || 0) + amount;
      }
    });

    const profit = totalIn - totalOut;
    const margin = totalIn > 0 ? profit / totalIn : 0;
    const topCategories = Object.entries(categoryMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value, percentage: totalOut > 0 ? (value / totalOut) * 100 : 0 }));

    return { totalIn, totalOut, totalDebt, profit, margin, topCategories };
  }, [monthTransactions]);

  const balances = useMemo(() => {
    let cumulativeCashIn = 0;
    let cumulativeCardIn = 0;
    let cumulativeCashOut = 0;
    let cumulativeCardOut = 0;

    branchTransactions.forEach(tx => {
      const amount = tx.amount || 0;
      if (tx.type === TransactionType.INCOME) {
        if (tx.incomeBreakdown) {
          cumulativeCashIn += tx.incomeBreakdown.cash || 0;
          cumulativeCardIn += tx.incomeBreakdown.card || 0;
        } else {
          cumulativeCashIn += amount;
        }
      } else if (tx.type === TransactionType.EXPENSE) {
        if (tx.expenseSource === ExpenseSource.SHOP_CASH || tx.expenseSource === ExpenseSource.WALLET) {
          cumulativeCashOut += amount;
        } else if (tx.expenseSource === ExpenseSource.CARD) {
          cumulativeCardOut += amount;
        }
      }
    });

    const currentCash = initialBalances.cash + cumulativeCashIn - cumulativeCashOut;
    const currentCard = initialBalances.card + cumulativeCardIn - cumulativeCardOut;

    return { cash: currentCash, card: currentCard, total: currentCash + currentCard };
  }, [branchTransactions, initialBalances]);

  const dailyData = useMemo(() => {
    const dayMap: Record<string, any> = {};
    monthTransactions.forEach(tx => {
      if (!dayMap[tx.date]) dayMap[tx.date] = { revenue: 0, cashIn: 0, cardIn: 0, shopOut: 0, walletOut: 0, cardOut: 0 };
      if (tx.type === TransactionType.INCOME) {
        dayMap[tx.date].revenue += tx.amount || 0;
        if (tx.incomeBreakdown) {
          dayMap[tx.date].cashIn += tx.incomeBreakdown.cash || 0;
          dayMap[tx.date].cardIn += tx.incomeBreakdown.card || 0;
        }
      } else {
        if (tx.expenseSource === ExpenseSource.SHOP_CASH) dayMap[tx.date].shopOut += tx.amount || 0;
        else if (tx.expenseSource === ExpenseSource.WALLET) dayMap[tx.date].walletOut += tx.amount || 0;
        else if (tx.expenseSource === ExpenseSource.CARD) dayMap[tx.date].cardOut += tx.amount || 0;
      }
    });
    return Object.entries(dayMap).map(([date, data]: any) => ({
      date, day: date.split('-')[2], ...data,
      netHandover: data.cashIn - data.shopOut
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [monthTransactions]);

  const currentBranchName = useMemo(() => {
    if (isSystemView) return t('all_branches');
    return allowedBranches.find(b => b.id === currentBranchId)?.name || '---';
  }, [currentBranchId, allowedBranches, isSystemView, t]);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 border dark:border-slate-800 shadow-sm flex items-center justify-between">
        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m - 2);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
        }} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl active:scale-90 transition-transform"><ChevronLeft className="w-5 h-5" /></button>
        
        <div className="text-center">
          <span className="text-sm font-black dark:text-white uppercase tracking-tight">{currentMonth.split('-')[1]} / {currentMonth.split('-')[0]}</span>
          <div 
            onClick={isAdmin ? onToggleGlobal : undefined}
            className={`flex items-center justify-center gap-1 mt-0.5 group ${isAdmin ? 'cursor-pointer active:scale-95 transition-all' : ''}`}
          >
             <p className={`text-[8px] font-black uppercase tracking-widest ${isSystemView ? 'text-indigo-500' : 'text-slate-400 group-hover:text-indigo-500'}`}>
               {currentBranchName}
             </p>
             {isAdmin && <RefreshCcw className="w-2 h-2 text-indigo-400 opacity-0 group-hover:opacity-100" />}
          </div>
        </div>

        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
        }} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl active:scale-90 transition-transform"><ChevronRight className="w-5 h-5" /></button>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-200/50 dark:bg-slate-950 rounded-[1.5rem] border dark:border-slate-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'OVERVIEW', label: t('tab_monthly'), icon: Layers },
          { id: 'DAILY_REPORT', label: t('daily_report'), icon: Activity },
          { id: 'GENERAL_BALANCE', label: t('system_total'), icon: LayoutDashboard },
          { id: 'LIABILITIES', label: t('liabilities'), icon: AlertCircle }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3.5 px-4 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shrink-0 ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg' : 'text-slate-500'}`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="bg-slate-900 dark:bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
             <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">{t('revenue_month')}</p>
             <h2 className="text-5xl font-black tracking-tighter mb-4">{formatCurrency(stats.totalIn, lang)}</h2>
             <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl inline-flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black uppercase">Margin: {(stats.margin * 100).toFixed(1)}%</span>
             </div>
             <TrendingUp className="w-48 h-48 opacity-10 absolute -right-8 -bottom-8 pointer-events-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border dark:border-slate-800 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">{t('profit')}</p>
                <p className={`text-2xl font-black ${stats.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(stats.profit, lang)}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border dark:border-slate-800 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">{t('total_out')}</p>
                <p className="text-2xl font-black text-rose-500">{formatCurrency(stats.totalOut, lang)}</p>
             </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border dark:border-slate-800 shadow-sm space-y-6">
             <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><BarChart3 className="w-4 h-4" /> {t('top_expense')}</h3>
             {stats.topCategories.map(cat => (
               <div key={cat.name} className="space-y-2">
                  <div className="flex justify-between items-end"><span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase">{cat.name}</span><span className="text-xs font-black dark:text-white">{formatCurrency(cat.value, lang)}</span></div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${cat.percentage}%` }} /></div>
               </div>
             ))}
          </div>
        </div>
      )}

      {activeTab === 'GENERAL_BALANCE' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border dark:border-slate-800 shadow-sm relative overflow-hidden text-center">
            <div className="grid grid-cols-2 gap-4 mb-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{t('cash_wallet')}</span>
                <p className={`text-xl font-black tracking-tight ${balances.cash < 0 ? 'text-rose-500' : 'dark:text-white'}`}>{formatCurrency(balances.cash, lang)}</p>
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{t('bank_card')}</span>
                <p className="text-xl font-black dark:text-white tracking-tight">{formatCurrency(balances.card, lang)}</p>
              </div>
            </div>
            
            <div className="pt-10 border-t dark:border-slate-800">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{t('assets_available')}</p>
              <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-6">{formatCurrency(balances.total, lang)}</h2>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'DAILY_REPORT' && (
        <div className="space-y-4 animate-in slide-in-from-right-4">
           {dailyData.slice().reverse().map(d => (
             <div key={d.date} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center font-black">
                         <span className="text-2xl leading-none">{d.day}</span>
                         <span className="text-[8px] uppercase">{new Date(d.date).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'de-DE', {weekday: 'short'})}</span>
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('income')}</p>
                         <p className="text-xl font-black dark:text-white tracking-tight">{formatCurrency(d.revenue, lang)}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">{t('handover_cash')}</p>
                      <p className="text-2xl font-black text-emerald-500 tracking-tighter leading-none">{formatCurrency(d.netHandover, lang)}</p>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'LIABILITIES' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4">
           <div className="bg-rose-500 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden text-center">
              <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">{t('debt_total')}</p>
              <h2 className="text-4xl font-black tracking-tighter">{formatCurrency(stats.totalDebt, lang)}</h2>
           </div>
           <div className="space-y-3">
              {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).map(t_tx => (
                <div key={t_tx.id} className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] border dark:border-slate-800 flex items-center justify-between shadow-sm">
                   <div>
                      <p className="text-base font-black uppercase dark:text-white leading-tight">{t_tx.debtorName || 'N/A'}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">{t_tx.date} • {t_tx.category}</p>
                   </div>
                   <p className="text-xl font-black text-rose-500">{formatCurrency(t_tx.amount, lang)}</p>
                </div>
              ))}
              {stats.totalDebt === 0 && (
                <p className="text-center py-10 text-slate-400 text-[10px] font-black uppercase">{t('no_data')}</p>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
