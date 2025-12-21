
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
  PieChart as PieChartIcon, Table as TableIcon, Layers,
  Receipt, ArrowUpRight, ArrowDownRight,
  ShieldCheck, RefreshCw
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

  const growth = useMemo(() => {
    let prevIn = 0, prevOut = 0;
    prevMonthTransactions.forEach(tx => {
      if (tx.type === TransactionType.INCOME) prevIn += tx.amount || 0;
      else prevOut += tx.amount || 0;
    });
    const prevProfit = prevIn - prevOut;
    const calc = (cur: number, prev: number) => prev === 0 ? (cur > 0 ? 100 : 0) : ((cur - prev) / prev) * 100;
    return { revenue: calc(stats.totalIn, prevIn), profit: calc(stats.profit, prevProfit) };
  }, [stats, prevMonthTransactions]);

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

  return (
    <div className="space-y-5 pb-6">
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-2 border dark:border-slate-800 shadow-sm flex items-center justify-between">
        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m - 2);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
        }} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl active:scale-90 transition-all text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
        
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600">Tháng {currentMonth.split('-')[1]} • {currentMonth.split('-')[0]}</span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{viewMode === 'ALL' ? 'Toàn hệ thống' : (allowedBranches.find(b => b.id === currentBranchId)?.name)}</span>
        </div>

        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
        }} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl active:scale-90 transition-all text-slate-400"><ChevronRight className="w-4 h-4" /></button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'OVERVIEW', label: 'T.Quan', icon: Layers },
          { id: 'DAILY', label: 'Ngày', icon: TableIcon },
          { id: 'ASSETS', label: 'Vốn', icon: Wallet },
          { id: 'DEBT', label: 'Nợ', icon: AlertCircle }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all flex items-center gap-2 shrink-0 ${activeTab === tab.id ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-md' : 'bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-400'}`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-600 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden group h-32 flex flex-col justify-between">
               <div className="relative z-10">
                 <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">Doanh thu</p>
                 <h2 className="text-xl font-black tracking-tight">{formatCurrency(stats.totalIn)}</h2>
               </div>
               <div className={`relative z-10 inline-flex items-center gap-1 text-[8px] font-black ${growth.revenue >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                 {growth.revenue >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                 {Math.abs(growth.revenue).toFixed(0)}%
               </div>
               <Banknote className="absolute -right-4 -bottom-4 w-16 h-16 text-white/10 -rotate-12" />
            </div>

            <div className="bg-emerald-600 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden group h-32 flex flex-col justify-between">
               <div className="relative z-10">
                 <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">Lợi nhuận</p>
                 <h3 className="text-xl font-black tracking-tight">{formatCurrency(stats.profit)}</h3>
               </div>
               <div className="relative z-10 text-[8px] font-black text-emerald-100">
                  LN/DT: {(stats.profit / (stats.totalIn || 1) * 100).toFixed(0)}%
               </div>
               <TrendingUp className="absolute -right-4 -bottom-4 w-16 h-16 text-white/10" />
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border dark:border-slate-800 flex items-center gap-3">
               <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600"><Banknote className="w-4 h-4" /></div>
               <div>
                  <p className="text-[7px] font-black uppercase text-slate-400">TM Shop</p>
                  <p className="text-[11px] font-black dark:text-white leading-none">{formatCurrency(stats.cashIn)}</p>
               </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border dark:border-slate-800 flex items-center gap-3">
               <div className="w-8 h-8 bg-rose-50 dark:bg-rose-900/30 rounded-lg flex items-center justify-center text-rose-600"><Receipt className="w-4 h-4" /></div>
               <div>
                  <p className="text-[7px] font-black uppercase text-slate-400">Tổng chi</p>
                  <p className="text-[11px] font-black dark:text-white leading-none">{formatCurrency(stats.totalOut)}</p>
               </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border dark:border-slate-800 shadow-sm">
             <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0"><MessageSquare className="w-6 h-6" /></div>
                <div className="flex-1">
                   <h3 className="text-xs font-black dark:text-white uppercase leading-none mb-1">AI Advisor</h3>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Phân tích tháng {currentMonth.split('-')[1]}</p>
                </div>
                {aiAnalysis ? (
                  // Add missing RefreshCw import usage correctly
                  <button onClick={handleAiAnalysis} disabled={isAnalyzing} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} /></button>
                ) : (
                  <button onClick={handleAiAnalysis} disabled={isAnalyzing} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[8px] font-black uppercase">Start</button>
                )}
             </div>
             {aiAnalysis && (
               <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-l-2 border-indigo-600">
                 <p className="text-[10px] font-bold italic text-slate-700 dark:text-slate-300">"{aiAnalysis}"</p>
               </div>
             )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 border dark:border-slate-800 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-[9px] font-black uppercase tracking-wider text-slate-400">Biểu đồ dòng tiền</h3>
                <div className="flex gap-2">
                   <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-600" /><span className="text-[7px] font-bold">DT</span></div>
                   <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[7px] font-bold">TM</span></div>
                </div>
             </div>
             <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.1} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 800, fill: '#94a3b8'}} />
                      <YAxis hide />
                      <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontSize: '10px' }} formatter={(v: any) => formatCurrency(v)} />
                      <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={0.1} fill="#6366f1" />
                      <Area type="monotone" dataKey="netCash" stroke="#10b981" strokeWidth={3} fillOpacity={0.1} fill="#10b981" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'DAILY' && (
        <div className="space-y-2 animate-in fade-in duration-300">
           {dailyData.slice().reverse().map(d => (
             <div key={d.date} className="bg-white dark:bg-slate-900 p-3 rounded-2xl border dark:border-slate-800 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-[7px] font-black uppercase opacity-50">{new Date(d.date).toLocaleDateString('vi-VN', {weekday: 'short'})}</span>
                      <span className="text-sm font-black mt-0.5">{d.day}</span>
                   </div>
                   <div>
                      <p className="text-[11px] font-black dark:text-white uppercase leading-none">{formatCurrency(d.revenue)}</p>
                      <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">TM: {formatCurrency(d.netCash)}</p>
                   </div>
                </div>
                <div className="text-right">
                   <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${d.profit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      LN: {formatCurrency(d.profit)}
                   </span>
                </div>
             </div>
           ))}
        </div>
      )}

      {activeTab === 'ASSETS' && (
        <div className="space-y-4 animate-in zoom-in-95 duration-300">
          {!assetStats ? (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6">Vui lòng chọn 1 chi nhánh</p>
            </div>
          ) : (
            <>
               <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Tiền mặt tại quán</p>
                    <h2 className="text-3xl font-black tracking-tighter">{formatCurrency(assetStats.cash)}</h2>
                  </div>
                  <Banknote className="w-10 h-10 opacity-20" />
               </div>
               <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-md flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Số dư ngân hàng</p>
                    <h2 className="text-3xl font-black tracking-tighter">{formatCurrency(assetStats.bank)}</h2>
                  </div>
                  <CreditCard className="w-10 h-10 opacity-20" />
               </div>
               <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border dark:border-slate-800 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng cộng (Flow)</p>
                  <h3 className="text-xl font-black dark:text-white">{formatCurrency(assetStats.total)}</h3>
               </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'DEBT' && (
        <div className="space-y-4 animate-in fade-in duration-300">
           <div className="bg-rose-600 rounded-3xl p-6 text-white shadow-md flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Nợ NCC tháng này</p>
                <h2 className="text-3xl font-black tracking-tighter">{formatCurrency(stats.totalDebt)}</h2>
              </div>
              <Receipt className="w-10 h-10 opacity-20" />
           </div>

           <div className="space-y-2">
              {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).map(t => (
                <div key={t.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 shadow-sm flex items-center justify-between">
                   <div className="flex-1 min-w-0 pr-3">
                      <p className="text-xs font-black uppercase truncate dark:text-white">{t.debtorName || 'N/A'}</p>
                      <p className="text-[8px] font-bold text-slate-400 mt-0.5">{t.date} • {t.category}</p>
                   </div>
                   <div className="text-right shrink-0">
                      <p className="text-sm font-black text-rose-600 leading-none">{formatCurrency(t.amount)}</p>
                   </div>
                </div>
              ))}
              {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).length === 0 && (
                <div className="py-10 text-center text-slate-400 text-[10px] font-black uppercase">Không có nợ</div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
