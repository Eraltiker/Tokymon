
import React, { useState } from 'react';
import { Transaction, TransactionType, ExpenseSource, Language, formatCurrency } from '../types';
import { useTranslation } from '../i18n';
import { 
  Save, ChevronLeft, ChevronRight, Store, 
  ChevronDown, CreditCard, Calendar,
  Wallet, Coins, Banknote, Plus, Trash2, User as UserIcon, Calculator,
  MinusCircle, PlusCircle
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
  currentUsername = 'Unknown'
}) => {
  const { t, translateCategory, translateSource } = useTranslation(lang);
  const [type] = useState<TransactionType>(fixedType || TransactionType.INCOME);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [showCoins, setShowCoins] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);

  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<string>(expenseCategories[0] || '');
  const [expenseSource, setExpenseSource] = useState<ExpenseSource>(ExpenseSource.SHOP_CASH);
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [debtorName, setDebtorName] = useState<string>('');
  
  const [kasseTotalInput, setKasseTotalInput] = useState<string>(''); 
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

  const addNoteField = () => setNotes([...notes, '']);
  const updateNote = (idx: number, val: string) => {
    const updated = [...notes];
    updated[idx] = val;
    setNotes(updated);
  };
  const removeNote = (idx: number) => setNotes(notes.filter((_, i) => i !== idx));

  // --- CÔNG THỨC TOKYMON CHUẨN: (Kasse + App - Thẻ) ---
  const kasseTotal = parseNumber(kasseTotalInput); 
  const cardTotal = parseNumber(cardTotalInput); 
  const appTotal = parseNumber(appInput);
  const coins = showCoins ? parseNumber(coinInput) : 0;

  // Tiền mặt tại két (trước khi trừ chi phí)
  const actualCashAtKasse = (kasseTotal + appTotal - cardTotal);
  const paperCash = actualCashAtKasse - coins;

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
      } as Transaction);
      setExpenseAmount(''); setNotes([]); 
    } else {
      if (kasseTotal <= 0 && appTotal <= 0) return;
      onAddTransaction({
        ...baseTx, 
        type: TransactionType.INCOME, 
        amount: kasseTotal + appTotal, 
        category: 'Income',
        incomeBreakdown: { 
          cash: actualCashAtKasse, 
          card: cardTotal, 
          delivery: appTotal,
          coins: coins 
        },
      } as Transaction);
      setKasseTotalInput(''); setCoinInput(''); setAppInput(''); setCardTotalInput(''); setNotes([]);
      setShowCoins(false);
    }
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[2.5rem] shadow-ios border border-white dark:border-slate-800/80 flex flex-col relative overflow-hidden animate-ios">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex-1 truncate">
          <span className="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em] block mb-0.5">{branchName}</span>
          <h2 className="text-base font-extrabold uppercase dark:text-white leading-none truncate">
            {type === TransactionType.INCOME ? "Chốt Báo Cáo Ngày" : "Nhập Chi Phí"}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-50 dark:bg-brand-900/30 rounded-full border border-brand-100 dark:border-brand-800">
           <UserIcon className="w-3 h-3 text-brand-600" />
           <span className="text-[9px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">{currentUsername}</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
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
            <div className="bg-brand-50/50 dark:bg-brand-900/10 p-4 rounded-3xl border border-brand-100 dark:border-brand-800/50">
              <label className="text-[9px] font-black text-brand-600 dark:text-brand-400 uppercase px-1 tracking-widest flex items-center gap-2 mb-2">
                <Calculator className="w-3.5 h-3.5" /> Tổng Kasse (Z-Bon)
              </label>
              <input type="text" inputMode="decimal" value={kasseTotalInput} onChange={e => validateAndSetAmount(e.target.value, setKasseTotalInput)} placeholder="0.00" className="w-full p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-xl text-center outline-none ring-4 ring-brand-500/5 transition-all focus:ring-brand-500/10" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-rose-500 uppercase px-2 tracking-widest flex items-center gap-2">
                  <MinusCircle className="w-3.5 h-3.5" /> Tiền Thẻ (Bank)
                </label>
                <input type="text" inputMode="decimal" value={cardTotalInput} onChange={e => validateAndSetAmount(e.target.value, setCardTotalInput)} placeholder="0" className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-sm text-center outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-indigo-500 uppercase px-2 tracking-widest flex items-center gap-2">
                  <PlusCircle className="w-3.5 h-3.5" /> Tiền App (€)
                </label>
                <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} placeholder="0" className="w-full p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-sm text-center outline-none" />
              </div>
            </div>

            <div className="bg-slate-900 dark:bg-black rounded-[2rem] p-5 space-y-4 shadow-vivid border border-slate-800">
               <div className="flex justify-between items-center text-slate-400">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-tight">Két thực tế chốt ca</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-white">{formatCurrency(actualCashAtKasse, lang)}</span>
                    <p className="text-[7px] font-bold text-slate-500 uppercase leading-none">(K + A - T)</p>
                  </div>
               </div>
               
               <div className="h-px bg-slate-800 w-full" />
               
               <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setShowCoins(!showCoins)} className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 hover:text-white transition-colors">
                    <Coins className="w-3.5 h-3.5 text-amber-500" /> {showCoins ? 'Ẩn tiền xu' : 'Tách tiền xu'}
                  </button>
                  {showCoins && (
                    <div className="flex items-center gap-2 animate-ios">
                      <input type="text" inputMode="decimal" value={coinInput} onChange={e => validateAndSetAmount(e.target.value, setCoinInput)} placeholder="Xu" className="w-24 p-2 bg-slate-800 border border-slate-700 rounded-lg font-black text-xs text-center text-white outline-none" />
                    </div>
                  )}
               </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5 text-center">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Số tiền chi (€)</label>
              <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full py-5 bg-rose-50/30 dark:bg-rose-950/20 border-2 border-rose-100 dark:border-rose-900/50 rounded-2xl font-black text-2xl text-rose-600 text-center outline-none focus:ring-4 focus:ring-rose-500/10" required />
            </div>
            
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border dark:border-slate-800">
              <button type="button" onClick={() => setIsPaid(true)} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isPaid ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm' : 'text-slate-400'}`}>Đã thanh toán</button>
              <button type="button" onClick={() => setIsPaid(false)} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!isPaid ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400'}`}>Công nợ</button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-brand-500 rounded-2xl font-black text-[11px] uppercase outline-none appearance-none transition-all dark:text-slate-200">
                  {expenseCategories.map(c => <option key={c} value={c}>{translateCategory(c)}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>

              {!isPaid ? (
                <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="Tên chủ nợ / NCC" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-[11px] outline-none" required />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: ExpenseSource.SHOP_CASH, label: "Tại Quán", icon: Store },
                    { id: ExpenseSource.WALLET, label: "Ví Tổng", icon: Wallet },
                    { id: ExpenseSource.CARD, label: "Bank/Thẻ", icon: CreditCard }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 active-scale ${expenseSource === s.id ? `bg-brand-600 border-brand-600 text-white` : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500'}`}>
                      <s.icon className="w-4 h-4" />
                      <span className="text-[8px] font-black uppercase tracking-tighter leading-none text-center">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-2">
          <div className="flex items-center justify-between px-2 mb-3">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Ghi chú nhanh</label>
             <button type="button" onClick={addNoteField} className="text-[9px] font-black text-brand-600 uppercase tracking-widest flex items-center gap-1"><Plus className="w-3 h-3" /> Thêm note</button>
          </div>
          
          <div className="space-y-3">
            {notes.map((note, idx) => (
              <div key={idx} className="relative group animate-ios">
                <textarea 
                  value={note} 
                  onChange={e => updateNote(idx, e.target.value)} 
                  placeholder={`Ghi chú #${idx + 1}`}
                  className="w-full p-4 bg-slate-50/50 dark:bg-slate-950/30 rounded-2xl border border-slate-200 dark:border-slate-800 outline-none text-[11px] font-bold dark:text-white resize-none h-16 transition-all"
                />
                <button type="button" onClick={() => removeNote(idx)} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="w-full h-16 bg-brand-600 text-white rounded-[2rem] font-black uppercase tracking-[0.1em] text-xs active-scale shadow-vivid flex items-center justify-center gap-2 transition-all hover:bg-brand-500">
          <Save className="w-5 h-5" /> Lưu báo cáo
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
