
import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, formatCurrency, Language, Branch, UserRole, ReportSettings, ExpenseSource } from '../types';
import { useTranslation } from '../i18n';
import { 
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { 
  AlertCircle, TrendingUp, Calendar,
  Layers, ChevronLeft, ChevronRight, 
  CheckCircle2, 
  Wallet, Banknote, CreditCard, Activity, ArrowUpRight, ArrowDownRight
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

const Dashboard: React.FC<DashboardProps> = ({ transactions, initialBalances, lang, currentBranchId, allowedBranches, userRole, reportSettings }) => {
  const t = useTranslation(lang);
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DAILY_REPORT' | 'LIABILITIES'>('OVERVIEW');
  const isAdmin = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN;
  // Prioritize single branch view as requested
  const [viewMode, setViewMode] = useState<'SINGLE' | 'ALL'>('SINGLE');

  const filteredTransactions = useMemo(() => {
    if (viewMode === 'ALL' && isAdmin) return transactions;
    return transactions.filter(tx => tx.branchId === currentBranchId);
  }, [transactions, viewMode, currentBranchId, isAdmin]);

  const { monthTransactions } = useMemo(() => {
    return {
      monthTransactions: filteredTransactions.filter(tx => tx.date.startsWith(currentMonth) && !tx.deletedAt)
    };
  }, [filteredTransactions, currentMonth]);

  const stats = useMemo(() => {
    let totalIn = 0, totalOut = 0, totalDebt = 0;
    let cashRevenue = 0, digitalIn = 0;
    let shopCashExpenses = 0;
    let walletExpenses = 0;
    
    monthTransactions.forEach(tx => {
      if (tx.type === TransactionType.INCOME) {
        totalIn += tx.amount || 0;
        if (tx.incomeBreakdown) {
          cashRevenue += tx.incomeBreakdown.cash || 0;
          digitalIn += (tx.incomeBreakdown.card || 0);
        } else {
          cashRevenue += tx.amount || 0;
        }
      } else {
        totalOut += tx.amount || 0;
        if (tx.isPaid === false) totalDebt += tx.amount || 0;
        if (tx.expenseSource === ExpenseSource.SHOP_CASH) shopCashExpenses += tx.amount || 0;
        if (tx.expenseSource === ExpenseSource.WALLET) walletExpenses += tx.amount || 0;
      }
    });

    const profit = totalIn - totalOut;
    const margin = totalIn > 0 ? profit / totalIn : 0;
    const netCashHandover = Math.max(0, cashRevenue - shopCashExpenses);

    return { totalIn, totalOut, totalDebt, cashRevenue, digitalIn, shopCashExpenses, walletExpenses, netCashHandover, profit, margin };
  }, [monthTransactions]);

  const dailyData = useMemo(() => {
    const dayMap: Record<string, any> = {};
    monthTransactions.forEach(tx => {
      if (!dayMap[tx.date]) dayMap[tx.date] = { revenue: 0, cashInflow: 0, digitalIn: 0, shopExpenses: 0, walletExpenses: 0 };
      
      if (tx.type === TransactionType.INCOME) {
        dayMap[tx.date].revenue += tx.amount || 0;
        if (tx.incomeBreakdown) {
          dayMap[tx.date].cashInflow += tx.incomeBreakdown.cash || 0;
          dayMap[tx.date].digitalIn += (tx.incomeBreakdown.card || 0);
        }
      } else if (tx.type === TransactionType.EXPENSE) {
        if (tx.expenseSource === ExpenseSource.SHOP_CASH) dayMap[tx.date].shopExpenses += tx.amount || 0;
        if (tx.expenseSource === ExpenseSource.WALLET) dayMap[tx.date].walletExpenses += tx.amount || 0;
      }
    });
    return Object.entries(dayMap).map(([date, data]: any) => {
      return {
        date, 
        day: date.split('-')[2], 
        ...data,
        netHandover: Math.max(0, data.cashInflow - data.shopExpenses)
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [monthTransactions]);

  const paymentData = [
    { name: 'Thực tế bàn giao', value: stats.netCashHandover, color: '#10b981' },
    { name: 'Đã chi tiền mặt', value: stats.shopCashExpenses, color: '#f43f5e' },
    { name: 'Thanh toán thẻ', value: stats.digitalIn, color: '#6366f1' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Month Selection Header */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 border dark:border-slate-800 shadow-sm flex items-center justify-between">
        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m - 2);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
        }} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl active:scale-90"><ChevronLeft className="w-5 h-5" /></button>
        
        <div className="text-center">
          <span className="text-sm font-black dark:text-white uppercase tracking-tight">Tháng {currentMonth.split('-')[1]} / {currentMonth.split('-')[0]}</span>
          {isAdmin && (
            <button onClick={() => setViewMode(viewMode === 'ALL' ? 'SINGLE' : 'ALL')} className="block mx-auto mt-1 text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/50 px-2 py-0.5 rounded-full">
              {viewMode === 'ALL' ? 'Toàn Hệ Thống' : 'Chi Nhánh Này'}
            </button>
          )}
        </div>

        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
        }} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl active:scale-90"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {/* Tabs Professional Style */}
      <div className="flex gap-2 p-1.5 bg-slate-200/50 dark:bg-slate-950 rounded-[1.5rem] border dark:border-slate-800">
        {[
          { id: 'OVERVIEW', label: 'Tháng', icon: Layers },
          { id: 'DAILY_REPORT', label: 'Bàn Giao', icon: Activity },
          { id: 'LIABILITIES', label: 'Công Nợ', icon: AlertCircle }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg' : 'text-slate-500'}`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 gap-4">
             <div className="bg-slate-900 dark:bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Tổng Doanh Thu Tháng</p>
                <h2 className="text-5xl font-black tracking-tighter">{formatCurrency(stats.totalIn)}</h2>
                <TrendingUp className="w-32 h-32 opacity-10 absolute -right-6 -bottom-6" />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border dark:border-slate-800">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Lợi nhuận dự tính</p>
                   <p className={`text-2xl font-black ${stats.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(stats.profit)}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border dark:border-slate-800">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tỷ suất (%)</p>
                   <p className="text-2xl font-black dark:text-white leading-none">{(stats.margin * 100).toFixed(1)}%</p>
                </div>
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border dark:border-slate-800">
             <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] mb-10 text-center">Cấu trúc dòng tiền thu vào</h3>
             <div className="flex flex-col items-center gap-8">
                <div className="w-full h-48">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={paymentData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                            {paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                         </Pie>
                      </PieChart>
                   </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-6 w-full px-4">
                   {paymentData.map(item => (
                     <div key={item.name} className="flex flex-col border-l-4 pl-4" style={{borderColor: item.color}}>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.name}</span>
                        <span className="text-lg font-black dark:text-white">{formatCurrency(item.value)}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'DAILY_REPORT' && (
        <div className="space-y-4 animate-in slide-in-from-right-4">
           <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl flex items-center justify-between border border-indigo-100 dark:border-indigo-800/50">
              <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Đối soát két & ví</span>
              <Activity className="w-4 h-4 text-indigo-400" />
           </div>

           <div className="space-y-4">
              {dailyData.slice().reverse().map(d => (
                <div key={d.date} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border-2 border-slate-50 dark:border-slate-800 shadow-sm">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-[1.25rem] flex flex-col items-center justify-center font-black">
                            <span className="text-xl leading-none">{d.day}</span>
                            <span className="text-[8px] uppercase">{new Date(d.date).toLocaleDateString('vi-VN', {weekday: 'short'})}</span>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng doanh thu</p>
                            <p className="text-xl font-black dark:text-white tracking-tight">{formatCurrency(d.revenue)}</p>
                         </div>
                      </div>

                      <div className="text-right">
                         <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Cần bàn giao</p>
                         <p className="text-2xl font-black text-emerald-500 tracking-tighter leading-none">{formatCurrency(d.netHandover)}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 pt-6 border-t-2 border-slate-50 dark:border-slate-800/50">
                      <div className="space-y-3">
                         <div className="flex items-center gap-2">
                            <Banknote className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-[9px] font-black text-slate-400 uppercase">Dòng tiền mặt</span>
                         </div>
                         <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                               <span className="text-slate-500">Thu TM (Kasse):</span>
                               <span className="text-indigo-600">+{formatCurrency(d.cashInflow)}</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-bold">
                               <span className="text-rose-500">Đã chi tại quầy:</span>
                               <span className="text-rose-500">-{formatCurrency(d.shopExpenses)}</span>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <div className="flex items-center gap-2">
                            <Wallet className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase">Các nguồn khác</span>
                         </div>
                         <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                               <span className="text-indigo-500">Quẹt thẻ:</span>
                               <span>{formatCurrency(d.digitalIn)}</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-bold">
                               <span className="text-orange-500">Chi từ ví tổng:</span>
                               <span className="text-orange-500">-{formatCurrency(d.walletExpenses)}</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              ))}
              {dailyData.length === 0 && (
                <div className="py-24 text-center text-slate-300 uppercase text-[11px] font-black tracking-[0.2em]">Chưa có dữ liệu giao dịch</div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'LIABILITIES' && (
        <div className="space-y-4 animate-in slide-in-from-left-4">
           <div className="bg-rose-500 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
              <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">Tổng công nợ NCC tồn đọng</p>
              <h2 className="text-4xl font-black tracking-tighter">{formatCurrency(stats.totalDebt)}</h2>
              <AlertCircle className="w-20 h-20 opacity-10 absolute right-4 top-1/2 -translate-y-1/2" />
           </div>

           <div className="space-y-3">
              {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).map(t => (
                <div key={t.id} className="bg-white dark:bg-slate-900 p-6 rounded-[1.5rem] border dark:border-slate-800 flex items-center justify-between shadow-sm">
                   <div>
                      <p className="text-base font-black uppercase dark:text-white leading-tight">{t.debtorName || 'N/A'}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">{t.date} • {t.category}</p>
                   </div>
                   <p className="text-xl font-black text-rose-500">{formatCurrency(t.amount)}</p>
                </div>
              ))}
              {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).length === 0 && (
                <div className="py-24 text-center opacity-20">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-6" />
                  <p className="text-[11px] font-black uppercase tracking-widest">Không có công nợ tồn đọng</p>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
