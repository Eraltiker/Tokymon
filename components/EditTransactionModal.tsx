
import React, { useState } from 'react';
import { Transaction, TransactionType, HistoryEntry, Language } from '../types';
import { useTranslation } from '../i18n';
import { X, Save, ChevronLeft, ChevronRight, Calendar, Coins, Banknote, MessageSquare, Plus, Trash2, CreditCard } from 'lucide-react';

interface EditTransactionModalProps {
  transaction: Transaction;
  expenseCategories: string[];
  onClose: () => void;
  onSave: (updated: Transaction) => void;
  lang?: Language;
  currentUsername?: string;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ 
  transaction, 
  expenseCategories, 
  onClose, 
  onSave, 
  lang = 'vi' as Language,
  currentUsername = 'Unknown'
}) => {
  const { t, translateCategory } = useTranslation(lang);
  const [notes, setNotes] = useState<string[]>(transaction.notes || []);
  const [date, setDate] = useState(transaction.date);
  const [category, setCategory] = useState(transaction.category);

  // LOGIC CHỈNH SỬA
  const [kasseTotalInput, setKasseTotalInput] = useState(() => {
    if (transaction.type === TransactionType.INCOME && transaction.incomeBreakdown) {
       // Tổng Kasse = Doanh thu tổng - Doanh thu App
       return (transaction.amount - (transaction.incomeBreakdown.delivery || 0)).toString();
    }
    return '0';
  });
  
  const [cardTotalInput, setCardTotalInput] = useState(transaction.incomeBreakdown?.card.toString() || '0');
  const [coinInput, setCoinInput] = useState(transaction.incomeBreakdown?.coins?.toString() || '0');
  const [appInput, setAppInput] = useState(transaction.incomeBreakdown?.delivery?.toString() || '0');
  const [expenseAmount, setExpenseAmount] = useState(transaction.amount.toString());

  const validateAndSetAmount = (val: string, setter: (v: string) => void) => {
    const sanitized = val.replace(',', '.');
    if (/^[0-9]*\.?[0-9]*$/.test(sanitized)) setter(sanitized);
  };

  const parseLocaleNumber = (val: string): number => {
    if (!val) return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const addNote = () => setNotes([...notes, '']);
  const updateNote = (i: number, v: string) => {
    const n = [...notes]; n[i] = v; setNotes(n);
  };
  const removeNote = (i: number) => setNotes(notes.filter((_, idx) => idx !== i));

  const handleSave = () => {
    const historyEntry: HistoryEntry = {
      timestamp: new Date().toISOString(),
      amount: transaction.amount,
      category: transaction.category,
      notes: transaction.notes,
      editorName: currentUsername,
      incomeBreakdown: transaction.incomeBreakdown,
      expenseSource: transaction.expenseSource,
      isPaid: transaction.isPaid
    };
    
    const finalNotes = notes.filter(n => n.trim() !== '');

    const updated: Transaction = {
      ...transaction, 
      notes: finalNotes, 
      date, 
      category,
      lastEditorName: currentUsername,
      history: [...(transaction.history || []), historyEntry],
      updatedAt: new Date().toISOString()
    };

    if (transaction.type === TransactionType.INCOME) {
      const kasseTotal = parseLocaleNumber(kasseTotalInput);
      const cardTotal = parseLocaleNumber(cardTotalInput);
      const coin = parseLocaleNumber(coinInput);
      const app = parseLocaleNumber(appInput);
      
      // CÔNG THỨC CHUẨN: Tiền mặt thực tế = (Kasse + App - Thẻ)
      const actualCash = (kasseTotal + app - cardTotal);
      
      updated.amount = kasseTotal + app;
      updated.incomeBreakdown = { 
        cash: actualCash, 
        card: cardTotal, 
        delivery: app, 
        coins: coin 
      };
    } else {
      updated.amount = parseLocaleNumber(expenseAmount);
    }

    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-ios relative z-[2001] overflow-hidden flex flex-col max-h-[90vh] animate-ios">
        <div className="px-6 py-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-sm">{t('edit_title')}</h3>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{translateCategory(category)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/50 p-1.5 rounded-2xl border dark:border-slate-800">
            <button type="button" onClick={() => {
              const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]);
            }} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex-1 text-center relative flex flex-col items-center">
               <span className="text-[10px] font-black dark:text-white uppercase flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-brand-500" /> {date.split('-').reverse().join('/')}</span>
               <input type="date" value={date} onChange={e => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <button type="button" onClick={() => {
              const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]);
            }} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-400"><ChevronRight className="w-4 h-4" /></button>
          </div>

          {transaction.type === TransactionType.INCOME ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Banknote className="w-3 h-3 text-emerald-500" /> {t('kasse_total')}</label>
                  <input type="text" inputMode="decimal" value={kasseTotalInput} onChange={e => validateAndSetAmount(e.target.value, setKasseTotalInput)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-black text-sm text-center" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                     <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><CreditCard className="w-3 h-3 text-indigo-500" /> {t('card_total')}</label>
                     <input type="text" inputMode="decimal" value={cardTotalInput} onChange={e => validateAndSetAmount(e.target.value, setCardTotalInput)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-black text-sm text-center" />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Coins className="w-3 h-3 text-amber-500" /> {t('coin_wallet')}</label>
                     <input type="text" inputMode="decimal" value={coinInput} onChange={e => validateAndSetAmount(e.target.value, setCoinInput)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-black text-sm text-center" />
                   </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('app_total')}</label>
                  <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-black text-sm text-center" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('amount')} (€)</label>
              <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full py-4 bg-rose-500/5 border dark:border-rose-900 rounded-2xl font-black text-2xl text-rose-600 text-center" />
            </div>
          )}
          
          {/* ... Notes management UI ... */}
          <div className="space-y-3">
             <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                   <MessageSquare className="w-4 h-4 text-slate-400" />
                   <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{t('history')} / {t('note')}</span>
                </div>
                <button type="button" onClick={addNote} className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg active-scale">
                   <Plus className="w-4 h-4" />
                </button>
             </div>
             <div className="space-y-3">
               {notes.map((n, i) => (
                 <div key={i} className="relative group animate-ios">
                    <textarea value={n} onChange={e => updateNote(i, e.target.value)} className="w-full p-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-700 outline-none text-xs font-bold dark:text-white h-20 resize-none" placeholder={t('note')} />
                    <button onClick={() => removeNote(i)} className="absolute top-2 right-2 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                 </div>
               ))}
               {notes.length === 0 && <p className="text-center text-[9px] font-bold text-slate-400 uppercase py-6 italic">{t('no_data')}</p>}
             </div>
          </div>

          <button onClick={handleSave} className="w-full h-15 bg-brand-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-vivid active-scale transition-all flex items-center justify-center gap-2">
            <Save className="w-5 h-5" /> {t('save_changes_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTransactionModal;
