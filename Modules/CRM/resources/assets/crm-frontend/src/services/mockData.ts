import type { Campaign, Contact, ContactList, DashboardStats, Automation, AppNotification, DailyMetric, EmailTemplate } from '@/types';

// ── Helper ──
const d = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

// ── Daily Metrics (last 30 days) ──
export const mockDailyMetrics: DailyMetric[] = Array.from({ length: 30 }, (_, i) => {
  const sent = Math.floor(Math.random() * 5000) + 2000;
  const opened = Math.floor(sent * (0.18 + Math.random() * 0.15));
  const clicked = Math.floor(opened * (0.1 + Math.random() * 0.12));
  const bounced = Math.floor(sent * (0.01 + Math.random() * 0.03));
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: date.toISOString().split('T')[0],
    sent,
    opened,
    clicked,
    bounced,
  };
});

// ── Dashboard Stats ──
export const mockDashboardStats: DashboardStats = {
  totalSent: 1_284_350,
  openRate: 24.8,
  clickRate: 3.7,
  bounceRate: 1.2,
  totalContacts: 85_420,
  contactGrowth: 12.5,
  dailyMetrics: mockDailyMetrics,
  topCampaigns: [
    { campaignId: '1', campaignName: 'Black Friday Sale', sent: 45000, opened: 13500, clicked: 2700, bounced: 450 },
    { campaignId: '2', campaignName: 'Welcome Series', sent: 32000, opened: 12800, clicked: 3200, bounced: 320 },
    { campaignId: '3', campaignName: 'Product Launch', sent: 28000, opened: 7840, clicked: 1960, bounced: 280 },
    { campaignId: '4', campaignName: 'Monthly Newsletter', sent: 52000, opened: 14560, clicked: 2600, bounced: 520 },
    { campaignId: '5', campaignName: 'Re-engagement', sent: 18000, opened: 3600, clicked: 720, bounced: 900 },
  ],
  heatmapData: Array.from({ length: 7 * 24 }, (_, i) => ({
    day: Math.floor(i / 24),
    hour: i % 24,
    value: Math.floor(Math.random() * 100),
  })),
};

// ── Campaigns ──
export const mockCampaigns: Campaign[] = [
  { id: '1', name: 'Black Friday Sale', subject: '🔥 Up to 70% off - Black Friday Deals', status: 'sent', listId: '1', listName: 'All Subscribers', sentCount: 45000, openRate: 30.0, clickRate: 6.0, bounceRate: 1.0, sentAt: d(5), createdAt: d(10), updatedAt: d(5) },
  { id: '2', name: 'Welcome Series - Day 1', subject: 'Welcome to our community! 🎉', status: 'sent', listId: '2', listName: 'New Users', sentCount: 32000, openRate: 40.0, clickRate: 10.0, bounceRate: 1.0, sentAt: d(3), createdAt: d(15), updatedAt: d(3) },
  { id: '3', name: 'Product Launch - Q1', subject: 'Introducing our newest features', status: 'scheduled', listId: '1', listName: 'All Subscribers', sentCount: 0, openRate: 0, clickRate: 0, bounceRate: 0, scheduledAt: d(-2), createdAt: d(1), updatedAt: d(0) },
  { id: '4', name: 'Monthly Newsletter - Feb', subject: 'Your February roundup is here', status: 'draft', listId: '3', listName: 'Newsletter', sentCount: 0, openRate: 0, clickRate: 0, bounceRate: 0, createdAt: d(0), updatedAt: d(0) },
  { id: '5', name: 'Re-engagement Campaign', subject: 'We miss you! Come back for 20% off', status: 'sending', listId: '4', listName: 'Inactive 90d', sentCount: 8500, openRate: 20.0, clickRate: 4.0, bounceRate: 5.0, createdAt: d(2), updatedAt: d(0) },
  { id: '6', name: 'Holiday Promo 2025', subject: '🎄 Holiday specials inside', status: 'sent', listId: '1', listName: 'All Subscribers', sentCount: 52000, openRate: 28.0, clickRate: 5.5, bounceRate: 1.2, sentAt: d(30), createdAt: d(35), updatedAt: d(30) },
  { id: '7', name: 'Feature Update Announce', subject: 'New dashboard experience', status: 'draft', listId: '2', listName: 'New Users', sentCount: 0, openRate: 0, clickRate: 0, bounceRate: 0, createdAt: d(0), updatedAt: d(0) },
  { id: '8', name: 'Webinar Invitation', subject: 'Join our live webinar this Thursday', status: 'scheduled', listId: '5', listName: 'Webinar List', sentCount: 0, openRate: 0, clickRate: 0, bounceRate: 0, scheduledAt: d(-5), createdAt: d(1), updatedAt: d(0) },
];

// ── Contacts ──
const firstNames = ['Alice', 'Bob', 'Carlos', 'Diana', 'Emma', 'Fábio', 'Gabi', 'Hugo', 'Iris', 'João', 'Karen', 'Lucas', 'Maria', 'Nara', 'Oscar', 'Paula', 'Rafael', 'Sara', 'Tiago', 'Vera'];
const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Lima', 'Ferreira', 'Almeida', 'Ribeiro', 'Martins', 'Rodrigues', 'Gomes', 'Lopes', 'Mendes', 'Carvalho', 'Rocha', 'Araújo', 'Dias', 'Moreira'];
const tagPool = ['VIP', 'Lead', 'Customer', 'Trial', 'Enterprise', 'Churned', 'Newsletter', 'Webinar'];

export const mockContacts: Contact[] = Array.from({ length: 50 }, (_, i) => {
  const fn = firstNames[i % firstNames.length];
  const ln = lastNames[i % lastNames.length];
  const tags = tagPool.filter(() => Math.random() > 0.7);
  return {
    id: `c${i + 1}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`,
    firstName: fn,
    lastName: ln,
    tags: tags.length ? tags : ['Lead'],
    listIds: ['1'],
    status: Math.random() > 0.1 ? 'subscribed' : Math.random() > 0.5 ? 'unsubscribed' : 'bounced',
    createdAt: d(Math.floor(Math.random() * 180)),
    lastActivity: Math.random() > 0.3 ? d(Math.floor(Math.random() * 14)) : undefined,
    openRate: Math.floor(Math.random() * 50 + 10),
    clickRate: Math.floor(Math.random() * 15 + 1),
  };
});

// ── Contact Lists ──
export const mockTemplates: EmailTemplate[] = [
  { id: 't1', name: 'Newsletter Clean', content: '<p>Hello world</p>', createdAt: d(30), updatedAt: d(5) },
  { id: 't2', name: 'Welcome Email', content: '<h1>Welcome!</h1>', createdAt: d(60), updatedAt: d(60) },
  { id: 't3', name: 'Promo Alert', content: '<h2>Special Offer</h2>', createdAt: d(15), updatedAt: d(1) },
];

export const mockLists: ContactList[] = [
  { id: '1', name: 'All Subscribers', contactCount: 85420, createdAt: d(365) },
  { id: '2', name: 'New Users', contactCount: 12300, createdAt: d(200) },
  { id: '3', name: 'Newsletter', contactCount: 45600, createdAt: d(300) },
  { id: '4', name: 'Inactive 90d', contactCount: 8200, createdAt: d(90) },
  { id: '5', name: 'Webinar List', contactCount: 3400, createdAt: d(30) },
];

// ── Automations ──
export const mockAutomations: Automation[] = [
  {
    id: 'a1', name: 'Welcome Series', status: 'active', triggeredCount: 12500, createdAt: d(120),
    nodes: [
      { id: 'n1', type: 'trigger', label: 'User Signs Up', config: {}, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'action', label: 'Send Welcome Email', config: {}, position: { x: 0, y: 100 } },
      { id: 'n3', type: 'delay', label: 'Wait 3 days', config: { days: 3 }, position: { x: 0, y: 200 } },
      { id: 'n4', type: 'condition', label: 'Opened Email?', config: {}, position: { x: 0, y: 300 } },
    ],
    connections: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }, { from: 'n3', to: 'n4' }],
  },
  {
    id: 'a2', name: 'Re-engagement Flow', status: 'paused', triggeredCount: 3200, createdAt: d(60),
    nodes: [
      { id: 'n1', type: 'trigger', label: 'Inactive 30 days', config: {}, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'action', label: 'Send Discount', config: {}, position: { x: 0, y: 100 } },
    ],
    connections: [{ from: 'n1', to: 'n2' }],
  },
  {
    id: 'a3', name: 'Cart Abandonment', status: 'draft', triggeredCount: 0, createdAt: d(5),
    nodes: [],
    connections: [],
  },
];

// ── Notifications ──
export const mockNotifications: AppNotification[] = [
  { id: 'not1', title: 'Campaign Sent', message: 'Black Friday Sale was sent to 45,000 contacts', type: 'success', read: false, createdAt: d(0) },
  { id: 'not2', title: 'High Bounce Rate', message: 'Re-engagement campaign has 5% bounce rate', type: 'warning', read: false, createdAt: d(0) },
  { id: 'not3', title: 'New Subscribers', message: '230 new contacts added today', type: 'info', read: true, createdAt: d(1) },
  { id: 'not4', title: 'Automation Paused', message: 'Re-engagement Flow was paused due to errors', type: 'error', read: true, createdAt: d(2) },
];
