
import React, { useState } from 'react';
import { User, UserRole, Branch, Language } from '../types';
import { useTranslation } from '../i18n';
// Fix: Added missing AlertTriangle and MapPin icons to the import list
import { Plus, Trash2, Users, Edit3, X, CheckSquare, Square, ShieldCheck, UserPlus, Save, AlertTriangle, MapPin } from 'lucide-react';

interface UserManagerProps {
  users: User[];
  setUsers: (val: User[] | ((prev: User[]) => User[])) => void;
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
  const [error, setError] = useState('');

  const activeUsers = users.filter(u => !u.deletedAt);
  const activeBranches = branches.filter(b => !b.deletedAt);

  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranchIds(prev => prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]);
  };

  const clearForm = () => {
    setUsername(''); 
    setPassword(''); 
    setRole(UserRole.MANAGER); 
    setSelectedBranchIds([]); 
    setEditingUserId(null);
    setError('');
  };

  const handleEdit = (u: User) => {
    setEditingUserId(u.id);
    setUsername(u.username);
    setPassword(u.password);
    setRole(u.role);
    setSelectedBranchIds(u.assignedBranchIds || []);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = () => {
    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('Vui lòng nhập đủ tên và mật khẩu');
      return;
    }

    // Kiểm tra trùng username (trừ khi đang sửa chính user đó)
    const isDuplicate = activeUsers.some(u => 
      u.username.toLowerCase() === trimmedUser && u.id !== editingUserId
    );
    if (isDuplicate) {
      setError('Tên người dùng đã tồn tại');
      return;
    }

    const now = new Date().toISOString();
    
    if (editingUserId) {
      setUsers(prev => prev.map(u => 
        u.id === editingUserId 
          ? { ...u, username: trimmedUser, password: trimmedPass, role, assignedBranchIds: (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) ? [] : selectedBranchIds, updatedAt: now } 
          : u
      ));
      onAudit('UPDATE', 'USER', editingUserId, `Cập nhật tài khoản: ${trimmedUser}`);
    } else {
      const newId = Date.now().toString();
      setUsers(prev => [...prev, { 
        id: newId, 
        username: trimmedUser, 
        password: trimmedPass, 
        role, 
        assignedBranchIds: (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) ? [] : selectedBranchIds, 
        updatedAt: now 
      }]);
      onAudit('CREATE', 'USER', newId, `Tạo tài khoản mới: ${trimmedUser}`);
    }
    clearForm();
  };

  const handleDelete = (u: User) => {
    if (u.username === 'admin') {
      alert('Không thể xóa tài khoản hệ thống!');
      return;
    }
    if (u.id === currentUserId) {
      alert('Không thể tự xóa tài khoản của chính mình!');
      return;
    }

    setGlobalConfirm({
      show: true,
      title: t('delete'),
      message: `${t('delete')} ${u.username}?`,
      onConfirm: () => {
        setUsers(prev => prev.map(x => x.id === u.id ? { ...x, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : x));
        onAudit('DELETE', 'USER', u.id, `Xóa tài khoản: ${u.username}`);
        if (editingUserId === u.id) clearForm();
        setGlobalConfirm(null);
      }
    });
  };

  return (
    <div className="space-y-8 animate-ios pb-10">
      {/* User Form */}
      <div className={`bg-white dark:bg-slate-950 p-6 sm:p-10 rounded-[3rem] border-2 shadow-soft transition-all ${editingUserId ? 'border-indigo-500 ring-4 ring-indigo-500/5' : 'dark:border-slate-800 border-slate-100'}`}>
        <div className="flex justify-between items-center mb-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                 {editingUserId ? <Edit3 className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest dark:text-white leading-none mb-1">
                   {editingUserId ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phân quyền hệ thống</p>
              </div>
           </div>
           {editingUserId && (
             <button onClick={clearForm} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500"><X className="w-5 h-5" /></button>
           )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs font-bold">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('username')}</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full p-4.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 dark:border-slate-800 border-slate-100 font-bold outline-none focus:border-indigo-500 transition-all text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('password')}</label>
            <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-4.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 dark:border-slate-800 border-slate-100 font-bold outline-none focus:border-indigo-500 transition-all text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{t('role')}</label>
            <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full p-4.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 dark:border-slate-800 border-slate-100 font-black outline-none focus:border-indigo-500 transition-all text-[11px] uppercase">
              <option value={UserRole.SUPER_ADMIN}>SUPER ADMIN</option>
              <option value={UserRole.ADMIN}>ADMIN</option>
              <option value={UserRole.MANAGER}>MANAGER</option>
              <option value={UserRole.VIEWER}>VIEWER</option>
            </select>
          </div>
        </div>

        {(role === UserRole.MANAGER || role === UserRole.VIEWER) && (
          <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4 ml-2">
               <MapPin className="w-4 h-4 text-indigo-600" />
               <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t('assign_branch')}</label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {activeBranches.map(b => (
                <button key={b.id} type="button" onClick={() => toggleBranchSelection(b.id)} className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all active-scale ${selectedBranchIds.includes(b.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}>
                  {selectedBranchIds.includes(b.id) ? <CheckSquare className="w-4.5 h-4.5" /> : <Square className="w-4.5 h-4.5" />}
                  <span className="font-black text-[10px] truncate uppercase tracking-tight">{b.name}</span>
                </button>
              ))}
              {activeBranches.length === 0 && <p className="col-span-full text-center text-[10px] font-bold text-slate-400 py-4 uppercase italic">Chưa có chi nhánh nào khả dụng</p>}
            </div>
          </div>
        )}

        <button onClick={handleSubmit} className="w-full h-16 bg-slate-950 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-vivid active-scale transition-all flex items-center justify-center gap-3">
           <Save className="w-5 h-5" /> {editingUserId ? t('update') : t('confirm')}
        </button>
      </div>

      {/* User Table List */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 dark:border-slate-800 border-slate-50 overflow-hidden shadow-soft">
        <div className="px-8 py-5 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
           <Users className="w-5 h-5 text-slate-400" />
           <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Danh sách nhân sự ({activeUsers.length})</h4>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs font-bold">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 uppercase tracking-widest border-b dark:border-slate-800">
              <tr>
                <th className="px-8 py-5">Tài khoản</th>
                <th className="px-8 py-5">Quyền hạn</th>
                <th className="px-8 py-5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {activeUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-5">
                     <div className="flex flex-col">
                        <span className="font-black dark:text-white uppercase tracking-tight flex items-center gap-2">
                           {u.username}
                           {u.id === currentUserId && <span className="px-1.5 py-0.5 bg-brand-100 dark:bg-brand-900 text-brand-600 text-[8px] rounded-md">BẠN</span>}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Pass: {u.password}</span>
                     </div>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-4 h-4 ${u.role.includes('ADMIN') ? 'text-brand-600' : 'text-slate-400'}`} />
                        <span className="uppercase text-[10px] dark:text-slate-300">{u.role}</span>
                     </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                     <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(u)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl active-scale hover:bg-brand-600 hover:text-white transition-all"><Edit3 className="w-4 h-4" /></button>
                        {u.username !== 'admin' && (
                          <button onClick={() => handleDelete(u)} className="p-3 bg-slate-100 dark:bg-slate-800 text-rose-500 rounded-xl active-scale hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                        )}
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManager;
