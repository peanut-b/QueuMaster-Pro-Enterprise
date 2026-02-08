
export enum Role {
  ADMIN = 'ADMIN',
  TELLER = 'TELLER',
  RECEPTION = 'RECEPTION',
  MONITOR = 'MONITOR'
}

export enum TicketStatus {
  WAITING = 'WAITING',
  CALLING = 'CALLING',
  SERVING = 'SERVING',
  COMPLETED = 'COMPLETED',
  NOSHOW = 'NOSHOW'
}

export interface ServiceCategory {
  id: string;
  name: string;
  prefix: string;
  color: string;
  estimatedTime: number; // in minutes
}

export interface Ticket {
  id: string;
  number: string;
  categoryId: string;
  status: TicketStatus;
  createdAt: number;
  calledAt?: number;
  servedAt?: number;
  completedAt?: number;
  tellerId?: string;
  counterNumber?: number;
}

export interface Teller {
  id: string;
  name: string;
  counterNumber: number;
  status: 'ONLINE' | 'BUSY' | 'OFFLINE' | 'BREAK';
  currentTicketId?: string;
  assignedCategoryIds: string[];
}

export interface AdminAccount {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: number;
}

export interface QueueState {
  tickets: Ticket[];
  categories: ServiceCategory[];
  tellers: Teller[];
}

export interface AdminUser {
  email: string;
  isAuthenticated: boolean;
}
