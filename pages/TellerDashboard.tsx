
import React from 'react';
import { Teller, Ticket, TicketStatus, ServiceCategory } from '../types';
import { User, Play, CheckCircle, SkipForward, Clock, History, BarChart3, AlertCircle, Briefcase } from 'lucide-react';
import { announceTicket } from '../services/geminiService';

interface Props {
  teller: Teller;
  tickets: Ticket[];
  categories: ServiceCategory[];
  onCall: () => void;
  onUpdate: (id: string, status: TicketStatus) => void;
}

const TellerDashboard: React.FC<Props> = ({ teller, tickets, categories, onCall, onUpdate }) => {
  const currentTicket = tickets.find(t => t.id === teller.currentTicketId);
  const eligibleWaiting = tickets.filter(t => 
    t.status === TicketStatus.WAITING && 
    teller.assignedCategoryIds.includes(t.categoryId)
  );
  
  const handleCall = () => onCall();
  const handleStartServing = () => currentTicket && onUpdate(currentTicket.id, TicketStatus.SERVING);
  const handleComplete = () => currentTicket && onUpdate(currentTicket.id, TicketStatus.COMPLETED);
  const handleNoShow = () => currentTicket && onUpdate(currentTicket.id, TicketStatus.NOSHOW);
  const handleAnnounce = () => currentTicket && announceTicket(currentTicket.number, teller.counterNumber);

  const assignedCategories = categories.filter(c => teller.assignedCategoryIds.includes(c.id));

  return (
    <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Main Service Area */}
      <div className="lg:col-span-8">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col min-h-[600px]">
          <div className="bg-slate-900 text-white p-8">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-6">
                <div className="bg-slate-800 p-4 rounded-2xl shadow-inner border border-slate-700">
                  <User size={32} className="text-indigo-400" />
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-black text-indigo-400 uppercase tracking-widest opacity-80">Welcome back, {teller.name}</div>
                  <h2 className="text-2xl font-black tracking-tight leading-none mb-1">Counter {teller.counterNumber}</h2>
                  <div className="text-slate-400 text-xs font-medium mb-3">Service Desk Active</div>
                  
                  {/* Prominent Assigned Categories Display */}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/20 rounded-lg border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider text-indigo-300">
                      <Briefcase size={12} /> My Duties:
                    </div>
                    {assignedCategories.map(cat => (
                      <span key={cat.id} className="px-2.5 py-1 bg-slate-800 text-[10px] font-bold uppercase text-slate-300 rounded-lg border border-slate-700 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color === 'blue' ? '#2563eb' : cat.color === 'green' ? '#16a34a' : cat.color === 'purple' ? '#9333ea' : cat.color === 'orange' ? '#ea580c' : '#4f46e5' }} />
                        {cat.name}
                      </span>
                    ))}
                    {assignedCategories.length === 0 && (
                      <span className="px-2.5 py-1 bg-red-900/20 text-[10px] font-bold uppercase text-red-400 rounded-lg border border-red-900/30">
                        No duties assigned
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
                  teller.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${teller.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                  {teller.status}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 p-12 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
              <BarChart3 size={400} />
            </div>

            {currentTicket ? (
              <div className="w-full max-w-xl space-y-10 relative z-10">
                <div className="text-center space-y-4">
                  <div className="text-indigo-600 text-xs font-black tracking-[0.3em] uppercase">Current Engagement</div>
                  <h1 className="text-9xl font-black text-slate-900 tracking-tighter tabular-nums drop-shadow-sm">
                    {currentTicket.number}
                  </h1>
                  <div className="flex items-center justify-center gap-3">
                    <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-xs font-black uppercase border border-slate-200">
                      {categories.find(c => c.id === currentTicket.categoryId)?.name}
                    </span>
                    <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase border border-indigo-100">
                      Status: {currentTicket.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {currentTicket.status === TicketStatus.CALLING && (
                    <button 
                      onClick={handleStartServing} 
                      className="flex items-center justify-center gap-3 bg-emerald-600 text-white py-5 rounded-3xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95"
                    >
                      <Play size={24} fill="currentColor" /> Start Serving
                    </button>
                  )}
                  {currentTicket.status === TicketStatus.SERVING && (
                    <button 
                      onClick={handleComplete} 
                      className="flex items-center justify-center gap-3 bg-indigo-600 text-white py-5 rounded-3xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                    >
                      <CheckCircle size={24} /> Complete Service
                    </button>
                  )}
                  <button 
                    onClick={handleNoShow} 
                    className="flex items-center justify-center gap-3 bg-slate-100 text-slate-600 py-5 rounded-3xl font-black text-lg hover:bg-slate-200 transition-all active:scale-95"
                  >
                    <SkipForward size={24} /> Mark No-Show
                  </button>
                </div>

                <button 
                  onClick={handleAnnounce} 
                  className="w-full flex items-center justify-center gap-4 bg-slate-900 text-white py-5 rounded-3xl font-black text-xl hover:bg-slate-800 transition-all shadow-2xl active:scale-95 group border-b-4 border-slate-950"
                >
                  <Clock size={24} className="group-hover:rotate-12 transition-transform" />
                  Voice Call Now
                </button>
              </div>
            ) : (
              <div className="text-center space-y-8 relative z-10">
                <div className="bg-slate-100 w-48 h-48 rounded-[3rem] flex items-center justify-center mx-auto border-4 border-white shadow-xl rotate-3">
                  <User size={80} className="text-slate-300 -rotate-3" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Ready to assist?</h3>
                  <p className="text-slate-500 font-medium">There are {eligibleWaiting.length} customers in your assigned queues.</p>
                </div>
                <button 
                  onClick={handleCall}
                  disabled={eligibleWaiting.length === 0}
                  className={`flex items-center justify-center gap-4 px-16 py-6 rounded-3xl font-black text-2xl transition-all shadow-2xl group border-b-4 ${
                    eligibleWaiting.length > 0 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 border-indigo-800' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300'
                  }`}
                >
                  <Play fill="currentColor" size={28} className="group-hover:translate-x-1 transition-transform" />
                  CALL NEXT
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side Info Panel */}
      <div className="lg:col-span-4 space-y-6 flex flex-col">
        {/* Improved Counter History */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 flex-1">
           <h3 className="font-black text-xs uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-2">
            <History size={16} className="text-indigo-500" /> Session History
          </h3>
          <div className="space-y-4">
            {tickets.filter(t => t.tellerId === teller.id && t.status === TicketStatus.COMPLETED).slice(-12).reverse().map(t => (
              <div key={t.id} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-emerald-200 hover:bg-emerald-50/50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-700">
                    {t.number[0]}
                  </div>
                  <span className="font-black text-xl text-slate-800 tracking-tight">{t.number}</span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Served</div>
                  <div className="text-[10px] text-slate-400 font-bold">
                    {new Date(t.completedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {tickets.filter(t => t.tellerId === teller.id && t.status === TicketStatus.COMPLETED).length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-4 opacity-20">
                <History size={64} />
                <p className="font-bold">No history yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Informative Footer Card */}
        <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-100">
           <div className="flex items-center gap-3 mb-4">
              <AlertCircle size={20} className="text-indigo-200" />
              <h4 className="font-black text-xs uppercase tracking-widest">Workstation Guide</h4>
           </div>
           <p className="text-indigo-100 text-sm leading-relaxed">
             You are currently authorized to handle <strong>{assignedCategories.length}</strong> service categories. 
             If you need to change your duties, please contact the System Administrator.
           </p>
        </div>
      </div>
    </div>
  );
};

export default TellerDashboard;
