
import React, { useState } from 'react';
import { Transaction, TransactionType, HistoryEntry, Language } from '../types';
import { useTranslation } from '../i18n';
import { X, Save, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface EditTransactionModalProps {
  transaction: Transaction;
  expenseCategories: string[];
  onClose: () => void;
  onSave: (updated: Transaction) => void;
  lang?: Language;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, expenseCategories, onClose, onSave, lang = 'vi' }) => {
  const { t, translateCategory } = useTranslation(lang as Language);
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

  const validateAndSetAmount = (val: string, setter: (v: string) => void) => {
    const sanitized = val.replace(',', '.');
    if (/^[0-9]*\.?[0-9]*$/.test(sanitized)) setter(sanitized);
  };

  const parseLocaleNumber = (val: string): number => {
    if (!val) return 0;
    return Number(val);
  };

  const adjustDate = (days: number) => {
    const current = new Date(date);
    current.setDate(current.getDate() + days);
    setDate(current.toISOString().split('T')[0]);
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
      ...transaction, note, date, category,
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
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl w-full max-w-lg rounded-t-[2rem] sm:rounded-3xl shadow-ios relative z-[201] overflow-hidden flex flex-col max-h-[90vh] animate-ios">
        <div className="px-5 py-3 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-xs">{t('edit_title')}</h3>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{translateCategory(category)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto no-scrollbar space-y-4">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/50 p-1.5 rounded-2xl border dark:border-slate-800">
            <button type="button" onClick={() => adjustDate(-1)} className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-400 active-scale"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex-1 text-center relative flex flex-col items-center">
               <span className="text-[10px] font-black dark:text-white uppercase flex items-center gap-1.5"><Calendar className="w-3 h-3 text-brand-500" /> {date.split('-').reverse().join('/')}</span>
               <input type="date" value={date} onChange={e => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <button type="button" onClick={() => adjustDate(1)} className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-400 active-scale"><ChevronRight className="w-4 h-4" /></button>
          </div>
          {transaction.type === TransactionType.INCOME ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('kasse_total')}</label>
                <input type="text" inputMode="decimal" value={kasseInput} onChange={e => validateAndSetAmount(e.target.value, setKasseInput)} className="w-full px-5 py-3 bg-brand-50/10 dark:bg-brand-900/10 border dark:border-brand-900 rounded-2xl font-black text-xl text-brand-600 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('app_total')}</label>
                  <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-black text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('card_total')}</label>
                  <input type="text" inputMode="decimal" value={cardTotalInput} onChange={e => validateAndSetAmount(e.target.value, setCardTotalInput)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-black text-sm" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('amount')} (€)</label>
              <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full py-3.5 bg-rose-50/10 dark:bg-rose-900/10 border dark:border-rose-900 rounded-2xl font-black text-xl text-rose-600 outline-none text-center" />
            </div>
          )}
          <button onClick={handleSave} className="w-full h-12 bg-brand-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-vivid active-scale transition-all flex items-center justify-center gap-2 mb-2">
            <Save className="w-4 h-4" /> {t('save_changes_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTransactionModal;
