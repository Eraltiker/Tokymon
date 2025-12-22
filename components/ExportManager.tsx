
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, TransactionType, Branch, EXPENSE_SOURCE_LABELS } from '../types';
import { FileSpreadsheet, Calendar, Download, Loader2, AlertCircle } from 'lucide-react';

interface ExportManagerProps {
  transactions: Transaction[];
  branches: Branch[];
}

const ExportManager: React.FC<ExportManagerProps> = ({ transactions, branches }) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);

  const getBranchName = (id: string) => branches.find(b => b.id === id)?.name || 'N/A';

  const handleExport = () => {
    setIsExporting(true);
    
    setTimeout(() => {
      try {
        const filtered = transactions.filter(t => 
          !t.deletedAt && t.date >= startDate && t.date <= endDate
        ).sort((a, b) => a.date.localeCompare(b.date));

        if (filtered.length === 0) {
          alert("Không có dữ liệu trong khoảng thời gian này!");
          setIsExporting(false);
          return;
        }

        // Prepare Income Data
        const incomeData = filtered
          .filter(t => t.type === TransactionType.INCOME)
          .map(t => ({
            'Ngày': t.date,
            'Chi nhánh': getBranchName(t.branchId),
            'Hệ thống (App+Shop)': t.amount,
            'Shop (Kasse)': (t.incomeBreakdown?.cash || 0) + (t.incomeBreakdown?.card || 0),
            'Thẻ': t.incomeBreakdown?.card || 0,
            'Tiền mặt': t.incomeBreakdown?.cash || 0,
            'App (Delivery)': t.incomeBreakdown?.delivery || 0,
            'Tiền mặt thực thu': t.incomeBreakdown?.actualCash || '---',
            'Ghi chú': t.note || ''
          }));

        // Prepare Expense Data
        const expenseData = filtered
          .filter(t => t.type === TransactionType.EXPENSE)
          .map(t => ({
            'Ngày': t.date,
            'Chi nhánh': getBranchName(t.branchId),
            'Danh mục': t.category,
            'Số tiền': t.amount,
            'Nguồn': t.expenseSource ? EXPENSE_SOURCE_LABELS[t.expenseSource] : 'N/A',
            'Trạng thái': t.isPaid === false ? 'Ghi nợ' : 'Đã trả',
            'Chủ nợ': t.debtorName || '',
            'Ghi chú': t.note || ''
          }));

        // Create Workbook
        const wb = XLSX.utils.book_new();

        if (incomeData.length > 0) {
          const wsIncome = XLSX.utils.json_to_sheet(incomeData);
          XLSX.utils.book_append_sheet(wb, wsIncome, "Doanh Thu");
        }

        if (expenseData.length > 0) {
          const wsExpense = XLSX.utils.json_to_sheet(expenseData);
          XLSX.utils.book_append_sheet(wb, wsExpense, "Chi Phí");
        }

        // Export File
        const fileName = `Tokymon_BaoCao_${startDate}_den_${endDate}.xlsx`;
        XLSX.writeFile(wb, fileName);
      } catch (error) {
        console.error("Export error:", error);
        alert("Có lỗi xảy ra khi xuất file!");
      } finally {
        setIsExporting(false);
      }
    }, 500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-black dark:text-white uppercase leading-none mb-1">Xuất báo cáo Excel</h3>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Tải dữ liệu kế toán (.xlsx)</p>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border dark:border-slate-800 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Từ ngày
            </label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-bold outline-none focus:border-emerald-500 dark:text-white transition-all text-sm" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Đến ngày
            </label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="w-full p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-bold outline-none focus:border-emerald-500 dark:text-white transition-all text-sm" 
            />
          </div>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
            Dữ liệu sẽ được xuất ra thành 2 Sheet riêng biệt cho Doanh thu và Chi phí. File này có thể mở bằng Excel, Google Sheets hoặc Numbers.
          </p>
        </div>

        <button 
          onClick={handleExport} 
          disabled={isExporting}
          className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 dark:shadow-none active:scale-95 transition-all disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" /> Tải báo cáo ngay
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ExportManager;
