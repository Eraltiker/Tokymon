
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, formatCurrency, UserRole, Language, ExpenseSource } from '../types';
import { useTranslation } from '../i18n';
import { 
  Trash2, ArrowUpCircle, 
  ArrowDownCircle, Edit3, Search, 
  CalendarDays, Filter, X, Info, 
  User as UserIcon, MessageSquare, ShieldCheck,
  Store, Wallet, CreditCard, AlertCircle, ChevronDown, UserCheck, Truck, Smartphone,
  RotateCcw, Banknote
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

  // --- STATES BỘ LỌC ---
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | 'ALL'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSource, setSelectedSource] = useState<'ALL' | ExpenseSource>('ALL');
  const [paidStatus, setPaidStatus] = useState<'ALL' | 'PAID' | 'DEBT'>('ALL');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.deletedAt) return false;
      
      const notesString = (tx.notes || []).join(' ').toLowerCase();
      const matchesSearch = searchQuery === '' || 
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notesString.includes(searchQuery.toLowerCase()) ||
        (tx.debtorName?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (tx.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
      
      const matchesStartDate = startDate ? tx.date >= startDate : true;
      const matchesEndDate = endDate ? tx.date <= endDate : true;
      const matchesType = selectedType === 'ALL' ? true : tx.type === selectedType;
      
      const matchesCat = selectedCategory === 'ALL' ? true : tx.category === selectedCategory;
      const matchesSrc = selectedSource === 'ALL' ? true : tx.expenseSource === selectedSource;
      const matchesPaid = paidStatus === 'ALL' ? true : 
                         paidStatus === 'PAID' ? tx.isPaid !== false : 
                         tx.isPaid === false;

      return matchesSearch && matchesStartDate && matchesEndDate && matchesType && 
             matchesCat && matchesSrc && matchesPaid;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, searchQuery, startDate, endDate, selectedType, selectedCategory, selectedSource, paidStatus]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(tx => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const resetFilters = () => {
    setSearchQuery(''); setStartDate(''); setEndDate(''); setSelectedType('ALL');
    setSelectedCategory('ALL'); setSelectedSource('ALL'); setPaidStatus('ALL');
  };

  const isFilterActive = searchQuery || startDate || endDate || selectedType !== 'ALL' || selectedCategory !== 'ALL' || selectedSource !== 'ALL' || paidStatus !== 'ALL';

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2.5rem] shadow-ios border border-white dark:border-slate-800 overflow-hidden flex flex-col h-full animate-ios">
      <div className="px-6 py-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">{title}</h3>
            <p className="text-sm font-black dark:text-white uppercase tracking-tighter">{t('journal_title')}</p>
          </div>
          <div className="flex items-center gap-2">
            {isFilterActive && (
              <button onClick={resetFilters} className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1 bg-rose-50 dark:bg-rose-950/30 px-3 py-1.5 rounded-xl border border-rose-100 dark:border-rose-900/30">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
            <button onClick={() => setShowFilters(!showFilters)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active-scale ${showFilters || isFilterActive ? 'bg-brand-600 text-white shadow-vivid' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
              {showFilters ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
            </button>
          </div>
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
                <span className="text-[9px] font-black text-slate-400 uppercase">{txs.length} mục</span>
             </div>

             <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {txs.map(tx => {
                   const isIncome = tx.type === TransactionType.INCOME;
                   const isDebt = tx.isPaid === false;
                   const isAdvance = tx.category === 'Nợ / Tiền ứng';
                   const hasNotes = tx.notes && tx.notes.length > 0;

                   return (
                    <div key={tx.id} className="px-6 py-5 flex flex-col gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors relative group border-l-4 border-transparent hover:border-brand-500">
                       <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-4 min-w-0">
                             {/* Icon Trạng Thái */}
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 ${isIncome ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30' : (isDebt ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30' : 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-800 dark:border-slate-700')}`}>
                                {isIncome ? <ArrowUpCircle className="w-7 h-7" /> : <ArrowDownCircle className="w-7 h-7" />}
                             </div>

                             {/* Thông tin chính */}
                             <div className="min-w-0 flex flex-col">
                                <h4 className="text-[12px] font-black dark:text-white uppercase tracking-tight leading-none mb-2 truncate">
                                   {isIncome ? 'QUYẾT TOÁN DOANH THU' : (tx.debtorName || translateCategory(tx.category))}
                                </h4>
                                
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                   {!isIncome && (
                                     <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[8px] font-black uppercase flex items-center gap-1 border dark:border-slate-700">
                                       <Wallet className="w-2.5 h-2.5" /> {translateSource(tx.expenseSource)}
                                     </span>
                                   )}
                                   {tx.authorName && (
                                     <span className="px-2 py-0.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 text-[8px] rounded-lg uppercase font-black border border-brand-100 dark:border-brand-800/50 flex items-center gap-1">
                                       <UserIcon className="w-2.5 h-2.5" /> {tx.authorName}
                                     </span>
                                   )}
                                   {isDebt && (
                                      <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] rounded-lg uppercase font-black shadow-sm flex items-center gap-1 animate-pulse">
                                         <AlertCircle className="w-2.5 h-2.5" /> {isAdvance ? 'Tiền ứng' : 'Ghi nợ'}
                                      </span>
                                   )}
                                </div>

                                {/* HIỂN THỊ GHI CHÚ (NOTES) */}
                                {hasNotes && (
                                  <div className="space-y-1 mt-1 p-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                    {tx.notes.map((note, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight italic">
                                        <MessageSquare className="w-3 h-3 mt-0.5 shrink-0 text-brand-400" />
                                        <span>{note}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Chi tiết Doanh thu (nếu là INCOME) */}
                                {isIncome && tx.incomeBreakdown && (
                                  <div className="flex flex-wrap gap-3 mt-2">
                                     <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase">
                                        <Banknote className="w-3 h-3" /> {formatCurrency(tx.incomeBreakdown.cash, lang)}
                                     </div>
                                     <div className="flex items-center gap-1 text-[9px] font-black text-rose-500 uppercase">
                                        <CreditCard className="w-3 h-3" /> {formatCurrency(tx.incomeBreakdown.card, lang)}
                                     </div>
                                     <div className="flex items-center gap-1 text-[9px] font-black text-indigo-500 uppercase">
                                        <Smartphone className="w-3 h-3" /> {formatCurrency(tx.incomeBreakdown.delivery || 0, lang)}
                                     </div>
                                  </div>
                                )}
                             </div>
                          </div>

                          {/* Số tiền & Hành động */}
                          <div className="flex flex-col items-end shrink-0 gap-3">
                             <div className="text-right">
                                <p className={`text-[15px] font-black tracking-tighter ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                                   {isIncome ? '+' : '-'}{formatCurrency(tx.amount, lang)}
                                </p>
                             </div>
                             
                             <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                <button 
                                  onClick={() => onEdit(tx)} 
                                  className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center active-scale border border-indigo-100 dark:border-indigo-800"
                                >
                                   <Edit3 className="w-4 h-4" />
                                </button>
                                {!isViewer && (
                                   <button 
                                     onClick={() => onDelete(tx.id)} 
                                     className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 flex items-center justify-center active-scale border border-rose-100 dark:border-rose-800"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                )}
                             </div>
                          </div>
                       </div>
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
             {isFilterActive && <p className="text-[9px] font-bold uppercase">Thử xóa bộ lọc để xem các chi phí ẩn</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
