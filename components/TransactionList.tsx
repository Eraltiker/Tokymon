
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, formatCurrency, UserRole, Language } from '../types';
import { useTranslation } from '../i18n';
import { 
  Trash2, ArrowUpCircle, 
  ArrowDownCircle, Edit3, Search, 
  CalendarDays,
  Filter, X, Info, User as UserIcon, MessageSquare, ShieldCheck
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

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | 'ALL'>('ALL');

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
      return matchesSearch && matchesStartDate && matchesEndDate && matchesType;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, searchQuery, startDate, endDate, selectedType]);

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2.5rem] shadow-ios border border-white dark:border-slate-800 overflow-hidden flex flex-col h-full animate-ios">
      {/* Header Danh sách */}
      <div className="px-7 py-5 space-y-4 bg-slate-50/40 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.1em] opacity-80">{title}</h3>
          <button onClick={() => setShowFilters(!showFilters)} className={`w-11 h-11 rounded-[1.2rem] flex items-center justify-center transition-all active-scale ${showFilters ? 'bg-brand-600 text-white shadow-vivid' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 shadow-sm'}`}>
            {showFilters ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
          </button>
        </div>

        <div className="relative">
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('placeholder_search')} className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-950 rounded-2xl font-bold text-xs outline-none border border-slate-200 focus:border-brand-500 shadow-sm transition-all dark:text-white" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        </div>

        {showFilters && (
          <div className="p-5 bg-white dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-5 animate-ios">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{t('from_date')}</label>
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-black border border-slate-200 outline-none dark:text-white" />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{t('to_date')}</label>
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs font-black border border-slate-200 outline-none dark:text-white" />
               </div>
             </div>
             <button onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); setSelectedType('ALL'); }} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-slate-200 active-scale transition-all">{t('reset_filter')}</button>
          </div>
        )}
      </div>
      
      {/* List Items */}
      <div className="overflow-y-auto flex-1 no-scrollbar px-6 pt-6 pb-20">
        <div className="space-y-4">
          {filteredTransactions.map((tx) => (
            <div key={tx.id} className="bg-white dark:bg-slate-950/60 p-5 rounded-[2.2rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-4 group active-scale transition-all shadow-sm">
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-4 min-w-0 items-start">
                  <div className={`w-14 h-14 rounded-[1.4rem] flex items-center justify-center shrink-0 border mt-1 ${tx.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                    {tx.type === TransactionType.INCOME ? <ArrowUpCircle className="w-8 h-8" /> : <ArrowDownCircle className="w-8 h-8" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-800 dark:text-white text-xs uppercase truncate tracking-tight">{tx.debtorName || translateCategory(tx.category)}</h4>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" /> {tx.date.split('-').reverse().join('/')} 
                    </p>
                    {/* Audit Info */}
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                       <div className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-50/50 dark:bg-brand-900/20 rounded-lg border border-brand-100 dark:border-brand-900/50">
                          <UserIcon className="w-3 h-3 text-brand-500" />
                          <span className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-tighter">{tx.authorName || '---'}</span>
                       </div>
                       {tx.lastEditorName && (
                         <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/50">
                            <ShieldCheck className="w-3 h-3 text-amber-500" />
                            <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter">Sửa: {tx.lastEditorName}</span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-base font-black tracking-tighter ${tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 block opacity-80">{translateSource(tx.expenseSource)}</span>
                </div>
              </div>

              {/* Danh sách ghi chú */}
              {tx.notes && tx.notes.length > 0 && (
                <div className="space-y-1.5 pl-2">
                  {tx.notes.map((note, nIdx) => (
                    <div key={nIdx} className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 flex gap-3 items-start relative group/note overflow-hidden">
                      <div className="absolute left-0 top-0 w-1 h-full bg-brand-500/30" />
                      <MessageSquare className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0 opacity-60" />
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">"{note}"</p>
                    </div>
                  ))}
                </div>
              )}

              {!isViewer && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-50 dark:border-slate-800/60 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(tx)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 active-scale transition-all border border-slate-200 flex items-center gap-2"><Edit3 className="w-4 h-4" /> {t('edit')}</button>
                    <button onClick={() => onDelete(tx.id)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase text-rose-500 active-scale transition-all border border-slate-200 flex items-center gap-2"><Trash2 className="w-4 h-4" /> {t('delete')}</button>
                </div>
              )}
            </div>
          ))}
          {filteredTransactions.length === 0 && (
            <div className="py-28 text-center opacity-40 flex flex-col items-center gap-4"><Info className="w-12 h-12" /><p className="text-sm font-black uppercase tracking-widest">{t('no_data')}</p></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
