
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, Language } from '../types';
import { scanReceipt } from '../services/geminiService';
import { useTranslation } from '../i18n';
import { 
  Save, Camera, Loader2,
  ChevronLeft, ChevronRight, Store, 
  ChevronDown, CreditCard, Calendar,
  Wallet, Receipt, Sparkles, AlertCircle, X,
  Image as ImageIcon
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
  const [inputKey, setInputKey] = useState(Date.now());

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

  const compressImage = (file: File): Promise<{base64: string, type: string}> => {
    return new Promise((resolve, reject) => {
      // iOS Memory Fix: Sử dụng ObjectURL
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = objectUrl;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Giới hạn 1000px để ổn định trên iPhone SE/8
        const MAX_SIZE = 1000; 
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'medium';
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        URL.revokeObjectURL(objectUrl);
        resolve({ base64: dataUrl.split(',')[1], type: 'image/jpeg' });
      };
      
      img.onerror = (e) => {
        URL.revokeObjectURL(objectUrl);
        reject(e);
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsScanning(true);
    // Độ trễ nhẹ 100ms để iOS hoàn tất ghi file từ camera vào cache
    await new Promise(r => setTimeout(r, 100));

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
      alert(lang === 'vi' ? "AI quét thất bại. Vui lòng thử lại hoặc chọn ảnh khác." : "KI-Scan fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setIsScanning(false);
      setInputKey(Date.now());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicateDate) return;
    const commonData = {
      id: Date.now().toString(),
      branchId, date, note,
      updatedAt: new Date().toISOString(), history: []
    };
    if (type === TransactionType.EXPENSE) {
      const amount = parseLocaleNumber(expenseAmount);
      if (!amount || amount <= 0) return;
      onAddTransaction({
        ...commonData, type: TransactionType.EXPENSE, amount, category: expenseCategory,
        expenseSource: isPaid ? expenseSource : undefined, isPaid, debtorName: isPaid ? undefined : debtorName,
      });
      setExpenseAmount(''); setDebtorName(''); setNote('');
    } else {
      const kasse = parseLocaleNumber(kasseInput);
      const app = parseLocaleNumber(appInput);
      const cardTotal = parseLocaleNumber(cardTotalInput);
      if (kasse + app <= 0) return;
      onAddTransaction({
        ...commonData, type: TransactionType.INCOME, amount: kasse + app, category: t('income'),
        incomeBreakdown: { cash: Math.max(0, (kasse + app) - cardTotal), card: cardTotal, delivery: app },
      });
      setKasseInput(''); setAppInput(''); setCardTotalInput(''); setNote('');
    }
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2rem] shadow-ios border border-white dark:border-slate-800/50 flex flex-col relative overflow-hidden transition-all max-w-full lg:max-w-md mx-auto animate-ios">
      {isScanning && (
        <div className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            <Sparkles className="w-5 h-5 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-center animate-pulse">AI Scanning...</p>
        </div>
      )}

      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
        <div className="min-w-0 pr-2 flex-1">
          <span className="text-[9px] font-black uppercase text-brand-600 dark:text-brand-400 tracking-widest block mb-1 opacity-80">{branchName}</span>
          <h2 className="text-lg font-extrabold uppercase tracking-tight dark:text-white leading-none truncate">
            {type === TransactionType.INCOME ? t('chot_so') : t('chi_phi')}
          </h2>
        </div>
        
        {type === TransactionType.EXPENSE && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Nút DUYỆT FILE */}
            <div className="relative w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl active-scale transition-all flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <ImageIcon className="w-5 h-5 pointer-events-none" />
              <input 
                key={`gallery-${inputKey}`}
                type="file" 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full" 
              />
            </div>
            {/* Nút CHỤP ẢNH */}
            <div className="relative w-10 h-10 bg-brand-600 text-white rounded-xl active-scale transition-all flex items-center justify-center shadow-lg shadow-brand-500/20 overflow-hidden">
              <Camera className="w-5 h-5 pointer-events-none" />
              <input 
                key={`camera-${inputKey}`}
                type="file" 
                onChange={handleFileUpload} 
                accept="image/*" 
                capture="environment" 
                className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full" 
              />
            </div>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-950/50 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button type="button" onClick={() => adjustDate(-1)} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 active-scale flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 shrink-0"><ChevronLeft className="w-4 h-4" /></button>
          <div className="flex-1 text-center relative h-10 flex items-center justify-center">
            <span className="text-[11px] font-black dark:text-white uppercase tracking-tight flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-brand-500" />
              {formatDateDisplay(date)}
            </span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
          </div>
          <button type="button" onClick={() => adjustDate(1)} className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 active-scale flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 shrink-0"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {type === TransactionType.INCOME ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest leading-none">{t('kasse_total')} (€)</label>
              <input type="text" inputMode="decimal" value={kasseInput} onChange={e => validateAndSetAmount(e.target.value, setKasseInput)} placeholder="0.00" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 dark:focus:border-brand-500 rounded-xl font-black text-2xl text-brand-600 dark:text-brand-400 outline-none transition-all shadow-inner text-center" required />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest leading-none">{t('card_total')}</label>
                <input type="text" inputMode="decimal" value={cardTotalInput} onChange={e => validateAndSetAmount(e.target.value, setCardTotalInput)} placeholder="0" className="w-full p-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-xl font-black text-base outline-none transition-all text-center" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest leading-none">{t('app_total')}</label>
                <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} placeholder="0" className="w-full p-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-xl font-black text-base outline-none transition-all text-center" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5 text-center">
              <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">{t('chi_phi')} (€)</label>
              <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full py-3.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-rose-500 rounded-xl font-black text-2xl text-rose-600 text-center outline-none transition-all shadow-inner" required />
            </div>
            
            <div className="flex p-1 bg-slate-100/80 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setIsPaid(true)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all active-scale ${isPaid ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-100 dark:border-slate-700' : 'text-slate-400'}`}>{t('paid')}</button>
              <button type="button" onClick={() => setIsPaid(false)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all active-scale ${!isPaid ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400'}`}>{t('unpaid')}</button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-xl font-black text-[10px] uppercase outline-none appearance-none transition-all text-slate-700 dark:text-slate-200">
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {!isPaid ? (
                <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder={t('vendor_name')} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-xl font-black text-xs outline-none" required />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: ExpenseSource.SHOP_CASH, label: t('shop_cash'), icon: Store },
                    { id: ExpenseSource.WALLET, label: t('master_wallet'), icon: Wallet },
                    { id: ExpenseSource.CARD, label: t('card_bank'), icon: CreditCard }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 active-scale ${expenseSource === s.id ? `bg-brand-600 border-brand-600 text-white shadow-md` : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500'}`}>
                      <s.icon className="w-4 h-4" />
                      <span className="text-[8px] font-black uppercase tracking-tight leading-none">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3 pt-1">
          <div className="bg-white dark:bg-slate-950/30 p-3.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-inner">
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t('note')} className="w-full bg-transparent text-[11px] font-bold outline-none dark:text-white resize-none h-14 leading-relaxed" />
          </div>

          <button 
            type="submit" 
            disabled={isDuplicateDate || isScanning} 
            className={`w-full h-14 rounded-[1.5rem] font-black uppercase tracking-[0.1em] text-[11px] active-scale transition-all flex items-center justify-center gap-3 shadow-vivid ${isDuplicateDate || isScanning ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed' : 'bg-brand-600 text-white'}`}
          >
            <Save className="w-5 h-5" /> {t('save_transaction')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
