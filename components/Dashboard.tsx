
import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip as RechartsTooltip, Cell, AreaChart, Area, CartesianGrid, PieChart as RechartPie, Pie
} from 'recharts';
import { Transaction, TransactionType, formatCurrency, Language, Branch, UserRole, ReportSettings, ExpenseSource, ALL_BRANCHES_ID, EXPENSE_SOURCE_LABELS } from '../types';
import { useTranslation } from '../i18n';
import { analyzeFinances } from '../services/geminiService';
import { 
  AlertCircle, TrendingUp, Layers, ChevronLeft, ChevronRight, 
  Wallet, Banknote, CreditCard, Activity, 
  BarChart3, Zap, RefreshCcw,
  Smartphone, Receipt, PieChart, Target,
  FileSpreadsheet, Loader2, ArrowUpRight, ArrowDownRight,
  Calendar, Check, Info, ArrowRight, Sparkles, BrainCircuit,
  Building2, ArrowRightLeft, LayoutGrid, Award
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
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DAILY_REPORT' | 'BRANCH_COMPARE' | 'LIABILITIES'>('OVERVIEW');
  const [isExporting, setIsExporting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isSystemView = currentBranchId === ALL_BRANCHES_ID;
  const activeBranchIds = useMemo(() => new Set(allowedBranches.map(b => b.id)), [allowedBranches]);

  const branchTransactions = useMemo(() => {
    const filtered = transactions.filter(tx => !tx.deletedAt && activeBranchIds.has(tx.branchId));
    if (isSystemView) return filtered;
    return filtered.filter(tx => tx.branchId === currentBranchId);
  }, [transactions, isSystemView, currentBranchId, activeBranchIds]);

  const monthTransactions = useMemo(() => {
    return branchTransactions.filter(tx => tx.date.startsWith(currentMonth));
  }, [branchTransactions, currentMonth]);

  const branchPerformance = useMemo(() => {
    if (!isSystemView) return [];
    const branchMap: Record<string, { revenue: number, profit: number, name: string }> = {};
    allowedBranches.forEach(b => {
      branchMap[b.id] = { revenue: 0, profit: 0, name: b.name };
    });
    monthTransactions.forEach(tx => {
      if (!branchMap[tx.branchId]) return;
      if (tx.type === TransactionType.INCOME) {
        branchMap[tx.branchId].revenue += tx.amount;
        branchMap[tx.branchId].profit += tx.amount;
      } else {
        branchMap[tx.branchId].profit -= tx.amount;
      }
    });
    return Object.entries(branchMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [monthTransactions, allowedBranches, isSystemView]);

  const stats = useMemo(() => {
    let totalIn = 0, totalOut = 0, totalDebt = 0;
    let cashIn = 0, cardIn = 0, appIn = 0;
    const categoryMap: Record<string, number> = {};
    monthTransactions.forEach(tx => {
      if (!activeBranchIds.has(tx.branchId)) return;
      const amount = tx.amount || 0;
      if (tx.type === TransactionType.INCOME) {
        totalIn += amount;
        if (tx.incomeBreakdown) {
          cashIn += tx.incomeBreakdown.cash || 0;
          cardIn += tx.incomeBreakdown.card || 0;
          appIn += tx.incomeBreakdown.delivery || 0;
        }
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
    return { totalIn, totalOut, totalDebt, profit, margin, topCategories, breakdown: { cashIn, cardIn, appIn } };
  }, [monthTransactions, activeBranchIds]);

  const dailyData = useMemo(() => {
    const dayMap: Record<string, any> = {};
    monthTransactions.forEach(tx => {
      if (!activeBranchIds.has(tx.branchId)) return;
      if (!dayMap[tx.date]) dayMap[tx.date] = { revenue: 0, cashIn: 0, cardIn: 0, appIn: 0, totalOut: 0, shopOut: 0, walletOut: 0, cardOut: 0, branchCount: new Set() };
      dayMap[tx.date].branchCount.add(tx.branchId);
      if (tx.type === TransactionType.INCOME) {
        dayMap[tx.date].revenue += tx.amount || 0;
        if (tx.incomeBreakdown) {
          dayMap[tx.date].cashIn += tx.incomeBreakdown.cash || 0;
          dayMap[tx.date].cardIn += tx.incomeBreakdown.card || 0;
          dayMap[tx.date].appIn += tx.incomeBreakdown.delivery || 0;
        }
      } else {
        dayMap[tx.date].totalOut += tx.amount || 0;
        if (tx.expenseSource === ExpenseSource.SHOP_CASH) dayMap[tx.date].shopOut += tx.amount || 0;
        else if (tx.expenseSource === ExpenseSource.WALLET) dayMap[tx.date].walletOut += tx.amount || 0;
        else if (tx.expenseSource === ExpenseSource.CARD) dayMap[tx.date].cardOut += tx.amount || 0;
      }
    });
    return Object.entries(dayMap).map(([date, data]: any) => ({
      date, day: date.split('-')[2], ...data, activeBranches: data.branchCount.size, netHandover: data.cashIn - data.shopOut
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [monthTransactions, activeBranchIds]);

  const balances = useMemo(() => {
    let cumulativeCashIn = 0, cumulativeCardIn = 0, cumulativeCashOut = 0, cumulativeCardOut = 0;
    branchTransactions.forEach(tx => {
      if (tx.type === TransactionType.INCOME) {
        if (tx.incomeBreakdown) {
          cumulativeCashIn += tx.incomeBreakdown.cash || 0;
          cumulativeCardIn += tx.incomeBreakdown.card || 0;
        } else cumulativeCashIn += tx.amount || 0;
      } else if (tx.type === TransactionType.EXPENSE) {
        if (tx.expenseSource === ExpenseSource.SHOP_CASH || tx.expenseSource === ExpenseSource.WALLET) cumulativeCashOut += tx.amount || 0;
        else if (tx.expenseSource === ExpenseSource.CARD) cumulativeCardOut += tx.amount || 0;
      }
    });
    const currentCash = initialBalances.cash + cumulativeCashIn - cumulativeCashOut;
    const currentCard = initialBalances.card + cumulativeCardIn - cumulativeCardOut;
    return { cash: currentCash, card: currentCard, total: currentCash + currentCard };
  }, [branchTransactions, initialBalances]);

  const currentBranchName = useMemo(() => {
    if (isSystemView) return t('all_branches');
    return allowedBranches.find(b => b.id === currentBranchId)?.name || '---';
  }, [currentBranchId, allowedBranches, isSystemView, t]);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeFinances(stats, lang);
      setAiAnalysis(result);
    } catch (e) { console.error(e); } finally { setIsAnalyzing(false); }
  };

  const handleExportDashboard = () => {
    if (monthTransactions.length === 0) { alert(t('export_empty')); return; }
    setIsExporting(true);
    setTimeout(() => {
      try {
        const getBName = (id: string) => allowedBranches.find(b => b.id === id)?.name || 'N/A';
        const dailySheetData = dailyData.map(d => ({
          'Ngày': d.date, 'Chi nhánh': isSystemView ? `Hệ thống (${d.activeBranches})` : currentBranchName, 'Doanh thu (€)': d.revenue,
          'Bar (€)': d.cashIn, 'Card (€)': d.cardIn, 'App (€)': d.appIn,
          'Chi (€)': d.shopOut, 'Bàn giao (€)': d.netHandover
        }));
        const expenseSheetData = monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE).map(tx => ({
          'Ngày': tx.date, 'Chi nhánh': getBName(tx.branchId), 'Danh mục': tx.category,
          'Số tiền (€)': tx.amount, 'Nguồn': tx.expenseSource ? EXPENSE_SOURCE_LABELS[tx.expenseSource] : (tx.isPaid === false ? 'Công nợ' : 'Khác'),
          'Ghi chú': tx.note || ''
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailySheetData), "Revenue");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseSheetData), "Expenses");
        XLSX.writeFile(wb, `Tokymon_Report_${currentMonth}.xlsx`);
      } catch (e) { alert("Error!"); } finally { setIsExporting(false); }
    }, 500);
  };

  return (
    <div className="space-y-4 pb-28 animate-ios max-w-2xl mx-auto px-1">
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl p-2 border border-white/20 dark:border-slate-800 shadow-ios flex items-center justify-between">
        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m - 2);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
          setAiAnalysis(null);
        }} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 active-scale transition-all"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-center px-4 flex-1">
          <span className="text-[11px] font-black dark:text-white uppercase tracking-tighter">{currentMonth.split('-')[1]} / {currentMonth.split('-')[0]}</span>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
             <div className={`w-1.5 h-1.5 rounded-full ${isSystemView ? 'bg-indigo-500 animate-pulse' : 'bg-brand-500'}`} />
             <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{currentBranchName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
           <button onClick={handleExportDashboard} disabled={isExporting} className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-2xl text-emerald-500 active-scale transition-all">
             {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
           </button>
           <button onClick={() => {
             const [y, m] = currentMonth.split('-').map(Number);
             const d = new Date(y, m);
             setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
             setAiAnalysis(null);
           }} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 active-scale transition-all"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex gap-1.5 p-1 bg-slate-200/30 dark:bg-slate-950/40 rounded-3xl border border-white/20 dark:border-slate-800/50 overflow-x-auto no-scrollbar">
        {[
          { id: 'OVERVIEW', label: t('overview_tab'), icon: Layers },
          { id: 'DAILY_REPORT', label: t('daily_tab'), icon: Activity },
          { id: 'BRANCH_COMPARE', label: isSystemView ? t('branch_tab') : t('wallet_tab'), icon: isSystemView ? Building2 : Wallet },
          { id: 'LIABILITIES', label: t('liabilities_tab'), icon: AlertCircle }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-2.5 rounded-[1.2rem] text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-sm' : 'text-slate-400 opacity-60'}`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-4 animate-ios">
          <div className={`${isSystemView ? 'bg-indigo-600' : 'bg-slate-900'} rounded-4xl p-6 text-white shadow-vivid relative overflow-hidden`}>
             <div className="relative z-10">
               <div className="flex justify-between items-start mb-5">
                 <div>
                   <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60">{isSystemView ? t('all_branches') : t('revenue_month')}</p>
                   <h2 className="text-3xl font-black tracking-tighter leading-none">
                     {reportSettings.showSystemTotal ? formatCurrency(stats.totalIn, lang) : '••••••'}
                   </h2>
                 </div>
                 <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-sm">
                    {isSystemView ? <LayoutGrid className="w-4.5 h-4.5" /> : <Target className="w-4.5 h-4.5" />}
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-2">
                 <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[7px] font-black uppercase opacity-60 mb-0.5">{t('profit')}</p>
                   <p className="text-xs font-black">{reportSettings.showProfit ? formatCurrency(stats.profit, lang) : '•••'}</p>
                 </div>
                 <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[7px] font-black uppercase opacity-60 mb-0.5">{t('margin')}</p>
                   <p className="text-xs font-black">{(stats.margin * 100).toFixed(1)}%</p>
                 </div>
                 <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[7px] font-black uppercase opacity-60 mb-0.5">{t('liabilities_tab')}</p>
                   <p className="text-xs font-black text-rose-300">{formatCurrency(stats.totalDebt, lang)}</p>
                 </div>
               </div>
             </div>
             {isSystemView && <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl" />}
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-4xl border border-brand-100 dark:border-brand-900/20 overflow-hidden shadow-soft">
             <div className="px-5 py-3.5 bg-brand-50/50 dark:bg-brand-900/10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-brand-600 text-white rounded-xl flex items-center justify-center shadow-lg"><BrainCircuit className="w-4 h-4" /></div>
                   <h3 className="text-[10px] font-black uppercase dark:text-white tracking-tighter">{t('ai_analysis_title')}</h3>
                </div>
                {!aiAnalysis && !isAnalyzing && (
                   <button onClick={handleAiAnalysis} className="px-3 py-1.5 bg-brand-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 active-scale transition-all">
                     <RefreshCcw className="w-3 h-3" /> {t('ai_btn')}
                   </button>
                )}
             </div>
             <div className="p-5 min-h-[80px] flex items-center justify-center">
                {isAnalyzing ? (
                   <div className="flex flex-col items-center gap-3 py-2">
                      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                      <p className="text-[9px] font-black text-brand-500 uppercase tracking-widest animate-pulse">{t('ai_scanning_text')}</p>
                   </div>
                ) : aiAnalysis ? (
                   <div className="prose prose-sm dark:prose-invert w-full">
                      <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed space-y-3" dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }} />
                   </div>
                ) : (
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">{t('ai_hint')}</p>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white/90 dark:bg-slate-900/90 rounded-4xl p-5 border border-white/20 dark:border-slate-800 shadow-ios space-y-4">
                <h3 className="text-[8px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                   <Target className="w-3 h-3 text-emerald-500" /> {t('revenue_source')}
                </h3>
                <div className="space-y-3">
                   {[
                     { key: 'showShopRevenue', label: 'Bar / Shop', val: stats.breakdown.cashIn, color: 'bg-emerald-500' },
                     { key: 'showCardRevenue', label: 'Card / Bank', val: stats.breakdown.cardIn, color: 'bg-indigo-500' },
                     { key: 'showAppRevenue', label: 'Delivery App', val: stats.breakdown.appIn, color: 'bg-orange-500' }
                   ].map(item => (
                     <div key={item.key} className={`space-y-1.5 ${(reportSettings as any)[item.key] ? 'opacity-100' : 'opacity-30 blur-[1px]'}`}>
                        <div className="flex justify-between items-end">
                           <span className="text-[8px] font-black text-slate-500 uppercase">{item.label}</span>
                           <span className="text-[9px] font-black dark:text-white">{(reportSettings as any)[item.key] ? formatCurrency(item.val, lang) : '•••'}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-950 rounded-full overflow-hidden">
                           <div className={`h-full ${item.color} rounded-full`} style={{ width: `${stats.totalIn > 0 ? (item.val / stats.totalIn) * 100 : 0}%` }} />
                        </div>
                     </div>
                   ))}
                </div>
             </div>
             <div className="bg-white/90 dark:bg-slate-900/90 rounded-4xl p-5 border border-white/20 dark:border-slate-800 shadow-ios space-y-4">
                <h3 className="text-[8px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                   <Zap className="w-3 h-3 text-rose-500" /> {t('top_categories')}
                </h3>
                <div className="space-y-3">
                  {stats.topCategories.map(cat => (
                    <div key={cat.name} className="space-y-1.5">
                       <div className="flex justify-between items-end">
                         <span className="text-[8px] font-black text-slate-600 dark:text-slate-300 uppercase truncate max-w-[90px]">{cat.name}</span>
                         <span className="text-[9px] font-black dark:text-white">{formatCurrency(cat.value, lang)}</span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-950 rounded-full overflow-hidden">
                         <div className="h-full bg-rose-500 rounded-full" style={{ width: `${cat.percentage}%` }} />
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'DAILY_REPORT' && (
        <div className="space-y-3 animate-ios">
           {dailyData.map(d => (
             <div key={d.date} className="bg-white/90 dark:bg-slate-900/90 rounded-3xl border border-white/20 dark:border-slate-800 shadow-ios overflow-hidden">
                <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
                   <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-slate-900 dark:bg-slate-800 text-white rounded-xl flex flex-col items-center justify-center shrink-0">
                         <span className="text-base font-black leading-none">{d.day}</span>
                         <span className="text-[6px] uppercase tracking-tighter opacity-50 font-black">{t('date')}</span>
                      </div>
                      <div className="min-w-0">
                         <p className="text-base font-black dark:text-white uppercase tracking-tighter truncate leading-tight">
                           {reportSettings.showSystemTotal ? formatCurrency(d.revenue, lang) : '••••'}
                         </p>
                         <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate">
                            {isSystemView ? `${t('branch_tab')} (${d.activeBranches})` : t('total')}
                         </p>
                      </div>
                   </div>
                   <div className="text-right shrink-0">
                      <p className="text-base font-black text-brand-600 dark:text-brand-400 leading-none">
                        {reportSettings.showActualCash ? formatCurrency(d.netHandover, lang) : '•••'}
                      </p>
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{t('handover_label')}</p>
                   </div>
                </div>
                <div className="px-5 py-2.5 flex flex-wrap gap-x-4 gap-y-1 bg-white/50 dark:bg-slate-950/30 border-t border-white/20 dark:border-slate-800/50">
                   <div className={`flex items-center gap-1.5 ${reportSettings.showShopRevenue ? 'opacity-100' : 'opacity-20'}`}>
                      <div className="w-1 h-1 rounded-full bg-emerald-500" />
                      <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase">Bar: {reportSettings.showShopRevenue ? formatCurrency(d.cashIn, lang) : '••'}</span>
                   </div>
                   <div className={`flex items-center gap-1.5 ${reportSettings.showCardRevenue ? 'opacity-100' : 'opacity-20'}`}>
                      <div className="w-1 h-1 rounded-full bg-indigo-500" />
                      <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase">Card: {reportSettings.showCardRevenue ? formatCurrency(d.cardIn, lang) : '••'}</span>
                   </div>
                   <div className={`flex items-center gap-1.5 ${reportSettings.showAppRevenue ? 'opacity-100' : 'opacity-20'}`}>
                      <div className="w-1 h-1 rounded-full bg-orange-500" />
                      <span className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase">App: {reportSettings.showAppRevenue ? formatCurrency(d.appIn, lang) : '••'}</span>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'BRANCH_COMPARE' && isSystemView && (
        <div className="space-y-4 animate-ios">
           <div className="bg-white/90 dark:bg-slate-900/90 rounded-4xl p-5 border border-white/20 dark:border-slate-800 shadow-ios">
              <h3 className="text-[10px] font-black uppercase dark:text-white mb-5 flex items-center gap-2">
                 <Award className="w-4 h-4 text-brand-500" /> {t('ranking')}
              </h3>
              <div className="space-y-3">
                 {branchPerformance.map((bp, index) => (
                   <div key={bp.id} className="relative p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border dark:border-slate-800 flex items-center justify-between group overflow-hidden">
                      <div className="min-w-0 pr-4">
                         <h4 className="text-[10px] font-black uppercase dark:text-white truncate mb-1">{bp.name}</h4>
                         <div className="flex gap-4">
                            <div><p className="text-[6px] font-black text-slate-400 uppercase">{t('income')}</p><p className="text-[10px] font-black text-brand-600">{formatCurrency(bp.revenue, lang)}</p></div>
                            <div><p className="text-[6px] font-black text-slate-400 uppercase">{t('profit')}</p><p className={`text-[10px] font-black ${bp.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(bp.profit, lang)}</p></div>
                         </div>
                      </div>
                      <div className="text-right shrink-0">
                         <div className="text-xl font-black dark:text-white opacity-10">#{index + 1}</div>
                         <div className="h-1.5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full mt-0.5 overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(bp.revenue / (branchPerformance[0]?.revenue || 1)) * 100}%` }} />
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'BRANCH_COMPARE' && !isSystemView && (
        <div className="animate-ios">
          <div className="bg-white/90 dark:bg-slate-900/90 rounded-4xl p-8 border border-white/20 dark:border-slate-800 shadow-ios text-center">
             <div className="w-14 h-14 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-3xl flex items-center justify-center mb-5 mx-auto shadow-sm">
               <Wallet className="w-7 h-7" />
             </div>
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t('assets_available')}</p>
             <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-8">{formatCurrency(balances.total, lang)}</h2>
             <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-50 dark:border-slate-800">
                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                   <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">{t('cash_wallet')}</span>
                   <p className="text-sm font-black dark:text-white">{formatCurrency(balances.cash, lang)}</p>
                </div>
                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100/50 dark:border-slate-700/50">
                   <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">{t('bank_card')}</span>
                   <p className="text-sm font-black dark:text-white">{formatCurrency(balances.card, lang)}</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'LIABILITIES' && (
        <div className="space-y-4 animate-ios">
           <div className="bg-rose-500 rounded-4xl p-8 text-white shadow-vivid text-center">
              <p className="text-[9px] font-black uppercase opacity-70 mb-1.5 tracking-widest">{t('debt_total')}</p>
              <h2 className="text-3xl font-black tracking-tighter">{formatCurrency(stats.totalDebt, lang)}</h2>
           </div>
           <div className="space-y-2.5">
              {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).map(t_tx => (
                <div key={t_tx.id} className="bg-white/90 dark:bg-slate-900/90 px-5 py-3.5 rounded-3xl border border-white/20 dark:border-slate-800 flex items-center justify-between shadow-ios">
                   <div className="min-w-0 pr-4">
                      <p className="text-[10px] font-black uppercase dark:text-white truncate">{t_tx.debtorName || t_tx.category}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                         {isSystemView && <span className="text-[6px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded uppercase">{allowedBranches.find(b => b.id === t_tx.branchId)?.name}</span>}
                         <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{t_tx.date}</span>
                      </div>
                   </div>
                   <p className="text-sm font-black text-rose-500 shrink-0">{formatCurrency(t_tx.amount, lang)}</p>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
