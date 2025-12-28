
import React, { useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { useTranslation } from '../i18n';
import { Language } from '../types';

interface CategoryManagerProps {
  categories: string[];
  onUpdate: (newCategories: string[]) => void;
  title: string;
  lang: Language;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onUpdate, title, lang }) => {
  const { t, translateCategory } = useTranslation(lang);
  const [newCategory, setNewCategory] = useState('');

  const handleAdd = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      onUpdate([...categories, trimmed]);
      setNewCategory('');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border dark:border-slate-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl"><Tag className="w-5 h-5 text-indigo-600" /></div>
        <h3 className="text-lg font-black uppercase tracking-tight dark:text-white">{title}</h3>
      </div>
      
      <div className="flex gap-2 mb-8">
        <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder={t('add_new')} className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 dark:border-slate-700 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 transition-all dark:text-white" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
        <button onClick={handleAdd} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all"><Plus className="w-5 h-5" /></button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map(cat => (
          <div key={cat} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl border dark:border-slate-700 group hover:border-indigo-500 transition-all">
            <span className="text-[10px] font-black uppercase truncate mr-2 dark:text-slate-300">{translateCategory(cat)}</span>
            <button onClick={() => onUpdate(categories.filter(c => c !== cat))} className="text-slate-300 hover:text-rose-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManager;
