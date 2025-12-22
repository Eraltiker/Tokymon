
import React, { useState, useMemo, useRef } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, Language } from '../types';
import { scanReceipt } from '../services/geminiService';
import { useTranslation } from '../i18n';
import { 
  Save, Camera, Loader2,
  ChevronLeft, ChevronRight, Store, 
  ChevronDown, Building2, Banknote, CreditCard, Smartphone
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

  // Expense states
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>(expenseCategories[0] || '');
  const [expenseSource, setExpenseSource] = useState<ExpenseSource>(ExpenseSource.SHOP_CASH);
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [debtorName, setDebtorName] = useState<string>('');

  // Income states
  const [kasseInput, setKasseInput] = useState<string>(''); 
  const [appInput, setAppInput] = useState<string>('');   
  const [cardTotalInput, setCardTotalInput] = useState<string>(''); 
  
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const isDuplicateDate = useMemo(() => {
    if (type !== TransactionType.INCOME) return false;
    return transactions.some(tx => tx.type === TransactionType.INCOME && tx.date === date && tx.branchId === branchId && !tx.deletedAt);
  }, [date, transactions, type, branchId]);

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
        incomeBreakdown: { 
          cash: Math.max(0, (kasse + app) - cardTotal), // Lưu số TM doanh thu gốc
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
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col h-full relative overflow-hidden transition-all">
      {isScanning && (
        <div className="absolute inset-0 z-50 bg-indigo-600 flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-300">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="text-xs font-black uppercase tracking-widest">AI Vision Scanning...</p>
        </div>
      )}

      {/* Header Form */}
      <div className="px-6 pt-8 pb-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
           <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-3 h-3 text-indigo-500" />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{branchName || 'Tokymon'}</span>
           </div>
           <h2 className="text-2xl font-black uppercase tracking-tighter dark:text-white leading-none">
             {type === TransactionType.INCOME ? 'Chốt Sổ' : 'Chi Phí'}
           </h2>
        </div>
        {type === TransactionType.EXPENSE && (
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl active:scale-95 transition-all">
            <Camera className="w-6 h-6" />
          </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto no-scrollbar pb-12">
        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border dark:border-slate-800">
          <button type="button" onClick={() => adjustDate(-1)} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 text-slate-400 active:scale-90"><ChevronLeft className="w-4 h-4" /></button>
          <div onClick={() => dateInputRef.current?.showPicker()} className="flex-1 text-center py-2 cursor-pointer">
            <span className="text-[11px] font-black dark:text-white uppercase tracking-wider">{formatDateDisplay(date)}</span>
            <input type="date" ref={dateInputRef} value={date} onChange={e => setDate(e.target.value)} className="absolute opacity-0 pointer-events-none" />
          </div>
          <button type="button" onClick={() => adjustDate(1)} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 text-slate-400 active:scale-90"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {type === TransactionType.INCOME ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tiền Kasse (€)</label>
              <div className="relative">
                <input type="number" inputMode="decimal" value={kasseInput} onChange={(e) => setKasseInput(e.target.value)} placeholder="0.00" className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800 rounded-3xl font-black text-3xl text-indigo-600 outline-none text-center focus:border-indigo-600 transition-all" required />
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tiền App (€)</label>
                <div className="relative">
                  <input type="number" inputMode="decimal" value={appInput} onChange={(e) => setAppInput(e.target.value)} placeholder="0" className="w-full pl-4 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800 rounded-2xl font-black text-sm text-slate-900 dark:text-white outline-none focus:border-orange-500" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tiền Thẻ (€)</label>
                <div className="relative">
                  <input type="number" inputMode="decimal" value={cardTotalInput} onChange={(e) => setCardTotalInput(e.target.value)} placeholder="0" className="w-full pl-4 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800 rounded-2xl font-black text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Số tiền (€)</label>
              <input type="number" inputMode="decimal" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800 rounded-3xl font-black text-3xl text-rose-600 outline-none text-center focus:border-rose-500 transition-all" required />
            </div>
            
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl">
              <button type="button" onClick={() => setIsPaid(true)} className={`py-3.5 rounded-xl text-[10px] font-black uppercase transition-all ${isPaid ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400'}`}>
                Đã trả
              </button>
              <button type="button" onClick={() => setIsPaid(false)} className={`py-3.5 rounded-xl text-[10px] font-black uppercase transition-all ${!isPaid ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400'}`}>
                Chưa trả
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800 rounded-2xl font-black text-xs uppercase outline-none appearance-none focus:border-indigo-500">
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>

              {!isPaid ? (
                <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="Tên chủ nợ..." className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 dark:border-slate-800 rounded-2xl font-black text-xs outline-none" required />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: ExpenseSource.SHOP_CASH, label: 'Két Quán' },
                    { id: ExpenseSource.WALLET, label: 'Ví Tổng' },
                    { id: ExpenseSource.CARD, label: 'Thẻ Bank' }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-3 rounded-xl border-2 transition-all ${expenseSource === s.id ? `bg-indigo-600 border-indigo-600 text-white shadow-md` : 'bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-slate-400'}`}>
                      <span className="text-[8px] font-black uppercase leading-none">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border dark:border-slate-800">
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú thêm..." className="w-full bg-transparent text-[11px] font-bold outline-none text-slate-600 dark:text-slate-400 resize-none h-12" />
        </div>

        <button type="submit" disabled={isDuplicateDate || isScanning} className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl active:scale-[0.98] transition-all ${isDuplicateDate || isScanning ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 dark:bg-indigo-600 text-white hover:bg-black'}`}>
          <Save className="w-4 h-4 inline-block mr-2" /> Lưu Giao Dịch
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
