
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, EXPENSE_SOURCE_LABELS, UserRole } from '../types';
import { 
  Trash2, CreditCard, Store, Wallet, Calendar, ArrowUpCircle, 
  ArrowDownCircle, Edit3, Search, 
  SlidersHorizontal, Eraser, CalendarDays, History,
  ChevronRight, ArrowRight, Tag
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
      case ExpenseSource.SHOP_CASH: return <Store className="w-2.5 h-2.5" />;
      case ExpenseSource.WALLET: return <Wallet className="w-2.5 h-2.5" />;
      case ExpenseSource.CARD: return <CreditCard className="w-2.5 h-2.5" />;
      default: return null;
    }
  };

  return (
    <div className="bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl rounded-[1.5rem] shadow-sm border dark:border-slate-800 overflow-hidden h-full flex flex-col transition-all">
      <div className="p-4 space-y-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{title}</h3>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{filteredTransactions.length} records</p>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-xl border transition-all active:scale-95 ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'}`}>
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="relative group">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm..." className="w-full pl-9 pr-3 py-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl font-bold text-xs border-2 border-transparent focus:border-indigo-500 outline-none dark:text-white shadow-inner" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border dark:border-slate-800 animate-in slide-in-from-top-2 duration-200">
             <div className="space-y-1">
               <label className="text-[7px] font-black text-slate-400 uppercase px-1">Từ</label>
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 bg-white dark:bg-slate-800 rounded-lg text-[9px] font-bold dark:text-white border dark:border-slate-700" />
             </div>
             <div className="space-y-1">
               <label className="text-[7px] font-black text-slate-400 uppercase px-1">Đến</label>
               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 bg-white dark:bg-slate-800 rounded-lg text-[9px] font-bold dark:text-white border dark:border-slate-700" />
             </div>
             <button onClick={clearFilters} className="col-span-2 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-[8px] font-black uppercase flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300">Reset</button>
          </div>
        )}
      </div>
      
      <div className="overflow-y-auto flex-1 custom-scrollbar px-3 pb-4">
        <div className="space-y-2">
          {filteredTransactions.map((t) => (
            <div key={t.id} className="bg-white dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-2.5 hover:border-indigo-500 transition-all">
              <div className="flex justify-between items-start">
                 <div className="flex gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md shrink-0 ${t.type === TransactionType.INCOME ? 'bg-emerald-500 text-white shadow-emerald-100 dark:shadow-none' : 'bg-rose-500 text-white shadow-rose-100 dark:shadow-none'}`}>
                      {t.type === TransactionType.INCOME ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col min-w-0 pt-0.5">
                       <h4 className="font-black text-slate-900 dark:text-white text-[11px] truncate leading-none mb-1 uppercase tracking-tight">{t.category}</h4>
                       <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400 uppercase">
                          <CalendarDays className="w-2.5 h-2.5" /> {t.date}
                       </div>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className={`text-[13px] font-black leading-none tracking-tighter ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    {t.expenseSource && (
                       <span className="text-[7px] font-black text-slate-400 uppercase flex items-center justify-end gap-1 mt-1">
                         {getSourceIcon(t.expenseSource)} {EXPENSE_SOURCE_LABELS[t.expenseSource]}
                       </span>
                    )}
                 </div>
              </div>

              {t.note && (
                <div className="bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border-l-2 border-slate-200 dark:border-slate-800 italic text-[9px] text-slate-500">
                  {t.note}
                </div>
              )}
              
              <div className="flex items-center justify-between border-t dark:border-slate-800 pt-2.5">
                 <div className="flex gap-4">
                    {t.type === TransactionType.INCOME && t.incomeBreakdown && (
                       <div className="flex gap-3">
                          <div className="flex flex-col">
                             <span className="text-[7px] font-bold text-slate-400 uppercase leading-none mb-0.5">Kasse</span>
                             <span className="text-[9px] font-black text-emerald-600">{formatCurrency(t.incomeBreakdown.cash || 0)}</span>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[7px] font-bold text-slate-400 uppercase leading-none mb-0.5">Bank</span>
                             <span className="text-[9px] font-black text-indigo-500">{formatCurrency(t.incomeBreakdown.card || 0)}</span>
                          </div>
                       </div>
                    )}
                    {t.isPaid === false && <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[7px] font-black uppercase rounded-lg border border-rose-500/10">Nợ NCC</span>}
                 </div>
                 
                 {!isViewer && (
                   <div className="flex gap-1.5">
                      <button onClick={() => onEdit(t)} className="p-2 bg-slate-50 dark:bg-slate-900 text-indigo-600 rounded-lg active:scale-90 border dark:border-slate-800"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onDelete(t.id)} className="p-2 bg-slate-50 dark:bg-slate-900 text-rose-500 rounded-lg active:scale-90 border dark:border-slate-800"><Trash2 className="w-3.5 h-3.5" /></button>
                   </div>
                 )}
              </div>
            </div>
          ))}
          {filteredTransactions.length === 0 && (
            <div className="py-20 text-center">
               <p className="text-[10px] font-black text-slate-300 uppercase">Chưa có dữ liệu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
