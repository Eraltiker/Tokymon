
import React, { useState, useRef } from 'react';
import { Transaction, TransactionType, formatCurrency, HistoryEntry } from '../types';
import { X, Save, Euro, ChevronLeft, ChevronRight, Store, CreditCard, Edit3, Smartphone, Calendar, CalendarDays } from 'lucide-react';

interface EditTransactionModalProps {
  transaction: Transaction;
  expenseCategories: string[];
  onClose: () => void;
  onSave: (updated: Transaction) => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, expenseCategories, onClose, onSave }) => {
  const [note, setNote] = useState(transaction.note);
  const [date, setDate] = useState(transaction.date);
  const [category, setCategory] = useState(transaction.category);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [kasseInput, setKasseInput] = useState(() => {
    if (transaction.type === TransactionType.INCOME && transaction.incomeBreakdown) {
       return (transaction.amount - (transaction.incomeBreakdown.delivery || 0)).toString();
    }
    return transaction.amount.toString();
  });
  
  const [appInput, setAppInput] = useState(transaction.incomeBreakdown?.delivery?.toString() || '0');
  const [cardTotalInput, setCardTotalInput] = useState(transaction.incomeBreakdown?.card.toString() || '0');
  const [expenseAmount, setExpenseAmount] = useState(transaction.amount.toString());

  const validateAndSetAmount = (val: string, setter: (v: string) => void) => {
    if (/^[0-9]*[.,]?[0-9]*$/.test(val)) setter(val);
  };

  const parseLocaleNumber = (val: string): number => {
    if (!val) return 0;
    return Number(val.replace(',', '.'));
  };

  const adjustDate = (days: number) => {
    const current = new Date(date);
    current.setDate(current.getDate() + days);
    setDate(current.toISOString().split('T')[0]);
  };

  const formatDateDisplay = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleSave = () => {
    let finalAmount = 0;
    const historyEntry: HistoryEntry = {
      timestamp: new Date().toISOString(),
      amount: transaction.amount,
      category: transaction.category,
      note: transaction.note,
      incomeBreakdown: transaction.incomeBreakdown,
      expenseSource: transaction.expenseSource,
      isPaid: transaction.isPaid
    };

    const updated: Transaction = {
      ...transaction,
      note,
      date,
      category,
      history: [...(transaction.history || []), historyEntry],
      updatedAt: new Date().toISOString()
    };

    if (transaction.type === TransactionType.INCOME) {
      const kasse = parseLocaleNumber(kasseInput);
      const app = parseLocaleNumber(appInput);
      const cardTotal = parseLocaleNumber(cardTotalInput);
      const revenue = kasse + app;
      const cash = Math.max(0, revenue - cardTotal);
      finalAmount = revenue;
      updated.amount = finalAmount;
      updated.incomeBreakdown = { cash, card: cardTotal, delivery: app };
    } else {
      finalAmount = parseLocaleNumber(expenseAmount);
      updated.amount = finalAmount;
    }

    if (finalAmount <= 0) return;
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      {/* Container chính: Trên mobile là Bottom Sheet (rounded-t), trên desktop là Modal (rounded-4xl) */}
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl relative z-[201] overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 duration-500">
        {/* Handle bar for Mobile */}
        <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto my-3 sm:hidden" />
        
        <div className="px-6 py-3 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">Chỉnh sửa</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{category}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto no-scrollbar space-y-5">
          {/* Date Picker Section */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => adjustDate(-1)} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-slate-400 active:scale-90"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex-1 text-center relative flex flex-col items-center">
               <span className="text-xs font-black dark:text-white uppercase flex items-center gap-1.5">
                 <Calendar className="w-3 h-3 text-indigo-500" /> {formatDateDisplay(date)}
               </span>
               <input type="date" value={date} onChange={e => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <button type="button" onClick={() => adjustDate(1)} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm text-slate-400 active:scale-90"><ChevronRight className="w-4 h-4" /></button>
          </div>

          {transaction.type === TransactionType.INCOME ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tiền Quán (Kasse)</label>
                <input type="text" inputMode="decimal" value={kasseInput} onChange={e => validateAndSetAmount(e.target.value, setKasseInput)} className="w-full px-5 py-3.5 bg-indigo-50/10 dark:bg-indigo-900/10 border-2 border-indigo-50 dark:border-indigo-900 rounded-2xl font-black text-2xl text-indigo-600 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">App Online</label>
                  <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-black text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tổng Thẻ</label>
                  <input type="text" inputMode="decimal" value={cardTotalInput} onChange={e => validateAndSetAmount(e.target.value, setCardTotalInput)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-black text-sm text-indigo-500" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Số tiền chi (€)</label>
              <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full py-4 bg-rose-50/10 dark:bg-rose-900/10 border-2 border-rose-50 dark:border-rose-900 rounded-2xl font-black text-2xl text-rose-600 outline-none text-center" />
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú..." className="w-full bg-transparent text-[13px] font-bold outline-none dark:text-white resize-none h-20" />
          </div>

          <button onClick={handleSave} className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mb-4">
            <Save className="w-5 h-5" /> Cập nhật ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTransactionModal;
