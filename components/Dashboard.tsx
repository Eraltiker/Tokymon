
import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, Language, Branch, UserRole } from '../types';
import { useTranslation } from '../i18n';
import { analyzeFinances } from '../services/geminiService';
import { 
  XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area, CartesianGrid
} from 'recharts';
import { 
  Download, ChevronRight, ChevronLeft,
  AlertCircle, TrendingUp, Banknote,
  TrendingDown, CreditCard, Wallet, History,
  Sparkles, Loader2, MessageSquare, Calendar,
  PieChart as PieChartIcon, Table as TableIcon, Layers
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

  const stats = useMemo(() => {
    let totalIn = 0, totalOut = 0, totalDebt = 0, cashIn = 0, cardIn = 0;
    monthTransactions.forEach(tx => {
      if (tx.type === TransactionType.INCOME) {
        totalIn += tx.amount || 0;
        if (tx.incomeBreakdown) {
          cashIn += tx.incomeBreakdown.cash || 0;
          cardIn += tx.incomeBreakdown.card || 0;
        } else cashIn += tx.amount || 0;
      } else {
        totalOut += tx.amount || 0;
        if (tx.isPaid === false) totalDebt += tx.amount || 0;
      }
    });
    return { totalIn, totalOut, totalDebt, cashIn, cardIn, profit: totalIn - totalOut };
  }, [monthTransactions]);

  const prevStats = useMemo(() => {
    let totalIn = 0, profit = 0;
    prevMonthTransactions.forEach(tx => {
      if (tx.type === TransactionType.INCOME) totalIn += tx.amount || 0;
      else profit -= tx.amount || 0;
    });
    return { totalIn, profit: totalIn + profit };
  }, [prevMonthTransactions]);

  const growth = useMemo(() => {
    const calc = (cur: number, prev: number) => prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
    return {
      revenue: calc(stats.totalIn, prevStats.totalIn),
      profit: calc(stats.profit, prevStats.profit)
    };
  }, [stats, prevStats]);

  const dailyData = useMemo(() => {
    const dayMap: Record<string, any> = {};
    monthTransactions.forEach(tx => {
      if (!dayMap[tx.date]) dayMap[tx.date] = { revenue: 0, expense: 0, cashIn: 0, cashOut: 0 };
      if (tx.type === TransactionType.INCOME) {
        dayMap[tx.date].revenue += tx.amount || 0;
        if (tx.incomeBreakdown) dayMap[tx.date].cashIn += tx.incomeBreakdown.cash || 0;
      } else {
        dayMap[tx.date].expense += tx.amount || 0;
        if (tx.expenseSource === ExpenseSource.SHOP_CASH && tx.isPaid !== false) dayMap[tx.date].cashOut += tx.amount || 0;
      }
    });
    return Object.entries(dayMap).map(([date, data]: any) => ({
      date, day: date.split('-')[2], ...data, netCash: data.cashIn - data.cashOut, profit: data.revenue - data.expense
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [monthTransactions]);

  const assetStats = useMemo(() => {
    if (viewMode === 'ALL') return null;
    let cash = initialBalances.cash;
    let bank = initialBalances.card;
    filteredByBranchTransactions.forEach(tx => {
      if (tx.type === TransactionType.INCOME) {
        cash += tx.incomeBreakdown?.cash || tx.amount;
        bank += tx.incomeBreakdown?.card || 0;
      } else if (tx.isPaid !== false) {
        if (tx.expenseSource === ExpenseSource.SHOP_CASH) cash -= tx.amount;
        else if (tx.expenseSource === ExpenseSource.CARD) bank -= tx.amount;
      }
    });
    return { cash, bank, total: cash + bank };
  }, [filteredByBranchTransactions, initialBalances, viewMode]);

  const handleAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeFinances(monthTransactions, lang);
      setAiAnalysis(result);
    } catch (e) {
      setAiAnalysis("Lỗi AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(dailyData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `Report_${currentMonth}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Date Picker Mobile */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 border dark:border-slate-800 shadow-sm flex items-center justify-between">
        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m - 2);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
        }} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl active:scale-90 transition-all"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
        
        <div className="flex flex-col items-center">
          <span className="text-[12px] font-black uppercase tracking-[0.2em] text-indigo-600">Tháng {currentMonth.split('-')[1]} • {currentMonth.split('-')[0]}</span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{viewMode === 'ALL' ? 'Toàn hệ thống' : (allowedBranches.find(b => b.id === currentBranchId)?.name)}</span>
        </div>

        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
        }} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl active:scale-90 transition-all"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {[
          { id: 'OVERVIEW', label: 'Tổng quan', icon: Layers },
          { id: 'DAILY', label: 'Ngày', icon: TableIcon },
          { id: 'ASSETS', label: 'Dòng tiền', icon: Wallet },
          { id: 'DEBT', label: 'Nợ nần', icon: AlertCircle }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 shrink-0 ${activeTab === tab.id ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 gap-4">
            {/* Primary Revenue Card */}
            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
               <div className="relative z-10 flex flex-col gap-8">
                 <div className="flex justify-between items-start">
                   <div>
                     <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-1">Tổng doanh thu</p>
                     <h2 className="text-4xl font-black tracking-tighter">{formatCurrency(stats.totalIn)}</h2>
                   </div>
                   <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black ${growth.revenue >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                     {growth.revenue >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                     {Math.abs(growth.revenue).toFixed(1)}%
                   </div>
                 </div>
                 <div className="flex gap-8">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Tiền mặt</p>
                      <p className="text-lg font-black">{formatCurrency(stats.cashIn)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">Thẻ / App</p>
                      <p className="text-lg font-black">{formatCurrency(stats.cardIn)}</p>
                    </div>
                 </div>
               </div>
               <Banknote className="absolute -right-6 -bottom-6 w-40 h-40 text-white/10 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
            </div>

            {/* Profit Card */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border dark:border-slate-800 shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Lợi nhuận ròng</p>
                  <h3 className={`text-3xl font-black ${stats.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(stats.profit)}</h3>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Marge: {(stats.profit / (stats.totalIn || 1) * 100).toFixed(1)}%</p>
               </div>
               <div className={`p-5 rounded-3xl ${stats.profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'}`}>
                  {stats.profit >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
               </div>
            </div>
          </div>

          {/* AI Section Mobile */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
             <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"><Sparkles className="w-6 h-6" /></div>
                  <h3 className="text-xl font-black uppercase tracking-tight">AI Financial Advisor</h3>
                </div>
                {aiAnalysis ? (
                  <div className="p-5 bg-black/10 backdrop-blur-md rounded-3xl border border-white/10">
                    <p className="text-[13px] font-bold leading-relaxed italic">"{aiAnalysis}"</p>
                  </div>
                ) : (
                  <button onClick={handleAiAnalysis} disabled={isAnalyzing} className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />} Phân tích báo cáo ngay
                  </button>
                )}
             </div>
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          </div>

          {/* Chart Section */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border dark:border-slate-800 shadow-sm">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2"><History className="w-4 h-4" /> Xu hướng doanh thu ngày</h3>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.1} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} />
                      <YAxis hide />
                      <RechartsTooltip formatter={(v: any) => formatCurrency(v)} />
                      <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'DAILY' && (
        <div className="space-y-4 animate-in fade-in duration-300">
           {dailyData.slice().reverse().map(d => (
             <div key={d.date} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border dark:border-slate-800 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center border dark:border-slate-700">
                      <span className="text-[8px] font-black text-slate-400 uppercase leading-none">{new Date(d.date).toLocaleDateString('vi-VN', {weekday: 'short'})}</span>
                      <span className="text-lg font-black dark:text-white leading-none mt-1">{d.day}</span>
                   </div>
                   <div>
                      <p className="text-[12px] font-black dark:text-white uppercase leading-none mb-1">{formatCurrency(d.revenue)}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">LN: {formatCurrency(d.profit)}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">TM: {formatCurrency(d.netCash)}</p>
                   <div className="w-20 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{width: `${Math.min(100, (d.revenue / 2000) * 100)}%`}} />
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'ASSETS' && (
        <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
          {!assetStats ? (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
               <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
               <p className="text-[11px] font-bold text-slate-400 uppercase max-w-[200px] mx-auto leading-relaxed">Vui lòng chọn 1 chi nhánh để xem chính xác số dư tiền mặt và ngân hàng.</p>
            </div>
          ) : (
            <>
               <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-100 dark:shadow-none flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-1">Tiền mặt tại quán</p>
                    <h2 className="text-4xl font-black">{formatCurrency(assetStats.cash)}</h2>
                  </div>
                  <Banknote className="w-10 h-10 opacity-30" />
               </div>
               <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-1">Số dư ngân hàng</p>
                    <h2 className="text-4xl font-black">{formatCurrency(assetStats.bank)}</h2>
                  </div>
                  <CreditCard className="w-10 h-10 opacity-30" />
               </div>
               <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest opacity-40 mb-1">Tổng tài sản ròng</p>
                    <h2 className="text-3xl font-black text-amber-400">{formatCurrency(assetStats.total)}</h2>
                  </div>
                  <Wallet className="w-8 h-8 opacity-20" />
               </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'DEBT' && (
        <div className="space-y-6 animate-in fade-in duration-300">
           <div className="bg-rose-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-rose-100 dark:shadow-none flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-1">Công nợ NCC</p>
                <h2 className="text-4xl font-black">{formatCurrency(stats.totalDebt)}</h2>
              </div>
              <AlertCircle className="w-10 h-10 opacity-30" />
           </div>

           <div className="space-y-4">
              {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).map(t => (
                <div key={t.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm flex items-center justify-between">
                   <div className="flex-1 pr-4">
                      <p className="text-[13px] font-black uppercase tracking-tight dark:text-white mb-1 truncate">{t.debtorName || 'NCC Không tên'}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {t.date} • {t.category}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-lg font-black text-rose-600">{formatCurrency(t.amount)}</p>
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-rose-50 text-rose-500 rounded-full border border-rose-100">Chưa trả</span>
                   </div>
                </div>
              ))}
              {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).length === 0 && (
                <div className="py-20 text-center">
                   <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Tuyệt vời! Không có nợ tồn đọng.</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Manual Export for Admin */}
      {(userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN) && (
        <button onClick={handleExport} className="w-full py-5 bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all active:scale-95 mt-10">
          <Download className="w-4 h-4" /> Xuất Excel báo cáo chi tiết
        </button>
      )}
    </div>
  );
};

export default Dashboard;
