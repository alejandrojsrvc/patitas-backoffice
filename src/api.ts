import type { AuditLog, BulkPricingRecalculation, Customer, DashboardSummary, DataState, FeedingGuide, FeedingGuideEntry, InventoryItem, InventoryMovement, InventoryRow, Offer, OperatingCost, Order, OrderStatus, Page, PaymentFeeSchedule, PaymentProviderConfiguration, PaymentProviderName, PaymentStatus, PricingReview, PricingReviewListItem, PricingRules, PricingScenario, PricingScenarioAnalysis, Product, ProductImportResult, ProductMedia, ProductStatus, Reference, ShippingOption, ShippingQuote, ShippingZone, ShippingDeliveryWindows, StockStatus, Supplier, SupplierOfferImportResult, Variant } from './types'

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
type ResponseParser<T> = (response: Response) => Promise<T>

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

async function request<T>(path: string, options: RequestInit = {}, authenticated = true, parseResponse: ResponseParser<T> = (response) => response.json() as Promise<T>): Promise<T> {
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
  return parseResponse(response)
}

const write = <T>(path: string, method: 'POST' | 'PATCH' | 'PUT', body?: unknown, authenticated = true) => request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) }, authenticated)
const remove = <T>(path: string) => request<T>(path, { method: 'DELETE' })
type RawPage<T> = T[] | {
  items?: T[]
  data?: T[]
  meta?: Page<T>['meta']
  page?: number
  perPage?: number
  total?: number
}
const normalizePage = <T>(value: RawPage<T>): Page<T> => {
  if (Array.isArray(value)) {
    return { items: value, meta: { page: 1, perPage: Math.max(1, value.length), total: value.length, totalPages: value.length ? 1 : 0 } }
  }
  const items = Array.isArray(value.items) ? value.items : Array.isArray(value.data) ? value.data : []
  if (value.meta) return { items, meta: value.meta }
  const page = value.page || 1; const perPage = value.perPage || Math.max(1, items.length); const total = value.total ?? items.length
  return { items, meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) } }
}
const normalizeList = <T>(value: T[] | { items?: T[] } | undefined): T[] => {
  if (Array.isArray(value)) return value
  return Array.isArray(value?.items) ? value.items : []
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
      request<RawPage<Product>>('/admin/products?perPage=100').then(normalizePage), request<Reference[] | { items?: Reference[] }>('/admin/brands'), request<Reference[] | { items?: Reference[] }>('/admin/categories'),
      request<RawPage<Supplier>>('/admin/suppliers?perPage=100').then(normalizePage), request<Offer[] | { items?: Offer[] }>('/admin/supplier-offers'), request<DataState['rules']>('/admin/pricing/rules'),
    ])
    return { products: page.items, brands: normalizeList(brands), categories: normalizeList(categories), suppliers: suppliers.items, offers: normalizeList(offers), rules }
  },
  products: (params: { q?: string; status?: ProductStatus; brandId?: string; categoryId?: string; species?: string; page?: number; perPage?: number }) => request<RawPage<Product>>(`/admin/products${queryString(params)}`).then(normalizePage),
  product: (id: string) => request<Product>(`/admin/products/${id}`),
  createProduct: (body: { name: string; brandId: string; categoryId: string; species?: string; description?: string | null; ingredientsText?: string | null; analyticalComposition?: Record<string, unknown> | null }) => write<Product>('/admin/products', 'POST', body),
  importProductsCsv: (file: File, publish = false) => {
    const body = new FormData()
    body.append('file', file)
    body.append('publish', String(publish))
    return request<ProductImportResult>('/admin/products/import-csv', { method: 'POST', body })
  },
  downloadSupplierOffersTemplate: () => request<Blob>('/admin/supplier-offers/import-template', {}, true, (response) => response.blob()),
  importSupplierOffersCsv: (file: File, dryRun = false) => {
    const body = new FormData()
    body.append('file', file)
    body.append('dryRun', String(dryRun))
    return request<SupplierOfferImportResult>('/admin/supplier-offers/import-csv', { method: 'POST', body })
  },
  updateProduct: (id: string, body: { name?: string; slug?: string; description?: string | null; ingredientsText?: string | null; analyticalComposition?: Record<string, unknown> | null; brandId?: string; categoryId?: string; species?: string | null; line?: string | null; lifeStage?: string | null; breedSize?: string | null; estimatedDailyGramsPerKg?: string | null; featuredRank?: number | null; status?: ProductStatus }) => write<Product>(`/admin/products/${id}`, 'PATCH', body),
  createVariant: (productId: string, body: { sku?: string; barcode?: string | null; presentation?: string; weightGrams?: number; active?: boolean }) => write<Variant>(`/admin/products/${productId}/variants`, 'POST', body),
  updateVariant: (id: string, body: { sku?: string | null; barcode?: string | null; presentation?: string | null; weightGrams?: number | null; active?: boolean; compareAtPrice?: string | null; preferredSupplierOfferId?: string | null }) => write<Variant>(`/admin/variants/${id}`, 'PATCH', body),
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
  calculate: (variantId: string, supplierOfferId?: string, scenarioId?: string) => write<{ calculation: { recommendedPrice: string; commercialPrice: string; breakdown: PricingReview['breakdown'] } }>('/admin/pricing/calculate', 'POST', { variantId, ...(supplierOfferId ? { supplierOfferId } : {}), ...(scenarioId ? { scenarioId } : {}) }),
  recalculate: (variantId: string, body: { supplierOfferId?: string; scenarioId?: string }) => write<PricingReview>(`/admin/variants/${variantId}/recalculate-price`, 'POST', body),
  recalculateAllPricing: (scenarioId: string) => write<BulkPricingRecalculation>('/admin/pricing/recalculate', 'POST', { scenarioId }),
  reviews: (variantId: string) => request<PricingReview[]>(`/admin/variants/${variantId}/pricing-reviews`),
  allReviews: (params: { status?: PricingReview['status']; q?: string; page?: number; perPage?: number }) => request<RawPage<PricingReviewListItem>>(`/admin/pricing/reviews${queryString(params)}`).then((value) => Array.isArray(value) ? normalizePage({ items: value }) : normalizePage(value)),
  ruleHistory: () => request<PricingRules[]>('/admin/pricing/rules/history'),
  applyPrice: (variantId: string, pricingReviewId: string, activateProduct = false) => write<PricingReview>(`/admin/variants/${variantId}/apply-price`, 'POST', { pricingReviewId, activateProduct }),
  updateRules: (body: Record<string, string>) => write<PricingRules>('/admin/pricing/rules', 'PATCH', body),
  activateRules: () => write<PricingRules>('/admin/pricing/rules/activate', 'POST'),
  paymentFeeSchedules: () => request<PaymentFeeSchedule[]>('/admin/pricing/payment-fees'),
  paymentProviderConfigurations: () => request<PaymentProviderConfiguration[]>('/admin/payment-providers'),
  updatePaymentProviderConfiguration: (provider: PaymentProviderName, body: { enabled?: boolean; priority?: number }) => write<PaymentProviderConfiguration>(`/admin/payment-providers/${provider}`, 'PATCH', body),
  selectPaymentFeeSchedule: (id: string) => write<PricingRules>(`/admin/pricing/payment-fees/${id}/select`, 'POST'),
  createPaymentFeeSchedule: (body: { provider: PaymentFeeSchedule['provider']; product: 'CHECKOUT_PRO'; name: string; settlementDays: number; feePercent: string; vatApplies?: boolean; vatPercent: string; fixedFee?: string; active?: boolean }) => write<PaymentFeeSchedule>('/admin/pricing/payment-fees', 'POST', body),
  updatePaymentFeeSchedule: (id: string, body: Partial<{ provider: PaymentFeeSchedule['provider']; product: 'CHECKOUT_PRO'; name: string; settlementDays: number; feePercent: string; vatApplies: boolean; vatPercent: string; fixedFee: string; active: boolean; effectiveFrom: string; effectiveTo: string | null }>) => write<PaymentFeeSchedule>(`/admin/pricing/payment-fees/${id}`, 'PATCH', body),
  operatingCosts: () => request<OperatingCost[]>('/admin/pricing/operating-costs'),
  createOperatingCost: (body: { name: string; type: OperatingCost['type']; amount?: string | null; percent?: string | null; active?: boolean; effectiveFrom?: string; effectiveTo?: string | null }) => write<OperatingCost>('/admin/pricing/operating-costs', 'POST', body),
  updateOperatingCost: (id: string, body: Partial<{ name: string; type: OperatingCost['type']; amount: string | null; percent: string | null; active: boolean; effectiveFrom: string; effectiveTo: string | null }>) => write<OperatingCost>(`/admin/pricing/operating-costs/${id}`, 'PATCH', body),
  pricingScenarios: () => request<PricingScenario[]>('/admin/pricing/scenarios'),
  createPricingScenario: (body: { name: string; periodStart: string; periodEnd: string; ordersSource: PricingScenario['ordersSource']; projectedOrders: number; averageItemsPerOrder: string; paymentFeeScheduleId?: string | null; active?: boolean }) => write<PricingScenario>('/admin/pricing/scenarios', 'POST', body),
  updatePricingScenario: (id: string, body: Partial<{ name: string; periodStart: string; periodEnd: string; ordersSource: PricingScenario['ordersSource']; projectedOrders: number; averageItemsPerOrder: string; paymentFeeScheduleId: string | null; active: boolean }>) => write<PricingScenario>(`/admin/pricing/scenarios/${id}`, 'PATCH', body),
  pricingScenarioAnalysis: (id: string) => request<PricingScenarioAnalysis>(`/admin/pricing/scenarios/${id}/analysis`),
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
  shippingOptions: (active?: boolean) => request<ShippingOption[]>(`/admin/shipping-options${queryString({ active })}`),
  createShippingOption: (body: { name: string; description?: string | null; cost: string; active?: boolean; displayOrder?: number }) => write<ShippingOption>('/admin/shipping-options', 'POST', body),
  updateShippingOption: (id: string, body: Partial<{ name: string; description: string | null; cost: string; active: boolean; displayOrder: number }>) => write<ShippingOption>(`/admin/shipping-options/${id}`, 'PATCH', body),
  shippingZones: (active?: boolean) => request<ShippingZone[]>(`/admin/shipping-options/zones${queryString({ active })}`),
  createShippingZone: (body: { name: string; type: ShippingZone['type']; active?: boolean; priority?: number; postalCodes?: string[]; neighborhoods?: string[]; polygon?: unknown; cost: string; freeShippingFrom?: string | null; maxWeightGrams?: number | null; estimatedDaysMin: number; estimatedDaysMax: number; deliveryWindows?: ShippingDeliveryWindows }) => write<ShippingZone>('/admin/shipping-options/zones', 'POST', body),
  updateShippingZone: (id: string, body: Partial<{ name: string; type: ShippingZone['type']; active: boolean; priority: number; postalCodes: string[]; neighborhoods: string[]; polygon: unknown; cost: string; freeShippingFrom: string | null; maxWeightGrams: number | null; estimatedDaysMin: number; estimatedDaysMax: number; deliveryWindows: ShippingDeliveryWindows }>) => write<ShippingZone>(`/admin/shipping-options/zones/${id}`, 'PATCH', body),
  updateShippingDeliveryWindows: (id: string, body: ShippingDeliveryWindows) => write<ShippingZone>(`/admin/shipping-options/zones/${id}/delivery-windows`, 'PATCH', body),
  shippingQuote: (params: { postalCode?: string; neighborhood?: string; city?: string; province?: string; subtotal: string; weightGrams?: number }) => request<ShippingQuote>(`/admin/shipping-options/quote${queryString(params)}`),
}
