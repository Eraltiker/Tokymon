
import React, { useState } from 'react';
import { User, UserRole, Branch, Language } from '../types';
import { useTranslation } from '../i18n';
import { Plus, Trash2, Users, Edit3, X, CheckSquare, Square } from 'lucide-react';

interface UserManagerProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  branches: Branch[];
  onAudit: any;
  currentUserId?: string;
  setGlobalConfirm: (modal: any) => void;
  lang: Language;
}

const UserManager: React.FC<UserManagerProps> = ({ users, setUsers, branches, onAudit, currentUserId, setGlobalConfirm, lang }) => {
  const t = useTranslation(lang);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.MANAGER);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const activeUsers = users.filter(u => !u.deletedAt);

  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranchIds(prev => prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]);
  };

  const clearForm = () => {
    setUsername(''); setPassword(''); setRole(UserRole.MANAGER); setSelectedBranchIds([]); setEditingUserId(null);
  };

  const handleSubmit = () => {
    if (!username || !password) return;
    const now = new Date().toISOString();
    if (editingUserId) {
      setUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, username, password, role, assignedBranchIds: selectedBranchIds, updatedAt: now } : u));
      onAudit('UPDATE', 'USER', editingUserId, `${t('update')}: ${username}`);
    } else {
      const newId = Date.now().toString();
      setUsers(prev => [...prev, { id: newId, username, password, role, assignedBranchIds: selectedBranchIds, updatedAt: now }]);
      onAudit('CREATE', 'USER', newId, `${t('add_new')}: ${username}`);
    }
    clearForm();
  };

  return (
    <div className="space-y-6">
      <div className={`bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 shadow-sm transition-all ${editingUserId ? 'border-indigo-500' : 'dark:border-slate-800 border-slate-100'}`}>
        <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-8">
          <Users className="w-5 h-5 text-indigo-500" /> {editingUserId ? `${t('edit')}: ${username}` : t('user_man')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder={t('username')} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700 font-bold text-sm" />
          <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('password')} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700 font-bold text-sm" />
          <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700 font-bold text-sm">
            <option value={UserRole.SUPER_ADMIN}>SUPER ADMIN</option>
            <option value={UserRole.ADMIN}>ADMIN</option>
            <option value={UserRole.MANAGER}>MANAGER</option>
            <option value={UserRole.VIEWER}>VIEWER</option>
          </select>
        </div>
        {(role === UserRole.MANAGER || role === UserRole.VIEWER) && (
          <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed dark:border-slate-700">
            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-4">{t('assign_branch')}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {branches.filter(b => !b.deletedAt).map(b => (
                <button key={b.id} type="button" onClick={() => toggleBranchSelection(b.id)} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${selectedBranchIds.includes(b.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}>
                  {selectedBranchIds.includes(b.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  <span className="font-black text-[10px] truncate uppercase">{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <button onClick={handleSubmit} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest">{editingUserId ? t('update') : t('confirm')}</button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs font-bold">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 uppercase tracking-widest border-b dark:border-slate-800">
            <tr>
              <th className="px-8 py-5">{t('staff')}</th>
              <th className="px-8 py-5">{t('role')}</th>
              <th className="px-8 py-5 text-center">{t('action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {activeUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-8 py-5 font-black uppercase">{u.username}</td>
                <td className="px-8 py-5 uppercase text-[10px]">{u.role}</td>
                <td className="px-8 py-5 text-center">
                   <div className="flex justify-center gap-2">
                      <button onClick={() => { setEditingUserId(u.id); setUsername(u.username); setPassword(u.password); setRole(u.role); setSelectedBranchIds(u.assignedBranchIds); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-2 text-slate-300 hover:text-indigo-500"><Edit3 className="w-4 h-4" /></button>
                      {u.username !== 'admin' && <button onClick={() => { setGlobalConfirm({ title: t('delete'), message: `${t('delete')} ${u.username}?`, onConfirm: () => { setUsers(prev => prev.map(x => x.id === u.id ? {...x, deletedAt: new Date().toISOString()} : x)); setGlobalConfirm(null); } }); }} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManager;
