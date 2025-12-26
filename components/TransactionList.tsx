
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
  lang?: Language;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onEdit, title, userRole, lang = 'vi' }) => {
  const t = useTranslation(lang as Language);
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
    setSearchQuery(''); setStartDate(''); setEndDate(''); setSelectedType('ALL'); setMinAmount(''); setMaxAmount('');
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

  const getSourceLabel = (tx: Transaction) => {
     if (tx.type === TransactionType.INCOME) {
        return tx.incomeBreakdown?.cash && tx.incomeBreakdown.cash > 0 ? t('shop_cash') : 'Bank/App';
     }
     if (tx.isPaid === false) return t('debt_label');
     return tx.expenseSource === ExpenseSource.SHOP_CASH ? t('shop_cash') : (tx.expenseSource === ExpenseSource.WALLET ? t('master_wallet') : t('card_bank'));
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2.2rem] shadow-ios border border-white dark:border-slate-800 overflow-hidden flex flex-col h-full animate-ios">
      <div className="px-6 py-4 space-y-4 bg-slate-50/40 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight opacity-80">{title}</h3>
            {activeFilterCount > 0 && (
              <span className="w-6 h-6 bg-brand-600 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-in zoom-in shadow-sm">{activeFilterCount}</span>
            )}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showFilters ? 'bg-brand-600 text-white shadow-vivid' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
            {showFilters ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
          </button>
        </div>

        <div className="relative">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('placeholder_search')} className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 rounded-2xl font-bold text-xs outline-none border border-slate-200 dark:border-slate-800 focus:border-brand-500 shadow-sm transition-all dark:text-white" />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
        </div>

        {showFilters && (
          <div className="p-5 bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl space-y-5 animate-ios">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{t('from_date')}</label>
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 outline-none dark:text-white shadow-inner" />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{t('to_date')}</label>
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 outline-none dark:text-white shadow-inner" />
               </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{t('min_amount')}</label>
                 <div className="relative">
                    <input type="number" value={minAmount} onChange={e => setMinAmount(e.target.value)} placeholder="Min" className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 outline-none dark:text-white" />
                    <Euro className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 </div>
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{t('max_amount')}</label>
                 <div className="relative">
                    <input type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} placeholder="Max" className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-700 outline-none dark:text-white" />
                    <Euro className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 </div>
               </div>
             </div>
             <div className="flex gap-2">
               <button onClick={() => setSelectedType('ALL')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${selectedType === 'ALL' ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>{t('all')}</button>
               <button onClick={() => setSelectedType(TransactionType.INCOME)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${selectedType === TransactionType.INCOME ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>{t('income')}</button>
               <button onClick={() => setSelectedType(TransactionType.EXPENSE)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${selectedType === TransactionType.EXPENSE ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>{t('expense')}</button>
             </div>
             <button onClick={clearFilters} className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700">{t('reset_filter')}</button>
          </div>
        )}
      </div>
      
      <div className="overflow-y-auto flex-1 no-scrollbar px-6 pt-5 pb-16">
        <div className="space-y-3.5">
          {filteredTransactions.map((tx) => (
            <div key={tx.id} className="bg-white dark:bg-slate-950/60 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-3 group active-scale transition-all shadow-sm hover:border-brand-200 dark:hover:border-brand-900">
              <div className="flex justify-between items-center gap-4">
                <div className="flex gap-4 min-w-0 items-center">
                  <div className={`w-11 h-11 rounded-[1.2rem] flex items-center justify-center shrink-0 border ${tx.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/30' : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-900/30'}`}>
                    {tx.type === TransactionType.INCOME ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase truncate tracking-tight">{tx.debtorName || tx.category}</h4>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2 truncate">
                      <CalendarDays className="w-3 h-3" /> {tx.date.split('-').reverse().join('/')} 
                      {tx.note && <span className="opacity-70">| {tx.note}</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black tracking-tighter ${tx.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {tx.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 block opacity-80">{getSourceLabel(tx)}</span>
                </div>
              </div>
              {!isViewer && (
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-50 dark:border-slate-800/60 opacity-80 group-hover:opacity-100 transition-all">
                    <button onClick={() => onEdit(tx)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 active-scale transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"><Edit3 className="w-3.5 h-3.5" /> {t('edit')}</button>
                    <button onClick={() => onDelete(tx.id)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 active-scale transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> {t('delete')}</button>
                </div>
              )}
            </div>
          ))}
          {filteredTransactions.length === 0 && (
            <div className="py-24 text-center opacity-40 flex flex-col items-center gap-4"><div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center"><Info className="w-7 h-7" /></div><p className="text-xs font-black uppercase tracking-widest">{t('no_data')}</p></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
