
import React, { useState } from 'react';
import { User, UserRole, Branch } from '../types';
import { Plus, Trash2, Users, Shield, ShieldCheck, ShieldAlert, KeyRound, Eye, EyeOff, MapPin, CheckSquare, Square, Edit3, X } from 'lucide-react';

interface UserManagerProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  branches: Branch[];
  onAudit: any;
  currentUserId?: string;
  setGlobalConfirm: (modal: any) => void;
}

const UserManager: React.FC<UserManagerProps> = ({ users, setUsers, branches, onAudit, currentUserId, setGlobalConfirm }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.MANAGER);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const activeUsers = users.filter(u => !u.deletedAt);

  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranchIds(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId) 
        : [...prev, branchId]
    );
  };

  const clearForm = () => {
    setUsername('');
    setPassword('');
    setRole(UserRole.MANAGER);
    setSelectedBranchIds([]);
    setEditingUserId(null);
  };

  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setUsername(user.username);
    setPassword(user.password);
    setRole(user.role);
    setSelectedBranchIds(user.assignedBranchIds);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = () => {
    if (!username || !password) {
      alert("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
      return;
    }
    
    if (activeUsers.some(u => u.username === username && u.id !== editingUserId)) {
      alert("Tên đăng nhập đã tồn tại!");
      return;
    }

    const assignedIds = (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) 
      ? branches.filter(b => !b.deletedAt).map(b => b.id) 
      : selectedBranchIds;

    const now = new Date().toISOString();

    if (editingUserId) {
      setUsers(prevUsers => {
        const updated = prevUsers.map(u => 
          u.id === editingUserId 
            ? { ...u, username, password, role, assignedBranchIds: assignedIds, updatedAt: now } 
            : u
        );
        onAudit('UPDATE', 'USER', editingUserId, `Cập nhật User: ${username}`);
        return updated;
      });
      setEditingUserId(null);
    } else {
      const newId = Date.now().toString();
      const newU: User = {
        id: newId,
        username,
        password,
        role,
        assignedBranchIds: assignedIds,
        updatedAt: now
      };
      setUsers(prevUsers => {
        onAudit('CREATE', 'USER', newId, `Thêm User: ${username}`);
        return [...prevUsers, newU];
      });
    }
    clearForm();
  };

  const handleDelete = (id: string) => {
    const userToDelete = users.find(x => x.id === id);
    if (!userToDelete) return;
    
    if (userToDelete.username === 'admin') {
      alert("Không thể xóa tài khoản hệ thống!");
      return;
    }

    setGlobalConfirm({
      show: true,
      title: "Xóa tài khoản",
      message: `Xóa vĩnh viễn quyền truy cập của "${userToDelete.username}"?`,
      onConfirm: () => {
        const now = new Date().toISOString();
        setUsers(prevUsers => {
          const updated = prevUsers.map(x => x.id === id ? { ...x, deletedAt: now, updatedAt: now } : x);
          onAudit('DELETE', 'USER', id, `Xóa User: ${userToDelete.username}`);
          return updated;
        });
        if (editingUserId === id) clearForm();
        setGlobalConfirm(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className={`bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border-2 shadow-sm transition-all duration-300 ${editingUserId ? 'border-indigo-500' : 'dark:border-slate-800 border-slate-100'}`}>
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
            <Users className={`w-5 h-5 ${editingUserId ? 'text-indigo-600' : 'text-indigo-500'}`} /> 
            {editingUserId ? `Sửa: ${username}` : 'Quản trị nhân sự'}
          </h3>
          {editingUserId && (
            <button onClick={clearForm} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase">Hủy</button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700 font-bold outline-none focus:border-indigo-500 text-sm" />
          <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700 font-bold outline-none focus:border-indigo-500 text-sm" />
          <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border dark:border-slate-700 font-bold outline-none cursor-pointer text-sm">
            <option value={UserRole.SUPER_ADMIN}>SUPER ADMIN</option>
            <option value={UserRole.ADMIN}>ADMIN</option>
            <option value={UserRole.MANAGER}>MANAGER</option>
            <option value={UserRole.VIEWER}>VIEWER</option>
          </select>
        </div>

        {(role === UserRole.MANAGER || role === UserRole.VIEWER) && (
          <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2 block mb-4">Gán chi nhánh</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {branches.filter(b => !b.deletedAt).map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBranchSelection(b.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${selectedBranchIds.includes(b.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
                >
                  {selectedBranchIds.includes(b.id) ? <CheckSquare className="w-5 h-5 shrink-0" /> : <Square className="w-5 h-5 shrink-0" />}
                  <span className="font-black text-[11px] truncate uppercase">{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleSubmit} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
          {editingUserId ? 'Lưu thay đổi' : 'Tạo mới tài khoản'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black uppercase tracking-widest border-b dark:border-slate-800">
              <tr>
                <th className="px-8 py-5">Nhân viên</th>
                <th className="px-8 py-5">Quyền hạn</th>
                <th className="px-8 py-5">Chi nhánh</th>
                <th className="px-8 py-5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {activeUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-8 py-5 font-black text-sm uppercase">{u.username}</td>
                  <td className="px-8 py-5 uppercase text-[10px] font-black">{u.role}</td>
                  <td className="px-8 py-5">
                    <div className="flex flex-wrap gap-1">
                      {(u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN) ? (
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-[8px] font-black uppercase rounded-full border border-emerald-100">TẤT CẢ</span>
                      ) : (
                        u.assignedBranchIds.map(bid => {
                          const bName = branches.find(b => b.id === bid)?.name || 'N/A';
                          return <span key={bid} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded-full">{bName}</span>;
                        })
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => startEdit(u)} className="p-3 text-slate-300 hover:text-indigo-500 rounded-xl transition-all"><Edit3 className="w-5 h-5" /></button>
                      {u.username !== 'admin' && u.id !== currentUserId && (
                        <button onClick={() => handleDelete(u.id)} className="p-3 text-slate-300 hover:text-rose-500 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
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
