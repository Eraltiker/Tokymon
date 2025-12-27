
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
   * IRON VISION - Quy trình xử lý ảnh cường độ cao, tiết kiệm RAM tuyệt đối
   */
  const processImageForMobile = async (file: File): Promise<{base64: string, type: string}> => {
    // 1. CHỐNG TREO RAM: Nghỉ 600ms để camera đóng hẳn và giải phóng RAM hệ thống
    await new Promise(r => setTimeout(r, 600));

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const img = new Image();
      
      reader.onload = (e) => { img.src = e.target?.result as string; };
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // 854px: Chuẩn FWVGA, dung lượng cực thấp nhưng AI đọc chữ vẫn rất rõ
        const MAX_SIZE = 854; 
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
        const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
        if (!ctx) return reject(new Error("Canvas Failure"));

        // 2. VẼ ẢNH GỐC
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, 0, 0, width, height);

        // 3. IRON FILTER: Chuyển xám và tăng độ tương phản để AI đọc số dễ hơn
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const contrast = 1.2; // Tăng 20% tương phản
        const intercept = 128 * (1 - contrast);

        for (let i = 0; i < data.length; i += 4) {
          // Grayscale formula: 0.299R + 0.587G + 0.114B
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const finalColor = gray * contrast + intercept;
          data[i] = finalColor;
          data[i + 1] = finalColor;
          data[i + 2] = finalColor;
        }
        ctx.putImageData(imageData, 0, 0);

        // 4. XUẤT ẢNH: Nén 0.65 để dung lượng nhỏ nhất (~60-90KB)
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Blob Null"));
          const finalReader = new FileReader();
          finalReader.onloadend = () => {
            const base64Data = (finalReader.result as string).split(',')[1];
            resolve({ base64: base64Data, type: 'image/jpeg' });
          };
          finalReader.readAsDataURL(blob);
        }, 'image/jpeg', 0.65);
      };

      img.onerror = () => reject(new Error("Image Load Error"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsScanning(true);

    try {
      if (!navigator.onLine) throw new Error("OFFLINE");

      // Chạy pipeline Iron Vision
      const processed = await processImageForMobile(file);
      const result = await scanReceipt(processed.base64, processed.type);
      
      if (result) {
        if (result.amount && result.amount > 0) setExpenseAmount(result.amount.toString());
        if (result.category && expenseCategories.includes(result.category)) {
          setExpenseCategory(result.category);
        }
        if (result.note && result.note !== 'Auto-extracted') setNote(result.note);
        if (result.date) setDate(result.date);
      }
    } catch (error: any) { 
      console.error("Tokymon Iron Vision Error:", error);
      const msg = error.message === "OFFLINE" 
        ? (lang === 'vi' ? "Yêu cầu Internet để quét AI." : "Internetverbindung erforderlich.")
        : (lang === 'vi' 
            ? "Thiết bị gặp lỗi khi xử lý ảnh hoặc AI không nhận dạng được. Hãy chụp GẦN và CHẬM hơn." 
            : "Gerätefehler oder KI erkennt Beleg nicht. Bitte näher und langsamer fotografieren.");
      alert(msg);
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
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[1.8rem] shadow-ios border border-white dark:border-slate-800/50 flex flex-col relative overflow-hidden transition-all max-w-full animate-ios">
      {isScanning && (
        <div className="absolute inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-300">
          <div className="relative mb-8">
            <div className="w-14 h-14 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
               <Zap className="w-5 h-5 text-brand-400 fill-brand-400 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-brand-400">Iron Vision Scan</h4>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('ai_scanning_text')}</p>
          </div>
        </div>
      )}

      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
        <div className="min-w-0 pr-2 flex-1">
          <span className="text-[8px] font-black uppercase text-brand-600 dark:text-brand-400 tracking-[0.2em] block mb-0.5 opacity-80">{branchName}</span>
          <h2 className="text-base font-extrabold uppercase tracking-tight dark:text-white leading-none truncate">
            {type === TransactionType.INCOME ? t('chot_so') : t('chi_phi')}
          </h2>
        </div>
        
        {type === TransactionType.EXPENSE && (
          <div className="shrink-0">
            <label className="relative flex items-center gap-2 px-3 py-2.5 bg-brand-600 hover:bg-brand-500 dark:bg-brand-500 rounded-xl shadow-vivid text-white active-scale cursor-pointer transition-all">
               <Camera className="w-4 h-4" />
               <span className="text-[9px] font-black uppercase tracking-widest">Iron Scan</span>
               <input 
                  key={inputKey} 
                  type="file" 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  capture="environment"
                  className="absolute inset-0 opacity-0 cursor-pointer" 
               />
            </label>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-950/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button type="button" onClick={() => adjustDate(-1)} className="w-9 h-9 bg-white dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 active-scale flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 shrink-0"><ChevronLeft className="w-4 h-4" /></button>
          <div className="flex-1 text-center relative h-9 flex items-center justify-center">
            <span className="text-[10px] font-black dark:text-white uppercase tracking-tight flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-brand-500" />
              {formatDateDisplay(date)}
            </span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
          </div>
          <button type="button" onClick={() => adjustDate(1)} className="w-9 h-9 bg-white dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 active-scale flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700 shrink-0"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {type === TransactionType.INCOME ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest">{t('kasse_total')} (€)</label>
              <input type="text" inputMode="decimal" value={kasseInput} onChange={e => validateAndSetAmount(e.target.value, setKasseInput)} placeholder="0.00" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-xl font-black text-xl text-brand-600 dark:text-brand-400 outline-none transition-all shadow-inner text-center" required />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest">{t('card_total')}</label>
                <input type="text" inputMode="decimal" value={cardTotalInput} onChange={e => validateAndSetAmount(e.target.value, setCardTotalInput)} placeholder="0" className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-xl font-black text-xs outline-none transition-all text-center" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase px-1 tracking-widest">{t('app_total')}</label>
                <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} placeholder="0" className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-xl font-black text-xs outline-none transition-all text-center" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1 text-center">
              <label className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('chi_phi')} (€)</label>
              <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-rose-500 rounded-xl font-black text-xl text-rose-600 text-center outline-none" required />
            </div>
            
            <div className="flex p-1 bg-slate-100/80 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setIsPaid(true)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${isPaid ? 'bg-white dark:bg-slate-800 text-brand-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}>{t('paid')}</button>
              <button type="button" onClick={() => setIsPaid(false)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!isPaid ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400'}`}>{t('unpaid')}</button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 focus:border-brand-500 rounded-xl font-black text-[9px] uppercase outline-none appearance-none transition-all text-slate-700 dark:text-slate-200">
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {!isPaid ? (
                <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} placeholder={t('vendor_name')} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl font-black text-[10px] outline-none" required />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: ExpenseSource.SHOP_CASH, label: t('shop_cash'), icon: Store },
                    { id: ExpenseSource.WALLET, label: t('master_wallet'), icon: Wallet },
                    { id: ExpenseSource.CARD, label: t('card_bank'), icon: CreditCard }
                  ].map((s) => (
                    <button key={s.id} type="button" onClick={() => setExpenseSource(s.id)} className={`py-2 rounded-lg border-2 transition-all flex flex-col items-center gap-1 active-scale ${expenseSource === s.id ? `bg-brand-600 border-brand-600 text-white` : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500'}`}>
                      <s.icon className="w-3.5 h-3.5" />
                      <span className="text-[7px] font-black uppercase tracking-tighter leading-none text-center">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3 pt-1">
          <div className="bg-white dark:bg-slate-950/30 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t('note')} className="w-full bg-transparent text-[10px] font-bold outline-none dark:text-white resize-none h-14 leading-relaxed" />
          </div>

          <button 
            type="submit" 
            disabled={isScanning} 
            className={`w-full h-12 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] active-scale transition-all flex items-center justify-center gap-2 shadow-vivid ${isScanning ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-brand-600 text-white'}`}
          >
            <Save className="w-4 h-4" /> {t('save_transaction')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
