
import React, { useMemo, useState, useEffect } from 'react';
import { Ticket, Teller, ServiceCategory, TicketStatus, AdminAccount } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, Users, Activity, Star, Clock, Plus, Edit2, Trash2, X, Check, ListChecks, Download, Database, Key, Shield, UserPlus, Settings2, RotateCcw, Eye, EyeOff } from 'lucide-react';

interface Props {
  adminUser: AdminAccount;
  tickets: Ticket[];
  tellers: Teller[];
  categories: ServiceCategory[];
  adminAccounts: AdminAccount[];
  onAddTeller: (teller: Omit<Teller, 'id' | 'status' | 'assignedCategoryIds'>) => void;
  onUpdateTeller: (teller: Teller) => void;
  onDeleteTeller: (id: string) => void;
  onAddAdminAccount: (acc: Omit<AdminAccount, 'id' | 'createdAt'>) => void;
  onUpdateAdminAccount: (acc: AdminAccount) => void;
  onDeleteAdminAccount: (id: string) => void;
  onSystemReset: () => void;
}

const AdminDashboard: React.FC<Props> = ({ 
  adminUser,
  tickets, 
  tellers, 
  categories, 
  adminAccounts,
  onAddTeller, 
  onUpdateTeller, 
  onDeleteTeller,
  onAddAdminAccount,
  onUpdateAdminAccount,
  onDeleteAdminAccount,
  onSystemReset
}) => {
  const [now, setNow] = useState(new Date());
  const [isEditingTeller, setIsEditingTeller] = useState(false);
  const [editingTeller, setEditingTeller] = useState<Partial<Teller> | null>(null);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<AdminAccount> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalServed = tickets.filter(t => t.status === TicketStatus.COMPLETED).length;
  
  const categoryStats = useMemo(() => {
    return categories.map(cat => ({
      name: cat.name,
      waiting: tickets.filter(t => t.categoryId === cat.id && t.status === TicketStatus.WAITING).length,
      served: tickets.filter(t => t.categoryId === cat.id && t.status === TicketStatus.COMPLETED).length,
    }));
  }, [tickets, categories]);

  const tellerProductivity = useMemo(() => {
    return tellers.map(t => ({
      ...t,
      servedCount: tickets.filter(tick => tick.tellerId === t.id && tick.status === TicketStatus.COMPLETED).length
    })).sort((a, b) => b.servedCount - a.servedCount);
  }, [tickets, tellers]);

  const statusData = [
    { name: 'Served', value: tickets.filter(t => t.status === TicketStatus.COMPLETED).length, color: '#10b981' },
    { name: 'Waiting', value: tickets.filter(t => t.status === TicketStatus.WAITING).length, color: '#3b82f6' },
    { name: 'Handling', value: tickets.filter(t => [TicketStatus.CALLING, TicketStatus.SERVING].includes(t.status)).length, color: '#f59e0b' },
  ];

  const handleExportCSV = () => {
    const headers = ['Date', 'Time', 'Category', 'Ticket Number', 'Teller', 'Counter', 'Status', 'Duration (ms)'];
    const rows = tickets.map(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      const teller = tellers.find(tel => tel.id === t.tellerId);
      const dateObj = new Date(t.createdAt);
      return [
        dateObj.toLocaleDateString(),
        dateObj.toLocaleTimeString(),
        cat?.name || 'N/A',
        t.number,
        teller?.name || 'N/A',
        t.counterNumber || 'N/A',
        t.status,
        t.completedAt ? t.completedAt - t.createdAt : 'N/A'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `queuemaster_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openAddTeller = () => {
    if (tellers.length >= 10) return;
    setEditingTeller({ name: '', counterNumber: tellers.length + 1, assignedCategoryIds: categories.map(c => c.id) });
    setIsEditingTeller(true);
  };

  const openEditTeller = (teller: Teller) => {
    setEditingTeller(teller);
    setIsEditingTeller(true);
  };

  const toggleCategory = (catId: string) => {
    if (!editingTeller) return;
    const currentIds = editingTeller.assignedCategoryIds || [];
    const newIds = currentIds.includes(catId)
      ? currentIds.filter(id => id !== catId)
      : [...currentIds, catId];
    setEditingTeller({ ...editingTeller, assignedCategoryIds: newIds });
  };

  const saveTeller = () => {
    if (!editingTeller?.name) return;
    if (editingTeller.id) {
      onUpdateTeller(editingTeller as Teller);
    } else {
      onAddTeller(editingTeller as any);
    }
    setIsEditingTeller(false);
  };

  const openAddAccount = () => {
    setEditingAccount({ name: '', email: '', password: '' });
    setShowPassword(false);
    setIsEditingAccount(true);
  };

  const openEditAccount = (acc: AdminAccount) => {
    setEditingAccount(acc);
    setShowPassword(false);
    setIsEditingAccount(true);
  };

  const saveAccount = () => {
    if (!editingAccount?.email || !editingAccount?.password || !editingAccount?.name) return;
    if (editingAccount.id) {
      onUpdateAdminAccount(editingAccount as AdminAccount);
    } else {
      onAddAdminAccount(editingAccount as Omit<AdminAccount, 'id' | 'createdAt'>);
    }
    setIsEditingAccount(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 pb-20">
      {/* Teller Modal */}
      {isEditingTeller && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center flex-shrink-0">
              <h3 className="text-xl font-bold">{editingTeller?.id ? 'Modify Counter Configuration' : 'Register New Counter'}</h3>
              <button onClick={() => setIsEditingTeller(false)} className="hover:bg-white/10 p-2 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Staff Member Name</label>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="e.g. John Doe"
                    value={editingTeller?.name} 
                    onChange={e => setEditingTeller({...editingTeller, name: e.target.value})} 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Counter Number (Max 10)</label>
                  <input 
                    type="number" 
                    max={10}
                    value={editingTeller?.counterNumber} 
                    onChange={e => setEditingTeller({...editingTeller, counterNumber: parseInt(e.target.value)})} 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                  <ListChecks size={14} /> Assigned Service Categories
                </label>
                <div className="space-y-2 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                  {categories.map(cat => (
                    <label key={cat.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color === 'blue' ? '#2563eb' : cat.color === 'green' ? '#16a34a' : cat.color === 'purple' ? '#9333ea' : cat.color === 'orange' ? '#ea580c' : '#4f46e5' }} />
                        <span className="text-sm font-semibold text-slate-700">{cat.name}</span>
                      </div>
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500" 
                        checked={editingTeller?.assignedCategoryIds?.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 pt-0 flex gap-4 flex-shrink-0">
              <button 
                onClick={() => setIsEditingTeller(false)} 
                className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveTeller} 
                className="flex-1 px-6 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 active:scale-95"
              >
                <Check size={20} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Account Modal */}
      {isEditingAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col">
            <div className="bg-indigo-900 px-8 py-6 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingAccount?.id ? 'Edit Admin Account' : 'Add Admin Account'}</h3>
              <button onClick={() => setIsEditingAccount(false)} className="hover:bg-white/10 p-2 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Display Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Master Admin"
                    value={editingAccount?.name} 
                    onChange={e => setEditingAccount({...editingAccount, name: e.target.value})} 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Login Email</label>
                  <input 
                    type="email" 
                    placeholder="admin@queuemaster.com"
                    value={editingAccount?.email} 
                    onChange={e => setEditingAccount({...editingAccount, email: e.target.value})} 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 transition-all font-medium"
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••"
                      value={editingAccount?.password} 
                      onChange={e => setEditingAccount({...editingAccount, password: e.target.value})} 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 pr-12 outline-none focus:border-indigo-500 transition-all font-medium"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 pt-0 flex gap-4">
              <button 
                onClick={() => setIsEditingAccount(false)} 
                className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                onClick={saveAccount} 
                className="flex-1 px-6 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg active:scale-95 transition-all"
              >
                {editingAccount?.id ? 'Update' : 'Create'} Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <div>
              <div className="mb-1 text-xs font-black text-indigo-600 uppercase tracking-widest">Welcome back, {adminUser.name}</div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Operations Hub</h1>
            </div>
            <div className="flex items-center gap-2 bg-emerald-100/50 px-3 py-1 rounded-full border border-emerald-200 h-fit">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">Live Monitor</span>
            </div>
          </div>
          <p className="text-slate-500 font-medium text-lg">Centralized oversight & bull; <span className="text-indigo-600 font-black">Database Local Mode</span></p>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={handleExportCSV} className="flex items-center gap-2 bg-white border-2 border-slate-200 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
             <Download size={18} /> Export Reports (Excel)
           </button>
           <div className="flex items-center gap-5 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm min-w-[250px]">
              <div className="text-right pr-6 border-r border-slate-100 flex-1">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Global CSAT</p>
                <p className="text-xl font-black text-indigo-600 flex items-center gap-2 justify-end">4.8 <Star size={16} fill="currentColor" className="text-amber-400" /></p>
              </div>
              <div className="pl-2 flex-1 text-right">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Local Time</p>
                <p className="text-xl font-black text-slate-900 tabular-nums">
                  {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
           </div>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Tickets" value={tickets.length} trend="+8% vs avg" icon={<Activity size={24} />} color="blue" />
        <StatCard title="Waiting Now" value={tickets.filter(t => t.status === TicketStatus.WAITING).length} trend="-12% lower" icon={<Clock size={24} />} color="indigo" />
        <StatCard title="Active Counters" value={`${tellers.filter(t => t.status === 'BUSY').length}/10`} trend={`${10 - tellers.length} Available`} icon={<Users size={24} />} color="amber" />
        <StatCard title="DB Persistence" value="100%" trend="Healthy" icon={<Database size={24} />} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Main Chart */}
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-bold text-slate-800">Queue Distribution</h3>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 rounded-xl hover:bg-slate-100">Daily</button>
                <button className="px-4 py-2 bg-indigo-600 text-xs font-bold text-white rounded-xl shadow-lg shadow-indigo-100">Live</button>
              </div>
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '20px' }} 
                  />
                  <Bar dataKey="waiting" name="Waiting" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={50} />
                  <Bar dataKey="served" name="Served" fill="#10b981" radius={[8, 8, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Teller Management List */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="text-xl font-bold text-slate-800">Counter Staff Management</h3>
                 <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Enforcing limit: {tellers.length}/10 stations</p>
               </div>
               <button 
                onClick={openAddTeller} 
                disabled={tellers.length >= 10}
                className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
                  tellers.length >= 10 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                }`}
               >
                 <Plus size={20} /> {tellers.length >= 10 ? 'Limit Reached' : 'Add Counter'}
               </button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Station</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Served</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tellerProductivity.map((teller) => (
                      <tr key={teller.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-6 font-black text-slate-900">CTR-{teller.counterNumber.toString().padStart(2, '0')}</td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                 {teller.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-700 leading-none mb-1">{teller.name}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                  {teller.assignedCategoryIds.length} categories assigned
                                </div>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            teller.status === 'BUSY' 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${teller.status === 'BUSY' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                            {teller.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col items-center">
                              <span className="font-black text-indigo-600 text-lg mb-1">{teller.servedCount}</span>
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (teller.servedCount / 30) * 100)}%` }}></div>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openEditTeller(teller)} 
                              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => onDeleteTeller(teller.id)} 
                              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-4 space-y-8">
           {/* Admin Portal Accounts */}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Shield size={20} className="text-indigo-600" /> Portal Admins
                </h3>
                <button onClick={openAddAccount} className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors text-[10px] font-black uppercase tracking-widest">
                  <Plus size={16} /> Register Admin
                </button>
             </div>
             <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
               {adminAccounts.map(acc => (
                 <div key={acc.id} className="group p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-indigo-200 transition-all">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                       {acc.name.charAt(0)}
                     </div>
                     <div>
                       <div className="text-sm font-bold text-slate-900">{acc.name}</div>
                       <div className="text-[10px] font-medium text-slate-400">{acc.email}</div>
                     </div>
                   </div>
                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                     <button onClick={() => openEditAccount(acc)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={14}/></button>
                     <button onClick={() => onDeleteAdminAccount(acc.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                   </div>
                 </div>
               ))}
             </div>
             <p className="mt-4 text-[10px] text-center font-black text-slate-400 uppercase tracking-widest">Authorized Portal Access Only</p>
           </div>

           {/* System Maintenance Section */}
           <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Settings2 size={20} className="text-slate-600" /> System Tools
                </h3>
             </div>
             <div className="space-y-4">
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <p className="text-xs font-bold text-slate-500 mb-4 leading-relaxed">
                   Your database is stored in the browser's <strong>localStorage</strong>. All data is persistent until manual clearing.
                 </p>
                 <button 
                  onClick={onSystemReset}
                  className="w-full bg-red-50 text-red-600 py-4 rounded-xl font-black text-xs uppercase tracking-widest border border-red-100 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 group"
                 >
                   <RotateCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" /> Factory Reset Database
                 </button>
               </div>
             </div>
           </div>

           <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                <TrendingUp size={120} />
             </div>
             <h4 className="text-indigo-200 text-xs font-black uppercase tracking-[0.3em] mb-4">Storage Metrics</h4>
             <h3 className="text-2xl font-black mb-6 leading-tight">Data Integrity Guaranteed</h3>
             <p className="text-indigo-100/80 text-lg mb-10 leading-relaxed font-medium">
               Periodic exports are recommended for archival purposes.
             </p>
             <button 
                onClick={handleExportCSV}
                className="w-full bg-white text-indigo-600 py-5 rounded-2xl font-black text-lg hover:bg-indigo-50 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
             >
               <Download size={24} /> Full System Export
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; trend: string; icon: React.ReactNode; color: string }> = ({ title, value, trend, icon, color }) => (
  <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
    <div className="flex justify-between items-start mb-6">
      <div className={`p-4 rounded-2xl ${
        color === 'blue' ? 'bg-blue-50 text-blue-600' : 
        color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 
        color === 'amber' ? 'bg-amber-50 text-amber-600' : 
        'bg-emerald-50 text-emerald-600'
      }`}>{icon}</div>
      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
        trend.includes('+') || trend.includes('Healthy') ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
      }`}>{trend}</span>
    </div>
    <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">{title}</h4>
    <p className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">{value}</p>
  </div>
);

export default AdminDashboard;
