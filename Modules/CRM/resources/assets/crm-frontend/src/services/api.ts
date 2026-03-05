import { generateTemplateThumbnail } from '@/lib/template-utils';/**
 * Mock API Service
 * Simulates REST API calls for future Laravel integration.
 * Replace implementations with real fetch calls when backend is ready.
 *
 * Base URL pattern: /api/v1/email/...
 */

import type { ApiResponse, Campaign, Contact, DashboardStats, Automation, AppNotification, EmailTemplate } from '@/types';
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

export type EmailMediaItem = {
  filename: string;
  url: string;
  size?: number;
  last_modified?: number;
};

export async function fetchEmailMedia(): Promise<ApiResponse<EmailMediaItem[]>> {
  const response = await fetch('/api/v1/email/media/list', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch email media: ${response.statusText}`);
  }

  const json = await response.json();
  const rows = Array.isArray(json.data) ? json.data : [];

  return {
    data: rows.map((r: any) => ({
      filename: String(r.filename),
      url: String(r.url),
      size: r.size !== undefined ? Number(r.size) : undefined,
      last_modified: r.last_modified !== undefined ? Number(r.last_modified) : undefined,
    })),
  };
}

export async function deleteEmailMedia(filename: string): Promise<void> {
  const response = await fetch(`/api/v1/email/media/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to delete media: ${response.statusText} ${text}`);
  }
}

export async function createSegment(payload: { name: string; filters?: any[]; contact_ids?: any[] }): Promise<ApiResponse<any>> {
  const response = await fetch('/api/v1/email/segments', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to create segment: ${response.statusText}`);
  }

  return response.json();
}

// ── Templates ──
const mapTemplate = (row: any): EmailTemplate => {
  const raw = row?.data ? row.data : row;
  const content = raw?.content;
  let parsed: any = content;
  if (typeof content === 'string') {
    try { parsed = JSON.parse(content); } catch {}
  }
  return {
    id: String(raw.id),
    name: raw.name ?? 'Sem Título',
    content: parsed ?? [],
    thumbnail: raw.thumbnail ?? (parsed ? generateTemplateThumbnail(parsed) : undefined),
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
  };
};

export async function fetchTemplates(): Promise<ApiResponse<EmailTemplate[]>> {
  const response = await fetch('/api/v1/email/templates', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch templates: ${response.statusText}`);
  }
  const json = await response.json();
  const rows = Array.isArray(json.data) ? json.data : json;
  return { data: rows.map(mapTemplate) };
}

export async function fetchTemplate(id: string): Promise<ApiResponse<EmailTemplate>> {
  const response = await fetch(`/api/v1/email/templates/${id}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${response.statusText}`);
  }
  const json = await response.json();
  return { data: mapTemplate(json.data ?? json) };
}

export async function createTemplate(data: Partial<EmailTemplate>): Promise<ApiResponse<EmailTemplate>> {
  const payload = {
    name: data.name,
    type: Array.isArray(data.content) ? 'blocks' : 'html',
    content: data.content,
    status: 'draft',
  };
  const response = await fetch('/api/v1/email/templates', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to create template: ${response.statusText}`);
  }
  const json = await response.json();
  return { data: mapTemplate(json.data ?? json) };
}

export async function updateTemplate(id: string, data: Partial<EmailTemplate>): Promise<ApiResponse<EmailTemplate>> {
  const payload = {
    name: data.name,
    type: Array.isArray(data.content) ? 'blocks' : 'html',
    content: data.content,
    status: 'draft',
  };
  const response = await fetch(`/api/v1/email/templates/${id}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to update template: ${response.statusText}`);
  }
  const json = await response.json();
  return { data: mapTemplate(json.data ?? json) };
}

export async function deleteTemplate(id: string): Promise<ApiResponse<void>> {
  const response = await fetch(`/api/v1/email/templates/${id}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete template: ${response.statusText}`);
  }
  return { data: undefined };
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

export async function fetchCampaignLogs(id: string, params?: { page?: number; perPage?: number }): Promise<ApiResponse<any[]>> {
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

  const json = await response.json();
  const rows = Array.isArray(json.data) ? json.data : [];

  return {
    data: rows,
    meta: json.total !== undefined ? {
      total: json.total,
      page: json.current_page ?? 1,
      perPage: json.per_page ?? rows.length,
      totalPages: json.last_page ?? 1,
    } : undefined,
  };
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

export async function sendCampaignNow(id: string): Promise<{ message: string; queued: number }> {
  const response = await fetch(`/api/v1/email/campaigns/${id}/send-now`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Falha ao enviar agora: ${response.statusText} ${text}`);
  }

  return response.json();
}

export async function fetchSegments(): Promise<ApiResponse<{ id: string; name: string }[]>> {
  const response = await fetch('/api/v1/email/segments', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch segments: ${response.statusText}`);
  }

  const json = await response.json();
  const rows = Array.isArray(json.data) ? json.data : json;
  return {
    data: rows.map((s: any) => ({ id: String(s.id), name: s.name }))
  };
}

export async function fetchSegmentEstimate(id: string): Promise<ApiResponse<{ id: string; name: string; estimated: number }>> {
  const response = await fetch(`/api/v1/email/segments/${id}/estimate`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to estimate segment: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchSegmentEstimateByFilters(payload: { filters: any[] }): Promise<ApiResponse<{ estimated: number }>> {
  const response = await fetch(`/api/v1/email/segments/estimate-filters`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to estimate segment by filters: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchSegmentsFull(): Promise<ApiResponse<any[]>> {
  const response = await fetch('/api/v1/email/segments', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch segments: ${response.statusText}`);
  }

  const json = await response.json();
  const rows = Array.isArray(json.data) ? json.data : json;
  return { data: rows };
}

export async function updateSegment(id: string, payload: { name: string }): Promise<ApiResponse<any>> {
  const response = await fetch(`/api/v1/email/segments/${id}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to update segment: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteSegment(id: string): Promise<void> {
  const response = await fetch(`/api/v1/email/segments/${id}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete segment: ${response.statusText}`);
  }
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
    let message = `Failed to create contact: ${response.statusText}`;
    try {
      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      const payload = isJson ? await response.json() : null;
      if (response.status === 422 && payload && payload.errors) {
        const parts: string[] = [];
        for (const [field, msgs] of Object.entries(payload.errors)) {
          const first = Array.isArray(msgs) ? msgs[0] : String(msgs);
          parts.push(`${field}: ${first}`);
        }
        message = parts.join(' • ');
        const err: any = new Error(message);
        err.status = 422;
        err.errors = payload.errors;
        throw err;
      } else if (payload && payload.message) {
        message = payload.message;
      }
    } catch (_) {
      // Fallback mantém a mensagem padrão
    }
    throw new Error(message);
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

  const json = await response.json();
  const rows = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
  const normalized = rows.map((it: any) => ({
    ...it,
    nodes: Array.isArray(it?.nodes) ? it.nodes : [],
    connections: Array.isArray(it?.connections) ? it.connections : [],
    triggeredCount: Number(it?.triggeredCount ?? 0),
  }));
  return { data: normalized };
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

const getCsrfToken = () => {
  const match = document.cookie.match(new RegExp('(^| )XSRF-TOKEN=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

export async function markNotificationsAsRead(): Promise<void> {
  const token = getCsrfToken();
  const response = await fetch('/api/v1/notifications/read', {
    method: 'POST',
    headers: { 
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'X-XSRF-TOKEN': token } : {})
    },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to mark notifications as read');
}

export async function clearNotifications(): Promise<void> {
  const token = getCsrfToken();
  const response = await fetch('/api/v1/notifications', {
    method: 'DELETE',
    headers: { 
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { 'X-XSRF-TOKEN': token } : {})
    },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to clear notifications');
}
