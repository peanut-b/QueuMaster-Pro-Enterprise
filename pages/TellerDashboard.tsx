import React from 'react';
import { Teller, Ticket, TicketStatus, ServiceCategory } from '../types';
import { User, Play, CheckCircle, SkipForward, History, BarChart3, AlertCircle, Briefcase, ChevronDown, Volume2 } from 'lucide-react';

interface Props {
  teller: Teller;
  tickets: Ticket[];
  categories: ServiceCategory[];
  onCall: () => void;
  onUpdate: (id: string, status: TicketStatus) => void;
  onAnnounce?: () => void; // New prop for manual announcement
}

const TellerDashboard: React.FC<Props> = ({ teller, tickets, categories, onCall, onUpdate, onAnnounce }) => {
  const currentTicket = tickets.find(t => t.id === teller.currentTicketId);
  const eligibleWaiting = tickets.filter(t => 
    t.status === TicketStatus.WAITING && 
    teller.assignedCategoryIds.includes(t.categoryId)
  );
  
  // Get only the 3 most recent completed tickets
  const recentCompleted = tickets
    .filter(t => t.tellerId === teller.id && t.status === TicketStatus.COMPLETED)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 3);
  
  const allCompleted = tickets
    .filter(t => t.tellerId === teller.id && t.status === TicketStatus.COMPLETED)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  const handleCall = () => onCall();
  const handleStartServing = () => currentTicket && onUpdate(currentTicket.id, TicketStatus.SERVING);
  const handleComplete = () => currentTicket && onUpdate(currentTicket.id, TicketStatus.COMPLETED);
  const handleNoShow = () => currentTicket && onUpdate(currentTicket.id, TicketStatus.NOSHOW);
  const handleAnnounce = () => {
    if (onAnnounce && currentTicket) {
      onAnnounce();
    }
  };

  const assignedCategories = categories.filter(c => teller.assignedCategoryIds.includes(c.id));

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 lg:gap-8 min-h-0">
          {/* Main Service Area */}
          <div className="lg:col-span-8 h-full">
            <div className="bg-white rounded-2xl md:rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
              <div className="bg-slate-900 text-white p-4 md:p-6 lg:p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="bg-slate-800 p-3 md:p-4 rounded-xl md:rounded-2xl shadow-inner border border-slate-700">
                      <User size={24} className="text-indigo-400 md:w-8 md:h-8" />
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] font-black text-indigo-400 uppercase tracking-widest opacity-80">
                        Welcome back, {teller.name}
                      </div>
                      <h2 className="text-xl md:text-2xl font-black tracking-tight leading-none mb-1">
                        Counter {teller.counterNumber}
                      </h2>
                      <div className="text-slate-400 text-xs font-medium mb-3">Service Desk Active</div>
                      
                      {/* Assigned Categories Display */}
                      <div className="flex flex-wrap gap-1 md:gap-2">
                        <div className="flex items-center gap-1 px-1.5 py-0.5 md:px-2 md:py-1 bg-indigo-500/20 rounded-lg border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider text-indigo-300">
                          <Briefcase size={10} className="md:w-3 md:h-3" /> Duties:
                        </div>
                        {assignedCategories.map(cat => (
                          <span key={cat.id} className="px-1.5 py-0.5 md:px-2.5 md:py-1 bg-slate-800 text-[10px] font-bold uppercase text-slate-300 rounded-lg border border-slate-700 flex items-center gap-1 md:gap-2">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color === 'blue' ? '#2563eb' : cat.color === 'green' ? '#16a34a' : cat.color === 'purple' ? '#9333ea' : cat.color === 'orange' ? '#ea580c' : '#4f46e5' }} />
                            <span className="truncate max-w-[80px] md:max-w-none">{cat.name}</span>
                          </span>
                        ))}
                        {assignedCategories.length === 0 && (
                          <span className="px-2 py-1 bg-red-900/20 text-[10px] font-bold uppercase text-red-400 rounded-lg border border-red-900/30">
                            No duties assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 self-start md:self-auto">
                    <div className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1 md:gap-2 ${
                      teller.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${teller.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                      {teller.status}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-0">
                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
                  <BarChart3 size={300} className="md:w-400 md:h-400" />
                </div>

                {currentTicket ? (
                  <div className="w-full max-w-xl space-y-6 md:space-y-8 lg:space-y-10 relative z-10">
                    <div className="text-center space-y-3 md:space-y-4">
                      <div className="text-indigo-600 text-xs font-black tracking-[0.3em] uppercase">Current Engagement</div>
                      <h1 className="text-5xl md:text-7xl lg:text-9xl font-black text-slate-900 tracking-tighter tabular-nums drop-shadow-sm">
                        {currentTicket.number}
                      </h1>
                      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs font-black uppercase border border-slate-200">
                          {categories.find(c => c.id === currentTicket.categoryId)?.name}
                        </span>
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs font-black uppercase border border-indigo-100">
                          Status: {currentTicket.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                      {currentTicket.status === TicketStatus.CALLING && (
                        <>
                          <button 
                            onClick={handleStartServing} 
                            className="flex items-center justify-center gap-2 md:gap-3 bg-emerald-600 text-white py-3 md:py-4 lg:py-5 rounded-2xl md:rounded-3xl font-black text-base md:text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95"
                          >
                            <Play size={20} className="md:w-6 md:h-6" fill="currentColor" /> Start Serving
                          </button>
                          <button 
                            onClick={handleAnnounce}
                            disabled={!onAnnounce}
                            className={`flex items-center justify-center gap-2 md:gap-3 ${
                              onAnnounce 
                                ? 'bg-amber-500 text-white hover:bg-amber-600' 
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            } py-3 md:py-4 lg:py-5 rounded-2xl md:rounded-3xl font-black text-base md:text-lg transition-all shadow-xl shadow-amber-100 active:scale-95`}
                          >
                            <Volume2 size={20} className="md:w-6 md:h-6" /> Announce
                          </button>
                        </>
                      )}
                      {currentTicket.status === TicketStatus.SERVING && (
                        <>
                          <button 
                            onClick={handleComplete} 
                            className="flex items-center justify-center gap-2 md:gap-3 bg-indigo-600 text-white py-3 md:py-4 lg:py-5 rounded-2xl md:rounded-3xl font-black text-base md:text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                          >
                            <CheckCircle size={20} className="md:w-6 md:h-6" /> Complete
                          </button>
                          <button 
                            onClick={handleAnnounce}
                            disabled={!onAnnounce}
                            className={`flex items-center justify-center gap-2 md:gap-3 ${
                              onAnnounce 
                                ? 'bg-amber-500 text-white hover:bg-amber-600' 
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            } py-3 md:py-4 lg:py-5 rounded-2xl md:rounded-3xl font-black text-base md:text-lg transition-all shadow-xl shadow-amber-100 active:scale-95`}
                          >
                            <Volume2 size={20} className="md:w-6 md:h-6" /> Announce
                          </button>
                        </>
                      )}
                      <button 
                        onClick={handleNoShow} 
                        className="flex items-center justify-center gap-2 md:gap-3 bg-slate-100 text-slate-600 py-3 md:py-4 lg:py-5 rounded-2xl md:rounded-3xl font-black text-base md:text-lg hover:bg-slate-200 transition-all active:scale-95"
                      >
                        <SkipForward size={20} className="md:w-6 md:h-6" /> No-Show
                      </button>
                    </div>

                    <div className="text-center text-xs text-slate-500 font-medium pt-4">
                      Click "Announce" to play the beep sound
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-6 md:space-y-8 relative z-10">
                    <div className="bg-slate-100 w-32 h-32 md:w-48 md:h-48 rounded-2xl md:rounded-[3rem] flex items-center justify-center mx-auto border-4 border-white shadow-xl rotate-3">
                      <User size={48} className="text-slate-300 -rotate-3 md:w-20 md:h-20" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mb-2">Ready to assist?</h3>
                      <p className="text-slate-500 font-medium text-sm md:text-base">
                        There are {eligibleWaiting.length} customers in your assigned queues.
                      </p>
                    </div>
                    <button 
                      onClick={handleCall}
                      disabled={eligibleWaiting.length === 0}
                      className={`flex items-center justify-center gap-3 md:gap-4 px-8 md:px-16 py-4 md:py-5 lg:py-6 rounded-2xl md:rounded-3xl font-black text-lg md:text-2xl transition-all shadow-2xl group border-b-4 ${
                        eligibleWaiting.length > 0 
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 border-indigo-800' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300'
                      }`}
                    >
                      <Play fill="currentColor" size={20} className="md:w-7 md:h-7 group-hover:translate-x-1 transition-transform" />
                      CALL NEXT
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side Info Panel - Fixed Height */}
          <div className="lg:col-span-4 h-full flex flex-col min-h-0">
            {/* Session History Card - Fixed Height with Scroll */}
            <div className="bg-white rounded-2xl md:rounded-[2rem] shadow-sm border border-slate-200 p-4 md:p-6 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="font-black text-xs uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                  <History size={14} className="text-indigo-500 md:w-4 md:h-4" /> Recent History
                </h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                  {allCompleted.length} total
                </span>
              </div>
              
              {/* Scrollable History Area - Shows only 3 most recent */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 md:pr-2">
                <div className="space-y-3 md:space-y-4">
                  {recentCompleted.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 group hover:border-emerald-200 hover:bg-emerald-50/50 transition-all">
                      <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-700 flex-shrink-0">
                          {t.number[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-lg md:text-xl text-slate-800 tracking-tight truncate">
                            {t.number}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">
                            {categories.find(c => c.id === t.categoryId)?.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Served</div>
                        <div className="text-[10px] text-slate-400 font-bold">
                          {new Date(t.completedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {recentCompleted.length === 0 && (
                    <div className="py-8 md:py-12 text-center flex flex-col items-center gap-3 md:gap-4 opacity-20">
                      <History size={40} className="md:w-16 md:h-16" />
                      <p className="font-bold text-sm md:text-base">No history yet</p>
                      <p className="text-xs text-slate-400">Completed tickets will appear here</p>
                    </div>
                  )}

                  {/* Optional: Show view all button if there are more than 3 */}
                  {allCompleted.length > 3 && (
                    <div className="pt-4 border-t border-slate-100">
                      <button className="w-full text-center text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center justify-center gap-1">
                        <span>View all {allCompleted.length} tickets</span>
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Workstation Guide Card - Fixed at bottom */}
            <div className="mt-4 md:mt-6 bg-indigo-600 rounded-2xl md:rounded-[2rem] p-4 md:p-6 text-white shadow-xl shadow-indigo-100 flex-shrink-0">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <AlertCircle size={16} className="text-indigo-200 md:w-5 md:h-5" />
                <h4 className="font-black text-xs uppercase tracking-widest">Workstation Guide</h4>
              </div>
              <p className="text-indigo-100 text-xs md:text-sm leading-relaxed">
                You can handle <strong>{assignedCategories.length}</strong> service categories. 
                Contact Admin for duty changes.
              </p>
              <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-indigo-500/40">
                <div className="flex items-center justify-between text-[10px] md:text-xs">
                  <span className="font-bold text-indigo-200">Queue Status:</span>
                  <span className={`font-black ${eligibleWaiting.length > 0 ? 'text-emerald-300' : 'text-indigo-300'}`}>
                    {eligibleWaiting.length} waiting
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] md:text-xs mt-1">
                  <span className="font-bold text-indigo-200">Announcement:</span>
                  <span className="font-black text-amber-300">Manual Only</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Custom scrollbar for history */
        .overflow-y-auto {
          scrollbar-width: thin;
          scrollbar-color: rgba(99, 102, 241, 0.3) rgba(241, 245, 249, 0.1);
        }
        
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(241, 245, 249, 0.1);
          border-radius: 2px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 2px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
        
        /* Ensure proper height calculation */
        .h-screen {
          height: 100vh;
          height: 100dvh;
        }
        
        .min-h-0 {
          min-height: 0;
        }
        
        .flex-shrink-0 {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
};

export default TellerDashboard;