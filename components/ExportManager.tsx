
import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, TransactionType, Branch, EXPENSE_SOURCE_LABELS, Language } from '../types';
import { useTranslation } from '../i18n';
import { FileSpreadsheet, Calendar, Download, Loader2, Info, ArrowRight } from 'lucide-react';

interface ExportManagerProps {
  transactions: Transaction[];
  branches: Branch[];
  lang: Language;
}

const ExportManager: React.FC<ExportManagerProps> = ({ transactions, branches, lang }) => {
  const { t } = useTranslation(lang);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const filtered = transactions.filter(t => 
          !t.deletedAt && t.date >= startDate && t.date <= endDate
        ).sort((a, b) => a.date.localeCompare(b.date));

        if (filtered.length === 0) {
          alert(t('export_empty'));
          setIsExporting(false);
          return;
        }

        const wb = XLSX.utils.book_new();

        // 1. Sheet Doanh Thu
        const incomeData = filtered
          .filter(t => t.type === TransactionType.INCOME)
          .map(tx => ({
            'Ngày': tx.date,
            'Chi nhánh': branches.find(b => b.id === tx.branchId)?.name || 'N/A',
            'Tổng (€)': tx.amount,
            'Tiền mặt (€)': tx.incomeBreakdown?.cash || 0,
            'Thẻ (€)': tx.incomeBreakdown?.card || 0,
            'Delivery (€)': tx.incomeBreakdown?.delivery || 0,
            'Ghi chú': (tx.notes || []).join('; ')
          }));
        if (incomeData.length > 0) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incomeData), "Doanh Thu");
        }

        // 2. Sheet Chi Phí
        const expenseData = filtered
          .filter(t => t.type === TransactionType.EXPENSE)
          .map(tx => ({
            'Ngày': tx.date,
            'Chi nhánh': branches.find(b => b.id === tx.branchId)?.name || 'N/A',
            'Hạng mục': tx.category,
            'Số tiền (€)': tx.amount,
            'Nguồn chi': tx.expenseSource ? EXPENSE_SOURCE_LABELS[tx.expenseSource] : 'Khác',
            'Trạng thái': tx.isPaid === false ? 'Công nợ' : 'Đã thanh toán',
            'Đối tác': tx.debtorName || '',
            'Ghi chú': (tx.notes || []).join('; ')
          }));
        if (expenseData.length > 0) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseData), "Chi Phí");
        }

        XLSX.writeFile(wb, `Tokymon_Report_${startDate}_to_${endDate}.xlsx`);
      } catch (error) {
        alert("Lỗi xuất Excel!");
      } finally {
        setIsExporting(false);
      }
    }, 500);
  };

  return (
    <div className="space-y-6 animate-ios">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
          <FileSpreadsheet className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-lg font-black dark:text-white uppercase tracking-tight">{t('export_excel')}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Báo cáo tài chính chi tiết</p>
        </div>
      </div>

      <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border dark:border-slate-800 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <Calendar className="w-3.5 h-3.5" /> Từ ngày
            </label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-4.5 bg-white dark:bg-slate-900 rounded-2xl border-2 dark:border-slate-800 font-bold outline-none focus:border-emerald-500" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <Calendar className="w-3.5 h-3.5" /> Đến ngày
            </label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-4.5 bg-white dark:bg-slate-900 rounded-2xl border-2 dark:border-slate-800 font-bold outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
           <Info className="w-5 h-5 text-indigo-500 shrink-0" />
           <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase leading-relaxed">
             Dữ liệu sẽ được xuất ra nhiều Sheet tương ứng với Doanh thu và Chi phí để dễ dàng đối soát.
           </p>
        </div>

        <button 
          onClick={handleExport} 
          disabled={isExporting}
          className="w-full h-16 bg-emerald-600 text-white rounded-[1.8rem] font-black uppercase text-xs tracking-widest shadow-vivid active-scale flex items-center justify-center gap-3"
        >
          {isExporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Download className="w-6 h-6" /> {t('download_now')}</>}
        </button>
      </div>
    </div>
  );
};

export default ExportManager;
