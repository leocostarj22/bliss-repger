/**
 * Mock API Service
 * Simulates REST API calls for future Laravel integration.
 * Replace implementations with real fetch calls when backend is ready.
 *
 * Base URL pattern: /api/v1/email/...
 */

import type { ApiResponse, Campaign, Contact, DashboardStats, Automation, AppNotification } from '@/types';
import { mockCampaigns, mockContacts, mockDashboardStats, mockAutomations, mockNotifications } from './mockData';

const delay = (ms = 400) => new Promise(r => setTimeout(r, ms + Math.random() * 200));

// ── Dashboard ──
export async function fetchDashboard(): Promise<ApiResponse<DashboardStats>> {
  const response = await fetch('/api/v1/email/analytics', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Ensure Laravel session cookies are sent
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
  }

  return response.json();
}

// ── Campaigns: /api/v1/email/campaigns ──
export async function fetchCampaigns(params?: {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
}): Promise<ApiResponse<Campaign[]>> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.perPage) query.append('perPage', params.perPage.toString());
  if (params?.status && params.status !== 'all') query.append('status', params.status);
  if (params?.search) query.append('search', params.search);

  const response = await fetch(`/api/v1/email/campaigns?${query.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchCampaign(id: string): Promise<ApiResponse<Campaign>> {
  const response = await fetch(`/api/v1/email/campaigns/${id}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch campaign: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchCampaignLogs(id: string, params?: { page?: number; perPage?: number }): Promise<ApiResponse<any>> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.perPage) query.append('per_page', params.perPage.toString());

  const response = await fetch(`/api/v1/email/campaigns/${id}/logs?${query.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch campaign logs: ${response.statusText}`);
  }

  return response.json();
}

export async function createCampaign(data: Partial<Campaign>): Promise<ApiResponse<Campaign>> {
  const response = await fetch(`/api/v1/email/campaigns`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create campaign: ${response.statusText}`);
  }

  return response.json();
}

export async function updateCampaign(id: string, data: Partial<Campaign>): Promise<ApiResponse<Campaign>> {
  const response = await fetch(`/api/v1/email/campaigns/${id}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update campaign: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteCampaign(id: string): Promise<void> {
  const response = await fetch(`/api/v1/email/campaigns/${id}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete campaign: ${response.statusText}`);
  }
}

export async function duplicateCampaign(id: string): Promise<ApiResponse<Campaign>> {
  const response = await fetch(`/api/v1/email/campaigns/${id}/duplicate`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to duplicate campaign: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchSegments(): Promise<ApiResponse<{ id: string; name: string }[]>> {
  // Mock segments for now
  await delay(200);
  return {
    data: [
      { id: '1', name: 'All Contacts' },
      { id: '2', name: 'New Subscribers' },
      { id: '3', name: 'VIP Customers' },
    ]
  };
}

// ── Contacts: /api/v1/email/lists ──
export async function fetchContacts(params?: {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
  tag?: string;
  source?: string;
}): Promise<ApiResponse<Contact[]>> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.perPage) query.append('perPage', params.perPage.toString());
  if (params?.status && params.status !== 'all') query.append('status', params.status);
  if (params?.search) query.append('search', params.search);
  // Note: Tag filtering is implemented in backend but might need adjustment if tag isn't a direct column
  if (params?.tag) query.append('tag', params.tag);
  if (params?.source) query.append('source', params.source);

  const response = await fetch(`/api/v1/email/lists?${query.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch contacts: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchContact(id: string): Promise<ApiResponse<Contact>> {
  const response = await fetch(`/api/v1/email/lists/${id}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch contact: ${response.statusText}`);
  }

  return response.json();
}

export async function createContact(data: Partial<Contact>): Promise<ApiResponse<Contact>> {
  const response = await fetch(`/api/v1/email/lists`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create contact: ${response.statusText}`);
  }

  return response.json();
}

export async function updateContact(id: string, data: Partial<Contact>): Promise<ApiResponse<Contact>> {
  const response = await fetch(`/api/v1/email/lists/${id}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update contact: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteContact(id: string): Promise<void> {
  const response = await fetch(`/api/v1/email/lists/${id}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete contact: ${response.statusText}`);
  }
}

export async function addTag(id: string, tag: string): Promise<ApiResponse<Contact>> {
  const response = await fetch(`/api/v1/email/lists/${id}/tags`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ tag }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add tag: ${response.statusText}`);
  }

  return response.json();
}

export async function removeTag(id: string, tag: string): Promise<ApiResponse<Contact>> {
  const response = await fetch(`/api/v1/email/lists/${id}/tags`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ tag }),
  });

  if (!response.ok) {
    throw new Error(`Failed to remove tag: ${response.statusText}`);
  }

  return response.json();
}

// ── Analytics: /api/v1/email/analytics ──
export async function fetchAnalytics(): Promise<ApiResponse<DashboardStats>> {
  const response = await fetch('/api/v1/email/analytics', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important: Send cookies/session with the request
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch analytics: ${response.statusText}`);
  }

  return response.json();
}

// ── Automations: /api/v1/email/automations ──
export async function fetchAutomations(params?: {
  page?: number;
  perPage?: number;
  status?: string;
  search?: string;
}): Promise<ApiResponse<Automation[]>> {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.perPage) query.append('perPage', params.perPage.toString());
  if (params?.status && params.status !== 'all') query.append('status', params.status);
  if (params?.search) query.append('search', params.search);

  const response = await fetch(`/api/v1/email/automations?${query.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch automations: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchAutomation(id: string): Promise<ApiResponse<Automation>> {
  const response = await fetch(`/api/v1/email/automations/${id}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch automation: ${response.statusText}`);
  }

  return response.json();
}

export async function createSegment(data: { name: string; contact_ids?: string[]; filters?: any[] }): Promise<ApiResponse<any>> {
  const response = await fetch('/api/v1/email/segments', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create segment: ${response.statusText}`);
  }

  return response.json();
}

export async function createAutomation(data: Partial<Automation>): Promise<ApiResponse<Automation>> {
  const response = await fetch(`/api/v1/email/automations`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create automation: ${response.statusText}`);
  }

  return response.json();
}

export async function updateAutomation(id: string, data: Partial<Automation>): Promise<ApiResponse<Automation>> {
  const response = await fetch(`/api/v1/email/automations/${id}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update automation: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteAutomation(id: string): Promise<void> {
  const response = await fetch(`/api/v1/email/automations/${id}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete automation: ${response.statusText}`);
  }
}

// ── User ──
export async function fetchUser(): Promise<ApiResponse<{ id: number; name: string; email: string; avatar: string }>> {
  const response = await fetch('/api/v1/user', {
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
}

// ── Notifications ──
export async function fetchNotifications(): Promise<ApiResponse<AppNotification[]>> {
  const response = await fetch('/api/v1/notifications', {
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
}

export async function markNotificationsAsRead(): Promise<void> {
  const response = await fetch('/api/v1/notifications/read', {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to mark notifications as read');
}

export async function clearNotifications(): Promise<void> {
  const response = await fetch('/api/v1/notifications', {
    method: 'DELETE',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to clear notifications');
}
