
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, EXPENSE_SOURCE_LABELS, UserRole } from '../types';
import { 
  Trash2, CreditCard, Store, Wallet, Calendar, ArrowUpCircle, 
  ArrowDownCircle, Edit3, X, Search, 
  SlidersHorizontal, Eraser, CalendarDays
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  title?: string;
  userRole?: UserRole;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onEdit, title = "Lịch Sử Giao Dịch", userRole }) => {
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
    }).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime() || Number(b.id) - Number(a.id)
    );
  }, [transactions, searchQuery, startDate, endDate, selectedCategory, selectedType]);

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSelectedCategory('');
    setSelectedType('ALL');
  };

  const getSourceIcon = (source?: ExpenseSource) => {
    switch (source) {
      case ExpenseSource.SHOP_CASH: return <Store className="w-4 h-4" />;
      case ExpenseSource.WALLET: return <Wallet className="w-4 h-4" />;
      case ExpenseSource.CARD: return <CreditCard className="w-4 h-4" />;
      default: return null;
    }
  };

  const hasActiveFilters = searchQuery || startDate || endDate || selectedCategory || selectedType !== 'ALL';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col animate-in fade-in slide-in-from-right-4 transition-colors duration-300">
      
      <div className="p-6 md:p-8 border-b border-slate-50 dark:border-slate-800 space-y-5 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                {filteredTransactions.length} giao dịch
              </p>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase rounded-full">
                  Đã lọc
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-4 rounded-2xl border transition-all flex items-center gap-2 active:scale-95 ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300'}`}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo hạng mục, ghi chú..."
            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-[13px] text-slate-900 dark:text-slate-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
          />
          <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        </div>

        {showFilters && (
          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-[1.8rem] border border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300 overflow-y-auto max-h-[350px] custom-scrollbar shadow-inner">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Từ ngày</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-3 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl text-xs font-bold outline-none shadow-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Đến ngày</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-3 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl text-xs font-bold outline-none shadow-sm" />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Hạng mục</label>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-xl text-xs font-bold outline-none shadow-sm">
                <option value="">Tất cả</option>
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button onClick={clearFilters} className="col-span-2 py-3 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95">
              <Eraser className="w-4 h-4" /> Reset bộ lọc
            </button>
          </div>
        )}
      </div>
      
      <div className="overflow-y-auto flex-1 custom-scrollbar px-4 pb-10">
        {filteredTransactions.length === 0 ? (
          <div className="py-20 text-center">
            <CalendarDays className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
            <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-xs">Không có dữ liệu phù hợp</p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {filteredTransactions.map(t => (
              <div 
                key={t.id} 
                className="bg-white dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group flex flex-col gap-4"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${t.type === TransactionType.INCOME ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                      {t.type === TransactionType.INCOME ? <ArrowUpCircle className="w-7 h-7" /> : <ArrowDownCircle className="w-7 h-7" />}
                    </div>
                    <div className="flex flex-col min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-slate-900 dark:text-slate-100 text-[15px] truncate leading-tight uppercase tracking-tight">{t.category}</h4>
                        {t.history && t.history.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 text-[8px] font-black uppercase rounded border border-amber-100 shrink-0">Đã sửa</span>
                        )}
                      </div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> {t.date}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-black block leading-none ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount || 0)}
                    </span>
                    {t.type === TransactionType.EXPENSE && t.expenseSource && (
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1.5 mt-2 opacity-80">
                          {getSourceIcon(t.expenseSource)} {EXPENSE_SOURCE_LABELS[t.expenseSource]}
                       </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-4 border-t dark:border-slate-800 pt-3">
                   <div className="min-w-0 flex-1">
                      {t.note ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic truncate font-medium">"{t.note}"</p>
                      ) : (
                        <p className="text-[9px] text-slate-300 dark:text-slate-600 uppercase font-black">Không có ghi chú</p>
                      )}
                      {t.type === TransactionType.INCOME && t.incomeBreakdown && (
                        <div className="flex gap-4 text-[10px] font-black uppercase tracking-tighter mt-2">
                          <span className="text-emerald-600">TM: {formatCurrency(t.incomeBreakdown.cash || 0)}</span>
                          <span className="text-indigo-600">Thẻ: {formatCurrency(t.incomeBreakdown.card || 0)}</span>
                        </div>
                      )}
                   </div>
                   
                   {!isViewer && (
                     <div className="flex gap-2 shrink-0">
                        <button onClick={() => onEdit(t)} className="p-3.5 bg-slate-50 dark:bg-slate-900 text-indigo-500 rounded-2xl shadow-sm active:scale-90 transition-all border dark:border-slate-800">
                          <Edit3 className="w-4.5 h-4.5" />
                        </button>
                        <button onClick={() => onDelete(t.id)} className="p-3.5 bg-slate-50 dark:bg-slate-900 text-rose-500 rounded-2xl shadow-sm active:scale-90 transition-all border dark:border-slate-800">
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
