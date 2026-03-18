import type { ApiResponse, MyFormulaCustomer, MyFormulaOrder, MyFormulaOrderProduct, MyFormulaOrderStatus, MyFormulaProduct, MyFormulaQuiz } from '@/types'
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
}): Promise<ApiResponse<MyFormulaProduct[]>> {
  await delay()
  const q = params?.search?.trim().toLowerCase() ?? ''
  const status = params?.status ?? 'all'
  const rows = readMyFormulaProducts()
  const filtered = rows.filter((p) => {
    if (status !== 'all') {
      const active = Boolean(p.status ?? true)
      if (status === 'active' && !active) return false
      if (status === 'inactive' && active) return false
    }
    if (!q) return true
    const name = p.description?.name ?? ''
    const hay = `${p.product_id} ${p.model} ${p.sku ?? ''} ${name}`.toLowerCase()
    return hay.includes(q)
  })
  return { data: filtered }
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
  await delay()
  const rows = readMyFormulaProducts()
  const product_id = genId('mf_p')
  const row: MyFormulaProduct = {
    product_id,
    model: payload.model,
    sku: payload.sku ?? null,
    price: payload.price ?? null,
    quantity: payload.quantity ?? null,
    status: payload.status ?? true,
    date_added: new Date().toISOString(),
    description: {
      product_id,
      language_id: 2,
      name: payload.name ?? payload.model,
      description: payload.description ?? null,
    },
  }
  const next = [row, ...rows]
  writeMyFormulaProducts(next)
  return { data: row }
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
  await delay()
  const rows = readMyFormulaProducts()
  const idx = rows.findIndex((p) => p.product_id === product_id)
  if (idx < 0) throw new Error('Produto não encontrado')
  const current = rows[idx]
  const nextRow: MyFormulaProduct = {
    ...current,
    model: payload.model ?? current.model,
    sku: payload.sku !== undefined ? payload.sku : current.sku ?? null,
    price: payload.price !== undefined ? payload.price : current.price ?? null,
    quantity: payload.quantity !== undefined ? payload.quantity : current.quantity ?? null,
    status: payload.status !== undefined ? payload.status : current.status ?? true,
    description: {
      product_id,
      language_id: current.description?.language_id ?? 2,
      name: payload.name ?? current.description?.name ?? current.model,
      description: payload.description !== undefined ? payload.description : current.description?.description ?? null,
    },
  }
  const next = rows.slice()
  next[idx] = nextRow
  writeMyFormulaProducts(next)
  return { data: nextRow }
}

export async function deleteMyFormulaProduct(product_id: string): Promise<ApiResponse<{ ok: true }>> {
  await delay()
  const rows = readMyFormulaProducts()
  writeMyFormulaProducts(rows.filter((p) => p.product_id !== product_id))
  return { data: { ok: true } }
}

export async function fetchMyFormulaCustomers(params?: {
  search?: string
  status?: 'all' | 'active' | 'inactive'
}): Promise<ApiResponse<MyFormulaCustomer[]>> {
  await delay()
  const q = params?.search?.trim().toLowerCase() ?? ''
  const status = params?.status ?? 'all'
  const rows = readMyFormulaCustomers()
  const filtered = rows.filter((c) => {
    if (status !== 'all') {
      const active = Boolean(c.status ?? true)
      if (status === 'active' && !active) return false
      if (status === 'inactive' && active) return false
    }
    if (!q) return true
    const hay = `${c.customer_id} ${c.firstname} ${c.lastname} ${c.email} ${c.telephone ?? ''}`.toLowerCase()
    return hay.includes(q)
  })
  return { data: filtered }
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

export async function fetchMyFormulaOrderStatuses(): Promise<ApiResponse<MyFormulaOrderStatus[]>> {
  await delay()
  return { data: readMyFormulaOrderStatuses() }
}

export async function fetchMyFormulaOrders(params?: {
  search?: string
  statusId?: string | 'all'
}): Promise<ApiResponse<MyFormulaOrder[]>> {
  await delay()
  const q = params?.search?.trim().toLowerCase() ?? ''
  const statusId = params?.statusId ?? 'all'

  const orders = readMyFormulaOrders()
  const statuses = readMyFormulaOrderStatuses()
  const products = readMyFormulaProducts()
  const orderProducts = readMyFormulaOrderProducts()
  const quizzes = readMyFormulaQuizzes()

  const statusById: Record<string, MyFormulaOrderStatus> = {}
  statuses.forEach((s) => (statusById[s.order_status_id] = s))

  const productById: Record<string, MyFormulaProduct> = {}
  products.forEach((p) => (productById[p.product_id] = p))

  const quizByEmail: Record<string, MyFormulaQuiz> = {}
  quizzes
    .slice()
    .sort((a, b) => String(b.date_added ?? '').localeCompare(String(a.date_added ?? '')))
    .forEach((qz) => {
      const email = qz?.post?.email ? normalizeEmail(String(qz.post.email)) : ''
      if (email && !quizByEmail[email]) quizByEmail[email] = qz
    })

  const enriched = orders.map((o) => {
    const ops = orderProducts.filter((op) => op.order_id === o.order_id)
    const safeOps = ops.map((op) => {
      const p = productById[op.product_id]
      return {
        ...op,
        name: op.name || p?.description?.name || p?.model || op.model,
        model: op.model || p?.model || '',
      }
    })
    const email = o.email ? normalizeEmail(o.email) : ''
    return {
      ...o,
      status: statusById[o.order_status_id] ?? null,
      products: safeOps,
      quiz: email ? quizByEmail[email] ?? null : null,
    }
  })

  const filtered = enriched.filter((o) => {
    if (statusId !== 'all' && o.order_status_id !== statusId) return false
    if (!q) return true
    const hay = `${o.order_id} ${o.firstname} ${o.lastname} ${o.email} ${o.telephone ?? ''}`.toLowerCase()
    return hay.includes(q)
  })

  return { data: filtered }
}

export async function createMyFormulaOrder(payload: {
  customer_id: string
  order_status_id: string
  products: { product_id: string; quantity: number }[]
  payment_method?: string | null
  payment_code?: string | null
}): Promise<ApiResponse<MyFormulaOrder>> {
  await delay()

  const customers = readMyFormulaCustomers()
  const products = readMyFormulaProducts()
  const statuses = readMyFormulaOrderStatuses()

  const customer = customers.find((c) => c.customer_id === payload.customer_id)
  if (!customer) throw new Error('Cliente não encontrado')

  const status = statuses.find((s) => s.order_status_id === payload.order_status_id)
  if (!status) throw new Error('Estado inválido')

  const order_id = genId('mf_o')

  const items = payload.products
    .map((it) => {
      const p = products.find((pp) => pp.product_id === it.product_id)
      if (!p) return null
      const qty = Math.max(0, Number(it.quantity || 0))
      if (!qty) return null
      const price = Number(p.price ?? 0)
      return {
        order_product_id: genId('mf_op'),
        order_id,
        product_id: p.product_id,
        name: p.description?.name ?? p.model,
        model: p.model,
        quantity: qty,
        price,
        total: qty * price,
        tax: 0,
      } satisfies MyFormulaOrderProduct
    })
    .filter(Boolean) as MyFormulaOrderProduct[]

  if (!items.length) throw new Error('Selecione pelo menos um produto com quantidade > 0')

  const total = items.reduce((sum, it) => sum + Number(it.total ?? 0), 0)

  const order: MyFormulaOrder = {
    order_id,
    invoice_no: null,
    store_name: 'MyFormula',
    customer_id: customer.customer_id,
    firstname: customer.firstname,
    lastname: customer.lastname,
    email: customer.email,
    telephone: customer.telephone ?? null,
    total,
    order_status_id: payload.order_status_id,
    date_added: new Date().toISOString(),
    date_modified: new Date().toISOString(),
    payment_method: payload.payment_method ?? null,
    payment_code: payload.payment_code ?? null,
    status,
    products: items,
    quiz: null,
  }

  const orders = readMyFormulaOrders()
  writeMyFormulaOrders([order, ...orders])

  const orderProducts = readMyFormulaOrderProducts()
  writeMyFormulaOrderProducts([...items, ...orderProducts])

  return { data: order }
}

export async function updateMyFormulaOrderStatus(
  order_id: string,
  payload: { order_status_id: string }
): Promise<ApiResponse<MyFormulaOrder>> {
  await delay()
  const orders = readMyFormulaOrders()
  const idx = orders.findIndex((o) => o.order_id === order_id)
  if (idx < 0) throw new Error('Pedido não encontrado')

  const statuses = readMyFormulaOrderStatuses()
  const status = statuses.find((s) => s.order_status_id === payload.order_status_id) ?? null

  const current = orders[idx]
  const nextRow: MyFormulaOrder = {
    ...current,
    order_status_id: payload.order_status_id,
    date_modified: new Date().toISOString(),
    status,
  }

  const next = orders.slice()
  next[idx] = nextRow
  writeMyFormulaOrders(next)
  return { data: nextRow }
}

export async function deleteMyFormulaOrder(order_id: string): Promise<ApiResponse<{ ok: true }>> {
  await delay()
  const orders = readMyFormulaOrders()
  writeMyFormulaOrders(orders.filter((o) => o.order_id !== order_id))

  const ops = readMyFormulaOrderProducts()
  writeMyFormulaOrderProducts(ops.filter((op) => op.order_id !== order_id))

  return { data: { ok: true } }
}

export async function fetchMyFormulaQuizzes(params?: {
  search?: string
  status?: 'all' | 'completed' | 'incomplete'
  plan?: string | 'all'
}): Promise<ApiResponse<MyFormulaQuiz[]>> {
  await delay()
  const q = params?.search?.trim().toLowerCase() ?? ''
  const status = params?.status ?? 'all'
  const plan = params?.plan ?? 'all'

  const rows = readMyFormulaQuizzes()
  const filtered = rows.filter((r) => {
    const post = r.post ?? {}
    const email = post.email ? normalizeEmail(String(post.email)) : ''
    const name = post.name ? String(post.name) : ''
    const step = post.step ? String(post.step) : ''
    const improve = post.improve_health ? String(post.improve_health) : ''

    const completed = step === 'plans'
    if (status === 'completed' && !completed) return false
    if (status === 'incomplete' && completed) return false

    if (plan !== 'all') {
      const parts = improve.split(',').map((x) => x.trim()).filter(Boolean)
      if (!parts.includes(plan)) return false
    }

    if (!q) return true
    const hay = `${r.quiz_id} ${name} ${email}`.toLowerCase()
    return hay.includes(q)
  })

  const sorted = filtered.slice().sort((a, b) => String(b.date_added ?? '').localeCompare(String(a.date_added ?? '')))
  writeMyFormulaQuizzes(rows)
  return { data: sorted }
}