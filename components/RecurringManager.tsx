
import React, { useState } from 'react';
import { RecurringTransaction, ExpenseSource, EXPENSE_SOURCE_LABELS, Transaction, TransactionType, formatCurrency } from '../types';
import { Plus, Trash2, CalendarClock, PlayCircle, Save } from 'lucide-react';

interface RecurringManagerProps {
  recurringExpenses: RecurringTransaction[];
  onUpdate: (items: RecurringTransaction[]) => void;
  categories: string[];
  onGenerateTransactions: (txs: Transaction[]) => void;
  branchId: string; // Added branchId to ensure type safety
}

const RecurringManager: React.FC<RecurringManagerProps> = ({ recurringExpenses, onUpdate, categories, onGenerateTransactions, branchId }) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0] || '');
  const [source, setSource] = useState<ExpenseSource>(ExpenseSource.WALLET);
  const [day, setDay] = useState('1');
  const [note, setNote] = useState('');

  const handleAdd = () => {
    if (!amount || !category || !day) return;
    
    // Fix: Added missing updatedAt property to satisfy RecurringTransaction interface
    const newItem: RecurringTransaction = {
      id: Date.now().toString(),
      branchId: branchId,
      amount: Number(amount),
      category,
      expenseSource: source,
      dayOfMonth: Number(day),
      note,
      updatedAt: new Date().toISOString()
    };

    onUpdate([...recurringExpenses, newItem]);
    setAmount('');
    setNote('');
  };

  const handleDelete = (id: string) => {
    onUpdate(recurringExpenses.filter(i => i.id !== id));
  };

  const handleGenerateForMonth = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const monthStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;

    if (window.confirm(`Bạn có muốn tạo ${recurringExpenses.length} khoản chi phí định kỳ cho tháng ${monthStr} không?`)) {
      // Fix: Added missing updatedAt property to satisfy Transaction interface
      const newTxs: Transaction[] = recurringExpenses.map(r => ({
        id: `rec_${Date.now()}_${r.id}`,
        branchId: r.branchId, // Use the stored branchId
        date: `${monthStr}-${r.dayOfMonth.toString().padStart(2, '0')}`,
        amount: r.amount,
        category: r.category,
        type: TransactionType.EXPENSE,
        expenseSource: r.expenseSource,
        note: `[Định kỳ] ${r.note}`,
        isRecurring: true,
        updatedAt: new Date().toISOString()
      }));
      onGenerateTransactions(newTxs);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
           <div className="flex items-center gap-3">
             <div className="p-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
               <CalendarClock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
             </div>
             <div>
               <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Chi phí định kỳ</h3>
               <p className="text-xs text-slate-500 dark:text-slate-400">Các khoản chi phí lặp lại hàng tháng.</p>
             </div>
           </div>
           <button
             onClick={handleGenerateForMonth}
             className="flex items-center gap-2 bg-rose-600 text-white px-5 py-2.5 rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-100 dark:shadow-none font-bold text-sm"
           >
             <PlayCircle className="w-4 h-4" />
             Tạo nhanh cho tháng này
           </button>
        </div>
        
        {/* Add Form */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-8 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
           <div className="md:col-span-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ngày</label>
             <input type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} className="w-full p-2.5 border-2 border-white dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-900 dark:text-slate-100" />
           </div>
           <div className="md:col-span-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Số tiền (€)</label>
             <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full p-2.5 border-2 border-white dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-900 dark:text-slate-100" />
           </div>
           <div className="md:col-span-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Danh mục</label>
             <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2.5 border-2 border-white dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-900 dark:text-slate-100">
               {categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           </div>
           <div className="md:col-span-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nguồn</label>
             <select value={source} onChange={e => setSource(e.target.value as ExpenseSource)} className="w-full p-2.5 border-2 border-white dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-900 dark:text-slate-100">
                <option value={ExpenseSource.WALLET}>Ví tổng</option>
                <option value={ExpenseSource.SHOP_CASH}>Tiền quán</option>
                <option value={ExpenseSource.CARD}>Thẻ</option>
             </select>
           </div>
           <div className="md:col-span-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ghi chú</label>
             <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="..." className="w-full p-2.5 border-2 border-white dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold text-slate-900 dark:text-slate-100" />
           </div>
           <div className="md:col-span-1 flex items-end">
             <button onClick={handleAdd} className="w-full bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 flex justify-center items-center shadow-lg shadow-indigo-100 dark:shadow-none">
               <Plus className="w-6 h-6" />
             </button>
           </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest border-b dark:border-slate-800">
                <th className="p-4">Ngày</th>
                <th className="p-4">Danh mục</th>
                <th className="p-4">Số tiền</th>
                <th className="p-4">Nguồn</th>
                <th className="p-4">Ghi chú</th>
                <th className="p-4 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {recurringExpenses.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-300 text-xs">Ngày {item.dayOfMonth}</td>
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-100 text-sm">{item.category}</td>
                  <td className="p-4 font-black text-rose-600 dark:text-rose-400">{formatCurrency(item.amount)}</td>
                  <td className="p-4 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase">{EXPENSE_SOURCE_LABELS[item.expenseSource]}</td>
                  <td className="p-4 italic text-slate-400 dark:text-slate-500 text-xs truncate max-w-[150px]">{item.note || '---'}</td>
                  <td className="p-4 text-center">
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-rose-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {recurringExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-300 dark:text-slate-700 italic font-medium">Chưa có mẫu chi phí định kỳ nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecurringManager;