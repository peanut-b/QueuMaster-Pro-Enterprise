import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Monitor, 
  UserCircle, 
  ArrowRightCircle, 
  LogOut,
  Bell,
  Lock,
  Mail,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  UserPlus,
  ArrowLeft,
  Eye,
  EyeOff,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Role, Ticket, ServiceCategory, Teller, TicketStatus, AdminAccount } from './types';
import AdminDashboard from './pages/AdminDashboard';
import ReceptionDashboard from './pages/ReceptionDashboard';
import TellerDashboard from './pages/TellerDashboard';
import MonitorDisplay from './pages/MonitorDisplay';
import { realtimeService } from './services/RealtimeService';
import { broadcastAnnouncement } from './services/geminiService';

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(registration => {
      console.log('ServiceWorker registration successful');
    })
    .catch(err => {
      console.log('ServiceWorker registration failed: ', err);
    });
}

const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isTellerAuthenticated, setIsTellerAuthenticated] = useState(false);
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState<AdminAccount | null>(null);
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [isAdminRegistering, setIsAdminRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [clientCount, setClientCount] = useState<number>(0);
  const [lastIssuedTicket, setLastIssuedTicket] = useState<Ticket | null>(null);
  const [isPageVisible, setIsPageVisible] = useState(true);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regName, setRegName] = useState('');
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  
  // Daily reset tracker
  const [dailyResetTime, setDailyResetTime] = useState<number>(() => {
    const saved = localStorage.getItem('q_daily_reset_time');
    return saved ? parseInt(saved) : Date.now();
  });
  
  // Track ticket numbers per category for daily reset
  const [categoryCounters, setCategoryCounters] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('q_category_counters');
    return saved ? JSON.parse(saved) : {};
  });

  // Initialize with empty arrays - data will come from WebSocket server
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([
    { 
      id: 'admin-1', 
      email: 'admin@queuemaster.com', 
      password: 'admin123', 
      name: 'System Admin',
      createdAt: Date.now() 
    }
  ]);

  const [categories, setCategories] = useState<ServiceCategory[]>([
    { id: 'c1', name: 'General Inquiries', prefix: 'G', color: 'blue', estimatedTime: 5 },
    { id: 'c2', name: 'Cash Deposits', prefix: 'D', color: 'green', estimatedTime: 10 },
    { id: 'c3', name: 'Account Opening', prefix: 'A', color: 'purple', estimatedTime: 20 },
    { id: 'c4', name: 'Technical Support', prefix: 'T', color: 'orange', estimatedTime: 15 },
    { id: 'c5', name: 'Corporate Services', prefix: 'C', color: 'indigo', estimatedTime: 25 },
  ]);

  const [tellers, setTellers] = useState<Teller[]>(Array.from({ length: 5 }, (_, i) => ({
    id: `teller-${i + 1}`,
    name: `Teller ${i + 1}`,
    counterNumber: i + 1,
    status: 'ONLINE',
    assignedCategoryIds: ['c1', 'c2', 'c3', 'c4', 'c5']
  })).slice(0, 10));

  const [activeTellerId, setActiveTellerId] = useState<string>('');
  
  // Refs for keeping stable references
  const connectionStatusRef = useRef(connectionStatus);
  const ticketsRef = useRef(tickets);
  const categoriesRef = useRef(categories);
  const categoryCountersRef = useRef(categoryCounters);
  const lastIssuedTicketRef = useRef(lastIssuedTicket);

  // Update refs when state changes
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
    ticketsRef.current = tickets;
    categoriesRef.current = categories;
    categoryCountersRef.current = categoryCounters;
    lastIssuedTicketRef.current = lastIssuedTicket;
  }, [connectionStatus, tickets, categories, categoryCounters, lastIssuedTicket]);

  // Page visibility detection for keeping connection alive
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
      if (!document.hidden && connectionStatusRef.current === 'disconnected') {
        // Reconnect if page becomes visible and was disconnected
        realtimeService.reconnect();
      }
    };

    // Heartbeat to keep connection alive when page is not visible
    const heartbeatInterval = setInterval(() => {
      if (realtimeService.isConnected()) {
        // Send heartbeat to keep connection alive
        realtimeService.send({
          type: 'heartbeat',
          timestamp: Date.now()
        });
      }
    }, 30000); // Send heartbeat every 30 seconds

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
    };
  }, []);

  // Check for daily reset every hour
  useEffect(() => {
    const checkDailyReset = () => {
      const now = Date.now();
      const hoursElapsed = (now - dailyResetTime) / (1000 * 60 * 60);
      
      if (hoursElapsed >= 20) {
        performDailyReset();
      }
    };

    // Check every hour
    const resetCheckInterval = setInterval(checkDailyReset, 60 * 60 * 1000);
    
    // Initial check
    checkDailyReset();
    
    return () => clearInterval(resetCheckInterval);
  }, [dailyResetTime]);

  // Perform daily reset of ticket numbers
  const performDailyReset = () => {
    console.log('Performing daily reset of ticket numbers');
    
    // Reset category counters
    const resetCounters: Record<string, number> = {};
    categoriesRef.current.forEach(cat => {
      resetCounters[cat.id] = 0;
    });
    
    setCategoryCounters(resetCounters);
    localStorage.setItem('q_category_counters', JSON.stringify(resetCounters));
    
    // Update daily reset time
    const newResetTime = Date.now();
    setDailyResetTime(newResetTime);
    localStorage.setItem('q_daily_reset_time', newResetTime.toString());
    
    // Clear only waiting tickets (keep in-progress tickets)
    setTickets(prev => {
      const filteredTickets = prev.filter(ticket => 
        ticket.status === TicketStatus.CALLING || 
        ticket.status === TicketStatus.SERVING
      );
      
      // Broadcast the reset to other clients
      realtimeService.send({
        type: 'daily_reset',
        resetTime: newResetTime,
        tickets: filteredTickets
      });
      
      return filteredTickets;
    });
    
    // Notify all connected clients
    broadcastAnnouncement("System Note: Daily ticket numbers have been reset.", 0);
  };

  // Initialize realtime service listeners
  useEffect(() => {
    realtimeService.on('connected', () => {
      setConnectionStatus('connected');
      // Request full sync when connected
      realtimeService.requestSync();
    });

    realtimeService.on('disconnected', () => {
      setConnectionStatus('disconnected');
    });

    realtimeService.on('welcome', (data: any) => {
      setClientCount(data.clientCount || 0);
    });

    realtimeService.on('ticket_update', (ticket: Ticket) => {
      setTickets(prev => {
        const exists = prev.find(t => t.id === ticket.id);
        if (exists) {
          return prev.map(t => t.id === ticket.id ? { ...ticket, lastUpdated: Date.now() } : t);
        } else {
          return [...prev, { ...ticket, lastUpdated: Date.now() }];
        }
      });
      
      // Update last issued ticket if it's a new ticket
      if (!exists && ticket.status === TicketStatus.WAITING) {
        setLastIssuedTicket(ticket);
      }
    });

    realtimeService.on('teller_update', (teller: Teller) => {
      setTellers(prev => prev.map(t => t.id === teller.id ? teller : t));
    });

    realtimeService.on('category_update', (category: ServiceCategory) => {
      setCategories(prev => prev.map(c => c.id === category.id ? category : c));
    });

    realtimeService.on('admin_account_update', (account: AdminAccount) => {
      setAdminAccounts(prev => {
        const exists = prev.find(a => a.id === account.id);
        if (exists) {
          return prev.map(a => a.id === account.id ? account : a);
        } else {
          return [...prev, account];
        }
      });
    });

    realtimeService.on('sync', (data: any) => {
      if (data.tickets && Array.isArray(data.tickets)) {
        setTickets(data.tickets.map((t: Ticket) => ({ ...t, lastUpdated: t.lastUpdated || Date.now() })));
      }
      if (data.categories && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
      if (data.tellers && Array.isArray(data.tellers)) {
        setTellers(data.tellers);
      }
      if (data.adminAccounts && Array.isArray(data.adminAccounts)) {
        setAdminAccounts(data.adminAccounts);
      }
      if (data.dailyResetTime) {
        setDailyResetTime(data.dailyResetTime);
      }
      if (data.categoryCounters) {
        setCategoryCounters(data.categoryCounters);
      }
    });

    realtimeService.on('announce', (data: any) => {
      console.log('Remote announcement:', data);
    });

    realtimeService.on('connection_failed', (data: any) => {
      console.log('Connection failed after attempts:', data.attempts);
      setConnectionStatus('disconnected');
    });

    realtimeService.on('heartbeat', (data: any) => {
      // Acknowledge heartbeat
      if (realtimeService.isConnected()) {
        realtimeService.send({
          type: 'heartbeat_ack',
          timestamp: data.timestamp
        });
      }
    });

    realtimeService.on('daily_reset', (data: any) => {
      console.log('Received daily reset from server');
      setDailyResetTime(data.resetTime || Date.now());
      setCategoryCounters(data.categoryCounters || {});
      setTickets(data.tickets || []);
    });

    // Connect to WebSocket server with auto-reconnect
    realtimeService.connect();

    // Auto-reconnect when connection drops
    const autoReconnectInterval = setInterval(() => {
      if (!realtimeService.isConnected() && isPageVisible) {
        realtimeService.reconnect();
      }
    }, 5000);

    return () => {
      clearInterval(autoReconnectInterval);
      realtimeService.disconnect();
    };
  }, []);

  // Update connection status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const status = realtimeService.getConnectionStatus();
      setConnectionStatus(status);
      
      // If disconnected and page is visible, try to reconnect
      if (status === 'disconnected' && isPageVisible) {
        realtimeService.reconnect();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isPageVisible]);

  // Keep localStorage as backup only (not primary source)
  useEffect(() => {
    localStorage.setItem('q_tickets_backup', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('q_categories_backup', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('q_tellers_backup', JSON.stringify(tellers.slice(0, 10)));
  }, [tellers]);

  useEffect(() => {
    localStorage.setItem('q_admin_accounts_backup', JSON.stringify(adminAccounts));
  }, [adminAccounts]);

  // Save category counters
  useEffect(() => {
    localStorage.setItem('q_category_counters', JSON.stringify(categoryCounters));
  }, [categoryCounters]);

  // Save daily reset time
  useEffect(() => {
    localStorage.setItem('q_daily_reset_time', dailyResetTime.toString());
  }, [dailyResetTime]);

  // Broadcast changes to all connected clients via WebSocket
  const broadcastTicketUpdate = (ticket: Ticket) => {
    realtimeService.send({
      type: 'ticket_update',
      ticket: { ...ticket, lastUpdated: Date.now() }
    });
  };

  const broadcastTellerUpdate = (teller: Teller) => {
    realtimeService.send({
      type: 'teller_update',
      teller: teller
    });
  };

  const broadcastCategoryUpdate = (category: ServiceCategory) => {
    realtimeService.send({
      type: 'category_update',
      category: category
    });
  };

  const broadcastAdminAccountUpdate = (account: AdminAccount) => {
    realtimeService.send({
      type: 'admin_account_update',
      account: account
    });
  };

  const broadcastDailyReset = () => {
    realtimeService.send({
      type: 'daily_reset',
      resetTime: dailyResetTime,
      categoryCounters: categoryCounters
    });
  };

  const handleSystemReset = () => {
    if (confirm("WARNING: This will permanently delete all tickets, categories, and accounts from this browser. Continue?")) {
      localStorage.clear();
      // Clear local state
      setTickets([]);
      setCategories([]);
      setTellers([]);
      setAdminAccounts([{
        id: 'admin-1', 
        email: 'admin@queuemaster.com', 
        password: 'admin123', 
        name: 'System Admin',
        createdAt: Date.now() 
      }]);
      setLastIssuedTicket(null);
      
      // Reset daily counters
      const resetCounters: Record<string, number> = {};
      categories.forEach(cat => {
        resetCounters[cat.id] = 0;
      });
      setCategoryCounters(resetCounters);
      const newResetTime = Date.now();
      setDailyResetTime(newResetTime);
      
      alert("Local data cleared. Note: This only affects this browser. Other devices may still have data.");
    }
  };

  // Auth Handlers
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const account = adminAccounts.find(a => a.email === loginEmail && a.password === loginPass);
    if (account) {
      setAuthenticatedAdmin(account);
      setIsAdminAuthenticated(true);
    } else {
      alert('Invalid credentials. Check your email and password.');
    }
  };

  const handleAdminRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass || !regName) return;
    if (adminAccounts.find(a => a.email === loginEmail)) {
      alert("Email already exists.");
      return;
    }
    const newAcc: AdminAccount = {
      id: `admin-${Date.now()}`,
      email: loginEmail,
      password: loginPass,
      name: regName,
      createdAt: Date.now()
    };
    setAdminAccounts(prev => [...prev, newAcc]);
    broadcastAdminAccountUpdate(newAcc);
    setIsAdminRegistering(false);
    alert("Registration successful! Please login.");
  };

  const handleLogout = () => {
    setCurrentRole(null);
    setIsAdminAuthenticated(false);
    setIsTellerAuthenticated(false);
    setAuthenticatedAdmin(null);
    setLoginPass('');
    setLoginEmail('');
    setRegName('');
    setActiveTellerId('');
    setShowPassword(false);
  };

  const handleTellerLogin = () => {
    if (activeTellerId) {
      setIsTellerAuthenticated(true);
    } else {
      alert("Please select a counter station.");
    }
  };

  // Admin Account Handlers
  const handleAddAdminAccount = (acc: Omit<AdminAccount, 'id' | 'createdAt'>) => {
    const newAcc: AdminAccount = {
      ...acc,
      id: `admin-${Date.now()}`,
      createdAt: Date.now()
    };
    setAdminAccounts(prev => [...prev, newAcc]);
    broadcastAdminAccountUpdate(newAcc);
  };

  const handleUpdateAdminAccount = (acc: AdminAccount) => {
    setAdminAccounts(prev => prev.map(a => a.id === acc.id ? acc : a));
    broadcastAdminAccountUpdate(acc);
  };

  const handleDeleteAdminAccount = (id: string) => {
    if (adminAccounts.length <= 1) {
      alert("At least one admin account must exist.");
      return;
    }
    setAdminAccounts(prev => prev.filter(a => a.id !== id));
  };

  // Category Handlers
  const handleAddCategory = (cat: Omit<ServiceCategory, 'id'>) => {
    const newCat = { ...cat, id: `c-${Date.now()}` };
    setCategories(prev => [...prev, newCat]);
    broadcastCategoryUpdate(newCat);
    
    // Initialize counter for new category
    setCategoryCounters(prev => ({
      ...prev,
      [newCat.id]: 0
    }));
  };

  const handleUpdateCategory = (cat: ServiceCategory) => {
    setCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
    broadcastCategoryUpdate(cat);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setTellers(prev => prev.map(t => ({
      ...t,
      assignedCategoryIds: t.assignedCategoryIds.filter(cid => cid !== id)
    })));
    
    // Remove counter for deleted category
    setCategoryCounters(prev => {
      const newCounters = { ...prev };
      delete newCounters[id];
      return newCounters;
    });
    
    // Update tellers after category deletion
    tellers.forEach(teller => {
      if (teller.assignedCategoryIds.includes(id)) {
        const updatedTeller = {
          ...teller,
          assignedCategoryIds: teller.assignedCategoryIds.filter(cid => cid !== id)
        };
        broadcastTellerUpdate(updatedTeller);
      }
    });
  };

  // Teller Handlers (Strictly 10 limit)
  const handleAddTeller = (teller: Omit<Teller, 'id' | 'status' | 'assignedCategoryIds'>) => {
    if (tellers.length >= 10) return;
    const newTeller: Teller = {
      ...teller,
      id: `teller-${Date.now()}`,
      status: 'ONLINE',
      assignedCategoryIds: (teller as any).assignedCategoryIds || categories.map(c => c.id)
    };
    setTellers(prev => [...prev, newTeller].slice(0, 10));
    broadcastTellerUpdate(newTeller);
  };

  const handleUpdateTeller = (teller: Teller) => {
    setTellers(prev => prev.map(t => t.id === teller.id ? teller : t));
    broadcastTellerUpdate(teller);
  };

  const handleDeleteTeller = (id: string) => {
    setTellers(prev => prev.filter(t => t.id !== id));
  };

  // Generate unique ticket number for each category with daily reset
  const generateTicketNumber = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 'UNK-001';
    
    // Get current counter for this category
    const currentCount = categoryCounters[categoryId] || 0;
    const newCount = currentCount + 1;
    
    // Update counter
    setCategoryCounters(prev => ({
      ...prev,
      [categoryId]: newCount
    }));
    
    // Broadcast counter update
    realtimeService.send({
      type: 'counter_update',
      categoryId,
      count: newCount
    });
    
    return `${category.prefix}-${newCount.toString().padStart(3, '0')}`;
  };

  const handleIssueTicket = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    const newTicket: Ticket = {
      id: `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      number: generateTicketNumber(categoryId),
      categoryId,
      status: TicketStatus.WAITING,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      // Add daily identifier for tracking
      dailyIdentifier: `${new Date(dailyResetTime).toISOString().split('T')[0]}-${categoryId}`
    };
    
    setTickets(prev => [...prev, newTicket]);
    setLastIssuedTicket(newTicket);
    broadcastTicketUpdate(newTicket);
  };

  // In your App.tsx, replace the handleCallNext function:

const handleCallNext = (tellerId: string) => {
  const teller = tellers.find(t => t.id === tellerId);
  if (!teller) return;

  // Find the oldest waiting ticket for this teller's assigned categories
  const eligibleTickets = tickets
    .filter(t => 
      t.status === TicketStatus.WAITING && 
      teller.assignedCategoryIds.includes(t.categoryId)
    )
    .sort((a, b) => a.createdAt - b.createdAt); // Oldest first

  const nextTicket = eligibleTickets[0];
  if (!nextTicket) return;

  // Mark any other tickets that might be calling from same category as waiting
  const otherCallingTickets = tickets.filter(t => 
    t.status === TicketStatus.CALLING && 
    t.categoryId === nextTicket.categoryId &&
    t.id !== nextTicket.id
  );

  // Reset other calling tickets in same category
  otherCallingTickets.forEach(ticket => {
    const resetTicket = { 
      ...ticket, 
      status: TicketStatus.WAITING,
      tellerId: undefined,
      counterNumber: undefined,
      lastUpdated: Date.now()
    };
    broadcastTicketUpdate(resetTicket);
  });

  const updatedTicket = { 
    ...nextTicket, 
    status: TicketStatus.CALLING, 
    tellerId, 
    calledAt: Date.now(), 
    counterNumber: teller.counterNumber,
    lastUpdated: Date.now()
  };
  
  setTickets(prev => prev.map(t => 
    t.id === nextTicket.id ? updatedTicket : 
    otherCallingTickets.some(ot => ot.id === t.id) ? { ...t, status: TicketStatus.WAITING } : t
  ));

  setTellers(prev => prev.map(t => 
    t.id === tellerId ? { ...t, status: 'BUSY', currentTicketId: nextTicket.id } : t
  ));

  // Broadcast updates
  broadcastTicketUpdate(updatedTicket);
  broadcastTellerUpdate({ ...teller, status: 'BUSY', currentTicketId: nextTicket.id });
  
  // Broadcast announcement to all clients ONLY ONCE
  broadcastAnnouncement(nextTicket.number, teller.counterNumber);
};

  const handleUpdateStatus = (ticketId: string, status: TicketStatus) => {
    const now = Date.now();
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        const updated = status === TicketStatus.COMPLETED 
          ? { ...t, status, completedAt: now, lastUpdated: now }
          : { ...t, status, lastUpdated: now };
        broadcastTicketUpdate(updated);
        return updated;
      }
      return t;
    }));
    
    if (status === TicketStatus.COMPLETED || status === TicketStatus.NOSHOW) {
      setTellers(prev => prev.map(t => {
        if (t.currentTicketId === ticketId) {
          const updated = { ...t, status: 'ONLINE', currentTicketId: undefined };
          broadcastTellerUpdate(updated);
          return updated;
        }
        return t;
      }));
    }
  };

  // Manual daily reset function (can be called from admin panel)
  const handleManualDailyReset = () => {
    if (confirm("Reset all ticket numbers for today? This will keep ongoing transactions but reset counters for new tickets.")) {
      performDailyReset();
      alert("Ticket numbers have been reset for the day.");
    }
  };

  // Role Selection View
  if (!currentRole) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-5xl font-black text-slate-900 mb-2 tracking-tighter">QueueMaster <span className="text-indigo-600 italic">Enterprise</span></h1>
            <p className="text-slate-600 font-medium text-lg">Next-generation workflow optimization for high-traffic centers</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                connectionStatus === 'connected' 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                  : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}>
                {connectionStatus === 'connected' ? <Wifi size={12} /> : <WifiOff size={12} />}
                {connectionStatus === 'connected' ? `Realtime (${clientCount} users)` : 'Offline Mode'}
              </div>
              <div className="text-xs font-bold text-slate-500">
                Next reset in: {Math.max(0, Math.floor((20 - (Date.now() - dailyResetTime) / (1000 * 60 * 60))))}h
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <RoleCard title="Public Monitor" icon={<Monitor size={32} />} onClick={() => setCurrentRole(Role.MONITOR)} color="bg-indigo-600" />
            <RoleCard title="Reception Desk" icon={<ArrowRightCircle size={32} />} onClick={() => setCurrentRole(Role.RECEPTION)} color="bg-emerald-600" />
            <RoleCard title="Service Teller" icon={<UserCircle size={32} />} onClick={() => setCurrentRole(Role.TELLER)} color="bg-amber-600" />
            <RoleCard title="System Admin" icon={<ShieldCheck size={32} />} onClick={() => setCurrentRole(Role.ADMIN)} color="bg-slate-800" />
          </div>

          <div className="mt-12 text-center text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
            &copy; 2025 QueueMaster Pro &bull; V3.1.0-Persistent
          </div>
        </div>
      </div>
    );
  }

  // Teller Login Portal
  if (currentRole === Role.TELLER && !isTellerAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in duration-300">
          <div className="bg-amber-500 p-10 text-white text-center">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
              <UserCircle size={32} />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Workstation Login</h2>
            <p className="text-amber-100 text-sm mt-1 font-medium">Select your counter to start serving</p>
          </div>
          <div className="p-10 space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Counter Assignment</label>
              <select 
                value={activeTellerId}
                onChange={e => setActiveTellerId(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 text-slate-700 font-bold focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">-- Choose Counter --</option>
                {tellers.map(t => (
                  <option key={t.id} value={t.id}>Counter {t.counterNumber} - {t.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleTellerLogin}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-xl"
            >
              Sign In to Counter
            </button>
            <button onClick={() => setCurrentRole(null)} className="w-full flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase hover:text-slate-600 transition-colors">
              <ArrowLeft size={14} /> Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin Login Gateway
  if (currentRole === Role.ADMIN && !isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600 rounded-full blur-[120px] animate-pulse [animation-delay:2s]"></div>
        </div>

        <div className="max-w-md w-full relative z-10 animate-in zoom-in duration-300">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
            {showForgotPass ? (
              <div className="space-y-6">
                <div className="text-center mb-8">
                   <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/50">
                     <RefreshCw size={32} className="text-white" />
                   </div>
                   <h2 className="text-2xl font-black text-white tracking-tight">Recovery Mode</h2>
                   <p className="text-slate-400 text-sm mt-2">Enter your email to receive a reset link</p>
                </div>
                <div className="space-y-4">
                   <div className="relative">
                     <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                     <input 
                       type="email" 
                       placeholder="e.g. admin@queuemaster.com" 
                       className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-indigo-500 focus:bg-white/10 outline-none transition-all"
                       value={loginEmail}
                       onChange={e => setLoginEmail(e.target.value)}
                     />
                   </div>
                   <button onClick={() => setShowForgotPass(false)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black tracking-widest uppercase text-sm transition-all active:scale-95">Send Reset Code</button>
                   <button onClick={() => setShowForgotPass(false)} className="w-full text-slate-500 text-xs font-bold hover:text-white transition-colors">Back to Login</button>
                </div>
              </div>
            ) : isAdminRegistering ? (
              <form onSubmit={handleAdminRegister} className="space-y-6">
                <div className="text-center mb-8">
                   <div className="bg-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                     <UserPlus size={32} className="text-white" />
                   </div>
                   <h2 className="text-3xl font-black text-white tracking-tighter">Register Admin</h2>
                   <p className="text-slate-400 text-sm mt-2 font-medium">Create new administrative credentials</p>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input 
                      type="text" 
                      required 
                      value={regName} 
                      onChange={e => setRegName(e.target.value)} 
                      placeholder="Full Name" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-emerald-500 outline-none transition-all" 
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input 
                      type="email" 
                      required 
                      value={loginEmail} 
                      onChange={e => setLoginEmail(e.target.value)} 
                      placeholder="Email Address" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-emerald-500 outline-none transition-all" 
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      value={loginPass} 
                      onChange={e => setLoginPass(e.target.value)} 
                      placeholder="Security Password" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white focus:border-emerald-500 outline-none transition-all" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all hover:bg-emerald-500 active:scale-95 flex items-center justify-center gap-2">
                    Create Account
                  </button>
                  <button type="button" onClick={() => setIsAdminRegistering(false)} className="w-full text-slate-500 text-xs font-bold uppercase hover:text-white transition-colors">Already have an account? Login</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAdminLogin} className="space-y-6">
                <div className="text-center mb-8">
                   <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                     <Lock size={32} className="text-slate-900" />
                   </div>
                   <h2 className="text-3xl font-black text-white tracking-tighter">Admin Portal</h2>
                   <p className="text-slate-400 text-sm mt-2 font-medium">Verify credentials to access operational data</p>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input 
                      type="email" 
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder="Email Address" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-indigo-500 focus:bg-white/10 outline-none transition-all" 
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={loginPass}
                      onChange={e => setLoginPass(e.target.value)}
                      placeholder="Security Password" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white focus:border-indigo-500 focus:bg-white/10 outline-none transition-all" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <button type="button" onClick={() => setIsAdminRegistering(true)} className="text-emerald-400 text-xs font-black hover:text-emerald-300 transition-colors uppercase tracking-widest underline decoration-emerald-800 underline-offset-4">Register Account</button>
                    <button type="button" onClick={() => setShowForgotPass(true)} className="text-indigo-400 text-xs font-black hover:text-indigo-300 transition-colors uppercase tracking-widest">Forgot Password?</button>
                  </div>
                  <button type="submit" className="w-full bg-white text-slate-950 py-4 rounded-2xl font-black tracking-widest uppercase text-sm transition-all hover:bg-slate-200 active:scale-95 flex items-center justify-center gap-2 group">
                    Unlock Dashboard <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </form>
            )}
          </div>
          <button onClick={() => setCurrentRole(null)} className="mt-8 w-full text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">Return to Lobby</button>
        </div>
      </div>
    );
  }

  const activeTeller = tellers.find(t => t.id === activeTellerId) || tellers[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Users size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight">QueueMaster <span className="text-indigo-600">Pro</span></span>
          <div className="ml-4 px-2 py-1 bg-slate-100 rounded text-xs font-semibold text-slate-600 uppercase">
            {currentRole} Session
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
            connectionStatus === 'connected' 
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
              : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}>
            {connectionStatus === 'connected' ? <Wifi size={10} /> : <WifiOff size={10} />}
            {connectionStatus === 'connected' ? 'Realtime' : 'Offline'}
          </div>
          <div className="text-xs font-bold text-slate-500">
            {clientCount > 0 ? `${clientCount} active users` : 'Connecting...'}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleManualDailyReset}
            className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors"
            title="Manually reset daily ticket numbers"
          >
            Reset Counters
          </button>
          <button className="text-slate-500 hover:bg-slate-100 p-2 rounded-full transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <div className="h-8 w-px bg-slate-200" />
          <button onClick={handleLogout} className="flex items-center gap-2 text-slate-600 hover:text-red-600 font-black text-xs uppercase tracking-widest transition-colors">
            <LogOut size={18} />
            <span>End Session</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-auto">
        {currentRole === Role.ADMIN && authenticatedAdmin && (
          <AdminDashboard 
            adminUser={authenticatedAdmin}
            tickets={tickets} 
            tellers={tellers} 
            categories={categories} 
            adminAccounts={adminAccounts}
            onAddTeller={handleAddTeller}
            onUpdateTeller={handleUpdateTeller}
            onDeleteTeller={handleDeleteTeller}
            onAddAdminAccount={handleAddAdminAccount}
            onUpdateAdminAccount={handleUpdateAdminAccount}
            onDeleteAdminAccount={handleDeleteAdminAccount}
            onSystemReset={handleSystemReset}
            onDailyReset={handleManualDailyReset}
            dailyResetTime={dailyResetTime}
            categoryCounters={categoryCounters}
          />
        )}
        {currentRole === Role.RECEPTION && (
          <ReceptionDashboard 
            onIssue={handleIssueTicket} 
            categories={categories} 
            tickets={tickets}
            lastIssuedTicket={lastIssuedTicket}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            dailyResetTime={dailyResetTime}
          />
        )}
        {currentRole === Role.TELLER && isTellerAuthenticated && (
          <TellerDashboard 
            teller={activeTeller} 
            categories={categories}
            tickets={tickets} 
            onCall={() => handleCallNext(activeTeller.id)} 
            onUpdate={handleUpdateStatus} 
            dailyResetTime={dailyResetTime}
          />
        )}
        {currentRole === Role.MONITOR && (
          <MonitorDisplay 
            tickets={tickets}
            categories={categories}
            tellers={tellers}
            dailyResetTime={dailyResetTime}
          />
        )}
      </main>
    </div>
  );
};

const RoleCard: React.FC<{ title: string; icon: React.ReactNode; onClick: () => void; color: string }> = ({ title, icon, onClick, color }) => (
  <button onClick={onClick} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-4 hover:shadow-xl hover:-translate-y-2 transition-all group">
    <div className={`${color} text-white p-6 rounded-3xl group-hover:scale-110 transition-transform shadow-lg`}>{icon}</div>
    <span className="font-black text-lg text-slate-800 uppercase tracking-tighter">{title}</span>
  </button>
);

export default App;