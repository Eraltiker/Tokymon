
import React, { useState, useMemo, useRef } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, Language } from '../types';
import { scanReceipt } from '../services/geminiService';
import { useTranslation } from '../i18n';
import { 
  Save, Camera, Loader2,
  ChevronLeft, ChevronRight, Store, 
  ChevronDown, CreditCard, Calendar,
  Wallet, Receipt, Sparkles, AlertCircle
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

  const validateAndSetAmount = (val: string, setter: (v: string) => void) => {
    if (/^[0-9]*[.,]?[0-9]*$/.test(val)) setter(val.replace(',', '.'));
  };

  const parseLocaleNumber = (val: string): number => {
    if (!val) return 0;
    return Number(val);
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

  /**
   * Nén ảnh trước khi gửi AI để tăng tốc độ upload và xử lý
   */
  const compressImage = (file: File): Promise<{base64: string, type: string}> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve({
            base64: dataUrl.split(',')[1],
            type: 'image/jpeg'
          });
        };
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsScanning(true);
    try {
      const { base64, type: compressedType } = await compressImage(file);
      const result = await scanReceipt(base64, compressedType);
      
      if (result) {
        if (result.amount) setExpenseAmount(result.amount.toString());
        if (result.category) setExpenseCategory(result.category);
        if (result.note) setNote(result.note);
        if (result.date) setDate(result.date);
      }
    } catch (error) { 
      console.error("Scan error:", error);
      alert("AI không thể đọc được hóa đơn này. Vui lòng chụp rõ hơn hoặc nhập thủ công.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col relative overflow-hidden transition-all max-w-full lg:max-w-md mx-auto">
      {isScanning && (
        <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 animate-in fade-in">
          <div className="relative mb-6">
            <Loader2 className="w-16 h-16 animate-spin text-brand-500" />
            <Sparkles className="w-6 h-6 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-center animate-pulse">{t('scan_ai')}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Đang phân tích dữ liệu...</p>
        </div>
      )}

      <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/20">
        <div>
          <span className="text-[8px] font-black uppercase text-indigo-500 tracking-wider leading-none block mb-0.5">{branchName}</span>
          <h2 className="text-sm font-black uppercase tracking-tight dark:text-white leading-none">
            {type === TransactionType.INCOME ? t('chot_so') : t('chi_phi')}
          </h2>
        </div>
        {type === TransactionType.EXPENSE && (
          <button type="button" onClick={() => fileInputRef.current?.click()} className="w-11 h-11 bg-slate-900 dark:bg-brand-600 text-white rounded-2xl active:scale-95 transition-all flex items-center justify-center shadow-lg group">
            <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800">
          <button type="button" onClick={() => adjustDate(-1)} className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl text-slate-400 active:scale-90 flex items-center justify-center shadow-sm"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex-1 text-center relative h-10 flex items-center justify-center">
            <span className="text-[11px] font-black dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-500" />
              {formatDateDisplay(date)}
            </span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
          </div>
          <button type="button" onClick={() => adjustDate(1)} className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl text-slate-400 active:scale-90 flex items-center justify-center shadow-sm"><ChevronRight className="w-5 h-5" /></button>
        </div>

        {type === TransactionType.INCOME ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">{t('kasse_total')} (€)</label>
              <input type="text" inputMode="decimal" value={kasseInput} onChange={e => validateAndSetAmount(e.target.value, setKasseInput)} placeholder="0.00" className="w-full px-5 py-4 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-2xl text-indigo-600 outline-none focus:border-brand-500 transition-all shadow-inner" required />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">{t('card_total')}</label>
                <input type="text" inputMode="decimal" value={cardTotalInput} onChange={e => validateAndSetAmount(e.target.value, setCardTotalInput)} placeholder="0" className="w-full p-4 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-base text-indigo-500 outline-none focus:border-indigo-400 shadow-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">{t('app_total')}</label>
                <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} placeholder="0" className="w-full p-4 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-base text-orange-600 outline-none focus:border-orange-400 shadow-sm" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5 text-center">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tổng tiền chi (€)</label>
              <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full py-4 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-3xl text-rose-600 text-center outline-none focus:border-rose-500 shadow-inner" required />
            </div>
            
            <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-[1.4rem] border border-slate-200/50 dark:border-slate-800">
              <button type="button" onClick={() => setIsPaid(true)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${isPaid ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-md' : 'text-slate-400'}`}>{t('paid')}</button>
              <button type="button" onClick={() => setIsPaid(false)} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${!isPaid ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400'}`}>{t('unpaid')}</button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full px-5 py-3.5 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-[11px] uppercase outline-none appearance-none focus:border-brand-500 shadow-sm">
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {!isPaid ? (
                <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder="Tên chủ nợ..." className="w-full px-5 py-3.5 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-xs outline-none focus:border-brand-500 shadow-sm" required />
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: ExpenseSource.SHOP_CASH, label: 'Quán', icon: Store },
                    { id: ExpenseSource.WALLET, label: 'Ví', icon: Wallet },
                    { id: ExpenseSource.CARD, label: 'Thẻ', icon: CreditCard }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-2.5 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${expenseSource === s.id ? `bg-brand-600 border-brand-600 text-white shadow-lg` : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300'}`}>
                      <s.icon className="w-4 h-4" />
                      <span className="text-[8px] font-black uppercase tracking-tighter">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-inner group">
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={`${t('note')} (Tên cửa hàng, nội dung...)`} className="w-full bg-transparent text-xs font-bold outline-none dark:text-white resize-none h-16 leading-relaxed" />
            <div className="flex justify-between items-center mt-2 opacity-40 group-focus-within:opacity-100 transition-opacity">
               <span className="text-[7px] font-black uppercase tracking-widest">Store/Vendor Info</span>
               <Receipt className="w-3 h-3" />
            </div>
          </div>

          <button type="submit" disabled={isDuplicateDate || isScanning} className={`w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] shadow-vivid active:scale-[0.98] transition-all flex items-center justify-center gap-3 ${isDuplicateDate || isScanning ? 'bg-slate-200 text-slate-400 shadow-none grayscale cursor-not-allowed' : 'bg-brand-600 text-white'}`}>
            <Save className="w-5 h-5" /> {t('save_transaction')}
          </button>
          
          {isDuplicateDate && (
             <p className="text-[9px] font-black text-rose-500 uppercase text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-3 h-3" /> Ngày này đã có dữ liệu chốt sổ!
             </p>
          )}
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
