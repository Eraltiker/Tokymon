
import React, { useMemo, useState } from 'react';
import { 
  Transaction, TransactionType, formatCurrency, Language, Branch, 
  UserRole, ReportSettings, ExpenseSource 
} from '../types';
import { useTranslation } from '../i18n';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  AlertCircle, ChevronLeft, ChevronRight, 
  Wallet, Activity, Target, Loader2,
  Banknote, Calculator,
  MinusCircle, PlusCircle, TrendingUp, TrendingDown,
  Info, CheckCircle2, PieChart as PieIcon, BarChart3,
  ArrowUpRight, ArrowDownRight, Briefcase, Zap, CreditCard,
  ShoppingBag, DollarSign, Percent, Coins
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

type DashboardTab = 'DAILY' | 'MONTHLY' | 'WALLET' | 'LIABILITIES';

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  lang, 
  currentBranchId, 
  allowedBranches, 
}) => {
  const { t, translateCategory } = useTranslation(lang);
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  
  const [activeTab, setActiveTab] = useState<DashboardTab>('MONTHLY');

  // Lấy dữ liệu CHỈ CỦA CHI NHÁNH ĐANG CHỌN
  const branchTransactions = useMemo(() => {
    return transactions.filter(tx => !tx.deletedAt && tx.branchId === currentBranchId);
  }, [transactions, currentBranchId]);

  const monthTransactions = useMemo(() => {
    return branchTransactions.filter(tx => tx.date.startsWith(currentMonth));
  }, [branchTransactions, currentMonth]);

  // Xử lý dữ liệu ngày
  const dailyData = useMemo(() => {
    const dayMap: Record<string, any> = {};
    monthTransactions.forEach(tx => {
      if (!dayMap[tx.date]) {
        dayMap[tx.date] = { 
          date: tx.date, totalRev: 0, cardSales: 0, appSales: 0, shopOut: 0, coinSum: 0 
        };
      }
      const data = dayMap[tx.date];
      if (tx.type === TransactionType.INCOME) {
        data.totalRev += tx.amount || 0;
        if (tx.incomeBreakdown) {
          data.cardSales += tx.incomeBreakdown.card || 0;
          data.appSales += tx.incomeBreakdown.delivery || 0;
          data.coinSum += tx.incomeBreakdown.coins || 0;
        }
      } else if (tx.expenseSource === ExpenseSource.SHOP_CASH) {
        data.shopOut += tx.amount || 0;
      }
    });

    return Object.values(dayMap).map((data: any) => {
      // Tiền mặt tại két (trước khi trừ chi phí) = (Doanh thu - App - Thẻ)
      // Thực tế Tokymon dùng công thức (Kasse - Thẻ + App) nhưng logic nhập là (Doanh thu = Kasse + App)
      // Vậy Tiền mặt thực = (Doanh thu - App) - Thẻ + App = Doanh thu - Thẻ.
      // Tuy nhiên dựa trên TransactionForm: actualCashAtKasse = (kasseTotal + appTotal - cardTotal)
      const cashAtKasse = (data.totalRev - data.cardSales); 
      const netHandover = cashAtKasse - data.shopOut;

      return {
        ...data,
        day: data.date.split('-')[2],
        cashAtKasse,
        netHandover
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [monthTransactions]);

  // Tổng kết tháng & Biểu đồ
  const monthlySummary = useMemo(() => {
    const totalRev = monthTransactions.reduce((acc, tx) => acc + (tx.type === TransactionType.INCOME ? tx.amount : 0), 0);
    const totalExp = monthTransactions.reduce((acc, tx) => acc + (tx.type === TransactionType.EXPENSE ? tx.amount : 0), 0);
    const totalHandover = dailyData.reduce((acc, d) => acc + d.netHandover, 0);
    const profit = totalRev - totalExp;
    const margin = totalRev > 0 ? (profit / totalRev) * 100 : 0;
    
    // Doanh thu theo ngày (Bar Chart)
    const barChartData = dailyData.map(d => ({ day: d.day, value: d.totalRev })).sort((a, b) => a.day.localeCompare(b.day));

    // Phân bổ chi phí (Pie Chart)
    const expenseMap: Record<string, number> = {};
    monthTransactions.filter(tx => tx.type === TransactionType.EXPENSE).forEach(tx => {
      expenseMap[tx.category] = (expenseMap[tx.category] || 0) + tx.amount;
    });
    const pieChartData = Object.entries(expenseMap).map(([name, value]) => ({ 
      name: translateCategory(name), 
      value 
    })).sort((a, b) => b.value - a.value);

    return { totalRev, totalExp, totalHandover, profit, margin, barChartData, pieChartData };
  }, [monthTransactions, dailyData, translateCategory]);

  const currentBranch = useMemo(() => allowedBranches.find(b => b.id === currentBranchId), [allowedBranches, currentBranchId]);
  const branchColor = currentBranch?.color || '#6366f1';

  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6 pb-40 animate-ios max-w-5xl mx-auto px-1 sm:px-4">
      {/* Month Navigator */}
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2.5rem] p-4 border border-white dark:border-slate-800 shadow-soft flex items-center justify-between">
        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m - 2);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
        }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 active-scale"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Kỳ báo cáo tháng</p>
          <span className="text-sm font-black dark:text-white uppercase tracking-widest">{currentMonth.split('-')[1]} / {currentMonth.split('-')[0]}</span>
        </div>
        <button onClick={() => {
          const [y, m] = currentMonth.split('-').map(Number);
          const d = new Date(y, m);
          setCurrentMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
        }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 active-scale"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {/* Tabs Menu */}
      <div className="flex p-1.5 bg-slate-200/40 dark:bg-slate-950/40 rounded-[2rem] border border-white/20 dark:border-slate-800/50 sticky top-20 z-40 backdrop-blur-md">
        {[
          { id: 'MONTHLY', label: 'Tháng', icon: BarChart3 },
          { id: 'DAILY', label: 'Ngày', icon: Activity },
          { id: 'WALLET', label: 'Quỹ Quán', icon: Wallet },
          { id: 'LIABILITIES', label: 'Công Nợ', icon: AlertCircle },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-2 rounded-[1.6rem] text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-premium' : 'text-slate-500'}`}
          >
            <tab.icon className="w-4 h-4" /> <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'MONTHLY' && (
        <div className="space-y-6 animate-ios">
          {/* Monthly KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-ios relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><ShoppingBag className="w-12 h-12" /></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Doanh Thu Z-Bon</p>
                <h3 className="text-xl font-black dark:text-white tracking-tighter">{formatCurrency(monthlySummary.totalRev, lang)}</h3>
                <div className="mt-4 flex items-center gap-1.5 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 w-fit px-2 py-0.5 rounded-lg">
                   <TrendingUp className="w-3 h-3" />
                   <span className="text-[8px] font-black uppercase">Chỉ số nguồn thu</span>
                </div>
             </div>
             
             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-ios relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><DollarSign className="w-12 h-12" /></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Chi Phí Tổng</p>
                <h3 className="text-xl font-black text-rose-500 tracking-tighter">{formatCurrency(monthlySummary.totalExp, lang)}</h3>
                <div className="mt-4 flex items-center gap-1.5 text-rose-400 bg-rose-50 dark:bg-rose-900/10 w-fit px-2 py-0.5 rounded-lg">
                   <TrendingDown className="w-3 h-3" />
                   <span className="text-[8px] font-black uppercase">Tổng các nguồn chi</span>
                </div>
             </div>

             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-ios relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><Briefcase className="w-12 h-12" /></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lợi Nhuận Net</p>
                <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{formatCurrency(monthlySummary.profit, lang)}</h3>
                <div className="mt-4 flex items-center gap-1.5 text-indigo-400 bg-indigo-50 dark:bg-indigo-900/10 w-fit px-2 py-0.5 rounded-lg">
                   <Percent className="w-3 h-3" />
                   <span className="text-[8px] font-black uppercase">{monthlySummary.margin.toFixed(1)}% Marge</span>
                </div>
             </div>

             <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-ios relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity"><Zap className="w-12 h-12" /></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tiền Bàn Giao</p>
                <h3 className="text-xl font-black text-emerald-600 tracking-tighter">{formatCurrency(monthlySummary.totalHandover, lang)}</h3>
                <div className="mt-4 flex items-center gap-1.5 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 w-fit px-2 py-0.5 rounded-lg">
                   <CheckCircle2 className="w-3 h-3" />
                   <span className="text-[8px] font-black uppercase">Đã đối soát két</span>
                </div>
             </div>
          </div>

          {/* Monthly Trend Chart */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-white dark:border-slate-800 shadow-ios">
             <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600"><BarChart3 className="w-6 h-6" /></div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight dark:text-white">Xu hướng doanh thu ngày</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Biến động doanh thu Z-Bon trong tháng</p>
                </div>
             </div>
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySummary.barChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis hide />
                    <RechartsTooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 800 }} />
                    <Bar dataKey="value" fill={branchColor} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Expense Analysis */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-white dark:border-slate-800 shadow-ios">
             <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl text-rose-500"><PieIcon className="w-6 h-6" /></div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight dark:text-white">Phân tích cơ cấu chi phí</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Chiếm tỷ trọng theo danh mục</p>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div className="h-[250px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={monthlySummary.pieChartData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                        {monthlySummary.pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-[8px] font-black uppercase text-slate-400">Tổng chi</span>
                     <span className="text-base font-black dark:text-white">{formatCurrency(monthlySummary.totalExp, lang)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                   {monthlySummary.pieChartData.slice(0, 5).map((d, i) => (
                     <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                        <div className="flex items-center gap-3">
                           <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                           <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{d.name}</span>
                        </div>
                        <div className="text-right">
                           <span className="text-[11px] font-black dark:text-white block">{formatCurrency(d.value, lang)}</span>
                           <span className="text-[8px] font-bold text-slate-400">{(d.value / monthlySummary.totalExp * 100).toFixed(1)}%</span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'DAILY' && (
        <div className="space-y-4 animate-ios">
          {dailyData.map((d) => (
            <div key={d.date} className="bg-white/95 dark:bg-slate-900/90 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-ios overflow-hidden group">
               {/* Daily Header */}
               <div className="p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-slate-900 dark:bg-slate-800 text-white rounded-[1.8rem] flex flex-col items-center justify-center shrink-0 border border-slate-700 shadow-xl">
                      <span className="text-2xl font-black leading-none">{d.day}</span>
                      <span className="text-[9px] uppercase tracking-tighter opacity-70 font-black">THÁNG {currentMonth.split('-')[1]}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Doanh thu ngày (Z-Bon)</p>
                      <h4 className="text-2xl font-black dark:text-white tracking-tighter leading-none">{formatCurrency(d.totalRev, lang)}</h4>
                    </div>
                  </div>
                  
                  <div className="text-center shrink-0 bg-emerald-50 dark:bg-emerald-950/20 p-5 px-10 rounded-[2rem] border border-emerald-100 dark:border-emerald-800/50 relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                     <p className={`text-3xl font-black tracking-tighter leading-none mb-1 ${d.netHandover < 0 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                       {formatCurrency(d.netHandover, lang)}
                     </p>
                     <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.3em]">TIỀN BÀN GIAO</p>
                  </div>
               </div>

               {/* Detailed Financial Breakdown */}
               <div className="px-6 py-6 bg-slate-50 dark:bg-slate-950/30 border-t dark:border-slate-800/50 grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><CreditCard className="w-3 h-3" /> Thẻ (Bank)</p>
                     <p className="text-sm font-black dark:text-white">{formatCurrency(d.cardSales, lang)}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Zap className="w-3 h-3" /> App Delivery</p>
                     <p className="text-sm font-black dark:text-white">{formatCurrency(d.appSales, lang)}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Banknote className="w-3 h-3 text-emerald-500" /> Tiền tại két</p>
                     <p className="text-sm font-black text-emerald-600">{formatCurrency(d.cashAtKasse, lang)}</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MinusCircle className="w-3 h-3 text-rose-500" /> Chi tại quán</p>
                     <p className="text-sm font-black text-rose-500">{formatCurrency(d.shopOut, lang)}</p>
                  </div>
               </div>

               {/* Audit Footer */}
               <div className="px-6 py-3 bg-white dark:bg-slate-900 border-t dark:border-slate-800/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     <Coins className="w-4 h-4 text-amber-500" />
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tiền xu tách riêng: {formatCurrency(d.coinSum, lang)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                     <Calculator className="w-3.5 h-3.5 text-slate-400" />
                     <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Hệ thống đã tự động đối soát</span>
                  </div>
               </div>
            </div>
          ))}
          {dailyData.length === 0 && (
            <div className="py-24 text-center opacity-30 flex flex-col items-center gap-6">
               <Loader2 className="w-12 h-12 animate-spin" />
               <p className="text-sm font-black uppercase tracking-widest">Đang tải hoặc chưa có dữ liệu</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'WALLET' && (
        <div className="animate-ios max-w-lg mx-auto">
          <div className="bg-white/95 dark:bg-slate-900/90 rounded-[3.5rem] p-10 border border-white dark:border-slate-800 shadow-ios text-center space-y-10 relative overflow-hidden">
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-600/5 rounded-full blur-3xl" />
             <div className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-10 mx-auto shadow-vivid text-white animate-float" style={{ backgroundColor: branchColor }}>
               <Wallet className="w-12 h-12" />
             </div>
             <div className="space-y-2">
                <h2 className="text-3xl font-black dark:text-white uppercase tracking-tighter leading-none">Quỹ Tiền Tokymon</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">{currentBranch?.name}</p>
             </div>
             
             <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-6">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vốn tiền mặt ban đầu</span>
                   <span className="text-sm font-black dark:text-white">{formatCurrency(currentBranch?.initialCash || 0, lang)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-600">
                   <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><ArrowUpRight className="w-4 h-4" /> Bàn giao tích lũy tháng</span>
                   <span className="text-sm font-black">+{formatCurrency(monthlySummary.totalHandover, lang)}</span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-soft">
                   <span className="text-xs font-black uppercase tracking-widest dark:text-white">Hiện có ước tính</span>
                   <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">{formatCurrency((currentBranch?.initialCash || 0) + monthlySummary.totalHandover, lang)}</span>
                </div>
             </div>
             
             <div className="flex items-center gap-3 p-5 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                <Info className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-[9px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed uppercase text-left">
                  Dữ liệu này dựa trên Báo cáo Ngày. Đảm bảo nhân viên đã nhập chính xác các khoản Chi tại quán.
                </p>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'LIABILITIES' && (
        <div className="space-y-6 animate-ios">
           <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-premium text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/20 rounded-full -mr-32 -mt-32 blur-3xl" />
              <p className="text-[11px] font-black uppercase opacity-60 mb-4 tracking-[0.3em]">Tổng nợ chi nhánh Tokymon</p>
              <h2 className="text-5xl font-black tracking-tighter leading-none">
                {formatCurrency(branchTransactions.filter(t => t.type === TransactionType.EXPENSE && t.isPaid === false).reduce((acc, tx) => acc + tx.amount, 0), lang)}
              </h2>
           </div>
           
           <div className="grid grid-cols-1 gap-3">
              {branchTransactions.filter(t => t.type === TransactionType.EXPENSE && t.isPaid === false).sort((a,b) => b.date.localeCompare(a.date)).map(tx => (
                <div key={tx.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border dark:border-slate-800 flex justify-between items-center shadow-ios active-scale">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-100 dark:border-rose-900/50"><AlertCircle className="w-6 h-6" /></div>
                      <div>
                         <p className="text-sm font-black dark:text-white uppercase tracking-tight leading-none mb-1">{tx.debtorName || translateCategory(tx.category)}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tx.date.split('-').reverse().join('/')}</p>
                      </div>
                   </div>
                   <span className="text-lg font-black text-rose-600">{formatCurrency(tx.amount, lang)}</span>
                </div>
              ))}
              {branchTransactions.filter(t => t.type === TransactionType.EXPENSE && t.isPaid === false).length === 0 && (
                <div className="py-24 text-center opacity-30 flex flex-col items-center">
                   <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6"><CheckCircle2 className="w-10 h-10" /></div>
                   <p className="text-xs font-black uppercase tracking-widest">Không có công nợ. Quản lý tài chính tuyệt vời!</p>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
