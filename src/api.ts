import type { AuditLog, Customer, DashboardSummary, DataState, FeedingGuide, FeedingGuideEntry, InventoryItem, InventoryMovement, InventoryRow, Offer, Order, OrderStatus, Page, PaymentStatus, PricingReview, PricingRules, Product, ProductMedia, ProductStatus, Reference, StockStatus, Supplier, Variant } from './types'

const BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '')
const SESSION_KEY = 'patitas_admin_session'
const LEGACY_TOKEN_KEY = 'patitas_admin_token'
export const SESSION_EXPIRED_EVENT = 'patitas:session-expired'

export interface StoredSession {
  accessToken: string
  refreshToken: string
  expiresAt: number | null
}

interface AuthResult {
  status: string
  session: StoredSession | null
  user: { role: string } | null
}

const isStoredSession = (value: unknown): value is StoredSession => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StoredSession>
  return typeof candidate.accessToken === 'string' && candidate.accessToken.length > 0
    && typeof candidate.refreshToken === 'string' && candidate.refreshToken.length > 0
    && (candidate.expiresAt === null || typeof candidate.expiresAt === 'number')
}

export const session = {
  get: (): StoredSession | null => {
    try {
      const stored = localStorage.getItem(SESSION_KEY)
      if (!stored) {
        localStorage.removeItem(LEGACY_TOKEN_KEY)
        return null
      }
      const parsed: unknown = JSON.parse(stored)
      if (isStoredSession(parsed)) return parsed
    } catch { /* una sesión corrupta se descarta abajo */ }
    session.clear()
    return null
  },
  set: (value: StoredSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(value))
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  },
  clear: () => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  },
}

let refreshInFlight: Promise<string> | null = null

const redirectToLogin = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

const expireSession = (): never => {
  session.clear()
  redirectToLogin()
  const error = new Error('La sesión expiró') as Error & { status?: number }
  error.status = 401
  throw error
}

const performRefresh = async (): Promise<string> => {
  const current = session.get()
  if (!current?.refreshToken) return expireSession()

  let response: Response
  try {
    response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    })
  } catch {
    return expireSession()
  }

  if (!response.ok) return expireSession()
  let result: AuthResult
  try {
    result = await response.json() as AuthResult
  } catch {
    return expireSession()
  }
  if (!isStoredSession(result.session)) return expireSession()
  session.set(result.session)
  return result.session.accessToken
}

export const refreshSession = (): Promise<string> => {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = performRefresh().finally(() => { refreshInFlight = null })
  return refreshInFlight
}

const shouldRefresh = (value: StoredSession) => value.expiresAt !== null
  && value.expiresAt <= Math.floor(Date.now() / 1000) + 30

async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  let current = session.get()
  let refreshed = false

  if (authenticated && !current) return expireSession()
  if (authenticated && current && shouldRefresh(current)) {
    await refreshSession()
    refreshed = true
    current = session.get()
  }

  const send = (accessToken: string | null) => {
    const headers = new Headers(options.headers)
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
    if (!headers.has('Content-Type') && !isFormData) headers.set('Content-Type', 'application/json')
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
    else headers.delete('Authorization')
    return fetch(`${BASE_URL}${path}`, { ...options, headers })
  }

  let tokenUsed = authenticated ? current?.accessToken ?? null : null
  let response = await send(tokenUsed)

  if (authenticated && response.status === 401) {
    if (refreshed) return expireSession()

    const latest = session.get()
    if (latest && latest.accessToken !== tokenUsed) {
      tokenUsed = latest.accessToken
    } else {
      tokenUsed = await refreshSession()
    }
    refreshed = true
    response = await send(tokenUsed)
    if (response.status === 401) return expireSession()
  }

  if (!response.ok) {
    let message = 'No pudimos completar la operación.'
    try { const body = await response.json(); message = body.message || message } catch { /* respuesta sin JSON */ }
    const error = new Error(Array.isArray(message) ? message.join('. ') : message) as Error & { status?: number }
    error.status = response.status
    throw error
  }
  return response.json() as Promise<T>
}

const write = <T>(path: string, method: 'POST' | 'PATCH' | 'PUT', body?: unknown, authenticated = true) => request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }, authenticated)
const remove = <T>(path: string) => request<T>(path, { method: 'DELETE' })
type RawPage<T> = { items: T[]; meta?: Page<T>['meta']; page?: number; perPage?: number; total?: number }
const normalizePage = <T>(value: RawPage<T>): Page<T> => {
  if (value.meta) return { items: value.items, meta: value.meta }
  const page = value.page || 1; const perPage = value.perPage || Math.max(1, value.items.length); const total = value.total ?? value.items.length
  return { items: value.items, meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) } }
}
const queryString = (values: Record<string, string | number | boolean | null | undefined>) => {
  const query = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') query.set(key, String(value)) })
  const result = query.toString(); return result ? `?${result}` : ''
}

const uploadProductMedia = (productId: string, input: { file: File; altText: string; variantId?: string | null; displayOrder?: number }) => {
  const body = new FormData()
  body.append('file', input.file)
  body.append('altText', input.altText)
  if (input.variantId) body.append('variantId', input.variantId)
  if (input.displayOrder !== undefined) body.append('displayOrder', String(input.displayOrder))
  return request<ProductMedia>(`/admin/products/${productId}/media/upload`, { method: 'POST', body })
}

export const api = {
  login: (email: string, password: string) => write<AuthResult>('/auth/login', 'POST', { email, password }, false),
  loadAll: async (): Promise<DataState> => {
    const [page, brands, categories, suppliers, offers, rules] = await Promise.all([
      request<{ items: Product[] }>('/admin/products?perPage=100'), request<Reference[]>('/admin/brands'), request<Reference[]>('/admin/categories'),
      request<RawPage<Supplier>>('/admin/suppliers?perPage=100'), request<Offer[]>('/admin/supplier-offers'), request<DataState['rules']>('/admin/pricing/rules'),
    ])
    return { products: page.items, brands, categories, suppliers: suppliers.items, offers, rules }
  },
  createProduct: (body: { name: string; brandId: string; categoryId: string; species?: string; description?: string }) => write<Product>('/admin/products', 'POST', body),
  updateProduct: (id: string, body: { name?: string; slug?: string; description?: string | null; brandId?: string; categoryId?: string; species?: string | null; line?: string | null; lifeStage?: string | null; breedSize?: string | null; estimatedDailyGramsPerKg?: string | null; featuredRank?: number | null; status?: ProductStatus }) => write<Product>(`/admin/products/${id}`, 'PATCH', body),
  createVariant: (productId: string, body: { sku?: string; presentation?: string; weightGrams?: number; active?: boolean }) => write<Variant>(`/admin/products/${productId}/variants`, 'POST', body),
  updateVariant: (id: string, body: { sku?: string | null; presentation?: string | null; weightGrams?: number | null; active?: boolean; compareAtPrice?: string | null; preferredSupplierOfferId?: string | null }) => write<Variant>(`/admin/variants/${id}`, 'PATCH', body),
  uploadProductMedia,
  updateProductMedia: (productId: string, mediaId: string, body: { altText?: string; variantId?: string | null; displayOrder?: number }) => write<ProductMedia>(`/admin/products/${productId}/media/${mediaId}`, 'PATCH', body),
  deleteProductMedia: (productId: string, mediaId: string) => remove<{ id: string; deleted: boolean }>(`/admin/products/${productId}/media/${mediaId}`),
  uploadBrandLogo: (brandId: string, file: File) => { const body = new FormData(); body.append('file', file); return request<Reference>(`/admin/brands/${brandId}/logo/upload`, { method: 'POST', body }) },
  feedingGuide: (productId: string) => request<FeedingGuide | null>(`/admin/products/${productId}/feeding-guide`),
  replaceFeedingGuide: (productId: string, body: { sourceLabel: string; sourceUrl?: string | null; requiredDimensions?: Record<string, string[]>; entries: FeedingGuideEntry[] }) => write<FeedingGuide>(`/admin/products/${productId}/feeding-guide`, 'POST', body),
  setInventory: (variantId: string, body: { onHand: number; reserved: number; reason?: string }) => write<InventoryItem>(`/admin/variants/${variantId}/inventory`, 'PUT', body),
  inventoryMovements: (variantId: string) => request<InventoryMovement[]>(`/admin/variants/${variantId}/inventory/movements`),
  inventory: (params: { q?: string; page?: number; perPage?: number }) => request<RawPage<InventoryRow>>(`/admin/inventory${queryString(params)}`).then(normalizePage),
  adjustInventory: (variantId: string, body: { quantityDelta: number; reason: string }) => write<InventoryItem>(`/admin/variants/${variantId}/inventory/adjustments`, 'POST', body),
  createReference: (type: 'brands' | 'categories', body: { name: string; slug?: string; active?: boolean; description?: string | null; seoTitle?: string | null; seoDescription?: string | null; displayOrder?: number }) => write<Reference>(`/admin/${type}`, 'POST', body),
  updateReference: (type: 'brands' | 'categories', id: string, body: { name?: string; slug?: string; active?: boolean; description?: string | null; seoTitle?: string | null; seoDescription?: string | null; displayOrder?: number }) => write<Reference>(`/admin/${type}/${id}`, 'PATCH', body),
  createSupplier: (body: { name: string; active?: boolean }) => write<Supplier>('/admin/suppliers', 'POST', body),
  updateSupplier: (id: string, body: { name?: string; active?: boolean }) => write<Supplier>(`/admin/suppliers/${id}`, 'PATCH', body),
  createOffer: (body: { supplierId: string; variantId: string; supplierSku?: string | null; unitCost: string; stockStatus?: StockStatus; leadTimeHours?: number | null; minimumQuantity?: number }) => write<Offer>('/admin/supplier-offers', 'POST', body),
  updateOffer: (id: string, body: { supplierSku?: string | null; unitCost?: string; stockStatus?: StockStatus; leadTimeHours?: number | null; minimumQuantity?: number }) => write<Offer>(`/admin/supplier-offers/${id}`, 'PATCH', body),
  calculate: (variantId: string, supplierOfferId?: string) => write<{ calculation: { recommendedPrice: string; commercialPrice: string; breakdown: PricingReview['breakdown'] } }>('/admin/pricing/calculate', 'POST', { variantId, ...(supplierOfferId ? { supplierOfferId } : {}) }),
  recalculate: (variantId: string) => write<PricingReview>(`/admin/variants/${variantId}/recalculate-price`, 'POST', {}),
  reviews: (variantId: string) => request<PricingReview[]>(`/admin/variants/${variantId}/pricing-reviews`),
  allReviews: (params: { status?: PricingReview['status']; q?: string; page?: number; perPage?: number }) => request<RawPage<PricingReview>>(`/admin/pricing/reviews${queryString(params)}`).then((value) => Array.isArray(value) ? normalizePage({ items: value }) : normalizePage(value)),
  ruleHistory: () => request<PricingRules[]>('/admin/pricing/rules/history'),
  applyPrice: (variantId: string, pricingReviewId: string) => write<PricingReview>(`/admin/variants/${variantId}/apply-price`, 'POST', { pricingReviewId }),
  updateRules: (body: Record<string, string>) => write<PricingRules>('/admin/pricing/rules', 'PATCH', body),
  activateRules: () => write<PricingRules>('/admin/pricing/rules/activate', 'POST'),
  customers: (params: { q?: string; active?: boolean; page?: number; perPage?: number }) => request<RawPage<Customer>>(`/admin/customers${queryString(params)}`).then(normalizePage),
  customer: (id: string) => request<Customer>(`/admin/customers/${id}`),
  createCustomer: (body: { fullName: string; email: string; phone?: string | null; active?: boolean }) => write<Customer>('/admin/customers', 'POST', body),
  updateCustomer: (id: string, body: { fullName?: string; email?: string; phone?: string | null; active?: boolean }) => write<Customer>(`/admin/customers/${id}`, 'PATCH', body),
  orders: (params: { q?: string; customerId?: string; status?: OrderStatus; paymentStatus?: PaymentStatus; page?: number; perPage?: number }) => request<RawPage<Order>>(`/admin/orders${queryString(params)}`).then(normalizePage),
  order: (id: string) => request<Order>(`/admin/orders/${id}`),
  createOrder: (body: { customerId?: string; contactName: string; contactEmail: string; contactPhone?: string | null; shippingAddress: Record<string, string>; shippingCost?: string; notes?: string | null; lines: Array<{ variantId: string; quantity: number }> }) => write<Order>('/admin/orders', 'POST', body),
  updateOrder: (id: string, body: { contactName?: string; contactEmail?: string; contactPhone?: string | null; shippingAddress?: Record<string, string>; notes?: string | null; trackingNumber?: string | null }) => write<Order>(`/admin/orders/${id}`, 'PATCH', body),
  registerPayment: (id: string, body: { amount: string; method: string; reference?: string | null }) => write<Order>(`/admin/orders/${id}/payment`, 'POST', body),
  transitionOrder: (id: string, status: OrderStatus) => write<Order>(`/admin/orders/${id}/status`, 'POST', { status }),
  cancelOrder: (id: string) => write<Order>(`/admin/orders/${id}/cancel`, 'POST'),
  uploadPaymentProof: (orderId: string, paymentId: string, file: File) => { const body = new FormData(); body.append('file', file); return request<Order>(`/admin/orders/${orderId}/payments/${paymentId}/proof/upload`, { method: 'POST', body }) },
  dashboardSummary: () => request<DashboardSummary>('/admin/dashboard/summary'),
  auditLogs: (params: { q?: string; method?: string; statusCode?: number; dateFrom?: string; dateTo?: string; page?: number; perPage?: number }) => request<RawPage<AuditLog>>(`/admin/audit-logs${queryString(params)}`).then(normalizePage),
}
