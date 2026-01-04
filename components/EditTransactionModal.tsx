
import React, { useState } from 'react';
import { Transaction, TransactionType, HistoryEntry, Language, ExpenseSource } from '../types';
import { useTranslation } from '../i18n';
import { 
  X, Save, ChevronLeft, ChevronRight, Calendar, 
  Banknote, MessageSquare, Plus, Trash2, CreditCard, 
  Store, Wallet, AlertCircle, ChevronDown 
} from 'lucide-react';

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

  const [expenseAmount, setExpenseAmount] = useState(transaction.amount.toString());
  const [expenseSource, setExpenseSource] = useState<ExpenseSource>(transaction.expenseSource || ExpenseSource.SHOP_CASH);
  const [isPaid, setIsPaid] = useState<boolean>(transaction.isPaid !== false);
  const [debtorName, setDebtorName] = useState<string>(transaction.debtorName || '');

  const [kasseTotalInput, setKasseTotalInput] = useState(() => {
    if (transaction.type === TransactionType.INCOME && transaction.incomeBreakdown) {
       return (transaction.amount - (transaction.incomeBreakdown.delivery || 0)).toString();
    }
    return '0';
  });
  const [cardTotalInput, setCardTotalInput] = useState(transaction.incomeBreakdown?.card.toString() || '0');
  const [appInput, setAppInput] = useState(transaction.incomeBreakdown?.delivery?.toString() || '0');

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
      const app = parseLocaleNumber(appInput);
      const actualCash = (kasseTotal + app - cardTotal);
      updated.amount = kasseTotal + app;
      updated.incomeBreakdown = { cash: actualCash, card: cardTotal, delivery: app };
    } else {
      updated.amount = parseLocaleNumber(expenseAmount);
      updated.isPaid = isPaid;
      updated.expenseSource = isPaid ? expenseSource : undefined;
      updated.debtorName = isPaid ? undefined : debtorName;
    }

    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-ios relative z-[2001] overflow-hidden flex flex-col max-h-[90vh] animate-ios">
        <div className="px-6 py-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${transaction.type === TransactionType.INCOME ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
               {transaction.type === TransactionType.INCOME ? <Banknote className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-xs">Sửa giao dịch</h3>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{transaction.type === TransactionType.INCOME ? 'Báo cáo ngày' : 'Chi phí'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto no-scrollbar space-y-5">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/50 p-1 rounded-2xl border dark:border-slate-800">
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
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><Banknote className="w-3 h-3 text-emerald-500" /> Doanh thu (Z-Bon)</label>
                  <input type="text" inputMode="decimal" value={kasseTotalInput} onChange={e => validateAndSetAmount(e.target.value, setKasseTotalInput)} className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-black text-xl text-center outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                     <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 px-1"><CreditCard className="w-3 h-3 text-indigo-500" /> Tiền Thẻ</label>
                     <input type="text" inputMode="decimal" value={cardTotalInput} onChange={e => validateAndSetAmount(e.target.value, setCardTotalInput)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-black text-sm text-center outline-none" />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Tiền App</label>
                     <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-black text-sm text-center outline-none" />
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Số tiền (€)</label>
                <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full py-4 bg-rose-500/5 border-2 border-rose-100 dark:border-rose-900 rounded-2xl font-black text-2xl text-rose-600 text-center outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl">
                <button type="button" onClick={() => setIsPaid(true)} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isPaid ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm' : 'text-slate-400'}`}>{t('paid')}</button>
                <button type="button" onClick={() => setIsPaid(false)} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!isPaid ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400'}`}>{t('unpaid')}</button>
              </div>

              {isPaid ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: ExpenseSource.SHOP_CASH, label: "Tiền Quán", icon: Store },
                      { id: ExpenseSource.WALLET, label: "Ví Tổng", icon: Wallet },
                      { id: ExpenseSource.CARD, label: "Bank", icon: CreditCard }
                    ].map((s) => (
                      <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1 active-scale ${expenseSource === s.id ? `bg-brand-600 border-brand-600 text-white shadow-vivid` : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500'}`}>
                        <s.icon className="w-3.5 h-3.5" />
                        <span className="text-[8px] font-black uppercase leading-none">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                   <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Đối tác / Nhà cung cấp</label>
                   <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="Tên..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-xl font-bold text-xs outline-none" />
                </div>
              )}

              <div className="relative">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1 block">Hạng mục</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-xl font-black text-[10px] uppercase appearance-none outline-none">
                  {expenseCategories.map(c => <option key={c} value={c}>{translateCategory(c)}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 mt-1 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
          
          <div className="space-y-3">
             <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                   <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                   <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{t('note')}</span>
                </div>
                <button type="button" onClick={addNote} className="p-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg active-scale">
                   <Plus className="w-3.5 h-3.5" />
                </button>
             </div>
             <div className="space-y-2">
               {notes.map((n, i) => (
                 <div key={i} className="relative group animate-ios">
                    <textarea value={n} onChange={e => updateNote(i, e.target.value)} className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border dark:border-slate-700 outline-none text-[11px] font-bold dark:text-white h-16 resize-none" placeholder="..." />
                    <button onClick={() => removeNote(i)} className="absolute top-1.5 right-1.5 p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                 </div>
               ))}
             </div>
          </div>

          <button onClick={handleSave} className="w-full h-14 bg-brand-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-vivid active-scale transition-all flex items-center justify-center gap-2">
            <Save className="w-4 h-4" /> {t('save_changes_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTransactionModal;
