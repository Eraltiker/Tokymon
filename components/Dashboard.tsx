
import React, { useMemo, useState } from 'react';
import { 
  Transaction, TransactionType, formatCurrency, Language, Branch, 
  UserRole, ReportSettings, ExpenseSource 
} from '../types';
import { useTranslation } from '../i18n';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Bar, ComposedChart, Area
} from 'recharts';
import { 
  ChevronLeft, ChevronRight, 
  Wallet, Activity, Loader2,
  TrendingUp,
  BarChart3,
  Zap, CreditCard,
  Sparkles, BrainCircuit,
  Landmark, Receipt, PiggyBank,
  Calculator,
  AlertCircle,
  ArrowDown,
  Info,
  Banknote,
  Search,
  User,
  Truck,
  ArrowRight,
  CheckCircle2,
  Edit3,
  CheckCircle,
  // Fix: Added Calendar icon to imports
  Calendar
} from 'lucide-react';
import { analyzeFinances } from '../services/geminiService';
import EditTransactionModal from './EditTransactionModal';

interface DashboardProps {
  transactions: Transaction[];
  initialBalances: { cash: number; card: number };
  lang: Language;
  currentBranchId: string;
  allowedBranches: Branch[];
  userRole?: UserRole;
  reportSettings: ReportSettings;
  onEditTransaction?: (tx: Transaction) => void;
  expenseCategories?: string[];
  currentUsername?: string;
}

type ReportPeriod = 'MONTH' | 'QUARTER' | 'YEAR';
type DashboardTab = 'OVERVIEW' | 'DAILY' | 'WALLET' | 'LIABILITIES';

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  lang, 
  currentBranchId, 
  allowedBranches,
  onEditTransaction,
  expenseCategories = [],
  currentUsername
}) => {
  const { t, translateCategory } = useTranslation(lang);
  const [activeTab, setActiveTab] = useState<DashboardTab>('OVERVIEW');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('MONTH');
  const [viewDate, setViewDate] = useState(new Date());
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const [debtSearch, setDebtSearch] = useState('');
  const [debtFilter, setDebtFilter] = useState<'ALL' | 'VENDOR' | 'STAFF'>('ALL');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const handlePrev = () => {
    const next = new Date(viewDate);
    if (reportPeriod === 'MONTH') next.setMonth(next.getMonth() - 1);
    else if (reportPeriod === 'QUARTER') next.setMonth(next.getMonth() - 3);
    else next.setFullYear(next.getFullYear() - 1);
    setViewDate(next);
    setAiAnalysis(null);
  };

  const handleNext = () => {
    const next = new Date(viewDate);
    if (reportPeriod === 'MONTH') next.setMonth(next.getMonth() + 1);
    else if (reportPeriod === 'QUARTER') next.setMonth(next.getMonth() + 3);
    else next.setFullYear(next.getFullYear() + 1);
    setViewDate(next);
    setAiAnalysis(null);
  };

  const periodLabel = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    if (reportPeriod === 'MONTH') return `${t('MONTH')} ${month} / ${year}`;
    if (reportPeriod === 'QUARTER') {
        const q = Math.ceil(month / 3);
        return `${t('QUARTER')} ${q} / ${year}`;
    }
    return `${t('YEAR')} ${year}`;
  }, [viewDate, reportPeriod, t]);

  const branchTransactions = useMemo(() => {
    return transactions.filter(tx => !tx.deletedAt && tx.branchId === currentBranchId);
  }, [transactions, currentBranchId]);

  const stats = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const q = Math.ceil((month + 1) / 3);

    const filtered = branchTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      if (reportPeriod === 'MONTH') return txDate.getFullYear() === year && txDate.getMonth() === month;
      if (reportPeriod === 'QUARTER') {
        const txQ = Math.ceil((txDate.getMonth() + 1) / 3);
        return txDate.getFullYear() === year && txQ === q;
      }
      return txDate.getFullYear() === year;
    });

    let totalRev = 0, totalExp = 0, cardSales = 0, appSales = 0, shopOut = 0, walletOut = 0, cardOut = 0;
    const groupMap: Record<string, any> = {};
    const catMap: Record<string, number> = {};

    filtered.forEach(tx => {
      const txDate = new Date(tx.date);
      const groupKey = reportPeriod === 'MONTH' ? tx.date : `${txDate.getFullYear()}-${(txDate.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!groupMap[groupKey]) groupMap[groupKey] = { total: 0, card: 0, app: 0, shopOut: 0, count: 0 };

      if (tx.type === TransactionType.INCOME) {
        totalRev += tx.amount;
        groupMap[groupKey].total += tx.amount;
        groupMap[groupKey].count += 1;
        if (tx.incomeBreakdown) {
          cardSales += tx.incomeBreakdown.card || 0;
          appSales += tx.incomeBreakdown.delivery || 0;
          groupMap[groupKey].card += tx.incomeBreakdown.card || 0;
          groupMap[groupKey].app += tx.incomeBreakdown.delivery || 0;
        }
      } else {
        totalExp += tx.amount;
        catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount;
        
        const isStaffAdvance = tx.category === 'Nợ / Tiền ứng';
        const isPaid = tx.isPaid !== false;
        
        if (isPaid || isStaffAdvance) {
          if (tx.expenseSource === ExpenseSource.SHOP_CASH) {
            shopOut += tx.amount;
            groupMap[groupKey].shopOut += tx.amount;
          }
          else if (tx.expenseSource === ExpenseSource.WALLET) walletOut += tx.amount;
          else if (tx.expenseSource === ExpenseSource.CARD) cardOut += tx.amount;
        }
      }
    });

    const profit = totalRev - totalExp;
    const margin = totalRev > 0 ? (profit / totalRev) * 100 : 0;
    const netCashInPeriod = (totalRev - cardSales - shopOut);

    const chartData = Object.entries(groupMap).map(([key, d]) => ({
      label: reportPeriod === 'MONTH' ? key.split('-')[2] : `T${key.split('-')[1]}`,
      revenue: d.total,
      cash: d.total - d.card - d.shopOut
    })).sort((a, b) => a.label.localeCompare(b.label));

    const pieData = Object.entries(catMap).map(([name, value]) => ({ name: translateCategory(name), value })).sort((a, b) => b.value - a.value);

    const dailyData: Record<string, any> = {};
    filtered.forEach(tx => {
      if (!dailyData[tx.date]) dailyData[tx.date] = { total: 0, card: 0, app: 0, shopOut: 0, expenses: [], author: '' };
      if (tx.type === TransactionType.INCOME) {
        dailyData[tx.date].total += tx.amount;
        dailyData[tx.date].author = tx.authorName || 'Unknown';
        if (tx.incomeBreakdown) {
          dailyData[tx.date].card += tx.incomeBreakdown.card || 0;
          dailyData[tx.date].app += tx.incomeBreakdown.delivery || 0;
        }
      } else if (tx.type === TransactionType.EXPENSE) {
         const isStaffAdvance = tx.category === 'Nợ / Tiền ứng';
         if ((tx.isPaid !== false || isStaffAdvance) && tx.expenseSource === ExpenseSource.SHOP_CASH) {
            dailyData[tx.date].shopOut += tx.amount;
            dailyData[tx.date].expenses.push(tx);
         }
      }
    });

    return { 
      totalRev, totalExp, profit, margin, netCashInPeriod, cardSales, appSales, shopOut, walletOut, cardOut,
      chartData, pieData, dailyAudit: Object.entries(dailyData).sort((a, b) => b[0].localeCompare(a[0]))
    };
  }, [branchTransactions, viewDate, reportPeriod, translateCategory]);

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeFinances({
        totalIn: stats.totalRev,
        totalOut: stats.totalExp,
        profit: stats.profit,
        margin: stats.margin / 100,
        totalDebt: totalRemainingDebt
      }, lang);
      setAiAnalysis(result);
    } catch (e) { setAiAnalysis("Lỗi dịch vụ phân tích."); } finally { setIsAnalyzing(false); }
  };

  const currentBranch = useMemo(() => allowedBranches.find(b => b.id === currentBranchId), [allowedBranches, currentBranchId]);
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

  const debtList = useMemo(() => {
    return branchTransactions.filter(tx => {
      const isDebt = tx.type === TransactionType.EXPENSE && tx.isPaid === false;
      if (!isDebt) return false;
      
      const searchLower = debtSearch.toLowerCase();
      const matchesSearch = 
        tx.debtorName?.toLowerCase().includes(searchLower) || 
        tx.notes?.some(n => n.toLowerCase().includes(searchLower)) ||
        tx.category.toLowerCase().includes(searchLower);

      if (debtFilter === 'VENDOR') return matchesSearch && tx.category !== 'Nợ / Tiền ứng';
      if (debtFilter === 'STAFF') return matchesSearch && tx.category === 'Nợ / Tiền ứng';
      
      return matchesSearch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [branchTransactions, debtSearch, debtFilter]);

  const totalRemainingDebt = useMemo(() => {
    return debtList.reduce((acc, tx) => acc + (tx.amount - (tx.paidAmount || 0)), 0);
  }, [debtList]);

  return (
    <div className="space-y-6 pb-40 animate-ios max-w-6xl mx-auto px-1 sm:px-4">
      
      <div className="flex p-1 bg-slate-200/40 dark:bg-slate-900/50 rounded-[2.5rem] border dark:border-slate-800/60 sticky top-20 z-50 backdrop-blur-xl shadow-sm">
        {[
          { id: 'OVERVIEW', label: t('overview_tab'), icon: BarChart3 },
          { id: 'DAILY', label: t('daily_tab'), icon: Activity },
          { id: 'WALLET', label: t('wallet_tab'), icon: Wallet },
          { id: 'LIABILITIES', label: t('liabilities_tab'), icon: AlertCircle },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3.5 px-2 rounded-[2.2rem] text-[9px] font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-premium' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <tab.icon className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-ios">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-[2.5rem] border dark:border-slate-800 shadow-sm">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border dark:border-slate-800 w-full md:w-fit">
              {(['MONTH', 'QUARTER', 'YEAR'] as ReportPeriod[]).map(p => (
                <button 
                  key={p} 
                  onClick={() => { setReportPeriod(p); setAiAnalysis(null); }}
                  className={`flex-1 md:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportPeriod === p ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500'}`}
                >
                  {t(p)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border dark:border-slate-800 self-center">
              <button onClick={handlePrev} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl active-scale shadow-sm text-slate-500"><ChevronLeft className="w-4 h-4" /></button>
              <div className="px-4 text-center min-w-[140px]">
                <span className="text-[10px] font-black dark:text-white uppercase tracking-widest">{periodLabel}</span>
              </div>
              <button onClick={handleNext} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl active-scale shadow-sm text-slate-500"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-5 rounded-[2.2rem] text-white shadow-vivid relative overflow-hidden group">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-1 leading-none">{t('paper_cash')}</p>
                <h3 className="text-xl sm:text-2xl font-black tracking-tighter leading-none">{formatCurrency(stats.totalRev, lang)}</h3>
             </div>
             <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.2rem] border dark:border-slate-800 shadow-ios">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{t('profit')}</p>
                <h3 className={`text-xl sm:text-2xl font-black tracking-tighter leading-none ${stats.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(stats.profit, lang)}</h3>
             </div>
             <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.2rem] border dark:border-slate-800 shadow-ios">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{t('handover_label')}</p>
                <h3 className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter leading-none">{formatCurrency(stats.netCashInPeriod, lang)}</h3>
             </div>
             <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.2rem] border dark:border-slate-800 shadow-ios">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{t('expense')}</p>
                <h3 className="text-xl sm:text-2xl font-black text-rose-500 tracking-tighter leading-none">{formatCurrency(stats.totalExp, lang)}</h3>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[3rem] border dark:border-slate-800 shadow-ios">
                <div className="flex justify-between items-center mb-10">
                   <h4 className="text-sm font-black uppercase tracking-tighter dark:text-white">{t('performance_analysis')}</h4>
                   <TrendingUp className="w-6 h-6 text-indigo-500 opacity-20" />
                </div>
                <div className="h-[280px] sm:h-[320px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={stats.chartData}>
                         <defs>
                           <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                             <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} />
                         <YAxis hide />
                         <RechartsTooltip 
                            contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 800, fontSize: '10px'}}
                            formatter={(val: number) => [formatCurrency(val, lang)]}
                         />
                         <Bar dataKey="revenue" fill="#e2e8f0" radius={[8, 8, 0, 0]} barSize={reportPeriod === 'MONTH' ? 10 : 25} />
                         <Area type="monotone" dataKey="cash" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                      </ComposedChart>
                   </ResponsiveContainer>
                </div>
             </div>
             
             <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[3rem] border dark:border-slate-800 shadow-ios">
                <h4 className="text-sm font-black uppercase tracking-tighter dark:text-white mb-10">{t('top_categories')}</h4>
                <div className="h-[200px] sm:h-[220px] relative">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={stats.pieData} innerRadius={60} outerRadius={80} paddingAngle={6} dataKey="value">
                            {stats.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                         </Pie>
                      </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] font-black text-slate-400 uppercase">{t('total')}</span>
                      <span className="text-xs font-black dark:text-white tracking-tighter">{formatCurrency(stats.totalExp, lang)}</span>
                   </div>
                </div>
                <div className="mt-8 space-y-2.5">
                   {stats.pieData.slice(0, 4).map((item, i) => (
                      <div key={i} className="flex justify-between items-center group">
                         <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-[9px] font-black text-slate-500 uppercase truncate max-w-[100px]">{item.name}</span>
                         </div>
                         <span className="text-[9px] font-black dark:text-white">{formatCurrency(item.value, lang)}</span>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-6 sm:p-8 text-white shadow-premium overflow-hidden relative">
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
             <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center shadow-lg"><BrainCircuit className="w-8 h-8 text-indigo-400" /></div>
                   <div>
                      <h4 className="text-lg sm:text-xl font-black uppercase tracking-tighter">{t('ai_analysis_title')}</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('ai_strategy_sub')}</p>
                   </div>
                </div>
                <button 
                   onClick={handleAIAnalysis}
                   disabled={isAnalyzing}
                   className="w-full md:w-fit px-8 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest active-scale shadow-lg flex items-center justify-center gap-3 transition-all hover:bg-indigo-50 disabled:opacity-50"
                >
                   {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> {t('ai_btn')}</>}
                </button>
             </div>
             {aiAnalysis && (
                <div className="mt-8 p-5 bg-white/5 rounded-2xl border border-white/10 animate-ios">
                   <div className="prose prose-sm prose-invert max-w-none text-[12px] leading-relaxed font-bold">
                      {aiAnalysis}
                   </div>
                </div>
             )}
          </div>
        </div>
      )}

      {activeTab === 'DAILY' && (
        <div className="space-y-6 animate-ios">
          {stats.dailyAudit.map(([date, d]: any) => {
            const dayParts = date.split('-');
            const cashExp = d.shopOut || 0;
            const expectedCashInHand = d.total - d.card; 
            const finalNetHandover = expectedCashInHand - cashExp; 
            
            return (
              <div key={date} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 shadow-premium overflow-hidden flex flex-col group transition-all hover:scale-[1.01] w-full">
                 <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                       <div className="flex flex-col items-center justify-center w-12 h-12 bg-white/10 rounded-2xl border border-white/20">
                          <span className="text-lg font-black leading-none">{dayParts[2]}</span>
                          <span className="text-[7px] font-black uppercase opacity-60">{t('month_label')} {dayParts[1]}</span>
                       </div>
                       <div>
                          <h4 className="text-xs font-black uppercase tracking-tight">{t('daily_audit_title')}</h4>
                          <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">#{date.replace(/-/g, '')}</p>
                       </div>
                    </div>
                    <div className="text-right hidden sm:block">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('active')}</p>
                       <p className="text-[10px] font-black uppercase">{d.author}</p>
                    </div>
                 </div>

                 <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-5">
                       <div className="flex items-center gap-3 border-b dark:border-slate-800 pb-3">
                          <Receipt className="w-4 h-4 text-indigo-500" />
                          <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('revenue_source')}</h5>
                       </div>
                       <div className="space-y-3.5">
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">{t('total')}:</span>
                             <span className="text-base font-black dark:text-white">{formatCurrency(d.total, lang)}</span>
                          </div>
                          <div className="flex justify-between items-center text-rose-500">
                             <div className="flex items-center gap-2">
                                <CreditCard className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase">{t('card_total')}:</span>
                             </div>
                             <span className="text-sm font-black">-{formatCurrency(d.card, lang)}</span>
                          </div>
                          <div className="flex justify-between items-center text-indigo-500">
                             <div className="flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase">{t('app_total')}:</span>
                             </div>
                             <span className="text-sm font-black">{formatCurrency(d.app, lang)}</span>
                          </div>
                          <div className="pt-3 border-t-2 border-dashed dark:border-slate-800 flex justify-between items-center">
                             <span className="text-[9px] font-black uppercase text-slate-400">{t('expected_pocket')}:</span>
                             <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(expectedCashInHand, lang)}</span>
                          </div>
                       </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-[2rem] border dark:border-slate-800 relative">
                       <div className="flex items-center gap-3 mb-5">
                          <Calculator className="w-4 h-4 text-emerald-500" />
                          <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('stats')}</h5>
                       </div>
                       <div className="space-y-3.5">
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">{t('expected_pocket')}:</span>
                             <span className="text-xs font-black dark:text-white">{formatCurrency(expectedCashInHand, lang)}</span>
                          </div>
                          <div className="flex justify-between items-center text-rose-500">
                             <div className="flex items-center gap-2">
                                <ArrowDown className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase">{t('expense')} {t('src_shop_cash')}:</span>
                             </div>
                             <span className="text-xs font-black">-{formatCurrency(cashExp, lang)}</span>
                          </div>
                          <div className="mt-5 p-4 bg-emerald-600 rounded-2xl text-white shadow-vivid text-center">
                             <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">{t('net_handover_title')}</p>
                             <h6 className="text-2xl font-black tracking-tighter">{formatCurrency(finalNetHandover, lang)}</h6>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="px-6 py-3.5 bg-slate-50/50 dark:bg-slate-950/20 border-t dark:border-slate-800 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-2 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[9px] font-black uppercase text-emerald-600">{t('tip_hint')}</span>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 italic">
                       <Info className="w-3 h-3" />
                       <span className="text-[8px] font-bold">{t('system_verified')}</span>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'WALLET' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-ios">
          <div className="bg-white/95 dark:bg-slate-900/90 rounded-[2.5rem] p-6 sm:p-8 border border-white dark:border-slate-800 shadow-ios relative overflow-hidden group">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-[1.2rem] flex items-center justify-center shadow-vivid"><Wallet className="w-6 h-6" /></div>
                <div>
                   <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter leading-none">{t('wallet_master')}</h2>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Hauptkasse</p>
                </div>
             </div>
             <div className="space-y-3.5 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border dark:border-slate-800">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400"><span>{t('opening_balance')}:</span><span>{formatCurrency(currentBranch?.initialCash || 0, lang)}</span></div>
                <div className="flex justify-between items-center text-emerald-600 text-[10px] font-black uppercase"><span>{t('handover_in')}:</span><span>+{formatCurrency(stats.netCashInPeriod, lang)}</span></div>
                <div className="flex justify-between items-center text-rose-500 text-[10px] font-black uppercase"><span>{t('withdrawal_out')}:</span><span>-{formatCurrency(stats.walletOut, lang)}</span></div>
                <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                <div className="text-center pt-2">
                   <p className="text-[9px] font-black uppercase text-slate-400 mb-1">{t('current_balance')}</p>
                   <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{formatCurrency((currentBranch?.initialCash || 0) + stats.netCashInPeriod - stats.walletOut, lang)}</p>
                </div>
             </div>
          </div>

          <div className="bg-white/95 dark:bg-slate-900/90 rounded-[2.5rem] p-6 sm:p-8 border border-white dark:border-slate-800 shadow-ios relative overflow-hidden group">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-[1.2rem] flex items-center justify-center shadow-vivid"><Landmark className="w-6 h-6" /></div>
                <div>
                   <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter leading-none">{t('bank_digital')}</h2>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Digital Flow</p>
                </div>
             </div>
             <div className="space-y-3.5 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border dark:border-slate-800">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400"><span>{t('opening_balance')}:</span><span>{formatCurrency(currentBranch?.initialCard || 0, lang)}</span></div>
                <div className="flex justify-between items-center text-emerald-600 text-[10px] font-black uppercase"><span>{t('card_total')} (+):</span><span>+{formatCurrency(stats.cardSales, lang)}</span></div>
                <div className="flex justify-between items-center text-rose-500 text-[10px] font-black uppercase"><span>{t('expense')} Bank (-):</span><span>-{formatCurrency(stats.cardOut, lang)}</span></div>
                <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
                <div className="text-center pt-2">
                   <p className="text-[9px] font-black uppercase text-slate-400 mb-1">{t('estimated_balance')}</p>
                   <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{formatCurrency((currentBranch?.initialCard || 0) + stats.cardSales - stats.cardOut, lang)}</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'LIABILITIES' && (
        <div className="space-y-6 animate-ios">
           <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-premium text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
              <p className="text-[10px] font-black uppercase opacity-60 mb-3 tracking-[0.3em]">{t('liabilities_list')}</p>
              <h2 className="text-5xl font-black tracking-tighter leading-none">{formatCurrency(totalRemainingDebt, lang)}</h2>
           </div>

           <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-[2.5rem] border dark:border-slate-800 shadow-sm space-y-4">
              <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                    type="text" 
                    value={debtSearch}
                    onChange={e => setDebtSearch(e.target.value)}
                    placeholder={t('placeholder_search')}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-2xl font-bold text-xs outline-none focus:border-indigo-500 transition-all"
                 />
              </div>
              <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border dark:border-slate-800">
                {(['ALL', 'VENDOR', 'STAFF'] as const).map(f => (
                  <button 
                    key={f} 
                    onClick={() => setDebtFilter(f)}
                    className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${debtFilter === f ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
                  >
                    {f === 'VENDOR' ? <Truck className="w-3.5 h-3.5" /> : f === 'STAFF' ? <User className="w-3.5 h-3.5" /> : null}
                    {f === 'VENDOR' ? t('debt_type_vendor') : f === 'STAFF' ? t('debt_type_staff') : t('all')}
                  </button>
                ))}
              </div>
           </div>
           
           <div className="grid grid-cols-1 gap-6">
              {debtList.map(tx => {
                const isStaffDebt = tx.category === 'Nợ / Tiền ứng';
                const remaining = tx.amount - (tx.paidAmount || 0);
                const progress = (tx.paidAmount || 0) / tx.amount * 100;
                
                return (
                  <div key={tx.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.2rem] border dark:border-slate-800 flex flex-col gap-5 shadow-ios group relative overflow-hidden transition-all hover:border-indigo-500/30">
                     <div className={`absolute top-0 right-0 px-5 py-2 text-white text-[9px] font-black uppercase rounded-bl-3xl tracking-widest z-10 ${isStaffDebt ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                        {isStaffDebt ? t('debt_type_staff') : t('debt_type_vendor')}
                     </div>
                     
                     <div className="flex justify-between items-start pt-2">
                        <div className="flex items-center gap-4">
                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 shadow-sm ${isStaffDebt ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border-indigo-100 dark:border-indigo-900/50' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-100 dark:border-rose-900/50'}`}>
                              {isStaffDebt ? <User className="w-7 h-7" /> : <Truck className="w-7 h-7" />}
                           </div>
                           <div>
                              <p className="text-base font-black dark:text-white uppercase leading-tight mb-1.5">{tx.debtorName || translateCategory(tx.category)}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> {tx.date.split('-').reverse().join('/')}
                              </p>
                           </div>
                        </div>
                        <div className="text-right">
                           <span className={`text-2xl font-black ${isStaffDebt ? 'text-indigo-600' : 'text-rose-600'}`}>{formatCurrency(remaining, lang)}</span>
                           <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mt-1">
                              {t('remaining_debt')}
                           </p>
                        </div>
                     </div>

                     <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border dark:border-slate-800">
                        <div className="flex justify-between text-[10px] font-black uppercase">
                           <div className="flex items-center gap-2 text-slate-400">
                              <span>{t('total')}:</span>
                              <span className="dark:text-slate-200">{formatCurrency(tx.amount, lang)}</span>
                           </div>
                           <div className="flex items-center gap-2 text-emerald-600">
                              <span>{t('paid')}:</span>
                              <span>{formatCurrency(tx.paidAmount || 0, lang)}</span>
                           </div>
                        </div>
                        <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                           <div className={`h-full transition-all duration-1000 ease-out shadow-sm ${isStaffDebt ? 'bg-indigo-500' : 'bg-rose-500'}`} style={{ width: `${progress}%` }} />
                           <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black text-white mix-blend-difference uppercase">{Math.round(progress)}% {t('paid')}</span>
                        </div>
                     </div>

                     <div className="flex justify-between items-center pt-2">
                        <div className="flex items-center gap-2 text-slate-500 max-w-[50%]">
                           <Info className="w-4 h-4 text-slate-300 shrink-0" />
                           <span className="text-[10px] font-bold uppercase truncate italic">{tx.notes?.[0] || '---'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => setEditingTx(tx)}
                             className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 border-2 border-slate-100 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase active-scale shadow-sm transition-all hover:bg-slate-50"
                           >
                              <Edit3 className="w-3.5 h-3.5" /> {t('partial_pay')}
                           </button>
                           <button 
                             onClick={() => {
                               const updated = { ...tx, isPaid: true, paidAmount: tx.amount, updatedAt: new Date().toISOString() };
                               onEditTransaction?.(updated);
                             }}
                             className={`flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-[10px] font-black uppercase active-scale shadow-vivid transition-all ${isStaffDebt ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                           >
                              <CheckCircle className="w-3.5 h-3.5" /> {t('full_pay')}
                           </button>
                        </div>
                     </div>
                  </div>
                );
              })}
              
              {debtList.length === 0 && (
                <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest">Tuyệt vời! Không còn công nợ.</p>
                </div>
              )}
           </div>
        </div>
      )}

      {editingTx && (
        <EditTransactionModal 
          transaction={editingTx}
          expenseCategories={expenseCategories}
          onClose={() => setEditingTx(null)}
          onSave={(updated) => {
            onEditTransaction?.(updated);
            setEditingTx(null);
          }}
          lang={lang}
          currentUsername={currentUsername}
        />
      )}

      <div className="flex items-center justify-center gap-6 py-10 opacity-30">
         <div className="h-px bg-slate-400 flex-1" />
         <span className="text-[8px] font-black uppercase tracking-[0.4em] whitespace-nowrap">Tokymon Management System</span>
         <div className="h-px bg-slate-400 flex-1" />
      </div>

    </div>
  );
};

export default Dashboard;
