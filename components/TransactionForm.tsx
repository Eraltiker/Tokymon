
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, Language } from '../types';
import { scanReceipt } from '../services/geminiService';
import { useTranslation } from '../i18n';
import { 
  PlusCircle, Save, Euro, CreditCard, Smartphone,
  ChevronLeft, ChevronRight, Store, Wallet, Camera, Loader2,
  CheckCircle2, CalendarClock, Edit3, Calendar
} from 'lucide-react';

interface TransactionFormProps {
  onAddTransaction: (transaction: Transaction) => void;
  expenseCategories: string[];
  fixedType?: TransactionType;
  branchId: string;
  initialBalances: { cash: number; card: number };
  transactions: Transaction[];
  lang?: Language;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onAddTransaction, expenseCategories, fixedType, branchId, initialBalances, transactions, lang = 'vi' }) => {
  const t = useTranslation(lang as Language);
  const [type, setType] = useState<TransactionType>(fixedType || TransactionType.INCOME);
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
  
  const [calculatedCash, setCalculatedCash] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDuplicateDate = useMemo(() => {
    if (type !== TransactionType.INCOME) return false;
    return transactions.some(tx => tx.type === TransactionType.INCOME && tx.date === date && tx.branchId === branchId);
  }, [date, transactions, type, branchId]);

  useEffect(() => {
    const kasse = Number(kasseInput) || 0;
    const app = Number(appInput) || 0;
    const cardTotal = Number(cardTotalInput) || 0;
    const revenue = kasse + app;
    const cash = Math.max(0, revenue - cardTotal);
    setCalculatedCash(cash);
    setTotalRevenue(revenue);
  }, [kasseInput, appInput, cardTotalInput]);

  const adjustDate = (days: number) => {
    const current = new Date(date);
    current.setDate(current.getDate() + days);
    setDate(current.toISOString().split('T')[0]);
  };

  const formatDateDisplay = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicateDate) return;

    if (type === TransactionType.EXPENSE) {
      const amount = Number(expenseAmount);
      if (!amount || amount <= 0) return;
      onAddTransaction({
        id: Date.now().toString(),
        branchId,
        type: TransactionType.EXPENSE,
        amount,
        category: expenseCategory,
        expenseSource: isPaid ? expenseSource : undefined,
        date,
        note,
        isPaid,
        debtorName: isPaid ? undefined : debtorName
      });
      setExpenseAmount(''); setDebtorName(''); setNote('');
    } else {
      const kasse = Number(kasseInput) || 0;
      const app = Number(appInput) || 0;
      const cardTotal = Number(cardTotalInput) || 0;
      if (kasse + app <= 0) return;
      onAddTransaction({
        id: Date.now().toString(),
        branchId,
        type: TransactionType.INCOME,
        amount: kasse + app,
        category: 'Doanh thu ngày',
        date,
        note,
        incomeBreakdown: { cash: calculatedCash, card: cardTotal, delivery: app }
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
    <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-xl border dark:border-slate-800 flex flex-col h-full transition-all overflow-hidden relative">
      {isScanning && (
        <div className="absolute inset-0 z-50 bg-indigo-600/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin mb-2" />
          <p className="text-[10px] font-black uppercase tracking-widest">AI SCANNING...</p>
        </div>
      )}

      {/* Header - Minimalist */}
      <div className={`px-4 py-3 flex items-center justify-between border-b dark:border-slate-800 ${type === TransactionType.INCOME ? 'bg-indigo-50/30' : 'bg-rose-50/30'}`}>
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${type === TransactionType.INCOME ? 'bg-indigo-600' : 'bg-rose-500'} text-white`}>
            {type === TransactionType.INCOME ? <PlusCircle className="w-4 h-4" /> : <Euro className="w-4 h-4" />}
          </div>
          <span className="text-[11px] font-black uppercase tracking-tighter text-slate-800 dark:text-white">
            {type === TransactionType.INCOME ? t('income') : t('expense')}
          </span>
        </div>
        
        {type === TransactionType.EXPENSE && (
           <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase shadow-sm">
             <Camera className="w-3.5 h-3.5" /> <span>AI Scan</span>
           </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />
      </div>
      
      <form onSubmit={handleSubmit} className="p-3.5 md:p-5 flex-1 overflow-y-auto no-scrollbar space-y-3">
        {type === TransactionType.INCOME ? (
          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">{t('kasse_input')}</label>
              <div className="relative">
                <input type="number" inputMode="decimal" value={kasseInput} onChange={(e) => setKasseInput(e.target.value)} placeholder="0.00" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-50/50 dark:border-slate-700 rounded-2xl font-black text-2xl text-slate-900 dark:text-white outline-none focus:border-indigo-600" required />
                <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1">{t('app_input')}</label>
                <div className="relative">
                  <input type="number" inputMode="decimal" value={appInput} onChange={(e) => setAppInput(e.target.value)} placeholder="0.00" className="w-full pl-10 py-2.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-black text-base text-orange-500" />
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1">{t('card_total_input')}</label>
                <div className="relative">
                  <input type="number" inputMode="decimal" value={cardTotalInput} onChange={(e) => setCardTotalInput(e.target.value)} placeholder="0.00" className="w-full pl-10 py-2.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-black text-base text-indigo-600" />
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 px-4 py-2.5 rounded-2xl flex justify-between items-center shadow-lg relative overflow-hidden">
               <div className="relative z-10">
                 <span className="text-[8px] font-black text-slate-500 uppercase block tracking-widest">CẦN RÚT</span>
                 <span className="text-lg font-black text-amber-400 leading-none">{formatCurrency(calculatedCash)}</span>
               </div>
               <div className="relative z-10 text-right">
                  <span className="text-[8px] font-black text-slate-500 uppercase block tracking-widest">TỔNG THU</span>
                  <span className="text-xs font-black text-emerald-400 leading-none">{formatCurrency(totalRevenue)}</span>
               </div>
               <Wallet className="absolute right-[-5px] bottom-[-5px] w-14 h-14 opacity-10 rotate-12" />
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">{t('amount')} (€)</label>
              <div className="relative">
                <input type="number" inputMode="decimal" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-rose-50/50 dark:border-slate-700 rounded-2xl font-black text-2xl text-rose-500 outline-none focus:border-rose-600" required />
                <Euro className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-400" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setIsPaid(true)} className={`py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 border transition-all ${isPaid ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Trả ngay
              </button>
              <button type="button" onClick={() => setIsPaid(false)} className={`py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 border transition-all ${!isPaid ? 'bg-amber-500 border-amber-500 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                <CalendarClock className="w-3.5 h-3.5" /> Ghi nợ
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {!isPaid ? (
                <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="Tên chủ nợ..." className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-black text-xs" required />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: ExpenseSource.SHOP_CASH, label: 'Laden' },
                    { id: ExpenseSource.WALLET, label: 'Ví Tổng' },
                    { id: ExpenseSource.CARD, label: 'Bank' }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-2 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${expenseSource === s.id ? `bg-indigo-600 border-indigo-600 text-white` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl font-black text-xs outline-none appearance-none cursor-pointer">
                {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Date & Note Section - Optimized as per image */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[1rem] p-1.5 shadow-sm">
            <button type="button" onClick={() => adjustDate(-1)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex-1 relative flex items-center justify-center">
               <span className="text-[11px] font-black text-slate-800 dark:text-white">{formatDateDisplay(date)}</span>
               <input type="date" value={date} onChange={e => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <button type="button" onClick={() => adjustDate(1)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors mr-1"><ChevronRight className="w-4 h-4" /></button>
            <Calendar className="w-3.5 h-3.5 text-slate-200" />
          </div>
          
          <div className="relative flex items-center bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[1rem] p-1.5 shadow-sm">
            <input 
              type="text" 
              value={note} 
              onChange={e => setNote(e.target.value)} 
              placeholder="Ghi chú..." 
              className="w-full px-2 bg-transparent text-[11px] font-bold text-slate-800 dark:text-white outline-none placeholder:text-slate-300" 
            />
            <Edit3 className="w-3.5 h-3.5 text-slate-200 shrink-0 mr-1" />
          </div>
        </div>

        {isDuplicateDate && (
           <p className="text-[9px] font-black text-rose-500 uppercase text-center tracking-widest animate-pulse">{t('duplicate_revenue')}</p>
        )}

        <button 
          type="submit" 
          disabled={isDuplicateDate || isScanning}
          className={`w-full py-3.5 rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isDuplicateDate || isScanning ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700'}`}
        >
          <Save className="w-4 h-4" /> <span>{t('save')}</span>
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
