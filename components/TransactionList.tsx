
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, formatCurrency, UserRole, Language, ExpenseSource } from '../types';
import { useTranslation } from '../i18n';
import { 
  Trash2, ArrowUpCircle, 
  ArrowDownCircle, Edit3, Search, 
  CalendarDays, Filter, X, Info, 
  User as UserIcon, MessageSquare, ShieldCheck,
  Store, Wallet, CreditCard, AlertCircle, ChevronDown, UserCheck, Truck
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  title?: string;
  userRole?: UserRole;
  lang?: Language;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onEdit, title, userRole, lang = 'vi' as Language }) => {
  const { t, translateCategory, translateSource } = useTranslation(lang);
  const [showFilters, setShowFilters] = useState(false);
  const isViewer = userRole === UserRole.VIEWER;

  // --- STATES BỘ LỌC NÂNG CAO ---
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | 'ALL'>('ALL');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSource, setSelectedSource] = useState<'ALL' | ExpenseSource>('ALL');
  const [paidStatus, setPaidStatus] = useState<'ALL' | 'PAID' | 'DEBT'>('ALL');

  const availableCategories = useMemo(() => {
    const cats = new Set(transactions.map(tx => tx.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.deletedAt) return false;
      
      const notesString = (tx.notes || []).join(' ').toLowerCase();
      const matchesSearch = 
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notesString.includes(searchQuery.toLowerCase()) ||
        (tx.debtorName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (tx.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
      
      const matchesStartDate = startDate ? tx.date >= startDate : true;
      const matchesEndDate = endDate ? tx.date <= endDate : true;
      const matchesType = selectedType === 'ALL' ? true : tx.type === selectedType;
      
      const amount = tx.amount;
      const matchesMin = minAmount ? amount >= parseFloat(minAmount) : true;
      const matchesMax = maxAmount ? amount <= parseFloat(maxAmount) : true;
      const matchesCat = selectedCategory === 'ALL' ? true : tx.category === selectedCategory;
      const matchesSrc = selectedSource === 'ALL' ? true : tx.expenseSource === selectedSource;
      const matchesPaid = paidStatus === 'ALL' ? true : 
                         paidStatus === 'PAID' ? tx.isPaid !== false : 
                         tx.isPaid === false;

      return matchesSearch && matchesStartDate && matchesEndDate && matchesType && 
             matchesMin && matchesMax && matchesCat && matchesSrc && matchesPaid;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, searchQuery, startDate, endDate, selectedType, minAmount, maxAmount, selectedCategory, selectedSource, paidStatus]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(tx => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const getSourceIcon = (src?: ExpenseSource) => {
    switch (src) {
      case ExpenseSource.SHOP_CASH: return <Store className="w-3 h-3" />;
      case ExpenseSource.WALLET: return <Wallet className="w-3 h-3" />;
      case ExpenseSource.CARD: return <CreditCard className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const resetFilters = () => {
    setSearchQuery(''); setStartDate(''); setEndDate(''); setSelectedType('ALL');
    setMinAmount(''); setMaxAmount(''); setSelectedCategory('ALL');
    setSelectedSource('ALL'); setPaidStatus('ALL');
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2.5rem] shadow-ios border border-white dark:border-slate-800 overflow-hidden flex flex-col h-full animate-ios">
      <div className="px-6 py-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">{title}</h3>
            <p className="text-sm font-black dark:text-white uppercase tracking-tighter">{t('journal_title')}</p>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active-scale ${showFilters ? 'bg-brand-600 text-white shadow-vivid' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
            {showFilters ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
          </button>
        </div>

        <div className="relative">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('placeholder_search')} className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-950 rounded-2xl font-bold text-xs outline-none border border-slate-200 dark:border-slate-800 focus:border-brand-500 shadow-sm transition-all dark:text-white" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        {showFilters && (
          <div className="p-5 bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-5 animate-ios shadow-ios">
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1.5">
                 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('from_date')}</label>
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black border border-slate-100 dark:border-slate-800 outline-none dark:text-white" />
               </div>
               <div className="space-y-1.5">
                 <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">{t('to_date')}</label>
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black border border-slate-100 dark:border-slate-800 outline-none dark:text-white" />
               </div>
             </div>
             <button onClick={resetFilters} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-slate-200 dark:border-slate-700 active-scale shadow-sm transition-all hover:bg-slate-200">
                {t('reset_filter')}
             </button>
          </div>
        )}
      </div>
      
      <div className="overflow-y-auto flex-1 no-scrollbar pb-24">
        {groupedTransactions.map(([date, txs]) => (
          <div key={date} className="relative">
             <div className="sticky top-0 z-20 px-6 py-2 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-md border-y border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5" /> {date.split('-').reverse().join(' / ')}
                </span>
             </div>

             <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {txs.map(tx => {
                   const isDebt = tx.isPaid === false;
                   const isAdvance = tx.category === 'Nợ / Tiền ứng';
                   const isPending = (tx.amount > (tx.paidAmount || 0));

                   return (
                    <div key={tx.id} className="px-6 py-4 flex flex-col gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors relative group">
                       <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-3 min-w-0">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${tx.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/30' : (isDebt ? 'bg-rose-50 text-rose-600 border-rose-100' : (isAdvance ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'))}`}>
                                {tx.type === TransactionType.INCOME ? <ArrowUpCircle className="w-6 h-6" /> : (isAdvance ? <UserCheck className="w-6 h-6" /> : (isDebt ? <Truck className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />))}
                             </div>
                             <div className="min-w-0 flex flex-col justify-center">
                                <h4 className="text-[11px] font-black dark:text-white uppercase tracking-tight leading-none mb-1.5 truncate">
                                   {tx.debtorName || translateCategory(tx.category)}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2">
                                   <div className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[8px] font-black uppercase border ${isDebt && isPending ? 'bg-rose-500 text-white border-rose-600' : (isAdvance && isPending ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700')}`}>
                                      {isDebt && isPending ? <Truck className="w-2.5 h-2.5" /> : (isAdvance && isPending ? <UserCheck className="w-2.5 h-2.5" /> : getSourceIcon(tx.expenseSource))}
                                      {isDebt && isPending ? 'NỢ NCC' : (isAdvance && isPending ? 'TIỀN ỨNG' : translateSource(tx.expenseSource))}
                                   </div>
                                   {tx.authorName && (
                                     <div className="flex items-center gap-1 px-2 py-0.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-md border border-brand-100 dark:border-brand-800 text-[8px] font-black uppercase">
                                        <UserIcon className="w-2.5 h-2.5" /> {tx.authorName}
                                     </div>
                                   )}
                                </div>
                             </div>
                          </div>

                          <div className="text-right shrink-0 flex flex-col justify-center">
                             <p className={`text-sm font-black tracking-tighter ${tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {tx.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(tx.amount, lang)}
                             </p>
                             {isPending && (isDebt || isAdvance) && (
                               <div className="text-[8px] font-black text-rose-500 uppercase mt-1">
                                 Còn nợ: {formatCurrency(tx.amount - (tx.paidAmount || 0), lang)}
                               </div>
                             )}
                          </div>
                       </div>

                       {(tx.notes && tx.notes.length > 0) && (
                          <div className="flex gap-2 pl-[52px]">
                             <MessageSquare className="w-3 h-3 text-slate-300 mt-0.5 shrink-0" />
                             <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {tx.notes.map((note, nIdx) => (
                                   <span key={nIdx} className="text-[10px] font-bold text-slate-500 dark:text-slate-500 leading-tight italic line-clamp-1 truncate max-w-[200px]">
                                      "{note}"
                                   </span>
                                ))}
                             </div>
                          </div>
                       )}

                       {!isViewer && (
                          <div className="absolute right-6 bottom-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => onEdit(tx)} className="p-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-sm text-slate-400 hover:text-indigo-500 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                             <button onClick={() => onDelete(tx.id)} className="p-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-sm text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                       )}
                    </div>
                  );
                })}
             </div>
          </div>
        ))}
        
        {groupedTransactions.length === 0 && (
          <div className="py-32 text-center opacity-30 flex flex-col items-center gap-4">
             <Info className="w-10 h-10" />
             <p className="text-xs font-black uppercase tracking-widest">{t('no_data')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
