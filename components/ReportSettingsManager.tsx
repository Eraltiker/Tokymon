
import React from 'react';
import { ReportSettings } from '../types';
import { Eye, EyeOff, LayoutPanelTop, Check } from 'lucide-react';

interface ReportSettingsManagerProps {
  settings: ReportSettings;
  onUpdate: (newSettings: ReportSettings) => void;
}

const ReportSettingsManager: React.FC<ReportSettingsManagerProps> = ({ settings, onUpdate }) => {
  const options: { key: keyof ReportSettings, label: string }[] = [
    { key: 'showSystemTotal', label: 'Tổng doanh thu hệ thống' },
    { key: 'showShopRevenue', label: 'Doanh thu tại quầy (Shop)' },
    { key: 'showAppRevenue', label: 'Doanh thu App (Delivery)' },
    { key: 'showCardRevenue', label: 'Số tiền quẹt thẻ' },
    { key: 'showActualCash', label: 'Tiền mặt thực tế chốt két' },
    { key: 'showProfit', label: 'Lợi nhuận ngày' },
  ];

  const toggle = (key: keyof ReportSettings) => {
    onUpdate({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600">
          <LayoutPanelTop className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-black dark:text-white uppercase leading-none mb-1">Cấu hình hiển thị báo cáo</h3>
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Tùy chỉnh các cột dữ liệu trên Dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => toggle(opt.key)}
            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
              settings[opt.key]
                ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800'
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settings[opt.key] ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                {settings[opt.key] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </div>
              <span className={`text-[11px] font-black uppercase tracking-tight ${settings[opt.key] ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-500'}`}>
                {opt.label}
              </span>
            </div>
            {settings[opt.key] && (
              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ReportSettingsManager;
