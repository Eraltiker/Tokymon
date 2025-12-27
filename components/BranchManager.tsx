
import React, { useState } from 'react';
import { Branch, formatCurrency, Language } from '../types';
import { useTranslation } from '../i18n';
import { Plus, Trash2, MapPin, Store, Banknote, CreditCard, Edit3, X, Save, RotateCcw, Palette, Check } from 'lucide-react';

interface BranchManagerProps {
  branches: Branch[];
  setBranches: (update: (prev: Branch[]) => Branch[]) => void;
  onAudit: any;
  setGlobalConfirm: (modal: any) => void;
  onResetBranchData: (branchId: string) => void;
  lang: Language;
}

const PRESET_COLORS = [
  '#4f46e5', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#334155', // Slate
];

const BranchManager: React.FC<BranchManagerProps> = ({ branches, setBranches, onAudit, setGlobalConfirm, onResetBranchData, lang }) => {
  const t = useTranslation(lang);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [initialCash, setInitialCash] = useState('0');
  const [initialCard, setInitialCard] = useState('0');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const displayedBranches = showDeleted 
    ? branches 
    : branches.filter(b => !b.deletedAt);

  const clearForm = () => {
    setName('');
    setAddress('');
    setInitialCash('0');
    setInitialCard('0');
    setColor(PRESET_COLORS[0]);
    setEditingBranchId(null);
  };

  const startEdit = (b: Branch) => {
    setEditingBranchId(b.id);
    setName(b.name);
    setAddress(b.address);
    setInitialCash(b.initialCash.toString());
    setInitialCard(b.initialCard.toString());
    setColor(b.color || PRESET_COLORS[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    const now = new Date().toISOString();
    
    if (editingBranchId) {
      setBranches(prev => prev.map(b => 
        b.id === editingBranchId 
          ? { 
              ...b, 
              name, 
              address, 
              initialCash: Number(initialCash) || 0, 
              initialCard: Number(initialCard) || 0,
              color,
              updatedAt: now 
            } 
          : b
      ));
      onAudit('UPDATE', 'BRANCH', editingBranchId, `${t('update_branch')}: ${name}`);
    } else {
      const newB: Branch = {
        id: Date.now().toString(),
        name,
        address,
        initialCash: Number(initialCash) || 0,
        initialCard: Number(initialCard) || 0,
        color,
        updatedAt: now
      };
      setBranches(prev => [...prev, newB]);
      onAudit('CREATE', 'BRANCH', newB.id, `${t('add_branch')}: ${name}`);
    }
    clearForm();
  };

  const handleDelete = (id: string, branchName: string) => {
    setGlobalConfirm({
      show: true,
      title: t('delete'),
      message: t('confirm_delete_branch'),
      onConfirm: () => {
        const now = new Date().toISOString();
        setBranches(prev => prev.map(x => x.id === id ? { ...x, deletedAt: now, updatedAt: now } : x));
        onAudit('DELETE', 'BRANCH', id, `${t('delete')}: ${branchName}`);
        if (editingBranchId === id) clearForm();
        setGlobalConfirm(null);
      }
    });
  };

  const handleReset = (id: string, branchName: string) => {
    setGlobalConfirm({
      show: true,
      title: 'Reset Dữ Liệu',
      message: `${t('confirm_reset_data')} (${branchName})`,
      onConfirm: () => {
        onResetBranchData(id);
        setGlobalConfirm(null);
      }
    });
  };

  return (
    <div className="space-y-8 pb-10 animate-ios">
      <form onSubmit={handleSubmit} className={`bg-white dark:bg-slate-950 p-6 sm:p-10 rounded-[3rem] border-2 shadow-soft transition-all ${editingBranchId ? 'border-indigo-500 ring-4 ring-indigo-500/5' : 'dark:border-slate-800 border-slate-100'}`}>
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
             <div className="p-4 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white shadow-lg">
                {editingBranchId ? <Edit3 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
             </div>
             <div>
               <h3 className="text-sm font-black uppercase tracking-widest dark:text-white leading-none mb-1">
                 {editingBranchId ? t('update_branch') : t('add_branch')}
               </h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cấu hình cơ sở kinh doanh</p>
             </div>
          </div>
          {editingBranchId && (
            <button type="button" onClick={clearForm} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500"><X className="w-5 h-5" /></button>
          )}
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('branch_name')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tokymon Berlin" className="w-full p-4.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 dark:border-slate-800 border-slate-100 font-bold outline-none focus:border-indigo-500 transition-all text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('branch_address')}</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City..." className="w-full p-4.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 dark:border-slate-800 border-slate-100 font-bold outline-none focus:border-indigo-500 transition-all text-sm" />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" /> Màu sắc nhận diện
            </label>
            <div className="flex flex-wrap gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
               {PRESET_COLORS.map(c => (
                 <button 
                  key={c} 
                  type="button" 
                  onClick={() => setColor(c)} 
                  className={`w-12 h-12 rounded-2xl transition-all active-scale relative flex items-center justify-center shadow-sm ${color === c ? 'ring-4 ring-white dark:ring-slate-800 scale-110 z-10' : 'opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: c }}
                 >
                   {color === c && <Check className="w-6 h-6 text-white" />}
                 </button>
               ))}
               <div className="w-px bg-slate-200 dark:bg-slate-800 mx-1" />
               <input 
                type="color" 
                value={color} 
                onChange={e => setColor(e.target.value)} 
                className="w-12 h-12 p-0 border-0 bg-transparent cursor-pointer rounded-2xl overflow-hidden"
               />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('initial_cash')}</label>
              <div className="relative">
                <input type="number" value={initialCash} onChange={e => setInitialCash(e.target.value)} className="w-full pl-12 pr-4 py-4.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 dark:border-slate-800 border-slate-100 font-black outline-none text-sm text-emerald-600" />
                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('initial_card')}</label>
              <div className="relative">
                <input type="number" value={initialCard} onChange={e => setInitialCard(e.target.value)} className="w-full pl-12 pr-4 py-4.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 dark:border-slate-800 border-slate-100 font-black outline-none text-sm text-indigo-600" />
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
              </div>
            </div>
          </div>
        </div>
        
        <button type="submit" className="w-full py-5 bg-slate-950 dark:bg-indigo-600 text-white rounded-[1.8rem] font-black uppercase text-xs tracking-[0.2em] shadow-vivid active-scale mt-8 transition-all hover:bg-black dark:hover:bg-indigo-500">
          {editingBranchId ? t('update') : t('confirm')}
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedBranches.map(b => (
          <div key={b.id} className={`bg-white dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-[2.5rem] border-2 shadow-soft transition-all group overflow-hidden ${b.deletedAt ? 'opacity-40 grayscale border-dashed border-slate-300' : 'dark:border-slate-800 border-slate-100 hover:border-slate-200'}`}>
            <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: b.color || '#4f46e5' }} />
            
            <div className="flex justify-between items-start mb-6 pt-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: b.color || '#4f46e5' }}>
                <Store className="w-6 h-6" />
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                <button type="button" onClick={() => handleReset(b.id, b.name)} className="p-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-xl active-scale"><RotateCcw className="w-4.5 h-4.5" /></button>
                <button type="button" onClick={() => startEdit(b)} className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-xl active-scale"><Edit3 className="w-4.5 h-4.5" /></button>
                <button type="button" onClick={() => handleDelete(b.id, b.name)} className="p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-xl active-scale"><Trash2 className="w-4.5 h-4.5" /></button>
              </div>
            </div>

            <div className="space-y-1">
               <h4 className="font-black text-slate-900 dark:text-white uppercase text-lg tracking-tight leading-none">{b.name}</h4>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> {b.address || 'No address set'}
               </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t dark:border-slate-800 border-slate-50 pt-5 mt-6">
               <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{t('initial_cash')}</p>
                  <p className="text-sm font-black text-emerald-600 tracking-tight">{formatCurrency(b.initialCash || 0, lang)}</p>
               </div>
               <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{t('initial_card')}</p>
                  <p className="text-sm font-black text-indigo-600 tracking-tight">{formatCurrency(b.initialCard || 0, lang)}</p>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BranchManager;
