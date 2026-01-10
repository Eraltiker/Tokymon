
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, HistoryEntry, Language, ExpenseSource, formatCurrency } from '../types';
import { useTranslation } from '../i18n';
import { 
  X, Save, ChevronLeft, ChevronRight, Calendar, 
  Banknote, Plus, Trash2, CreditCard, 
  Store, Wallet, AlertCircle, ChevronDown, CheckCircle2,
  History, Receipt, UserCheck, Truck, Calculator, Smartphone
} from 'lucide-react';

interface EditTransactionModalProps {
  transaction: Transaction;
  expenseCategories: string[];
  onClose: () => void;
  onSave: (updated: Transaction) => void;
  lang?: Language;
  currentUsername?: string;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ 
  transaction, 
  expenseCategories, 
  onClose, 
  onSave, 
  lang = 'vi' as Language,
  currentUsername = 'Unknown'
}) => {
  const { t, translateCategory } = useTranslation(lang);
  const isIncome = transaction.type === TransactionType.INCOME;
  
  // States chung
  const [date, setDate] = useState(transaction.date);
  const [notes, setNotes] = useState<string[]>(transaction.notes || []);

  // States cho Expense (Chi phí)
  const [expenseAmount, setExpenseAmount] = useState(transaction.amount.toString());
  const [category, setCategory] = useState(transaction.category);
  const [paidAmountInput, setPaidAmountInput] = useState((transaction.paidAmount || 0).toString());
  const [expenseSource, setExpenseSource] = useState<ExpenseSource>(transaction.expenseSource || ExpenseSource.SHOP_CASH);
  const [isPaid, setIsPaid] = useState<boolean>(transaction.isPaid !== false);
  const [debtorName, setDebtorName] = useState<string>(transaction.debtorName || '');
  const [payExtraInput, setPayExtraInput] = useState('');

  // States cho Income (Doanh thu)
  // Logic: kasseTotal (Z-Bon) = totalAmount - delivery
  const [kasseInput, setKasseInput] = useState(() => {
    if (!isIncome) return '';
    const delivery = transaction.incomeBreakdown?.delivery || 0;
    return (transaction.amount - delivery).toString();
  });
  const [cardInput, setCardInput] = useState(transaction.incomeBreakdown?.card?.toString() || '0');
  const [appInput, setAppInput] = useState(transaction.incomeBreakdown?.delivery?.toString() || '0');

  const isStaffAdvance = category === 'Nợ / Tiền ứng';
  const isDebtMode = !isIncome && (transaction.isPaid === false || isStaffAdvance);

  const validateAndSetAmount = (val: string, setter: (v: string) => void) => {
    const sanitized = val.replace(',', '.');
    if (/^[0-9]*\.?[0-9]*$/.test(sanitized)) setter(sanitized);
  };

  const parseLocaleNumber = (val: string): number => {
    if (!val) return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const handleSave = () => {
    const now = new Date();
    const nowIso = now.toISOString();
    const dateDisplay = now.toLocaleDateString('vi-VN');
    
    let updatedNotes = [...notes].filter(n => n.trim() !== '');
    
    const historyEntry: HistoryEntry = {
      timestamp: nowIso,
      amount: transaction.amount,
      category: transaction.category,
      notes: transaction.notes,
      editorName: currentUsername,
      incomeBreakdown: transaction.incomeBreakdown,
      expenseSource: transaction.expenseSource,
      isPaid: transaction.isPaid,
      paidAmount: transaction.paidAmount
    };
    
    const updated: Transaction = {
      ...transaction, 
      notes: updatedNotes, 
      date, 
      lastEditorName: currentUsername,
      history: [...(transaction.history || []), historyEntry],
      updatedAt: nowIso,
    };

    if (isIncome) {
      const kasseTotal = parseLocaleNumber(kasseInput);
      const appTotal = parseLocaleNumber(appInput);
      const cardTotal = parseLocaleNumber(cardInput);
      
      updated.amount = kasseTotal + appTotal;
      updated.category = 'Income';
      updated.incomeBreakdown = {
        cash: (kasseTotal + appTotal) - cardTotal,
        card: cardTotal,
        delivery: appTotal
      };
    } else {
      const totalAmount = parseLocaleNumber(expenseAmount);
      const extraPay = parseLocaleNumber(payExtraInput);
      const prevPaid = parseLocaleNumber(paidAmountInput);

      if (isDebtMode && extraPay > 0) {
        const newTotalPaid = prevPaid + extraPay;
        let label = isStaffAdvance 
          ? `[HOÀN ỨNG ${dateDisplay}] Thu hồi: ${formatCurrency(extraPay, lang)}. Tổng: ${formatCurrency(newTotalPaid, lang)}/${formatCurrency(totalAmount, lang)}.`
          : `[TRẢ NỢ ${dateDisplay}] Thanh toán thêm: ${formatCurrency(extraPay, lang)}. Tổng: ${formatCurrency(newTotalPaid, lang)}/${formatCurrency(totalAmount, lang)}.`;
        updated.notes = [label, ...updatedNotes];
        
        updated.paidAmount = Math.min(newTotalPaid, totalAmount);
        updated.isPaid = updated.paidAmount >= totalAmount;
      } else {
        updated.paidAmount = isPaid ? totalAmount : prevPaid;
        updated.isPaid = isPaid;
      }

      updated.amount = totalAmount;
      updated.category = category;
      updated.expenseSource = expenseSource;
      updated.debtorName = debtorName;
    }

    onSave(updated);
  };

  const remaining = Math.max(0, parseLocaleNumber(expenseAmount) - parseLocaleNumber(paidAmountInput));

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl w-full max-w-lg rounded-[2.5rem] shadow-premium relative z-[5001] overflow-hidden flex flex-col max-h-[90vh] animate-ios">
        <div className="px-6 py-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl shadow-sm ${isIncome ? 'bg-emerald-500 text-white' : (isStaffAdvance ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600')}`}>
               {isIncome ? <Receipt className="w-5 h-5" /> : (isStaffAdvance ? <UserCheck className="w-5 h-5" /> : <Truck className="w-5 h-5" />)}
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-xs">
                {isIncome ? 'Sửa Báo Cáo Doanh Thu' : (isStaffAdvance ? 'Đối soát hoàn ứng' : 'Thanh toán công nợ')}
              </h3>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                {isIncome ? 'Điều chỉnh Z-Bon, Thẻ & App' : (isStaffAdvance ? 'Nhân viên mượn/ứng tiền' : 'Nợ nhà cung cấp')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto no-scrollbar space-y-6 pb-10">
          {/* Lựa chọn ngày */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/50 p-1 rounded-2xl border dark:border-slate-800 shadow-sm">
            <button type="button" onClick={() => {
              const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split('T')[0]);
            }} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-400 active-scale"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex-1 text-center relative flex flex-col items-center">
               <span className="text-[10px] font-black dark:text-white uppercase flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-brand-500" /> {date.split('-').reverse().join('/')}</span>
               <input type="date" value={date} onChange={e => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
            </div>
            <button type="button" onClick={() => {
              const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]);
            }} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-400 active-scale"><ChevronRight className="w-4 h-4" /></button>
          </div>

          {isIncome ? (
            <div className="space-y-6 animate-ios">
               <div className="relative group">
                  <label className="absolute -top-2 left-6 bg-white dark:bg-slate-900 px-2 text-[8px] font-black text-slate-400 uppercase tracking-widest z-10">{t('kasse_total')}</label>
                  <input 
                    type="text" 
                    inputMode="decimal" 
                    value={kasseInput} 
                    onChange={e => validateAndSetAmount(e.target.value, setKasseInput)} 
                    className="w-full py-5 px-6 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-3xl text-emerald-600 text-center outline-none focus:border-emerald-500 transition-all shadow-inner" 
                  />
                  <Calculator className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-200" />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="absolute -top-2 left-4 bg-white dark:bg-slate-900 px-2 text-[8px] font-black text-rose-500 uppercase tracking-widest z-10">{t('card_total')}</label>
                    <input type="text" inputMode="decimal" value={cardInput} onChange={e => validateAndSetAmount(e.target.value, setCardInput)} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-lg text-center outline-none focus:border-rose-400" />
                    <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200" />
                  </div>
                  <div className="relative">
                    <label className="absolute -top-2 left-4 bg-white dark:bg-slate-900 px-2 text-[8px] font-black text-indigo-500 uppercase tracking-widest z-10">{t('app_total')}</label>
                    <input type="text" inputMode="decimal" value={appInput} onChange={e => validateAndSetAmount(e.target.value, setAppInput)} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-lg text-center outline-none focus:border-indigo-400" />
                    <Smartphone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-200" />
                  </div>
               </div>

               <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center">
                  <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Tổng doanh thu sau điều chỉnh</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(parseLocaleNumber(kasseInput) + parseLocaleNumber(appInput), lang)}
                  </p>
               </div>
            </div>
          ) : (
            <div className="space-y-6">
               <div className="text-center space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('amount')} (€)</label>
                <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full py-6 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-[2.5rem] font-black text-5xl text-rose-600 text-center outline-none focus:border-brand-500 transition-all shadow-inner" />
              </div>

              {isDebtMode && (
                <div className="animate-ios space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{isStaffAdvance ? 'SỐ TIỀN ĐÃ ỨNG' : 'TỔNG NỢ GỐC'} (€)</label>
                      <div className="w-full py-4 bg-slate-100 dark:bg-slate-900 rounded-xl font-black text-lg text-center opacity-60">{expenseAmount}</div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{isStaffAdvance ? 'ĐÃ TRẢ LẠI' : 'ĐÃ THANH TOÁN'} (€)</label>
                      <div className="w-full py-4 bg-slate-100 dark:bg-slate-900 rounded-xl font-black text-lg text-emerald-600 text-center opacity-60">{paidAmountInput}</div>
                    </div>
                  </div>

                  {remaining > 0 && (
                    <div className={`p-5 rounded-[2.2rem] border-2 shadow-sm ${isStaffAdvance ? 'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20' : 'bg-rose-50 border-rose-100 dark:bg-rose-950/20'}`}>
                      <div className="flex justify-between items-center mb-3 px-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${isStaffAdvance ? 'text-indigo-600' : 'text-rose-600'}`}>{isStaffAdvance ? 'THU HỒI TIỀN (€)' : 'THANH TOÁN THÊM (€)'}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CÒN DƯ: {formatCurrency(remaining, lang)}</span>
                      </div>
                      <input 
                          type="text" 
                          inputMode="decimal" 
                          value={payExtraInput} 
                          onChange={e => validateAndSetAmount(e.target.value, setPayExtraInput)} 
                          placeholder="0.00" 
                          className={`w-full py-5 bg-white dark:bg-slate-950 border-2 rounded-2xl font-black text-center text-3xl outline-none focus:ring-8 transition-all ${isStaffAdvance ? 'text-indigo-600 border-indigo-200 focus:ring-indigo-500/10' : 'text-rose-600 border-rose-200 focus:ring-rose-500/10'}`} 
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('category')}</label>
                  <div className="relative">
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-[11px] uppercase outline-none appearance-none pr-10">
                      {expenseCategories.map(c => <option key={c} value={c}>{translateCategory(c)}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('source')}</label>
                  <div className="relative">
                    <select value={expenseSource} onChange={e => setExpenseSource(e.target.value as any)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-[11px] uppercase outline-none appearance-none pr-10">
                      <option value={ExpenseSource.SHOP_CASH}>{t('src_shop_cash')}</option>
                      <option value={ExpenseSource.WALLET}>{t('src_wallet')}</option>
                      <option value={ExpenseSource.CARD}>{t('src_card')}</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{isStaffAdvance ? 'TÊN NHÂN VIÊN' : 'TÊN CHỦ NỢ / NCC'}</label>
                <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} className="w-full p-4.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-brand-500" placeholder="..." />
              </div>
            </div>
          )}

          {/* Nhật ký & Ghi chú */}
          <div className="space-y-4">
             <div className="flex justify-between items-center px-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><History className="w-3.5 h-3.5" /> Nhật ký & Ghi chú</label>
                <button type="button" onClick={() => setNotes(['', ...notes])} className="text-[8px] font-black text-brand-600 uppercase flex items-center gap-1 bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 rounded-xl border border-brand-100 dark:border-brand-800"><Plus className="w-3 h-3" /> Thêm mới</button>
             </div>
             <div className="space-y-2">
               {notes.map((n, i) => (
                 <div key={i} className="relative group animate-ios">
                    <textarea 
                      value={n} 
                      readOnly={n.includes('[HOÀN ỨNG') || n.includes('[TRẢ NỢ')}
                      onChange={e => { const updated = [...notes]; updated[i] = e.target.value; setNotes(updated); }} 
                      className={`w-full p-4 rounded-2xl border-2 text-[12px] font-bold dark:text-white pr-10 resize-none ${n.includes('[') ? 'bg-indigo-50/10 border-indigo-100 text-indigo-600 italic' : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-100 dark:border-slate-800 focus:border-brand-500'}`}
                      rows={n.length > 50 ? 3 : 2}
                    />
                    {!n.includes('[') && (
                      <button onClick={() => setNotes(notes.filter((_, idx) => idx !== i))} className="absolute right-3 top-3 p-1.5 text-slate-300 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                    )}
                 </div>
               ))}
             </div>
          </div>
          
          <div className="pt-4 relative z-20">
            <button onClick={handleSave} className="w-full h-18 bg-brand-600 text-white rounded-[2rem] font-black uppercase text-sm tracking-widest shadow-vivid active-scale transition-all flex items-center justify-center gap-3">
              <Save className="w-6 h-6" /> CẬP NHẬT DỮ LIỆU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTransactionModal;
