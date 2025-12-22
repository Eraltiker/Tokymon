
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, EXPENSE_SOURCE_LABELS, UserRole } from '../types';
import { 
  Trash2, CreditCard, Store, Wallet, ArrowUpCircle, 
  ArrowDownCircle, Edit3, Search, 
  SlidersHorizontal, CalendarDays,
  Banknote, Info
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

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border dark:border-slate-800 overflow-hidden h-full flex flex-col">
      <div className="p-6 space-y-4 flex-shrink-0 border-b dark:border-slate-800">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{title}</h3>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{filteredTransactions.length} Giao dịch</p>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`p-3 rounded-2xl border transition-all ${showFilters ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}>
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        <div className="relative group">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm kiếm nội dung..." className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-950 rounded-2xl font-black text-xs outline-none border-2 border-transparent focus:border-indigo-600 transition-all dark:text-white" />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border dark:border-slate-800 animate-in slide-in-from-top-2">
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-900 rounded-xl text-[10px] font-black border dark:border-slate-800" />
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-900 rounded-xl text-[10px] font-black border dark:border-slate-800" />
             <button onClick={clearFilters} className="col-span-2 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">Reset Filter</button>
          </div>
        )}
      </div>
      
      <div className="overflow-y-auto flex-1 custom-scrollbar px-4 pb-6 mt-4">
        <div className="space-y-3">
          {filteredTransactions.map((t) => (
            <div key={t.id} className="bg-slate-50 dark:bg-slate-950/50 p-5 rounded-2xl border dark:border-slate-800 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                 <div className="flex gap-4">
                    <div className={`w-11 h-11 rounded-[1.25rem] flex items-center justify-center ${t.type === TransactionType.INCOME ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white shadow-rose-100'}`}>
                      {t.type === TransactionType.INCOME ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                    </div>
                    <div>
                       <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase leading-none mb-1.5">{t.category}</h4>
                       <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> {t.date}</span>
                          {t.note && <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase italic">• {t.note}</span>}
                       </div>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className={`text-base font-black leading-none ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">
                       {t.type === TransactionType.EXPENSE ? (t.expenseSource ? EXPENSE_SOURCE_LABELS[t.expenseSource] : 'Nợ NCC') : 'Doanh Thu'}
                    </p>
                 </div>
              </div>

              {!isViewer && (
                <div className="flex items-center justify-end gap-1.5 pt-3 border-t dark:border-slate-800/50">
                    <button onClick={() => onEdit(t)} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 text-slate-400 hover:text-indigo-600 transition-all"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(t.id)} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 text-slate-400 hover:text-rose-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          ))}
          {filteredTransactions.length === 0 && (
            <div className="py-20 text-center opacity-30">
               <Info className="w-12 h-12 mx-auto mb-4" />
               <p className="text-[10px] font-black uppercase tracking-[0.2em]">Không tìm thấy dữ liệu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
