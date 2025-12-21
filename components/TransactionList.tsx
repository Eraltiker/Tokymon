
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, EXPENSE_SOURCE_LABELS, UserRole } from '../types';
import { 
  Trash2, CreditCard, Store, Wallet, Calendar, ArrowUpCircle, 
  ArrowDownCircle, Edit3, Search, 
  SlidersHorizontal, Eraser, CalendarDays, History
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  title?: string;
  userRole?: UserRole;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onEdit, title, userRole }) => {
  const [showFilters, setShowFilters] = useState(false);
  const isViewer = userRole === UserRole.VIEWER;

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | 'ALL'>('ALL');

  const availableCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.note?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
      const matchesStartDate = startDate ? t.date >= startDate : true;
      const matchesEndDate = endDate ? t.date <= endDate : true;
      const matchesCategory = selectedCategory ? t.category === selectedCategory : true;
      const matchesType = selectedType === 'ALL' ? true : t.type === selectedType;
      return matchesSearch && matchesStartDate && matchesEndDate && matchesCategory && matchesType;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [transactions, searchQuery, startDate, endDate, selectedCategory, selectedType]);

  const clearFilters = () => {
    setSearchQuery(''); setStartDate(''); setEndDate(''); setSelectedCategory(''); setSelectedType('ALL');
  };

  const getSourceIcon = (source?: ExpenseSource) => {
    switch (source) {
      case ExpenseSource.SHOP_CASH: return <Store className="w-3.5 h-3.5" />;
      case ExpenseSource.WALLET: return <Wallet className="w-3.5 h-3.5" />;
      case ExpenseSource.CARD: return <CreditCard className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border dark:border-slate-800 overflow-hidden h-full flex flex-col">
      <div className="p-6 md:p-8 space-y-5 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{title}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{filteredTransactions.length} giao dịch gần đây</p>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`p-4 rounded-2xl border transition-all active:scale-95 ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}`}>
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm kiếm nhanh..." className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl font-bold text-xs border-2 border-transparent focus:border-indigo-500 outline-none dark:text-white transition-all" />
          <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border dark:border-slate-700 animate-in slide-in-from-top-4 duration-300">
             <div className="space-y-1">
               <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Từ ngày</label>
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-[11px] font-bold dark:text-white" />
             </div>
             <div className="space-y-1">
               <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Đến ngày</label>
               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-[11px] font-bold dark:text-white" />
             </div>
             <div className="col-span-2 space-y-1">
               <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Loại giao dịch</label>
               <select value={selectedType} onChange={e => setSelectedType(e.target.value as any)} className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-[11px] font-black uppercase tracking-widest dark:text-white">
                 <option value="ALL">Tất cả</option>
                 <option value={TransactionType.INCOME}>Doanh thu</option>
                 <option value={TransactionType.EXPENSE}>Chi phí</option>
               </select>
             </div>
             <button onClick={clearFilters} className="col-span-2 py-3 bg-slate-200 dark:bg-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95"><Eraser className="w-3.5 h-3.5" /> Xóa bộ lọc</button>
          </div>
        )}
      </div>
      
      <div className="overflow-y-auto flex-1 custom-scrollbar px-6 pb-20">
        <div className="space-y-4">
          {filteredTransactions.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-800/20 p-5 rounded-[2rem] border border-slate-50 dark:border-slate-800 shadow-sm flex flex-col gap-4 group">
              <div className="flex justify-between items-start">
                 <div className="flex gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${t.type === TransactionType.INCOME ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                      {t.type === TransactionType.INCOME ? <ArrowUpCircle className="w-7 h-7" /> : <ArrowDownCircle className="w-7 h-7" />}
                    </div>
                    <div className="flex flex-col min-w-0 pt-0.5">
                       <h4 className="font-black text-slate-900 dark:text-white text-[15px] truncate leading-none mb-1.5 uppercase tracking-tighter">{t.category}</h4>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <CalendarDays className="w-3.5 h-3.5" /> {t.date}
                          {t.history && t.history.length > 0 && <span className="text-[8px] bg-amber-50 dark:bg-amber-900/30 text-amber-600 px-1.5 py-0.5 rounded uppercase font-black">Edited</span>}
                       </div>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className={`text-lg font-black leading-none ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    {t.expenseSource && (
                       <span className="text-[9px] font-black text-slate-300 uppercase flex items-center justify-end gap-1 mt-1.5">
                         {getSourceIcon(t.expenseSource)} {EXPENSE_SOURCE_LABELS[t.expenseSource]}
                       </span>
                    )}
                 </div>
              </div>

              {t.note && <p className="text-[11px] text-slate-400 dark:text-slate-500 italic px-1 leading-relaxed">"{t.note}"</p>}
              
              <div className="flex items-center justify-between border-t dark:border-slate-800 pt-3">
                 <div className="flex gap-4">
                    {t.type === TransactionType.INCOME && t.incomeBreakdown && (
                       <div className="flex gap-3">
                          <div className="flex flex-col">
                             <span className="text-[7px] font-black text-slate-300 uppercase leading-none">Cash</span>
                             <span className="text-[10px] font-black text-emerald-600">{formatCurrency(t.incomeBreakdown.cash || 0)}</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[7px] font-black text-slate-300 uppercase leading-none">Card</span>
                             <span className="text-[10px] font-black text-indigo-500">{formatCurrency(t.incomeBreakdown.card || 0)}</span>
                          </div>
                       </div>
                    )}
                    {t.isPaid === false && <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[8px] font-black uppercase rounded-full">Chưa trả</span>}
                 </div>
                 
                 {!isViewer && (
                   <div className="flex gap-1.5">
                      <button onClick={() => onEdit(t)} className="p-3 bg-slate-50 dark:bg-slate-900 text-indigo-500 rounded-xl active:scale-90 transition-all border dark:border-slate-800"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => onDelete(t.id)} className="p-3 bg-slate-50 dark:bg-slate-900 text-rose-500 rounded-xl active:scale-90 transition-all border dark:border-slate-800"><Trash2 className="w-4 h-4" /></button>
                   </div>
                 )}
              </div>
            </div>
          ))}
          {filteredTransactions.length === 0 && (
            <div className="py-20 text-center space-y-3">
               <History className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto" />
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Không có lịch sử giao dịch nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
