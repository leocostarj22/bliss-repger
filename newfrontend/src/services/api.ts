import { generateTemplateThumbnail } from '@/lib/template-utils';
import type { MainDashboardData } from '@/types';
/**
 * Mock API Service
 * Simulates REST API calls for future Laravel integration.
 * Replace implementations with real fetch calls when backend is ready.
 *
 * Base URL pattern: /api/v1/email/...
 */

import type { ApiResponse, Campaign, Contact, DashboardStats, Automation, AppNotification, EmailTemplate, Company, Department, User, Role, Employee, Payroll, Timesheet, Vacation, InternalMessage, AdminPost, AdminPostComment, VideoCallMeeting, BlissProduct, BlissCustomer, BlissOrder, BlissOrderProduct, BlissOrderStatus, MyFormulaProduct, MyFormulaCustomer, MyFormulaOrder, MyFormulaOrderProduct, MyFormulaOrderStatus, MyFormulaQuiz, SupportCategory, SupportTicket, EspacoAbsolutoCustomer, EspacoAbsolutoAppointment, EspacoAbsolutoUserGroup, EspacoAbsolutoUserMessage, SystemLog, Task, PersonalNote, TaskPriority, TaskStatus } from '@/types';
import { mockCampaigns, mockContacts, mockDashboardStats, mockAutomations, mockNotifications, mockCompanies, mockDepartments, mockSupportCategories, mockSupportTickets, mockUsers, mockRoles, mockEmployees, mockPayrolls, mockTimesheets, mockVacations, mockInternalMessages, mockAdminPosts, mockVideoCallMeetings, mockBlissProducts, mockBlissCustomers, mockBlissOrders, mockBlissOrderProducts, mockBlissOrderStatuses, mockMyFormulaProducts, mockMyFormulaCustomers, mockMyFormulaOrders, mockMyFormulaOrderProducts, mockMyFormulaOrderStatuses, mockMyFormulaQuizzes, mockEspacoAbsolutoCustomers, mockEspacoAbsolutoAppointments, mockEspacoAbsolutoUserGroups, mockEspacoAbsolutoUserMessages, mockSystemLogs, mockTasks, mockPersonalNotes } from './mockData';

const delay = (ms = 400) => new Promise(r => setTimeout(r, ms + Math.random() * 200));

let csrfReady = false;

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';').map((c) => c.trim());
  const found = parts.find((c) => c.startsWith(`${name}=`));
  if (!found) return null;
  return found.slice(name.length + 1);
};

const ensureCsrfCookie = async (): Promise<void> => {
  if (csrfReady) return;
  const res = await fetch('/sanctum/csrf-cookie', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!res.ok) throw new Error('Falha ao obter CSRF cookie');
  csrfReady = true;
};

const apiFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  const method = (init.method ?? 'GET').toUpperCase();
  const needsCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (needsCsrf) await ensureCsrfCookie();

  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (!headers.has('X-Requested-With')) headers.set('X-Requested-With', 'XMLHttpRequest');

  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (needsCsrf) {
    const token = getCookie('XSRF-TOKEN');
    if (token && !headers.has('X-XSRF-TOKEN')) headers.set('X-XSRF-TOKEN', decodeURIComponent(token));
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? 'include',
  });
};

// ── Weather ──
export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

export async function fetchWeatherData(): Promise<WeatherData> {
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=38.7167&longitude=-9.1333&current_weather=true&timezone=Europe/Lisbon');
    const data = await response.json();
    
    if (data.current_weather) {
      const temp = Math.round(data.current_weather.temperature);
      const weathercode = data.current_weather.weathercode;
      
      // Mapear códigos WMO para condições
      const conditions: { [key: number]: string } = {
        0: 'Céu limpo',
        1: 'Céu limpo',
        2: 'Parcialmente nublado',
        3: 'Nublado',
        45: 'Névoa',
        48: 'Névoa',
        51: 'Garoa',
        53: 'Garoa',
        55: 'Garoa',
        61: 'Chuva',
        63: 'Chuva',
        65: 'Chuva',
        71: 'Neve',
        73: 'Neve',
        75: 'Neve',
        95: 'Trovoada',
        96: 'Trovoada',
        99: 'Trovoada'
      };
      
      return {
        temp,
        condition: conditions[weathercode] || 'Desconhecido',
        icon: getWeatherIcon(weathercode)
      };
    }
    
    throw new Error('Dados do clima não disponíveis');
  } catch (error) {
    console.error('Erro ao buscar clima:', error);
    throw error;
  }
}

function getWeatherIcon(code: number): string {
  if ([0, 1].includes(code)) return 'sun';
  if ([2, 3].includes(code)) return 'cloud';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 55, 61, 63, 65].includes(code)) return 'rain';
  if ([71, 73, 75].includes(code)) return 'snow';
  if ([95, 96, 99].includes(code)) return 'storm';
  return 'cloud';
}

// ── Dashboard ──
export async function fetchDashboard(): Promise<ApiResponse<DashboardStats>> {
  await delay();
  return { data: mockDashboardStats };
}

export async function fetchMainDashboard(): Promise<ApiResponse<MainDashboardData>> {
  const response = await fetch('/api/v1/dashboard', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
  }

  const json = await response.json();
  return { data: json?.data as MainDashboardData };
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
    let msg = response.statusText || 'Erro ao criar template';
    try {
      const json = await response.json();
      const errors = (json as any)?.errors;
      const message = (json as any)?.message;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        const firstMsg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
        msg = firstMsg || msg;
      } else if (message) {
        msg = String(message);
      }
    } catch {
      // ignore
    }
    throw new Error(`Failed to create template: ${msg}`);
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
    let msg = response.statusText || 'Erro ao atualizar template';
    try {
      const json = await response.json();
      const errors = (json as any)?.errors;
      const message = (json as any)?.message;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        const firstMsg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
        msg = firstMsg || msg;
      } else if (message) {
        msg = String(message);
      }
    } catch {
      // ignore
    }
    throw new Error(`Failed to update template: ${msg}`);
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
export async function fetchAnalytics(params?: { days?: number }): Promise<ApiResponse<DashboardStats>> {
  const query = new URLSearchParams();
  if (params?.days) query.append('days', params.days.toString());

  const url = query.toString()
    ? `/api/v1/email/analytics?${query.toString()}`
    : '/api/v1/email/analytics';

  const response = await fetch(url, {
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
export async function fetchUser(): Promise<ApiResponse<{ id: string; name: string; email: string; photo_path?: string | null }>> {
  const response = await apiFetch('/api/v1/me', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch user: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  const idStr = String(json?.data?.id ?? '');

  if (typeof window !== 'undefined' && idStr) {
    window.localStorage.setItem(COMM_CURRENT_USER_ID_KEY, idStr);
  }

  return {
    data: {
      id: idStr,
      name: String(json?.data?.name ?? ''),
      email: String(json?.data?.email ?? ''),
      photo_path: json?.data?.photo_path ?? null,
    },
  };
}

// ── Notifications ──
const NOTIFICATIONS_STORAGE_KEY = 'bliss:notifications';

const readNotifications = (): AppNotification[] => {
  if (typeof window === 'undefined') return mockNotifications;
  try {
    const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(mockNotifications));
      return mockNotifications;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppNotification[]) : mockNotifications;
  } catch {
    return mockNotifications;
  }
};

const writeNotifications = (items: AppNotification[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
};

export async function fetchNotifications(): Promise<ApiResponse<AppNotification[]>> {
  const response = await apiFetch('/api/v1/notifications', {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch notifications: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {}
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as AppNotification[]) : [] };
}

export async function markNotificationsAsRead(): Promise<void> {
  const response = await apiFetch('/api/v1/notifications/read-all', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to mark notifications as read: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {}
    throw new Error(msg);
  }
}

export async function clearNotifications(): Promise<void> {
  const response = await apiFetch('/api/v1/notifications/clear', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to clear notifications: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {}
    throw new Error(msg);
  }
}

export async function logout(): Promise<void> {
  const response = await apiFetch('/logout', {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Falha ao terminar sessão: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {}
    throw new Error(msg);
  }
}

// ── Companies (Admin) ──
const COMPANIES_STORAGE_KEY = 'bliss:admin:companies';

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const readCompanies = (): Company[] => {
  if (typeof window === 'undefined') return mockCompanies;
  try {
    const raw = window.localStorage.getItem(COMPANIES_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(mockCompanies));
      return mockCompanies;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Company[]) : mockCompanies;
  } catch {
    return mockCompanies;
  }
};

const writeCompanies = (items: Company[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(items));
};

export async function fetchCompanies(params?: { search?: string }): Promise<ApiResponse<Company[]>> {
  const qs = new URLSearchParams();
  const search = (params?.search ?? '').trim();
  if (search) qs.set('search', search);

  const url = `/api/v1/companies${qs.toString() ? `?${qs.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch companies: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as Company[]) : [] };
}

export async function fetchCompany(id: string): Promise<ApiResponse<Company>> {
  const response = await apiFetch(`/api/v1/companies/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch company: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as Company };
}

export async function createCompany(payload: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Company>> {
  const response = await apiFetch('/api/v1/companies', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to create company: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as Company };
}

export async function updateCompany(id: string, payload: Partial<Omit<Company, 'id' | 'createdAt'>>): Promise<ApiResponse<Company>> {
  const response = await apiFetch(`/api/v1/companies/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to update company: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as Company };
}

export async function deleteCompany(id: string): Promise<void> {
  const response = await fetch(`/api/v1/companies/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to delete company: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
}

// ── Departments (Admin) ──
const DEPARTMENTS_STORAGE_KEY = 'bliss:admin:departments';

const readDepartments = (): Department[] => {
  if (typeof window === 'undefined') return mockDepartments;
  try {
    const raw = window.localStorage.getItem(DEPARTMENTS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(mockDepartments));
      return mockDepartments;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Department[]) : mockDepartments;
  } catch {
    return mockDepartments;
  }
};

const writeDepartments = (items: Department[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(items));
};

const makeUniqueDepartmentSlug = (base: string, companyId: string, rows: Department[], excludeId?: string) => {
  const normalizedBase = base.trim() ? base.trim() : 'departamento';
  const isTaken = (slug: string) =>
    rows.some((d) => d.company_id === companyId && d.slug === slug && d.id !== excludeId);

  if (!isTaken(normalizedBase)) return normalizedBase;
  let counter = 1;
  while (isTaken(`${normalizedBase}-${counter}`)) counter++;
  return `${normalizedBase}-${counter}`;
};

export async function fetchDepartments(params?: { search?: string; company_id?: string }): Promise<ApiResponse<Department[]>> {
  const qs = new URLSearchParams();
  const search = (params?.search ?? '').trim();
  const companyId = (params?.company_id ?? '').trim();

  if (search) qs.set('search', search);
  if (companyId) qs.set('company_id', companyId);

  const url = `/api/v1/departments${qs.toString() ? `?${qs.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch departments: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as Department[]) : [] };
}

export async function fetchDepartment(id: string): Promise<ApiResponse<Department>> {
  const response = await apiFetch(`/api/v1/departments/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch department: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as Department };
}

export async function createDepartment(
  payload: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResponse<Department>> {
  const response = await apiFetch('/api/v1/departments', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to create department: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as Department };
}

export async function updateDepartment(
  id: string,
  payload: Partial<Omit<Department, 'id' | 'createdAt'>>
): Promise<ApiResponse<Department>> {
  const response = await apiFetch(`/api/v1/departments/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to update department: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as Department };
}

export async function deleteDepartment(id: string): Promise<void> {
  const response = await fetch(`/api/v1/departments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to delete department: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
}

// ── Support: Categories & Tickets ──
const SUPPORT_CATEGORIES_STORAGE_KEY = 'bliss:support:categories';

const readSupportCategories = (): SupportCategory[] => {
  if (typeof window === 'undefined') return mockSupportCategories;
  try {
    const raw = window.localStorage.getItem(SUPPORT_CATEGORIES_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(SUPPORT_CATEGORIES_STORAGE_KEY, JSON.stringify(mockSupportCategories));
      return mockSupportCategories;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SupportCategory[]) : mockSupportCategories;
  } catch {
    return mockSupportCategories;
  }
};

const writeSupportCategories = (items: SupportCategory[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SUPPORT_CATEGORIES_STORAGE_KEY, JSON.stringify(items));
};

const SUPPORT_TICKETS_STORAGE_KEY = 'bliss:support:tickets';

const readSupportTickets = (): SupportTicket[] => {
  if (typeof window === 'undefined') return mockSupportTickets;
  try {
    const raw = window.localStorage.getItem(SUPPORT_TICKETS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(SUPPORT_TICKETS_STORAGE_KEY, JSON.stringify(mockSupportTickets));
      return mockSupportTickets;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SupportTicket[]) : mockSupportTickets;
  } catch {
    return mockSupportTickets;
  }
};

const writeSupportTickets = (items: SupportTicket[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SUPPORT_TICKETS_STORAGE_KEY, JSON.stringify(items));
};

const isSupportTicketOverdue = (t: SupportTicket) => {
  const due = t.due_date ? new Date(t.due_date) : null;
  if (!due || Number.isNaN(due.getTime())) return false;
  if (t.status === 'resolved' || t.status === 'closed') return false;
  return due.getTime() < Date.now();
};

export async function fetchSupportCategories(params?: {
  search?: string;
  company_id?: string;
  is_active?: boolean;
}): Promise<ApiResponse<SupportCategory[]>> {
  const qs = new URLSearchParams();
  const search = (params?.search ?? '').trim();
  const companyId = (params?.company_id ?? '').trim();

  if (search) qs.set('search', search);
  if (companyId) qs.set('company_id', companyId);
  if (typeof params?.is_active === 'boolean') qs.set('is_active', params.is_active ? '1' : '0');

  const url = `/api/v1/support/categories${qs.toString() ? `?${qs.toString()}` : ''}`;
  const response = await apiFetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch support categories: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as SupportCategory[]) : [] };
}

export async function createSupportCategory(
  payload: Omit<SupportCategory, 'id' | 'created_at' | 'updated_at'>
): Promise<ApiResponse<SupportCategory>> {
  const response = await apiFetch('/api/v1/support/categories', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to create support category: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as SupportCategory };
}

export async function updateSupportCategory(
  id: string,
  payload: Partial<Omit<SupportCategory, 'id' | 'created_at'>>
): Promise<ApiResponse<SupportCategory>> {
  const response = await apiFetch(`/api/v1/support/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to update support category: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as SupportCategory };
}

export async function deleteSupportCategory(id: string): Promise<void> {
  const response = await apiFetch(`/api/v1/support/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to delete support category: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
}

export async function fetchSupportTickets(params?: {
  search?: string;
  status?: string;
  priority?: string;
  company_id?: string;
  department_id?: string;
  category_id?: string;
  assigned_to?: string;
  overdue?: boolean;
  unassigned?: boolean;
}): Promise<ApiResponse<SupportTicket[]>> {
  const qs = new URLSearchParams();
  const search = (params?.search ?? '').trim();
  const status = (params?.status ?? '').trim();
  const priority = (params?.priority ?? '').trim();
  const companyId = (params?.company_id ?? '').trim();
  const departmentId = (params?.department_id ?? '').trim();
  const categoryId = (params?.category_id ?? '').trim();
  const assignedTo = (params?.assigned_to ?? '').trim();

  if (search) qs.set('search', search);
  if (status) qs.set('status', status);
  if (priority) qs.set('priority', priority);
  if (companyId) qs.set('company_id', companyId);
  if (departmentId) qs.set('department_id', departmentId);
  if (categoryId) qs.set('category_id', categoryId);
  if (assignedTo) qs.set('assigned_to', assignedTo);
  if (params?.overdue) qs.set('overdue', '1');
  if (params?.unassigned) qs.set('assigned_to', 'none');

  const url = `/api/v1/support/tickets${qs.toString() ? `?${qs.toString()}` : ''}`;
  const response = await apiFetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch support tickets: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as SupportTicket[]) : [] };
}

export async function fetchSupportTicket(id: string): Promise<ApiResponse<SupportTicket>> {
  const response = await apiFetch(`/api/v1/support/tickets/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch support ticket: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as SupportTicket };
}

export async function createSupportTicket(
  payload: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>
): Promise<ApiResponse<SupportTicket>> {
  const response = await apiFetch('/api/v1/support/tickets', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to create support ticket: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as SupportTicket };
}

export async function updateSupportTicket(
  id: string,
  payload: Partial<Omit<SupportTicket, 'id' | 'created_at'>>
): Promise<ApiResponse<SupportTicket>> {
  const response = await apiFetch(`/api/v1/support/tickets/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to update support ticket: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as SupportTicket };
}

export async function deleteSupportTicket(id: string): Promise<void> {
  const response = await apiFetch(`/api/v1/support/tickets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to delete support ticket: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
}

const mapEmployee = (raw: any): Employee => {
  const createdAt = raw?.createdAt ?? raw?.created_at ?? new Date().toISOString();
  const updatedAt = raw?.updatedAt ?? raw?.updated_at ?? new Date().toISOString();

  return {
    id: String(raw?.id ?? ''),
    employee_code: raw?.employee_code == null ? null : String(raw.employee_code),
    name: String(raw?.name ?? ''),
    email: raw?.email == null ? null : String(raw.email),
    system_email: raw?.system_email == null ? null : String(raw.system_email),
    has_system_access: raw?.has_system_access == null ? null : Boolean(raw.has_system_access),
    nif: raw?.nif == null ? null : String(raw.nif),
    document_type: raw?.document_type == null ? null : String(raw.document_type),
    document_number: raw?.document_number == null ? null : String(raw.document_number),
    document_expiration_date: raw?.document_expiration_date == null ? null : String(raw.document_expiration_date),
    nis: raw?.nis == null ? null : String(raw.nis),
    birth_date: raw?.birth_date == null ? null : String(raw.birth_date),
    gender: raw?.gender == null ? null : String(raw.gender),
    nationality: raw?.nationality == null ? null : String(raw.nationality),
    marital_status: raw?.marital_status == null ? null : String(raw.marital_status),
    spouse_name: raw?.spouse_name == null ? null : String(raw.spouse_name),
    spouse_nif: raw?.spouse_nif == null ? null : String(raw.spouse_nif),
    spouse_joint_irs: raw?.spouse_joint_irs == null ? null : Boolean(raw.spouse_joint_irs),
    has_children: raw?.has_children == null ? null : Boolean(raw.has_children),
    children_data: raw?.children_data == null ? null : (raw.children_data as any[]),
    phone: raw?.phone == null ? null : String(raw.phone),
    emergency_contact: raw?.emergency_contact == null ? null : String(raw.emergency_contact),
    emergency_phone: raw?.emergency_phone == null ? null : String(raw.emergency_phone),
    address: raw?.address == null ? null : String(raw.address),
    address_number: raw?.address_number == null ? null : String(raw.address_number),
    complement: raw?.complement == null ? null : String(raw.complement),
    neighborhood: raw?.neighborhood == null ? null : String(raw.neighborhood),
    city: raw?.city == null ? null : String(raw.city),
    state: raw?.state == null ? null : String(raw.state),
    zip_code: raw?.zip_code == null ? null : String(raw.zip_code),
    position: raw?.position == null ? null : String(raw.position),
    department_id: raw?.department_id == null || raw?.department_id === '' ? null : String(raw.department_id),
    company_id: raw?.company_id == null || raw?.company_id === '' ? null : String(raw.company_id),
    hire_date: raw?.hire_date == null ? null : String(raw.hire_date),
    termination_date: raw?.termination_date == null ? null : String(raw.termination_date),
    salary: raw?.salary == null ? null : Number(raw.salary),
    hourly_rate: raw?.hourly_rate == null ? null : Number(raw.hourly_rate),
    vacation_days_balance: raw?.vacation_days_balance == null ? null : Number(raw.vacation_days_balance),
    last_vacation_calculation: raw?.last_vacation_calculation == null ? null : String(raw.last_vacation_calculation),
    employment_type: raw?.employment_type == null ? null : String(raw.employment_type),
    contract_duration: raw?.contract_duration == null ? null : Number(raw.contract_duration),
    auto_renew: raw?.auto_renew == null ? null : Boolean(raw.auto_renew),
    status: raw?.status == null ? null : String(raw.status),
    bank_name: raw?.bank_name == null ? null : String(raw.bank_name),
    bank_agency: raw?.bank_agency == null ? null : String(raw.bank_agency),
    bank_account: raw?.bank_account == null ? null : String(raw.bank_account),
    account_type: raw?.account_type == null ? null : String(raw.account_type),
    notes: raw?.notes == null ? null : String(raw.notes),
    photo_path: raw?.photo_path == null ? null : String(raw.photo_path),
    has_disability: raw?.has_disability == null ? null : Boolean(raw.has_disability),
    disability_declarant: raw?.disability_declarant == null ? null : Boolean(raw.disability_declarant),
    disability_spouse: raw?.disability_spouse == null ? null : Boolean(raw.disability_spouse),
    disability_dependents: raw?.disability_dependents == null ? null : Number(raw.disability_dependents),
    documents: raw?.documents == null ? null : (raw.documents as any[]),
    medical_aptitude_date: raw?.medical_aptitude_date == null ? null : String(raw.medical_aptitude_date),
    medical_status: raw?.medical_status == null ? null : String(raw.medical_status),
    createdAt: String(createdAt),
    updatedAt: String(updatedAt),
  };
};

const pickHrEmployeeError = async (response: Response, fallback: string): Promise<string> => {
  try {
    const json = await response.json();
    if (typeof json?.message === 'string' && json.message.trim()) return json.message;
    const errors = json?.errors;
    if (errors && typeof errors === 'object') {
      const firstKey = Object.keys(errors)[0];
      const firstVal = firstKey ? (errors as any)[firstKey] : null;
      if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') return firstVal[0];
    }
  } catch {
    // ignore
  }
  return fallback;
};

export type EmployeeStats = {
  total: number;
  online: number;
  hiredThisMonth: number;
  birthdaysThisMonth: number;
  active: number;
  inactive: number;
  onLeave: number;
  nearRetirement: number;
};

export async function fetchEmployeeStats(params?: {
  search?: string;
  company_id?: string;
  department_id?: string;
}): Promise<ApiResponse<EmployeeStats>> {
  const qs = new URLSearchParams();
  const search = (params?.search ?? '').trim();
  const companyId = (params?.company_id ?? '').trim();
  const departmentId = (params?.department_id ?? '').trim();

  if (search) qs.set('search', search);
  if (companyId) qs.set('company_id', companyId);
  if (departmentId) qs.set('department_id', departmentId);

  const url = `/api/v1/hr/employees/stats${qs.toString() ? `?${qs.toString()}` : ''}`;
  const response = await apiFetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to fetch employee stats: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  const data = json?.data ?? {};

  return {
    data: {
      total: Number(data?.total ?? 0),
      online: Number(data?.online ?? 0),
      hiredThisMonth: Number(data?.hiredThisMonth ?? 0),
      birthdaysThisMonth: Number(data?.birthdaysThisMonth ?? 0),
      active: Number(data?.active ?? 0),
      inactive: Number(data?.inactive ?? 0),
      onLeave: Number(data?.onLeave ?? 0),
      nearRetirement: Number(data?.nearRetirement ?? 0),
    },
  };
}

export async function fetchEmployees(params?: {
  search?: string;
  company_id?: string;
  department_id?: string;
  status?: string;
}): Promise<ApiResponse<Employee[]>> {
  const qs = new URLSearchParams();
  const search = (params?.search ?? '').trim();
  const companyId = (params?.company_id ?? '').trim();
  const departmentId = (params?.department_id ?? '').trim();
  const status = (params?.status ?? '').trim();

  if (search) qs.set('search', search);
  if (companyId) qs.set('company_id', companyId);
  if (departmentId) qs.set('department_id', departmentId);
  if (status) qs.set('status', status);

  const url = `/api/v1/hr/employees${qs.toString() ? `?${qs.toString()}` : ''}`;
  const response = await apiFetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to fetch employees: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  const rows = Array.isArray(json?.data) ? (json.data as any[]) : [];
  return { data: rows.map(mapEmployee) };
}

export async function fetchEmployee(id: string): Promise<ApiResponse<Employee>> {
  const response = await apiFetch(`/api/v1/hr/employees/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to fetch employee: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapEmployee(json?.data ?? json) };
}

export async function createEmployee(payload: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Employee>> {
  const response = await apiFetch('/api/v1/hr/employees', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to create employee: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapEmployee(json?.data ?? json) };
}

export async function updateEmployee(
  id: string,
  payload: Partial<Omit<Employee, 'id' | 'createdAt'>>
): Promise<ApiResponse<Employee>> {
  const response = await apiFetch(`/api/v1/hr/employees/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to update employee: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapEmployee(json?.data ?? json) };
}

export async function deleteEmployee(id: string): Promise<void> {
  const response = await apiFetch(`/api/v1/hr/employees/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to delete employee: ${response.statusText}`);
    throw new Error(msg);
  }
}

const normalizeTimestamps = (raw: any) => {
  const createdAt = raw?.createdAt ?? raw?.created_at;
  const updatedAt = raw?.updatedAt ?? raw?.updated_at;
  const now = new Date().toISOString();
  return {
    createdAt: typeof createdAt === 'string' ? createdAt : now,
    updatedAt: typeof updatedAt === 'string' ? updatedAt : now,
  };
};

const mapPayroll = (raw: any): Payroll => {
  const ts = normalizeTimestamps(raw);
  return {
    ...(raw ?? {}),
    id: String(raw?.id ?? ''),
    employee_id: String(raw?.employee_id ?? ''),
    company_id: String(raw?.company_id ?? ''),
    createdAt: ts.createdAt,
    updatedAt: ts.updatedAt,
  } as Payroll;
};

const mapVacation = (raw: any): Vacation => {
  const ts = normalizeTimestamps(raw);
  return {
    ...(raw ?? {}),
    id: String(raw?.id ?? ''),
    employee_id: String(raw?.employee_id ?? ''),
    company_id: String(raw?.company_id ?? ''),
    createdAt: ts.createdAt,
    updatedAt: ts.updatedAt,
  } as Vacation;
};

const mapTimesheet = (raw: any): Timesheet => {
  const ts = normalizeTimestamps(raw);
  return {
    ...(raw ?? {}),
    id: String(raw?.id ?? ''),
    employee_id: String(raw?.employee_id ?? ''),
    company_id: String(raw?.company_id ?? ''),
    createdAt: ts.createdAt,
    updatedAt: ts.updatedAt,
  } as Timesheet;
};

const HR_PAYROLLS_STORAGE_KEY = 'bliss:hr:payrolls';

const readPayrolls = (): Payroll[] => {
  if (typeof window === 'undefined') return mockPayrolls;
  try {
    const raw = window.localStorage.getItem(HR_PAYROLLS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(HR_PAYROLLS_STORAGE_KEY, JSON.stringify(mockPayrolls));
      return mockPayrolls;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Payroll[]) : mockPayrolls;
  } catch {
    return mockPayrolls;
  }
};

const writePayrolls = (items: Payroll[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HR_PAYROLLS_STORAGE_KEY, JSON.stringify(items));
};

export async function fetchPayrolls(params?: {
  employee_id?: string;
  company_id?: string;
  status?: string;
  reference_month?: string;
  reference_year?: string;
}): Promise<ApiResponse<Payroll[]>> {
  const qs = new URLSearchParams();
  if (params?.employee_id) qs.set('employee_id', params.employee_id);
  if (params?.company_id) qs.set('company_id', params.company_id);
  if (params?.status) qs.set('status', params.status);
  if (params?.reference_month) qs.set('reference_month', params.reference_month);
  if (params?.reference_year) qs.set('reference_year', params.reference_year);

  const url = `/api/v1/hr/payrolls${qs.toString() ? `?${qs.toString()}` : ''}`;
  const response = await apiFetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to fetch payrolls: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  const rows = Array.isArray(json?.data) ? json.data : [];
  return { data: rows.map(mapPayroll) };
}

export async function fetchPayroll(id: string): Promise<ApiResponse<Payroll>> {
  const response = await apiFetch(`/api/v1/hr/payrolls/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to fetch payroll: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapPayroll(json?.data ?? json) };
}

export async function createPayroll(payload: Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Payroll>> {
  const response = await apiFetch('/api/v1/hr/payrolls', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to create payroll: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapPayroll(json?.data ?? json) };
}

export async function updatePayroll(
  id: string,
  payload: Partial<Omit<Payroll, 'id' | 'createdAt'>>
): Promise<ApiResponse<Payroll>> {
  const response = await apiFetch(`/api/v1/hr/payrolls/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to update payroll: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapPayroll(json?.data ?? json) };
}

export async function deletePayroll(id: string): Promise<void> {
  const response = await apiFetch(`/api/v1/hr/payrolls/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to delete payroll: ${response.statusText}`);
    throw new Error(msg);
  }
} 

// ── Vacations (HR) ──
const HR_VACATIONS_STORAGE_KEY = 'bliss:hr:vacations';

const readVacations = (): Vacation[] => {
  if (typeof window === 'undefined') return mockVacations;
  try {
    const raw = window.localStorage.getItem(HR_VACATIONS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(HR_VACATIONS_STORAGE_KEY, JSON.stringify(mockVacations));
      return mockVacations;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Vacation[]) : mockVacations;
  } catch {
    return mockVacations;
  }
};

const writeVacations = (items: Vacation[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HR_VACATIONS_STORAGE_KEY, JSON.stringify(items));
};

export async function fetchVacations(params?: {
  employee_id?: string;
  company_id?: string;
  status?: string;
  vacation_year?: string;
  vacation_type?: string;
}): Promise<ApiResponse<Vacation[]>> {
  const qs = new URLSearchParams();
  if (params?.employee_id) qs.set('employee_id', params.employee_id);
  if (params?.company_id) qs.set('company_id', params.company_id);
  if (params?.status) qs.set('status', params.status);
  if (params?.vacation_year) qs.set('vacation_year', params.vacation_year);
  if (params?.vacation_type) qs.set('vacation_type', params.vacation_type);

  const url = `/api/v1/hr/vacations${qs.toString() ? `?${qs.toString()}` : ''}`;
  const response = await apiFetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to fetch vacations: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  const rows = Array.isArray(json?.data) ? json.data : [];
  return { data: rows.map(mapVacation) };
}

export async function fetchVacation(id: string): Promise<ApiResponse<Vacation>> {
  const response = await apiFetch(`/api/v1/hr/vacations/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to fetch vacation: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapVacation(json?.data ?? json) };
}

export async function createVacation(payload: Omit<Vacation, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Vacation>> {
  const response = await apiFetch('/api/v1/hr/vacations', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to create vacation: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapVacation(json?.data ?? json) };
}

export async function updateVacation(
  id: string,
  payload: Partial<Omit<Vacation, 'id' | 'createdAt'>>
): Promise<ApiResponse<Vacation>> {
  const response = await apiFetch(`/api/v1/hr/vacations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to update vacation: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapVacation(json?.data ?? json) };
}

export async function deleteVacation(id: string): Promise<void> {
  const response = await apiFetch(`/api/v1/hr/vacations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to delete vacation: ${response.statusText}`);
    throw new Error(msg);
  }
} 

// ── Timesheets (HR) ──
const HR_TIMESHEETS_STORAGE_KEY = 'bliss:hr:timesheets';

const parseTimeToMinutes = (t?: string | null) => {
  if (!t) return null;
  const [hh, mm] = t.split(':').map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
};

const computeTimesheetTotals = (input: {
  clock_in?: string | null;
  clock_out?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
  expected_hours?: number | null;
}) => {
  const inMin = parseTimeToMinutes(input.clock_in);
  const outMin = parseTimeToMinutes(input.clock_out);
  const lsMin = parseTimeToMinutes(input.lunch_start);
  const leMin = parseTimeToMinutes(input.lunch_end);

  if (inMin === null || outMin === null || outMin <= inMin) {
    return { total_hours: 0, lunch_hours: 0, overtime_hours: 0 };
  }

  let totalMinutes = outMin - inMin;

  let lunchMinutes = 0;
  if (lsMin !== null && leMin !== null && leMin > lsMin) {
    lunchMinutes = leMin - lsMin;
    totalMinutes = Math.max(0, totalMinutes - lunchMinutes);
  }

  const total_hours = Math.round((totalMinutes / 60) * 100) / 100;
  const lunch_hours = Math.round((lunchMinutes / 60) * 100) / 100;
  const expected = input.expected_hours ?? 8;
  const overtime_hours = Math.max(0, Math.round((total_hours - expected) * 100) / 100);

  return { total_hours, lunch_hours, overtime_hours };
};

const readTimesheets = (): Timesheet[] => {
  if (typeof window === 'undefined') return mockTimesheets;
  try {
    const raw = window.localStorage.getItem(HR_TIMESHEETS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(HR_TIMESHEETS_STORAGE_KEY, JSON.stringify(mockTimesheets));
      return mockTimesheets;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Timesheet[]) : mockTimesheets;
  } catch {
    return mockTimesheets;
  }
};

const writeTimesheets = (items: Timesheet[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HR_TIMESHEETS_STORAGE_KEY, JSON.stringify(items));
};

export async function fetchTimesheets(params?: {
  employee_id?: string;
  company_id?: string;
  status?: string;
  work_date?: string;
}): Promise<ApiResponse<Timesheet[]>> {
  const qs = new URLSearchParams();
  if (params?.employee_id) qs.set('employee_id', params.employee_id);
  if (params?.company_id) qs.set('company_id', params.company_id);
  if (params?.status) qs.set('status', params.status);
  if (params?.work_date) qs.set('work_date', params.work_date);

  const url = `/api/v1/hr/timesheets${qs.toString() ? `?${qs.toString()}` : ''}`;
  const response = await apiFetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to fetch timesheets: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  const rows = Array.isArray(json?.data) ? json.data : [];
  return { data: rows.map(mapTimesheet) };
}

export async function fetchTimesheet(id: string): Promise<ApiResponse<Timesheet>> {
  const response = await apiFetch(`/api/v1/hr/timesheets/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to fetch timesheet: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapTimesheet(json?.data ?? json) };
}

export async function createTimesheet(
  payload: Omit<Timesheet, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResponse<Timesheet>> {
  const response = await apiFetch('/api/v1/hr/timesheets', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to create timesheet: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapTimesheet(json?.data ?? json) };
}

export async function updateTimesheet(
  id: string,
  payload: Partial<Omit<Timesheet, 'id' | 'createdAt'>>
): Promise<ApiResponse<Timesheet>> {
  const response = await apiFetch(`/api/v1/hr/timesheets/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to update timesheet: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapTimesheet(json?.data ?? json) };
}

export async function deleteTimesheet(id: string): Promise<void> {
  const response = await apiFetch(`/api/v1/hr/timesheets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const msg = await pickHrEmployeeError(response, `Failed to delete timesheet: ${response.statusText}`);
    throw new Error(msg);
  }
}

const COMM_CURRENT_USER_ID_KEY = 'bliss:currentUserId';
const COMM_MESSAGES_STORAGE_KEY = 'bliss:communication:messages';
const COMM_POSTS_STORAGE_KEY = 'bliss:communication:admin_posts';
const COMM_MEETINGS_STORAGE_KEY = 'bliss:communication:meetings';

const currentUserId = () => {
  if (typeof window === 'undefined') return 'usr1';
  return window.localStorage.getItem(COMM_CURRENT_USER_ID_KEY) || 'usr1';
};

const genId = (prefix: string) => `${prefix}_${Math.random().toString(16).slice(2)}`;

const readCommMessages = (): InternalMessage[] => {
  if (typeof window === 'undefined') return mockInternalMessages;
  try {
    const raw = window.localStorage.getItem(COMM_MESSAGES_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(COMM_MESSAGES_STORAGE_KEY, JSON.stringify(mockInternalMessages));
      return mockInternalMessages;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as InternalMessage[]) : mockInternalMessages;
  } catch {
    return mockInternalMessages;
  }
};

const writeCommMessages = (items: InternalMessage[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COMM_MESSAGES_STORAGE_KEY, JSON.stringify(items));
};

const withFolder = (m: InternalMessage, userId: string): InternalMessage => {
  const folder = m.from_user_id === userId ? 'sent' : m.to_user_id === userId ? 'inbox' : 'archived';
  return { ...m, folder };
};

export async function fetchInternalMessages(params?: {
  folder?: 'inbox' | 'sent' | 'archived' | string;
  search?: string;
  user_id?: string;
}): Promise<ApiResponse<InternalMessage[]>> {
  const qs = new URLSearchParams();
  const folder = (params?.folder ?? 'inbox').trim();
  const search = (params?.search ?? '').trim();

  if (folder) qs.set('folder', folder);
  if (search) qs.set('search', search);

  const url = `/api/v1/communication/messages${qs.toString() ? `?${qs.toString()}` : ''}`;
  const response = await apiFetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch messages: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as InternalMessage[]) : [] };
}

export async function fetchInternalMessage(id: string): Promise<ApiResponse<InternalMessage>> {
  await delay();
  const found = readCommMessages().find((m) => m.id === id);
  if (!found) throw new Error('Message not found');
  return { data: found };
}

export async function sendInternalMessage(payload: {
  to_user_id: string;
  subject: string;
  body: string;
  thread_id?: string | null;
}): Promise<ApiResponse<InternalMessage>> {
  const response = await apiFetch('/api/v1/communication/messages', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      to_user_id: payload.to_user_id,
      subject: payload.subject,
      body: payload.body,
    }),
  });

  if (!response.ok) {
    let msg = `Failed to send message: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as InternalMessage };
}

export async function markInternalMessageRead(id: string): Promise<ApiResponse<InternalMessage>> {
  const response = await apiFetch(`/api/v1/communication/messages/${encodeURIComponent(id)}/read`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to mark message as read: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as InternalMessage };
}

const readAdminPosts = (): AdminPost[] => {
  if (typeof window === 'undefined') return mockAdminPosts;
  try {
    const raw = window.localStorage.getItem(COMM_POSTS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(COMM_POSTS_STORAGE_KEY, JSON.stringify(mockAdminPosts));
      return mockAdminPosts;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AdminPost[]) : mockAdminPosts;
  } catch {
    return mockAdminPosts;
  }
};

const writeAdminPosts = (items: AdminPost[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COMM_POSTS_STORAGE_KEY, JSON.stringify(items));
};

export async function fetchAdminPosts(): Promise<ApiResponse<AdminPost[]>> {
  const response = await apiFetch('/api/v1/communication/posts', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch posts: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as AdminPost[]) : [] };
}

export async function createAdminPost(payload: {
  title?: string | null;
  content: string;
  type?: 'text' | 'image' | 'video' | 'announcement' | string | null;
  priority?: 'low' | 'normal' | 'high' | 'urgent' | string | null;
  featured_image_url?: string | null;
  youtube_video_url?: string | null;
  attachment_urls?: string[] | null;
  is_pinned?: boolean;
  expires_at?: string | null;
}): Promise<ApiResponse<AdminPost>> {
  const response = await apiFetch('/api/v1/communication/posts', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to create post: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as AdminPost };
}

export async function toggleAdminPostLike(postId: string): Promise<ApiResponse<AdminPost>> {
  const response = await apiFetch(`/api/v1/communication/posts/${encodeURIComponent(postId)}/toggle-like`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to toggle like: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as AdminPost };
}

export async function toggleAdminPostPin(postId: string): Promise<ApiResponse<AdminPost>> {
  const response = await apiFetch(`/api/v1/communication/posts/${encodeURIComponent(postId)}/toggle-pin`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to toggle pin: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as AdminPost };
}

export async function deleteAdminPost(postId: string): Promise<ApiResponse<boolean>> {
  const response = await apiFetch(`/api/v1/communication/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to delete post: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Boolean(json?.data) };
}

export async function fetchAdminPostComments(postId: string): Promise<ApiResponse<AdminPostComment[]>> {
  const response = await apiFetch(`/api/v1/communication/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch comments: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as AdminPostComment[]) : [] };
}

export async function addAdminPostComment(postId: string, payload: { content: string }): Promise<ApiResponse<AdminPostComment>> {
  const response = await apiFetch(`/api/v1/communication/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to add comment: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as AdminPostComment };
}

const readMeetings = (): VideoCallMeeting[] => {
  if (typeof window === 'undefined') return mockVideoCallMeetings;
  try {
    const raw = window.localStorage.getItem(COMM_MEETINGS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(COMM_MEETINGS_STORAGE_KEY, JSON.stringify(mockVideoCallMeetings));
      return mockVideoCallMeetings;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as VideoCallMeeting[]) : mockVideoCallMeetings;
  } catch {
    return mockVideoCallMeetings;
  }
};

const writeMeetings = (items: VideoCallMeeting[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COMM_MEETINGS_STORAGE_KEY, JSON.stringify(items));
};

const genMeetUrl = () => {
  const p = () => Math.random().toString(16).slice(2, 5);
  return `https://meet.google.com/${p()}-${p()}${p()}-${p()}${p()}`.slice(0, 28);
};

export async function fetchVideoCallMeetings(): Promise<ApiResponse<VideoCallMeeting[]>> {
  const response = await apiFetch('/api/v1/communication/video-calls', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch video calls: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as VideoCallMeeting[]) : [] };
}

export async function createVideoCallMeeting(payload: { title: string; scheduled_at?: string | null }): Promise<ApiResponse<VideoCallMeeting>> {
  const response = await apiFetch('/api/v1/communication/video-calls', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to create video call: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as VideoCallMeeting };
}

const CRM_PRODUCTS_STORAGE_KEY = 'bliss:crm:products';
const CRM_CUSTOMERS_STORAGE_KEY = 'bliss:crm:customers';
const CRM_ORDERS_STORAGE_KEY = 'bliss:crm:orders';
const CRM_ORDER_PRODUCTS_STORAGE_KEY = 'bliss:crm:order_products';
const CRM_ORDER_STATUSES_STORAGE_KEY = 'bliss:crm:order_statuses';

const readBlissProducts = (): BlissProduct[] => {
  if (typeof window === 'undefined') return mockBlissProducts;
  try {
    const raw = window.localStorage.getItem(CRM_PRODUCTS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(CRM_PRODUCTS_STORAGE_KEY, JSON.stringify(mockBlissProducts));
      return mockBlissProducts;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BlissProduct[]) : mockBlissProducts;
  } catch {
    return mockBlissProducts;
  }
};

const writeBlissProducts = (items: BlissProduct[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CRM_PRODUCTS_STORAGE_KEY, JSON.stringify(items));
};

const readBlissCustomers = (): BlissCustomer[] => {
  if (typeof window === 'undefined') return mockBlissCustomers;
  try {
    const raw = window.localStorage.getItem(CRM_CUSTOMERS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(CRM_CUSTOMERS_STORAGE_KEY, JSON.stringify(mockBlissCustomers));
      return mockBlissCustomers;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BlissCustomer[]) : mockBlissCustomers;
  } catch {
    return mockBlissCustomers;
  }
};

const writeBlissCustomers = (items: BlissCustomer[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CRM_CUSTOMERS_STORAGE_KEY, JSON.stringify(items));
};

const readBlissOrderStatuses = (): BlissOrderStatus[] => {
  if (typeof window === 'undefined') return mockBlissOrderStatuses;
  try {
    const raw = window.localStorage.getItem(CRM_ORDER_STATUSES_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(CRM_ORDER_STATUSES_STORAGE_KEY, JSON.stringify(mockBlissOrderStatuses));
      return mockBlissOrderStatuses;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BlissOrderStatus[]) : mockBlissOrderStatuses;
  } catch {
    return mockBlissOrderStatuses;
  }
};

const readBlissOrders = (): BlissOrder[] => {
  if (typeof window === 'undefined') return mockBlissOrders;
  try {
    const raw = window.localStorage.getItem(CRM_ORDERS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(CRM_ORDERS_STORAGE_KEY, JSON.stringify(mockBlissOrders));
      return mockBlissOrders;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BlissOrder[]) : mockBlissOrders;
  } catch {
    return mockBlissOrders;
  }
};

const writeBlissOrders = (items: BlissOrder[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CRM_ORDERS_STORAGE_KEY, JSON.stringify(items));
};

const readBlissOrderProducts = (): BlissOrderProduct[] => {
  if (typeof window === 'undefined') return mockBlissOrderProducts;
  try {
    const raw = window.localStorage.getItem(CRM_ORDER_PRODUCTS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(CRM_ORDER_PRODUCTS_STORAGE_KEY, JSON.stringify(mockBlissOrderProducts));
      return mockBlissOrderProducts;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BlissOrderProduct[]) : mockBlissOrderProducts;
  } catch {
    return mockBlissOrderProducts;
  }
};

const writeBlissOrderProducts = (items: BlissOrderProduct[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CRM_ORDER_PRODUCTS_STORAGE_KEY, JSON.stringify(items));
};

const normalizeCrmEmail = (email: string) => email.trim().toLowerCase();

export async function fetchBlissProducts(params?: { search?: string; status?: 'all' | 'active' | 'inactive' }): Promise<ApiResponse<BlissProduct[]>> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);

  const response = await apiFetch(`/api/v1/bliss/products${qs.toString() ? `?${qs.toString()}` : ''}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Falha ao obter produtos: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {}
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as BlissProduct[]) : [] };
}

export async function createBlissProduct(payload: {
  model: string;
  name: string;
  description?: string | null;
  price?: number | null;
  quantity?: number | null;
  status?: boolean;
  image_url?: string | null;
}): Promise<ApiResponse<BlissProduct>> {
  await delay(250);
  const rows = readBlissProducts();
  const now = new Date().toISOString();
  const product_id = genId('p');

  const next: BlissProduct = {
    product_id,
    model: payload.model.trim(),
    price: payload.price ?? null,
    quantity: payload.quantity ?? null,
    status: payload.status ?? true,
    date_added: now,
    date_modified: now,
    image: null,
    image_url: payload.image_url ?? null,
    description: {
      product_id,
      language_id: 1,
      name: payload.name.trim() || payload.model.trim() || 'Produto',
      description: payload.description ?? null,
    },
  };

  writeBlissProducts([next, ...rows]);
  return { data: next };
}

export async function updateBlissProduct(
  product_id: string,
  payload: Partial<{
    model: string;
    name: string;
    description: string | null;
    price: number | null;
    quantity: number | null;
    status: boolean;
    image_url: string | null;
  }>
): Promise<ApiResponse<BlissProduct>> {
  await delay(250);
  const rows = readBlissProducts();
  const idx = rows.findIndex((p) => p.product_id === product_id);
  if (idx < 0) throw new Error('Product not found');

  const current = rows[idx];
  const updated: BlissProduct = {
    ...current,
    model: payload.model !== undefined ? payload.model.trim() : current.model,
    price: payload.price !== undefined ? payload.price : current.price,
    quantity: payload.quantity !== undefined ? payload.quantity : current.quantity,
    status: payload.status !== undefined ? payload.status : current.status,
    image_url: payload.image_url !== undefined ? payload.image_url : current.image_url,
    date_modified: new Date().toISOString(),
    description: {
      product_id,
      language_id: current.description?.language_id ?? 1,
      name: payload.name !== undefined ? payload.name.trim() : (current.description?.name ?? current.model),
      description: payload.description !== undefined ? payload.description : (current.description?.description ?? null),
    },
  };

  const nextRows = [...rows];
  nextRows[idx] = updated;
  writeBlissProducts(nextRows);
  return { data: updated };
}

export async function deleteBlissProduct(product_id: string): Promise<void> {
  await delay(200);
  writeBlissProducts(readBlissProducts().filter((p) => p.product_id !== product_id));
}

export async function fetchBlissCustomers(params?: { search?: string; status?: 'all' | 'active' | 'inactive' }): Promise<ApiResponse<BlissCustomer[]>> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);

  const response = await apiFetch(`/api/v1/bliss/customers${qs.toString() ? `?${qs.toString()}` : ''}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Falha ao obter clientes: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {}
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as BlissCustomer[]) : [] };
}

export async function exportBlissCustomersToContacts(customerIds: string[]): Promise<ApiResponse<{ contact_ids: number[]; created_count: number; updated_count: number }>> {
  const response = await apiFetch('/api/v1/bliss/customers/export-contacts', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ customer_ids: customerIds }),
  });

  if (!response.ok) {
    let msg = `Falha ao exportar contactos: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {}
    throw new Error(msg);
  }

  const json = await response.json();
  const data = json?.data as { contact_ids: number[]; created_count: number; updated_count: number };
  return { data };
}

export async function createBlissCustomer(payload: {
  firstname: string;
  lastname: string;
  email: string;
  telephone?: string | null;
  status?: boolean;
}): Promise<ApiResponse<BlissCustomer>> {
  await delay(250);
  const rows = readBlissCustomers();
  const now = new Date().toISOString();

  const email = normalizeCrmEmail(payload.email);
  if (!email) throw new Error('Email é obrigatório');
  if (rows.some((c) => normalizeCrmEmail(c.email) === email)) throw new Error('Email já existe');

  const next: BlissCustomer = {
    customer_id: genId('c'),
    firstname: payload.firstname.trim() || 'Cliente',
    lastname: payload.lastname.trim(),
    email,
    telephone: payload.telephone ?? null,
    status: payload.status ?? true,
    date_added: now,
  };

  writeBlissCustomers([next, ...rows]);
  return { data: next };
}

export async function updateBlissCustomer(
  customer_id: string,
  payload: Partial<{ firstname: string; lastname: string; email: string; telephone: string | null; status: boolean }>
): Promise<ApiResponse<BlissCustomer>> {
  await delay(250);
  const rows = readBlissCustomers();
  const idx = rows.findIndex((c) => c.customer_id === customer_id);
  if (idx < 0) throw new Error('Customer not found');

  const current = rows[idx];

  let nextEmail = current.email;
  if (payload.email !== undefined) {
    nextEmail = normalizeCrmEmail(payload.email);
    if (!nextEmail) throw new Error('Email é obrigatório');
    if (rows.some((c) => c.customer_id !== customer_id && normalizeCrmEmail(c.email) === nextEmail)) throw new Error('Email já existe');
  }

  const updated: BlissCustomer = {
    ...current,
    firstname: payload.firstname !== undefined ? payload.firstname.trim() : current.firstname,
    lastname: payload.lastname !== undefined ? payload.lastname.trim() : current.lastname,
    email: nextEmail,
    telephone: payload.telephone !== undefined ? payload.telephone : current.telephone ?? null,
    status: payload.status !== undefined ? payload.status : current.status,
  };

  const nextRows = [...rows];
  nextRows[idx] = updated;
  writeBlissCustomers(nextRows);
  return { data: updated };
}

export async function deleteBlissCustomer(customer_id: string): Promise<void> {
  await delay(200);
  writeBlissCustomers(readBlissCustomers().filter((c) => c.customer_id !== customer_id));
}

export async function fetchBlissOrderStatuses(): Promise<ApiResponse<BlissOrderStatus[]>> {
  const response = await apiFetch('/api/v1/bliss/order-statuses', {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Falha ao obter estados de pedido: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {}
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as BlissOrderStatus[]) : [] };
}

export interface BlissDashboardData {
  total_orders: number;
  total_revenue: number;
  customers_count: number;
  products_count: number;
  latest_orders: BlissOrder[];
}

export async function fetchBlissDashboard(): Promise<ApiResponse<BlissDashboardData>> {
  const response = await apiFetch('/api/v1/bliss/dashboard', {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Falha ao obter dashboard Bliss: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {}
    throw new Error(msg);
  }

  const json = await response.json();
  const data = json?.data as BlissDashboardData;
  return { data };
}

export async function fetchBlissOrders(params?: { search?: string; status_id?: string; page?: number; per_page?: number; include_unknown?: boolean; dedup?: boolean }): Promise<ApiResponse<BlissOrder[]>> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status_id) qs.set('status_id', params.status_id);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.per_page) qs.set('per_page', String(params.per_page));
  if (params?.include_unknown !== undefined) qs.set('include_unknown', params.include_unknown ? '1' : '0');
  if (params?.dedup !== undefined) qs.set('dedup', params.dedup ? '1' : '0');

  const response = await apiFetch(`/api/v1/bliss/orders${qs.toString() ? `?${qs.toString()}` : ''}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Falha ao obter pedidos: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {}
    throw new Error(msg);
  }

  const json = await response.json();
  const meta = json?.meta && typeof json.meta === 'object' ? json.meta : undefined;
  return { data: Array.isArray(json?.data) ? (json.data as BlissOrder[]) : [], meta };
}

export async function createBlissOrder(payload: {
  customer_id: string;
  order_status_id: string;
  products: Array<{ product_id: string; quantity: number }>;
  payment_method?: string | null;
  shipping_method?: string | null;
}): Promise<ApiResponse<BlissOrder>> {
  await delay(300);
  const customers = readBlissCustomers();
  const customer = customers.find((c) => c.customer_id === payload.customer_id);
  if (!customer) throw new Error('Customer not found');

  const products = readBlissProducts();
  const now = new Date().toISOString();

  const order_id = genId('o');
  const orderProductsRows = readBlissOrderProducts();

  const items: BlissOrderProduct[] = payload.products
    .filter((p) => p.quantity > 0)
    .map((p) => {
      const prod = products.find((x) => x.product_id === p.product_id);
      if (!prod) throw new Error('Product not found');
      const name = prod.description?.name ?? prod.model;
      const price = Number(prod.price ?? 0);
      const quantity = Number(p.quantity);
      const total = price * quantity;

      return {
        order_product_id: genId('op'),
        order_id,
        product_id: prod.product_id,
        name,
        model: prod.model,
        quantity,
        price,
        total,
        tax: 0,
        reward: 0,
      };
    });

  const total = items.reduce((sum, i) => sum + i.total, 0);

  const order: BlissOrder = {
    order_id,
    invoice_no: null,
    customer_id: customer.customer_id,
    firstname: customer.firstname,
    lastname: customer.lastname,
    email: customer.email,
    telephone: customer.telephone ?? null,
    total,
    order_status_id: payload.order_status_id,
    date_added: now,
    date_modified: now,
    payment_method: payload.payment_method ?? null,
    shipping_method: payload.shipping_method ?? null,
  };

  writeBlissOrders([order, ...readBlissOrders()]);
  writeBlissOrderProducts([...items, ...orderProductsRows]);

  return {
    data: {
      ...order,
      status: readBlissOrderStatuses().find((s) => s.order_status_id === order.order_status_id) ?? null,
      products: items,
    },
  };
}

export async function updateBlissOrderStatus(order_id: string, payload: { order_status_id: string }): Promise<ApiResponse<BlissOrder>> {
  await delay(250);
  const rows = readBlissOrders();
  const idx = rows.findIndex((o) => o.order_id === order_id);
  if (idx < 0) throw new Error('Order not found');

  const current = rows[idx];
  const updated: BlissOrder = {
    ...current,
    order_status_id: payload.order_status_id,
    date_modified: new Date().toISOString(),
  };

  const nextRows = [...rows];
  nextRows[idx] = updated;
  writeBlissOrders(nextRows);

  return {
    data: {
      ...updated,
      status: readBlissOrderStatuses().find((s) => s.order_status_id === updated.order_status_id) ?? null,
      products: readBlissOrderProducts().filter((op) => op.order_id === order_id),
    },
  };
}

export async function deleteBlissOrder(order_id: string): Promise<void> {
  await delay(250);
  writeBlissOrders(readBlissOrders().filter((o) => o.order_id !== order_id));
  writeBlissOrderProducts(readBlissOrderProducts().filter((op) => op.order_id !== order_id));
}

const ESPACO_ABSOLUTO_CUSTOMERS_STORAGE_KEY = 'bliss:espacoabsoluto:customers';
const ESPACO_ABSOLUTO_APPOINTMENTS_STORAGE_KEY = 'bliss:espacoabsoluto:appointments';
const ESPACO_ABSOLUTO_USER_GROUPS_STORAGE_KEY = 'bliss:espacoabsoluto:user_groups';
const ESPACO_ABSOLUTO_USER_MESSAGES_STORAGE_KEY = 'bliss:espacoabsoluto:user_messages';

const readEspacoAbsolutoCustomers = (): EspacoAbsolutoCustomer[] => {
  if (typeof window === 'undefined') return mockEspacoAbsolutoCustomers;
  try {
    const raw = window.localStorage.getItem(ESPACO_ABSOLUTO_CUSTOMERS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(ESPACO_ABSOLUTO_CUSTOMERS_STORAGE_KEY, JSON.stringify(mockEspacoAbsolutoCustomers));
      return mockEspacoAbsolutoCustomers;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EspacoAbsolutoCustomer[]) : mockEspacoAbsolutoCustomers;
  } catch {
    return mockEspacoAbsolutoCustomers;
  }
};

const writeEspacoAbsolutoCustomers = (items: EspacoAbsolutoCustomer[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ESPACO_ABSOLUTO_CUSTOMERS_STORAGE_KEY, JSON.stringify(items));
};

const readEspacoAbsolutoAppointments = (): EspacoAbsolutoAppointment[] => {
  if (typeof window === 'undefined') return mockEspacoAbsolutoAppointments;
  try {
    const raw = window.localStorage.getItem(ESPACO_ABSOLUTO_APPOINTMENTS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(ESPACO_ABSOLUTO_APPOINTMENTS_STORAGE_KEY, JSON.stringify(mockEspacoAbsolutoAppointments));
      return mockEspacoAbsolutoAppointments;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EspacoAbsolutoAppointment[]) : mockEspacoAbsolutoAppointments;
  } catch {
    return mockEspacoAbsolutoAppointments;
  }
};

const readEspacoAbsolutoUserGroups = (): EspacoAbsolutoUserGroup[] => {
  if (typeof window === 'undefined') return mockEspacoAbsolutoUserGroups;
  try {
    const raw = window.localStorage.getItem(ESPACO_ABSOLUTO_USER_GROUPS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(ESPACO_ABSOLUTO_USER_GROUPS_STORAGE_KEY, JSON.stringify(mockEspacoAbsolutoUserGroups));
      return mockEspacoAbsolutoUserGroups;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EspacoAbsolutoUserGroup[]) : mockEspacoAbsolutoUserGroups;
  } catch {
    return mockEspacoAbsolutoUserGroups;
  }
};

const readEspacoAbsolutoUserMessages = (): EspacoAbsolutoUserMessage[] => {
  if (typeof window === 'undefined') return mockEspacoAbsolutoUserMessages;
  try {
    const raw = window.localStorage.getItem(ESPACO_ABSOLUTO_USER_MESSAGES_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(ESPACO_ABSOLUTO_USER_MESSAGES_STORAGE_KEY, JSON.stringify(mockEspacoAbsolutoUserMessages));
      return mockEspacoAbsolutoUserMessages;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EspacoAbsolutoUserMessage[]) : mockEspacoAbsolutoUserMessages;
  } catch {
    return mockEspacoAbsolutoUserMessages;
  }
};

const parseIsoMs = (v: string) => {
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : 0;
};

export async function fetchEspacoAbsolutoCustomers(params?: {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  origin?: string;
  registered_from?: string;
  registered_until?: string;
}): Promise<ApiResponse<EspacoAbsolutoCustomer[]>> {
  await delay();
  const rows = readEspacoAbsolutoCustomers();

  const q = (params?.search ?? '').trim().toLowerCase();
  const status = params?.status ?? 'all';
  const origin = (params?.origin ?? '').trim().toLowerCase();
  const fromMs = params?.registered_from ? parseIsoMs(params.registered_from) : null;
  const untilMs = params?.registered_until ? parseIsoMs(params.registered_until) : null;

  const filtered = rows.filter((c) => {
    if (status !== 'all') {
      if (status === 'active' && !Boolean(c.status)) return false;
      if (status === 'inactive' && Boolean(c.status)) return false;
    }

    if (origin && origin !== 'all' && (c.origin ?? '').trim().toLowerCase() !== origin) return false;

    const regMs = parseIsoMs(c.registered_at);
    if (fromMs !== null && regMs < fromMs) return false;
    if (untilMs !== null && regMs > untilMs) return false;

    if (!q) return true;
    const hay = `${c.id} ${c.name} ${c.email} ${c.phone} ${c.origin}`.toLowerCase();
    return hay.includes(q);
  });

  filtered.sort((a, b) => parseIsoMs(b.registered_at) - parseIsoMs(a.registered_at));
  return { data: filtered };
}

export async function createEspacoAbsolutoCustomer(payload: Pick<EspacoAbsolutoCustomer, 'name' | 'email' | 'phone' | 'origin' | 'status'>): Promise<ApiResponse<EspacoAbsolutoCustomer>> {
  await delay(250);
  const rows = readEspacoAbsolutoCustomers();
  const now = new Date().toISOString();
  const nextId = Math.max(0, ...rows.map((r) => Number(r.id) || 0)) + 1;

  const next: EspacoAbsolutoCustomer = {
    id: nextId,
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone.trim(),
    origin: payload.origin.trim(),
    status: Boolean(payload.status),
    registered_at: now,
    last_seen_at: null,
    created_at: now,
    updated_at: now,
  };

  writeEspacoAbsolutoCustomers([next, ...rows]);
  return { data: next };
}

export async function updateEspacoAbsolutoCustomer(
  id: number,
  payload: Partial<Pick<EspacoAbsolutoCustomer, 'name' | 'email' | 'phone' | 'origin' | 'status' | 'last_seen_at'>>
): Promise<ApiResponse<EspacoAbsolutoCustomer>> {
  await delay(250);
  const rows = readEspacoAbsolutoCustomers();
  const idx = rows.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error('Customer not found');

  const current = rows[idx];
  const next: EspacoAbsolutoCustomer = {
    ...current,
    ...payload,
    name: payload.name !== undefined ? payload.name.trim() : current.name,
    email: payload.email !== undefined ? payload.email.trim().toLowerCase() : current.email,
    phone: payload.phone !== undefined ? payload.phone.trim() : current.phone,
    origin: payload.origin !== undefined ? payload.origin.trim() : current.origin,
    status: payload.status !== undefined ? Boolean(payload.status) : current.status,
    updated_at: new Date().toISOString(),
  };

  const nextRows = [...rows];
  nextRows[idx] = next;
  writeEspacoAbsolutoCustomers(nextRows);
  return { data: next };
}

export async function deleteEspacoAbsolutoCustomer(id: number): Promise<void> {
  await delay(250);
  writeEspacoAbsolutoCustomers(readEspacoAbsolutoCustomers().filter((c) => c.id !== id));
}

export async function fetchEspacoAbsolutoUserGroups(): Promise<ApiResponse<EspacoAbsolutoUserGroup[]>> {
  await delay();
  return { data: readEspacoAbsolutoUserGroups() };
}

export async function fetchEspacoAbsolutoUserMessages(params?: { user_id?: number }): Promise<ApiResponse<EspacoAbsolutoUserMessage[]>> {
  await delay();
  const rows = readEspacoAbsolutoUserMessages();
  const userId = params?.user_id;
  const filtered = typeof userId === 'number' ? rows.filter((m) => m.user_id === userId) : rows;
  filtered.sort((a, b) => parseIsoMs(b.date) - parseIsoMs(a.date));
  return { data: filtered };
}

export async function fetchEspacoAbsolutoAppointments(params?: { customer_id?: number }): Promise<ApiResponse<EspacoAbsolutoAppointment[]>> {
  await delay();
  const rows = readEspacoAbsolutoAppointments();
  const customerId = params?.customer_id;
  const filtered = typeof customerId === 'number' ? rows.filter((a) => a.customer_id === customerId) : rows;
  filtered.sort((a, b) => parseIsoMs(b.scheduled_at) - parseIsoMs(a.scheduled_at));
  return { data: filtered };
}

// ── Users (Admin) ──
const USERS_STORAGE_KEY = 'bliss:admin:users';

const readUsers = (): User[] => {
  if (typeof window === 'undefined') return mockUsers;
  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(mockUsers));
      return mockUsers;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as User[]) : mockUsers;
  } catch {
    return mockUsers;
  }
};

const writeUsers = (items: User[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(items));
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function fetchUsers(params?: {
  search?: string;
  company_id?: string;
  department_id?: string;
  is_active?: boolean;
}): Promise<ApiResponse<User[]>> {
  const qs = new URLSearchParams();
  const search = (params?.search ?? '').trim();
  const companyId = (params?.company_id ?? '').trim();
  const departmentId = (params?.department_id ?? '').trim();

  if (search) qs.set('search', search);
  if (companyId) qs.set('company_id', companyId);
  if (departmentId) qs.set('department_id', departmentId);
  if (typeof params?.is_active === 'boolean') qs.set('is_active', params.is_active ? 'true' : 'false');

  const url = `/api/v1/users${qs.toString() ? `?${qs.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch users: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as User[]) : [] };
}

export async function fetchAdminUser(id: string): Promise<ApiResponse<User>> {
  const response = await apiFetch(`/api/v1/users/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch user: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as User };
}

export async function createUser(payload: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<User>> {
  const response = await apiFetch('/api/v1/users', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to create user: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as User };
}

export async function updateUser(
  id: string,
  payload: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<ApiResponse<User>> {
  const response = await apiFetch(`/api/v1/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to update user: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as User };
}

export async function deleteUser(id: string): Promise<void> {
  const response = await fetch(`/api/v1/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to delete user: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
}

// ── Roles (Admin) ──
const ROLES_STORAGE_KEY = 'bliss:admin:roles';

const readRoles = (): Role[] => {
  if (typeof window === 'undefined') return mockRoles;
  try {
    const raw = window.localStorage.getItem(ROLES_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(mockRoles));
      return mockRoles;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Role[]) : mockRoles;
  } catch {
    return mockRoles;
  }
};

const writeRoles = (items: Role[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(items));
};

const normalizeRoleName = (name: string) => name.trim().toLowerCase();

export async function fetchRoles(params?: {
  search?: string;
  is_active?: boolean;
}): Promise<ApiResponse<Role[]>> {
  const qs = new URLSearchParams();
  const search = (params?.search ?? '').trim();

  if (search) qs.set('search', search);
  if (typeof params?.is_active === 'boolean') qs.set('is_active', params.is_active ? 'true' : 'false');

  const url = `/api/v1/roles${qs.toString() ? `?${qs.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch roles: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: Array.isArray(json?.data) ? (json.data as Role[]) : [] };
}

export async function fetchRole(id: string): Promise<ApiResponse<Role>> {
  const response = await fetch(`/api/v1/roles/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to fetch role: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as Role };
}

export async function createRole(payload: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Role>> {
  const response = await fetch('/api/v1/roles', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to create role: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as Role };
}

export async function updateRole(
  id: string,
  payload: Partial<Omit<Role, 'id' | 'createdAt'>>
): Promise<ApiResponse<Role>> {
  const response = await fetch(`/api/v1/roles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let msg = `Failed to update role: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
      const errors = json?.errors;
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = (errors as any)[firstKey];
        if (Array.isArray(firstVal) && typeof firstVal[0] === 'string') msg = firstVal[0];
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as Role };
}

export async function deleteRole(id: string): Promise<void> {
  const response = await fetch(`/api/v1/roles/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let msg = `Failed to delete role: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
}

// ── System Logs (Reports & Logs) ──
const SYSTEM_LOGS_STORAGE_KEY = 'bliss:system:logs';

const readSystemLogs = (): SystemLog[] => {
  if (typeof window === 'undefined') return mockSystemLogs;
  try {
    const raw = window.localStorage.getItem(SYSTEM_LOGS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(SYSTEM_LOGS_STORAGE_KEY, JSON.stringify(mockSystemLogs));
      return mockSystemLogs;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SystemLog[]) : mockSystemLogs;
  } catch {
    return mockSystemLogs;
  }
};

export async function fetchSystemLogs(params?: {
  search?: string;
  level?: string;
  action?: string;
  user_id?: string | null;
}): Promise<ApiResponse<SystemLog[]>> {
  const usp = new URLSearchParams();
  if (params?.search) usp.set('search', params.search);
  if (params?.level) usp.set('level', params.level);
  if (params?.action) usp.set('action', params.action);
  if (params && 'user_id' in params) {
    const v = params.user_id;
    usp.set('user_id', v === null ? 'null' : String(v));
  }

  const response = await fetch(`/api/v1/reports/system-logs?${usp.toString()}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    let msg = `Failed to fetch system logs: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {}
    throw new Error(msg);
  }

  const json = await response.json();
  const rows = Array.isArray(json?.data) ? json.data : [];
  return { data: rows as SystemLog[] };
}

export async function fetchSystemLog(id: string): Promise<ApiResponse<SystemLog>> {
  const response = await fetch(`/api/v1/reports/system-logs/${encodeURIComponent(id)}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    let msg = `Failed to fetch system log: ${response.statusText}`;
    try {
      const json = await response.json();
      if (typeof json?.message === 'string') msg = json.message;
    } catch {}
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: json?.data as SystemLog };
}

// ── Personal: Tasks ──
const TASKS_STORAGE_KEY = 'bliss:personal:tasks';

const readTasks = (): Task[] => {
  if (typeof window === 'undefined') return mockTasks;
  try {
    const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(mockTasks));
      return mockTasks;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Task[]) : mockTasks;
  } catch {
    return mockTasks;
  }
};

const writeTasks = (items: Task[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(items));
};

export async function fetchTasks(params?: {
  search?: string;
  user_id?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
}): Promise<ApiResponse<Task[]>> {
  await delay();
  const rows = readTasks();

  const search = (params?.search ?? '').trim().toLowerCase();
  const userId = params?.user_id;
  const status = params?.status;
  const priority = params?.priority;

  const filtered = rows.filter((t) => {
    if (userId) {
      const isOwner = (t.user_id ?? null) === userId;
      const isShared = Array.isArray(t.shared_with_user_ids) && t.shared_with_user_ids.includes(userId);
      if (!isOwner && !isShared) return false;
    }
    if (status && t.status !== status) return false;
    if (priority && t.priority !== priority) return false;
    if (!search) return true;

    const hay = `${t.title} ${t.description ?? ''} ${t.location ?? ''} ${t.notes ?? ''}`.toLowerCase();
    return hay.includes(search);
  });

  filtered.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));

  return { data: filtered };
}

export async function fetchTask(id: string): Promise<ApiResponse<Task>> {
  await delay();
  const found = readTasks().find((x) => x.id === id);
  if (!found) throw new Error('Task not found');
  return { data: found };
}

export async function createTask(payload: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Task>> {
  await delay(250);
  const rows = readTasks();
  const now = new Date().toISOString();

  const title = payload.title.trim();
  if (!title) throw new Error('Título é obrigatório');

  const next: Task = {
    ...payload,
    id: `tsk_${Math.random().toString(16).slice(2)}`,
    title,
    priority: payload.priority ?? 'medium',
    status: payload.status ?? 'pending',
    is_all_day: Boolean(payload.is_all_day),
    is_private: Boolean(payload.is_private),
    createdAt: now,
    updatedAt: now,
  };

  writeTasks([next, ...rows]);
  return { data: next };
}

export async function updateTask(id: string, payload: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<ApiResponse<Task>> {
  await delay(250);
  const rows = readTasks();
  const idx = rows.findIndex((x) => x.id === id);
  if (idx < 0) throw new Error('Task not found');

  const current = rows[idx];
  const updated: Task = {
    ...current,
    ...payload,
    title: payload.title !== undefined ? payload.title.trim() : current.title,
    updatedAt: new Date().toISOString(),
  };

  if (!updated.title) throw new Error('Título é obrigatório');

  const nextRows = [...rows];
  nextRows[idx] = updated;
  writeTasks(nextRows);
  return { data: updated };
}

export async function deleteTask(id: string): Promise<void> {
  await delay(200);
  writeTasks(readTasks().filter((x) => x.id !== id));
}

// ── Personal: Notes ──
const PERSONAL_NOTES_STORAGE_KEY = 'bliss:personal:notes';

const readPersonalNotes = (): PersonalNote[] => {
  if (typeof window === 'undefined') return mockPersonalNotes;
  try {
    const raw = window.localStorage.getItem(PERSONAL_NOTES_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(PERSONAL_NOTES_STORAGE_KEY, JSON.stringify(mockPersonalNotes));
      return mockPersonalNotes;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PersonalNote[]) : mockPersonalNotes;
  } catch {
    return mockPersonalNotes;
  }
};

const writePersonalNotes = (items: PersonalNote[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PERSONAL_NOTES_STORAGE_KEY, JSON.stringify(items));
};

export async function fetchPersonalNotes(params?: {
  search?: string;
  user_id?: string;
  is_favorite?: boolean;
}): Promise<ApiResponse<PersonalNote[]>> {
  await delay();
  const rows = readPersonalNotes();

  const search = (params?.search ?? '').trim().toLowerCase();
  const userId = params?.user_id;
  const isFavorite = params?.is_favorite;

  const filtered = rows.filter((n) => {
    if (userId && n.user_id !== userId) return false;
    if (typeof isFavorite === 'boolean' && Boolean(n.is_favorite) !== isFavorite) return false;
    if (!search) return true;

    const hay = `${n.title} ${n.content}`.toLowerCase();
    return hay.includes(search);
  });

  filtered.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));

  return { data: filtered };
}

export async function fetchPersonalNote(id: string): Promise<ApiResponse<PersonalNote>> {
  await delay();
  const found = readPersonalNotes().find((x) => x.id === id);
  if (!found) throw new Error('Note not found');
  return { data: found };
}

export async function createPersonalNote(
  payload: Omit<PersonalNote, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApiResponse<PersonalNote>> {
  await delay(250);
  const rows = readPersonalNotes();
  const now = new Date().toISOString();

  const title = payload.title.trim();
  if (!title) throw new Error('Título é obrigatório');

  const next: PersonalNote = {
    ...payload,
    id: `note_${Math.random().toString(16).slice(2)}`,
    title,
    content: payload.content ?? '',
    is_favorite: Boolean(payload.is_favorite),
    createdAt: now,
    updatedAt: now,
  };

  writePersonalNotes([next, ...rows]);
  return { data: next };
}

export async function updatePersonalNote(
  id: string,
  payload: Partial<Omit<PersonalNote, 'id' | 'createdAt'>>
): Promise<ApiResponse<PersonalNote>> {
  await delay(250);
  const rows = readPersonalNotes();
  const idx = rows.findIndex((x) => x.id === id);
  if (idx < 0) throw new Error('Note not found');

  const current = rows[idx];
  const updated: PersonalNote = {
    ...current,
    ...payload,
    title: payload.title !== undefined ? payload.title.trim() : current.title,
    content: payload.content !== undefined ? payload.content : current.content,
    is_favorite: payload.is_favorite !== undefined ? Boolean(payload.is_favorite) : current.is_favorite,
    updatedAt: new Date().toISOString(),
  };

  if (!updated.title) throw new Error('Título é obrigatório');

  const nextRows = [...rows];
  nextRows[idx] = updated;
  writePersonalNotes(nextRows);
  return { data: updated };
}

export async function deletePersonalNote(id: string): Promise<void> {
  await delay(200);
  writePersonalNotes(readPersonalNotes().filter((x) => x.id !== id));
}
