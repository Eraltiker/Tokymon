
import React, { useState, useMemo, useRef } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, Language } from '../types';
import { scanReceipt } from '../services/geminiService';
import { useTranslation } from '../i18n';
import { 
  Save, Camera, Loader2,
  ChevronLeft, ChevronRight, Store, 
  ChevronDown, Building2, Banknote, CreditCard, Smartphone, Info, Calendar,
  Wallet, Receipt
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
  const dateInputRef = useRef<HTMLInputElement>(null);

  const isDuplicateDate = useMemo(() => {
    if (type !== TransactionType.INCOME) return false;
    return transactions.some(tx => tx.type === TransactionType.INCOME && tx.date === date && tx.branchId === branchId && !tx.deletedAt);
  }, [date, transactions, type, branchId]);

  const validateAndSetAmount = (val: string, setter: (v: string) => void) => {
    // Cho phép số, dấu chấm và dấu phẩy
    if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
      setter(val);
    }
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
    const today = new Date().toISOString().split('T')[0];
    const d = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
    if (dateStr === today) return `Hôm nay, ${d.toLocaleDateString(undefined, options)}`;
    return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: '2-digit' });
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
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-vivid dark:shadow-none border dark:border-slate-800 flex flex-col relative overflow-hidden transition-all max-w-lg mx-auto mb-8">
      {isScanning && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-300">
          <div className="relative mb-6">
            <Loader2 className="w-16 h-16 animate-spin text-indigo-500" />
            <Camera className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-indigo-400">{t('scan_ai')}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Đang phân tích dữ liệu hóa đơn...</p>
        </div>
      )}

      {/* Header with improved layout */}
      <div className="px-7 py-6 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
        <div className="space-y-1">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{branchName}</span>
           </div>
           <h2 className="text-2xl font-black uppercase tracking-tighter dark:text-white leading-none">
             {type === TransactionType.INCOME ? 'Chốt Sổ' : 'Hóa Đơn'}
           </h2>
        </div>
        {type === TransactionType.EXPENSE && (
          <button type="button" onClick={() => fileInputRef.current?.click()} className="w-14 h-14 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl active:scale-95 transition-all shadow-xl flex items-center justify-center border-4 border-white dark:border-slate-800">
            <Camera className="w-7 h-7" />
          </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />
      </div>
      
      <form onSubmit={handleSubmit} className="p-7 space-y-7">
        {/* Modern Compact Date Picker */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border dark:border-slate-800">
          <button type="button" onClick={() => adjustDate(-1)} className="p-3 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 text-slate-400 active:scale-90 shadow-sm z-10"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex-1 text-center py-2 cursor-pointer flex flex-col items-center relative min-h-[44px] justify-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[11px] font-black dark:text-white uppercase tracking-wider">{formatDateDisplay(date)}</span>
            </div>
            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Chọn ngày</span>
            <input 
              type="date" 
              ref={dateInputRef} 
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
            />
          </div>
          <button type="button" onClick={() => adjustDate(1)} className="p-3 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 text-slate-400 active:scale-90 shadow-sm z-10"><ChevronRight className="w-5 h-5" /></button>
        </div>

        {type === TransactionType.INCOME ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block">{t('kasse_total')} (€)</label>
              <div className="relative group">
                <input 
                  type="text" 
                  inputMode="decimal" 
                  value={kasseInput} 
                  onChange={(e) => validateAndSetAmount(e.target.value, setKasseInput)} 
                  placeholder="0.00" 
                  className="w-full px-6 py-5 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-3xl font-black text-3xl text-indigo-600 outline-none focus:border-indigo-600 transition-all shadow-sm" 
                  required 
                />
                <Store className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-200 group-focus-within:text-indigo-200 transition-colors" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Thẻ / Bank</label>
                <input type="text" inputMode="decimal" value={cardTotalInput} onChange={(e) => validateAndSetAmount(e.target.value, setCardTotalInput)} placeholder="0" className="w-full px-5 py-4 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-base text-indigo-500 outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1"><Smartphone className="w-3 h-3" /> Online App</label>
                <input type="text" inputMode="decimal" value={appInput} onChange={(e) => validateAndSetAmount(e.target.value, setAppInput)} placeholder="0" className="w-full px-5 py-4 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-base text-orange-600 outline-none focus:border-orange-500" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-center block">Tổng số tiền chi (€)</label>
              <div className="relative group">
                <input type="text" inputMode="decimal" value={expenseAmount} onChange={(e) => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full px-8 py-5 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-3xl font-black text-3xl text-rose-600 outline-none text-center focus:border-rose-500 transition-all shadow-sm" required />
                <Receipt className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-200 group-focus-within:text-rose-200 transition-colors" />
              </div>
            </div>
            
            <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border dark:border-slate-800">
              <button type="button" onClick={() => setIsPaid(true)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${isPaid ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-md' : 'text-slate-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-indigo-500' : 'bg-slate-400'}`} /> {t('paid')}
              </button>
              <button type="button" onClick={() => setIsPaid(false)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${!isPaid ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${!isPaid ? 'bg-white' : 'bg-slate-400'}`} /> {t('unpaid')}
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1 block">{t('category')}</label>
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full px-5 py-4 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-[12px] uppercase outline-none appearance-none focus:border-indigo-500">
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-11 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {!isPaid ? (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{t('vendor_name')}</label>
                  <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="Tên chủ nợ..." className="w-full px-5 py-4 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-sm outline-none focus:border-rose-500" required />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nguồn tiền chi</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: ExpenseSource.SHOP_CASH, label: 'Quán', icon: Store },
                      { id: ExpenseSource.WALLET, label: 'Ví', icon: Wallet },
                      { id: ExpenseSource.CARD, label: 'Bank', icon: CreditCard }
                    ].map((s) => (
                      <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${expenseSource === s.id ? `bg-indigo-600 border-indigo-600 text-white shadow-lg` : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}>
                        <s.icon className={`w-4 h-4 ${expenseSource === s.id ? 'text-white' : 'text-slate-300'}`} />
                        <span className="text-[8px] font-black uppercase tracking-widest">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Improved Notes and Submit */}
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border dark:border-slate-800 shadow-inner">
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={`${t('note')}...`} className="w-full bg-transparent text-[11px] font-bold outline-none text-slate-700 dark:text-slate-300 resize-none h-16 leading-relaxed" />
          </div>

          <button type="submit" disabled={isDuplicateDate || isScanning} className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${isDuplicateDate || isScanning ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
            <Save className="w-5 h-5" /> {t('save_transaction')}
          </button>
        </div>
      </form>

      {isDuplicateDate && (
        <div className="px-7 py-4 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-100 dark:border-amber-900/30 flex items-center gap-3">
          <Info className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase leading-relaxed">Dữ liệu doanh thu ngày này đã tồn tại trong hệ thống. Vui lòng chỉnh sửa bản ghi hiện có.</p>
        </div>
      )}
    </div>
  );
};

export default TransactionForm;
