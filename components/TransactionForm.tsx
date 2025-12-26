
import React, { useState, useMemo, useRef } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, Language } from '../types';
import { scanReceipt } from '../services/geminiService';
import { useTranslation } from '../i18n';
import { 
  Save, Camera, Loader2,
  ChevronLeft, ChevronRight, Store, 
  ChevronDown, Building2, Banknote, CreditCard, Smartphone, Info, Calendar,
  Wallet, Receipt, Sparkles
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
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onAddTransaction, expenseCategories, fixedType, branchId, transactions, lang = 'vi', branchName }) => {
  const t = useTranslation(lang as Language);
  const [type] = useState<TransactionType>(fixedType || TransactionType.INCOME);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');

  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>(expenseCategories[0] || '');
  const [expenseSource, setExpenseSource] = useState<ExpenseSource>(ExpenseSource.SHOP_CASH);
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [debtorName, setDebtorName] = useState<string>('');

  const [kasseInput, setKasseInput] = useState<string>(''); 
  const [appInput, setAppInput] = useState<string>('');   
  const [cardTotalInput, setCardTotalInput] = useState<string>(''); 
  
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDuplicateDate = useMemo(() => {
    if (type !== TransactionType.INCOME) return false;
    return transactions.some(tx => tx.type === TransactionType.INCOME && tx.date === date && tx.branchId === branchId && !tx.deletedAt);
  }, [date, transactions, type, branchId]);

  const noteSuggestions = useMemo(() => {
    if (type !== TransactionType.EXPENSE) return [];
    const existingNotes = transactions
      .filter(tx => tx.type === TransactionType.EXPENSE && tx.category === expenseCategory && tx.note && !tx.deletedAt)
      .map(tx => tx.note.trim());
    
    const counts: Record<string, number> = {};
    existingNotes.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([n]) => n)
      .filter(n => !note || (n.toLowerCase().includes(note.toLowerCase()) && n.toLowerCase() !== note.toLowerCase()))
      .slice(0, 6);
  }, [transactions, expenseCategory, type, note]);

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
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'de-DE', { 
      day: '2-digit', month: '2-digit', year: 'numeric' 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicateDate) return;

    const commonData = {
      id: Date.now().toString(),
      branchId,
      date,
      note,
      updatedAt: new Date().toISOString(),
      history: []
    };

    if (type === TransactionType.EXPENSE) {
      const amount = parseLocaleNumber(expenseAmount);
      if (!amount || amount <= 0) return;
      onAddTransaction({
        ...commonData,
        type: TransactionType.EXPENSE,
        amount,
        category: expenseCategory,
        expenseSource: isPaid ? expenseSource : undefined,
        isPaid,
        debtorName: isPaid ? undefined : debtorName,
      });
      setExpenseAmount(''); setDebtorName(''); setNote('');
    } else {
      const kasse = parseLocaleNumber(kasseInput);
      const app = parseLocaleNumber(appInput);
      const cardTotal = parseLocaleNumber(cardTotalInput);
      if (kasse + app <= 0) return;
      onAddTransaction({
        ...commonData,
        type: TransactionType.INCOME,
        amount: kasse + app,
        category: t('income'),
        incomeBreakdown: { 
          cash: Math.max(0, (kasse + app) - cardTotal),
          card: cardTotal, 
          delivery: app
        },
      });
      setKasseInput(''); setAppInput(''); setCardTotalInput(''); setNote('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await scanReceipt(base64, file.type);
        if (result) {
          if (result.amount) setExpenseAmount(result.amount.toString());
          if (result.category) setExpenseCategory(result.category);
          if (result.note) setNote(result.note);
          if (result.date) setDate(result.date);
        }
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (error) { setIsScanning(false); }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col relative overflow-hidden transition-all max-w-full lg:max-w-md mx-auto">
      {isScanning && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 animate-in fade-in">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">{t('scan_ai')}</p>
        </div>
      )}

      {/* Header gọn hơn */}
      <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
        <div>
          <span className="text-[8px] font-black uppercase text-indigo-500 tracking-wider leading-none block mb-0.5">{branchName}</span>
          <h2 className="text-sm font-black uppercase tracking-tight dark:text-white leading-none">
            {type === TransactionType.INCOME ? t('chot_so') : t('chi_phi')}
          </h2>
        </div>
        {type === TransactionType.EXPENSE && (
          <button type="button" onClick={() => fileInputRef.current?.click()} className="w-9 h-9 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl active:scale-95 transition-all flex items-center justify-center shadow-md">
            <Camera className="w-4 h-4" />
          </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {/* Date Selector cải tiến */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800">
          <button type="button" onClick={() => adjustDate(-1)} className="w-9 h-9 bg-white dark:bg-slate-900 rounded-xl text-slate-400 active:scale-90 flex items-center justify-center shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
          <div className="flex-1 text-center relative h-9 flex items-center justify-center">
            <span className="text-[10px] font-black dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-indigo-500" />
              {formatDateDisplay(date)}
            </span>
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="absolute inset-0 opacity-0 cursor-pointer w-full" 
            />
          </div>
          <button type="button" onClick={() => adjustDate(1)} className="w-9 h-9 bg-white dark:bg-slate-900 rounded-xl text-slate-400 active:scale-90 flex items-center justify-center shadow-sm"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {type === TransactionType.INCOME ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase px-1">{t('kasse_total')} (€)</label>
              <input 
                type="text" inputMode="decimal" value={kasseInput} 
                onChange={e => validateAndSetAmount(e.target.value, setKasseInput)} 
                placeholder="0.00" 
                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-xl text-indigo-600 outline-none focus:border-indigo-500 transition-all" 
                required 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase px-1">{t('card_total')}</label>
                <input type="text" inputMode="decimal" value={cardTotalInput} onChange={e => validateAndSetAmount(e.target.value, setCardTotalInput)} placeholder="0" className="w-full p-3 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-black text-sm text-indigo-500 outline-none focus:border-indigo-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase px-1">{t('app_total')}</label>
                <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} placeholder="0" className="w-full p-3 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-black text-sm text-orange-600 outline-none focus:border-orange-400" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1 text-center">
              <label className="text-[8px] font-black text-slate-400 uppercase">Tổng tiền chi (€)</label>
              <input 
                type="text" inputMode="decimal" value={expenseAmount} 
                onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} 
                className="w-full py-3 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-xl text-rose-600 text-center outline-none focus:border-rose-500" 
                required 
              />
            </div>
            
            <div className="flex p-0.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200/50 dark:border-slate-800">
              <button type="button" onClick={() => setIsPaid(true)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${isPaid ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                {t('paid')}
              </button>
              <button type="button" onClick={() => setIsPaid(false)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${!isPaid ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400'}`}>
                {t('unpaid')}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div className="relative">
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-black text-[10px] uppercase outline-none appearance-none focus:border-indigo-500">
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {!isPaid ? (
                <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="Tên chủ nợ..." className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-bold text-xs outline-none" required />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: ExpenseSource.SHOP_CASH, label: 'Quán', icon: Store },
                    { id: ExpenseSource.WALLET, label: 'Ví', icon: Wallet },
                    { id: ExpenseSource.CARD, label: 'Thẻ', icon: CreditCard }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-1.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${expenseSource === s.id ? `bg-indigo-600 border-indigo-600 text-white shadow-md` : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                      <s.icon className="w-3 h-3" />
                      <span className="text-[7px] font-black uppercase">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2 pt-1">
          {type === TransactionType.EXPENSE && noteSuggestions.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
              {noteSuggestions.map((s, idx) => (
                <button key={idx} type="button" onClick={() => setNote(s)} className="shrink-0 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-[8px] font-black text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 rounded-lg uppercase active:scale-95">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={`${t('note')}...`} className="w-full bg-transparent text-[11px] font-bold outline-none dark:text-white resize-none h-10 leading-normal" />
          </div>

          <button type="submit" disabled={isDuplicateDate || isScanning} className={`w-full h-12 rounded-2xl font-black uppercase tracking-[0.1em] text-[10px] shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${isDuplicateDate || isScanning ? 'bg-slate-200 text-slate-400 shadow-none' : 'bg-indigo-600 text-white'}`}>
            <Save className="w-4 h-4" /> {t('save_transaction')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
