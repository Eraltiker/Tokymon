
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
    if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
      setter(val);
    }
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
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-');
    const formatted = `${d}/${m}/${y}`;
    if (dateStr === today) return `Hôm nay, ${formatted}`;
    if (dateStr === yesterday) return `Hôm qua, ${formatted}`;
    return formatted;
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
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl relative z-[201] overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-20 duration-500">
        <div className="px-6 py-5 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-base">Cập nhật thông tin</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{transaction.category}</p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
          <div className="bg-slate-100/50 dark:bg-slate-800/30 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50 space-y-3">
             <div className="flex items-center justify-between">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                 <CalendarDays className="w-3 h-3 text-indigo-500" /> Thời gian giao dịch
               </label>
             </div>
             
             <div className="flex items-center gap-2">
                <button type="button" onClick={() => adjustDate(-1)} className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 transition-all border-2 dark:border-slate-700 shadow-sm active:scale-95 z-10"><ChevronLeft className="w-5 h-5" /></button>
                
                <div 
                  className="relative flex-1 flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-500 transition-all cursor-pointer shadow-sm group active:scale-[0.98] min-h-[54px] overflow-hidden"
                >
                    <div className="flex flex-col">
                      <span className="text-[14px] font-black text-slate-800 dark:text-white leading-none">{formatDateDisplay(date)}</span>
                      <span className="text-[7px] font-bold text-slate-400 uppercase mt-1">Nhấn để đổi ngày</span>
                    </div>
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    <input 
                      type="date" 
                      ref={dateInputRef}
                      value={date} 
                      onChange={e => setDate(e.target.value)} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                    />
                </div>

                <button type="button" onClick={() => adjustDate(1)} className="p-3 bg-white dark:bg-slate-800 rounded-2xl text-slate-400 transition-all border-2 dark:border-slate-700 shadow-sm active:scale-95 z-10"><ChevronRight className="w-5 h-5" /></button>
             </div>
          </div>

          {transaction.type === TransactionType.INCOME ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Kasse (Tại quán)</label>
                <div className="relative">
                  <input type="text" inputMode="decimal" value={kasseInput} onChange={e => validateAndSetAmount(e.target.value, setKasseInput)} className="w-full pl-12 pr-4 py-4 bg-indigo-50/20 dark:bg-indigo-900/10 border-2 border-indigo-50 dark:border-indigo-900 rounded-2xl font-black text-2xl text-indigo-600 outline-none" />
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">App (Online)</label>
                  <div className="relative">
                    <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} className="w-full pl-10 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-base" />
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tổng Thẻ</label>
                  <div className="relative">
                    <input type="text" inputMode="decimal" value={cardTotalInput} onChange={e => validateAndSetAmount(e.target.value, setCardTotalInput)} className="w-full pl-10 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-base text-indigo-500" />
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Số tiền chi (€)</label>
              <div className="relative">
                <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full pl-12 pr-4 py-4 bg-rose-50/20 dark:bg-rose-900/10 border-2 border-rose-50 dark:border-rose-900 rounded-2xl font-black text-2xl text-rose-600 outline-none" />
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-300" />
              </div>
            </div>
          )}

          <div className="relative flex items-center bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú nội dung..." className="w-full px-2 bg-transparent text-xs font-bold outline-none" />
            <Edit3 className="w-4 h-4 text-slate-200 shrink-0" />
          </div>

          <button onClick={handleSave} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2">
            <Save className="w-5 h-5" /> Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTransactionModal;
