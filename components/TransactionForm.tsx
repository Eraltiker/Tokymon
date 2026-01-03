
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, ExpenseSource, Language, formatCurrency } from '../types';
import { useTranslation } from '../i18n';
import { 
  Save, ChevronLeft, ChevronRight, Store, 
  ChevronDown, CreditCard, Calendar,
  Wallet, Coins, Banknote, MessageSquare, Plus, Trash2, User as UserIcon
} from 'lucide-react';

interface TransactionFormProps {
  onAddTransaction: (transaction: Transaction) => void;
  expenseCategories: string[];
  fixedType?: TransactionType;
  branchId: string;
  initialBalances: { cash: number; card: number };
  transactions: Transaction[];
  lang?: Language;
  branchName?: string;
  currentUsername?: string;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onAddTransaction, 
  expenseCategories, 
  fixedType, 
  branchId, 
  transactions, 
  lang = 'vi' as Language, 
  branchName,
  currentUsername = 'Unknown'
}) => {
  const { t, translateCategory, translateSource } = useTranslation(lang);
  const [type] = useState<TransactionType>(fixedType || TransactionType.INCOME);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // States linh hoạt cho UI
  const [showCoins, setShowCoins] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);

  // States nhập liệu
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>(expenseCategories[0] || '');
  const [expenseSource, setExpenseSource] = useState<ExpenseSource>(ExpenseSource.SHOP_CASH);
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [debtorName, setDebtorName] = useState<string>('');
  
  const [paperInput, setPaperInput] = useState<string>(''); 
  const [coinInput, setCoinInput] = useState<string>('');   
  const [appInput, setAppInput] = useState<string>('');   
  const [cardTotalInput, setCardTotalInput] = useState<string>(''); 

  const validateAndSetAmount = (val: string, setter: (v: string) => void) => {
    const sanitized = val.replace(',', '.');
    if (/^[0-9]*\.?[0-9]*$/.test(sanitized)) setter(sanitized);
  };

  const parseNumber = (val: string): number => {
    if (!val) return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  // Logic gợi ý ghi chú thông minh
  const getSuggestions = useMemo(() => {
    const currentCatKey = type === TransactionType.EXPENSE ? expenseCategory : 'Income';
    const pastNotes = transactions
      .filter(tx => tx.category === currentCatKey && tx.notes && tx.notes.length > 0)
      .flatMap(tx => tx.notes);
    
    const freqMap: Record<string, number> = {};
    pastNotes.forEach(n => {
      if (n.trim()) freqMap[n] = (freqMap[n] || 0) + 1;
    });

    return Object.entries(freqMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }, [transactions, expenseCategory, type]);

  const addNoteField = () => setNotes([...notes, '']);
  const updateNote = (idx: number, val: string) => {
    const newNotes = [...notes];
    newNotes[idx] = val;
    setNotes(newNotes);
  };
  const removeNote = (idx: number) => setNotes(notes.filter((_, i) => i !== idx));

  const totalCash = parseNumber(paperInput) + (showCoins ? parseNumber(coinInput) : 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const filteredNotes = notes.filter(n => n.trim() !== '');
    
    const baseTx = { 
      id: Date.now().toString(), 
      branchId, 
      date, 
      notes: filteredNotes, 
      authorName: currentUsername,
      updatedAt: now, 
      history: [] 
    };
    
    if (type === TransactionType.EXPENSE) {
      const amount = parseNumber(expenseAmount);
      if (amount <= 0) return;
      onAddTransaction({
        ...baseTx, 
        type: TransactionType.EXPENSE, 
        amount, 
        category: expenseCategory,
        expenseSource: isPaid ? expenseSource : undefined, 
        isPaid, 
        debtorName: isPaid ? undefined : debtorName,
      });
      setExpenseAmount(''); setNotes([]); 
    } else {
      const app = parseNumber(appInput);
      const cardTotal = parseNumber(cardTotalInput);
      const revenue = totalCash + app;
      
      if (revenue <= 0 && cardTotal <= 0) return;
      onAddTransaction({
        ...baseTx, 
        type: TransactionType.INCOME, 
        amount: revenue, 
        category: 'Income',
        incomeBreakdown: { 
          cash: totalCash, 
          card: cardTotal, 
          delivery: app,
          coins: showCoins ? parseNumber(coinInput) : 0 
        },
      });
      setPaperInput(''); setCoinInput(''); setAppInput(''); setCardTotalInput(''); setNotes([]);
      setShowCoins(false);
    }
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[2.5rem] shadow-ios border border-white dark:border-slate-800/80 flex flex-col relative overflow-hidden animate-ios">
      {/* Header Form */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex-1 truncate">
          <span className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-0.5">{branchName}</span>
          <h2 className="text-base font-extrabold uppercase dark:text-white leading-none truncate">
            {type === TransactionType.INCOME ? t('chot_so') : t('chi_phi')}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-50 dark:bg-brand-900/30 rounded-full border border-brand-100 dark:border-brand-800">
           <UserIcon className="w-3 h-3 text-brand-600" />
           <span className="text-[9px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">{currentUsername}</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Date Picker */}
        <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-950/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button type="button" onClick={() => setDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() - 1); return dt.toISOString().split('T')[0]; })} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl text-slate-500 active-scale shadow-sm flex items-center justify-center shrink-0"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex-1 text-center relative h-10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-brand-500 mr-2" />
            <span className="text-xs font-black dark:text-white uppercase tracking-tight">{date.split('-').reverse().join('/')}</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
          </div>
          <button type="button" onClick={() => setDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; })} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl text-slate-500 active-scale shadow-sm flex items-center justify-center shrink-0"><ChevronRight className="w-5 h-5" /></button>
        </div>

        {type === TransactionType.INCOME ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase px-2 tracking-widest">{t('paper_cash')}</label>
                <input type="text" inputMode="decimal" value={paperInput} onChange={e => validateAndSetAmount(e.target.value, setPaperInput)} placeholder="0.00" className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl font-black text-sm text-center outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase px-2 tracking-widest">{t('card_total')}</label>
                <input type="text" inputMode="decimal" value={cardTotalInput} onChange={e => validateAndSetAmount(e.target.value, setCardTotalInput)} placeholder="0" className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl font-black text-sm text-center outline-none" />
              </div>
            </div>

            {showCoins && (
              <div className="space-y-1 animate-ios">
                <label className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase px-2 tracking-widest flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5" /> {t('coin_wallet')} (€)
                </label>
                <input type="text" inputMode="decimal" value={coinInput} onChange={e => validateAndSetAmount(e.target.value, setCoinInput)} placeholder="0.00" className="w-full p-3.5 bg-amber-50/20 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 rounded-2xl font-black text-sm text-center outline-none" />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase px-2 tracking-widest">{t('app_total')}</label>
              <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} placeholder="0" className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl font-black text-sm text-center outline-none" />
            </div>

            <div className="bg-emerald-500/10 dark:bg-emerald-500/5 p-4 rounded-[1.8rem] border border-emerald-500/20 text-center">
               <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest block mb-1">{t('cash_total')}</span>
               <p className="text-2xl font-black text-emerald-600">{formatCurrency(totalCash, lang)}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1 text-center">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('amount')} (€)</label>
              <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-xl text-rose-600 text-center outline-none" required />
            </div>
            
            <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-[1.2rem] border dark:border-slate-800">
              <button type="button" onClick={() => setIsPaid(true)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${isPaid ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm' : 'text-slate-400'}`}>{t('paid')}</button>
              <button type="button" onClick={() => setIsPaid(false)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!isPaid ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400'}`}>{t('unpaid')}</button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-2xl font-black text-[11px] uppercase outline-none appearance-none transition-all dark:text-slate-200">
                  {expenseCategories.map(c => <option key={c} value={c}>{translateCategory(c)}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>

              {!isPaid ? (
                <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder={t('vendor_name')} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-[11px] outline-none" required />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: ExpenseSource.SHOP_CASH, label: translateSource(ExpenseSource.SHOP_CASH), icon: Store },
                    { id: ExpenseSource.WALLET, label: translateSource(ExpenseSource.WALLET), icon: Wallet },
                    { id: ExpenseSource.CARD, label: translateSource(ExpenseSource.CARD), icon: CreditCard }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 active-scale ${expenseSource === s.id ? `bg-brand-600 border-brand-600 text-white` : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500'}`}>
                      <s.icon className="w-4 h-4" />
                      <span className="text-[8px] font-black uppercase tracking-tighter leading-none text-center">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Khối Ghi chú & Mở rộng */}
        <div className="pt-2 space-y-3">
          <div className="flex gap-2">
            {!showCoins && type === TransactionType.INCOME && (
              <button type="button" onClick={() => setShowCoins(true)} className="flex-1 py-3.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all active-scale">
                 <Coins className="w-4 h-4" /> {t('add_coins_btn')}
              </button>
            )}
            <button type="button" onClick={addNoteField} className="flex-1 py-3.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all active-scale">
               <Plus className="w-4 h-4" /> {t('add_note_btn')}
            </button>
          </div>

          {notes.map((note, idx) => (
            <div key={idx} className="space-y-2 animate-ios group">
              <div className="relative">
                <textarea 
                  value={note} 
                  onChange={e => updateNote(idx, e.target.value)} 
                  placeholder={`${t('note')} #${idx + 1}`}
                  className="w-full p-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-200 dark:border-slate-800 outline-none text-xs font-bold dark:text-white resize-none h-18"
                />
                <button type="button" onClick={() => removeNote(idx)} className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              {!note && getSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-1">
                  {getSuggestions.map((s, sIdx) => (
                    <button key={sIdx} type="button" onClick={() => updateNote(idx, s)} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[9px] font-black text-slate-500 uppercase hover:bg-brand-600 hover:text-white transition-all shadow-sm">
                       {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button type="submit" className="w-full h-15 bg-brand-600 text-white rounded-[1.8rem] font-black uppercase tracking-[0.1em] text-xs active-scale shadow-vivid flex items-center justify-center gap-2 transition-all hover:bg-brand-500">
          <Save className="w-5 h-5" /> {t('save_transaction')}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
