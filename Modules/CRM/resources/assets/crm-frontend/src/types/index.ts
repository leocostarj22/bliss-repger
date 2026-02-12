// ── Campaign Types ──
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent';

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  channel?: 'email' | 'sms' | 'whatsapp' | 'gocontact';
  segment_id?: string;
  listId?: string;
  listName?: string;
  content?: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Contact Types ──
export interface Contact {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  phone?: string;
  tags: string[];
  listIds: string[];
  status: 'subscribed' | 'unsubscribed' | 'bounced';
  createdAt: string;
  lastActivity?: string;
  openRate: number;
  clickRate: number;
}

export interface ContactList {
  id: string;
  name: string;
  contactCount: number;
  createdAt: string;
}

// ── Analytics Types ──
export interface DailyMetric {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
}

export interface CampaignMetric {
  campaignId: string;
  campaignName: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
}

// ── Dashboard Types ──
export interface DashboardStats {
  totalSent: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  totalContacts: number;
  contactGrowth: number;
  dailyMetrics: DailyMetric[];
  topCampaigns: CampaignMetric[];
  heatmapData: { day: number; hour: number; value: number }[];
}

// ── Automation Types ──
export interface AutomationNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'delay';
  label: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

export interface Automation {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft';
  nodes: AutomationNode[];
  connections: { from: string; to: string }[];
  triggeredCount: number;
  createdAt: string;
}

// ── Notification Types ──
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

// ── API Response wrapper ──
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}
