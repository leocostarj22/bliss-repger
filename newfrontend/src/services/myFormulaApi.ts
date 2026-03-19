import type {
  ApiResponse,
  MyFormulaCustomer,
  MyFormulaOrder,
  MyFormulaOrderProduct,
  MyFormulaOrderStatus,
  MyFormulaProduct,
  MyFormulaQuiz,
} from '@/types'
import {
  mockMyFormulaCustomers,
  mockMyFormulaOrderProducts,
  mockMyFormulaOrders,
  mockMyFormulaOrderStatuses,
  mockMyFormulaProducts,
  mockMyFormulaQuizzes,
} from './mockData'

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms + Math.random() * 200))

const MYFORMULA_PRODUCTS_STORAGE_KEY = 'bliss:myformula:products'
const MYFORMULA_CUSTOMERS_STORAGE_KEY = 'bliss:myformula:customers'
const MYFORMULA_ORDERS_STORAGE_KEY = 'bliss:myformula:orders'
const MYFORMULA_ORDER_PRODUCTS_STORAGE_KEY = 'bliss:myformula:order_products'
const MYFORMULA_ORDER_STATUSES_STORAGE_KEY = 'bliss:myformula:order_statuses'
const MYFORMULA_QUIZZES_STORAGE_KEY = 'bliss:myformula:quizzes'

const genId = (prefix: string) => `${prefix}_${Math.random().toString(16).slice(2)}`

function readStorage<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback))
    return fallback
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    localStorage.setItem(key, JSON.stringify(fallback))
    return fallback
  }
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const readMyFormulaProducts = () => readStorage<MyFormulaProduct[]>(MYFORMULA_PRODUCTS_STORAGE_KEY, mockMyFormulaProducts)
const writeMyFormulaProducts = (rows: MyFormulaProduct[]) => writeStorage(MYFORMULA_PRODUCTS_STORAGE_KEY, rows)

const readMyFormulaCustomers = () => readStorage<MyFormulaCustomer[]>(MYFORMULA_CUSTOMERS_STORAGE_KEY, mockMyFormulaCustomers)
const writeMyFormulaCustomers = (rows: MyFormulaCustomer[]) => writeStorage(MYFORMULA_CUSTOMERS_STORAGE_KEY, rows)

const readMyFormulaOrders = () => readStorage<MyFormulaOrder[]>(MYFORMULA_ORDERS_STORAGE_KEY, mockMyFormulaOrders)
const writeMyFormulaOrders = (rows: MyFormulaOrder[]) => writeStorage(MYFORMULA_ORDERS_STORAGE_KEY, rows)

const readMyFormulaOrderProducts = () =>
  readStorage<MyFormulaOrderProduct[]>(MYFORMULA_ORDER_PRODUCTS_STORAGE_KEY, mockMyFormulaOrderProducts)
const writeMyFormulaOrderProducts = (rows: MyFormulaOrderProduct[]) => writeStorage(MYFORMULA_ORDER_PRODUCTS_STORAGE_KEY, rows)

const readMyFormulaOrderStatuses = () =>
  readStorage<MyFormulaOrderStatus[]>(MYFORMULA_ORDER_STATUSES_STORAGE_KEY, mockMyFormulaOrderStatuses)

const readMyFormulaQuizzes = () => readStorage<MyFormulaQuiz[]>(MYFORMULA_QUIZZES_STORAGE_KEY, mockMyFormulaQuizzes)
const writeMyFormulaQuizzes = (rows: MyFormulaQuiz[]) => writeStorage(MYFORMULA_QUIZZES_STORAGE_KEY, rows)

export async function fetchMyFormulaProducts(params?: {
  search?: string
  status?: 'all' | 'active' | 'inactive'
  page?: number
  per_page?: number
}): Promise<ApiResponse<MyFormulaProduct[]>> {
  const res = await axios.get('/api/v1/myformula/products', { params })
  return res.data
}

export async function createMyFormulaProduct(payload: {
  model: string
  sku?: string | null
  price?: number | null
  quantity?: number | null
  status?: boolean | null
  name?: string | null
  description?: string | null
}): Promise<ApiResponse<MyFormulaProduct>> {
  const res = await axios.post('/api/v1/myformula/products', payload)
  return res.data
}

export async function updateMyFormulaProduct(
  product_id: string,
  payload: Partial<{
    model: string
    sku: string | null
    price: number | null
    quantity: number | null
    status: boolean | null
    name: string | null
    description: string | null
  }>
): Promise<ApiResponse<MyFormulaProduct>> {
  const res = await axios.put(`/api/v1/myformula/products/${product_id}`, payload)
  return res.data
}

export async function deleteMyFormulaProduct(product_id: string): Promise<ApiResponse<{ ok: true }>> {
  const res = await axios.delete(`/api/v1/myformula/products/${product_id}`)
  return res.data
}

export async function fetchMyFormulaCustomers(params?: {
  search?: string
  status?: 'all' | 'active' | 'inactive'
  page?: number
  per_page?: number
}): Promise<ApiResponse<MyFormulaCustomer[]>> {
  const res = await axios.get('/api/v1/myformula/customers', { params })
  return res.data
}

export async function createMyFormulaCustomer(payload: {
  firstname: string
  lastname: string
  email: string
  telephone?: string | null
  status?: boolean | null
}): Promise<ApiResponse<MyFormulaCustomer>> {
  await delay()
  const rows = readMyFormulaCustomers()
  const email = normalizeEmail(payload.email)
  if (rows.some((c) => normalizeEmail(c.email) === email)) throw new Error('Já existe um cliente com este email')
  const row: MyFormulaCustomer = {
    customer_id: genId('mf_c'),
    firstname: payload.firstname,
    lastname: payload.lastname,
    email,
    telephone: payload.telephone ?? null,
    status: payload.status ?? true,
    date_added: new Date().toISOString(),
  }
  const next = [row, ...rows]
  writeMyFormulaCustomers(next)
  return { data: row }
}

export async function updateMyFormulaCustomer(
  customer_id: string,
  payload: Partial<{
    firstname: string
    lastname: string
    email: string
    telephone: string | null
    status: boolean | null
  }>
): Promise<ApiResponse<MyFormulaCustomer>> {
  await delay()
  const rows = readMyFormulaCustomers()
  const idx = rows.findIndex((c) => c.customer_id === customer_id)
  if (idx < 0) throw new Error('Cliente não encontrado')
  const current = rows[idx]
  const nextEmail = payload.email ? normalizeEmail(payload.email) : normalizeEmail(current.email)
  if (rows.some((c) => c.customer_id !== customer_id && normalizeEmail(c.email) === nextEmail)) {
    throw new Error('Já existe um cliente com este email')
  }
  const nextRow: MyFormulaCustomer = {
    ...current,
    firstname: payload.firstname ?? current.firstname,
    lastname: payload.lastname ?? current.lastname,
    email: payload.email ? nextEmail : current.email,
    telephone: payload.telephone !== undefined ? payload.telephone : current.telephone ?? null,
    status: payload.status !== undefined ? payload.status : current.status ?? true,
  }
  const next = rows.slice()
  next[idx] = nextRow
  writeMyFormulaCustomers(next)
  return { data: nextRow }
}

export async function deleteMyFormulaCustomer(customer_id: string): Promise<ApiResponse<{ ok: true }>> {
  await delay()
  const rows = readMyFormulaCustomers()
  writeMyFormulaCustomers(rows.filter((c) => c.customer_id !== customer_id))
  return { data: { ok: true } }
}

export async function exportCustomersToContacts(customer_ids: string[]): Promise<ApiResponse<{ created_count: number; updated_count: number; contact_ids: number[] }>> {
  const res = await axios.post('/api/v1/myformula/customers/export-contacts', { customer_ids })
  return { data: res.data?.data }
}

import axios from 'axios'

export async function fetchMyFormulaOrderStatuses(): Promise<ApiResponse<MyFormulaOrderStatus[]>> {
  const res = await axios.get('/api/v1/myformula/order-statuses')
  return res.data
}

export async function fetchMyFormulaOrders(params?: {
  page?: number
  per_page?: number
  search?: string
  status_id?: string
}): Promise<ApiResponse<MyFormulaOrder[]>> {
  const res = await axios.get('/api/v1/myformula/orders', { params })
  return res.data
}

export async function fetchMyFormulaOrder(id: string): Promise<ApiResponse<MyFormulaOrder>> {
  const res = await axios.get(`/api/v1/myformula/orders/${id}`)
  return res.data
}

export interface MyFormulaPurchaseReportData {
  client_code: string
  plan_letters: string
  plan_number: string
  month_number: string
  plan_name: string
  capsules: string
  net_weight: string
  supplements_by_period: { title: string; items: { slug: string; name: string; letter?: string }[] }[]
  totals: { morning: number; afternoon: number; night: number }
  how_to_take: string
  birthdate: string
  report_date: string
  nif: string
  payment_method: string
  payment_date: string
}

export async function fetchMyFormulaPurchaseReport(
  id: string
): Promise<ApiResponse<{ order: MyFormulaOrder; reportData: MyFormulaPurchaseReportData }>> {
  const res = await axios.get(`/api/v1/myformula/orders/${id}/purchase-report`)
  return res.data
}

export async function createMyFormulaOrder(payload: {
  customer_id: string
  order_status_id: string
  products: { product_id: string; quantity: number }[]
  payment_method?: string | null
  payment_code?: string | null
}): Promise<ApiResponse<MyFormulaOrder>> {
  // TODO: Implement real API call
  await delay(1000)
  console.log('Creating order with', payload)
  throw new Error('A cria\u00e7\u00e3o de pedidos ainda n\u00e3o foi implementada no backend.')
}

export async function updateMyFormulaOrderStatus(
  order_id: string,
  payload: { order_status_id: string }
): Promise<ApiResponse<MyFormulaOrder>> {
  // TODO: Implement real API call
  await delay(1000)
  console.log(`Updating order ${order_id} with`, payload)
  throw new Error('A atualiza\u00e7\u00e3o de pedidos ainda n\u00e3o foi implementada no backend.')
}

export async function deleteMyFormulaOrder(order_id: string): Promise<ApiResponse<{ ok: true }>> {
  // TODO: Implement real API call
  await delay(1000)
  console.log(`Deleting order ${order_id}`)
  throw new Error('A exclus\u00e3o de pedidos ainda n\u00e3o foi implementada no backend.')
}

export async function fetchMyFormulaQuizzes(params?: {
  search?: string
  status?: 'all' | 'completed' | 'incomplete'
  plan?: string | 'all'
}): Promise<ApiResponse<MyFormulaQuiz[]>> {
  const res = await axios.get('/api/v1/myformula/quizzes', { params, withCredentials: true })
  return res.data
}

export async function fetchMyFormulaQuizStats(params?: {
  search?: string
  status?: 'all' | 'completed' | 'incomplete'
  plan?: string | 'all'
}): Promise<ApiResponse<{ total: number; completed: number; not_completed: number; completion_rate: number }>> {
  const res = await axios.get('/api/v1/myformula/quizzes/stats', { params, withCredentials: true })
  return res.data
}

export interface MyFormulaDashboardData {
  products_count: number
  customers_count: number
  orders_count: number
  total_revenue: number
  quizzes_count: number
  completed_quizzes: number
  top_statuses: { order_status_id: string; name: string; count: number }[]
  latest_orders: MyFormulaOrder[]
}

export async function fetchMyFormulaDashboard(): Promise<ApiResponse<MyFormulaDashboardData>> {
  const res = await axios.get('/api/v1/myformula/dashboard')
  return res.data
}

export async function fetchMyFormulaOrderStatusesReal(): Promise<ApiResponse<MyFormulaOrderStatus[]>> {
  const res = await fetch('/api/v1/myformula/order-statuses', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Falha ao obter estados de pedido MyFormula: ${res.status} ${text}`)
  }
  const json = await res.json()
  return { data: json?.data ?? [] }
}

export async function fetchMyFormulaOrdersReal(params: {
  page?: number
  per_page?: number
  search?: string
  status_id?: string
  include_unknown?: boolean
  dedup?: boolean
}): Promise<ApiResponse<MyFormulaOrder[]>> {
  const q = new URLSearchParams()
  if (params.page) q.set('page', String(params.page))
  if (params.per_page) q.set('per_page', String(params.per_page))
  if (params.search) q.set('search', params.search)
  if (params.status_id) q.set('status_id', params.status_id)
  if (params.include_unknown !== undefined) q.set('include_unknown', String(params.include_unknown))
  if (params.dedup !== undefined) q.set('dedup', String(params.dedup))

  const res = await fetch(`/api/v1/myformula/orders?${q.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Falha ao obter pedidos MyFormula: ${res.status} ${text}`)
  }
  const json = await res.json()
  return { data: json?.data ?? [], meta: json?.meta }
}