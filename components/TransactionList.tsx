
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, EXPENSE_SOURCE_LABELS, UserRole } from '../types';
import { 
  Trash2, CreditCard, Store, Wallet, Calendar, ArrowUpCircle, 
  ArrowDownCircle, Edit3, History, X, Search, Filter, 
  ChevronDown, ChevronUp, SlidersHorizontal, Eraser, Clock,
  Tag, Euro, ArrowUpDown
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  title?: string;
  userRole?: UserRole;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, onEdit, title = "Lịch Sử Giao Dịch", userRole }) => {
  const [viewingHistory, setViewingHistory] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const isViewer = userRole === UserRole.VIEWER;

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | 'ALL'>('ALL');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

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
      
      const amt = t.amount;
      const matchesMinAmt = minAmount ? amt >= Number(minAmount) : true;
      const matchesMaxAmt = maxAmount ? amt <= Number(maxAmount) : true;

      return matchesSearch && matchesStartDate && matchesEndDate && matchesCategory && matchesType && matchesMinAmt && matchesMaxAmt;
    }).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime() || Number(b.id) - Number(a.id)
    );
  }, [transactions, searchQuery, startDate, endDate, selectedCategory, selectedType, minAmount, maxAmount]);

  const clearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSelectedCategory('');
    setSelectedType('ALL');
    setMinAmount('');
    setMaxAmount('');
  };

  const getSourceIcon = (source?: ExpenseSource) => {
    switch (source) {
      case ExpenseSource.SHOP_CASH: return <Store className="w-3.5 h-3.5" />;
      case ExpenseSource.WALLET: return <Wallet className="w-3.5 h-3.5" />;
      case ExpenseSource.CARD: return <CreditCard className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const hasActiveFilters = searchQuery || startDate || endDate || selectedCategory || selectedType !== 'ALL' || minAmount || maxAmount;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col animate-in fade-in slide-in-from-right-4 relative transition-colors duration-300">
      
      <div className="p-6 md:p-8 border-b border-slate-50 dark:border-slate-800 space-y-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {filteredTransactions.length} giao dịch
              </p>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase rounded-full">
                  Đã lọc
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${showFilters ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-black uppercase tracking-widest">Bộ lọc</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm danh mục hoặc ghi chú..."
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {showFilters && (
          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" /> Từ ngày
              </label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold dark:text-slate-200 focus:border-indigo-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" /> Đến ngày
              </label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold dark:text-slate-200 focus:border-indigo-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" /> Danh mục
              </label>
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold dark:text-slate-200 outline-none focus:border-indigo-500">
                <option value="">Tất cả danh mục</option>
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-1">
                <ArrowUpDown className="w-2.5 h-2.5" /> Loại giao dịch
              </label>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value as any)} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold dark:text-slate-200 outline-none focus:border-indigo-500">
                <option value="ALL">Tất cả loại</option>
                <option value={TransactionType.INCOME}>Doanh thu (+)</option>
                <option value={TransactionType.EXPENSE}>Chi phí (-)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-1">
                <Euro className="w-2.5 h-2.5" /> Tiền từ
              </label>
              <input type="number" inputMode="decimal" placeholder="Min" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold dark:text-slate-200 focus:border-indigo-500 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-1">
                <Euro className="w-2.5 h-2.5" /> Đến tiền
              </label>
              <input type="number" inputMode="decimal" placeholder="Max" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs font-bold dark:text-slate-200 focus:border-indigo-500 outline-none" />
            </div>
            <div className="lg:col-span-3 flex justify-end pt-2">
              <button 
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="flex items-center gap-2 py-2.5 px-6 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-slate-200 shadow-sm"
              >
                <Eraser className="w-3.5 h-3.5" /> Xóa bộ lọc
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="overflow-y-auto flex-1 custom-scrollbar px-2 md:px-0 scroll-container">
        {filteredTransactions.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-700">
               <Search className="w-6 h-6 text-slate-200 dark:text-slate-700" />
            </div>
            <p className="text-slate-400 dark:text-slate-500 font-bold italic text-sm">Không tìm thấy giao dịch nào phù hợp.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-left hidden md:table border-collapse">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] sticky top-0 z-10">
                <tr className="border-b dark:border-slate-800">
                  <th className="px-8 py-5">Ngày</th>
                  <th className="px-8 py-5">Nội dung</th>
                  <th className="px-8 py-5 text-right">Số tiền</th>
                  {!isViewer && <th className="px-8 py-5 text-center">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-200 group">
                    <td className="px-8 py-6 align-top">
                      <div className="font-black text-slate-700 dark:text-slate-300 text-xs">{t.date}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                         <div className="font-black text-slate-900 dark:text-slate-100 text-base">{t.category}</div>
                         {t.type === TransactionType.EXPENSE && t.expenseSource && (
                            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1 rounded-lg">
                              {getSourceIcon(t.expenseSource)}
                              {EXPENSE_SOURCE_LABELS[t.expenseSource]}
                            </div>
                         )}
                         {t.history && t.history.length > 0 && (
                           <button 
                            onClick={() => setViewingHistory(t)}
                            className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                           >
                             <History className="w-2.5 h-2.5" /> Đã sửa ({t.history.length})
                           </button>
                         )}
                      </div>
                      {t.type === TransactionType.INCOME && t.incomeBreakdown && (
                        <div className="flex gap-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                          <span>TM: {formatCurrency(t.incomeBreakdown.cash || 0)}</span>
                          <span>Thẻ: {formatCurrency(t.incomeBreakdown.card || 0)}</span>
                          <span>App: {formatCurrency(t.incomeBreakdown.delivery || 0)}</span>
                        </div>
                      )}
                      {t.note && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic font-medium">"{t.note}"</div>}
                    </td>
                    <td className={`px-8 py-6 text-right font-black text-lg align-top ${
                      t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount || 0)}
                    </td>
                    {!isViewer && (
                      <td className="px-8 py-6 text-center align-top">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => onEdit(t)} className="p-2.5 text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all" title="Sửa">
                            <Edit3 className="w-5 h-5" />
                          </button>
                          <button onClick={() => onDelete(t.id)} className="p-2.5 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all" title="Xóa">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="md:hidden flex flex-col gap-4 px-3 py-4">
              {filteredTransactions.map(t => (
                <div 
                  key={t.id} 
                  className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-3 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl flex-shrink-0 shadow-lg ${t.type === TransactionType.INCOME ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {t.type === TransactionType.INCOME ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm truncate leading-tight">{t.category}</h4>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.date}</span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={`text-base font-black ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'}{formatCurrency(t.amount || 0)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        {t.type === TransactionType.EXPENSE && t.expenseSource && (
                           <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm w-fit">
                              {getSourceIcon(t.expenseSource)} {EXPENSE_SOURCE_LABELS[t.expenseSource]}
                           </div>
                        )}
                        {t.note && <p className="text-[10px] text-slate-400 dark:text-slate-500 italic font-medium truncate">"{t.note}"</p>}
                      </div>
                      
                      {!isViewer && (
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => onEdit(t)} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDelete(t.id)} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {viewingHistory && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingHistory(null)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-[151] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight text-base">Lịch sử thay đổi</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{viewingHistory.category} - {viewingHistory.date}</p>
                </div>
              </div>
              <button onClick={() => setViewingHistory(null)} className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
              <div className="relative pl-8 pb-4 border-l-2 border-emerald-500">
                <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-50 dark:ring-slate-900" />
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                  <div className="flex justify-between items-center mb-3">
                    <span className="px-3 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-full tracking-widest">Hiện tại</span>
                    <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrency(viewingHistory.amount || 0)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Danh mục</p>
                      <p className="font-bold text-slate-700 dark:text-slate-200">{viewingHistory.category}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Ghi chú</p>
                      <p className="font-bold text-slate-700 dark:text-slate-200 italic">"{viewingHistory.note || '---'}"</p>
                    </div>
                  </div>
                </div>
              </div>

              {[...(viewingHistory.history || [])].reverse().map((entry, idx) => (
                <div key={idx} className="relative pl-8 pb-4 border-l-2 border-slate-200 dark:border-slate-800 last:border-0 last:pb-0">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 ring-4 ring-white dark:ring-slate-900" />
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {new Date(entry.timestamp).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <span className="text-base font-black text-slate-600 dark:text-slate-400">{formatCurrency(entry.amount || 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
