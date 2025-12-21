
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, Language } from '../types';
import { scanReceipt } from '../services/geminiService';
import { useTranslation } from '../i18n';
import { 
  PlusCircle, Save, Euro, CreditCard, Smartphone,
  ChevronLeft, ChevronRight, Store, Wallet, Camera, Loader2,
  CheckCircle2, CalendarClock, Edit3,
  CalendarDays, ChevronDown, Tag, AlertCircle, Sparkles,
  Zap, ArrowRight
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

const TransactionForm: React.FC<TransactionFormProps> = ({ onAddTransaction, expenseCategories, fixedType, branchId, transactions, lang = 'vi' }) => {
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
  
  const [calculatedCash, setCalculatedCash] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const isDuplicateDate = useMemo(() => {
    if (type !== TransactionType.INCOME) return false;
    return transactions.some(tx => tx.type === TransactionType.INCOME && tx.date === date && tx.branchId === branchId && !tx.deletedAt);
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
    return `${d}/${m}`;
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
      const amount = Number(expenseAmount);
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
      const kasse = Number(kasseInput) || 0;
      const app = Number(appInput) || 0;
      const cardTotal = Number(cardTotalInput) || 0;
      if (kasse + app <= 0) return;
      onAddTransaction({
        ...commonData,
        type: TransactionType.INCOME,
        amount: kasse + app,
        category: 'Doanh thu ngày',
        incomeBreakdown: { cash: calculatedCash, card: cardTotal, delivery: app },
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
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2rem] shadow-xl border dark:border-slate-800 flex flex-col h-full relative overflow-hidden transition-all">
      {isScanning && (
        <div className="absolute inset-0 z-50 bg-indigo-600/95 flex flex-col items-center justify-center text-white p-6 text-center">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="text-xs font-black uppercase tracking-widest">AI Vision Scanning...</p>
        </div>
      )}

      <div className={`px-5 pt-6 pb-4 flex items-center justify-between ${type === TransactionType.INCOME ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter dark:text-white leading-none">{type === TransactionType.INCOME ? 'Lịch Thu' : 'Lịch Chi'}</h2>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Tokymon Financial</p>
        </div>
        {type === TransactionType.EXPENSE && (
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-indigo-600 text-white rounded-xl active:scale-95">
            <Camera className="w-5 h-5" />
          </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />
      </div>
      
      <form onSubmit={handleSubmit} className="p-5 space-y-6 flex-1 overflow-y-auto no-scrollbar pb-10">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-2xl border dark:border-slate-800">
          <button type="button" onClick={() => adjustDate(-1)} className="p-2 bg-white dark:bg-slate-900 rounded-lg active:scale-90 border dark:border-slate-800"><ChevronLeft className="w-4 h-4 text-slate-400" /></button>
          <div onClick={() => dateInputRef.current?.showPicker()} className="flex-1 text-center py-1">
            <span className="text-xs font-black dark:text-white uppercase">{formatDateDisplay(date)}</span>
            <input type="date" ref={dateInputRef} value={date} onChange={e => setDate(e.target.value)} className="absolute opacity-0 pointer-events-none" />
          </div>
          <button type="button" onClick={() => adjustDate(1)} className="p-2 bg-white dark:bg-slate-900 rounded-lg active:scale-90 border dark:border-slate-800"><ChevronRight className="w-4 h-4 text-slate-400" /></button>
        </div>

        {type === TransactionType.INCOME ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Doanh thu quầy (€)</label>
              <input type="number" inputMode="decimal" value={kasseInput} onChange={(e) => setKasseInput(e.target.value)} placeholder="0.00" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-black text-3xl text-indigo-600 outline-none text-center shadow-inner" required />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input type="number" inputMode="decimal" value={appInput} onChange={(e) => setAppInput(e.target.value)} placeholder="App" className="w-full pl-9 pr-2 py-3.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-xl font-black text-sm text-orange-500 outline-none" />
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
              </div>
              <div className="relative">
                <input type="number" inputMode="decimal" value={cardTotalInput} onChange={(e) => setCardTotalInput(e.target.value)} placeholder="Thẻ" className="w-full pl-9 pr-2 py-3.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-xl font-black text-sm text-indigo-600 outline-none" />
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl p-4 flex justify-between items-center text-white">
               <div>
                 <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Tiền mặt rút</p>
                 <h3 className="text-xl font-black text-amber-400">{formatCurrency(calculatedCash)}</h3>
               </div>
               <div className="text-right">
                 <p className="text-[7px] font-black uppercase tracking-widest opacity-40">Tổng doanh thu</p>
                 <h4 className="text-sm font-black text-emerald-400">{formatCurrency(totalRevenue)}</h4>
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Số tiền chi ra (€)</label>
              <input type="number" inputMode="decimal" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-black text-3xl text-rose-600 outline-none text-center shadow-inner" required />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setIsPaid(true)} className={`py-3 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 border transition-all ${isPaid ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:border-slate-800'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã trả
              </button>
              <button type="button" onClick={() => setIsPaid(false)} className={`py-3 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 border transition-all ${!isPaid ? 'bg-rose-500 border-rose-500 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:border-slate-800'}`}>
                <CalendarClock className="w-3.5 h-3.5" /> Ghi nợ
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="relative">
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-xl font-black text-xs outline-none appearance-none">
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {!isPaid ? (
                <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="Nhà cung cấp..." className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 rounded-xl font-black text-xs outline-none" required />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: ExpenseSource.SHOP_CASH, icon: Store },
                    { id: ExpenseSource.WALLET, icon: Wallet },
                    { id: ExpenseSource.CARD, icon: CreditCard }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-2.5 rounded-xl border flex items-center justify-center transition-all ${expenseSource === s.id ? `bg-indigo-600 border-indigo-600 text-white` : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                      <s.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="relative">
          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú..." className="w-full p-3.5 bg-slate-50 dark:bg-slate-950/40 border dark:border-slate-800 rounded-xl text-[10px] font-bold outline-none italic" />
          <Edit3 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        </div>

        {isDuplicateDate && (
           <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-center">
              <p className="text-[8px] font-black text-rose-600 uppercase tracking-tight">Đã có doanh thu cho ngày này!</p>
           </div>
        )}

        <button type="submit" disabled={isDuplicateDate || isScanning} className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-xl active:scale-95 flex items-center justify-center gap-3 ${isDuplicateDate || isScanning ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white shadow-indigo-200'}`}>
          <Save className="w-5 h-5" /> {t('save')}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
