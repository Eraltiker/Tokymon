
import React, { useState } from 'react';
import { Transaction, TransactionType, HistoryEntry, Language, ExpenseSource, formatCurrency } from '../types';
import { useTranslation } from '../i18n';
import { 
  X, Save, ChevronLeft, ChevronRight, Calendar, 
  Banknote, Plus, Trash2, CreditCard, 
  Store, Wallet, AlertCircle, ChevronDown, CheckCircle2,
  History, Receipt, UserCheck, Truck
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
  const [notes, setNotes] = useState<string[]>(transaction.notes || []);
  const [date, setDate] = useState(transaction.date);
  const [category, setCategory] = useState(transaction.category);

  const [expenseAmount, setExpenseAmount] = useState(transaction.amount.toString());
  const [paidAmountInput, setPaidAmountInput] = useState((transaction.paidAmount || 0).toString());
  const [expenseSource, setExpenseSource] = useState<ExpenseSource>(transaction.expenseSource || ExpenseSource.SHOP_CASH);
  const [isPaid, setIsPaid] = useState<boolean>(transaction.isPaid !== false);
  const [debtorName, setDebtorName] = useState<string>(transaction.debtorName || '');
  
  const [payExtraInput, setPayExtraInput] = useState('');

  // PHÂN LOẠI: Nợ NCC (chưa trả tiền) hay Tiền ứng NV (đã trả tiền)
  const isStaffAdvance = category === 'Nợ / Tiền ứng';
  const isDebtMode = transaction.isPaid === false || isStaffAdvance;

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
    
    const totalAmount = parseLocaleNumber(expenseAmount);
    const extraPay = parseLocaleNumber(payExtraInput);
    const prevPaid = parseLocaleNumber(paidAmountInput);
    
    let updatedNotes = [...notes].filter(n => n.trim() !== '');

    // Logic ghi chú đối soát
    if (isDebtMode && extraPay > 0) {
      const newTotalPaid = prevPaid + extraPay;
      const remaining = totalAmount - newTotalPaid;
      
      let label = "";
      if (isStaffAdvance) {
        label = `[HOÀN ỨNG ${dateDisplay}] Thu hồi: ${formatCurrency(extraPay, lang)}. Đã trả lại: ${formatCurrency(newTotalPaid, lang)}/${formatCurrency(totalAmount, lang)}.`;
      } else {
        label = `[TRẢ NỢ ${dateDisplay}] Thanh toán thêm: ${formatCurrency(extraPay, lang)}. Tổng đã trả: ${formatCurrency(newTotalPaid, lang)}/${formatCurrency(totalAmount, lang)}.`;
      }
      updatedNotes = [label, ...updatedNotes];
    }
    
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
      category,
      lastEditorName: currentUsername,
      history: [...(transaction.history || []), historyEntry],
      updatedAt: nowIso,
    };

    if (transaction.type === TransactionType.EXPENSE) {
      if (isDebtMode) {
        const newPaidAmount = isPaid ? totalAmount : (prevPaid + extraPay);
        updated.amount = totalAmount;
        updated.paidAmount = Math.min(newPaidAmount, totalAmount);
        updated.isPaid = isPaid || (updated.paidAmount >= totalAmount);
      } else {
        updated.amount = totalAmount;
        updated.paidAmount = totalAmount;
        updated.isPaid = true;
      }
      updated.expenseSource = expenseSource;
      updated.debtorName = debtorName;
    } else {
      // Cho Income, nếu cần sửa
      const breakdown = transaction.incomeBreakdown;
      if (breakdown) {
         // Re-calculate total based on components if they exist, or just keep as is
      }
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
            <div className={`p-2 rounded-xl shadow-sm ${isStaffAdvance ? 'bg-indigo-50 text-indigo-600' : (isDebtMode ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600')}`}>
               {isStaffAdvance ? <UserCheck className="w-5 h-5" /> : (isDebtMode ? <Truck className="w-5 h-5" /> : <Receipt className="w-5 h-5" />)}
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-xs">
                {isStaffAdvance ? 'Đối soát hoàn ứng' : (isDebtMode ? 'Thanh toán công nợ' : 'Chỉnh sửa chi phí')}
              </h3>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                {isStaffAdvance ? 'Nhân viên mượn/ứng tiền' : (isDebtMode ? 'Nợ nhà cung cấp/Mua hàng' : 'Hóa đơn đã trả xong')}
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
               <input type="date" value={date} onChange={e => setDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <button type="button" onClick={() => {
              const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().split('T')[0]);
            }} className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-400 active-scale"><ChevronRight className="w-4 h-4" /></button>
          </div>

          {/* Giao diện số tiền */}
          <div className="space-y-4">
            {isDebtMode ? (
              <div className="animate-ios space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{isStaffAdvance ? 'SỐ TIỀN ĐÃ ỨNG' : 'TỔNG NỢ GỐC'} (€)</label>
                    <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className={`w-full py-4 bg-slate-50 dark:bg-slate-800 border-2 rounded-xl font-black text-lg text-center outline-none ${isStaffAdvance ? 'text-indigo-600 border-indigo-100' : 'text-rose-600 border-rose-100'}`} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{isStaffAdvance ? 'ĐÃ TRẢ LẠI' : 'ĐÃ THANH TOÁN'} (€)</label>
                    <div className="w-full py-4 bg-slate-100 dark:bg-slate-900 border dark:border-slate-800 rounded-xl font-black text-lg text-emerald-600 text-center opacity-60 shadow-inner">
                      {paidAmountInput}
                    </div>
                  </div>
                </div>

                {remaining > 0 && (
                  <div className={`p-5 rounded-[2.2rem] border-2 shadow-sm ${isStaffAdvance ? 'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20' : 'bg-rose-50 border-rose-100 dark:bg-rose-950/20'}`}>
                    <div className="flex justify-between items-center mb-3 px-1">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isStaffAdvance ? 'text-indigo-600' : 'text-rose-600'}`}>{isStaffAdvance ? 'NHÂN VIÊN TRẢ LẠI (€)' : 'THANH TOÁN THÊM (€)'}</span>
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
                    <p className="text-[8px] font-bold text-center mt-3 text-slate-400 uppercase tracking-widest italic leading-relaxed">
                       {isStaffAdvance ? 'Tiền thu hồi sẽ tự động CỘNG VÀO ví tổng' : 'Tiền trả thêm sẽ tự động TRỪ ĐI từ ví tổng'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-center py-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('amount')} (€)</label>
                <input type="text" inputMode="decimal" value={expenseAmount} onChange={e => validateAndSetAmount(e.target.value, setExpenseAmount)} className="w-full py-6 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-[2.5rem] font-black text-5xl text-rose-600 text-center outline-none focus:border-brand-500 transition-all shadow-inner" />
              </div>
            )}
          </div>

          {/* Hạng mục & Nguồn */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('category')}</label>
              <div className="relative">
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-[11px] uppercase outline-none appearance-none">
                  {expenseCategories.map(c => <option key={c} value={c}>{translateCategory(c)}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('source')}</label>
              <div className="relative">
                <select value={expenseSource} onChange={e => setExpenseSource(e.target.value as any)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-[11px] uppercase outline-none appearance-none">
                  <option value={ExpenseSource.SHOP_CASH}>{t('src_shop_cash')}</option>
                  <option value={ExpenseSource.WALLET}>{t('src_wallet')}</option>
                  <option value={ExpenseSource.CARD}>{t('src_card')}</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Đối tác */}
          <div className="space-y-1.5">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{isStaffAdvance ? 'TÊN NHÂN VIÊN' : 'TÊN CHỦ NỢ / NCC'}</label>
            <input type="text" value={debtorName} onChange={e => setDebtorName(e.target.value)} className="w-full p-4.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-brand-500" placeholder="..." />
          </div>

          {/* Nhật ký & Ghi chú */}
          <div className="space-y-4">
             <div className="flex justify-between items-center px-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><History className="w-3.5 h-3.5" /> Nhật ký & Ghi chú</label>
                <button type="button" onClick={() => setNotes([...notes, ''])} className="text-[8px] font-black text-brand-600 uppercase flex items-center gap-1 bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 rounded-xl border border-brand-100 dark:border-brand-800"><Plus className="w-3 h-3" /> Thêm ghi chú</button>
             </div>
             <div className="space-y-2">
               {notes.map((n, i) => (
                 <div key={i} className="relative group animate-ios">
                    <textarea 
                      value={n} 
                      readOnly={n.includes('[HOÀN ỨNG') || n.includes('[TRẢ NỢ')}
                      onChange={e => { const updated = [...notes]; updated[i] = e.target.value; setNotes(updated); }} 
                      className={`w-full p-4 rounded-2xl border-2 text-[12px] font-bold dark:text-white pr-10 resize-none ${n.includes('[') ? 'bg-indigo-50/30 border-indigo-100 text-indigo-600 italic' : 'bg-slate-50/50 dark:bg-slate-950/30 border-slate-100 dark:border-slate-800 focus:border-brand-500'}`}
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
