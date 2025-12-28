
import React, { useState } from 'react';
import { RecurringTransaction, ExpenseSource, Transaction, TransactionType, formatCurrency, Language } from '../types';
import { useTranslation } from '../i18n';
import { Plus, Trash2, CalendarClock, PlayCircle } from 'lucide-react';

interface RecurringManagerProps {
  recurringExpenses: RecurringTransaction[];
  onUpdate: (items: RecurringTransaction[]) => void;
  categories: string[];
  onGenerateTransactions: (txs: Transaction[]) => void;
  branchId: string;
  lang: Language;
}

const RecurringManager: React.FC<RecurringManagerProps> = ({ recurringExpenses, onUpdate, categories, onGenerateTransactions, branchId, lang }) => {
  // Fix: Destructure t from useTranslation result
  const { t } = useTranslation(lang);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0] || '');
  const [source] = useState<ExpenseSource>(ExpenseSource.WALLET);
  const [day, setDay] = useState('1');
  const [note, setNote] = useState('');

  const handleAdd = () => {
    if (!amount || !category || !day) return;
    const newItem: RecurringTransaction = {
      id: Date.now().toString(),
      branchId: branchId,
      amount: Number(amount),
      category,
      expenseSource: source,
      dayOfMonth: Number(day),
      note,
      updatedAt: new Date().toISOString()
    };
    onUpdate([...recurringExpenses, newItem]);
    setAmount(''); setNote('');
  };

  const handleGenerateForMonth = () => {
    const today = new Date();
    const monthStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    const newTxs: Transaction[] = recurringExpenses.map(r => ({
      id: `rec_${Date.now()}_${r.id}`,
      branchId: r.branchId,
      date: `${monthStr}-${r.dayOfMonth.toString().padStart(2, '0')}`,
      amount: r.amount,
      category: r.category,
      type: TransactionType.EXPENSE,
      expenseSource: r.expenseSource,
      note: `[${t('recurring_expense')}] ${r.note}`,
      isRecurring: true,
      updatedAt: new Date().toISOString(),
      history: []
    }));
    onGenerateTransactions(newTxs);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
           <div className="flex items-center gap-3">
             <div className="p-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-xl"><CalendarClock className="w-5 h-5 text-rose-600" /></div>
             <h3 className="text-lg font-black uppercase tracking-tight dark:text-white">{t('recurring_expense')}</h3>
           </div>
           <button onClick={handleGenerateForMonth} className="flex items-center gap-2 bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg uppercase active:scale-95"><PlayCircle className="w-4 h-4" /> {t('create_monthly')}</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-8 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border dark:border-slate-700">
           <div className="md:col-span-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{t('date')}</label><input type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-900 rounded-xl outline-none text-sm font-bold border dark:border-slate-700" /></div>
           <div className="md:col-span-3"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{t('amount')} (€)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full p-2.5 bg-white dark:bg-slate-900 rounded-xl outline-none text-sm font-bold border dark:border-slate-700" /></div>
           <div className="md:col-span-3"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{t('category')}</label><select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2.5 bg-white dark:bg-slate-900 rounded-xl outline-none text-sm font-bold border dark:border-slate-700">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
           <div className="md:col-span-3 flex items-end"><button onClick={handleAdd} className="w-full bg-indigo-600 text-white p-2.5 rounded-xl flex justify-center items-center shadow-lg"><Plus className="w-6 h-6" /></button></div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-slate-400 uppercase text-[10px] tracking-widest border-b dark:border-slate-800">
                <th className="p-4">{t('date')}</th>
                <th className="p-4">{t('category')}</th>
                <th className="p-4">{t('amount')}</th>
                <th className="p-4 text-center">{t('delete')}</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {recurringExpenses.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-bold text-xs">{t('date')} {item.dayOfMonth}</td>
                  <td className="p-4 font-bold">{item.category}</td>
                  <td className="p-4 font-black text-rose-600">{formatCurrency(item.amount, lang)}</td>
                  <td className="p-4 text-center"><button onClick={() => onUpdate(recurringExpenses.filter(i => i.id !== item.id))} className="p-2 text-slate-300 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecurringManager;
