
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, TransactionType, ExpenseSource, Language, formatCurrency } from '../types';
import { useTranslation } from '../i18n';
import { 
  Save, ChevronLeft, ChevronRight, Store, 
  ChevronDown, CreditCard, Calendar,
  Wallet, Banknote, Plus, Trash2, User as UserIcon, Calculator,
  MinusCircle, PlusCircle, Info, Sparkles, UserCheck, Truck,
  AlertCircle, CheckCircle2, Tag, Layers, X, MessageSquare,
  Zap
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
  lang = 'vi' as Language, 
  branchName,
  currentUsername = 'Unknown',
  transactions
}) => {
  const { t, translateCategory } = useTranslation(lang);
  const [type] = useState<TransactionType>(fixedType || TransactionType.INCOME);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [notes, setNotes] = useState<string[]>([]);
  const [currentNote, setCurrentNote] = useState('');

  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>(expenseCategories[0] || '');
  const [expenseSource, setExpenseSource] = useState<ExpenseSource>(ExpenseSource.SHOP_CASH);
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [debtorName, setDebtorName] = useState<string>('');
  
  const [kasseTotalInput, setKasseTotalInput] = useState<string>(''); 
  const [appInput, setAppInput] = useState<string>('');   
  const [cardTotalInput, setCardTotalInput] = useState<string>(''); 

  // --- GỢI Ý THÔNG MINH ---
  const smartSuggestions = useMemo(() => {
    if (type === TransactionType.INCOME) {
      return ["Z-Bon sáng", "Z-Bon chiều", "Z-Bon gộp", "Khách Tip", "Tiền mặt dư"];
    }
    const cat = expenseCategory;
    if (cat.includes("Lương")) return ["Lương tháng", "Tiền ứng trước", "Bonus ca đêm", "Lương thử việc"];
    if (cat.includes("nhà")) return ["Tiền nhà tháng", "Tiền điện", "Nebenkosten", "Internet"];
    if (cat.includes("Nguyên liệu")) return ["Thanh toán rau", "Tiền thịt", "Asia Markt", "Trứng/Đồ khô"];
    if (cat.includes("Nợ")) return ["Nhân viên ứng", "Mượn tạm", "Ứng lương"];
    if (cat.includes("Thuế")) return ["Umsatzsteuer", "Gewerbesteuer", "Einkommensteuer"];
    return ["Thanh toán hóa đơn", "Mua đồ lặt vặt", "Chi khẩn cấp"];
  }, [type, expenseCategory]);

  useEffect(() => {
    if (expenseCategory === 'Nợ / Tiền ứng') {
      setIsPaid(false);
      setExpenseSource(ExpenseSource.WALLET);
    }
  }, [expenseCategory]);

  const validateAndSetAmount = (val: string, setter: (v: string) => void) => {
    const sanitized = val.replace(',', '.');
    if (/^[0-9]*\.?[0-9]*$/.test(sanitized)) setter(sanitized);
  };

  const parseNumber = (val: string): number => {
    if (!val) return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const addNote = (text?: string) => {
    const noteToAdd = text || currentNote;
    if (noteToAdd.trim()) {
      setNotes([...notes, noteToAdd.trim()]);
      if (!text) setCurrentNote('');
    }
  };

  const removeNote = (idx: number) => {
    setNotes(notes.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    let finalNotes = [...notes];
    if (currentNote.trim()) finalNotes.push(currentNote.trim());
    
    if (type === TransactionType.EXPENSE) {
      const amount = parseNumber(expenseAmount);
      if (amount <= 0) return;

      onAddTransaction({
        id: Date.now().toString(),
        branchId,
        date,
        amount,
        paidAmount: isPaid ? amount : 0,
        type: TransactionType.EXPENSE,
        category: expenseCategory,
        notes: finalNotes,
        authorName: currentUsername,
        expenseSource: expenseSource,
        isPaid,
        debtorName: (expenseCategory === 'Nợ / Tiền ứng' || !isPaid) ? debtorName : undefined,
        updatedAt: now,
        history: []
      });
      setExpenseAmount(''); setNotes([]); setDebtorName(''); setCurrentNote('');
    } else {
      const kasseTotal = parseNumber(kasseTotalInput);
      const appTotal = parseNumber(appInput);
      const cardTotal = parseNumber(cardTotalInput);
      if (kasseTotal <= 0 && appTotal <= 0) return;
      
      onAddTransaction({
        id: Date.now().toString(),
        branchId,
        date,
        amount: kasseTotal + appTotal,
        type: TransactionType.INCOME,
        category: 'Income',
        notes: finalNotes,
        authorName: currentUsername,
        incomeBreakdown: { cash: (kasseTotal + appTotal) - cardTotal, card: cardTotal, delivery: appTotal },
        updatedAt: now,
        history: []
      });
      setKasseTotalInput(''); setAppInput(''); setCardTotalInput(''); setNotes([]); setCurrentNote('');
    }
  };

  const isIncome = type === TransactionType.INCOME;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-premium border border-white dark:border-slate-800/60 flex flex-col relative animate-ios w-full mb-8 overflow-hidden transition-all duration-300">
      {/* Header Compact Modern */}
      <div className="px-6 py-4 border-b dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl shadow-sm ${isIncome ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
            {isIncome ? <PlusCircle className="w-5 h-5" /> : <MinusCircle className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-xs font-black uppercase dark:text-white tracking-tighter leading-none">{isIncome ? "Nhập Doanh Thu" : "Nhập Chi Phí"}</h2>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{branchName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-full border dark:border-slate-700 shadow-soft">
           <UserIcon className="w-3 h-3 text-brand-600" />
           <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">{currentUsername}</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Date Selector Segmented */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border dark:border-slate-800">
          <button type="button" onClick={() => setDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() - 1); return dt.toISOString().split('T')[0]; })} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl text-slate-400 active-scale shadow-sm flex items-center justify-center shrink-0"><ChevronLeft className="w-4 h-4" /></button>
          <div className="flex-1 text-center relative h-10 flex items-center justify-center group">
            <span className="text-[10px] font-black dark:text-white uppercase tracking-widest flex items-center gap-2 group-active:scale-95 transition-transform"><Calendar className="w-3.5 h-3.5 text-brand-500" /> {date.split('-').reverse().join('/')}</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
          </div>
          <button type="button" onClick={() => setDate(d => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; })} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl text-slate-400 active-scale shadow-sm flex items-center justify-center shrink-0"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {isIncome ? (
          <div className="space-y-5">
            <div className="relative group">
               <label className="absolute -top-2 left-6 bg-white dark:bg-slate-900 px-2 text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">{t('kasse_total')}</label>
               <input type="text" inputMode="decimal" value={kasseTotalInput} onChange={e => validateAndSetAmount(e.target.value, setKasseTotalInput)} placeholder="0.00" className="w-full py-6 px-6 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] font-black text-4xl text-emerald-600 dark:text-emerald-500 text-center outline-none focus:border-emerald-500 transition-all shadow-inner" />
               <Calculator className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-200 pointer-events-none group-focus-within:text-emerald-300" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="absolute -top-2 left-4 bg-white dark:bg-slate-900 px-2 text-[8px] font-black text-rose-500 uppercase tracking-widest z-10">{t('card_total')}</label>
                <input type="text" inputMode="decimal" value={cardTotalInput} onChange={e => validateAndSetAmount(e.target.value, setCardTotalInput)} placeholder="0" className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-xl text-center outline-none focus:border-rose-400" />
              </div>
              <div className="relative">
                <label className="absolute -top-2 left-4 bg-white dark:bg-slate-900 px-2 text-[8px] font-black text-indigo-500 uppercase tracking-widest z-10">{t('app_total')}</label>
                <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} placeholder="0" className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-xl text-center outline-none focus:border-indigo-400" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* HERO AMOUNT */}
            <div className="text-center space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('amount')} (€)</label>
              <input 
                type="text" 
                inputMode="decimal" 
                value={expenseAmount} 
                onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} 
                className="w-full py-6 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] font-black text-5xl text-rose-600 dark:text-rose-500 text-center outline-none focus:border-rose-500 transition-all shadow-inner" 
                placeholder="0.00"
                required 
              />
            </div>

            {/* COMPACT OPTIONS GRID */}
            <div className="grid grid-cols-1 gap-4 bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800">
               <div className="space-y-2">
                  <div className="flex items-center gap-2 px-2">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('category')}</label>
                  </div>
                  <div className="relative">
                    <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full p-4 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-2xl font-black text-[11px] uppercase outline-none appearance-none pr-10 shadow-sm">
                      {expenseCategories.map(c => <option key={c} value={c}>{translateCategory(c)}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                  </div>
               </div>

               <div className="space-y-2">
                  <div className="flex items-center gap-2 px-2">
                    <Banknote className="w-3 h-3 text-slate-400" />
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('source')}</label>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/50 dark:bg-slate-950 rounded-2xl">
                    {[
                      { id: ExpenseSource.SHOP_CASH, icon: Store, label: 'Shop' },
                      { id: ExpenseSource.WALLET, icon: Wallet, label: 'Ví' },
                      { id: ExpenseSource.CARD, icon: CreditCard, label: 'Bank' }
                    ].map(src => (
                      <button 
                        key={src.id} 
                        type="button" 
                        onClick={() => setExpenseSource(src.id)}
                        className={`py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active-scale ${expenseSource === src.id ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <src.icon className="w-3.5 h-3.5" />
                        <span className="text-[7px] font-black uppercase tracking-widest">{src.label}</span>
                      </button>
                    ))}
                  </div>
               </div>

               {expenseCategory !== 'Nợ / Tiền ứng' && (
                 <div className="flex bg-slate-200/50 dark:bg-slate-950 p-1 rounded-2xl">
                    <button type="button" onClick={() => setIsPaid(true)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isPaid ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> {t('paid')}
                    </button>
                    <button type="button" onClick={() => setIsPaid(false)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${!isPaid ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400'}`}>
                      <AlertCircle className="w-3.5 h-3.5" /> {t('unpaid')}
                    </button>
                 </div>
               )}
            </div>

            {/* DEBTOR FIELD - AUTO REVEAL */}
            {(expenseCategory === 'Nợ / Tiền ứng' || !isPaid) && (
              <div className="space-y-2 animate-ios p-5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30">
                <label className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                   <UserCheck className="w-3.5 h-3.5" /> Đối tác / Nhân viên
                </label>
                <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="Tên..." className="w-full p-4 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-800 rounded-2xl font-bold text-xs outline-none focus:border-indigo-500 shadow-sm" />
              </div>
            )}
          </div>
        )}

        {/* --- Ghi chú & Gợi ý thông minh --- */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-brand-500" /> {t('note')}
             </label>
             <button type="button" onClick={() => addNote()} disabled={!currentNote.trim()} className="text-[9px] font-black text-brand-600 uppercase flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/30 px-4 py-2 rounded-xl border border-brand-100 dark:border-brand-800 active-scale disabled:opacity-30"><Plus className="w-3 h-3" /> {t('add_new')}</button>
          </div>

          {/* Gợi ý thông minh (Horizontal Scroll) */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
             {smartSuggestions.map((s, i) => (
               <button 
                 key={i} 
                 type="button" 
                 onClick={() => addNote(s)}
                 className="shrink-0 px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-800 rounded-full text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 transition-all flex items-center gap-1.5 active-scale"
               >
                 <Zap className="w-2.5 h-2.5" /> {s}
               </button>
             ))}
          </div>
          
          <div className="relative">
            <input 
              type="text"
              value={currentNote} 
              onChange={e => setCurrentNote(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNote())}
              placeholder="Ghi nhanh nội dung..."
              className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-white transition-all focus:border-brand-500 shadow-inner"
            />
          </div>

          {notes.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
               {notes.map((n, i) => (
                 <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 text-white rounded-lg shadow-sm animate-ios group">
                    <span className="text-[9px] font-black uppercase leading-none">{n}</span>
                    <button type="button" onClick={() => removeNote(i)} className="text-white/60 hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* ACTION BUTTON */}
        <div className="pt-2">
          <button type="submit" className="w-full h-16 bg-brand-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] active-scale shadow-vivid flex items-center justify-center gap-3 transition-all hover:bg-brand-700 hover:scale-[1.01] group">
            <Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> {t('save_transaction')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
