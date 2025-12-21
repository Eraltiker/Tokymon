
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, Language } from '../types';
import { scanReceipt } from '../services/geminiService';
import { useTranslation } from '../i18n';
import { 
  PlusCircle, Save, Euro, CreditCard, Smartphone,
  ChevronLeft, ChevronRight, Store, Wallet, Camera, Loader2,
  CheckCircle2, CalendarClock, Edit3,
  CalendarDays, ChevronDown, Tag
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
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border dark:border-slate-800 flex flex-col h-full transition-all relative overflow-hidden">
      {isScanning && (
        <div className="absolute inset-0 z-50 bg-indigo-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center">
          <Loader2 className="w-16 h-16 animate-spin mb-6" />
          <p className="text-[12px] font-black uppercase tracking-[0.3em]">AI Tokymon đang quét hóa đơn...</p>
        </div>
      )}

      {/* Mobile-Friendly Header for Form */}
      <div className={`px-6 pt-10 pb-6 flex items-center justify-between ${type === TransactionType.INCOME ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight dark:text-white leading-none mb-1">{type === TransactionType.INCOME ? 'Nhập Doanh Thu' : 'Nhập Chi Phí'}</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi nhánh {branchId}</p>
        </div>
        {type === TransactionType.EXPENSE && (
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95 transition-all">
            <Camera className="w-6 h-6" />
          </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-8 flex-1 overflow-y-auto no-scrollbar pb-10">
        {/* Date Stepper Section */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-[2rem] border dark:border-slate-800 shadow-inner">
          <div className="flex items-center gap-2 mb-4 px-1">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày hạch toán</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => adjustDate(-1)} className="flex-1 py-4 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 shadow-sm active:scale-95 transition-all flex justify-center border dark:border-slate-700"><ChevronLeft className="w-6 h-6" /></button>
            <div onClick={() => dateInputRef.current?.showPicker()} className="flex-[2] py-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-center border-2 border-transparent hover:border-indigo-500 transition-all cursor-pointer">
              <span className="text-[14px] font-black dark:text-white uppercase leading-none">{formatDateDisplay(date)}</span>
              <input type="date" ref={dateInputRef} value={date} onChange={e => setDate(e.target.value)} className="absolute opacity-0 pointer-events-none" />
            </div>
            <button type="button" onClick={() => adjustDate(1)} className="flex-1 py-4 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 shadow-sm active:scale-95 transition-all flex justify-center border dark:border-slate-700"><ChevronRight className="w-6 h-6" /></button>
          </div>
        </div>

        {type === TransactionType.INCOME ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 leading-none">Doanh thu tại quán (€)</label>
              <div className="relative">
                <input type="number" inputMode="decimal" value={kasseInput} onChange={(e) => setKasseInput(e.target.value)} placeholder="0.00" className="w-full px-6 py-8 bg-white dark:bg-slate-900 border-2 border-indigo-500/10 dark:border-slate-800 rounded-[2rem] font-black text-5xl text-indigo-600 outline-none focus:bg-indigo-50 dark:focus:bg-indigo-900/10 transition-all text-center" required />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Delivery App</label>
                <div className="relative">
                  <input type="number" inputMode="decimal" value={appInput} onChange={(e) => setAppInput(e.target.value)} placeholder="0" className="w-full pl-12 pr-4 py-5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-black text-xl text-orange-500 outline-none" />
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Tổng Tiền Thẻ</label>
                <div className="relative">
                  <input type="number" inputMode="decimal" value={cardTotalInput} onChange={(e) => setCardTotalInput(e.target.value)} placeholder="0" className="w-full pl-12 pr-4 py-5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-black text-xl text-indigo-600 outline-none" />
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 flex justify-between items-center text-white shadow-2xl relative overflow-hidden">
               <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Cần rút Tiền Mặt</p>
                 <h3 className="text-3xl font-black text-amber-400 leading-none">{formatCurrency(calculatedCash)}</h3>
               </div>
               <div className="relative z-10 text-right">
                 <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Doanh thu tổng</p>
                 <h4 className="text-sm font-black text-emerald-400 leading-none">{formatCurrency(totalRevenue)}</h4>
               </div>
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-10 -mt-10 blur-2xl" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 leading-none">Số tiền chi ra (€)</label>
              <div className="relative">
                <input type="number" inputMode="decimal" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="w-full px-6 py-8 bg-white dark:bg-slate-900 border-2 border-rose-500/10 dark:border-slate-800 rounded-[2rem] font-black text-5xl text-rose-600 outline-none focus:bg-rose-50 dark:focus:bg-rose-900/10 transition-all text-center" required />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => setIsPaid(true)} className={`py-5 rounded-2xl text-[11px] font-black uppercase flex items-center justify-center gap-2 border-2 transition-all active:scale-95 ${isPaid ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                <CheckCircle2 className="w-4 h-4" /> Đã thanh toán
              </button>
              <button type="button" onClick={() => setIsPaid(false)} className={`py-5 rounded-2xl text-[11px] font-black uppercase flex items-center justify-center gap-2 border-2 transition-all active:scale-95 ${!isPaid ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                <CalendarClock className="w-4 h-4" /> Ghi nợ lại
              </button>
            </div>

            <div className="space-y-4">
              {!isPaid ? (
                <div className="relative">
                  <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="Tên chủ nợ / NCC..." className="w-full p-5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-black text-sm outline-none" required />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: ExpenseSource.SHOP_CASH, label: 'Quán', icon: Store },
                    { id: ExpenseSource.WALLET, label: 'Ví Tổng', icon: Wallet },
                    { id: ExpenseSource.CARD, label: 'Thẻ', icon: CreditCard }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-4 rounded-2xl border-2 text-[10px] font-black uppercase flex flex-col items-center gap-2 transition-all active:scale-95 ${expenseSource === s.id ? `bg-indigo-600 border-indigo-600 text-white shadow-md` : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                      <s.icon className="w-5 h-5" /> {s.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="relative">
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full px-6 py-5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl font-black text-sm outline-none appearance-none">
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Thêm ghi chú nội dung..." className="w-full p-5 bg-slate-50 dark:bg-slate-800/40 border dark:border-slate-800 rounded-2xl text-xs font-bold outline-none italic" />
          <Edit3 className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
        </div>

        {isDuplicateDate && (
           <div className="p-5 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/50 flex items-center gap-3 animate-pulse">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-tight">Cảnh báo: Ngày này đã có dữ liệu doanh thu!</p>
           </div>
        )}

        <button type="submit" disabled={isDuplicateDate || isScanning} className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.4em] text-[15px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 ${isDuplicateDate || isScanning ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 text-white shadow-indigo-600/30'}`}>
          <Save className="w-8 h-8" /> {t('save')}
        </button>
      </form>
    </div>
  );
};

const AlertCircle = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

export default TransactionForm;
