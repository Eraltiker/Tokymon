
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
    const branchMap: Record<string, { revenue: number, profit: number, name: string, color: string }> = {};
    allowedBranches.forEach(b => {
      branchMap[b.id] = { revenue: 0, profit: 0, name: b.name, color: b.color || '#4f46e5' };
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
  }, [monthTransactions]);

  const dailyData = useMemo(() => {
    const dayMap: Record<string, any> = {};
    monthTransactions.forEach(tx => {
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
  }, [monthTransactions]);

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

  const currentBranchColor = useMemo(() => {
    if (isSystemView) return '#4f46e5';
    return allowedBranches.find(b => b.id === currentBranchId)?.color || '#4f46e5';
  }, [currentBranchId, allowedBranches, isSystemView]);

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
        const dailySheetData = dailyData.map(d => ({
          'Ngày': d.date, 'Doanh thu (€)': d.revenue, 'Bar (€)': d.cashIn, 'Card (€)': d.cardIn, 'App (€)': d.appIn, 'Chi (€)': d.shopOut, 'Bàn giao (€)': d.netHandover
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailySheetData), "Revenue");
        XLSX.writeFile(wb, `Tokymon_Report_${currentMonth}.xlsx`);
      } catch (e) { alert("Error!"); } finally { setIsExporting(false); }
    }, 500);
  };

  return (
    <div className="space-y-6 pb-32 animate-ios max-w-2xl mx-auto px-1">
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2.5rem] p-4 border border-white dark:border-slate-800 shadow-soft flex items-center justify-between">
        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m - 2);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
          setAiAnalysis(null);
        }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 active-scale transition-all border border-slate-200 dark:border-slate-700"><ChevronLeft className="w-6 h-6" /></button>
        <div className="text-center px-4 flex-1">
          <span className="text-sm font-extrabold dark:text-white uppercase tracking-tight leading-none">{currentMonth.split('-')[1]} / {currentMonth.split('-')[0]}</span>
          <div className="flex items-center justify-center gap-2 mt-2">
             <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: currentBranchColor }} />
             <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{currentBranchName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={handleExportDashboard} disabled={isExporting} className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600 border border-emerald-100 dark:border-emerald-900/30 active-scale transition-all">
             {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
           </button>
           <button onClick={() => {
             const [y, m] = currentMonth.split('-').map(Number);
             const d = new Date(y, m);
             setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
             setAiAnalysis(null);
           }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 active-scale transition-all border border-slate-200 dark:border-slate-700"><ChevronRight className="w-6 h-6" /></button>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-slate-200/40 dark:bg-slate-950/40 rounded-[1.8rem] border border-white/40 dark:border-slate-800/50 overflow-x-auto no-scrollbar">
        {[
          { id: 'OVERVIEW', label: t('overview_tab'), icon: Layers },
          { id: 'DAILY_REPORT', label: t('daily_tab'), icon: Activity },
          { id: 'BRANCH_COMPARE', label: isSystemView ? t('branch_tab') : t('wallet_tab'), icon: isSystemView ? Building2 : Wallet },
          { id: 'LIABILITIES', label: t('liabilities_tab'), icon: AlertCircle }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 px-2 rounded-[1.4rem] text-[11px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-sm border border-white dark:border-slate-700' : 'text-slate-500 dark:text-slate-500'}`}>
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
                   <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">{isSystemView ? t('all_branches') : t('revenue_month')}</p>
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
                   <p className="text-[10px] font-black uppercase opacity-70 mb-1">{t('margin')}</p>
                   <p className="text-base font-black">{(stats.margin * 100).toFixed(1)}%</p>
                 </div>
                 <div className="p-4 bg-white/10 rounded-[1.5rem] border border-white/10 backdrop-blur-md">
                   <p className="text-[10px] font-black uppercase opacity-70 mb-1">{t('liabilities_tab')}</p>
                   <p className="text-base font-black text-rose-200">{formatCurrency(stats.totalDebt, lang)}</p>
                 </div>
               </div>
             </div>
             <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-[80px]" />
          </div>

          <div className="bg-white/95 dark:bg-slate-900/90 rounded-[2.5rem] p-8 border border-white dark:border-slate-800 shadow-ios">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest flex items-center gap-3">
                   <BarChart3 className="w-5 h-5" style={{ color: currentBranchColor }} /> Biểu đồ doanh thu ngày
                </h3>
             </div>
             <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={currentBranchColor} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={currentBranchColor} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#64748b'}} interval="preserveStartEnd" />
                      <YAxis hide />
                      <RechartsTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[9px] font-black uppercase text-slate-400 mb-1">{payload[0].payload.date}</p>
                                <p className="text-xs font-black dark:text-white">{formatCurrency(payload[0].value as number, lang)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke={currentBranchColor} strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" isAnimationActive={false} />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm rounded-[2.5rem] border border-brand-100 dark:border-brand-900/20 overflow-hidden shadow-soft">
             <div className="px-6 py-5 bg-brand-50/50 dark:bg-brand-900/10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl flex items-center justify-center shadow-vivid" style={{ backgroundColor: currentBranchColor }}><BrainCircuit className="w-6 h-6" /></div>
                   <div>
                     <h3 className="text-xs font-black uppercase dark:text-white tracking-tight">{t('ai_analysis_title')}</h3>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Powered by Gemini 3</p>
                   </div>
                </div>
                {!aiAnalysis && !isAnalyzing && (
                   <button onClick={handleAiAnalysis} className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active-scale shadow-vivid" style={{ backgroundColor: currentBranchColor }}>
                     <Sparkles className="w-4 h-4 fill-white" /> {t('ai_btn')}
                   </button>
                )}
             </div>
             <div className="p-8">
                {isAnalyzing ? (
                   <div className="flex flex-col items-center gap-5 py-6">
                      <div className="relative">
                        <Loader2 className="w-12 h-12 text-brand-500 animate-spin" style={{ color: currentBranchColor }} />
                        <BrainCircuit className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ color: currentBranchColor }} />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] animate-pulse" style={{ color: currentBranchColor }}>{t('ai_scanning_text')}</p>
                   </div>
                ) : aiAnalysis ? (
                   <div className="prose prose-sm dark:prose-invert w-full">
                      <div className="text-[13px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed space-y-5" dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }} />
                   </div>
                ) : (
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center py-4">{t('ai_hint')}</p>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div className="bg-white/95 dark:bg-slate-900/90 rounded-[2.5rem] p-8 border border-white dark:border-slate-800 shadow-ios space-y-6">
                <h3 className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest flex items-center gap-3">
                   <Target className="w-5 h-5 text-emerald-500" /> {t('revenue_source')}
                </h3>
                <div className="space-y-5">
                   {[
                     { key: 'showShopRevenue', label: 'Bar / Shop', val: stats.breakdown.cashIn, color: 'bg-emerald-500' },
                     { key: 'showCardRevenue', label: 'Card / Bank', val: stats.breakdown.cardIn, color: 'bg-indigo-500' },
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
             <div className="bg-white/95 dark:bg-slate-900/90 rounded-[2.5rem] p-8 border border-white dark:border-slate-800 shadow-ios space-y-6">
                <h3 className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest flex items-center gap-3">
                   <Zap className="w-5 h-5 text-rose-500" /> {t('top_categories')}
                </h3>
                <div className="space-y-5">
                  {stats.topCategories.map(cat => (
                    <div key={cat.name} className="space-y-3">
                       <div className="flex justify-between items-end">
                         <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight truncate max-w-[120px]">{cat.name}</span>
                         <span className="text-xs font-black dark:text-white">{formatCurrency(cat.value, lang)}</span>
                       </div>
                       <div className="h-2 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                         <div className="h-full bg-rose-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${cat.percentage}%` }} />
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'DAILY_REPORT' && (
        <div className="space-y-4 animate-ios">
           {dailyData.slice().reverse().map(d => (
             <div key={d.date} className="bg-white/95 dark:bg-slate-900/90 rounded-[2rem] border border-white dark:border-slate-800 shadow-ios overflow-hidden group">
                <div className="px-6 py-5 bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
                   <div className="flex items-center gap-5 min-w-0">
                      <div className="w-14 h-14 bg-slate-900 dark:bg-slate-800 text-white rounded-[1.2rem] flex flex-col items-center justify-center shrink-0 shadow-sm border border-slate-700">
                         <span className="text-xl font-black leading-none">{d.day}</span>
                         <span className="text-[9px] uppercase tracking-tighter opacity-70 font-black">{t('date')}</span>
                      </div>
                      <div className="min-w-0">
                         <p className="text-xl font-extrabold dark:text-white uppercase tracking-tighter truncate leading-tight">
                           {reportSettings.showSystemTotal ? formatCurrency(d.revenue, lang) : '••••'}
                         </p>
                         <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">
                            {isSystemView ? `${t('branch_tab')} (${d.activeBranches})` : t('total')}
                         </p>
                      </div>
                   </div>
                   <div className="text-right shrink-0">
                      <p className="text-xl font-black text-brand-600 dark:text-brand-400 leading-none" style={{ color: currentBranchColor }}>
                        {reportSettings.showActualCash ? formatCurrency(d.netHandover, lang) : '•••'}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{t('handover_label')}</p>
                   </div>
                </div>
                <div className="px-6 py-4 flex flex-wrap gap-x-6 gap-y-2 bg-white/50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800/50">
                   <div className={`flex items-center gap-2.5 ${reportSettings.showShopRevenue ? 'opacity-100' : 'opacity-20'}`}>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase">Bar: {reportSettings.showShopRevenue ? formatCurrency(d.cashIn, lang) : '••'}</span>
                   </div>
                   <div className={`flex items-center gap-2.5 ${reportSettings.showCardRevenue ? 'opacity-100' : 'opacity-20'}`}>
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase">Card: {reportSettings.showCardRevenue ? formatCurrency(d.cardIn, lang) : '••'}</span>
                   </div>
                   <div className={`flex items-center gap-2.5 ${reportSettings.showAppRevenue ? 'opacity-100' : 'opacity-20'}`}>
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase">App: {reportSettings.showAppRevenue ? formatCurrency(d.appIn, lang) : '••'}</span>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'BRANCH_COMPARE' && isSystemView && (
        <div className="space-y-6 animate-ios">
           <div className="bg-white/95 dark:bg-slate-900/90 rounded-[2.5rem] p-8 border border-white dark:border-slate-800 shadow-ios">
              <h3 className="text-xs font-black uppercase dark:text-white mb-8 flex items-center gap-3 tracking-widest">
                 <BarChart3 className="w-5 h-5 text-indigo-500" /> So sánh doanh thu
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchPerformance} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} width={80} />
                    <RechartsTooltip cursor={{fill: 'transparent'}} content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800"><p className="text-xs font-black dark:text-white">{formatCurrency(payload[0].value as number, lang)}</p></div>;
                      }
                      return null;
                    }} />
                    <Bar dataKey="revenue" radius={[0, 8, 8, 0]} isAnimationActive={false}>
                       {branchPerformance.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-white/95 dark:bg-slate-900/90 rounded-[2.5rem] p-8 border border-white dark:border-slate-800 shadow-ios">
              <h3 className="text-xs font-black uppercase dark:text-white mb-8 flex items-center gap-3 tracking-widest">
                 <Award className="w-6 h-6 text-brand-500" /> {t('ranking')}
              </h3>
              <div className="space-y-4">
                 {branchPerformance.map((bp, index) => (
                   <div key={bp.id} className="relative p-6 bg-slate-50/50 dark:bg-slate-950/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between group overflow-hidden transition-all hover:bg-white dark:hover:bg-slate-900 shadow-sm">
                      <div className="absolute left-0 top-0 w-1.5 h-full" style={{ backgroundColor: bp.color }} />
                      <div className="min-w-0 pr-4">
                         <h4 className="text-sm font-black uppercase dark:text-white truncate mb-2">{bp.name}</h4>
                         <div className="flex gap-6">
                            <div><p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-tight">{t('income')}</p><p className="text-sm font-black text-brand-600 dark:text-brand-400" style={{ color: bp.color }}>{formatCurrency(bp.revenue, lang)}</p></div>
                            <div><p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-tight">{t('profit')}</p><p className={`text-sm font-black ${bp.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(bp.profit, lang)}</p></div>
                         </div>
                      </div>
                      <div className="text-right shrink-0">
                         <div className="text-2xl font-black dark:text-white opacity-10 italic">#{index + 1}</div>
                         <div className="h-2 w-24 bg-slate-200 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(bp.revenue / (branchPerformance[0]?.revenue || 1)) * 100}%`, backgroundColor: bp.color }} />
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
          <div className="bg-white/95 dark:bg-slate-900/90 rounded-[3rem] p-10 border border-white dark:border-slate-800 shadow-ios text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: currentBranchColor }} />
             <div className="w-20 h-20 rounded-[2.2rem] flex items-center justify-center mb-8 mx-auto shadow-vivid border-2 border-white dark:border-slate-800" style={{ backgroundColor: currentBranchColor }}>
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
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <p className="text-xs font-black uppercase opacity-70 mb-3 tracking-[0.2em]">{t('debt_total')}</p>
              <h2 className="text-5xl font-black tracking-tighter">{formatCurrency(stats.totalDebt, lang)}</h2>
              <AlertCircle className="w-24 h-24 absolute -bottom-8 -left-8 opacity-10" />
           </div>
           <div className="space-y-4 pt-2">
              <h3 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest px-4">Danh sách công nợ</h3>
              {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).map(t_tx => (
                <div key={t_tx.id} className="bg-white/95 dark:bg-slate-900/90 px-7 py-5 rounded-[1.8rem] border border-white dark:border-slate-800 flex items-center justify-between shadow-soft hover:shadow-md transition-shadow group">
                   <div className="min-w-0 pr-4">
                      <p className="text-sm font-black uppercase dark:text-white truncate group-hover:text-rose-500 transition-colors">{t_tx.debtorName || t_tx.category}</p>
                      <div className="flex items-center gap-4 mt-2">
                         {isSystemView && (
                           <span className="text-[8px] font-black px-2 py-1 text-white rounded-lg uppercase tracking-tight" style={{ backgroundColor: allowedBranches.find(b => b.id === t_tx.branchId)?.color || '#4f46e5' }}>
                             {allowedBranches.find(b => b.id === t_tx.branchId)?.name}
                           </span>
                         )}
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {t_tx.date}</span>
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
