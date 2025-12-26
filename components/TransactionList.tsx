
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, EXPENSE_SOURCE_LABELS, UserRole } from '../types';
import { 
  Trash2, CreditCard, Store, Wallet, ArrowUpCircle, 
  ArrowDownCircle, Edit3, Search, 
  SlidersHorizontal, CalendarDays,
  Banknote, Info, Smartphone, Receipt, Calendar, Filter, X
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
        (t.note?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        (t.debtorName?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
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

  const categories = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.category))).sort();
  }, [transactions]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border dark:border-slate-800 overflow-hidden flex flex-col h-full animate-in fade-in duration-500">
      {/* Dynamic Header & Search */}
      <div className="p-6 space-y-5 flex-shrink-0 bg-slate-50/30 dark:bg-slate-800/20 border-b dark:border-slate-800">
        <div className="flex justify-between items-center px-1">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{title}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{filteredTransactions.length} kết quả</span>
              {searchQuery || startDate || selectedType !== 'ALL' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              ) : null}
            </div>
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={`w-12 h-12 rounded-2xl border transition-all active:scale-90 flex items-center justify-center ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-500'}`}
          >
            {showFilters ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
          </button>
        </div>

        <div className="relative group">
          <input 
            type="text" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            placeholder="Tìm theo hạng mục, ghi chú, NCC..." 
            className="w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-950 rounded-2xl font-bold text-sm outline-none border-2 border-slate-100 dark:border-slate-800 focus:border-indigo-500 transition-all dark:text-white shadow-sm" 
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
        </div>

        {showFilters && (
          <div className="p-5 bg-white dark:bg-slate-950 rounded-[2rem] border dark:border-slate-800 shadow-xl space-y-5 animate-in slide-in-from-top-4 duration-300">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Từ ngày</label>
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[11px] font-black border dark:border-slate-800 outline-none focus:border-indigo-500" />
               </div>
               <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Đến ngày</label>
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[11px] font-black border dark:border-slate-800 outline-none focus:border-indigo-500" />
               </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Loại</label>
                 <select value={selectedType} onChange={e => setSelectedType(e.target.value as any)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[11px] font-black border dark:border-slate-800 outline-none">
                    <option value="ALL">TẤT CẢ</option>
                    <option value={TransactionType.INCOME}>DOANH THU</option>
                    <option value={TransactionType.EXPENSE}>CHI PHÍ</option>
                 </select>
               </div>
               <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Hạng mục</label>
                 <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-[11px] font-black border dark:border-slate-800 outline-none truncate">
                    <option value="">TẤT CẢ</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>
             </div>

             <button onClick={clearFilters} className="w-full py-3.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg">Xóa bộ lọc</button>
          </div>
        )}
      </div>
      
      {/* Scrollable Transaction Feed */}
      <div className="overflow-y-auto flex-1 custom-scrollbar px-6 pt-6 pb-24">
        <div className="space-y-4">
          {filteredTransactions.map((t) => (
            <div key={t.id} className="bg-white dark:bg-slate-950 p-5 rounded-3xl border dark:border-slate-800 flex flex-col gap-4 group hover:shadow-md hover:border-indigo-500/20 transition-all duration-300">
              <div className="flex justify-between items-start">
                 <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30'}`}>
                      {t.type === TransactionType.INCOME ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0 pt-1">
                       <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase leading-none truncate">{t.debtorName || t.category}</h4>
                       <div className="flex items-center gap-2 mt-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> {t.date}</span>
                          {t.note && (
                            <div className="flex items-center gap-1 max-w-[120px]">
                               <span className="text-slate-300">•</span>
                               <span className="text-[9px] font-bold text-slate-400 italic truncate">{t.note}</span>
                            </div>
                          )}
                       </div>
                    </div>
                 </div>
                 <div className="text-right shrink-0 pt-1">
                    <p className={`text-lg font-black leading-none tracking-tight ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 mt-2">
                      {t.type === TransactionType.INCOME ? (
                        <div className="flex gap-1.5">
                           {t.incomeBreakdown?.cash ? <div className="w-4 h-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-md flex items-center justify-center"><Banknote className="w-2.5 h-2.5 text-emerald-500" /></div> : null}
                           {t.incomeBreakdown?.card ? <div className="w-4 h-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-md flex items-center justify-center"><CreditCard className="w-2.5 h-2.5 text-indigo-500" /></div> : null}
                           {t.incomeBreakdown?.delivery ? <div className="w-4 h-4 bg-orange-50 dark:bg-orange-900/20 rounded-md flex items-center justify-center"><Smartphone className="w-2.5 h-2.5 text-orange-500" /></div> : null}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                           {t.isPaid === false && <span className="text-[7px] font-black text-rose-500 bg-rose-50 px-1 py-0.5 rounded-sm uppercase">Công nợ</span>}
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                             {t.expenseSource ? EXPENSE_SOURCE_LABELS[t.expenseSource] : t.isPaid === false ? 'Chưa trả' : 'Khác'}
                           </span>
                        </div>
                      )}
                    </div>
                 </div>
              </div>

              {!isViewer && (
                <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(t)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-[9px] font-black uppercase text-slate-500 hover:text-indigo-600 transition-all"><Edit3 className="w-3 h-3" /> Sửa</button>
                    <button onClick={() => onDelete(t.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-[9px] font-black uppercase text-slate-500 hover:text-rose-600 transition-all"><Trash2 className="w-3 h-3" /> Xóa</button>
                </div>
              )}
            </div>
          ))}
          
          {filteredTransactions.length === 0 && (
            <div className="py-24 text-center opacity-30">
               <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Search className="w-10 h-10 text-slate-300" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-[0.4em] px-10">Không tìm thấy bản ghi phù hợp</p>
               <button onClick={clearFilters} className="mt-6 text-[10px] font-black text-indigo-500 uppercase underline tracking-widest">Xóa các bộ lọc</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionList;
