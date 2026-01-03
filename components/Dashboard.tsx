
import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, formatCurrency, Language, Branch, UserRole, ReportSettings, ExpenseSource, ALL_BRANCHES_ID } from '../types';
import { useTranslation } from '../i18n';
import { 
  AlertCircle, Layers, ChevronLeft, ChevronRight, 
  Wallet, Activity, 
  Target,
  Loader2,
  Building2, LayoutGrid,
  Coins, CreditCard, Store, Banknote, Receipt, Calculator
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  initialBalances: { cash: number; card: number };
  lang: Language;
  currentBranchId: string;
  allowedBranches: Branch[];
  userRole?: UserRole;
  reportSettings: ReportSettings;
}

type DashboardTab = 'OVERVIEW' | 'DAILY_REPORT' | 'WALLET_STATS' | 'LIABILITIES';

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  lang, 
  currentBranchId, 
  allowedBranches, 
  reportSettings,
}) => {
  const { t, translateCategory } = useTranslation(lang);
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  
  const [activeTab, setActiveTab] = useState<DashboardTab>('OVERVIEW');
  const isSystemView = currentBranchId === ALL_BRANCHES_ID;
  const activeBranchIds = new Set(allowedBranches.map(b => b.id));

  const activeBranchesList = useMemo(() => {
    if (isSystemView) return allowedBranches;
    return allowedBranches.filter(b => b.id === currentBranchId);
  }, [allowedBranches, currentBranchId, isSystemView]);

  const branchTransactions = useMemo(() => {
    const filtered = transactions.filter(tx => !tx.deletedAt && activeBranchIds.has(tx.branchId));
    if (isSystemView) return filtered;
    return filtered.filter(tx => tx.branchId === currentBranchId);
  }, [transactions, isSystemView, currentBranchId, activeBranchIds]);

  const monthTransactions = useMemo(() => {
    return branchTransactions.filter(tx => tx.date.startsWith(currentMonth));
  }, [branchTransactions, currentMonth]);

  const stats = useMemo(() => {
    let totalIn = 0, totalOut = 0, totalDebt = 0;
    let cashIn = 0, cardIn = 0, appIn = 0, coinsIn = 0;
    monthTransactions.forEach(tx => {
      const amount = tx.amount || 0;
      if (tx.type === TransactionType.INCOME) {
        totalIn += amount;
        if (tx.incomeBreakdown) {
          cashIn += tx.incomeBreakdown.cash || 0;
          cardIn += tx.incomeBreakdown.card || 0;
          appIn += tx.incomeBreakdown.delivery || 0;
          coinsIn += tx.incomeBreakdown.coins || 0;
        }
      } else {
        totalOut += amount;
        if (tx.isPaid === false) totalDebt += amount;
      }
    });
    const profit = totalIn - totalOut;
    return { totalIn, totalOut, totalDebt, profit, breakdown: { cashIn, cardIn, appIn, coinsIn } };
  }, [monthTransactions]);

  const dailyData = useMemo(() => {
    const dayBranchMap: Record<string, any> = {};
    
    monthTransactions.forEach(tx => {
      const key = `${tx.date}_${tx.branchId}`;
      if (!dayBranchMap[key]) {
        dayBranchMap[key] = { 
          date: tx.date,
          branchId: tx.branchId,
          revenue: 0, 
          cashIn: 0, 
          cardIn: 0, 
          appIn: 0, 
          totalOut: 0, 
          shopOut: 0, 
          walletOut: 0,
          cardOut: 0,
          coinsIn: 0 
        };
      }
      
      const data = dayBranchMap[key];
      if (tx.type === TransactionType.INCOME) {
        data.revenue += tx.amount || 0;
        if (tx.incomeBreakdown) {
          // cashIn trong incomeBreakdown đã lưu (Kasse + App - Thẻ) từ lúc nhập liệu
          data.cashIn += tx.incomeBreakdown.cash || 0; 
          data.cardIn += tx.incomeBreakdown.card || 0;
          data.appIn += tx.incomeBreakdown.delivery || 0;
          data.coinsIn += tx.incomeBreakdown.coins || 0;
        }
      } else {
        data.totalOut += tx.amount || 0;
        if (tx.expenseSource === ExpenseSource.SHOP_CASH) {
          data.shopOut += tx.amount || 0;
        } else if (tx.expenseSource === ExpenseSource.WALLET) {
          data.walletOut += tx.amount || 0;
        } else if (tx.expenseSource === ExpenseSource.CARD) {
          data.cardOut += tx.amount || 0;
        }
      }
    });

    return Object.values(dayBranchMap).map((data: any) => {
      const branchInfo = allowedBranches.find(b => b.id === data.branchId);
      
      // TIỀN BÀN GIAO CHUẨN: (Tiền mặt thực tế) - (Chi tại quán)
      // data.cashIn = (Kasse + App - Thẻ)
      const netHandover = data.cashIn - data.shopOut;

      return {
        ...data,
        day: data.date.split('-')[2],
        branchName: branchInfo?.name || '---',
        branchColor: branchInfo?.color || '#4f46e5',
        netHandover: netHandover,
        // Tổng Kasse Shop = Doanh thu hệ thống - Tiền App
        kasseTotal: data.revenue - data.appIn 
      };
    }).sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return a.branchName.localeCompare(b.branchName);
    });
  }, [monthTransactions, allowedBranches]);

  const balances = useMemo(() => {
    const startCash = activeBranchesList.reduce((sum, b) => sum + (b.initialCash || 0), 0);
    const startCard = activeBranchesList.reduce((sum, b) => sum + (b.initialCard || 0), 0);
    let cumulativeCashIn = 0, cumulativeCardIn = 0, cumulativeCashOut = 0, cumulativeCardOut = 0;
    
    branchTransactions.forEach(tx => {
      if (tx.type === TransactionType.INCOME) {
        if (tx.incomeBreakdown) {
          cumulativeCashIn += tx.incomeBreakdown.cash || 0;
          cumulativeCardIn += tx.incomeBreakdown.card || 0;
        } else {
          cumulativeCashIn += tx.amount || 0;
        }
      } else if (tx.type === TransactionType.EXPENSE) {
        if (tx.expenseSource === ExpenseSource.SHOP_CASH || tx.expenseSource === ExpenseSource.WALLET) {
          cumulativeCashOut += tx.amount || 0;
        } 
        else if (tx.expenseSource === ExpenseSource.CARD) {
          cumulativeCardOut += tx.amount || 0;
        }
      }
    });

    const currentCash = startCash + cumulativeCashIn - cumulativeCashOut;
    const currentCard = startCard + cumulativeCardIn - cumulativeCardOut;
    return { cash: currentCash, card: currentCard, total: currentCash + currentCard };
  }, [branchTransactions, activeBranchesList]);

  const currentBranchName = useMemo(() => {
    if (isSystemView) return t('all_branches');
    return allowedBranches.find(b => b.id === currentBranchId)?.name || '---';
  }, [currentBranchId, allowedBranches, isSystemView, t]);

  const currentBranchColor = useMemo(() => {
    if (isSystemView) return '#4f46e5';
    return allowedBranches.find(b => b.id === currentBranchId)?.color || '#4f46e5';
  }, [currentBranchId, allowedBranches, isSystemView]);

  const tabs: { id: DashboardTab; label: string; icon: any }[] = [
    { id: 'OVERVIEW', label: t('overview_tab'), icon: Layers },
    { id: 'DAILY_REPORT', label: t('daily_tab'), icon: Activity },
    { id: 'WALLET_STATS', label: isSystemView ? t('branch_tab') : t('wallet_tab'), icon: isSystemView ? Building2 : Wallet },
    { id: 'LIABILITIES', label: t('liabilities_tab'), icon: AlertCircle }
  ];

  return (
    <div className="space-y-6 pb-32 animate-ios max-w-2xl mx-auto px-1">
      {/* Selector Tháng */}
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2.5rem] p-4 border border-white dark:border-slate-800 shadow-soft flex items-center justify-between">
        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m - 2);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
        }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 active-scale transition-all"><ChevronLeft className="w-6 h-6" /></button>
        <div className="text-center px-4 flex-1">
          <span className="text-sm font-extrabold dark:text-white uppercase tracking-tight leading-none">{currentMonth.split('-')[1]} / {currentMonth.split('-')[0]}</span>
          <div className="flex items-center justify-center gap-2 mt-2">
             <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: currentBranchColor }} />
             <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{currentBranchName}</p>
          </div>
        </div>
        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
        }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 active-scale transition-all"><ChevronRight className="w-6 h-6" /></button>
      </div>

      {/* Điều hướng Tab */}
      <div className="flex gap-2 p-1.5 bg-slate-200/40 dark:bg-slate-950/40 rounded-[1.8rem] border border-white/40 dark:border-slate-800/50 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)} 
            className={`flex-1 py-3 px-2 rounded-[1.4rem] text-[11px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-sm border border-white dark:border-slate-700' : 'text-slate-500 dark:text-slate-500'}`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-ios">
          <div className="rounded-[3rem] p-10 text-white shadow-vivid relative overflow-hidden transition-all duration-1000" style={{ backgroundColor: currentBranchColor }}>
             <div className="relative z-10">
               <div className="flex justify-between items-start mb-8">
                 <div>
                   <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">{t('revenue_month')}</p>
                   <h2 className="text-5xl font-black tracking-tighter leading-none">
                     {reportSettings.showSystemTotal ? formatCurrency(stats.totalIn, lang) : '••••••'}
                   </h2>
                 </div>
                 <div className="w-16 h-16 bg-white/20 rounded-[1.8rem] flex items-center justify-center border border-white/20 backdrop-blur-md shadow-lg">
                    {isSystemView ? <LayoutGrid className="w-8 h-8" /> : <Target className="w-8 h-8" />}
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-4">
                 <div className="p-4 bg-white/10 rounded-[1.5rem] border border-white/10 backdrop-blur-md">
                   <p className="text-[10px] font-black uppercase opacity-70 mb-1">{t('profit')}</p>
                   <p className="text-base font-black">{reportSettings.showProfit ? formatCurrency(stats.profit, lang) : '•••'}</p>
                 </div>
                 <div className="p-4 bg-white/10 rounded-[1.5rem] border border-white/10 backdrop-blur-md">
                   <p className="text-[10px] font-black uppercase opacity-70 mb-1">Tiền Xu</p>
                   <p className="text-base font-black">{formatCurrency(stats.breakdown.coinsIn, lang)}</p>
                 </div>
                 <div className="p-4 bg-white/10 rounded-[1.5rem] border border-white/10 backdrop-blur-md">
                   <p className="text-[10px] font-black uppercase opacity-70 mb-1">{t('liabilities_tab')}</p>
                   <p className="text-base font-black text-rose-200">{formatCurrency(stats.totalDebt, lang)}</p>
                 </div>
               </div>
             </div>
          </div>

          <div className="bg-white/95 dark:bg-slate-900/90 rounded-[2.5rem] p-8 border border-white dark:border-slate-800 shadow-ios space-y-6">
             <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest flex items-center gap-3">
                <Target className="w-5 h-5 text-emerald-500" /> {t('revenue_source')}
             </h3>
             <div className="space-y-5">
                {[
                  { key: 'showShopRevenue', label: 'Doanh thu Shop (Kasse)', val: stats.totalIn - stats.breakdown.appIn, color: 'bg-emerald-500' },
                  { key: 'showCardRevenue', label: 'Quẹt thẻ / Bank', val: stats.breakdown.cardIn, color: 'bg-indigo-500' },
                  { key: 'showAppRevenue', label: 'Delivery App', val: stats.breakdown.appIn, color: 'bg-orange-500' }
                ].map(item => (
                  <div key={item.key} className={`space-y-3 ${(reportSettings as any)[item.key] ? 'opacity-100' : 'opacity-30 blur-[0.5px]'}`}>
                     <div className="flex justify-between items-end">
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tight">{item.label}</span>
                        <span className="text-xs font-black dark:text-white">{(reportSettings as any)[item.key] ? formatCurrency(item.val, lang) : '•••'}</span>
                     </div>
                     <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${stats.totalIn > 0 ? (item.val / stats.totalIn) * 100 : 0}%` }} />
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'DAILY_REPORT' && (
        <div className="space-y-4 animate-ios">
           {dailyData.map((d) => (
             <div key={`${d.date}_${d.branchId}`} className="bg-white/95 dark:bg-slate-900/90 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-ios overflow-hidden transition-all hover:shadow-premium group">
                <div className="px-6 py-6 bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
                   <div className="flex items-center gap-5 min-w-0">
                      <div className="w-14 h-14 bg-slate-900 dark:bg-slate-800 text-white rounded-[1.4rem] flex flex-col items-center justify-center shrink-0 shadow-sm border border-slate-700 group-hover:scale-105 transition-transform">
                         <span className="text-xl font-black leading-none">{d.day}</span>
                         <span className="text-[9px] uppercase tracking-tighter opacity-70 font-black">{t('date')}</span>
                      </div>
                      <div className="min-w-0">
                         <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: d.branchColor }}>
                            {d.branchName}
                         </p>
                         <p className="text-xl font-extrabold dark:text-white uppercase tracking-tighter truncate leading-tight">
                           {reportSettings.showSystemTotal ? formatCurrency(d.revenue, lang) : '••••'}
                         </p>
                      </div>
                   </div>
                   
                   {/* Ô BÀN GIAO - THIẾT KẾ CHUẨN SCREENSHOT */}
                   <div className="text-right shrink-0 bg-[#e8fbf3] dark:bg-emerald-950/30 p-5 px-6 rounded-[2.2rem] border border-[#c3f0dc] dark:border-emerald-800/50 min-w-[145px] flex flex-col items-center justify-center shadow-sm">
                      <p className="text-2xl font-black text-[#00a86b] dark:text-emerald-400 tracking-tighter leading-none">
                        {reportSettings.showActualCash ? formatCurrency(d.netHandover, lang).replace('€', '').trim() : '•••'} <span className="text-lg ml-0.5">€</span>
                      </p>
                      <p className="text-[11px] font-black text-[#00a86b] dark:text-emerald-500 uppercase tracking-[0.2em] mt-2.5">BÀN GIAO</p>
                   </div>
                </div>

                <div className="px-6 py-6 bg-white/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800/50">
                   <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                      {/* Chi tiết thu tiền mặt */}
                      <div className="space-y-3">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Calculator className="w-3 h-3 text-brand-500" /> Thành phần Tiền mặt</p>
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Kasse Shop</span>
                            <span className="text-[11px] font-black dark:text-white">{formatCurrency(d.kasseTotal, lang)}</span>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Tiền App</span>
                            <span className="text-[11px] font-black text-emerald-600">+{formatCurrency(d.appIn, lang)}</span>
                         </div>
                         <div className="flex items-center justify-between pl-4 opacity-50">
                            <div className="flex items-center gap-2.5">
                               <CreditCard className="w-3 h-3 text-indigo-500" />
                               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Trừ Thẻ</span>
                            </div>
                            <span className="text-[10px] font-black text-rose-600">-{formatCurrency(d.cardIn, lang)}</span>
                         </div>
                         <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/40 px-2 py-2 rounded-xl">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Tiền mặt thực tế</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">{formatCurrency(d.cashIn, lang)}</span>
                         </div>
                      </div>

                      {/* Chi phí tại quán */}
                      <div className="space-y-3 border-l border-slate-100 dark:border-slate-800/50 pl-8">
                         <p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-2"><Receipt className="w-3 h-3" /> Chi tại quán</p>
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                               <Store className="w-3.5 h-3.5 text-rose-500" />
                               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Tổng chi quán</span>
                            </div>
                            <span className="text-[11px] font-black text-rose-600">-{formatCurrency(d.shopOut, lang)}</span>
                         </div>
                         <div className="flex items-center justify-between opacity-60">
                            <div className="flex items-center gap-2.5">
                               <Wallet className="w-3.5 h-3.5 text-brand-500" />
                               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Chi ví tổng</span>
                            </div>
                            <span className="text-[11px] font-black dark:text-white">{formatCurrency(d.walletOut, lang)}</span>
                         </div>
                         <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 flex flex-col gap-1">
                            <p className="text-[8px] font-bold text-slate-400 italic">Công thức Bàn giao:</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none">(Thực tế) - (Chi quán)</p>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
           ))}
           {dailyData.length === 0 && (
             <div className="py-20 text-center opacity-40 flex flex-col items-center gap-4"><Loader2 className="w-12 h-12" /><p className="text-sm font-black uppercase tracking-widest">{t('no_data')}</p></div>
           )}
        </div>
      )}

      {/* ... Các tab khác giữ nguyên ... */}
      {activeTab === 'WALLET_STATS' && (
        <div className="animate-ios">
          <div className="bg-white/95 dark:bg-slate-900/90 rounded-[3rem] p-10 border border-white dark:border-slate-800 shadow-ios text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: currentBranchColor }} />
             <div className="w-20 h-20 rounded-[2.2rem] flex items-center justify-center mb-8 mx-auto shadow-vivid" style={{ backgroundColor: currentBranchColor }}>
               <Wallet className="w-10 h-10 text-white" />
             </div>
             <div className="space-y-2 mb-10">
               <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em]">{t('assets_available')}</p>
               <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">{formatCurrency(balances.total, lang)}</h2>
             </div>
             <div className="grid grid-cols-2 gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-[1.8rem] border border-slate-100 dark:border-slate-700/50">
                   <span className="text-[10px] font-black text-slate-500 uppercase block mb-1 tracking-tight">{t('cash_wallet')}</span>
                   <p className="text-base font-black dark:text-white">{formatCurrency(balances.cash, lang)}</p>
                </div>
                <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-[1.8rem] border border-slate-100 dark:border-slate-700/50">
                   <span className="text-[10px] font-black text-slate-500 uppercase block mb-1 tracking-tight">{t('bank_card')}</span>
                   <p className="text-base font-black dark:text-white">{formatCurrency(balances.card, lang)}</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'LIABILITIES' && (
        <div className="space-y-6 animate-ios">
           <div className="bg-rose-500 rounded-[2.5rem] p-10 text-white shadow-vivid text-center relative overflow-hidden">
              <p className="text-xs font-black uppercase opacity-70 mb-3 tracking-[0.2em]">{t('debt_total')}</p>
              <h2 className="text-5xl font-black tracking-tighter">{formatCurrency(stats.totalDebt, lang)}</h2>
              <AlertCircle className="w-24 h-24 absolute -bottom-8 -left-8 opacity-10" />
           </div>
           <div className="space-y-4 pt-2">
              <h3 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest px-4">{t('liabilities_list')}</h3>
              {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).map(t_tx => (
                <div key={t_tx.id} className="bg-white/95 dark:bg-slate-900/90 px-7 py-5 rounded-[1.8rem] border border-white dark:border-slate-800 flex items-center justify-between shadow-soft group">
                   <div className="min-w-0 pr-4">
                      <p className="text-sm font-black uppercase dark:text-white truncate group-hover:text-rose-500 transition-colors">{t_tx.debtorName || translateCategory(t_tx.category)}</p>
                      <div className="flex items-center gap-4 mt-2">
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Activity className="w-3 h-3" /> {t_tx.date}</span>
                      </div>
                   </div>
                   <p className="text-base font-black text-rose-600 dark:text-rose-400 shrink-0 tracking-tight">{formatCurrency(t_tx.amount, lang)}</p>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
