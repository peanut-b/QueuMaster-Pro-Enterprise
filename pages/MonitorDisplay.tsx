
import React, { useEffect, useState, useRef } from 'react';
import { Ticket, TicketStatus, ServiceCategory } from '../types';
// Fixed: Added Clock to lucide-react imports to resolve the "Cannot find name 'Clock'" error.
import { Monitor, Volume2, ArrowRight, Info, LayoutGrid, Clock } from 'lucide-react';
import { announceTicket } from '../services/geminiService';

interface Props {
  tickets: Ticket[];
}

const MonitorDisplay: React.FC<Props> = ({ tickets }) => {
  const [lastAnnouncedId, setLastAnnouncedId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const lastTicketRef = useRef<string | null>(null);
  
  useEffect(() => {
    const savedCats = localStorage.getItem('q_categories');
    if (savedCats) setCategories(JSON.parse(savedCats));
  }, []);

  // Real-time clock update
  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Detect new "Calling" tickets and auto-announce immediately
  useEffect(() => {
    const latestCalling = [...tickets]
      .filter(t => t.status === TicketStatus.CALLING)
      .sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0))[0];
    
    if (latestCalling && latestCalling.id !== lastTicketRef.current) {
      lastTicketRef.current = latestCalling.id;
      setLastAnnouncedId(latestCalling.id);
      
      // Auto-announce if audio is enabled - triggered instantly
      if (isAudioEnabled) {
        announceTicket(latestCalling.number, latestCalling.counterNumber || 0);
      }
      
      const timer = setTimeout(() => setLastAnnouncedId(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [tickets, isAudioEnabled]);

  const handleEnableAudio = () => {
    setIsAudioEnabled(true);
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctx.resume();
  };

  // Get current serving ticket for each category
  const getServingForCategory = (categoryId: string) => {
    return tickets.find(t => 
      t.categoryId === categoryId && 
      (t.status === TicketStatus.CALLING || t.status === TicketStatus.SERVING)
    );
  };

  const upNextTickets = tickets.filter(t => t.status === TicketStatus.WAITING).slice(0, 12);

  return (
    <div className="min-h-full bg-slate-950 text-white flex flex-col overflow-hidden relative font-sans">
      {/* Audio Activation Overlay */}
      {!isAudioEnabled && (
        <div className="absolute inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center text-center p-6">
          <div className="bg-indigo-600 p-10 rounded-full mb-8 animate-pulse shadow-[0_0_60px_rgba(79,70,229,0.5)]">
            <Volume2 size={80} className="text-white" />
          </div>
          <h2 className="text-5xl font-black mb-6 tracking-tight">System Ready</h2>
          <p className="text-slate-400 max-w-lg mb-10 text-xl leading-relaxed">
            Please enable audio to hear live ticket announcements and counter calls.
          </p>
          <button 
            onClick={handleEnableAudio}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-16 py-6 rounded-2xl font-black text-2xl transition-all shadow-2xl active:scale-95 flex items-center gap-4 border-b-4 border-indigo-800"
          >
            START MONITOR
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 px-12 py-8 flex justify-between items-center shadow-2xl border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-8">
          <div className="bg-indigo-600 p-4 rounded-3xl shadow-lg relative">
            <Monitor size={40} className="text-white" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black tracking-tighter uppercase text-white">Live Service Board</h1>
              <span className="bg-red-500 text-xs font-black px-3 py-1 rounded-md animate-pulse">SYSTEM ACTIVE</span>
            </div>
            <p className="text-slate-400 text-lg font-medium mt-1">Real-time status tracking for all service categories</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-5xl font-black tabular-nums tracking-tighter text-indigo-400">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            {now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Main Display: Category Cards */}
        <div className="col-span-9 p-8 bg-slate-950 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {categories.map(cat => {
              const serving = getServingForCategory(cat.id);
              const isCalling = serving?.id === lastAnnouncedId;
              
              return (
                <div 
                  key={cat.id} 
                  className={`relative rounded-[2.5rem] border-4 transition-all duration-500 overflow-hidden flex flex-col min-h-[320px] ${
                    isCalling 
                    ? 'bg-white text-slate-900 border-indigo-500 scale-[1.02] shadow-[0_0_100px_rgba(99,102,241,0.4)] z-10' 
                    : serving 
                      ? 'bg-slate-900 border-slate-800 text-white' 
                      : 'bg-slate-900/40 border-slate-900 text-slate-700'
                  }`}
                >
                  {/* Category Header */}
                  <div className={`px-8 py-5 flex items-center justify-between border-b ${
                    isCalling ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-800/50 border-slate-800'
                  }`}>
                    <span className={`text-sm font-black uppercase tracking-[0.2em] ${isCalling ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {cat.name}
                    </span>
                    {isCalling && (
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce"></span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    {serving ? (
                      <>
                        <div className="mb-2">
                           <span className={`text-xs font-bold uppercase tracking-widest ${isCalling ? 'text-slate-500' : 'text-slate-500'}`}>Ticket Number</span>
                           <h2 className={`text-8xl font-black tracking-tighter leading-none ${isCalling ? 'text-slate-900' : 'text-white'}`}>
                             {serving.number}
                           </h2>
                        </div>
                        <div className={`mt-6 w-full py-4 rounded-2xl flex flex-col items-center border-2 ${
                          isCalling ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-slate-800 border-slate-700 text-indigo-400'
                        }`}>
                          <span className={`text-[10px] font-black uppercase tracking-widest opacity-80 mb-1`}>Proceed to counter</span>
                          <span className="text-4xl font-black">{serving.counterNumber || '--'}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-4 opacity-50">
                        <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-800 flex items-center justify-center">
                          <LayoutGrid size={32} className="text-slate-800" />
                        </div>
                        <p className="text-sm font-bold uppercase tracking-widest">Waiting for call</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Up Next */}
        <div className="col-span-3 bg-slate-900/50 p-8 border-l border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white tracking-tight">UP NEXT</h2>
            <div className="bg-indigo-600/20 text-indigo-400 text-xs font-black px-3 py-1 rounded-full border border-indigo-500/30">
              {upNextTickets.length} IN QUEUE
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
            {upNextTickets.map((ticket, index) => {
              const cat = categories.find(c => c.id === ticket.categoryId);
              return (
                <div 
                  key={ticket.id} 
                  className="bg-slate-800/40 p-5 rounded-3xl border border-slate-800 flex items-center justify-between group hover:bg-slate-800 transition-all duration-300"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-slate-400 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white tracking-tight leading-none mb-1">{ticket.number}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{cat?.name}</div>
                    </div>
                  </div>
                  <ArrowRight size={18} className="text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
              );
            })}
            {upNextTickets.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 italic">
                <Info size={40} className="mb-4 opacity-20" />
                <p className="text-center font-medium">Queue is empty</p>
              </div>
            )}
          </div>

          {/* Wait Time Indicator */}
          <div className="mt-8 bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
              <Clock size={80} />
            </div>
            <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-2">Estimated Wait</p>
            <div className="text-5xl font-black text-white tabular-nums tracking-tighter">
              {Math.min(90, upNextTickets.length * 4)}<span className="text-2xl ml-1 text-indigo-200">MIN</span>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-500/40 flex items-center gap-2 text-[10px] font-bold text-indigo-200 uppercase tracking-widest">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
              Average calc live
            </div>
          </div>
        </div>
      </div>

      {/* Marquee Footer */}
      <div className="bg-indigo-600 py-4 border-t border-indigo-500/50 overflow-hidden whitespace-nowrap">
        <div className="animate-marquee inline-block text-white font-black text-sm uppercase tracking-[0.4em] opacity-90">
          • COUNTERS 1-20 ARE CURRENTLY OPERATIONAL • PLEASE PROCEED TO YOUR DESIGNATED COUNTER UPON ANNOUNCEMENT • ENSURE ALL DOCUMENTS ARE READY FOR A FASTER SERVICE • 
          • COUNTERS 1-20 ARE CURRENTLY OPERATIONAL • PLEASE PROCEED TO YOUR DESIGNATED COUNTER UPON ANNOUNCEMENT • ENSURE ALL DOCUMENTS ARE READY FOR A FASTER SERVICE • 
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.2);
        }
      `}</style>
    </div>
  );
};

export default MonitorDisplay;
