
import React, { useState } from 'react';
import { Ticket, ServiceCategory, TicketStatus } from '../types';
import { Printer, Users, Clock, CheckCircle2, Plus, Edit2, Trash2, X, Check } from 'lucide-react';

interface Props {
  onIssue: (categoryId: string) => void;
  categories: ServiceCategory[];
  tickets: Ticket[];
  lastIssuedTicket: Ticket | null;
  onAddCategory: (cat: Omit<ServiceCategory, 'id'>) => void;
  onUpdateCategory: (cat: ServiceCategory) => void;
  onDeleteCategory: (id: string) => void;
}

const ReceptionDashboard: React.FC<Props> = ({ 
  onIssue, 
  categories, 
  tickets, 
  lastIssuedTicket,
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingCat, setEditingCat] = useState<Partial<ServiceCategory> | null>(null);

  const handleIssue = (id: string) => {
    onIssue(id);
  };

  const openAdd = () => {
    setEditingCat({ name: '', prefix: '', color: 'blue', estimatedTime: 5 });
    setIsEditing(true);
  };

  const openEdit = (e: React.MouseEvent, cat: ServiceCategory) => {
    e.stopPropagation();
    setEditingCat(cat);
    setIsEditing(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteCategory(id);
  };

  const saveCategory = () => {
    if (!editingCat?.name || !editingCat?.prefix) return;
    if (editingCat.id) {
      onUpdateCategory(editingCat as ServiceCategory);
    } else {
      onAddCategory(editingCat as Omit<ServiceCategory, 'id'>);
    }
    setIsEditing(false);
  };

  const waitingCount = tickets.filter(t => t.status === TicketStatus.WAITING).length;
  const servingCount = tickets.filter(t => t.status === TicketStatus.SERVING || t.status === TicketStatus.CALLING).length;
  const completedCount = tickets.filter(t => t.status === TicketStatus.COMPLETED).length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Category Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">{editingCat?.id ? 'Edit Category' : 'Add New Category'}</h3>
              <button onClick={() => setIsEditing(false)}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Name</label>
                <input 
                  type="text" 
                  value={editingCat?.name} 
                  onChange={e => setEditingCat({...editingCat, name: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Prefix</label>
                  <input 
                    type="text" 
                    maxLength={1}
                    value={editingCat?.prefix} 
                    onChange={e => setEditingCat({...editingCat, prefix: e.target.value.toUpperCase()})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Est. Time (Min)</label>
                  <input 
                    type="number" 
                    value={editingCat?.estimatedTime} 
                    onChange={e => setEditingCat({...editingCat, estimatedTime: parseInt(e.target.value)})} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Color</label>
                <select 
                  value={editingCat?.color} 
                  onChange={e => setEditingCat({...editingCat, color: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="purple">Purple</option>
                  <option value="orange">Orange</option>
                  <option value="indigo">Indigo</option>
                </select>
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setIsEditing(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">Cancel</button>
              <button onClick={saveCategory} className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2">
                <Check size={18} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><Users size={24} /></div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Currently Waiting</p>
              <h3 className="text-2xl font-bold">{waitingCount} People</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-lg text-amber-600"><Clock size={24} /></div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Now Serving</p>
              <h3 className="text-2xl font-bold">{servingCount} People</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600"><CheckCircle2 size={24} /></div>
            <div>
              <p className="text-slate-500 text-sm font-medium">Served Today</p>
              <h3 className="text-2xl font-bold">{completedCount}</h3>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Service Categories</h2>
              <button onClick={openAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 transition-all">
                <Plus size={18} /> Add Category
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map(cat => {
                const categoryTickets = tickets.filter(t => t.categoryId === cat.id);
                const waiting = categoryTickets.filter(t => t.status === TicketStatus.WAITING).length;
                const serving = categoryTickets.filter(t => t.status === TicketStatus.SERVING || t.status === TicketStatus.CALLING).length;
                
                return (
                  <div 
                    key={cat.id} 
                    onClick={() => handleIssue(cat.id)}
                    className="group relative overflow-hidden bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 transition-all hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div 
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg transition-transform group-hover:rotate-6`} 
                        style={{ backgroundColor: cat.color === 'blue' ? '#2563eb' : cat.color === 'green' ? '#16a34a' : cat.color === 'purple' ? '#9333ea' : cat.color === 'orange' ? '#ea580c' : '#4f46e5' }}
                      >
                        {cat.prefix}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={(e) => openEdit(e, cat)} className="p-2.5 bg-white text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm border border-slate-100"><Edit2 size={16} /></button>
                        <button onClick={(e) => handleDelete(e, cat.id)} className="p-2.5 bg-white text-slate-400 hover:text-red-600 rounded-xl shadow-sm border border-slate-100"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-black text-xl text-slate-800 tracking-tight">{cat.name}</h4>
                      <p className="text-slate-500 text-sm mt-1 font-medium">{cat.estimatedTime} min service avg.</p>
                      <div className="flex gap-4 mt-3 text-xs font-bold">
                        <span className="text-blue-600">{waiting} waiting</span>
                        <span className="text-amber-600">{serving} serving</span>
                      </div>
                    </div>
                    <div className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest group-hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
                      <Printer size={16} /> Issue {cat.prefix} Ticket
                    </div>
                  </div>
                );
              })}
              {categories.length === 0 && (
                <div className="col-span-2 py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
                  <Plus size={48} className="mb-4 opacity-20" />
                  <p className="font-bold">No categories defined</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden sticky top-24">
            <div className="bg-indigo-600 p-5 text-white text-center">
              <h3 className="font-black uppercase tracking-widest text-sm">Last Ticket Issued</h3>
            </div>
            <div className="p-8 flex flex-col items-center gap-6">
              {lastIssuedTicket ? (
                <>
                  <div className="text-slate-400 text-xs tracking-widest uppercase font-black">Ticket ID</div>
                  <div className="text-7xl font-black text-slate-900 tracking-tighter tabular-nums">
                    {lastIssuedTicket.number}
                  </div>
                  <div className="p-6 bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200 shadow-inner">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(lastIssuedTicket.number)}`} 
                      alt="QR Code" 
                      className="w-48 h-48 object-contain mix-blend-multiply" 
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xl font-black text-slate-800">
                      {categories.find(c => c.id === lastIssuedTicket.categoryId)?.name || 'General'}
                    </p>
                    <p className="text-slate-500 text-sm font-bold">
                      {new Date(lastIssuedTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Please keep this ticket for reference
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>QueueMaster Ticket - ${lastIssuedTicket.number}</title>
                              <style>
                                body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                                .ticket-number { font-size: 72px; font-weight: bold; margin: 20px 0; }
                                .category { font-size: 24px; color: #666; margin-bottom: 30px; }
                                .timestamp { font-size: 18px; color: #999; }
                                .qr-code { margin: 30px auto; }
                                .instructions { margin-top: 30px; font-size: 16px; color: #555; }
                              </style>
                            </head>
                            <body>
                              <h1>QueueMaster Pro</h1>
                              <div class="ticket-number">${lastIssuedTicket.number}</div>
                              <div class="category">${categories.find(c => c.id === lastIssuedTicket.categoryId)?.name || 'General Service'}</div>
                              <div class="timestamp">${new Date(lastIssuedTicket.createdAt).toLocaleString()}</div>
                              <div class="qr-code">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(lastIssuedTicket.number)}" alt="QR Code">
                              </div>
                              <div class="instructions">
                                Please proceed to the waiting area and listen for announcements.<br>
                                Your ticket number will be called when a counter is available.
                              </div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.focus();
                        printWindow.print();
                      }
                    }} 
                    className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all active:scale-95 shadow-xl"
                  >
                    <Printer size={20} /> Print Now
                  </button>
                </>
              ) : (
                <div className="py-16 text-center text-slate-300 flex flex-col items-center justify-center">
                  <div className="bg-slate-50 p-8 rounded-full mb-6">
                    <Printer size={64} className="opacity-20" />
                  </div>
                  <p className="font-black uppercase tracking-widest text-sm max-w-[150px]">Select a category to issue ticket</p>
                  <p className="text-slate-400 text-xs mt-2">No tickets issued yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionDashboard;
