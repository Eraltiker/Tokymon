
import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, Language, Branch, UserRole } from '../types';
import { useTranslation } from '../i18n';
import { analyzeFinances } from '../services/geminiService';
import { 
  XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Download, Layers, ChevronRight, ChevronLeft,
  AlertCircle, TrendingUp, Banknote,
  TrendingDown, CreditCard, Wallet, History,
  Table as TableIcon, PieChart as PieChartIcon,
  Sparkles, Loader2, MessageSquare, Calendar,
  CheckCircle2, MapPin
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface DashboardProps {
  transactions: Transaction[];
  initialBalances: { cash: number; card: number };
  lang: Language;
  currentBranchId: string;
  allowedBranches: Branch[];
  userRole?: UserRole;
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#64748b'];

const Dashboard: React.FC<DashboardProps> = ({ transactions, initialBalances, lang, currentBranchId, allowedBranches, userRole }) => {
  const t = useTranslation(lang);
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DAILY' | 'ASSETS' | 'DEBT'>('OVERVIEW');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewMode, setViewMode] = useState<'SINGLE' | 'ALL'>(userRole === UserRole.SUPER_ADMIN ? 'ALL' : 'SINGLE');

  // Lọc dữ liệu theo chi nhánh được chọn (hoặc toàn bộ)
  const filteredByBranchTransactions = useMemo(() => {
    if (viewMode === 'ALL') return transactions;
    return transactions.filter(tx => tx.branchId === currentBranchId);
  }, [transactions, viewMode, currentBranchId]);

  const { monthTransactions, prevMonthTransactions } = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    const dPrev = new Date(y, m - 2, 1);
    const prevStr = `${dPrev.getFullYear()}-${(dPrev.getMonth() + 1).toString().padStart(2, '0')}`;
    return {
      monthTransactions: filteredByBranchTransactions.filter(tx => tx.date.startsWith(currentMonth)),
      prevMonthTransactions: filteredByBranchTransactions.filter(tx => tx.date.startsWith(prevStr))
    };
  }, [filteredByBranchTransactions, currentMonth]);

  const calculateStats = (txs: Transaction[]) => {
    let totalIn = 0, totalOut = 0, totalDebt = 0, cashIn = 0, cardIn = 0;
    txs.forEach(tx => {
      if (tx.type === TransactionType.INCOME) {
        totalIn += tx.amount || 0;
        if (tx.incomeBreakdown) {
          cashIn += tx.incomeBreakdown.cash || 0;
          cardIn += tx.incomeBreakdown.card || 0;
        } else {
          cashIn += tx.amount || 0;
        }
      } else {
        totalOut += tx.amount || 0;
        if (tx.isPaid === false) totalDebt += tx.amount || 0;
      }
    });
    return { totalIn, totalOut, totalDebt, cashIn, cardIn, profit: totalIn - totalOut };
  };

  const stats = useMemo(() => calculateStats(monthTransactions), [monthTransactions]);
  const prevStats = useMemo(() => calculateStats(prevMonthTransactions), [prevMonthTransactions]);

  const growth = useMemo(() => {
    const calc = (cur: number, prev: number) => prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
    return {
      revenue: calc(stats.totalIn, prevStats.totalIn),
      profit: calc(stats.profit, prevStats.profit),
      expense: calc(stats.totalOut, prevStats.totalOut)
    };
  }, [stats, prevStats]);

  const expenseByCategory = useMemo(() => {
    const catMap: Record<string, number> = {};
    monthTransactions
      .filter(tx => tx.type === TransactionType.EXPENSE)
      .forEach(tx => {
        catMap[tx.category] = (catMap[tx.category] || 0) + (tx.amount || 0);
      });
    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthTransactions]);

  const assetStats = useMemo(() => {
    // Chỉ tính Assets cho SINGLE branch vì initialBalances được truyền vào cho single branch
    if (viewMode === 'ALL') return { cash: 0, bank: 0, total: 0, isAggregated: true };
    
    let cash = initialBalances.cash;
    let bank = initialBalances.card;

    filteredByBranchTransactions.forEach(tx => {
      if (tx.type === TransactionType.INCOME) {
        if (tx.incomeBreakdown) {
          cash += tx.incomeBreakdown.cash || 0;
          bank += tx.incomeBreakdown.card || 0;
        } else {
          cash += tx.amount || 0;
        }
      } else {
        if (tx.isPaid !== false) {
          if (tx.expenseSource === ExpenseSource.SHOP_CASH) cash -= tx.amount || 0;
          else if (tx.expenseSource === ExpenseSource.CARD) bank -= tx.amount || 0;
        }
      }
    });
    return { cash, bank, total: cash + bank, isAggregated: false };
  }, [filteredByBranchTransactions, initialBalances, viewMode]);

  const dailyData = useMemo(() => {
    const dayMap: Record<string, any> = {};
    monthTransactions.forEach(tx => {
      if (!dayMap[tx.date]) dayMap[tx.date] = { revenue: 0, expense: 0, cashIn: 0, cardIn: 0, cashOut: 0 };
      if (tx.type === TransactionType.INCOME) {
        dayMap[tx.date].revenue += tx.amount || 0;
        if (tx.incomeBreakdown) {
          dayMap[tx.date].cashIn += tx.incomeBreakdown.cash || 0;
          dayMap[tx.date].cardIn += tx.incomeBreakdown.card || 0;
        } else dayMap[tx.date].cashIn += tx.amount || 0;
      } else {
        dayMap[tx.date].expense += tx.amount || 0;
        if (tx.expenseSource === ExpenseSource.SHOP_CASH && tx.isPaid !== false) dayMap[tx.date].cashOut += tx.amount || 0;
      }
    });

    return Object.entries(dayMap).map(([date, data]: any) => ({
      date, 
      day: date.split('-')[2],
      ...data,
      netCash: data.cashIn - data.cashOut,
      profit: data.revenue - data.expense
    })).sort((a, b) => b.date.localeCompare(a.date));
  }, [monthTransactions]);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeFinances(monthTransactions, lang);
      setAiAnalysis(result);
    } catch (error) {
      setAiAnalysis("Không thể kết nối với AI vào lúc này.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(dailyData.map(d => ({
      "Ngày": d.date, "Doanh Thu": d.revenue, "Tiền Mặt": d.cashIn, "Thẻ": d.cardIn, "Tiền Mặt Rút": d.netCash, "Lợi Nhuận": d.profit
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `Tokymon_Report_${viewMode}_${currentMonth}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      
      {/* Tab & Filter Header */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
           <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar">
            {[
              { id: 'OVERVIEW', label: 'T.Quan', icon: Layers },
              { id: 'DAILY', label: 'Ngày', icon: TableIcon },
              { id: 'ASSETS', label: 'Vốn', icon: Wallet },
              { id: 'DEBT', label: 'Nợ', icon: AlertCircle },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>

          {(userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN) && (
            <div className="flex p-1.5 bg-slate-200 dark:bg-slate-800 rounded-2xl border dark:border-slate-700 shadow-inner">
               <button onClick={() => setViewMode('SINGLE')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'SINGLE' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Từng CS</button>
               <button onClick={() => setViewMode('ALL')} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'ALL' ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Toàn hệ thống</button>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between gap-3">
            <div className="flex flex-1 items-center bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-1 shadow-sm overflow-hidden">
              <button onClick={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const dPrev = new Date(y, m - 2);
                setCurrentMonth(`${dPrev.getFullYear()}-${(dPrev.getMonth() + 1).toString().padStart(2, '0')}`);
              }} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-90"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
              
              <div className="flex-1 flex items-center justify-center gap-3">
                 <Calendar className="w-5 h-5 text-indigo-500 hidden sm:block" />
                 <span className="text-center font-black text-[13px] uppercase tracking-widest text-slate-700 dark:text-slate-200">
                   Tháng {currentMonth}
                 </span>
                 <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />
                 <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter truncate max-w-[100px]">
                    {viewMode === 'ALL' ? 'Hệ thống' : (allowedBranches.find(b => b.id === currentBranchId)?.name || 'Cơ sở')}
                 </span>
              </div>

              <button onClick={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const dNext = new Date(y, m);
                setCurrentMonth(`${dNext.getFullYear()}-${(dNext.getMonth() + 1).toString().padStart(2, '0')}`);
              }} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-90"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
            </div>
            <button onClick={handleExport} className="p-4.5 bg-emerald-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all"><Download className="w-5 h-5" /></button>
        </div>
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between h-40">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Doanh thu {viewMode === 'ALL' ? 'Tổng' : ''}</p>
              <h3 className="text-2xl font-black leading-none">{formatCurrency(stats.totalIn)}</h3>
              <div className="flex items-center gap-1.5 text-[10px] font-black bg-white/20 w-fit px-3 py-1.5 rounded-full">
                {growth.revenue >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {Math.abs(growth.revenue).toFixed(1)}%
              </div>
            </div>
            <div className="bg-emerald-500 p-6 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between h-40">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Lợi nhuận {viewMode === 'ALL' ? 'Tổng' : ''}</p>
              <h3 className="text-2xl font-black leading-none">{formatCurrency(stats.profit)}</h3>
              <div className="text-[10px] font-black opacity-90 uppercase tracking-tighter bg-white/20 w-fit px-3 py-1.5 rounded-full">{(stats.profit / (stats.totalIn || 1) * 100).toFixed(1)}% Marge</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border dark:border-slate-800 shadow-sm flex flex-col justify-between h-32">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">TM {viewMode === 'ALL' ? 'Hệ thống' : 'Tại quán'}</p>
              <h3 className="text-xl font-black text-emerald-600">{formatCurrency(stats.cashIn)}</h3>
              <span className="text-[8px] font-bold text-slate-300 uppercase">Tích lũy Laden</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border dark:border-slate-800 shadow-sm flex flex-col justify-between h-32">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Thẻ/App {viewMode === 'ALL' ? 'Tổng' : ''}</p>
              <h3 className="text-xl font-black text-indigo-500">{formatCurrency(stats.cardIn)}</h3>
              <span className="text-[8px] font-bold text-slate-300 uppercase">Giao dịch số</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 p-6 rounded-[2.5rem] border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm relative overflow-hidden">
            <div className="flex flex-col gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-[12px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 leading-none mb-1.5">AI Advisor</h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Tư vấn tài chính Tokymon</p>
                </div>
              </div>
              <button 
                onClick={handleAiAnalysis} 
                disabled={isAnalyzing}
                className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shadow-xl shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                {isAnalyzing ? "Đang xử lý..." : "Phân tích tài chính ngay"}
              </button>
            </div>
            
            {aiAnalysis && (
              <div className="mt-5 p-5 bg-white/80 dark:bg-slate-900/80 rounded-[1.8rem] border border-white dark:border-slate-800 animate-in fade-in slide-in-from-top-4 duration-500">
                <p className="text-[13px] text-slate-700 dark:text-slate-200 font-bold leading-relaxed whitespace-pre-wrap italic">
                  "{aiAnalysis}"
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 shadow-sm">
               <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-indigo-500"><History className="w-4 h-4" /> Xu hướng doanh thu</h3>
               <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={[...dailyData].reverse()}>
                        <defs>
                          <linearGradient id="colRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.15} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                        <YAxis hide />
                        <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                        <Area type="monotone" dataKey="revenue" name="Thu" stroke="#6366f1" fillOpacity={1} fill="url(#colRev)" strokeWidth={4} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'DAILY' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[650px]">
           <div className="p-6 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest">Bảng kê chi tiết hàng ngày</h3>
              <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase">{viewMode === 'ALL' ? 'Toàn hệ thống' : 'Cá nhân'}</span>
           </div>
           <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-right text-[12px] border-collapse min-w-[550px]">
                 <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-md">
                    <tr className="text-slate-400 font-black uppercase tracking-widest">
                       <th className="px-5 py-5 text-center sticky left-0 bg-slate-50 dark:bg-slate-800 z-30 w-20 border-r dark:border-slate-700">Ngày</th>
                       <th className="px-5 py-5">Doanh Thu</th>
                       <th className="px-5 py-5 text-indigo-500">Tiền Thẻ</th>
                       <th className="px-5 py-5 text-emerald-600 font-black">TM Cần Rút</th>
                       <th className="px-5 py-5">Lợi Nhuận</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y dark:divide-slate-800">
                    {dailyData.map(day => (
                       <tr key={day.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                          <td className="px-5 py-5 font-black text-center sticky left-0 bg-white dark:bg-slate-900 z-10 border-r dark:border-slate-800">{day.day}</td>
                          <td className="px-5 py-5 font-bold text-slate-800 dark:text-slate-200">{formatCurrency(day.revenue)}</td>
                          <td className="px-5 py-5 font-bold text-indigo-500/90">{formatCurrency(day.cardIn)}</td>
                          <td className="px-5 py-5 font-black text-emerald-600 bg-emerald-50/5">{formatCurrency(day.netCash)}</td>
                          <td className={`px-5 py-5 font-black ${day.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(day.profit)}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeTab === 'ASSETS' && (
        <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
           {assetStats.isAggregated ? (
             <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white mb-2">Không hỗ trợ xem Vốn gộp</h3>
                <p className="text-slate-500 max-w-sm mx-auto font-bold text-xs uppercase tracking-widest">Vui lòng chuyển về chế độ "Từng CS" để xem số dư tiền mặt và ngân hàng chính xác của từng chi nhánh.</p>
             </div>
           ) : (
             <>
               {[
                 { title: 'Tiền mặt tại quán', val: assetStats.cash, color: 'text-emerald-600', icon: Banknote },
                 { title: 'Số dư Ngân hàng', val: assetStats.bank, color: 'text-indigo-600', icon: CreditCard },
                 { title: 'Tổng nguồn vốn', val: assetStats.total, color: 'text-indigo-600', icon: Wallet, highlight: true }
               ].map((asset, i) => (
                 <div key={i} className={`p-8 rounded-[2.5rem] shadow-sm border dark:border-slate-800 flex flex-col justify-between h-44 ${asset.highlight ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-600/20' : 'bg-white dark:bg-slate-900'}`}>
                    <div>
                      <p className={`text-[11px] font-black uppercase tracking-widest mb-2 leading-none ${asset.highlight ? 'opacity-70' : 'text-slate-400'}`}>{asset.title}</p>
                      <h2 className={`text-3xl font-black ${asset.highlight ? 'text-white' : asset.color}`}>{formatCurrency(asset.val)}</h2>
                    </div>
                    <asset.icon className={`w-10 h-10 opacity-20 self-end ${asset.highlight ? 'text-white' : asset.color}`} />
                 </div>
               ))}
             </>
           )}
        </div>
      )}

      {activeTab === 'DEBT' && (
        <div className="flex flex-col gap-6">
           <div className="bg-rose-600 rounded-[2.5rem] p-8 text-white shadow-xl flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-2 leading-none">Tổng nợ chưa trả {viewMode === 'ALL' ? 'Toàn hệ thống' : ''}</p>
                <h2 className="text-4xl font-black">{formatCurrency(stats.totalDebt)}</h2>
              </div>
              <AlertCircle className="w-12 h-12 opacity-30" />
           </div>

           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <h3 className="text-xs font-black uppercase tracking-widest">Nợ nhà cung cấp</h3>
                <span className="text-[10px] font-black px-3 py-1 bg-rose-50 text-rose-500 rounded-full">{monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).length} khoản</span>
              </div>
              <div className="divide-y dark:divide-slate-800 max-h-[500px] overflow-y-auto custom-scrollbar">
                {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).length === 0 ? (
                  <div className="p-20 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-100 dark:text-emerald-900/30 mx-auto mb-4" />
                    <p className="text-slate-400 italic text-[11px] font-black uppercase tracking-widest">Không có nợ tồn đọng</p>
                  </div>
                ) : (
                  monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).map(t => (
                    <div key={t.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                      <div className="min-w-0 flex-1 pr-6">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-slate-900 dark:text-slate-100 text-[15px] truncate uppercase tracking-tight">{t.debtorName || 'NCC không tên'}</p>
                          {viewMode === 'ALL' && (
                             <span className="text-[8px] font-black bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 px-1.5 py-0.5 rounded uppercase">{allowedBranches.find(b => b.id === t.branchId)?.name || 'N/A'}</span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Tag className="w-3 h-3" /> {t.category} • {t.date}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-black text-rose-600 mb-1">{formatCurrency(t.amount || 0)}</p>
                        <span className="text-[8px] font-black uppercase bg-rose-50 dark:bg-rose-900/30 text-rose-600 px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900/50">Ghi nợ</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

// Icon bổ sung không được import từ lucide-react ở trên
const Tag = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42l-8.704-8.704z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
);

export default Dashboard;
