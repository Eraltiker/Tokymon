
import React, { useState, useMemo, useRef } from 'react';
import { Transaction, TransactionType, formatCurrency, ExpenseSource, Language } from '../types';
import { scanReceipt } from '../services/geminiService';
import { useTranslation } from '../i18n';
import { 
  Save, Camera, Loader2,
  ChevronLeft, ChevronRight, Store, 
  ChevronDown, CreditCard, Calendar,
  Wallet, Receipt, Sparkles, AlertCircle, X,
  Image as ImageIcon, Zap, FileSearch
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

  const validateAndSetAmount = (val: string, setter: (v: string) => void) => {
    const sanitized = val.replace(',', '.');
    if (/^[0-9]*\.?[0-9]*$/.test(sanitized)) setter(sanitized);
  };

  const parseNumber = (val: string): number => {
    if (!val) return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
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
   * Pipeline xử lý ảnh tối ưu cho iOS và Gemini Flash
   */
  const processImageForMobile = async (file: File): Promise<{base64: string, type: string}> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      
      img.onload = async () => {
        try {
          if ('decode' in img) await img.decode();

          const canvas = document.createElement('canvas');
          // Tối ưu hóa MAX_SIZE: 1200 là lý tưởng cho AI Flash trích xuất dữ liệu nhanh
          const MAX_SIZE = 1200; 
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: false });
          
          if (!ctx) throw new Error("Canvas context failed");

          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Nén mạnh hơn để truyền tải nhanh trên mobile (0.7)
          const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
          URL.revokeObjectURL(url);
          resolve({ base64, type: 'image/jpeg' });
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image load error"));
      };
      
      img.src = url;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsScanning(true);

    try {
      const processed = await processImageForMobile(file);
      const result = await scanReceipt(processed.base64, processed.type);
      
      if (result) {
        if (result.amount) setExpenseAmount(result.amount.toString());
        if (result.category && expenseCategories.includes(result.category)) {
          setExpenseCategory(result.category);
        }
        if (result.note) setNote(result.note);
        if (result.date) setDate(result.date);
      }
    } catch (error) { 
      console.error("Smart Scan Failure:", error);
      alert(lang === 'vi' ? "Lỗi phân tích hóa đơn. Vui lòng thử lại với ảnh nhỏ hơn hoặc nhập tay." : "Fehler beim Analysieren. Bitte versuchen Sie es mit einem kleineren Bild oder manuell.");
    } finally {
      setIsScanning(false);
      setInputKey(Date.now());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    const commonData = { id: Date.now().toString(), branchId, date, note, updatedAt: now, history: [] };
    
    if (type === TransactionType.EXPENSE) {
      const amount = parseNumber(expenseAmount);
      if (amount <= 0) return;
      onAddTransaction({
        ...commonData, type: TransactionType.EXPENSE, amount, category: expenseCategory,
        expenseSource: isPaid ? expenseSource : undefined, isPaid, debtorName: isPaid ? undefined : debtorName,
      });
      setExpenseAmount(''); setNote('');
    } else {
      const kasse = parseNumber(kasseInput);
      const app = parseNumber(appInput);
      const cardTotal = parseNumber(cardTotalInput);
      const revenue = kasse + app;
      if (revenue <= 0) return;
      onAddTransaction({
        ...commonData, type: TransactionType.INCOME, amount: revenue, category: t('income'),
        incomeBreakdown: { cash: Math.max(0, revenue - cardTotal), card: cardTotal, delivery: app },
      });
      setKasseInput(''); setAppInput(''); setCardTotalInput(''); setNote('');
    }
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2.2rem] shadow-ios border border-white dark:border-slate-800/50 flex flex-col relative overflow-hidden transition-all max-w-full lg:max-w-md mx-auto animate-ios">
      {isScanning && (
        <div className="absolute inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            <Sparkles className="w-8 h-8 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="text-center space-y-3">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-brand-400">Tokymon Flash Scan</p>
            <div className="space-y-1">
               <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{t('ai_scanning_text')}</p>
               <p className="text-[8px] font-medium text-slate-500 uppercase tracking-[0.2em]">High-speed data extraction active...</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
        <div className="min-w-0 pr-2 flex-1">
          <span className="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 tracking-widest block mb-1 opacity-80">{branchName}</span>
          <h2 className="text-xl font-extrabold uppercase tracking-tight dark:text-white leading-none truncate">
            {type === TransactionType.INCOME ? t('chot_so') : t('chi_phi')}
          </h2>
        </div>
        
        {type === TransactionType.EXPENSE && (
          <div className="shrink-0">
            <label className="relative flex items-center gap-2.5 px-5 py-3.5 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 rounded-2xl shadow-vivid text-white active-scale cursor-pointer transition-all">
               <div className="relative">
                 <Zap className="w-5 h-5 fill-white" />
                 <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
               </div>
               <span className="text-[11px] font-black uppercase tracking-widest">Flash Scan</span>
               <input 
                  key={inputKey} 
                  type="file" 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
               />
            </label>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-950/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button type="button" onClick={() => adjustDate(-1)} className="w-11 h-11 bg-white dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 active-scale flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 shrink-0"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex-1 text-center relative h-11 flex items-center justify-center">
            <span className="text-[12px] font-black dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-500" />
              {formatDateDisplay(date)}
            </span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
          </div>
          <button type="button" onClick={() => adjustDate(1)} className="w-11 h-11 bg-white dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 active-scale flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 shrink-0"><ChevronRight className="w-5 h-5" /></button>
        </div>

        {type === TransactionType.INCOME ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest leading-none">{t('kasse_total')} (€)</label>
              <input type="text" inputMode="decimal" value={kasseInput} onChange={e => validateAndSetAmount(e.target.value, setKasseInput)} placeholder="0.00" className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-2xl font-black text-3xl text-brand-600 dark:text-brand-400 outline-none transition-all shadow-inner text-center" required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest leading-none">{t('card_total')}</label>
                <input type="text" inputMode="decimal" value={cardTotalInput} onChange={e => validateAndSetAmount(e.target.value, setCardTotalInput)} placeholder="0" className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-2xl font-black text-lg outline-none transition-all text-center" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest leading-none">{t('app_total')}</label>
                <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} placeholder="0" className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-2xl font-black text-lg outline-none transition-all text-center" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2 text-center">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">{t('chi_phi')} (€)</label>
              <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-rose-500 rounded-2xl font-black text-3xl text-rose-600 text-center outline-none transition-all shadow-inner" required />
            </div>
            
            <div className="flex p-1.5 bg-slate-100/80 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setIsPaid(true)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all active-scale ${isPaid ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm border border-slate-100 dark:border-slate-700' : 'text-slate-400'}`}>{t('paid')}</button>
              <button type="button" onClick={() => setIsPaid(false)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all active-scale ${!isPaid ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400'}`}>{t('unpaid')}</button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-2xl font-black text-[11px] uppercase outline-none appearance-none transition-all text-slate-700 dark:text-slate-200">
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>

              {!isPaid ? (
                <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder={t('vendor_name')} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-2xl font-black text-sm outline-none" required />
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: ExpenseSource.SHOP_CASH, label: t('shop_cash'), icon: Store },
                    { id: ExpenseSource.WALLET, label: t('master_wallet'), icon: Wallet },
                    { id: ExpenseSource.CARD, label: t('card_bank'), icon: CreditCard }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 active-scale ${expenseSource === s.id ? `bg-brand-600 border-brand-600 text-white shadow-md` : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500'}`}>
                      <s.icon className="w-5 h-5" />
                      <span className="text-[9px] font-black uppercase tracking-tight leading-none text-center">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4 pt-2">
          <div className="bg-white dark:bg-slate-950/30 p-4 rounded-[1.8rem] border border-slate-200 dark:border-slate-800 shadow-inner">
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t('note')} className="w-full bg-transparent text-[12px] font-bold outline-none dark:text-white resize-none h-20 leading-relaxed" />
          </div>

          <button 
            type="submit" 
            disabled={isScanning} 
            className={`w-full h-16 rounded-[1.8rem] font-black uppercase tracking-[0.2em] text-[12px] active-scale transition-all flex items-center justify-center gap-4 shadow-vivid ${isScanning ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-brand-600 text-white'}`}
          >
            <Save className="w-6 h-6" /> {t('save_transaction')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
