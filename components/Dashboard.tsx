
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
  Calendar,
  Layers,
  ArrowDownCircle,
  Store,
  Clock,
  RefreshCw,
  UserCheck,
  History
} from 'lucide-react';
import { analyzeFinances } from '../services/geminiService';

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

  const activeTxs = useMemo(() => {
    return transactions.filter(tx => !tx.deletedAt && tx.branchId === currentBranchId);
  }, [transactions, currentBranchId]);

  // --- VÍ TỔNG: TÍNH TOÀN BỘ LỊCH SỬ DÒNG TIỀN ---
  const walletStats = useMemo(() => {
    let totalCashFromIncome = 0; 
    let totalCardFromIncome = 0; 
    let totalShopCashOut = 0;    
    let totalWalletOut = 0;      
    let totalCardOut = 0;        

    activeTxs.forEach(tx => {
      if (tx.type === TransactionType.INCOME) {
        // Cash = (Amount - Card) -> Lưu ý App đã được tính vào Cash theo logic Tokymon
        const cashFlow = (tx.amount - (tx.incomeBreakdown?.card || 0));
        totalCashFromIncome += cashFlow;
        totalCardFromIncome += (tx.incomeBreakdown?.card || 0);
      } else {
        let actualPaid = 0;
        if (tx.category === 'Nợ / Tiền ứng') {
           actualPaid = tx.amount - (tx.paidAmount || 0);
        } else {
           actualPaid = tx.paidAmount || (tx.isPaid !== false ? tx.amount : 0);
        }
        
        if (actualPaid > 0) {
          if (tx.expenseSource === ExpenseSource.SHOP_CASH) totalShopCashOut += actualPaid;
          else if (tx.expenseSource === ExpenseSource.WALLET) totalWalletOut += actualPaid;
          else if (tx.expenseSource === ExpenseSource.CARD) totalCardOut += actualPaid;
        }
      }
    });

    const branch = allowedBranches.find(b => b.id === currentBranchId);
    const initialCash = branch?.initialCash || 0;
    const initialCard = branch?.initialCard || 0;

    const masterWalletBalance = initialCash + (totalCashFromIncome - totalShopCashOut) - totalWalletOut;
    const bankBalance = initialCard + totalCardFromIncome - totalCardOut;

    return {
      masterWalletBalance,
      bankBalance,
      totalCashIn: totalCashFromIncome,
      totalShopOut: totalShopCashOut,
      netHandoverTotal: totalCashFromIncome - totalShopCashOut,
      totalCardIn: totalCardFromIncome,
      totalCardOut,
      totalWalletOut
    };
  }, [activeTxs, allowedBranches, currentBranchId]);

  // --- BÁO CÁO THEO GIAI ĐOẠN ---
  const stats = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const q = Math.ceil((month + 1) / 3);

    let totalRev = 0, totalZBon = 0, totalExp = 0, cardSales = 0, appSales = 0;
    const catMap: Record<string, number> = {};
    const dailyData: Record<string, any> = {};

    activeTxs.forEach(tx => {
      const txDate = new Date(tx.date);
      const isTxInPeriod = reportPeriod === 'MONTH' ? (txDate.getFullYear() === year && txDate.getMonth() === month) : reportPeriod === 'QUARTER' ? (txDate.getFullYear() === year && Math.ceil((txDate.getMonth() + 1) / 3) === q) : (txDate.getFullYear() === year);

      if (isTxInPeriod && tx.type === TransactionType.INCOME) {
        if (!dailyData[tx.date]) dailyData[tx.date] = { total: 0, zbon: 0, card: 0, app: 0, shopOut: 0, expenses: [] };
        
        const delivery = tx.incomeBreakdown?.delivery || 0;
        const zbonValue = tx.amount - delivery;

        totalRev += tx.amount;
        totalZBon += zbonValue;
        
        dailyData[tx.date].total += tx.amount;
        dailyData[tx.date].zbon += zbonValue;
        
        if (tx.incomeBreakdown) {
          cardSales += tx.incomeBreakdown.card || 0;
          appSales += delivery;
          dailyData[tx.date].card += tx.incomeBreakdown.card || 0;
          dailyData[tx.date].app += delivery;
        }
      }

      if (tx.type === TransactionType.EXPENSE) {
        const processExpense = (amt: number, dateStr: string) => {
          const pDate = new Date(dateStr);
          const inPeriod = reportPeriod === 'MONTH' ? (pDate.getFullYear() === year && pDate.getMonth() === month) : reportPeriod === 'QUARTER' ? (pDate.getFullYear() === year && Math.ceil((pDate.getMonth() + 1) / 3) === q) : (pDate.getFullYear() === year);
          if (inPeriod) {
            if (!dailyData[dateStr]) dailyData[dateStr] = { total: 0, zbon: 0, card: 0, app: 0, shopOut: 0, expenses: [] };
            totalExp += amt;
            catMap[tx.category] = (catMap[tx.category] || 0) + amt;
            if (tx.expenseSource === ExpenseSource.SHOP_CASH) dailyData[dateStr].shopOut += amt;
            dailyData[dateStr].expenses.push({ ...tx, displayAmt: amt });
          }
        };

        if (tx.category === 'Nợ / Tiền ứng') {
          const netExpense = tx.amount - (tx.paidAmount || 0);
          processExpense(netExpense, tx.date);
        } else {
          processExpense(tx.isPaid !== false ? tx.amount : (tx.paidAmount || 0), tx.date);
        }
      }
    });

    const chartData = Object.entries(dailyData).map(([date, d]: any) => ({
      label: reportPeriod === 'MONTH' ? date.split('-')[2] : `T${new Date(date).getMonth() + 1}`,
      revenue: d.zbon, // Biểu đồ hiển thị theo Z-Bon cho sát thực tế quán
      cash: d.zbon - d.card - d.shopOut + d.app
    })).sort((a, b) => a.label.localeCompare(b.label));

    return {
      totalRev, totalZBon, totalExp, profit: totalRev - totalExp, 
      cardSales, appSales,
      chartData,
      pieData: Object.entries(catMap).map(([name, value]) => ({ name: translateCategory(name), value })).sort((a, b) => b.value - a.value),
      dailyAudit: Object.entries(dailyData).sort((a, b) => b[0].localeCompare(a[0]))
    };
  }, [activeTxs, viewDate, reportPeriod, translateCategory, t]);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const margin = stats.totalRev > 0 ? stats.profit / stats.totalRev : 0;
      const totalDebt = transactions
        .filter(tx => !tx.deletedAt && tx.branchId === currentBranchId && tx.type === TransactionType.EXPENSE && tx.isPaid === false)
        .reduce((a, b) => a + (b.amount - (b.paidAmount || 0)), 0);

      const result = await analyzeFinances({
        totalIn: stats.totalRev,
        totalOut: stats.totalExp,
        profit: stats.profit,
        margin,
        totalDebt
      }, lang);
      setAiAnalysis(result);
    } catch (error) {
      console.error("AI Analysis Failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const liabilities = useMemo(() => {
    return activeTxs.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [activeTxs]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6 pb-40 animate-ios max-w-6xl mx-auto px-1 sm:px-4">
      
      {/* Tab Navigation */}
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
                <button key={p} onClick={() => setReportPeriod(p)} className={`flex-1 md:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportPeriod === p ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>{t(p)}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border dark:border-slate-800 self-center">
              <button onClick={handlePrev} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-500"><ChevronLeft className="w-4 h-4" /></button>
              <div className="px-4 text-center min-w-[140px]"><span className="text-[10px] font-black dark:text-white uppercase tracking-widest">{periodLabel}</span></div>
              <button onClick={handleNext} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-500"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
             <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-5 rounded-[2.2rem] text-white shadow-vivid col-span-2 md:col-span-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-70 mb-1">Dòng tiền thuần (Lợi nhuận)</p>
                <h3 className="text-xl sm:text-2xl font-black tracking-tighter leading-none">{formatCurrency(stats.profit, lang)}</h3>
             </div>
             <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.2rem] border dark:border-slate-800 shadow-ios text-center">
                <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1 leading-none">Tổng Thẻ (Digital)</p>
                <h3 className="text-xl sm:text-2xl font-black text-rose-600 tracking-tighter leading-none">
                  {formatCurrency(stats.cardSales, lang)}
                </h3>
             </div>
             <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.2rem] border dark:border-slate-800 shadow-ios text-center ring-2 ring-emerald-500/20">
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1 leading-none">TỔNG KASSE (Z-BON)</p>
                <h3 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter leading-none">
                  {formatCurrency(stats.totalZBon, lang)}
                </h3>
             </div>
             <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.2rem] border dark:border-slate-800 shadow-ios">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Chi Phí Thực Xuất</p>
                <h3 className="text-xl sm:text-2xl font-black text-slate-600 dark:text-slate-300 tracking-tighter leading-none">{formatCurrency(stats.totalExp, lang)}</h3>
             </div>
             <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.2rem] border dark:border-slate-800 shadow-ios">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Doanh Thu Tổng</p>
                <h3 className="text-xl sm:text-2xl font-black text-indigo-500 tracking-tighter leading-none">{formatCurrency(stats.totalRev, lang)}</h3>
             </div>
          </div>

          {/* AI Analysis Section */}
          <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white dark:border-slate-800 shadow-premium group">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-vivid animate-pulse-slow">
                     <BrainCircuit className="w-7 h-7" />
                  </div>
                  <div>
                     <h4 className="text-lg font-black dark:text-white uppercase tracking-tighter leading-none">{t('ai_analysis_title')}</h4>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('ai_strategy_sub')}</p>
                  </div>
               </div>
               <button 
                  onClick={handleAiAnalysis}
                  disabled={isAnalyzing}
                  className="px-8 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.4rem] text-[11px] font-black uppercase tracking-widest active-scale shadow-ios flex items-center gap-3 disabled:opacity-50 transition-all hover:bg-brand-600 dark:hover:bg-brand-100"
               >
                  {isAnalyzing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('ai_scanning_text')}</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> {t('ai_btn')}</>
                  )}
               </button>
            </div>

            {aiAnalysis ? (
              <div className="p-6 bg-white/40 dark:bg-slate-950/40 rounded-[2rem] border border-white dark:border-slate-800/60 prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base font-bold text-slate-600 dark:text-slate-300 animate-ios leading-relaxed whitespace-pre-wrap">
                {aiAnalysis}
              </div>
            ) : (
              !isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                   <Zap className="w-10 h-10 mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-widest">{t('ai_hint')}</p>
                </div>
              )
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
             <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[3rem] border dark:border-slate-800 shadow-ios">
                <h4 className="text-sm font-black uppercase tracking-tighter dark:text-white mb-10">Phân tích Z-Bon (Daily Counter)</h4>
                <div className="h-[300px]">
                   <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={stats.chartData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} />
                         <YAxis hide />
                         <RechartsTooltip 
                            contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 800, fontSize: '10px'}}
                            formatter={(val: number) => [formatCurrency(val, lang)]}
                         />
                         <Bar dataKey="revenue" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={15} />
                         <Area type="monotone" dataKey="cash" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.1} />
                      </ComposedChart>
                   </ResponsiveContainer>
                </div>
             </div>
             
             <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[3rem] border dark:border-slate-800 shadow-ios flex flex-col items-center">
                <h4 className="text-sm font-black uppercase tracking-tighter dark:text-white mb-6">Cơ cấu chi phí</h4>
                <div className="h-[200px] w-full relative">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={stats.pieData} innerRadius={60} outerRadius={80} paddingAngle={6} dataKey="value">
                            {stats.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                         </Pie>
                      </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Thực xuất</span>
                      <span className="text-xs font-black dark:text-white tracking-tighter">{formatCurrency(stats.totalExp, lang)}</span>
                   </div>
                </div>
                <div className="mt-6 w-full space-y-2.5">
                   {stats.pieData.slice(0, 4).map((item, i) => (
                      <div key={i} className="flex justify-between items-center">
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
        </div>
      )}

      {activeTab === 'DAILY' && (
        <div className="space-y-6 animate-ios">
          {stats.dailyAudit.map(([date, d]: any) => {
            // Tiền mặt tại quầy = ZBon - Card
            // Tiền mặt thực tế trong túi = (ZBon - Card) + App (theo logic user muốn)
            const cashFromCounter = d.zbon - d.card;
            const expectedCashInHand = cashFromCounter + d.app;
            const netHandover = expectedCashInHand - d.shopOut;
            
            return (
              <div key={date} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 shadow-ios overflow-hidden flex flex-col group transition-all w-full">
                 <div className="px-6 py-5 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                       <div className="flex flex-col items-center justify-center w-12 h-12 bg-white/10 rounded-2xl border border-white/20">
                          <span className="text-lg font-black leading-none">{date.split('-')[2]}</span>
                          <span className="text-[7px] font-black uppercase opacity-60">T{date.split('-')[1]}</span>
                       </div>
                       <h4 className="text-xs font-black uppercase tracking-tight">Quyết toán ngày {date.split('-').reverse().join('/')}</h4>
                    </div>
                 </div>

                 <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div className="space-y-4">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Receipt className="w-4 h-4" /> Chi tiết nguồn thu</h5>
                          <div className="space-y-3.5 p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border dark:border-slate-800">
                             <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase"><span>Tổng Kasse (Z-Bon):</span><span className="dark:text-white font-black">{formatCurrency(d.zbon, lang)}</span></div>
                             <div className="flex justify-between items-center text-rose-500 text-[11px] font-black uppercase"><span>Trừ quẹt thẻ (-):</span><span>-{formatCurrency(d.card, lang)}</span></div>
                             <div className="flex justify-between items-center text-indigo-500 text-[11px] font-black uppercase"><span>Cộng tiền App (+):</span><span>+{formatCurrency(d.app, lang)}</span></div>
                             <div className="pt-3 border-t-2 border-dashed dark:border-slate-800 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-slate-400">Tiền mặt dự kiến (trước chi):</span>
                                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{formatCurrency(expectedCashInHand, lang)}</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Calculator className="w-4 h-4" /> Bàn giao quỹ</h5>
                       <div className="space-y-3.5 p-5 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-2xl border dark:border-emerald-900/30">
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase"><span>Tiền mặt thu:</span><span className="dark:text-white">{formatCurrency(expectedCashInHand, lang)}</span></div>
                          <div className="flex justify-between items-center text-rose-500 text-[11px] font-black uppercase"><span>Chi tại quán (-):</span><span>-{formatCurrency(d.shopOut, lang)}</span></div>
                          <div className="mt-4 p-4 bg-emerald-600 rounded-2xl text-white shadow-vivid text-center">
                             <p className="text-[8px] font-black uppercase tracking-widest opacity-80 mb-1">THỰC NỘP VÍ TỔNG</p>
                             <h6 className="text-2xl font-black tracking-tighter">{formatCurrency(netHandover, lang)}</h6>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'WALLET' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-ios">
          <div className="bg-white/95 dark:bg-slate-900/90 rounded-[3rem] p-8 border dark:border-slate-800 shadow-ios relative overflow-hidden group">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-[1.2rem] flex items-center justify-center shadow-vivid"><Wallet className="w-6 h-6" /></div>
                <div>
                   <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter leading-none">Ví Tổng (Hauptkasse)</h2>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Dòng tiền mặt gối đầu</p>
                </div>
             </div>
             <div className="space-y-3.5 p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border dark:border-slate-800">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400"><span>Vốn đầu kỳ:</span><span>{formatCurrency(allowedBranches.find(b => b.id === currentBranchId)?.initialCash || 0, lang)}</span></div>
                <div className="flex justify-between items-center text-emerald-600 text-[10px] font-black uppercase"><span>Nộp từ cơ sở (+):</span><span>+{formatCurrency(walletStats.netHandoverTotal, lang)}</span></div>
                <div className="flex justify-between items-center text-rose-500 text-[10px] font-black uppercase"><span>Chi phí thực xuất (-):</span><span>-{formatCurrency(walletStats.totalWalletOut, lang)}</span></div>
                <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />
                <div className="text-center pt-2">
                   <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Số dư hiện tại</p>
                   <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{formatCurrency(walletStats.masterWalletBalance, lang)}</p>
                </div>
             </div>
          </div>

          <div className="bg-white/95 dark:bg-slate-900/90 rounded-[3rem] p-8 border dark:border-slate-800 shadow-ios relative overflow-hidden group">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-[1.2rem] flex items-center justify-center shadow-vivid"><Landmark className="w-6 h-6" /></div>
                <div>
                   <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter leading-none">Tài khoản Ngân hàng</h2>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Dòng tiền Digital Flow</p>
                </div>
             </div>
             <div className="space-y-3.5 p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border dark:border-slate-800">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400"><span>Vốn bank đầu kỳ:</span><span>{formatCurrency(allowedBranches.find(b => b.id === currentBranchId)?.initialCard || 0, lang)}</span></div>
                <div className="flex justify-between items-center text-emerald-600 text-[10px] font-black uppercase"><span>Doanh thu thẻ (+):</span><span>+{formatCurrency(walletStats.totalCardIn, lang)}</span></div>
                <div className="flex justify-between items-center text-rose-500 text-[10px] font-black uppercase"><span>Chi bằng thẻ/bank (-):</span><span>-{formatCurrency(walletStats.totalCardOut, lang)}</span></div>
                <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />
                <div className="text-center pt-2">
                   <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Số dư ước tính</p>
                   <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{formatCurrency(walletStats.bankBalance, lang)}</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'LIABILITIES' && (
        <div className="space-y-6 animate-ios">
           <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-premium text-center">
              <p className="text-[10px] font-black uppercase opacity-60 mb-3 tracking-[0.3em]">Công nợ đang treo</p>
              <h2 className="text-5xl font-black tracking-tighter leading-none">
                {formatCurrency(liabilities.reduce((a, b) => a + (b.amount - (b.paidAmount || 0)), 0), lang)}
              </h2>
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[3rem] border dark:border-slate-800 shadow-ios overflow-hidden">
              <div className="px-8 py-5 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chi tiết các khoản công nợ</h4>
              </div>
              <div className="divide-y dark:divide-slate-800">
                 {liabilities.map(tx => {
                   const rem = tx.amount - (tx.paidAmount || 0);
                   const isStaff = tx.category === 'Nợ / Tiền ứng';
                   return (
                     <div key={tx.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isStaff ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                              {isStaff ? <UserCheck className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                           </div>
                           <div>
                              <p className="text-sm font-black dark:text-white uppercase tracking-tight">{tx.debtorName || translateCategory(tx.category)}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                                 <Calendar className="w-3 h-3" /> Ngày phát sinh: {tx.date.split('-').reverse().join('/')}
                              </p>
                           </div>
                        </div>

                        <div className="flex flex-col items-end">
                           <div className="flex gap-4 mb-2">
                              <div className="text-right">
                                 <p className="text-[8px] font-black text-slate-400 uppercase">{isStaff ? 'Gốc đã ứng' : 'Tổng nợ gốc'}</p>
                                 <p className="text-xs font-black dark:text-white">{formatCurrency(tx.amount, lang)}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[8px] font-black text-slate-400 uppercase">{isStaff ? 'Đã hoàn ứng' : 'Đã thanh toán'}</p>
                                 <p className="text-xs font-black text-emerald-500">{formatCurrency(tx.paidAmount || 0, lang)}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="text-right">
                                 <p className="text-[8px] font-black text-slate-400 uppercase">{isStaff ? 'CÒN PHẢI THU' : 'CÒN PHẢI TRẢ'}</p>
                                 <p className="text-lg font-black text-rose-600">{formatCurrency(rem, lang)}</p>
                              </div>
                              <button 
                                onClick={() => onEditTransaction && onEditTransaction(tx)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active-scale shadow-sm flex items-center gap-2"
                              >
                                <Banknote className="w-3 h-3" /> {isStaff ? 'HOÀN ỨNG' : 'TRẢ THÊM'}
                              </button>
                           </div>
                           
                           {tx.notes && tx.notes.some(n => n.includes('[ĐỐI SOÁT')) && (
                             <div className="mt-3 w-full flex items-start gap-1.5 opacity-60">
                               <History className="w-2.5 h-2.5 text-indigo-500 mt-1 shrink-0" />
                               <p className="text-[8px] font-bold italic text-indigo-600 dark:text-indigo-400 line-clamp-1">
                                 Lần cuối: {tx.notes.find(n => n.includes('[ĐỐI SOÁT'))}
                               </p>
                             </div>
                           )}
                        </div>
                     </div>
                   );
                 })}

                 {liabilities.length === 0 && (
                   <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                      <CheckCircle className="w-12 h-12" />
                      <p className="text-xs font-black uppercase tracking-widest">Hệ thống sạch nợ</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
