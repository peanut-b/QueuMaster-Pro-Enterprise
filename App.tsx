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
  CloudOff,
  Cloud,
  HardDrive,
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

// Enhanced localStorage service with offline queue
class LocalStorageService {
  private readonly STORAGE_KEYS = {
    TICKETS: 'q_tickets',
    CATEGORIES: 'q_categories',
    TELLERS: 'q_tellers',
    ADMIN_ACCOUNTS: 'q_admin_accounts',
    CATEGORY_COUNTERS: 'q_category_counters',
    DAILY_RESET_TIME: 'q_daily_reset_time',
    LAST_ISSUED_TICKET: 'q_last_issued_ticket',
    ACTIVE_TELLER_ID: 'q_active_teller_id',
    PENDING_CHANGES: 'q_pending_changes',
    LAST_SYNC: 'q_last_sync',
    AUTH_STATE: 'q_auth_state'
  };

  // Save data with timestamp
  saveData(key: string, data: any): void {
    try {
      const saveObject = {
        data,
        timestamp: Date.now(),
        version: '3.1.0'
      };
      localStorage.setItem(key, JSON.stringify(saveObject));
      console.log(`💾 Saved: ${key}`, data);
    } catch (error) {
      console.error(`❌ Error saving to localStorage (${key}):`, error);
    }
  }

  // Load data with error handling
  loadData<T>(key: string, defaultValue: T): T {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        const data = parsed.data !== undefined ? parsed.data : parsed;
        console.log(`📂 Loaded: ${key}`, data);
        return data;
      }
    } catch (error) {
      console.error(`❌ Error loading from localStorage (${key}):`, error);
    }
    return defaultValue;
  }

  // Queue pending changes when offline
  queuePendingChange(type: string, payload: any): void {
    const pendingKey = this.STORAGE_KEYS.PENDING_CHANGES;
    try {
      const pending = this.loadData<any[]>(pendingKey, []);
      pending.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        payload,
        timestamp: Date.now(),
        retryCount: 0
      });
      this.saveData(pendingKey, pending);
      console.log(`📦 Queued: ${type}`);
    } catch (error) {
      console.error('Error queueing pending change:', error);
    }
  }

  getPendingChanges(): any[] {
    return this.loadData<any[]>(this.STORAGE_KEYS.PENDING_CHANGES, []);
  }

  clearPendingChanges(): void {
    this.saveData(this.STORAGE_KEYS.PENDING_CHANGES, []);
  }

  removePendingChange(changeId: string): void {
    const pending = this.getPendingChanges();
    const filtered = pending.filter(c => c.id !== changeId);
    this.saveData(this.STORAGE_KEYS.PENDING_CHANGES, filtered);
  }

  hasPendingChanges(): boolean {
    return this.getPendingChanges().length > 0;
  }

  getLastSyncTime(): number | null {
    return this.loadData<number | null>(this.STORAGE_KEYS.LAST_SYNC, null);
  }

  updateLastSyncTime(): void {
    this.saveData(this.STORAGE_KEYS.LAST_SYNC, Date.now());
  }

  // Save auth state
  saveAuthState(role: Role | null, adminAuth: boolean, tellerAuth: boolean, adminId: string | null, tellerId: string): void {
    this.saveData(this.STORAGE_KEYS.AUTH_STATE, {
      currentRole: role,
      isAdminAuthenticated: adminAuth,
      isTellerAuthenticated: tellerAuth,
      authenticatedAdminId: adminId,
      activeTellerId: tellerId,
      timestamp: Date.now()
    });
  }

  loadAuthState(): any {
    return this.loadData(this.STORAGE_KEYS.AUTH_STATE, {
      currentRole: null,
      isAdminAuthenticated: false,
      isTellerAuthenticated: false,
      authenticatedAdminId: null,
      activeTellerId: ''
    });
  }

  // Clear all app data
  clearAllData(): void {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

const localStorageService = new LocalStorageService();

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(registration => {
      console.log('✅ ServiceWorker registered');
    })
    .catch(err => {
      console.log('❌ ServiceWorker failed: ', err);
    });
}

const App: React.FC = () => {
  // Load auth state from localStorage
  const savedAuth = localStorageService.loadAuthState();
  
  const [currentRole, setCurrentRole] = useState<Role | null>(savedAuth.currentRole || null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(savedAuth.isAdminAuthenticated || false);
  const [isTellerAuthenticated, setIsTellerAuthenticated] = useState(savedAuth.isTellerAuthenticated || false);
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState<AdminAccount | null>(null);
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [isAdminRegistering, setIsAdminRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');
  const [clientCount, setClientCount] = useState<number>(0);
  const [lastIssuedTicket, setLastIssuedTicket] = useState<Ticket | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [pendingChangesCount, setPendingChangesCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [offlineMode, setOfflineMode] = useState<boolean>(false);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regName, setRegName] = useState('');
  
  // ============================================
  // NO DEFAULT DATA - EVERYTHING STARTS EMPTY
  // Only load from localStorage, never create defaults
  // ============================================
  
  // Tickets - start empty
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    return localStorageService.loadData<Ticket[]>('q_tickets', []);
  });
  
  // Daily reset time - start with current time
  const [dailyResetTime, setDailyResetTime] = useState<number>(() => {
    return localStorageService.loadData<number>('q_daily_reset_time', Date.now());
  });
  
  // Category counters - start empty
  const [categoryCounters, setCategoryCounters] = useState<Record<string, number>>(() => {
    return localStorageService.loadData<Record<string, number>>('q_category_counters', {});
  });

  // Admin accounts - ONLY load from localStorage, NO default admin
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(() => {
    const saved = localStorageService.loadData<AdminAccount[]>('q_admin_accounts', []);
    // NO DEFAULT ADMIN - start with empty array if no data
    return saved;
  });

  // Categories - ONLY load from localStorage, NO default categories
  const [categories, setCategories] = useState<ServiceCategory[]>(() => {
    const saved = localStorageService.loadData<ServiceCategory[]>('q_categories', []);
    // NO DEFAULT CATEGORIES - start with empty array if no data
    return saved;
  });

  // Tellers - ONLY load from localStorage, NO default tellers
  const [tellers, setTellers] = useState<Teller[]>(() => {
    const saved = localStorageService.loadData<Teller[]>('q_tellers', []);
    // NO DEFAULT TELLERS - start with empty array if no data
    return saved;
  });

  // Active teller - load from localStorage
  const [activeTellerId, setActiveTellerId] = useState<string>(() => {
    return localStorageService.loadData<string>('q_active_teller_id', savedAuth.activeTellerId || '');
  });

  // Find authenticated admin from saved ID
  useEffect(() => {
    if (savedAuth.authenticatedAdminId && adminAccounts.length > 0) {
      const admin = adminAccounts.find(a => a.id === savedAuth.authenticatedAdminId);
      if (admin) {
        setAuthenticatedAdmin(admin);
      }
    }
  }, [adminAccounts]);

  // Load last issued ticket from localStorage
  useEffect(() => {
    const savedLastTicket = localStorageService.loadData<Ticket | null>('q_last_issued_ticket', null);
    if (savedLastTicket) {
      setLastIssuedTicket(savedLastTicket);
    }
    setIsInitialLoad(false);
  }, []);
  
  // Refs
  const connectionStatusRef = useRef(connectionStatus);
  const ticketsRef = useRef(tickets);
  const categoriesRef = useRef(categories);
  const categoryCountersRef = useRef(categoryCounters);
  const lastIssuedTicketRef = useRef(lastIssuedTicket);
  const offlineModeRef = useRef(offlineMode);

  // Update refs when state changes
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
    ticketsRef.current = tickets;
    categoriesRef.current = categories;
    categoryCountersRef.current = categoryCounters;
    lastIssuedTicketRef.current = lastIssuedTicket;
    offlineModeRef.current = offlineMode;
  }, [connectionStatus, tickets, categories, categoryCounters, lastIssuedTicket, offlineMode]);

  // Save auth state
  useEffect(() => {
    if (!isInitialLoad) {
      localStorageService.saveAuthState(
        currentRole,
        isAdminAuthenticated,
        isTellerAuthenticated,
        authenticatedAdmin?.id || null,
        activeTellerId
      );
    }
  }, [currentRole, isAdminAuthenticated, isTellerAuthenticated, authenticatedAdmin, activeTellerId]);

  // AUTO-SAVE: Save to localStorage whenever ANY state changes
  useEffect(() => {
    if (!isInitialLoad) {
      const timeoutId = setTimeout(() => {
        localStorageService.saveData('q_tickets', tickets);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [tickets]);

  useEffect(() => {
    if (!isInitialLoad) {
      localStorageService.saveData('q_categories', categories);
    }
  }, [categories]);

  useEffect(() => {
    if (!isInitialLoad) {
      localStorageService.saveData('q_tellers', tellers);
    }
  }, [tellers]);

  useEffect(() => {
    if (!isInitialLoad) {
      localStorageService.saveData('q_admin_accounts', adminAccounts);
    }
  }, [adminAccounts]);

  useEffect(() => {
    if (!isInitialLoad) {
      localStorageService.saveData('q_category_counters', categoryCounters);
    }
  }, [categoryCounters]);

  useEffect(() => {
    if (!isInitialLoad) {
      localStorageService.saveData('q_daily_reset_time', dailyResetTime);
    }
  }, [dailyResetTime]);

  useEffect(() => {
    if (!isInitialLoad) {
      localStorageService.saveData('q_last_issued_ticket', lastIssuedTicket);
    }
  }, [lastIssuedTicket]);

  useEffect(() => {
    if (!isInitialLoad) {
      localStorageService.saveData('q_active_teller_id', activeTellerId);
    }
  }, [activeTellerId]);

  // Update pending changes count
  useEffect(() => {
    const updatePendingCount = () => {
      setPendingChangesCount(localStorageService.getPendingChanges().length);
    };
    
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Page visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Don't auto-reconnect, just update visibility
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Check for daily reset
  useEffect(() => {
    const checkDailyReset = () => {
      const now = Date.now();
      const hoursElapsed = (now - dailyResetTime) / (1000 * 60 * 60);
      
      if (hoursElapsed >= 20) {
        performDailyReset();
      }
    };
    const resetCheckInterval = setInterval(checkDailyReset, 60 * 60 * 1000);
    checkDailyReset();
    return () => clearInterval(resetCheckInterval);
  }, [dailyResetTime]);

  // Sync pending changes - MANUAL ONLY
  const syncPendingChanges = async () => {
    if (!realtimeService.isConnected()) {
      alert('⚠️ Cannot sync: You are offline. Please check your connection and try again.');
      return;
    }
    
    const pendingChanges = localStorageService.getPendingChanges();
    if (pendingChanges.length === 0) {
      alert('✅ No pending changes to sync.');
      return;
    }
    
    setIsSyncing(true);
    console.log(`🔄 Syncing ${pendingChanges.length} pending changes...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const change of pendingChanges) {
      try {
        switch (change.type) {
          case 'ticket_update':
            realtimeService.send({
              type: 'ticket_update',
              ticket: { ...change.payload, lastUpdated: Date.now() }
            });
            break;
          case 'teller_update':
            realtimeService.send({
              type: 'teller_update',
              teller: { ...change.payload, lastUpdated: Date.now() }
            });
            break;
          case 'category_update':
            realtimeService.send({
              type: 'category_update',
              category: change.payload
            });
            break;
          case 'admin_account_update':
            realtimeService.send({
              type: 'admin_account_update',
              account: change.payload
            });
            break;
          case 'counter_update':
            realtimeService.send({
              type: 'counter_update',
              categoryId: change.payload.categoryId,
              count: change.payload.count
            });
            break;
          case 'daily_reset':
            realtimeService.send({
              type: 'daily_reset',
              resetTime: change.payload.resetTime,
              categoryCounters: change.payload.categoryCounters,
              tickets: change.payload.tickets
            });
            break;
        }
        
        localStorageService.removePendingChange(change.id);
        successCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`❌ Failed to sync change ${change.id}:`, error);
        failCount++;
      }
    }
    
    setIsSyncing(false);
    setPendingChangesCount(localStorageService.getPendingChanges().length);
    localStorageService.updateLastSyncTime();
    
    alert(`✅ Sync complete! ${successCount} changes synced, ${failCount} failed.`);
  };

  // Initialize realtime service
  useEffect(() => {
    setConnectionStatus('connecting');

    const handleConnected = () => {
      console.log('🔗 Connected to server');
      setConnectionStatus('connected');
      setConnectionError(null);
      setOfflineMode(false);
    };

    const handleDisconnected = () => {
      console.log('🔌 Disconnected from server');
      setConnectionStatus('disconnected');
      setOfflineMode(true);
    };

    const handleConnecting = () => {
      console.log('⏳ Connecting to server...');
      setConnectionStatus('connecting');
    };

    const handleWelcome = (data: any) => {
      setClientCount(data.clientCount || 0);
    };

    const handleTicketUpdate = (ticket: Ticket) => {
      setTickets(prev => {
        const exists = prev.find(t => t.id === ticket.id);
        if (exists) {
          if (ticket.lastUpdated && exists.lastUpdated && ticket.lastUpdated > exists.lastUpdated) {
            return prev.map(t => t.id === ticket.id ? { ...ticket, lastUpdated: Date.now() } : t);
          }
          return prev;
        } else {
          return [...prev, { ...ticket, lastUpdated: Date.now() }];
        }
      });
    };

    const handleTellerUpdate = (teller: Teller) => {
      setTellers(prev => {
        const exists = prev.find(t => t.id === teller.id);
        if (exists) {
          if (teller.lastUpdated && exists.lastUpdated && teller.lastUpdated > exists.lastUpdated) {
            return prev.map(t => t.id === teller.id ? teller : t);
          }
          return prev;
        } else {
          return [...prev, teller];
        }
      });
    };

    const handleCategoryUpdate = (category: ServiceCategory) => {
      setCategories(prev => {
        const exists = prev.find(c => c.id === category.id);
        if (exists) {
          return prev.map(c => c.id === category.id ? category : c);
        } else {
          return [...prev, category];
        }
      });
    };

    const handleAdminAccountUpdate = (account: AdminAccount) => {
      setAdminAccounts(prev => {
        const exists = prev.find(a => a.id === account.id);
        if (exists) {
          return prev.map(a => a.id === account.id ? account : a);
        } else {
          return [...prev, account];
        }
      });
    };

    const handleSync = (data: any) => {
      console.log('🔄 Received sync from server');
      
      if (data.tickets && Array.isArray(data.tickets)) {
        setTickets(prev => {
          const ticketMap = new Map(prev.map(t => [t.id, t]));
          data.tickets.forEach((serverTicket: Ticket) => {
            const localTicket = ticketMap.get(serverTicket.id);
            if (localTicket) {
              const localTime = localTicket.lastUpdated || 0;
              const serverTime = serverTicket.lastUpdated || 0;
              if (serverTime > localTime) {
                ticketMap.set(serverTicket.id, { ...serverTicket, lastUpdated: Date.now() });
              }
            } else {
              ticketMap.set(serverTicket.id, { ...serverTicket, lastUpdated: serverTicket.lastUpdated || Date.now() });
            }
          });
          return Array.from(ticketMap.values());
        });
      }
      
      if (data.categories && Array.isArray(data.categories)) {
        setCategories(prev => {
          const categoryMap = new Map(prev.map(c => [c.id, c]));
          data.categories.forEach((serverCategory: ServiceCategory) => {
            categoryMap.set(serverCategory.id, serverCategory);
          });
          return Array.from(categoryMap.values());
        });
      }
      
      if (data.tellers && Array.isArray(data.tellers)) {
        setTellers(prev => {
          const tellerMap = new Map(prev.map(t => [t.id, t]));
          data.tellers.forEach((serverTeller: Teller) => {
            const localTeller = tellerMap.get(serverTeller.id);
            if (localTeller) {
              const localTime = localTeller.lastUpdated || 0;
              const serverTime = serverTeller.lastUpdated || 0;
              if (serverTime > localTime) {
                tellerMap.set(serverTeller.id, serverTeller);
              }
            } else {
              tellerMap.set(serverTeller.id, serverTeller);
            }
          });
          return Array.from(tellerMap.values());
        });
      }
      
      if (data.adminAccounts && Array.isArray(data.adminAccounts)) {
        setAdminAccounts(prev => {
          const accountMap = new Map(prev.map(a => [a.id, a]));
          data.adminAccounts.forEach((serverAccount: AdminAccount) => {
            accountMap.set(serverAccount.id, serverAccount);
          });
          return Array.from(accountMap.values());
        });
      }
      
      if (data.dailyResetTime) {
        setDailyResetTime(prev => data.dailyResetTime > prev ? data.dailyResetTime : prev);
      }
      
      if (data.categoryCounters) {
        setCategoryCounters(prev => {
          const merged = { ...prev };
          Object.entries(data.categoryCounters).forEach(([key, value]) => {
            if (!merged[key] || (value as number) > merged[key]) {
              merged[key] = value as number;
            }
          });
          return merged;
        });
      }
      
      localStorageService.updateLastSyncTime();
    };

    const handleDailyReset = (data: any) => {
      setDailyResetTime(data.resetTime || Date.now());
      setCategoryCounters(data.categoryCounters || {});
      setTickets(data.tickets || []);
    };

    const handleConnectionFailed = (data: any) => {
      console.log('❌ Connection failed:', data);
      setConnectionStatus('disconnected');
      setOfflineMode(true);
      setConnectionError(data.error || 'Failed to connect to server');
    };

    realtimeService.on('connected', handleConnected);
    realtimeService.on('disconnected', handleDisconnected);
    realtimeService.on('connecting', handleConnecting);
    realtimeService.on('welcome', handleWelcome);
    realtimeService.on('ticket_update', handleTicketUpdate);
    realtimeService.on('teller_update', handleTellerUpdate);
    realtimeService.on('category_update', handleCategoryUpdate);
    realtimeService.on('admin_account_update', handleAdminAccountUpdate);
    realtimeService.on('sync', handleSync);
    realtimeService.on('daily_reset', handleDailyReset);
    realtimeService.on('connection_failed', handleConnectionFailed);

    realtimeService.connect();

    return () => {
      realtimeService.off('connected', handleConnected);
      realtimeService.off('disconnected', handleDisconnected);
      realtimeService.off('connecting', handleConnecting);
      realtimeService.off('welcome', handleWelcome);
      realtimeService.off('ticket_update', handleTicketUpdate);
      realtimeService.off('teller_update', handleTellerUpdate);
      realtimeService.off('category_update', handleCategoryUpdate);
      realtimeService.off('admin_account_update', handleAdminAccountUpdate);
      realtimeService.off('sync', handleSync);
      realtimeService.off('daily_reset', handleDailyReset);
      realtimeService.off('connection_failed', handleConnectionFailed);
      
      realtimeService.disconnect();
    };
  }, []);

  // Update connection status
  useEffect(() => {
    const interval = setInterval(() => {
      const status = realtimeService.getConnectionStatus();
      setConnectionStatus(status);
      setOfflineMode(status !== 'connected');
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Broadcast functions - queue when offline
  const broadcastTicketUpdate = (ticket: Ticket) => {
    if (realtimeService.isConnected()) {
      realtimeService.send({
        type: 'ticket_update',
        ticket: { ...ticket, lastUpdated: Date.now() }
      });
    } else {
      localStorageService.queuePendingChange('ticket_update', ticket);
    }
  };

  const broadcastTellerUpdate = (teller: Teller) => {
    if (realtimeService.isConnected()) {
      realtimeService.send({
        type: 'teller_update',
        teller: { ...teller, lastUpdated: Date.now() }
      });
    } else {
      localStorageService.queuePendingChange('teller_update', teller);
    }
  };

  const broadcastCategoryUpdate = (category: ServiceCategory) => {
    if (realtimeService.isConnected()) {
      realtimeService.send({
        type: 'category_update',
        category: category
      });
    } else {
      localStorageService.queuePendingChange('category_update', category);
    }
  };

  const broadcastAdminAccountUpdate = (account: AdminAccount) => {
    if (realtimeService.isConnected()) {
      realtimeService.send({
        type: 'admin_account_update',
        account: account
      });
    } else {
      localStorageService.queuePendingChange('admin_account_update', account);
    }
  };

  const broadcastCounterUpdate = (categoryId: string, count: number) => {
    if (realtimeService.isConnected()) {
      realtimeService.send({
        type: 'counter_update',
        categoryId,
        count
      });
    } else {
      localStorageService.queuePendingChange('counter_update', { categoryId, count });
    }
  };

  const broadcastDailyReset = (resetTime: number, counters: Record<string, number>, tickets: Ticket[]) => {
    if (realtimeService.isConnected()) {
      realtimeService.send({
        type: 'daily_reset',
        resetTime,
        categoryCounters: counters,
        tickets
      });
    } else {
      localStorageService.queuePendingChange('daily_reset', { resetTime, categoryCounters: counters, tickets });
    }
  };

  const performDailyReset = () => {
    console.log('🔄 Performing daily reset of ticket numbers');
    
    const resetCounters: Record<string, number> = {};
    categoriesRef.current.forEach(cat => {
      resetCounters[cat.id] = 0;
    });
    
    setCategoryCounters(resetCounters);
    
    const newResetTime = Date.now();
    setDailyResetTime(newResetTime);
    
    setTickets(prev => {
      const filteredTickets = prev.filter(ticket => 
        ticket.status === TicketStatus.CALLING || 
        ticket.status === TicketStatus.SERVING
      );
      
      broadcastDailyReset(newResetTime, resetCounters, filteredTickets);
      
      return filteredTickets;
    });
    
    broadcastAnnouncement("System Note: Daily ticket numbers have been reset.", 0);
  };

  // Auth Handlers
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const account = adminAccounts.find(a => a.email === loginEmail && a.password === loginPass);
    if (account) {
      setAuthenticatedAdmin(account);
      setIsAdminAuthenticated(true);
      setCurrentRole(Role.ADMIN);
    } else {
      alert('❌ Invalid credentials. Check your email and password.');
    }
  };

  const handleAdminRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass || !regName) return;
    if (adminAccounts.find(a => a.email === loginEmail)) {
      alert("❌ Email already exists.");
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
    alert("✅ Registration successful! Please login.");
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
      setCurrentRole(Role.TELLER);
    } else {
      alert("⚠️ Please select a counter station.");
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
      alert("⚠️ At least one admin account must exist.");
      return;
    }
    setAdminAccounts(prev => prev.filter(a => a.id !== id));
  };

  // Category Handlers
  const handleAddCategory = (cat: Omit<ServiceCategory, 'id'>) => {
    const newCat = { ...cat, id: `c-${Date.now()}` };
    setCategories(prev => [...prev, newCat]);
    broadcastCategoryUpdate(newCat);
    
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
    
    setCategoryCounters(prev => {
      const newCounters = { ...prev };
      delete newCounters[id];
      return newCounters;
    });
  };

  // Teller Handlers
  const handleAddTeller = (teller: Omit<Teller, 'id' | 'status' | 'assignedCategoryIds'>) => {
    if (tellers.length >= 10) return;
    const newTeller: Teller = {
      ...teller,
      id: `teller-${Date.now()}`,
      status: 'ONLINE',
      assignedCategoryIds: (teller as any).assignedCategoryIds || [],
      lastUpdated: Date.now()
    };
    setTellers(prev => [...prev, newTeller].slice(0, 10));
    broadcastTellerUpdate(newTeller);
  };

  const handleUpdateTeller = (teller: Teller) => {
    const updatedTeller = { ...teller, lastUpdated: Date.now() };
    setTellers(prev => prev.map(t => t.id === teller.id ? updatedTeller : t));
    broadcastTellerUpdate(updatedTeller);
  };

  const handleDeleteTeller = (id: string) => {
    setTellers(prev => prev.filter(t => t.id !== id));
  };

  // Generate ticket number
  const generateTicketNumber = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 'UNK-001';
    
    const currentCount = categoryCounters[categoryId] || 0;
    const newCount = currentCount + 1;
    
    setCategoryCounters(prev => ({
      ...prev,
      [categoryId]: newCount
    }));
    
    broadcastCounterUpdate(categoryId, newCount);
    
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
      dailyIdentifier: `${new Date(dailyResetTime).toISOString().split('T')[0]}-${categoryId}`
    };
    
    setTickets(prev => [...prev, newTicket]);
    setLastIssuedTicket(newTicket);
    broadcastTicketUpdate(newTicket);
  };

  const handleCallNext = (tellerId: string) => {
    const teller = tellers.find(t => t.id === tellerId);
    if (!teller) return;

    const eligibleTickets = tickets
      .filter(t => 
        t.status === TicketStatus.WAITING && 
        teller.assignedCategoryIds.includes(t.categoryId)
      )
      .sort((a, b) => a.createdAt - b.createdAt);

    const nextTicket = eligibleTickets[0];
    if (!nextTicket) return;

    const otherCallingTickets = tickets.filter(t => 
      t.status === TicketStatus.CALLING && 
      t.categoryId === nextTicket.categoryId &&
      t.id !== nextTicket.id
    );

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
      t.id === tellerId ? { ...t, status: 'BUSY', currentTicketId: nextTicket.id, lastUpdated: Date.now() } : t
    ));

    broadcastTicketUpdate(updatedTicket);
    broadcastTellerUpdate({ ...teller, status: 'BUSY', currentTicketId: nextTicket.id, lastUpdated: Date.now() });
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
          const updated = { ...t, status: 'ONLINE', currentTicketId: undefined, lastUpdated: Date.now() };
          broadcastTellerUpdate(updated);
          return updated;
        }
        return t;
      }));
    }
  };

  const handleManualDailyReset = () => {
    if (confirm("Reset all ticket numbers for today? This will keep ongoing transactions but reset counters for new tickets.")) {
      performDailyReset();
      alert("✅ Ticket numbers have been reset for the day.");
    }
  };

  const handleManualSync = () => {
    syncPendingChanges();
  };

  const handleSystemReset = () => {
    if (confirm("⚠️ WARNING: This will permanently delete ALL local data from this device. Continue?")) {
      localStorageService.clearAllData();
      window.location.reload();
    }
  };

  // Role Selection View - ALWAYS show, even when offline
  if (!currentRole) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-black text-slate-900 mb-2 tracking-tighter">
              QueueMaster <span className="text-indigo-600 italic">Enterprise</span>
            </h1>
            <p className="text-slate-600 font-medium text-lg">Offline-First Queue Management System</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                connectionStatus === 'connected' 
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                  : connectionStatus === 'connecting'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200 animate-pulse'
                    : 'bg-amber-100 text-amber-700 border border-amber-200'
              }`}>
                {connectionStatus === 'connected' && <Wifi size={12} />}
                {connectionStatus === 'connecting' && <RefreshCw size={12} className="animate-spin" />}
                {connectionStatus === 'disconnected' && <WifiOff size={12} />}
                
                {connectionStatus === 'connected' && `Connected (${clientCount} users)`}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'disconnected' && 'Offline Mode'}
              </div>
              
              {/* Pending Changes */}
              {pendingChangesCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-blue-100 text-blue-700 border border-blue-200">
                  <HardDrive size={12} />
                  {pendingChangesCount} change{pendingChangesCount !== 1 ? 's' : ''} pending sync
                </div>
              )}
              
              {/* Last Sync */}
              {localStorageService.getLastSyncTime() && (
                <div className="text-xs font-bold text-slate-500">
                  Last sync: {new Date(localStorageService.getLastSyncTime()!).toLocaleTimeString()}
                </div>
              )}
              
              {/* Next Reset */}
              <div className="text-xs font-bold text-slate-500">
                Next reset in: {Math.max(0, Math.floor((20 - (Date.now() - dailyResetTime) / (1000 * 60 * 60))))}h
              </div>
              
              {/* Manual Sync Button */}
              {pendingChangesCount > 0 && connectionStatus === 'connected' && (
                <button 
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                  Sync Now
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <RoleCard title="Public Monitor" icon={<Monitor size={32} />} onClick={() => setCurrentRole(Role.MONITOR)} color="bg-indigo-600" />
            <RoleCard title="Reception Desk" icon={<ArrowRightCircle size={32} />} onClick={() => setCurrentRole(Role.RECEPTION)} color="bg-emerald-600" />
            <RoleCard title="Service Teller" icon={<UserCircle size={32} />} onClick={() => setCurrentRole(Role.TELLER)} color="bg-amber-600" />
            <RoleCard title="System Admin" icon={<ShieldCheck size={32} />} onClick={() => setCurrentRole(Role.ADMIN)} color="bg-slate-800" />
          </div>

          <div className="mt-12 text-center text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
            &copy; 2025 QueueMaster Pro &bull; Offline-First v3.0
          </div>
        </div>
      </div>
    );
  }



  

  // Teller Login Portal
  if (currentRole === Role.TELLER && !isTellerAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
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

        <div className="max-w-md w-full relative z-10">
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
          
          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
            connectionStatus === 'connected' 
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
              : connectionStatus === 'connecting'
                ? 'bg-blue-100 text-blue-700 border border-blue-200 animate-pulse'
                : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}>
            {connectionStatus === 'connected' && <Wifi size={10} />}
            {connectionStatus === 'connecting' && <RefreshCw size={10} className="animate-spin" />}
            {connectionStatus === 'disconnected' && <WifiOff size={10} />}
            
            {connectionStatus === 'connected' && 'Online'}
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'disconnected' && 'Offline'}
          </div>
          
          {/* Pending Changes */}
          {pendingChangesCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full text-[10px] font-black text-blue-700 uppercase tracking-wider">
              <HardDrive size={10} />
              {pendingChangesCount} pending
            </div>
          )}
          
          {/* Sync Button - Manual Only */}
          {pendingChangesCount > 0 && connectionStatus === 'connected' && !isSyncing && (
            <button 
              onClick={handleManualSync}
              className="flex items-center gap-1 px-2 py-1 bg-indigo-100 hover:bg-indigo-200 rounded-full text-[10px] font-black text-indigo-700 uppercase tracking-wider transition-colors"
            >
              <RefreshCw size={10} />
              Sync Now
            </button>
          )}
          
          {/* Syncing Indicator */}
          {isSyncing && (
            <div className="flex items-center gap-1 px-2 py-1 bg-indigo-100 rounded-full text-[10px] font-black text-indigo-700 uppercase tracking-wider">
              <RefreshCw size={10} className="animate-spin" />
              Syncing...
            </div>
          )}
          
          <div className="text-xs font-bold text-slate-500">
            {clientCount > 0 ? `${clientCount} active` : ''}
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
            offlineMode={offlineMode}
            pendingChangesCount={pendingChangesCount}
            onSync={handleManualSync}
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
            offlineMode={offlineMode}
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
            offlineMode={offlineMode}
          />
        )}
        {currentRole === Role.MONITOR && (
          <MonitorDisplay 
            tickets={tickets}
            categories={categories}
            tellers={tellers}
            dailyResetTime={dailyResetTime}
            offlineMode={offlineMode}
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