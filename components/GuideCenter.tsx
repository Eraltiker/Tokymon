
import {
  BookOpen,
  ChevronRight,
  CheckCircle2,
  Wallet,
  ArrowDownCircle,
  Cloud,
  ShieldCheck,
  Smartphone,
  Target,
  HelpCircle,
  Lightbulb,
  MessageCircle,
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from '../i18n';
import { Language } from '../types';

interface GuideCenterProps {
  lang: Language;
}

const GuideCenter: React.FC<GuideCenterProps> = ({ lang }) => {
  const t = useTranslation(lang);
  const [activeSection, setActiveSection] = useState<string | null>('intro');

  const guides = [
    {
      id: 'intro',
      title: lang === 'vi' ? 'Tổng quan Tokymon' : 'Tokymon Übersicht',
      icon: Target,
      color: 'text-indigo-600 bg-indigo-50',
      content:
        lang === 'vi' ? (
          <div className="space-y-4">
            <p className="text-xs font-bold leading-relaxed text-slate-600 dark:text-slate-400">
              Chào mừng bạn đến với **Tokymon Finance Manager**. Ứng dụng được thiết kế riêng cho
              mô hình nhà hàng đa chi nhánh, giúp chủ doanh nghiệp kiểm soát dòng tiền chính xác
              theo thời gian thực.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase text-indigo-600 mb-2">
                  Mục tiêu cốt lõi
                </p>
                <ul className="space-y-2">
                  <li className="flex gap-2 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Quản lý doanh
                    thu Bar, App và Thẻ riêng biệt.
                  </li>
                  <li className="flex gap-2 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Theo dõi chi
                    phí Shop Cash vs Ví Tổng.
                  </li>
                  <li className="flex gap-2 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Phân quyền
                    chặt chẽ: Manager chỉ thấy chi nhánh của mình.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs font-bold leading-relaxed text-slate-600 dark:text-slate-400">
              Willkommen beim **Tokymon Finance Manager**. Diese App wurde speziell für
              Gastronomiebetriebe mit mehreren Filialen entwickelt.
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
              <ul className="space-y-2">
                <li className="flex gap-2 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Separate
                  Verwaltung von Bar-, App- und Kartenumsätzen.
                </li>
                <li className="flex gap-2 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Kostenverfolgung: Ladenkasse vs. Hauptkasse.
                </li>
              </ul>
            </div>
          </div>
        ),
    },
    {
      id: 'income',
      title: lang === 'vi' ? 'Cách Chốt Sổ (Doanh Thu)' : 'Tagesabschluss (Umsatz)',
      icon: Wallet,
      color: 'text-emerald-600 bg-emerald-50',
      content:
        lang === 'vi' ? (
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Quy trình chốt sổ diễn ra vào cuối ca làm việc:
            </p>
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  1
                </div>
                <p className="text-[11px] font-bold">
                  **Tổng Kasse Shop**: Nhập toàn bộ tiền mặt thu được tại quán (chưa trừ chi phí).
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  2
                </div>
                <p className="text-[11px] font-bold">
                  **Tổng Thẻ**: Nhập số tiền quẹt thẻ từ máy POS.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  3
                </div>
                <p className="text-[11px] font-bold">
                  **Tiền App**: Nhập doanh thu từ Lieferando, Wolt, etc.
                </p>
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
              <Lightbulb className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-[10px] font-bold text-amber-800 italic">
                Lưu ý: Hệ thống sẽ tự động tính toán "Tiền mặt bàn giao" sau khi đã trừ các khoản
                chi tại quán.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  1
                </div>
                <p className="text-[11px] font-bold">
                  **Ladenumsatz**: Gesamte Bargeldeinnahmen im Geschäft.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                  2
                </div>
                <p className="text-[11px] font-bold">**Kartenzahlung**: Summe der POS-Belege.</p>
              </div>
            </div>
          </div>
        ),
    },
    {
      id: 'expense',
      title: lang === 'vi' ? 'Quản lý Chi Phí' : 'Ausgabenmanagement',
      icon: ArrowDownCircle,
      color: 'text-rose-600 bg-rose-50',
      content:
        lang === 'vi' ? (
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Tokymon chia chi phí thành 3 nguồn chính:
            </p>
            <div className="grid grid-cols-1 gap-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-rose-600 uppercase">
                  Tiền Quán (Shop Cash)
                </span>
                <p className="text-[11px] font-bold mt-1">
                  Chi trực tiếp từ ngăn kéo tiền mặt. Khoản này sẽ làm giảm số tiền bàn giao cuối
                  ngày.
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-indigo-600 uppercase">
                  Ví Tổng (Master Wallet)
                </span>
                <p className="text-[11px] font-bold mt-1">
                  Các khoản chi lớn (Tiền nhà, Lương) lấy từ quỹ tổng của chủ doanh nghiệp.
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-emerald-600 uppercase">Thẻ/Bank</span>
                <p className="text-[11px] font-bold mt-1">Chuyển khoản thanh toán hóa đơn.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] font-black text-rose-600 uppercase">Ladenkasse</span>
              <p className="text-[11px] font-bold mt-1">
                Direkt aus der Kasse bezahlt. Reduziert die Übergabe.
              </p>
            </div>
          </div>
        ),
    },
    {
      id: 'cloud',
      title: lang === 'vi' ? 'Đồng bộ Cloud & Offline' : 'Cloud Sync & Offline',
      icon: Cloud,
      color: 'text-blue-600 bg-blue-50',
      content:
        lang === 'vi' ? (
          <div className="space-y-4">
            <div className="flex gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
              <ShieldCheck className="w-8 h-8 text-blue-600 shrink-0" />
              <p className="text-[11px] font-bold leading-relaxed">
                Dữ liệu của bạn luôn được lưu an toàn trên máy (IndexedDB). Khi có internet, hệ
                thống sẽ tự động đồng bộ lên Cloud thông qua Sync Key để bạn có thể xem báo cáo từ
                bất cứ đâu.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase text-slate-400">Mẹo nhỏ</h4>
              <p className="text-[11px] font-bold flex gap-2">
                <Smartphone className="w-4 h-4 text-slate-400" /> Cài đặt app lên màn hình chính
                (Add to Home Screen) để dùng như một App thật.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="text-[11px] font-bold leading-relaxed">
              Ihre Daten werden lokal gespeichert und bei Internetverbindung automatisch über den
              Sync Key synchronisiert.
            </p>
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-6 pb-10 animate-ios max-w-2xl mx-auto">
      <div className="bg-white/95 dark:bg-slate-900/90 rounded-[2.5rem] p-8 border border-white dark:border-slate-800 shadow-ios">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-vivid">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter leading-none mb-1">
              {t('guide')}
            </h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
              User Documentation v1.0
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {guides.map((guide) => (
            <div key={guide.id} className="overflow-hidden">
              <button
                onClick={() => setActiveSection(activeSection === guide.id ? null : guide.id)}
                className={`w-full flex items-center justify-between p-5 rounded-[1.8rem] transition-all border-2 active-scale ${
                  activeSection === guide.id
                    ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-900'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${guide.color}`}
                  >
                    <guide.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-tight dark:text-white">
                    {guide.title}
                  </span>
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    activeSection === guide.id ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {activeSection === guide.id && (
                <div className="p-6 bg-white dark:bg-slate-900/50 rounded-b-[1.8rem] border-x-2 border-b-2 border-slate-50 dark:border-slate-800 animate-in slide-in-from-top-4">
                  {guide.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-vivid text-center space-y-4">
        <HelpCircle className="w-10 h-10 mx-auto opacity-50" />
        <h4 className="text-sm font-black uppercase tracking-widest">{t('support')}</h4>
        <p className="text-[11px] font-bold opacity-80 leading-relaxed uppercase">
          {lang === 'vi'
            ? 'Nếu gặp sự cố, vui lòng liên hệ đội ngũ kỹ thuật của Tokymon qua WhatsApp hoặc Email.'
            : 'Bei Problemen kontaktieren Sie bitte das Tokymon-Technikteam per WhatsApp oder E-Mail.'}
        </p>
        <div className="pt-4">
          <a
            href="https://wa.me/4917645186868"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 mx-auto active-scale w-fit"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp: 017645186868
          </a>
        </div>
      </div>
    </div>
  );
};

export default GuideCenter;
