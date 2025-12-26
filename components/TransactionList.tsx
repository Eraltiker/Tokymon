
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, EXPENSE_SOURCE_LABELS, UserRole, Language } from '../types';
import { useTranslation } from '../i18n';
import { 
  Trash2, CreditCard, Store, Wallet, ArrowUpCircle, 
  ArrowDownCircle, Edit3, Search, 
  SlidersHorizontal, CalendarDays,
  Banknote, Info, Smartphone, Receipt, Calendar, Filter, X, ChevronRight, Euro
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  title?: string;
  userRole?: UserRole;
  // Fixed type from any to Language to fix type mismatch on line 22
  lang?: Language;
}

// Added 'as Language' to the default parameter to resolve type mismatch on line 23
const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onEdit, title, userRole, lang = 'vi' as Language }) => {
  const t = useTranslation(lang);
  const [showFilters, setShowFilters] = useState(false);
  const isViewer = userRole === UserRole.VIEWER;

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | 'ALL'>('ALL');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Logic xóa bỏ các bản ghi nháp hoặc rác
      if (tx.deletedAt) return false;

      const matchesSearch = 
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.note?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (tx.debtorName?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
      
      const matchesStartDate = startDate ? tx.date >= startDate : true;
      const matchesEndDate = endDate ? tx.date <= endDate : true;
      const matchesType = selectedType === 'ALL' ? true : tx.type === selectedType;
      
      const val = tx.amount || 0;
      const matchesMin = minAmount ? val >= parseFloat(minAmount) : true;
      const matchesMax = maxAmount ? val <= parseFloat(maxAmount) : true;

      return matchesSearch && matchesStartDate && matchesEndDate && matchesType && matchesMin && matchesMax;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [transactions, searchQuery, startDate, endDate, selectedType, minAmount, maxAmount]);

  const clearFilters = () => {
    setSearchQuery(''); 
    setStartDate(''); 
    setEndDate(''); 
    setSelectedType('ALL');
    setMinAmount('');
    setMaxAmount('');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (startDate) count++;
    if (endDate) count++;
    if (selectedType !== 'ALL') count++;
    if (minAmount) count++;
    if (maxAmount) count++;
    return count;
  }, [startDate, endDate, selectedType, minAmount, maxAmount]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full animate-in fade-in transition-all">
      {/* Header gọn gàng */}
      <div className="px-5 py-4 space-y-3 bg-slate-50/20 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{title}</h3>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-indigo-600 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-in zoom-in">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${showFilters ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'}`}
          >
            {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative">
          <input 
            type="text" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            placeholder={t('placeholder_search')} 
            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-950 rounded-xl font-bold text-[11px] outline-none border border-slate-200 dark:border-slate-800 focus:border-indigo-500 shadow-sm transition-all dark:text-white" 
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        </div>

        {showFilters && (
          <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 animate-in slide-in-from-top-1 duration-200">
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('from_date')}</label>
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-[10px] font-black border border-slate-200/50 dark:border-slate-700 outline-none dark:text-white" />
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('to_date')}</label>
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-[10px] font-black border border-slate-200/50 dark:border-slate-700 outline-none dark:text-white" />
               </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('min_amount')}</label>
                 <div className="relative">
                    <input type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} placeholder="Min" className="w-full pl-7 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-[10px] font-black border border-slate-200/50 dark:border-slate-700 outline-none dark:text-white" />
                    <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                 </div>
               </div>
               <div className="space-y-1">
                 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('max_amount')}</label>
                 <div className="relative">
                    <input type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} placeholder="Max" className="w-full pl-7 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-[10px] font-black border border-slate-200/50 dark:border-slate-700 outline-none dark:text-white" />
                    <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                 </div>
               </div>
             </div>

             <div className="flex gap-1.5">
               <button onClick={() => setSelectedType('ALL')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${selectedType === 'ALL' ? 'bg-slate-900 dark:bg-slate-800 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>{t('all')}</button>
               <button onClick={() => setSelectedType(TransactionType.INCOME)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${selectedType === TransactionType.INCOME ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>{t('income')}</button>
               <button onClick={() => setSelectedType(TransactionType.EXPENSE)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${selectedType === TransactionType.EXPENSE ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>{t('expense')}</button>
             </div>
             
             <button onClick={clearFilters} className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all border dark:border-slate-700">
               {t('reset_filter')}
             </button>
          </div>
        )}
      </div>
      
      <div className="overflow-y-auto flex-1 custom-scrollbar px-4 pt-4 pb-12">
        <div className="space-y-2.5">
          {filteredTransactions.map((tx) => (
            <div 
              key={tx.id} 
              className="bg-white dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex flex-col gap-2.5 group active:bg-slate-50 dark:active:bg-slate-900 transition-all shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/50"
            >
              <div className="flex justify-between items-center gap-3">
                <div className="flex gap-3 min-w-0 items-center">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${tx.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                    {tx.type === TransactionType.INCOME ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 dark:text-white text-[11px] uppercase truncate tracking-tight">{tx.debtorName || tx.category}</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
                      <CalendarDays className="w-2.5 h-2.5" />
                      {tx.date.split('-').reverse().join('/')} 
                      {tx.note && <span className="text-slate-300 dark:text-slate-700 font-normal truncate max-w-[120px]">| {tx.note}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black tracking-tighter ${tx.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {tx.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5 block opacity-70">
                    {tx.type === TransactionType.INCOME ? (tx.incomeBreakdown?.cash && tx.incomeBreakdown.cash > 0 ? 'Cash/Shop' : 'Bank/App') : (tx.expenseSource ? EXPENSE_SOURCE_LABELS[tx.expenseSource] : 'Debt')}
                  </span>
                </div>
              </div>

              {!isViewer && (
                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-50 dark:border-slate-800/40 opacity-0 group-hover:opacity-100 sm:opacity-50 transition-all">
                    <button onClick={() => onEdit(tx)} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-[8px] font-black uppercase text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:scale-95 transition-all"><Edit3 className="w-3 h-3 inline mr-1" /> {t('edit')}</button>
                    <button onClick={() => onDelete(tx.id)} className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-[8px] font-black uppercase text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 active:scale-95 transition-all"><Trash2 className="w-3 h-3 inline mr-1" /> {t('delete')}</button>
                </div>
              )}
            </div>
          ))}
          
          {filteredTransactions.length === 0 && (
            <div className="py-24 text-center opacity-30 flex flex-col items-center gap-3">
               <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <Info className="w-6 h-6" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-[0.4em]">{t('no_data')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
