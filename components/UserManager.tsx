
import React, { useState } from 'react';
import { User, UserRole, Branch } from '../types';
import { Plus, Trash2, Users, Shield, ShieldCheck, ShieldAlert, KeyRound, Eye, EyeOff, MapPin, CheckSquare, Square } from 'lucide-react';

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
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const togglePassword = (id: string) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleBranchSelection = (branchId: string) => {
    setSelectedBranchIds(prev => 
      prev.includes(branchId) 
        ? prev.filter(id => id !== branchId) 
        : [...prev, branchId]
    );
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

    if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN && selectedBranchIds.length === 0) {
      alert("Vui lòng gán ít nhất một chi nhánh cho quản lý/nhân viên!");
      return;
    }

    const newU: User = {
      id: Date.now().toString(),
      username,
      password,
      role,
      // Super Admin và Admin luôn có quyền với tất cả chi nhánh
      assignedBranchIds: (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) 
        ? branches.map(b => b.id) 
        : selectedBranchIds
    };
    
    setUsers([...users, newU]);
    onAudit('CREATE', 'USER', newU.id, `Thêm User: ${username} với quyền ${role}, gán ${newU.assignedBranchIds.length} chi nhánh`);
    setUsername('');
    setPassword('');
    setSelectedBranchIds([]);
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
          <Users className="w-5 h-5 text-indigo-500" /> Quản trị & Phân quyền Chi nhánh
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
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
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mật khẩu</label>
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
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Vai trò</label>
            <select 
              value={role} 
              onChange={e => setRole(e.target.value as any)} 
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 font-bold outline-none cursor-pointer dark:text-white transition-all"
            >
              <option value={UserRole.SUPER_ADMIN}>SUPER ADMIN (Toàn quyền)</option>
              <option value={UserRole.ADMIN}>ADMIN (Toàn quyền chi nhánh)</option>
              <option value={UserRole.MANAGER}>MANAGER (Quản lý chi nhánh)</option>
              <option value={UserRole.VIEWER}>VIEWER (Chỉ xem dữ liệu)</option>
            </select>
          </div>
        </div>

        {/* Branch Assignment Section */}
        {(role === UserRole.MANAGER || role === UserRole.VIEWER) && (
          <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-2 block mb-4">Gán chi nhánh quản lý</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {branches.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBranchSelection(b.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${selectedBranchIds.includes(b.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 hover:border-indigo-300'}`}
                >
                  {selectedBranchIds.includes(b.id) ? <CheckSquare className="w-5 h-5 shrink-0" /> : <Square className="w-5 h-5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-black text-[11px] truncate uppercase leading-none">{b.name}</p>
                    <p className={`text-[8px] font-bold mt-1 truncate ${selectedBranchIds.includes(b.id) ? 'text-indigo-100' : 'text-slate-400'}`}>{b.address}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <button 
          onClick={handleAdd} 
          className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          <Plus className="w-5 h-5" /> Lưu & Tạo nhân viên
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-black uppercase tracking-widest border-b dark:border-slate-800">
              <tr>
                <th className="px-8 py-5">Nhân viên</th>
                <th className="px-8 py-5">Mật khẩu</th>
                <th className="px-8 py-5">Quyền hạn</th>
                <th className="px-8 py-5">Chi nhánh gán</th>
                <th className="px-8 py-5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 dark:text-white text-sm uppercase">{u.username}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">ID: {u.id.slice(-6)}</span>
                    </div>
                  </td>
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
                  <td className="px-8 py-5">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN) ? (
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 text-[8px] font-black uppercase rounded-full border border-emerald-100 dark:border-emerald-800">TẤT CẢ ({branches.length})</span>
                      ) : (
                        u.assignedBranchIds.map(bid => {
                          const bName = branches.find(b => b.id === bid)?.name || 'N/A';
                          return (
                            <span key={bid} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 text-[8px] font-black uppercase rounded-full border border-indigo-100 dark:border-indigo-800 whitespace-nowrap">
                              {bName}
                            </span>
                          );
                        })
                      )}
                      {!(u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN) && u.assignedBranchIds.length === 0 && (
                        <span className="text-rose-400 italic text-[9px] font-bold">Chưa gán chi nhánh</span>
                      )}
                    </div>
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
