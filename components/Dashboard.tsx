
import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip as RechartsTooltip, Cell, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { Transaction, TransactionType, formatCurrency, Language, Branch, UserRole, ReportSettings, ExpenseSource, ALL_BRANCHES_ID, EXPENSE_SOURCE_LABELS } from '../types';
import { useTranslation } from '../i18n';
import { 
  AlertCircle, TrendingUp, Layers, ChevronLeft, ChevronRight, 
  Wallet, Banknote, CreditCard, Activity, 
  BarChart3, Zap, RefreshCcw,
  Smartphone, Receipt, PieChart, Target,
  FileSpreadsheet, Loader2, ArrowUpRight, ArrowDownRight,
  Calendar, Check, Info, ArrowRight
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
  const isSystemView = currentBranchId === ALL_BRANCHES_ID;
  const isAdmin = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN;

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

  const currentBranchName = useMemo(() => {
    if (isSystemView) return t('all_branches');
    return allowedBranches.find(b => b.id === currentBranchId)?.name || '---';
  }, [currentBranchId, allowedBranches, isSystemView, t]);

  const handleExportDashboard = () => {
    if (monthTransactions.length === 0) {
      alert(t('export_empty'));
      return;
    }
    setIsExporting(true);
    setTimeout(() => {
      try {
        const getBName = (id: string) => allowedBranches.find(b => b.id === id)?.name || 'N/A';
        const dailySheetData = dailyData.map(d => ({
          'Ngày': d.date,
          'Chi nhánh': currentBranchName,
          'Tổng doanh thu (€)': d.revenue,
          'Tiền mặt thu (€)': d.cashIn,
          'Thẻ/Bank (€)': d.cardIn,
          'Delivery/App (€)': d.appIn,
          'Chi tại quán (€)': d.shopOut,
          'Tiền mặt bàn giao (€)': d.netHandover
        }));
        const expenseSheetData = monthTransactions
          .filter(tx => tx.type === TransactionType.EXPENSE)
          .map(tx => ({
            'Ngày': tx.date,
            'Chi nhánh': getBName(tx.branchId),
            'Danh mục': tx.category,
            'Số tiền (€)': tx.amount,
            'Nguồn': tx.expenseSource ? EXPENSE_SOURCE_LABELS[tx.expenseSource] : (tx.isPaid === false ? 'Công nợ' : 'Khác'),
            'Chủ nợ (nếu có)': tx.debtorName || '',
            'Ghi chú': tx.note || ''
          }));
        const summarySheetData = [
          { 'Hạng mục': 'Chi nhánh', 'Giá trị': currentBranchName },
          { 'Hạng mục': 'Tháng báo cáo', 'Giá trị': currentMonth },
          { 'Hạng mục': 'Tổng doanh thu (€)', 'Giá trị': stats.totalIn },
          { 'Hạng mục': 'Tổng chi phí (€)', 'Giá trị': stats.totalOut },
          { 'Hạng mục': 'Lợi nhuận (€)', 'Giá trị': stats.profit },
          { 'Hạng mục': 'Tỷ suất lợi nhuận (%)', 'Giá trị': (stats.margin * 100).toFixed(2) + '%' },
          { 'Hạng mục': 'Tổng công nợ chưa trả (€)', 'Giá trị': stats.totalDebt }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheetData), "Tổng kết");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailySheetData), "Báo cáo doanh thu ngày");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseSheetData), "Danh sách chi phí");
        XLSX.writeFile(wb, `Tokymon_Report_${currentBranchName.replace(/\s+/g, '_')}_${currentMonth}.xlsx`);
      } catch (e) { alert("Lỗi khi xuất file!"); } finally { setIsExporting(false); }
    }, 500);
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500 max-w-2xl mx-auto px-1">
      {/* Date & Action Navigator */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 border dark:border-slate-800 shadow-sm flex items-center justify-between">
        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m - 2);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
        }} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl active:scale-95 transition-all text-slate-400 hover:text-indigo-500"><ChevronLeft className="w-5 h-5" /></button>
        
        <div className="text-center px-4 flex-1">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-sm font-black dark:text-white uppercase tracking-tight">{currentMonth.split('-')[1]} / {currentMonth.split('-')[0]}</span>
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{currentBranchName}</p>
        </div>

        <div className="flex items-center gap-1">
           {isAdmin && (
             <button onClick={onToggleGlobal} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl transition-colors text-slate-300">
               <RefreshCcw className="w-4 h-4" />
             </button>
           )}
           <button onClick={handleExportDashboard} disabled={isExporting} className="p-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl transition-colors text-emerald-500">
             {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
           </button>
           <button onClick={() => {
             const [y, m] = currentMonth.split('-').map(Number);
             const d = new Date(y, m);
             setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
           }} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl active:scale-95 transition-all text-slate-400 hover:text-indigo-500"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex gap-1.5 p-1.5 bg-slate-200/50 dark:bg-slate-950 rounded-3xl border dark:border-slate-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'OVERVIEW', label: 'Tổng quan', icon: Layers },
          { id: 'DAILY_REPORT', label: 'Báo cáo ngày', icon: Activity },
          { id: 'GENERAL_BALANCE', label: 'Dòng tiền', icon: PieChart },
          { id: 'LIABILITIES', label: 'Công nợ', icon: AlertCircle }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[85px] py-4 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1.5 ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-md border dark:border-slate-700' : 'text-slate-400 opacity-70'}`}>
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Main KPI Card */}
          <div className="bg-slate-900 dark:bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
             <div className="relative z-10 space-y-8">
               <div className="flex justify-between items-start">
                 <div className="space-y-1.5">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Doanh thu tháng</p>
                   <h2 className="text-5xl font-black tracking-tighter leading-none">{formatCurrency(stats.totalIn, lang)}</h2>
                 </div>
                 <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                    <Target className="w-7 h-7" />
                 </div>
               </div>

               <div className="grid grid-cols-3 gap-2">
                 <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[8px] font-black uppercase opacity-60 tracking-widest mb-1">Lợi nhuận</p>
                   <p className="text-base font-black tracking-tight flex items-center gap-1">
                      {formatCurrency(stats.profit, lang)}
                      {stats.profit >= 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                   </p>
                 </div>
                 <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[8px] font-black uppercase opacity-60 tracking-widest mb-1">Tỷ suất</p>
                   <p className="text-base font-black tracking-tight">{(stats.margin * 100).toFixed(1)}%</p>
                 </div>
                 <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[8px] font-black uppercase opacity-60 tracking-widest mb-1">Tổng chi</p>
                   <p className="text-base font-black tracking-tight text-rose-300">{formatCurrency(stats.totalOut, lang)}</p>
                 </div>
               </div>
             </div>
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          </div>

          {/* Daily Revenue Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border dark:border-slate-800 shadow-sm">
             <div className="flex justify-between items-center mb-6 px-1">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Biểu đồ doanh thu</h3>
                <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">{dailyData.length} Ngày ghi nhận</span>
             </div>
             <div className="h-[200px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={[...dailyData].reverse()}>
                   <defs>
                     <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis 
                     dataKey="day" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                     dy={10}
                   />
                   <YAxis hide />
                   <RechartsTooltip 
                     content={({ active, payload }) => {
                       if (active && payload && payload.length) {
                         return (
                           <div className="bg-slate-900 text-white p-2 rounded-xl border border-slate-800 shadow-xl">
                             <p className="text-[8px] font-black uppercase opacity-60 mb-1">Ngày {payload[0].payload.day}</p>
                             <p className="text-xs font-black">{formatCurrency(payload[0].value as number, lang)}</p>
                           </div>
                         );
                       }
                       return null;
                     }}
                   />
                   <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                   />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Distribution & Expenses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><PieChart className="w-4 h-4" /> Phân bổ</h3>
                </div>
                <div className="space-y-4">
                   {[
                     { label: 'Cash', val: stats.breakdown.cashIn, color: 'bg-emerald-500' },
                     { label: 'Card', val: stats.breakdown.cardIn, color: 'bg-indigo-500' },
                     { label: 'App', val: stats.breakdown.appIn, color: 'bg-orange-500' }
                   ].map(item => (
                     <div key={item.label} className="space-y-1.5">
                        <div className="flex justify-between items-end">
                           <span className="text-[10px] font-black text-slate-500 uppercase">{item.label}</span>
                           <span className="text-[11px] font-black dark:text-white">{formatCurrency(item.val, lang)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                           <div 
                            className={`h-full ${item.color} rounded-full`} 
                            style={{ width: `${stats.totalIn > 0 ? (item.val / stats.totalIn) * 100 : 0}%` }} 
                           />
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Top Chi Phí</h3>
                </div>
                <div className="space-y-4">
                  {stats.topCategories.map(cat => (
                    <div key={cat.name} className="space-y-1.5">
                       <div className="flex justify-between items-end">
                         <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase truncate max-w-[100px]">{cat.name}</span>
                         <span className="text-[11px] font-black dark:text-white">{formatCurrency(cat.value, lang)}</span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                         <div className="h-full bg-rose-500 rounded-full" style={{ width: `${cat.percentage}%` }} />
                       </div>
                    </div>
                  ))}
                  {stats.topCategories.length === 0 && <p className="text-center py-4 text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">Chưa có dữ liệu chi</p>}
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'DAILY_REPORT' && (
        <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
           {dailyData.map(d => (
             <div key={d.date} className="bg-white dark:bg-slate-900 rounded-[2rem] border dark:border-slate-800 shadow-sm overflow-hidden group">
                <div className="px-6 py-5 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center border-b dark:border-slate-800">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl flex flex-col items-center justify-center font-black shadow-md">
                         <span className="text-xl leading-none">{d.day}</span>
                         <span className="text-[7px] uppercase tracking-tighter opacity-60">{new Date(d.date).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'de-DE', {weekday: 'short'})}</span>
                      </div>
                      <div>
                         <p className="text-base font-black dark:text-white uppercase tracking-tighter">{formatCurrency(d.revenue, lang)}</p>
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tổng Doanh Thu</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-base font-black text-indigo-600 dark:text-indigo-400 leading-none">{formatCurrency(d.netHandover, lang)}</p>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Tiền bàn giao</p>
                   </div>
                </div>
                <div className="p-4 grid grid-cols-3 gap-3">
                   {[
                     { label: 'Tiền mặt', val: d.cashIn, icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
                     { label: 'Thẻ/Bank', val: d.cardIn, icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-50/50' },
                     { label: 'App/Online', val: d.appIn, icon: Smartphone, color: 'text-orange-500', bg: 'bg-orange-50/50' }
                   ].map(item => (
                     <div key={item.label} className={`flex flex-col items-center p-3 rounded-2xl ${item.bg} dark:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all`}>
                        <item.icon className={`w-4 h-4 ${item.color} mb-1.5`} />
                        <span className="text-xs font-black dark:text-white mb-0.5">{formatCurrency(item.val, lang)}</span>
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                     </div>
                   ))}
                </div>
             </div>
           ))}
           {dailyData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 opacity-30 text-center">
                 <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-slate-300" />
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em]">{t('no_data')}</p>
              </div>
           )}
        </div>
      )}

      {activeTab === 'GENERAL_BALANCE' && (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border dark:border-slate-800 shadow-sm text-center relative overflow-hidden">
            <div className="relative z-10">
               <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-[2rem] flex items-center justify-center mb-6 mx-auto">
                 <Wallet className="w-10 h-10" />
               </div>
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Tài sản lưu động</p>
               <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-12">{formatCurrency(balances.total, lang)}</h2>
               
               <div className="grid grid-cols-2 gap-4 pt-10 border-t dark:border-slate-800">
                  <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-[2rem] border dark:border-slate-800 group">
                     <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('cash_wallet')}</span>
                     </div>
                     <p className={`text-xl font-black tracking-tight ${balances.cash < 0 ? 'text-rose-500' : 'dark:text-white'}`}>{formatCurrency(balances.cash, lang)}</p>
                  </div>
                  <div className="p-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-[2rem] border dark:border-slate-800 group">
                     <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('bank_card')}</span>
                     </div>
                     <p className="text-xl font-black dark:text-white tracking-tight">{formatCurrency(balances.card, lang)}</p>
                  </div>
               </div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>
      )}

      {activeTab === 'LIABILITIES' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-rose-500 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden text-center group">
              <p className="text-[10px] font-black uppercase opacity-70 mb-2 tracking-[0.2em]">Tổng dư nợ NCC</p>
              <h2 className="text-5xl font-black tracking-tighter group-hover:scale-105 transition-transform duration-500">{formatCurrency(stats.totalDebt, lang)}</h2>
              <AlertCircle className="absolute -bottom-6 -right-6 w-32 h-32 opacity-10" />
           </div>
           
           <div className="space-y-3">
              {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).map(t_tx => (
                <div key={t_tx.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border dark:border-slate-800 flex items-center justify-between shadow-sm hover:border-rose-300 dark:hover:border-rose-900 transition-all">
                   <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <p className="text-sm font-black uppercase dark:text-white truncate">{t_tx.debtorName || 'NCC không xác định'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t_tx.date}</span>
                        <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-md uppercase">{t_tx.category}</span>
                      </div>
                   </div>
                   <div className="text-right shrink-0">
                      <p className="text-xl font-black text-rose-500">{formatCurrency(t_tx.amount, lang)}</p>
                      <button className="text-[8px] font-black uppercase text-white bg-slate-900 dark:bg-slate-800 px-3 py-1.5 rounded-xl mt-2 flex items-center gap-1.5 ml-auto active:scale-95 transition-all">Thanh toán <ArrowRight className="w-2.5 h-2.5" /></button>
                   </div>
                </div>
              ))}
              {stats.totalDebt === 0 && (
                <div className="flex flex-col items-center justify-center py-24 opacity-30 text-center">
                   <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/10 rounded-full flex items-center justify-center mb-4">
                      <Check className="w-10 h-10 text-emerald-500" />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sạch nợ tháng này</p>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
