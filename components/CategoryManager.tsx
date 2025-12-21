import React, { useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';

interface CategoryManagerProps {
  categories: string[];
  onUpdate: (newCategories: string[]) => void;
  title: string;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onUpdate, title }) => {
  const [newCategory, setNewCategory] = useState('');

  const handleAdd = () => {
    const trimmed = newCategory.trim();
    if (trimmed && !categories.includes(trimmed)) {
      onUpdate([...categories, trimmed]);
      setNewCategory('');
    }
  };

  const handleDelete = (cat: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${cat}"?`)) {
      onUpdate(categories.filter(c => c !== cat));
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
          <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{title}</h3>
      </div>
      
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Thêm danh mục mới..."
          className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:border-indigo-500 outline-none transition-all"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 font-bold shadow-lg shadow-indigo-100 dark:shadow-none"
        >
          <Plus className="w-5 h-5" />
          <span>Thêm</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map(cat => (
          <div key={cat} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-700 group hover:border-indigo-500 transition-all">
            <span className="text-slate-700 dark:text-slate-300 font-bold text-xs truncate mr-2" title={cat}>{cat}</span>
            <button
              onClick={() => handleDelete(cat)}
              className="text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManager;