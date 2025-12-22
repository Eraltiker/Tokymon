
import React, { useState } from 'react';
import { Branch, formatCurrency } from '../types';
import { Plus, Trash2, MapPin, Store, Banknote, CreditCard, Edit3, X, Save, RotateCcw, Eye, EyeOff, Zap } from 'lucide-react';

interface BranchManagerProps {
  branches: Branch[];
  setBranches: (update: (prev: Branch[]) => Branch[]) => void;
  onAudit: any;
  setGlobalConfirm: (modal: any) => void;
}

const BranchManager: React.FC<BranchManagerProps> = ({ branches, setBranches, onAudit, setGlobalConfirm }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [initialCash, setInitialCash] = useState('0');
  const [initialCard, setInitialCard] = useState('0');
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
    setEditingBranchId(null);
  };

  const startEdit = (b: Branch) => {
    setEditingBranchId(b.id);
    setName(b.name);
    setAddress(b.address);
    setInitialCash(b.initialCash.toString());
    setInitialCard(b.initialCard.toString());
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
              updatedAt: now 
            } 
          : b
      ));
      onAudit('UPDATE', 'BRANCH', editingBranchId, `Cập nhật chi nhánh: ${name}`);
    } else {
      const newB: Branch = {
        id: Date.now().toString(),
        name,
        address,
        initialCash: Number(initialCash) || 0,
        initialCard: Number(initialCard) || 0,
        updatedAt: now
      };
      setBranches(prev => [...prev, newB]);
      onAudit('CREATE', 'BRANCH', newB.id, `Thêm chi nhánh mới: ${name}`);
    }
    clearForm();
  };

  const handleDelete = (id: string, branchName: string) => {
    const activeCount = branches.filter(b => !b.deletedAt).length;
    if (activeCount <= 1) {
      alert("Hệ thống yêu cầu ít nhất 1 chi nhánh hoạt động.");
      return;
    }

    setGlobalConfirm({
      show: true,
      title: "Xóa chi nhánh",
      message: `Bạn có chắc muốn xóa cơ sở "${branchName}"?`,
      onConfirm: () => {
        const now = new Date().toISOString();
        setBranches(prev => prev.map(x => x.id === id ? { ...x, deletedAt: now, updatedAt: now } : x));
        onAudit('DELETE', 'BRANCH', id, `Xóa chi nhánh: ${branchName}`);
        if (editingBranchId === id) clearForm();
        setGlobalConfirm(null);
      }
    });
  };

  const handleRestore = (id: string, branchName: string) => {
    setGlobalConfirm({
      show: true,
      title: "Khôi phục",
      message: `Khôi phục cơ sở "${branchName}"?`,
      onConfirm: () => {
        const now = new Date().toISOString();
        setBranches(prev => prev.map(x => x.id === id ? { ...x, deletedAt: undefined, updatedAt: now } : x));
        onAudit('UPDATE', 'BRANCH', id, `Khôi phục chi nhánh: ${branchName}`);
        setGlobalConfirm(null);
      }
    });
  };

  const resetToCapital = (b: Branch) => {
    setGlobalConfirm({
      show: true,
      title: "Đặt lại số dư",
      message: `Cập nhật trạng thái đồng bộ cho "${b.name}"?`,
      onConfirm: () => {
        const now = new Date().toISOString();
        setBranches(prev => prev.map(x => x.id === b.id ? { ...x, updatedAt: now } : x));
        onAudit('UPDATE', 'BRANCH', b.id, `Đặt lại đồng bộ chi nhánh: ${b.name}`);
        setGlobalConfirm(null);
      }
    });
  };

  return (
    <div className="space-y-8 pb-10">
      <form onSubmit={handleSubmit} className={`bg-white dark:bg-slate-950 p-6 sm:p-8 rounded-[2rem] border-2 shadow-sm transition-all ${editingBranchId ? 'border-indigo-500' : 'dark:border-slate-800 border-slate-100'}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className={`p-3 rounded-2xl ${editingBranchId ? 'bg-indigo-600 text-white' : 'bg-slate-900 dark:bg-slate-800 text-white'}`}>
                {editingBranchId ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
             </div>
             <h3 className="text-xs font-black uppercase tracking-widest dark:text-white leading-none">
               {editingBranchId ? 'Cập nhật cơ sở' : 'Thêm cơ sở mới'}
             </h3>
          </div>
          {editingBranchId && (
            <button type="button" onClick={clearForm} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tên chi nhánh" className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border dark:border-slate-800 font-bold outline-none focus:border-indigo-500 text-sm" />
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Địa chỉ" className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border dark:border-slate-800 font-bold outline-none focus:border-indigo-500 text-sm" />
          <div className="relative">
            <input type="number" value={initialCash} onChange={e => setInitialCash(e.target.value)} placeholder="Vốn tiền mặt" className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-900 rounded-xl border dark:border-slate-800 font-bold outline-none text-sm" />
            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
          </div>
          <div className="relative">
            <input type="number" value={initialCard} onChange={e => setInitialCard(e.target.value)} placeholder="Vốn trong thẻ" className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-900 rounded-xl border dark:border-slate-800 font-bold outline-none text-sm" />
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
          </div>
        </div>
        
        <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 cursor-pointer">
          {editingBranchId ? 'Cập nhật thay đổi' : 'Xác nhận tạo chi nhánh'}
        </button>
      </form>

      <div className="flex justify-between items-center px-2">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Danh sách cơ sở</h3>
        <button type="button" onClick={() => setShowDeleted(!showDeleted)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer">
          {showDeleted ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showDeleted ? 'Ẩn đã xóa' : 'Hiện đã xóa'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedBranches.map(b => (
          <div key={b.id} className={`bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 shadow-sm transition-all relative ${b.deletedAt ? 'opacity-40 grayscale border-dashed border-slate-300' : 'dark:border-slate-800 border-slate-100'}`}>
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 bg-slate-900 dark:bg-slate-800 text-white rounded-xl flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div className="flex gap-1">
                {b.deletedAt ? (
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); handleRestore(b.id, b.name); }} 
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-lg cursor-pointer active:bg-emerald-100"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); resetToCapital(b); }} 
                      className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-amber-500 rounded-lg cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); startEdit(b); }} 
                      className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-lg cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      type="button" 
                      onClick={(e) => { e.stopPropagation(); handleDelete(b.id, b.name); }} 
                      className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="font-black text-slate-900 dark:text-white uppercase text-lg leading-none mb-1">{b.name}</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" /> {b.address || 'Hệ thống Tokymon'}
              </p>
            </div>
            
            <div className="flex gap-4 border-t dark:border-slate-800 pt-4 mt-4">
               <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tiền mặt</p>
                  <p className="text-xs font-black text-emerald-600">{formatCurrency(b.initialCash || 0)}</p>
               </div>
               <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Trong thẻ</p>
                  <p className="text-xs font-black text-indigo-600">{formatCurrency(b.initialCard || 0)}</p>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BranchManager;
