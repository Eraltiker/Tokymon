
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, UserRole, Language, formatCurrency } from '../types';
import TransactionForm from './TransactionForm';
import TransactionList from './TransactionList';
import { useTranslation } from '../i18n';
import { 
  CreditCard, 
  History, 
  AlertCircle, 
  Receipt, 
  UserCheck, 
  Truck, 
  Banknote, 
  Calendar,
  ChevronRight,
  Search,
  ArrowRightLeft
} from 'lucide-react';

interface ExpenseManagerProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  expenseCategories: string[];
  branchId: string;
  initialBalances: { cash: number; card: number };
  userRole?: UserRole;
  lang?: Language;
  branchName?: string;
  currentUsername?: string;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ 
  transactions, 
  onAddTransaction, 
  onDeleteTransaction, 
  onEditTransaction, 
  expenseCategories, 
  branchId, 
  initialBalances, 
  userRole,
  branchName,
  lang = 'vi' as Language,
  currentUsername
}) => {
  const { t, translateCategory } = useTranslation(lang);
  const [activeSubTab, setActiveSubTab] = useState<'DAILY' | 'DEBT'>('DAILY');
  const [debtSearch, setDebtSearch] = useState('');
  
  const isViewer = userRole === UserRole.VIEWER;

  // Lọc chi phí hằng ngày: HIỂN THỊ TẤT CẢ (Bao gồm cả nợ và tiền ứng)
  const allExpenseTransactions = useMemo(() => {
    return transactions.filter(tx => 
      tx.type === TransactionType.EXPENSE && 
      tx.branchId === branchId && 
      !tx.deletedAt
    ).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, branchId]);

  // Sổ nợ: Chỉ lọc những khoản CHƯA ĐỐI SOÁT XONG (để xử lý nhanh)
  const pendingDebtTransactions = useMemo(() => {
    return transactions.filter(tx => 
      tx.type === TransactionType.EXPENSE && 
      tx.branchId === branchId && 
      !tx.deletedAt &&
      (tx.isPaid === false || tx.category === 'Nợ / Tiền ứng') &&
      (tx.amount > (tx.paidAmount || 0)) 
    ).filter(tx => {
        const search = debtSearch.toLowerCase();
        return (tx.debtorName || '').toLowerCase().includes(search) || 
               tx.category.toLowerCase().includes(search);
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, branchId, debtSearch]);

  const totalRemainingDebt = useMemo(() => {
    return pendingDebtTransactions.reduce((acc, tx) => acc + (tx.amount - (tx.paidAmount || 0)), 0);
  }, [pendingDebtTransactions]);

  return (
    <div className="space-y-6 animate-ios">
      {/* Sub-tab Navigation Professional */}
      <div className="flex p-1 bg-slate-200/50 dark:bg-slate-900/50 rounded-2xl border dark:border-slate-800 w-full sm:w-fit mx-auto mb-2">
        <button 
          onClick={() => setActiveSubTab('DAILY')}
          className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeSubTab === 'DAILY' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-sm' : 'text-slate-500'}`}
        >
          <Receipt className="w-3.5 h-3.5" /> Nhật ký
        </button>
        <button 
          onClick={() => setActiveSubTab('DEBT')}
          className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 relative ${activeSubTab === 'DEBT' ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-white shadow-sm' : 'text-slate-500'}`}
        >
          <AlertCircle className="w-3.5 h-3.5" /> Công nợ
          {pendingDebtTransactions.length > 0 && (
            <span className="absolute top-1.5 right-2 w-4 h-4 bg-rose-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 font-black">
              {pendingDebtTransactions.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'DAILY' ? (
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
          {!isViewer && (
            <div className="w-full lg:col-span-4 lg:sticky lg:top-20">
              <TransactionForm 
                onAddTransaction={onAddTransaction} 
                expenseCategories={expenseCategories} 
                fixedType={TransactionType.EXPENSE}
                branchId={branchId}
                initialBalances={initialBalances}
                transactions={transactions}
                branchName={branchName}
                lang={lang}
                currentUsername={currentUsername}
              />
            </div>
          )}
          <div className={`w-full ${isViewer ? 'lg:col-span-12' : 'lg:col-span-8'}`}>
            <TransactionList 
              transactions={allExpenseTransactions} 
              onDelete={onDeleteTransaction}
              onEdit={(tx) => onEditTransaction(tx)}
              title={`${t('expense')} - ${branchName}`} 
              userRole={userRole}
              lang={lang}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-ios max-w-4xl mx-auto">
          {/* Debt Summary Banner */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-10 rounded-[3rem] text-white shadow-premium flex flex-col sm:flex-row justify-between items-center gap-8 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -mr-32 -mt-32" />
             <div className="text-center sm:text-left relative z-10">
                <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-2">Cân đối Công nợ hệ thống</p>
                <h3 className="text-5xl font-black tracking-tighter leading-none">{formatCurrency(totalRemainingDebt, lang)}</h3>
             </div>
             <div className="flex flex-col items-center gap-3 relative z-10">
                <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center">
                   <p className="text-[9px] font-black uppercase opacity-60 mb-0.5 tracking-widest">Khoản đang treo</p>
                   <p className="text-xl font-black">{pendingDebtTransactions.length} mục</p>
                </div>
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 shadow-ios overflow-hidden">
             <div className="px-8 py-5 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                   <ArrowRightLeft className="w-4 h-4 text-slate-400" />
                   <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">DANH SÁCH ĐỐI SOÁT</h4>
                </div>
                <div className="relative w-full sm:w-64">
                   <input 
                     type="text" 
                     value={debtSearch}
                     onChange={e => setDebtSearch(e.target.value)}
                     placeholder="Tìm tên chủ nợ..." 
                     className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-950 border-2 dark:border-slate-800 rounded-2xl text-[10px] font-bold outline-none focus:border-brand-500 transition-all"
                   />
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
             </div>

             <div className="divide-y dark:divide-slate-800">
                {pendingDebtTransactions.map(tx => {
                  const remaining = tx.amount - (tx.paidAmount || 0);
                  const isStaff = tx.category === 'Nợ / Tiền ứng';
                  
                  return (
                    <div key={tx.id} className="p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-all group">
                       <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-sm transition-transform group-hover:scale-105 ${isStaff ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                             {isStaff ? <UserCheck className="w-7 h-7" /> : <Truck className="w-7 h-7" />}
                          </div>
                          <div>
                             <p className="text-base font-black dark:text-white uppercase tracking-tight leading-none mb-2">{tx.debtorName || translateCategory(tx.category)}</p>
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {tx.date.split('-').reverse().join('/')}</span>
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border ${isStaff ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{isStaff ? 'Tiền ứng' : 'Nợ NCC'}</span>
                             </div>
                          </div>
                       </div>

                       <div className="flex flex-col sm:items-end w-full sm:w-auto">
                          <div className="flex gap-8 mb-4">
                             <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">{isStaff ? 'Đã ứng' : 'Tổng nợ'}</p>
                                <p className="text-sm font-black dark:text-white">{formatCurrency(tx.amount, lang)}</p>
                             </div>
                             <div className="text-right">
                                <p className={`text-[9px] font-black uppercase mb-1 tracking-widest ${isStaff ? 'text-indigo-500' : 'text-rose-500'}`}>Còn phải {isStaff ? 'thu' : 'trả'}</p>
                                <p className={`text-xl font-black ${isStaff ? 'text-indigo-600' : 'text-rose-600'}`}>{formatCurrency(remaining, lang)}</p>
                             </div>
                          </div>
                          
                          <button 
                             onClick={() => onEditTransaction(tx)}
                             className={`w-full sm:w-auto px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active-scale shadow-sm flex items-center justify-center gap-3 transition-all ${isStaff ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-black'}`}
                           >
                             <Banknote className="w-4 h-4" /> {isStaff ? 'Thu hồi' : 'Trả nợ'}
                           </button>
                       </div>
                    </div>
                  );
                })}

                {pendingDebtTransactions.length === 0 && (
                  <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
                     <History className="w-12 h-12" />
                     <p className="text-[10px] font-black uppercase tracking-[0.2em]">Hệ thống sạch nợ</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManager;
