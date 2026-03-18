import type {
  ApiResponse,
  FinanceBankAccount,
  FinanceCategory,
  FinanceCostCenter,
  FinanceTransaction,
} from "@/types";
import {
  mockFinanceBankAccounts,
  mockFinanceCategories,
  mockFinanceCostCenters,
  mockFinanceTransactions,
} from "@/services/mockData";

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const makeId = (prefix: string) => `${prefix}_${Math.random().toString(16).slice(2)}`;

let csrfReady = false;

const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((c) => c.trim());
  const found = parts.find((c) => c.startsWith(`${name}=`));
  if (!found) return null;
  return found.slice(name.length + 1);
};

const ensureCsrfCookie = async (): Promise<void> => {
  if (csrfReady) return;
  const res = await fetch("/sanctum/csrf-cookie", {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!res.ok) throw new Error("Falha ao obter CSRF cookie");
  csrfReady = true;
};

const apiFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  const method = (init.method ?? "GET").toUpperCase();
  const needsCsrf = !["GET", "HEAD", "OPTIONS"].includes(method);

  if (needsCsrf) await ensureCsrfCookie();

  const headers = new Headers(init.headers ?? {});
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!headers.has("X-Requested-With")) headers.set("X-Requested-With", "XMLHttpRequest");

  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  if (needsCsrf) {
    const token = getCookie("XSRF-TOKEN");
    if (token && !headers.has("X-XSRF-TOKEN")) headers.set("X-XSRF-TOKEN", decodeURIComponent(token));
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });
};

const pickErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const json = await response.json();
    if (typeof json?.message === "string" && json.message.trim()) return json.message;
    const errors = json?.errors;
    if (errors && typeof errors === "object") {
      const firstKey = Object.keys(errors)[0];
      const firstVal = firstKey ? (errors as any)[firstKey] : null;
      if (Array.isArray(firstVal) && typeof firstVal[0] === "string") return firstVal[0];
    }
  } catch {
    // ignore
  }
  return fallback;
};

const mapFinanceBankAccount = (raw: any): FinanceBankAccount => {
  const createdAt = raw?.createdAt ?? raw?.created_at ?? new Date().toISOString();
  const updatedAt = raw?.updatedAt ?? raw?.updated_at ?? new Date().toISOString();

  return {
    id: String(raw?.id ?? ""),
    company_id: String(raw?.company_id ?? ""),
    name: String(raw?.name ?? ""),
    bank_name: raw?.bank_name == null ? "" : String(raw.bank_name),
    account_number: raw?.account_number == null ? "" : String(raw.account_number),
    currency: String(raw?.currency ?? "EUR"),
    initial_balance: Number(raw?.initial_balance ?? 0) || 0,
    current_balance: Number(raw?.current_balance ?? 0) || 0,
    is_active: Boolean(raw?.is_active),
    createdAt: String(createdAt),
    updatedAt: String(updatedAt),
  };
};

const mapFinanceCategory = (raw: any): FinanceCategory => {
  const createdAt = raw?.createdAt ?? raw?.created_at ?? new Date().toISOString();
  const updatedAt = raw?.updatedAt ?? raw?.updated_at ?? new Date().toISOString();

  return {
    id: String(raw?.id ?? ""),
    company_id: String(raw?.company_id ?? ""),
    parent_id: raw?.parent_id == null || raw?.parent_id === "" ? null : String(raw.parent_id),
    name: String(raw?.name ?? ""),
    type: (raw?.type ?? "expense") as any,
    color: raw?.color == null ? null : String(raw.color),
    is_active: Boolean(raw?.is_active),
    createdAt: String(createdAt),
    updatedAt: String(updatedAt),
  };
};

const mapFinanceCostCenter = (raw: any): FinanceCostCenter => {
  const createdAt = raw?.createdAt ?? raw?.created_at ?? new Date().toISOString();
  const updatedAt = raw?.updatedAt ?? raw?.updated_at ?? new Date().toISOString();

  return {
    id: String(raw?.id ?? ""),
    company_id: String(raw?.company_id ?? ""),
    name: String(raw?.name ?? ""),
    code: String(raw?.code ?? ""),
    createdAt: String(createdAt),
    updatedAt: String(updatedAt),
  };
};

const mapFinanceTransaction = (raw: any): FinanceTransaction => {
  const createdAt = raw?.createdAt ?? raw?.created_at ?? new Date().toISOString();
  const updatedAt = raw?.updatedAt ?? raw?.updated_at ?? new Date().toISOString();

  return {
    id: String(raw?.id ?? ""),
    company_id: String(raw?.company_id ?? ""),
    description: String(raw?.description ?? ""),
    notes: raw?.notes == null ? null : String(raw.notes),
    amount: Number(raw?.amount ?? 0) || 0,
    due_date: raw?.due_date == null ? null : String(raw.due_date),
    paid_at: raw?.paid_at == null ? null : String(raw.paid_at),
    type: (raw?.type ?? "expense") as any,
    status: (raw?.status ?? "pending") as any,
    category_id: raw?.category_id == null || raw?.category_id === "" ? null : String(raw.category_id),
    cost_center_id: raw?.cost_center_id == null || raw?.cost_center_id === "" ? null : String(raw.cost_center_id),
    bank_account_id: raw?.bank_account_id == null || raw?.bank_account_id === "" ? null : String(raw.bank_account_id),
    payer_type: raw?.payer_type == null ? null : String(raw.payer_type),
    payer_id: raw?.payer_id == null || raw?.payer_id === "" ? null : String(raw.payer_id),
    reference_type: raw?.reference_type == null ? null : String(raw.reference_type),
    reference_id: raw?.reference_id == null || raw?.reference_id === "" ? null : String(raw.reference_id),
    createdAt: String(createdAt),
    updatedAt: String(updatedAt),
  };
};

const readStorage = <T>(key: string, seed: T): T => {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
};

const writeStorage = <T>(key: string, value: T) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const FIN_BANK_ACCOUNTS_KEY = "bliss:finance:bank_accounts";
const FIN_CATEGORIES_KEY = "bliss:finance:categories";
const FIN_COST_CENTERS_KEY = "bliss:finance:cost_centers";
const FIN_TRANSACTIONS_KEY = "bliss:finance:transactions";

const readBankAccounts = () =>
  readStorage<FinanceBankAccount[]>(FIN_BANK_ACCOUNTS_KEY, mockFinanceBankAccounts);
const writeBankAccounts = (rows: FinanceBankAccount[]) => writeStorage(FIN_BANK_ACCOUNTS_KEY, rows);

const readCategories = () => readStorage<FinanceCategory[]>(FIN_CATEGORIES_KEY, mockFinanceCategories);
const writeCategories = (rows: FinanceCategory[]) => writeStorage(FIN_CATEGORIES_KEY, rows);

const readCostCenters = () =>
  readStorage<FinanceCostCenter[]>(FIN_COST_CENTERS_KEY, mockFinanceCostCenters);
const writeCostCenters = (rows: FinanceCostCenter[]) => writeStorage(FIN_COST_CENTERS_KEY, rows);

const readTransactions = () =>
  readStorage<FinanceTransaction[]>(FIN_TRANSACTIONS_KEY, mockFinanceTransactions);
const writeTransactions = (rows: FinanceTransaction[]) => writeStorage(FIN_TRANSACTIONS_KEY, rows);

export async function fetchFinanceBankAccounts(params?: {
  search?: string;
  company_id?: string;
  is_active?: boolean;
}): Promise<ApiResponse<FinanceBankAccount[]>> {
  const qs = new URLSearchParams();
  const search = (params?.search ?? "").trim();
  const companyId = (params?.company_id ?? "").trim();

  if (search) qs.set("search", search);
  if (companyId) qs.set("company_id", companyId);
  if (typeof params?.is_active === "boolean") qs.set("is_active", params.is_active ? "1" : "0");

  const url = `/api/v1/finance/bank-accounts${qs.toString() ? `?${qs.toString()}` : ""}`;
  const response = await apiFetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to fetch finance bank accounts: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  const rows = Array.isArray(json?.data) ? json.data : [];
  return { data: rows.map(mapFinanceBankAccount) };
}

export async function fetchFinanceBankAccount(id: string): Promise<ApiResponse<FinanceBankAccount>> {
  const response = await apiFetch(`/api/v1/finance/bank-accounts/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to fetch finance bank account: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapFinanceBankAccount(json?.data ?? json) };
}

export async function createFinanceBankAccount(
  payload: Omit<FinanceBankAccount, "id" | "createdAt" | "updatedAt">
): Promise<ApiResponse<FinanceBankAccount>> {
  const initialBalance = Number(payload.initial_balance) || 0;
  const currentBalance = payload.current_balance !== undefined ? Number(payload.current_balance) || 0 : initialBalance;

  const body = {
    company_id: payload.company_id,
    name: payload.name?.trim(),
    bank_name: payload.bank_name?.trim() ? payload.bank_name.trim() : null,
    account_number: payload.account_number?.trim() ? payload.account_number.trim() : null,
    currency: payload.currency?.trim() ? payload.currency.trim() : "EUR",
    initial_balance: initialBalance,
    current_balance: currentBalance,
    is_active: Boolean(payload.is_active),
  };

  const response = await apiFetch("/api/v1/finance/bank-accounts", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to create finance bank account: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapFinanceBankAccount(json?.data ?? json) };
}

export async function updateFinanceBankAccount(
  id: string,
  payload: Partial<Omit<FinanceBankAccount, "id" | "createdAt">>
): Promise<ApiResponse<FinanceBankAccount>> {
  const body: any = { ...payload };

  if (body.name !== undefined) body.name = String(body.name).trim();
  if (body.bank_name !== undefined) body.bank_name = String(body.bank_name).trim() ? String(body.bank_name).trim() : null;
  if (body.account_number !== undefined) body.account_number = String(body.account_number).trim() ? String(body.account_number).trim() : null;
  if (body.currency !== undefined) body.currency = String(body.currency).trim() || "EUR";
  if (body.initial_balance !== undefined) body.initial_balance = Number(body.initial_balance) || 0;
  if (body.current_balance !== undefined) body.current_balance = Number(body.current_balance) || 0;
  if (body.is_active !== undefined) body.is_active = Boolean(body.is_active);

  const response = await apiFetch(`/api/v1/finance/bank-accounts/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to update finance bank account: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapFinanceBankAccount(json?.data ?? json) };
}

export async function deleteFinanceBankAccount(id: string): Promise<void> {
  const response = await apiFetch(`/api/v1/finance/bank-accounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to delete finance bank account: ${response.statusText}`);
    throw new Error(msg);
  }
}

export async function fetchFinanceCategories(params?: {
  search?: string;
  company_id?: string;
  type?: "income" | "expense";
  is_active?: boolean;
}): Promise<ApiResponse<FinanceCategory[]>> {
  const qs = new URLSearchParams();
  const search = (params?.search ?? "").trim();
  const companyId = (params?.company_id ?? "").trim();
  const type = (params?.type ?? "").trim();

  if (search) qs.set("search", search);
  if (companyId) qs.set("company_id", companyId);
  if (type) qs.set("type", type);
  if (typeof params?.is_active === "boolean") qs.set("is_active", params.is_active ? "1" : "0");

  const url = `/api/v1/finance/categories${qs.toString() ? `?${qs.toString()}` : ""}`;
  const response = await apiFetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to fetch finance categories: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  const rows = Array.isArray(json?.data) ? json.data : [];
  return { data: rows.map(mapFinanceCategory) };
}

export async function createFinanceCategory(
  payload: Omit<FinanceCategory, "id" | "createdAt" | "updatedAt">
): Promise<ApiResponse<FinanceCategory>> {
  const body = {
    company_id: payload.company_id,
    parent_id: payload.parent_id ?? null,
    name: payload.name?.trim(),
    type: payload.type,
    color: payload.color ?? null,
    is_active: Boolean(payload.is_active),
  };

  const response = await apiFetch("/api/v1/finance/categories", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to create finance category: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapFinanceCategory(json?.data ?? json) };
}

export async function updateFinanceCategory(
  id: string,
  payload: Partial<Omit<FinanceCategory, "id" | "createdAt">>
): Promise<ApiResponse<FinanceCategory>> {
  const body: any = { ...payload };

  if (body.name !== undefined) body.name = String(body.name).trim();
  if (body.parent_id !== undefined) body.parent_id = body.parent_id ?? null;
  if (body.color !== undefined) body.color = body.color ?? null;
  if (body.is_active !== undefined) body.is_active = Boolean(body.is_active);

  const response = await apiFetch(`/api/v1/finance/categories/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to update finance category: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapFinanceCategory(json?.data ?? json) };
}

export async function deleteFinanceCategory(id: string): Promise<void> {
  const response = await apiFetch(`/api/v1/finance/categories/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to delete finance category: ${response.statusText}`);
    throw new Error(msg);
  }
}

export async function fetchFinanceCostCenters(params?: {
  search?: string;
  company_id?: string;
}): Promise<ApiResponse<FinanceCostCenter[]>> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.company_id) query.set("company_id", params.company_id);

  const response = await apiFetch(`/api/v1/finance/cost-centers?${query.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to fetch finance cost centers: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  return { data: rows.map(mapFinanceCostCenter) };
}

export async function createFinanceCostCenter(
  payload: Omit<FinanceCostCenter, "id" | "createdAt" | "updatedAt">
): Promise<ApiResponse<FinanceCostCenter>> {
  const response = await apiFetch(`/api/v1/finance/cost-centers`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      company_id: payload.company_id,
      name: payload.name,
      code: payload.code,
    }),
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to create finance cost center: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapFinanceCostCenter(json?.data ?? json) };
}

export async function updateFinanceCostCenter(
  id: string,
  payload: Partial<Omit<FinanceCostCenter, "id" | "createdAt">>
): Promise<ApiResponse<FinanceCostCenter>> {
  const response = await apiFetch(`/api/v1/finance/cost-centers/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to update finance cost center: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapFinanceCostCenter(json?.data ?? json) };
}

export async function deleteFinanceCostCenter(id: string): Promise<void> {
  const response = await apiFetch(`/api/v1/finance/cost-centers/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to delete finance cost center: ${response.statusText}`);
    throw new Error(msg);
  }
}

export async function fetchFinanceTransactions(params?: {
  search?: string;
  company_id?: string;
  type?: "income" | "expense";
  status?: FinanceTransaction["status"];
}): Promise<ApiResponse<FinanceTransaction[]>> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.company_id) query.set("company_id", params.company_id);
  if (params?.type) query.set("type", params.type);
  if (params?.status) query.set("status", params.status);

  const response = await apiFetch(`/api/v1/finance/transactions?${query.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to fetch finance transactions: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  return { data: rows.map(mapFinanceTransaction) };
}

export async function createFinanceTransaction(
  payload: Omit<FinanceTransaction, "id" | "createdAt" | "updatedAt">
): Promise<ApiResponse<FinanceTransaction>> {
  const response = await apiFetch(`/api/v1/finance/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to create finance transaction: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapFinanceTransaction(json?.data ?? json) };
}

export async function updateFinanceTransaction(
  id: string,
  payload: Partial<Omit<FinanceTransaction, "id" | "createdAt">>
): Promise<ApiResponse<FinanceTransaction>> {
  const response = await apiFetch(`/api/v1/finance/transactions/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to update finance transaction: ${response.statusText}`);
    throw new Error(msg);
  }

  const json = await response.json();
  return { data: mapFinanceTransaction(json?.data ?? json) };
}

export async function deleteFinanceTransaction(id: string): Promise<void> {
  const response = await apiFetch(`/api/v1/finance/transactions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const msg = await pickErrorMessage(response, `Failed to delete finance transaction: ${response.statusText}`);
    throw new Error(msg);
  }
}