
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, TransactionType, Branch, EXPENSE_SOURCE_LABELS, Language } from '../types';
import { useTranslation } from '../i18n';
import { FileSpreadsheet, Calendar, Download, Loader2, AlertCircle, TrendingDown } from 'lucide-react';

interface ExportManagerProps {
  transactions: Transaction[];
  branches: Branch[];
  lang: Language;
}

const ExportManager: React.FC<ExportManagerProps> = ({ transactions, branches, lang }) => {
  // Fix: Correctly destructure t from the useTranslation hook object
  const { t } = useTranslation(lang);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);

  const getBranchName = (id: string) => branches.find(b => b.id === id)?.name || 'N/A';

  const handleExport = () => {
    setIsExporting(true);
    
    // Sử dụng setTimeout để không làm treo UI khi xử lý lượng lớn dữ liệu
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

        // 1. Dữ liệu Doanh Thu
        const incomeData = filtered
          .filter(t => t.type === TransactionType.INCOME)
          .map(tx => ({
            'Ngày': tx.date,
            'Chi nhánh': getBranchName(tx.branchId),
            'Hệ thống (€)': tx.amount,
            'Shop (€)': (tx.incomeBreakdown?.cash || 0) + (tx.incomeBreakdown?.card || 0),
            'Tiền mặt (€)': tx.incomeBreakdown?.cash || 0,
            'Thẻ (€)': tx.incomeBreakdown?.card || 0,
            'Delivery (€)': tx.incomeBreakdown?.delivery || 0,
            // Fix: Transaction sử dụng 'notes' (mảng) thay vì 'note'
            'Ghi chú': (tx.notes || []).join('; ')
          }));

        // 2. Dữ liệu Chi Phí chi tiết
        const expenseData = filtered
          .filter(t => t.type === TransactionType.EXPENSE)
          .map(tx => ({
            'Ngày': tx.date,
            'Chi nhánh': getBranchName(tx.branchId),
            'Hạng mục': tx.category,
            'Số tiền (€)': tx.amount,
            'Nguồn chi': tx.expenseSource ? EXPENSE_SOURCE_LABELS[tx.expenseSource] : 'Khác',
            'Trạng thái': tx.isPaid === false ? 'Công nợ' : 'Đã thanh toán',
            'Đối tác/Chủ nợ': tx.debtorName || '',
            // Fix: Transaction sử dụng 'notes' (mảng) thay vì 'note'
            'Ghi chú': (tx.notes || []).join('; ')
          }));

        // 3. Thống kê chi phí theo Hạng mục (New Sheet)
        const expensesOnly = filtered.filter(t => t.type === TransactionType.EXPENSE);
        const totalExpenseAmount = expensesOnly.reduce((sum, e) => sum + e.amount, 0);
        
        const categoryStatsMap: Record<string, { total: number, count: number }> = {};
        expensesOnly.forEach(e => {
          if (!categoryStatsMap[e.category]) categoryStatsMap[e.category] = { total: 0, count: 0 };
          categoryStatsMap[e.category].total += e.amount;
          categoryStatsMap[e.category].count += 1;
        });

        const categoryStatsData = Object.entries(categoryStatsMap)
          .map(([name, stat]) => ({
            'Hạng mục chi phí': name,
            'Tổng cộng (€)': stat.total,
            'Số lượt giao dịch': stat.count,
            'Tỷ trọng (%)': totalExpenseAmount > 0 ? ((stat.total / totalExpenseAmount) * 100).toFixed(2) : '0'
          }))
          .sort((a, b) => b['Tổng cộng (€)'] - a['Tổng cộng (€)']);

        // Khởi tạo Workbook
        const wb = XLSX.utils.book_new();

        // Thêm các Sheet
        if (incomeData.length > 0) {
          const wsIncome = XLSX.utils.json_to_sheet(incomeData);
          // Set độ rộng cột cơ bản
          wsIncome['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 25 }];
          XLSX.utils.book_append_sheet(wb, wsIncome, "Doanh Thu");
        }

        if (expenseData.length > 0) {
          const wsExpense = XLSX.utils.json_to_sheet(expenseData);
          wsExpense['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 }];
          XLSX.utils.book_append_sheet(wb, wsExpense, "Chi Tiết Chi Phí");
          
          if (categoryStatsData.length > 0) {
            const wsStats = XLSX.utils.json_to_sheet(categoryStatsData);
            wsStats['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, wsStats, "Thống Kê Hạng Mục");
          }
        }

        const fileName = `Tokymon_Master_Report_${startDate}_${endDate}.xlsx`;
        XLSX.writeFile(wb, fileName);
      } catch (error) {
        console.error("Export error:", error);
        alert("Có lỗi xảy ra khi xử lý dữ liệu Excel!");
      } finally {
        setIsExporting(false);
      }
    }, 400);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-black dark:text-white uppercase leading-none mb-1">{t('export_excel')}</h3>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Xuất báo cáo tài chính Tokymon</p>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/40 p-6 sm:p-8 rounded-[2.5rem] border dark:border-slate-800 space-y-6 shadow-inner">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> {t('from_date')}
            </label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="w-full p-4.5 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-bold outline-none focus:border-emerald-500 dark:text-white transition-all text-sm shadow-sm" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> {t('to_date')}
            </label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="w-full p-4.5 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-bold outline-none focus:border-emerald-500 dark:text-white transition-all text-sm shadow-sm" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex gap-3 items-center">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />
            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 leading-relaxed uppercase">
              {lang === 'vi' ? '3 Sheet: Doanh thu, Chi phí, Thống kê' : '3 Sheets: Umsatz, Ausgaben, Statistik'}
            </p>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 flex gap-3 items-center">
            <TrendingDown className="w-5 h-5 text-indigo-500 shrink-0" />
            <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 leading-relaxed uppercase">
              {lang === 'vi' ? 'Bao gồm phân tích tỷ trọng chi phí' : 'Inklusive Kostenanteilsanalyse'}
            </p>
          </div>
        </div>

        <button 
          onClick={handleExport} 
          disabled={isExporting}
          className="w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[13px] flex items-center justify-center gap-4 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all disabled:opacity-50 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          {isExporting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Download className="w-6 h-6" /> {t('download_now')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ExportManager;
