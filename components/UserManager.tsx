
import React, { useState } from 'react';
import { User, UserRole, Branch } from '../types';
import { Plus, Trash2, Users, Shield, ShieldCheck, ShieldAlert, KeyRound, Eye, EyeOff } from 'lucide-react';

interface UserManagerProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  branches: Branch[];
  onAudit: any;
}

const UserManager: React.FC<UserManagerProps> = ({ users, setUsers, branches, onAudit }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.MANAGER);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = () => {
    if (!username || !password) {
      alert("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
      return;
    }
    
    if (users.some(u => u.username === username)) {
      alert("Tên đăng nhập đã tồn tại!");
      return;
    }

    const newU: User = {
      id: Date.now().toString(),
      username,
      password,
      role,
      assignedBranchIds: branches.map(b => b.id)
    };
    
    setUsers([...users, newU]);
    onAudit('CREATE', 'USER', newU.id, `Thêm User: ${username} với quyền ${role}`);
    setUsername('');
    setPassword('');
  };

  const handleDelete = (id: string) => {
    const u = users.find(x => x.id === id);
    if (!u) return;
    
    if (u.username === 'admin') {
      alert("Không thể xóa tài khoản admin hệ thống!");
      return;
    }

    if (window.confirm(`Bạn có chắc muốn xóa user "${u.username}"?`)) {
      setUsers(users.filter(x => x.id !== id));
      onAudit('DELETE', 'USER', id, `Xóa User: ${u.username}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-4">
        <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-8">
          <Users className="w-5 h-5 text-indigo-500" /> Quản trị nhân viên
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Tên đăng nhập</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Username..." 
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-bold outline-none focus:border-indigo-500 dark:text-white transition-all" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mật khẩu khởi tạo</label>
            <div className="relative">
              <input 
                type="text" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Password..." 
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-bold outline-none focus:border-indigo-500 dark:text-white transition-all" 
              />
              <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Vai trò hệ thống</label>
            <select 
              value={role} 
              onChange={e => setRole(e.target.value as any)} 
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-bold outline-none cursor-pointer dark:text-white transition-all"
            >
              <option value={UserRole.SUPER_ADMIN}>SUPER ADMIN</option>
              <option value={UserRole.ADMIN}>ADMIN</option>
              <option value={UserRole.MANAGER}>MANAGER</option>
              <option value={UserRole.VIEWER}>VIEWER</option>
            </select>
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleAdd} 
              className="w-full h-[60px] bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
            >
              <Plus className="w-5 h-5" /> Thêm nhân viên
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black uppercase tracking-widest border-b dark:border-slate-800">
              <tr>
                <th className="px-8 py-5">Nhân viên</th>
                <th className="px-8 py-5">Mật khẩu</th>
                <th className="px-8 py-5">Quyền hạn</th>
                <th className="px-8 py-5">Chi nhánh</th>
                <th className="px-8 py-5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-5 font-black text-slate-800 dark:text-white text-sm">{u.username}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-mono tracking-wider bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg min-w-[80px] text-center">
                        {showPasswords[u.id] ? u.password : '••••••••'}
                      </span>
                      <button onClick={() => togglePassword(u.id)} className="p-1.5 text-slate-300 hover:text-indigo-500 transition-colors">
                        {showPasswords[u.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${u.role === UserRole.SUPER_ADMIN ? 'bg-rose-50 text-rose-500' : u.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-400'}`}>
                        {u.role === UserRole.SUPER_ADMIN ? <ShieldAlert className="w-4 h-4" /> : u.role === UserRole.ADMIN ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </div>
                      <span className={`uppercase tracking-widest text-[10px] font-black ${u.role === UserRole.SUPER_ADMIN ? 'text-rose-600' : 'text-slate-600 dark:text-slate-300'}`}>
                        {u.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    {u.assignedBranchIds.length} chi nhánh
                  </td>
                  <td className="px-8 py-5 text-center">
                     {u.username !== 'admin' && (
                       <button onClick={() => handleDelete(u.id)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all">
                         <Trash2 className="w-5 h-5" />
                       </button>
                     )}
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
