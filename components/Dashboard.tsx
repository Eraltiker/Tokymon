
import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip as RechartsTooltip, Cell, AreaChart, Area, CartesianGrid 
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
  Calendar, Check, Info, ArrowRight, Sparkles, BrainCircuit
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
  const [isExporting, setIsExporting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isSystemView = currentBranchId === ALL_BRANCHES_ID;

  const branchTransactions = useMemo(() => {
    if (isSystemView) return transactions.filter(tx => !tx.deletedAt);
    return transactions.filter(tx => tx.branchId === currentBranchId && !tx.deletedAt);
  }, [transactions, isSystemView, currentBranchId]);

  const monthTransactions = useMemo(() => {
    return branchTransactions.filter(tx => tx.date.startsWith(currentMonth));
  }, [branchTransactions, currentMonth]);

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
      if (!dayMap[tx.date]) dayMap[tx.date] = { revenue: 0, cashIn: 0, cardIn: 0, appIn: 0, totalOut: 0, shopOut: 0, walletOut: 0, cardOut: 0 };
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
      date, 
      day: date.split('-')[2], 
      ...data,
      netHandover: data.cashIn - data.shopOut
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

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeFinances(stats, lang);
      setAiAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportDashboard = () => {
    if (monthTransactions.length === 0) { alert(t('export_empty')); return; }
    setIsExporting(true);
    setTimeout(() => {
      try {
        const getBName = (id: string) => allowedBranches.find(b => b.id === id)?.name || 'N/A';
        const dailySheetData = dailyData.map(d => ({
          'Ngày': d.date, 'Chi nhánh': currentBranchName, 'Doanh thu (€)': d.revenue,
          'Bar (€)': d.cashIn, 'Card (€)': d.cardIn, 'App (€)': d.appIn,
          'Chi (€)': d.shopOut, 'Bàn giao (€)': d.netHandover
        }));
        const expenseSheetData = monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE).map(tx => ({
          'Ngày': tx.date, 'Chi nhánh': getBName(tx.branchId), 'Danh mục': tx.category,
          'Số tiền (€)': tx.amount, 'Nguồn': tx.expenseSource ? EXPENSE_SOURCE_LABELS[tx.expenseSource] : (tx.isPaid === false ? 'Công nợ' : 'Khác'),
          'Ghi chú': tx.note || ''
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailySheetData), "Doanh Thu Ngày");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseSheetData), "Chi Phí");
        XLSX.writeFile(wb, `Tokymon_Report_${currentMonth}.xlsx`);
      } catch (e) { alert("Lỗi xuất file!"); } finally { setIsExporting(false); }
    }, 500);
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in duration-500 max-w-2xl mx-auto px-1">
      {/* Date Navigator */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-2 border border-slate-100 dark:border-slate-800 shadow-soft flex items-center justify-between">
        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m - 2);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
          setAiAnalysis(null);
        }} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl active:scale-95 transition-all text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
        
        <div className="text-center px-4 flex-1">
          <span className="text-xs font-black dark:text-white uppercase tracking-tighter">{currentMonth.split('-')[1]} / {currentMonth.split('-')[0]}</span>
          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{currentBranchName}</p>
        </div>

        <div className="flex items-center gap-1">
           <button onClick={handleExportDashboard} disabled={isExporting} className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-2xl text-emerald-500">
             {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
           </button>
           <button onClick={() => {
             const [y, m] = currentMonth.split('-').map(Number);
             const d = new Date(y, m);
             setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
             setAiAnalysis(null);
           }} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl active:scale-95 transition-all text-slate-400"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1.5 p-1.5 bg-slate-200/40 dark:bg-slate-950 rounded-[1.8rem] border border-slate-200/50 dark:border-slate-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'OVERVIEW', label: 'T.Quan', icon: Layers },
          { id: 'DAILY_REPORT', label: 'Ngày', icon: Activity },
          { id: 'GENERAL_BALANCE', label: 'Tiền', icon: PieChart },
          { id: 'LIABILITIES', label: 'Nợ', icon: AlertCircle }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 rounded-[1.4rem] text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400 opacity-60'}`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-400">
          {/* Main Financial Card */}
          <div className="bg-slate-900 dark:bg-indigo-600 rounded-4xl p-7 text-white shadow-vivid relative overflow-hidden">
             <div className="relative z-10">
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Doanh thu tháng này</p>
                   <h2 className="text-4xl font-black tracking-tighter leading-none">
                     {reportSettings.showSystemTotal ? formatCurrency(stats.totalIn, lang) : '••••••'}
                   </h2>
                 </div>
                 <div className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-sm">
                    <Target className="w-5 h-5" />
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-2.5">
                 <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[7px] font-black uppercase opacity-60 tracking-widest mb-1">Lợi nhuận</p>
                   <p className="text-sm font-black tracking-tight">{reportSettings.showProfit ? formatCurrency(stats.profit, lang) : '•••'}</p>
                 </div>
                 <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[7px] font-black uppercase opacity-60 tracking-widest mb-1">Tỷ lệ</p>
                   <p className="text-sm font-black tracking-tight">{(stats.margin * 100).toFixed(1)}%</p>
                 </div>
                 <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[7px] font-black uppercase opacity-60 tracking-widest mb-1">Nợ NCC</p>
                   <p className="text-sm font-black tracking-tight text-rose-300">{formatCurrency(stats.totalDebt, lang)}</p>
                 </div>
               </div>
             </div>
          </div>

          {/* AI Insights Card */}
          <div className="bg-white dark:bg-slate-900 rounded-4xl border-2 border-indigo-100 dark:border-indigo-900/30 overflow-hidden shadow-soft relative transition-all">
             <div className="px-6 py-4 bg-indigo-50/50 dark:bg-indigo-900/10 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                   <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                      <Sparkles className="w-4.5 h-4.5" />
                   </div>
                   <h3 className="text-xs font-black uppercase dark:text-white tracking-tighter">AI Financial Insights</h3>
                </div>
                {!aiAnalysis && !isAnalyzing && (
                   <button 
                     onClick={handleAiAnalysis}
                     className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                   >
                     <BrainCircuit className="w-3.5 h-3.5" /> Phân tích
                   </button>
                )}
             </div>
             
             <div className="p-6">
                {isAnalyzing ? (
                   <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="relative">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                        <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                      </div>
                      <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] animate-pulse">Đang nghiên cứu dữ liệu...</p>
                   </div>
                ) : aiAnalysis ? (
                   <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed space-y-4" dangerouslySetInnerHTML={{ 
                        __html: aiAnalysis
                          .replace(/\n/g, '<br/>')
                          .replace(/\* \*\*(.*?)\*\*/g, '<strong class="text-indigo-600 dark:text-indigo-400">$1</strong>')
                          .replace(/\* (.*?)/g, '<div class="flex gap-2"><span class="text-indigo-500">•</span> <span>$1</span></div>') 
                      }} />
                      <button 
                         onClick={() => setAiAnalysis(null)}
                         className="mt-6 text-[9px] font-black uppercase text-slate-400 hover:text-indigo-500 flex items-center gap-2 transition-colors"
                      >
                         <RefreshCcw className="w-3.5 h-3.5" /> Phân tích lại
                      </button>
                   </div>
                ) : (
                   <div className="py-4 text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        Hãy để Gemini phân tích biến động lợi nhuận <br/> và đưa ra lời khuyên tối ưu cho Tokymon.
                      </p>
                   </div>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white dark:bg-slate-900 rounded-4xl p-5 border border-slate-100 dark:border-slate-800 shadow-soft space-y-4">
                <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                   <TrendingUp className="w-3 h-3 text-emerald-500" /> Nguồn thu nhập
                </h3>
                <div className="space-y-3.5">
                   {[
                     { key: 'showShopRevenue', label: 'Bar / Shop', val: stats.breakdown.cashIn, color: 'bg-emerald-500' },
                     { key: 'showCardRevenue', label: 'Card / Bank', val: stats.breakdown.cardIn, color: 'bg-indigo-500' },
                     { key: 'showAppRevenue', label: 'Delivery App', val: stats.breakdown.appIn, color: 'bg-orange-500' }
                   ].map(item => (
                     <div key={item.key} className={`space-y-1.5 ${(reportSettings as any)[item.key] ? 'opacity-100' : 'opacity-30 blur-[1px]'}`}>
                        <div className="flex justify-between items-end">
                           <span className="text-[9px] font-black text-slate-500 uppercase">{item.label}</span>
                           <span className="text-[10px] font-black dark:text-white">{(reportSettings as any)[item.key] ? formatCurrency(item.val, lang) : '•••'}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-950 rounded-full overflow-hidden">
                           <div className={`h-full ${item.color} rounded-full`} style={{ width: `${stats.totalIn > 0 ? (item.val / stats.totalIn) * 100 : 0}%` }} />
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="bg-white dark:bg-slate-900 rounded-4xl p-5 border border-slate-100 dark:border-slate-800 shadow-soft space-y-4">
                <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                   <Zap className="w-3 h-3 text-rose-500" /> Top Chi Phí
                </h3>
                <div className="space-y-3.5">
                  {stats.topCategories.map(cat => (
                    <div key={cat.name} className="space-y-1.5">
                       <div className="flex justify-between items-end">
                         <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase truncate max-w-[100px]">{cat.name}</span>
                         <span className="text-[10px] font-black dark:text-white">{formatCurrency(cat.value, lang)}</span>
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
        <div className="space-y-3 animate-in slide-in-from-right-2 duration-400">
           {dailyData.map(d => (
             <div key={d.date} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden">
                <div className="px-5 py-4 bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
                   <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl flex flex-col items-center justify-center shrink-0 border border-white/5">
                         <span className="text-lg font-black leading-none">{d.day}</span>
                         <span className="text-[7px] uppercase tracking-tighter opacity-50 font-black">Ngày</span>
                      </div>
                      <div className="min-w-0">
                         <p className="text-base font-black dark:text-white uppercase tracking-tighter truncate">
                           {reportSettings.showSystemTotal ? formatCurrency(d.revenue, lang) : '••••'}
                         </p>
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tổng doanh thu</p>
                      </div>
                   </div>
                   <div className="text-right shrink-0">
                      <p className="text-base font-black text-indigo-600 dark:text-indigo-400 leading-none">
                        {reportSettings.showActualCash ? formatCurrency(d.netHandover, lang) : '•••'}
                      </p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Về ví quán</p>
                   </div>
                </div>
                {/* Daily Details Grid */}
                <div className="px-5 py-3 flex flex-wrap gap-x-5 gap-y-2 bg-white dark:bg-slate-950 border-t border-slate-50 dark:border-slate-800/50">
                   <div className={`flex items-center gap-2 min-w-[80px] ${reportSettings.showShopRevenue ? 'opacity-100' : 'opacity-20'}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Bar: {reportSettings.showShopRevenue ? formatCurrency(d.cashIn, lang) : '••'}</span>
                   </div>
                   <div className={`flex items-center gap-2 min-w-[80px] ${reportSettings.showCardRevenue ? 'opacity-100' : 'opacity-20'}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Thẻ: {reportSettings.showCardRevenue ? formatCurrency(d.cardIn, lang) : '••'}</span>
                   </div>
                   <div className={`flex items-center gap-2 min-w-[80px] ${reportSettings.showAppRevenue ? 'opacity-100' : 'opacity-20'}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter">App: {reportSettings.showAppRevenue ? formatCurrency(d.appIn, lang) : '••'}</span>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'GENERAL_BALANCE' && (
        <div className="animate-in slide-in-from-left-2 duration-400">
          <div className="bg-white dark:bg-slate-900 rounded-4xl p-8 border border-slate-100 dark:border-slate-800 shadow-soft text-center">
             <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mb-5 mx-auto shadow-sm">
               <Wallet className="w-8 h-8" />
             </div>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tài sản hiện có</p>
             <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-8">{formatCurrency(balances.total, lang)}</h2>
             
             <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-50 dark:border-slate-800">
                <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100/50 dark:border-slate-700/50">
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Ví tiền mặt</span>
                   <p className="text-base font-black dark:text-white">{formatCurrency(balances.cash, lang)}</p>
                </div>
                <div className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100/50 dark:border-slate-700/50">
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Bank / Thẻ</span>
                   <p className="text-base font-black dark:text-white">{formatCurrency(balances.card, lang)}</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'LIABILITIES' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-400">
           <div className="bg-rose-500 dark:bg-rose-600 rounded-4xl p-8 text-white shadow-vivid text-center">
              <p className="text-[9px] font-black uppercase opacity-70 mb-1.5 tracking-widest">Nợ nhà cung cấp chưa trả</p>
              <h2 className="text-4xl font-black tracking-tighter">{formatCurrency(stats.totalDebt, lang)}</h2>
           </div>
           
           <div className="space-y-3">
              {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).map(t_tx => (
                <div key={t_tx.id} className="bg-white dark:bg-slate-900 px-5 py-4.5 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-soft">
                   <div className="min-w-0 pr-4">
                      <p className="text-xs font-black uppercase dark:text-white truncate">{t_tx.debtorName || 'Nhà cung cấp'}</p>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5 block">{t_tx.date} • {t_tx.category}</span>
                   </div>
                   <p className="text-base font-black text-rose-500 dark:text-rose-400 shrink-0">{formatCurrency(t_tx.amount, lang)}</p>
                </div>
              ))}
              {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).length === 0 && (
                <div className="py-16 text-center opacity-30">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">Không có nợ tồn đọng</p>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
