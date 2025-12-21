
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, Language } from '../types';
import { scanReceipt } from '../services/geminiService';
import { useTranslation } from '../i18n';
import { 
  PlusCircle, Save, Euro, CreditCard, Smartphone,
  ChevronLeft, ChevronRight, Store, Wallet, Camera, Loader2,
  CheckCircle2, CalendarClock, Edit3,
  CalendarDays, ChevronDown
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
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-');
    const formatted = `${d}/${m}/${y}`;
    if (dateStr === today) return `Hôm nay, ${formatted}`;
    if (dateStr === yesterday) return `Hôm qua, ${formatted}`;
    return formatted;
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
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border dark:border-slate-800 flex flex-col h-full transition-all overflow-hidden relative">
      {isScanning && (
        <div className="absolute inset-0 z-50 bg-indigo-600/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="text-xs font-black uppercase tracking-widest">AI đang quét hóa đơn...</p>
        </div>
      )}

      <div className={`px-6 py-4 flex items-center justify-between border-b dark:border-slate-800 ${type === TransactionType.INCOME ? 'bg-indigo-50/40' : 'bg-rose-50/40'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${type === TransactionType.INCOME ? 'bg-indigo-600' : 'bg-rose-500'} text-white shadow-lg`}>
            {type === TransactionType.INCOME ? <PlusCircle className="w-5 h-5" /> : <Euro className="w-5 h-5" />}
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white leading-none">
            {type === TransactionType.INCOME ? t('income') : t('expense')}
          </span>
        </div>
        
        {type === TransactionType.EXPENSE && (
           <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">
             <Camera className="w-4 h-4" /> <span>AI Scan</span>
           </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner">
          <div className="flex items-center gap-2 mb-3 px-1">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Ngày giao dịch</label>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => adjustDate(-1)} className="p-4 bg-white dark:bg-slate-900 rounded-2xl text-slate-500 border dark:border-slate-700 shadow-sm active:scale-90 transition-all">
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div 
              onClick={() => dateInputRef.current?.showPicker()}
              className="relative flex-1 flex flex-col justify-center items-center p-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-500 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <span className="text-[15px] font-black text-slate-900 dark:text-white leading-none">
                {formatDateDisplay(date)}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase mt-1.5 tracking-tighter">Nhấn để chọn lịch</span>
              <input 
                type="date" 
                ref={dateInputRef}
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              />
            </div>

            <button type="button" onClick={() => adjustDate(1)} className="p-4 bg-white dark:bg-slate-900 rounded-2xl text-slate-500 border dark:border-slate-700 shadow-sm active:scale-90 transition-all">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {type === TransactionType.INCOME ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase px-1 tracking-widest">{t('kasse_input')}</label>
              <div className="relative">
                <input type="number" inputMode="decimal" value={kasseInput} onChange={(e) => setKasseInput(e.target.value)} placeholder="0.00" className="w-full pl-14 pr-6 py-5 bg-white dark:bg-slate-800 border-2 border-indigo-50 dark:border-slate-700 rounded-3xl font-black text-4xl text-slate-900 dark:text-white outline-none focus:border-indigo-600 shadow-sm" required />
                <Store className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-indigo-400" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest leading-none">{t('app_input')}</label>
                <div className="relative">
                  <input type="number" inputMode="decimal" value={appInput} onChange={(e) => setAppInput(e.target.value)} placeholder="0" className="w-full pl-10 pr-4 py-4 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-black text-lg text-orange-500 outline-none focus:border-orange-500 shadow-sm" />
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest leading-none">{t('card_total_input')}</label>
                <div className="relative">
                  <input type="number" inputMode="decimal" value={cardTotalInput} onChange={(e) => setCardTotalInput(e.target.value)} placeholder="0" className="w-full pl-10 pr-4 py-4 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-black text-lg text-indigo-600 outline-none focus:border-indigo-600 shadow-sm" />
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-[2.5rem] flex justify-between items-center shadow-2xl relative overflow-hidden border border-slate-800">
               <div className="relative z-10">
                 <span className="text-[11px] font-black text-slate-500 uppercase block tracking-widest mb-1">CẦN RÚT TM</span>
                 <span className="text-4xl font-black text-amber-400 leading-none">{formatCurrency(calculatedCash)}</span>
               </div>
               <div className="relative z-10 text-right">
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-widest mb-1 leading-none">TỔNG THU</span>
                  <span className="text-lg font-black text-emerald-400 leading-none">{formatCurrency(totalRevenue)}</span>
               </div>
               <Wallet className="absolute right-[-20px] bottom-[-20px] w-28 h-28 opacity-10 rotate-12 text-white" />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase px-1 tracking-widest leading-none">{t('amount')} (€)</label>
              <div className="relative">
                <input type="number" inputMode="decimal" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-white dark:bg-slate-800 border-2 border-rose-50 dark:border-slate-700 rounded-3xl font-black text-4xl text-rose-500 outline-none focus:border-rose-600 shadow-sm" required />
                <Euro className="absolute left-5 top-1/2 -translate-y-1/2 w-7 h-7 text-rose-400" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => setIsPaid(true)} className={`py-5 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 border-2 transition-all active:scale-95 ${isPaid ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                <CheckCircle2 className="w-4 h-4" /> Trả ngay
              </button>
              <button type="button" onClick={() => setIsPaid(false)} className={`py-5 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 border-2 transition-all active:scale-95 ${!isPaid ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                <CalendarClock className="w-4 h-4" /> Ghi nợ
              </button>
            </div>

            <div className="space-y-4">
              {!isPaid ? (
                <div className="relative">
                  <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="Tên chủ nợ / NCC..." className="w-full pl-5 pr-5 py-5 bg-white dark:bg-slate-800 border-2 border-amber-100 dark:border-slate-700 rounded-2xl font-black text-sm outline-none focus:border-amber-500 shadow-sm" required />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: ExpenseSource.SHOP_CASH, label: 'Laden', icon: Store },
                    { id: ExpenseSource.WALLET, label: 'Ví Tổng', icon: Wallet },
                    { id: ExpenseSource.CARD, label: 'Bank', icon: CreditCard }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2 transition-all active:scale-95 ${expenseSource === s.id ? `bg-indigo-600 border-indigo-600 text-white shadow-md` : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                      <s.icon className="w-5 h-5" />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full px-5 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-sm outline-none appearance-none cursor-pointer">
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                   <ChevronDown className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative flex items-center bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
          <input 
            type="text" 
            value={note} 
            onChange={e => setNote(e.target.value)} 
            placeholder="Ghi chú thêm nội dung..." 
            className="w-full px-2 bg-transparent text-sm font-bold text-slate-800 dark:text-white outline-none placeholder:text-slate-300" 
          />
          <Edit3 className="w-5 h-5 text-slate-200 shrink-0" />
        </div>

        {isDuplicateDate && (
           <p className="text-[10px] font-black text-rose-500 uppercase text-center tracking-widest animate-pulse p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/50 leading-none">{t('duplicate_revenue')}</p>
        )}

        <button 
          type="submit" 
          disabled={isDuplicateDate || isScanning}
          className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[13px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 ${isDuplicateDate || isScanning ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-700'}`}
        >
          <Save className="w-7 h-7" /> <span>{t('save')}</span>
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
