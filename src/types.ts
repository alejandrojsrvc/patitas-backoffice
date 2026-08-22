export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type StockStatus = 'AVAILABLE' | 'OUT_OF_STOCK' | 'ON_REQUEST' | 'UNKNOWN'
export type OrderStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export interface PageMeta { page: number; perPage: number; total: number; totalPages: number }
export interface Page<T> { items: T[]; meta: PageMeta }

export interface Reference { id: string; name: string; slug: string; active: boolean; description?: string | null; seoTitle?: string | null; seoDescription?: string | null; displayOrder?: number; parentId?: string | null; logoUrl?: string | null }
export interface ProductMedia { id: string; url: string; altText: string; displayOrder: number; variantId: string | null }
export interface FeedingGuideEntry { petWeightKg: number; lifeStage: string | null; conditions: Record<string, string>; dailyGramsMin: number; dailyGramsMax: number }
export interface FeedingGuide { id: string; productId: string; sourceLabel: string; sourceUrl: string | null; requiredDimensions: Record<string, string[]>; entries: FeedingGuideEntry[] }
export interface InventoryItem { variantId: string; onHand: number; reserved: number; available: number }
export interface Variant {
  id: string; productId: string; sku: string | null; presentation: string | null
  weightGrams: number | null; salePrice: string | null; compareAtPrice: string | null
  active: boolean; preferredSupplierOfferId: string | null; revision: number
  onHand?: number; reserved?: number; availableQuantity?: number; supplierStockStatus?: StockStatus | null; supplierLeadTimeHours?: number | null
}
export interface Product {
  id: string; name: string; slug: string; description: string | null
  brandId: string; categoryId: string | null; species: string | null; line: string | null
  lifeStage: string | null; breedSize: string | null; status: ProductStatus
  featuredRank?: number | null; brand: Reference; category: Reference | null; variants: Variant[]; media?: ProductMedia[]
}
export interface Supplier { id: string; name: string; active: boolean }
export interface Offer {
  id: string; supplierId: string; variantId: string; supplierSku: string | null
  unitCost: string; currency: 'ARS'; stockStatus: StockStatus
  leadTimeHours: number | null; minimumQuantity: number; active?: boolean; revision: number; updatedAt?: string
}
export interface PricingRules {
  id: string; version: number; status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED'; currency: 'ARS'
  fulfillmentCost: string | null; packagingCost: string | null; paymentFixedCost: string | null
  paymentFeePercent: string | null; subsidizedShippingCost: string | null; taxPercent: string | null
  otherCost: string | null; targetMarginPercent: string | null
  createdAt?: string; activatedAt?: string | null
}
export interface PricingReview {
  id: string; variantId: string; supplierOfferId: string; status: 'PENDING' | 'APPLIED' | 'SUPERSEDED'
  recommendedPrice: string; commercialPrice: string; createdAt: string; appliedAt: string | null
  breakdown: PricingBreakdown
}
export interface InventoryMovement { id: string; variantId: string; orderId: string | null; type: 'RESERVE' | 'RELEASE' | 'SHIP' | 'ADJUSTMENT'; quantity: number; reason: string | null; createdAt: string }
export interface InventoryRow { variantId: string; productId: string; productName: string; sku: string | null; presentation: string | null; onHand: number; reserved: number; available: number }
export interface Customer { id: string; userId: string | null; fullName: string; email: string; phone: string | null; active: boolean; createdAt: string; updatedAt: string }
export interface OrderLine { id: string; variantId: string; productName: string; sku: string | null; presentation: string | null; unitPrice: string; quantity: number; lineTotal: string }
export interface OrderPayment { id: string; amount: string; method: string; reference: string | null; proofUrl: string | null; paidAt: string | null; createdAt: string }
export interface Order {
  id: string; customerId: string | null; status: OrderStatus; paymentStatus: PaymentStatus; paymentMethod: string | null; paymentReference: string | null
  currency: 'ARS'; subtotal: string; shippingCost: string; total: string; contactName: string; contactEmail: string; contactPhone: string | null
  shippingAddress: Record<string, string>; notes: string | null; trackingNumber: string | null; createdAt: string; updatedAt: string
  lines: OrderLine[]; payments: OrderPayment[]; availableTransitions?: OrderStatus[]
}
export interface AuditLog { id: string; actorUserId: string | null; action: string; method: string; path: string; statusCode: number | null; metadata: Record<string, unknown> | null; createdAt: string }
export interface DashboardSummary {
  activeProducts: number; variantsWithoutPrice: number; pendingPricingReviews: number; variantsWithoutSupplier: number; averageMarginPercent: number | null
  alerts: Array<{ type: 'LOW_MARGIN' | 'NO_SUPPLIER'; productId: string; variantId: string; label: string; currentMargin?: number; targetMargin?: number }>
}
export interface PricingBreakdown {
  productCost: string; fulfillment: string; packaging: string; paymentFixed: string
  paymentVariable: string; subsidizedShipping: string; taxes: string; other: string
  effectiveCost: string; estimatedProfit: string; resultingMarginPercent: string
}
export interface DataState {
  products: Product[]; brands: Reference[]; categories: Reference[]
  suppliers: Supplier[]; offers: Offer[]; rules: { active: PricingRules | null; draft: PricingRules | null }
}
