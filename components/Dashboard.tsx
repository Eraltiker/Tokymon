
import React, { useMemo, useState } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, Language } from '../types';
import { useTranslation } from '../i18n';
import { 
  XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area, CartesianGrid
} from 'recharts';
import { 
  Download, Layers, ChevronRight, ChevronLeft,
  AlertCircle, TrendingUp, Banknote,
  TrendingDown, CreditCard, Wallet, History,
  Table as TableIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface DashboardProps {
  transactions: Transaction[];
  initialBalances: { cash: number; card: number };
  lang: Language;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, initialBalances, lang }) => {
  const t = useTranslation(lang);
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DAILY' | 'ASSETS' | 'DEBT'>('OVERVIEW');

  const { monthTransactions, prevMonthTransactions } = useMemo(() => {
    const [y, m] = currentMonth.split('-').map(Number);
    const dPrev = new Date(y, m - 2, 1);
    const prevStr = `${dPrev.getFullYear()}-${(dPrev.getMonth() + 1).toString().padStart(2, '0')}`;
    return {
      monthTransactions: transactions.filter(tx => tx.date.startsWith(currentMonth)),
      prevMonthTransactions: transactions.filter(tx => tx.date.startsWith(prevStr))
    };
  }, [transactions, currentMonth]);

  const calculateStats = (txs: Transaction[]) => {
    let totalIn = 0, totalOut = 0, totalDebt = 0, cashIn = 0, cardIn = 0;
    txs.forEach(tx => {
      if (tx.type === TransactionType.INCOME) {
        totalIn += tx.amount;
        if (tx.incomeBreakdown) {
          cashIn += tx.incomeBreakdown.cash;
          cardIn += tx.incomeBreakdown.card;
        } else {
          cashIn += tx.amount;
        }
      } else {
        totalOut += tx.amount;
        if (tx.isPaid === false) totalDebt += tx.amount;
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

  const assetStats = useMemo(() => {
    let cash = initialBalances.cash;
    let bank = initialBalances.card;

    transactions.forEach(tx => {
      if (tx.type === TransactionType.INCOME) {
        if (tx.incomeBreakdown) {
          cash += tx.incomeBreakdown.cash;
          bank += tx.incomeBreakdown.card;
        } else {
          cash += tx.amount;
        }
      } else {
        if (tx.isPaid !== false) {
          if (tx.expenseSource === ExpenseSource.SHOP_CASH) cash -= tx.amount;
          else if (tx.expenseSource === ExpenseSource.CARD) bank -= tx.amount;
        }
      }
    });
    return { cash, bank, total: cash + bank };
  }, [transactions, initialBalances]);

  const dailyData = useMemo(() => {
    const dayMap: Record<string, any> = {};
    monthTransactions.forEach(tx => {
      if (!dayMap[tx.date]) dayMap[tx.date] = { revenue: 0, expense: 0, cashIn: 0, cardIn: 0, cashOut: 0 };
      if (tx.type === TransactionType.INCOME) {
        dayMap[tx.date].revenue += tx.amount;
        if (tx.incomeBreakdown) {
          dayMap[tx.date].cashIn += tx.incomeBreakdown.cash;
          dayMap[tx.date].cardIn += tx.incomeBreakdown.card;
        } else dayMap[tx.date].cashIn += tx.amount;
      } else {
        dayMap[tx.date].expense += tx.amount;
        if (tx.expenseSource === ExpenseSource.SHOP_CASH && tx.isPaid !== false) dayMap[tx.date].cashOut += tx.amount;
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

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(dailyData.map(d => ({
      "Ngày": d.date, "Doanh Thu": d.revenue, "Tiền Mặt": d.cashIn, "Thẻ": d.cardIn, "Tiền Mặt Rút": d.netCash, "Lợi Nhuận": d.profit
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `Tokymon_Report_${currentMonth}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex p-1 bg-white dark:bg-slate-900 rounded-[1.2rem] border dark:border-slate-800 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'OVERVIEW', label: 'Tổng quan', icon: Layers },
            { id: 'DAILY', label: 'Ngày', icon: TableIcon },
            { id: 'ASSETS', label: 'Vốn', icon: Wallet },
            { id: 'DEBT', label: 'Nợ', icon: AlertCircle },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-[1rem] font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
        
        {activeTab !== 'ASSETS' && (
          <div className="flex items-center gap-2 w-full md:w-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-1 items-center bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl p-1 shadow-sm">
              <button onClick={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const dPrev = new Date(y, m - 2);
                setCurrentMonth(`${dPrev.getFullYear()}-${(dPrev.getMonth() + 1).toString().padStart(2, '0')}`);
              }} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"><ChevronLeft className="w-4 h-4" /></button>
              <span className="flex-1 text-center font-black text-xs uppercase px-2 tracking-tighter min-w-[80px]">{currentMonth}</span>
              <button onClick={() => {
                const [y, m] = currentMonth.split('-').map(Number);
                const dNext = new Date(y, m);
                setCurrentMonth(`${dNext.getFullYear()}-${(dNext.getMonth() + 1).toString().padStart(2, '0')}`);
              }} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <button onClick={handleExport} className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all"><Download className="w-5 h-5" /></button>
          </div>
        )}
      </div>

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl flex flex-col justify-between h-40">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('revenue_total')}</p>
              <h3 className="text-2xl font-black">{formatCurrency(stats.totalIn)}</h3>
              <div className="flex items-center gap-1 text-[10px] font-black text-white/80">
                {growth.revenue >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(growth.revenue).toFixed(1)}% {t('growth')}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border dark:border-slate-800 shadow-sm flex flex-col justify-between h-40">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('cash_on_hand')}</p>
              <h3 className="text-2xl font-black text-emerald-600">{formatCurrency(stats.cashIn)}</h3>
              <div className="text-[9px] font-bold text-slate-400 uppercase">Tiền mặt cần rút tại quán</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border dark:border-slate-800 shadow-sm flex flex-col justify-between h-40">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('card_income')}</p>
              <h3 className="text-2xl font-black text-indigo-500">{formatCurrency(stats.cardIn)}</h3>
              <div className="text-[9px] font-bold text-slate-400 uppercase">Tổng doanh thu qua thẻ</div>
            </div>
            <div className="bg-emerald-500 p-6 rounded-[2rem] text-white shadow-xl flex flex-col justify-between h-40">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('profit_total')}</p>
              <h3 className="text-2xl font-black">{formatCurrency(stats.profit)}</h3>
              <div className="text-[9px] font-black uppercase opacity-80">Tỷ suất: {(stats.profit / (stats.totalIn || 1) * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm">
               <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2"><History className="w-4 h-4 text-indigo-500" /> Biểu đồ doanh thu</h3>
               <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={[...dailyData].reverse()}>
                        <defs>
                          <linearGradient id="colRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.2} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                        <YAxis hide />
                        <RechartsTooltip />
                        <Area type="monotone" dataKey="revenue" name="Doanh Thu" stroke="#6366f1" fillOpacity={1} fill="url(#colRev)" strokeWidth={3} />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
            
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl flex flex-col justify-between">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{t('assets_report')}</p>
                  <div className="grid grid-cols-2 gap-8 mt-4">
                     <div>
                        <span className="text-[9px] font-black uppercase text-slate-500 block">Tiền Mặt</span>
                        <span className="text-2xl font-black text-emerald-400">{formatCurrency(assetStats.cash)}</span>
                     </div>
                     <div>
                        <span className="text-[9px] font-black uppercase text-slate-500 block">Ngân Hàng (Bank)</span>
                        <span className="text-2xl font-black text-indigo-400">{formatCurrency(assetStats.bank)}</span>
                     </div>
                  </div>
               </div>
               <div className="mt-8 pt-8 border-t border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-500 block">TỔNG NGUỒN TIỀN</span>
                    <span className="text-3xl font-black text-amber-400">{formatCurrency(assetStats.total)}</span>
                  </div>
                  <Wallet className="w-12 h-12 opacity-20" />
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'DAILY' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border dark:border-slate-800 overflow-hidden shadow-sm">
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right text-[11px]">
                 <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black uppercase tracking-widest border-b dark:border-slate-800">
                       <th className="px-6 py-4 text-center">Ngày</th>
                       <th className="px-6 py-4">Tổng Thu</th>
                       <th className="px-6 py-4 text-indigo-500">Tổng Thẻ</th>
                       <th className="px-6 py-4 text-emerald-600 font-black">TM CẦN RÚT</th>
                       <th className="px-6 py-4">Lợi Nhuận</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y dark:divide-slate-800">
                    {dailyData.map(day => (
                       <tr key={day.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-black text-center">{day.day}</td>
                          <td className="px-6 py-4 font-bold">{formatCurrency(day.revenue)}</td>
                          <td className="px-6 py-4 font-bold text-indigo-500">{formatCurrency(day.cardIn)}</td>
                          <td className="px-6 py-4 font-black text-emerald-600 bg-emerald-50/20">{formatCurrency(day.netCash)}</td>
                          <td className={`px-6 py-4 font-black ${day.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(day.profit)}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {activeTab === 'ASSETS' && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="mb-6">
            <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800 dark:text-white">{t('assets_report')}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số dư thực tế tích lũy của chi nhánh</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[
               { title: 'Tiền mặt tại Shop', val: assetStats.cash, color: 'text-emerald-600', icon: Banknote },
               { title: 'Số dư Ngân hàng (Bank)', val: assetStats.bank, color: 'text-indigo-600', icon: CreditCard },
               { title: 'Tổng tài sản hiện có', val: assetStats.total, color: 'text-indigo-600', icon: Wallet, highlight: true }
             ].map((asset, i) => (
               <div key={i} className={`p-8 rounded-[2rem] shadow-sm border dark:border-slate-800 flex flex-col justify-between h-44 ${asset.highlight ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200' : 'bg-white dark:bg-slate-900'}`}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{asset.title}</p>
                    <h2 className={`text-2xl font-black ${asset.color}`}>{formatCurrency(asset.val)}</h2>
                  </div>
                  <asset.icon className={`w-8 h-8 opacity-20 self-end ${asset.color}`} />
               </div>
             ))}
          </div>
        </div>
      )}

      {activeTab === 'DEBT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 lg:col-span-2 overflow-hidden shadow-sm h-fit">
              <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-widest">Nợ nhà cung cấp chưa trả</h3><AlertCircle className="w-5 h-5 text-rose-500" /></div>
              <div className="divide-y dark:divide-slate-800">
                {monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).length === 0 ? <div className="p-20 text-center text-slate-400 italic">Không có khoản nợ nào.</div> : 
                  monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE && tx.isPaid === false).map(t => (
                    <div key={t.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="space-y-1"><p className="font-black text-slate-800 dark:text-slate-100">{t.debtorName || 'N/A'}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.category} • {t.date}</p></div>
                      <div className="text-right"><p className="text-lg font-black text-rose-600">{formatCurrency(t.amount)}</p><span className="text-[9px] font-black uppercase bg-amber-100 text-amber-600 px-3 py-1 rounded-full">Chưa trả</span></div>
                    </div>
                  ))}
              </div>
           </div>
           <div className="bg-rose-600 rounded-[2.5rem] p-8 text-white shadow-xl h-fit">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Tổng nợ trong tháng</p>
              <h2 className="text-3xl font-black">{formatCurrency(stats.totalDebt)}</h2>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
