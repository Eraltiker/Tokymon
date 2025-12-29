
import React, { useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { useTranslation } from '../i18n';
import { Language, Category } from '../types';

interface CategoryManagerProps {
  categories: Category[];
  onUpdate: (newCategories: Category[]) => void;
  title: string;
  lang: Language;
  onAudit: (action: any, type: any, id: string, details: string) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onUpdate, title, lang, onAudit }) => {
  const { t, translateCategory } = useTranslation(lang);
  const [newCategoryName, setNewCategoryName] = useState('');

  const activeCategories = categories.filter(c => !c.deletedAt);

  const handleAdd = () => {
    const trimmed = newCategoryName.trim();
    if (trimmed && !activeCategories.some(c => c.name === trimmed)) {
      const now = new Date().toISOString();
      const newCat: Category = {
        id: trimmed, // Dùng tên làm ID cho các hạng mục mặc định hoặc Date.now() cho cái mới
        name: trimmed,
        updatedAt: now
      };
      onUpdate([...categories, newCat]);
      setNewCategoryName('');
      onAudit('CREATE', 'CATEGORY', newCat.id, `Thêm hạng mục chi phí: ${trimmed}`);
    }
  };

  const handleDelete = (id: string) => {
    const now = new Date().toISOString();
    const target = categories.find(c => c.id === id);
    if (!target) return;

    onUpdate(categories.map(c => c.id === id ? { ...c, deletedAt: now, updatedAt: now } : c));
    onAudit('DELETE', 'CATEGORY', id, `Xóa hạng mục chi phí: ${target.name}`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border dark:border-slate-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl"><Tag className="w-5 h-5 text-indigo-600" /></div>
        <h3 className="text-lg font-black uppercase tracking-tight dark:text-white">{title}</h3>
      </div>
      
      <div className="flex gap-2 mb-8">
        <input 
          type="text" 
          value={newCategoryName} 
          onChange={(e) => setNewCategoryName(e.target.value)} 
          placeholder={t('add_new')} 
          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-all dark:text-white" 
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()} 
        />
        <button onClick={handleAdd} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all"><Plus className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {activeCategories.map(cat => (
          <div key={cat.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl border dark:border-slate-700 group hover:border-indigo-500 transition-all shadow-sm">
            <span className="text-[10px] font-black uppercase truncate mr-2 dark:text-slate-300">{translateCategory(cat.name)}</span>
            <button onClick={() => handleDelete(cat.id)} className="text-slate-300 hover:text-rose-500 transition-colors active-scale">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManager;
