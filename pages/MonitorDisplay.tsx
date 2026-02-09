import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Ticket, TicketStatus, ServiceCategory, Teller } from '../types';
import { Monitor, Volume2, Info, LayoutGrid, Clock, VolumeX, ChevronRight } from 'lucide-react';
import { announceTicket } from '../services/geminiService';

interface Props {
  tickets: Ticket[];
  categories: ServiceCategory[];
  tellers: Teller[];
}

const MonitorDisplay: React.FC<Props> = ({ tickets, categories, tellers }) => {
  const [lastAnnouncedId, setLastAnnouncedId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [manualAnnouncementQueue, setManualAnnouncementQueue] = useState<string[]>([]);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [activeUsers, setActiveUsers] = useState(8);
  
  // Refs
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const lastAnnouncedTicketRef = useRef<string | null>(null);
  const audioEnabledRef = useRef(false);
  const announcementInProgressRef = useRef(false);
  const ticketsRef = useRef<Ticket[]>(tickets);

  // Update refs when state changes
  useEffect(() => {
    audioEnabledRef.current = isAudioEnabled;
    ticketsRef.current = tickets;
  }, [isAudioEnabled, tickets]);

  // Real-time clock update
  useEffect(() => {
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Process manual announcement queue
  useEffect(() => {
    if (manualAnnouncementQueue.length > 0 && !isAnnouncing) {
      const ticketId = manualAnnouncementQueue[0];
      const ticket = tickets.find(t => t.id === ticketId);
      
      if (ticket) {
        setIsAnnouncing(true);
        announceTicket(ticket.number, ticket.counterNumber || 0)
          .then(() => {
            setLastAnnouncedId(ticketId);
            setTimeout(() => setLastAnnouncedId(null), 10000);
          })
          .finally(() => {
            setIsAnnouncing(false);
            setManualAnnouncementQueue(prev => prev.slice(1));
          });
      } else {
        setManualAnnouncementQueue(prev => prev.slice(1));
      }
    }
  }, [manualAnnouncementQueue, tickets, isAnnouncing]);

  // Detect new CALLING tickets - FIXED VERSION
  useEffect(() => {
    // Get currently calling tickets
    const callingTickets = tickets.filter(t => t.status === TicketStatus.CALLING);
    
    if (callingTickets.length === 0 || !audioEnabledRef.current) return;
    
    // Find the most recently called ticket
    const latestCalling = callingTickets.sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0))[0];
    
    // Check if this is a new announcement (not the same as last time)
    if (latestCalling && latestCalling.id !== lastAnnouncedTicketRef.current) {
      // Check if we're not already announcing
      if (!announcementInProgressRef.current) {
        announcementInProgressRef.current = true;
        lastAnnouncedTicketRef.current = latestCalling.id;
        
        // Announce the ticket
        announceTicket(latestCalling.number, latestCalling.counterNumber || 0)
          .then(() => {
            setLastAnnouncedId(latestCalling.id);
            setTimeout(() => {
              setLastAnnouncedId(null);
            }, 10000); // Highlight for 10 seconds
          })
          .finally(() => {
            announcementInProgressRef.current = false;
          });
      }
    }
  }, [tickets]); // Only depend on tickets changes

  const handleEnableAudio = () => {
    setIsAudioEnabled(true);
    if (typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
      }
    }
  };

  const handleDisableAudio = () => {
    setIsAudioEnabled(false);
    setManualAnnouncementQueue([]);
    setIsAnnouncing(false);
    announcementInProgressRef.current = false;
    lastAnnouncedTicketRef.current = null;
  };

  const handleManualAnnouncement = (ticketId: string) => {
    if (isAudioEnabled && !manualAnnouncementQueue.includes(ticketId)) {
      setManualAnnouncementQueue(prev => [...prev, ticketId]);
    }
  };

  // Get current serving ticket for each category
  const getServingForCategory = (categoryId: string) => {
    return tickets.find(t => 
      t.categoryId === categoryId && 
      (t.status === TicketStatus.CALLING || t.status === TicketStatus.SERVING)
    );
  };

  // Group tickets by category and get the next 2 upcoming per category
  const getUpcomingTicketsByCategory = () => {
    const upcomingByCategory: Record<string, Ticket[]> = {};
    
    categories.forEach(category => {
      const waitingTickets = tickets
        .filter(t => 
          t.categoryId === category.id && 
          t.status === TicketStatus.WAITING
        )
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, 2);
      
      if (waitingTickets.length > 0) {
        upcomingByCategory[category.id] = waitingTickets;
      }
    });
    
    return upcomingByCategory;
  };

  const upcomingByCategory = getUpcomingTicketsByCategory();
  const totalWaiting = Object.values(upcomingByCategory).flat().length;

  // If no categories are loaded, show a loading state
  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading service categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden relative font-sans">
      {/* Audio Activation Overlay */}
      {!isAudioEnabled && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center text-center p-4">
          <div className="bg-indigo-600 p-8 md:p-10 rounded-full mb-6 animate-pulse shadow-[0_0_60px_rgba(79,70,229,0.5)]">
            <Volume2 size={60} className="text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-4 tracking-tight">System Ready</h2>
          <p className="text-slate-400 max-w-md mb-8 text-lg leading-relaxed">
            Enable audio for live announcements
          </p>
          <button 
            onClick={handleEnableAudio}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black text-xl transition-all shadow-2xl active:scale-95 border-b-4 border-indigo-800"
          >
            ENABLE AUDIO
          </button>
        </div>
      )}

      {/* Header - Fixed Height */}
      <div className="bg-slate-900 px-4 py-3 md:px-6 md:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg relative">
            <Monitor size={28} className="text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                QueueMaster <span className="text-indigo-400">Pro</span>
              </h1>
              <div className="flex items-center gap-2">
                <span className="bg-red-500 text-xs font-black px-2 py-1 rounded animate-pulse">
                  SYSTEM ACTIVE
                </span>
                <span className="text-xs font-bold text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                  MONITOR SESSION
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Real-time status tracking
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl md:text-3xl font-black tabular-nums tracking-tighter text-indigo-400">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>REALTIME • {activeUsers} active users</span>
            </div>
          </div>
          
          {isAudioEnabled && (
            <button
              onClick={handleDisableAudio}
              className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full transition-colors border border-slate-700"
              title="Disable audio"
            >
              <VolumeX size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content - Fills Remaining Space */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Main Display: Category Cards - Scrolls if needed */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
            {categories.map(cat => {
              const serving = getServingForCategory(cat.id);
              const isCalling = serving?.id === lastAnnouncedId;
              const waitingCount = tickets.filter(t => 
                t.categoryId === cat.id && t.status === TicketStatus.WAITING
              ).length;
              
              return (
                <div 
                  key={cat.id} 
                  className={`relative rounded-2xl md:rounded-3xl border-4 transition-all duration-300 overflow-hidden flex flex-col min-h-[200px] md:min-h-[240px] ${
                    isCalling 
                    ? 'bg-white text-slate-900 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.3)]' 
                    : serving 
                      ? 'bg-slate-900 border-slate-800 text-white' 
                      : 'bg-slate-900/40 border-slate-900 text-slate-700'
                  }`}
                >
                  {/* Category Header */}
                  <div className={`px-4 py-3 md:px-6 md:py-4 flex items-center justify-between border-b ${
                    isCalling ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-800/50 border-slate-800'
                  }`}>
                    <span className={`text-sm font-black uppercase tracking-wide truncate ${isCalling ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {cat.name}
                    </span>
                    {isCalling && (
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    {serving ? (
                      <>
                        <div className="mb-2">
                           <span className={`text-xs font-bold uppercase tracking-wider ${isCalling ? 'text-slate-500' : 'text-slate-500'}`}>
                             Ticket Number
                           </span>
                           <h2 className={`text-5xl md:text-6xl font-black tracking-tighter leading-none ${isCalling ? 'text-slate-900' : 'text-white'}`}>
                             {serving.number}
                           </h2>
                        </div>
                        <div className={`mt-4 w-full py-3 rounded-xl md:rounded-2xl flex flex-col items-center border-2 ${
                          isCalling ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-slate-800 border-slate-700 text-indigo-400'
                        }`}>
                          <span className={`text-xs font-black uppercase tracking-wider opacity-80 mb-1`}>
                            Proceed to counter
                          </span>
                          <span className="text-3xl md:text-4xl font-black">{serving.counterNumber || '--'}</span>
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <div className="text-xs font-bold text-slate-500">
                            {waitingCount} more waiting
                          </div>
                          {isAudioEnabled && (
                            <button
                              onClick={() => handleManualAnnouncement(serving.id)}
                              disabled={manualAnnouncementQueue.includes(serving.id) || isAnnouncing}
                              className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {manualAnnouncementQueue.includes(serving.id) ? 'Queued...' : 'Announce'}
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-3 opacity-50">
                        <div className="w-16 h-16 rounded-full border-4 border-dashed border-slate-800 flex items-center justify-center">
                          <LayoutGrid size={24} className="text-slate-800" />
                        </div>
                        <div>
                          <p className="text-sm font-bold uppercase tracking-wider">Waiting for call</p>
                          <p className="text-xs mt-1">
                            {waitingCount > 0 
                              ? `${waitingCount} tickets waiting` 
                              : 'No tickets in queue'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar - Fixed Width, Scrollable Content */}
        <div className="lg:w-96 xl:w-[420px] border-t lg:border-l border-slate-800 bg-slate-900/50 flex flex-col flex-shrink-0">
          {/* Sidebar Header */}
          <div className="p-4 md:p-6 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">UP NEXT</h2>
              <div className="bg-indigo-600/20 text-indigo-400 text-xs font-black px-3 py-1 rounded-full border border-indigo-500/30">
                {totalWaiting} IN QUEUE
              </div>
            </div>
          </div>

          {/* Scrollable Upcoming Tickets - Fills Available Space */}
          <div 
            ref={sidebarContentRef}
            className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div className="space-y-6">
              {categories.map(category => {
                const upcomingTickets = upcomingByCategory[category.id] || [];
                const waitingCount = tickets.filter(t => 
                  t.categoryId === category.id && t.status === TicketStatus.WAITING
                ).length;

                if (upcomingTickets.length === 0) return null;

                return (
                  <div key={category.id} className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider truncate">
                        {category.name}
                      </h3>
                      <span className="text-xs font-bold text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
                        {waitingCount} waiting
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {upcomingTickets.map((ticket, index) => (
                        <div 
                          key={ticket.id} 
                          className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 group hover:bg-slate-800 transition-all duration-300"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                              index === 0 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-indigo-600/70 text-white'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg font-black text-white tracking-tight truncate">
                                {ticket.number}
                              </div>
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                NEXT IN {category.name}
                              </div>
                            </div>
                            {isAudioEnabled && index === 0 && (
                              <button
                                onClick={() => handleManualAnnouncement(ticket.id)}
                                disabled={manualAnnouncementQueue.includes(ticket.id) || isAnnouncing}
                                className="text-xs font-bold bg-indigo-600/30 hover:bg-indigo-500/40 text-indigo-300 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-500/20 flex-shrink-0"
                                title="Announce this ticket"
                              >
                                🔊
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {totalWaiting === 0 && (
                <div className="flex flex-col items-center justify-center text-slate-600 italic py-8">
                  <Info size={40} className="mb-3 opacity-20" />
                  <p className="text-center font-medium">Queue is empty</p>
                  <p className="text-xs text-slate-700 mt-1 text-center">
                    No upcoming tickets
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Bottom Section - Shows scrollbar when needed */}
          <div className="border-t border-slate-800 bg-slate-900/80 flex-shrink-0">
            {/* Wait Time Indicator */}
            <div className="p-4 md:p-6">
              <div className="bg-indigo-600 p-4 md:p-5 rounded-xl relative overflow-hidden">
                <p className="text-indigo-200 text-xs font-black uppercase tracking-wider mb-1">
                  Estimated Wait
                </p>
                <div className="text-3xl md:text-4xl font-black text-white tabular-nums tracking-tighter">
                  {Math.min(90, totalWaiting * 4)}
                  <span className="text-xl md:text-2xl ml-1 text-indigo-200">MIN</span>
                </div>
                <div className="mt-3 pt-3 border-t border-indigo-500/40 flex items-center gap-2 text-xs font-bold text-indigo-200 uppercase tracking-wider">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
                  LIVE CALCULATION
                </div>
              </div>
            </div>
            
            {/* Audio Status */}
            {isAudioEnabled && (
              <div className="p-4 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-emerald-400" />
                    <span className="text-sm font-bold text-slate-300">Announcements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAnnouncing && (
                      <span className="text-xs font-bold text-amber-400 animate-pulse">Speaking...</span>
                    )}
                    {manualAnnouncementQueue.length > 0 && !isAnnouncing && (
                      <span className="text-xs font-bold text-indigo-400">
                        {manualAnnouncementQueue.length} queued
                      </span>
                    )}
                    {!isAnnouncing && manualAnnouncementQueue.length === 0 && (
                      <span className="text-xs font-bold text-emerald-400">Ready</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optional: Show scroll indicator when content overflows */}
      {sidebarContentRef.current && sidebarContentRef.current.scrollHeight > sidebarContentRef.current.clientHeight && (
        <div className="lg:hidden absolute bottom-4 right-4 text-xs text-slate-500 animate-bounce">
          <ChevronRight className="rotate-90" size={16} />
          <span>Scroll</span>
        </div>
      )}

      <style>{`
        /* Custom scrollbar styling */
        .overflow-y-auto {
          scrollbar-width: thin;
          scrollbar-color: rgba(99, 102, 241, 0.3) rgba(30, 41, 59, 0.1);
        }
        
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.1);
          border-radius: 3px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 3px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
        
        /* Ensure proper height calculation */
        .h-screen {
          height: 100vh;
          height: 100dvh; /* For mobile browsers */
        }
        
        .min-h-0 {
          min-height: 0;
        }
        
        /* Prevent layout shift */
        .flex-shrink-0 {
          flex-shrink: 0;
        }
        
        /* Smooth transitions */
        * {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default MonitorDisplay;