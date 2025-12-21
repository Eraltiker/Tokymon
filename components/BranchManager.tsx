
import React, { useState } from 'react';
import { Branch, formatCurrency } from '../types';
import { Plus, Trash2, MapPin, Store, Euro, Banknote, CreditCard } from 'lucide-react';

interface BranchManagerProps {
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  onAudit: any;
}

const BranchManager: React.FC<BranchManagerProps> = ({ branches, setBranches, onAudit }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [initialCash, setInitialCash] = useState('0');
  const [initialCard, setInitialCard] = useState('0');

  const handleAdd = () => {
    if (!name) return;
    // Fix: Added missing updatedAt property to satisfy Branch interface
    const newB: Branch = {
      id: Date.now().toString(),
      name,
      address,
      initialCash: Number(initialCash) || 0,
      initialCard: Number(initialCard) || 0,
      updatedAt: new Date().toISOString()
    };
    setBranches([...branches, newB]);
    onAudit('CREATE', 'BRANCH', newB.id, `Thêm chi nhánh: ${name} (TM: ${initialCash}€, Thẻ: ${initialCard}€)`);
    setName(''); setAddress(''); setInitialCash('0'); setInitialCard('0');
  };

  const handleDelete = (id: string) => {
    if (branches.length === 1) return alert("Không thể xóa chi nhánh duy nhất.");
    const b = branches.find(x => x.id === id);
    if (window.confirm(`Xóa chi nhánh ${b?.name}?`)) {
      setBranches(branches.filter(x => x.id !== id));
      onAudit('DELETE', 'BRANCH', id, `Xóa chi nhánh: ${b?.name}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-4">
        <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-8">
          <Store className="w-5 h-5 text-indigo-500" /> Cấu hình chi nhánh mới
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tên chi nhánh</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Tokymon Berlin..." className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-bold outline-none focus:border-indigo-500 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Địa chỉ</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="VD: Alexanderplatz..." className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-bold outline-none focus:border-indigo-500 transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tiền mặt ban đầu (€)</label>
            <div className="relative">
              <input type="number" value={initialCash} onChange={e => setInitialCash(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/30 font-black text-emerald-600 outline-none focus:bg-white transition-all" />
              <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tiền thẻ ban đầu (€)</label>
            <div className="relative">
              <input type="number" value={initialCard} onChange={e => setInitialCard(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/30 font-black text-indigo-600 outline-none focus:bg-white transition-all" />
              <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
            </div>
          </div>
        </div>
        
        <button onClick={handleAdd} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all">
          <Plus className="w-5 h-5" /> Xác nhận thêm chi nhánh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map(b => (
          <div key={b.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 shadow-sm hover:border-indigo-500 transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                <Store className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <button onClick={() => handleDelete(b.id)} className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xl mb-1">{b.name}</h4>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
              <MapPin className="w-3.5 h-3.5" /> {b.address || 'Berlin'}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vốn tiền mặt</span>
                  <p className="text-sm font-black text-emerald-600">{formatCurrency(b.initialCash || 0)}</p>
               </div>
               <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vốn thẻ</span>
                  <p className="text-sm font-black text-indigo-600">{formatCurrency(b.initialCard || 0)}</p>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BranchManager;