
import React, { useMemo } from 'react';
import { Cloud, RefreshCw, ShieldCheck, Key, Info, Zap, Database, Globe, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from '../i18n';
import { Language } from '../types';

interface SyncManagerProps {
  syncKey: string;
  isSyncing: boolean;
  lastSyncStatus: 'success' | 'error' | 'syncing';
  onManualSync: () => void;
  lang: Language;
  lastSyncTime?: string;
  totalRecords?: number;
}

const SyncManager: React.FC<SyncManagerProps> = ({ 
  syncKey, 
  isSyncing, 
  lastSyncStatus, 
  onManualSync, 
  lang,
  lastSyncTime,
  totalRecords = 0
}) => {
  const { t } = useTranslation(lang);
  const isOnline = navigator.onLine;

  const formattedTime = useMemo(() => {
    if (!lastSyncTime || lastSyncTime === new Date(0).toISOString()) return 'Chưa từng đồng bộ';
    const date = new Date(lastSyncTime);
    return date.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'de-DE') + ' ' + date.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'de-DE');
  }, [lastSyncTime, lang]);

  return (
    <div className="space-y-8 animate-ios">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center shadow-vivid">
            <Cloud className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black dark:text-white uppercase tracking-tight">Trung tâm Đồng bộ Cloud</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hệ thống TokySync Enterprise</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 border ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
          <Globe className={`w-3.5 h-3.5 ${isOnline ? 'animate-pulse' : ''}`} />
          <span className="text-[9px] font-black uppercase tracking-widest">{isOnline ? 'Internet Online' : 'No Connection'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border dark:border-slate-800 flex flex-col items-center text-center">
          <Clock className="w-6 h-6 text-slate-400 mb-3" />
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Đồng bộ cuối</p>
          <p className="text-[11px] font-bold dark:text-white">{formattedTime}</p>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border dark:border-slate-800 flex flex-col items-center text-center">
          <Database className="w-6 h-6 text-slate-400 mb-3" />
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng bản ghi</p>
          <p className="text-[11px] font-bold dark:text-white">{totalRecords.toLocaleString()} Transactions</p>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border dark:border-slate-800 flex flex-col items-center text-center">
          {lastSyncStatus === 'success' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-3" />
          ) : lastSyncStatus === 'error' ? (
            <AlertCircle className="w-6 h-6 text-rose-500 mb-3" />
          ) : (
            <RefreshCw className="w-6 h-6 text-brand-500 mb-3 animate-spin" />
          )}
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Tình trạng</p>
          <p className={`text-[11px] font-bold uppercase ${lastSyncStatus === 'success' ? 'text-emerald-500' : lastSyncStatus === 'error' ? 'text-rose-500' : 'text-brand-500'}`}>
            {lastSyncStatus === 'success' ? 'Kết nối tốt' : lastSyncStatus === 'error' ? 'Gián đoạn' : 'Đang gửi...'}
          </p>
        </div>
      </div>

      <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border dark:border-slate-800 space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-4 h-4 text-slate-400" />
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Sync Key (Read-only)</label>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 flex items-center justify-between shadow-inner">
          <code className="font-mono text-sm font-bold text-brand-600 dark:text-brand-400 tracking-wider">
            {syncKey}
          </code>
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
        </div>
        
        <div className="flex items-start gap-4 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
          <Info className="w-6 h-6 text-blue-500 shrink-0 mt-1" />
          <div className="space-y-1">
             <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase leading-relaxed">
               Lưu ý về tính nhất quán:
             </p>
             <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400/80 leading-relaxed uppercase">
               Nếu bạn dùng nhiều máy tính cùng lúc, hãy ưu tiên bấm "Làm mới" trên máy vừa mở để lấy dữ liệu mới nhất từ các máy khác.
             </p>
          </div>
        </div>

        <button 
          onClick={onManualSync}
          disabled={isSyncing || !isOnline}
          className={`w-full h-18 rounded-[1.8rem] font-black uppercase text-xs tracking-widest active-scale flex items-center justify-center gap-3 mt-6 shadow-ios transition-all ${
            isSyncing ? 'bg-slate-200 text-slate-400' : 
            !isOnline ? 'bg-rose-100 text-rose-400 cursor-not-allowed' :
            'bg-slate-950 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.01]'
          }`}
        >
          {isSyncing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}
          {isSyncing ? 'ĐANG ĐỒNG BỘ DỮ LIỆU...' : !isOnline ? 'KHÔNG CÓ INTERNET' : 'ĐỒNG BỘ THỦ CÔNG NGAY'}
        </button>
      </div>
    </div>
  );
};

export default SyncManager;
