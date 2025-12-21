
import React, { useState } from 'react';
import { Transaction, TransactionType, formatCurrency } from '../types';
import { X, Save, Euro, ChevronLeft, ChevronRight, Store, CreditCard, Edit3, Smartphone, Calendar } from 'lucide-react';

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

  const [kasseInput, setKasseInput] = useState(() => {
    if (transaction.type === TransactionType.INCOME && transaction.incomeBreakdown) {
       return (transaction.amount - (transaction.incomeBreakdown.delivery || 0)).toString();
    }
    return transaction.amount.toString();
  });
  
  const [appInput, setAppInput] = useState(transaction.incomeBreakdown?.delivery?.toString() || '0');
  const [cardTotalInput, setCardTotalInput] = useState(transaction.incomeBreakdown?.card.toString() || '0');
  const [expenseAmount, setExpenseAmount] = useState(transaction.amount.toString());

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
    const historyEntry = {
      timestamp: new Date().toISOString(),
      amount: transaction.amount,
      category: transaction.category,
      note: transaction.note,
      incomeBreakdown: transaction.incomeBreakdown,
      expenseSource: transaction.expenseSource
    };

    const updated: Transaction = {
      ...transaction,
      note,
      date,
      category,
      history: [...(transaction.history || []), historyEntry]
    };

    if (transaction.type === TransactionType.INCOME) {
      const kasse = Number(kasseInput) || 0;
      const app = Number(appInput) || 0;
      const cardTotal = Number(cardTotalInput) || 0;
      const revenue = kasse + app;
      const cash = Math.max(0, revenue - cardTotal);
      finalAmount = revenue;
      updated.amount = finalAmount;
      updated.incomeBreakdown = { cash, card: cardTotal, delivery: app };
    } else {
      finalAmount = Number(expenseAmount) || 0;
      updated.amount = finalAmount;
    }

    if (finalAmount <= 0) return;
    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl relative z-[111] overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 duration-300">
        <div className="px-6 py-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-sm">Chỉnh sửa giao dịch</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar space-y-4">
          {transaction.type === TransactionType.INCOME ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Kasse (Tại quán)</label>
                <div className="relative">
                  <input type="number" inputMode="decimal" value={kasseInput} onChange={e => setKasseInput(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-indigo-50/30 dark:bg-indigo-900/10 border dark:border-indigo-900 rounded-2xl font-black text-xl text-indigo-600 outline-none" />
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">App (Online)</label>
                  <div className="relative">
                    <input type="number" inputMode="decimal" value={appInput} onChange={e => setAppInput(e.target.value)} className="w-full pl-10 py-2.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-black text-base" />
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tổng Thẻ</label>
                  <div className="relative">
                    <input type="number" inputMode="decimal" value={cardTotalInput} onChange={e => setCardTotalInput(e.target.value)} className="w-full pl-10 py-2.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-black text-base" />
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Số tiền chi (€)</label>
              <div className="relative">
                <input type="number" inputMode="decimal" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-rose-50/30 dark:bg-rose-900/10 border dark:border-rose-900 rounded-2xl font-black text-xl text-rose-600 outline-none" />
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-300" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[1rem] p-1.5 shadow-sm">
              <button onClick={() => adjustDate(-1)} className="p-1 text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
              <div className="flex-1 relative flex items-center justify-center">
                 <span className="text-[11px] font-black text-slate-800 dark:text-white">{formatDateDisplay(date)}</span>
                 <input type="date" value={date} onChange={e => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <button onClick={() => adjustDate(1)} className="p-1 text-slate-400 mr-1"><ChevronRight className="w-4 h-4" /></button>
              <Calendar className="w-3.5 h-3.5 text-slate-200" />
            </div>
            
            <div className="relative flex items-center bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[1rem] p-1.5 shadow-sm">
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú..." className="w-full px-2 bg-transparent text-[11px] font-bold outline-none" />
              <Edit3 className="w-3.5 h-3.5 text-slate-200 shrink-0 mr-1" />
            </div>
          </div>

          <button onClick={handleSave} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTransactionModal;
