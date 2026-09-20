export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type StockStatus = 'AVAILABLE' | 'OUT_OF_STOCK' | 'ON_REQUEST' | 'UNKNOWN'
export type FulfillmentStatus = 'IN_STOCK' | 'ON_REQUEST' | 'OUT_OF_STOCK'
export type OrderStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type PaymentStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export interface PageMeta { page: number; perPage: number; total: number; totalPages: number }
export interface Page<T> { items: T[]; meta: PageMeta }

export interface Reference { id: string; name: string; slug: string; active: boolean; description?: string | null; seoTitle?: string | null; seoDescription?: string | null; displayOrder?: number; parentId?: string | null; logoUrl?: string | null }
export interface ProductMedia { id: string; url: string; altText: string; displayOrder: number; variantId: string | null }
export interface ProductImportVariantResult { id: string; sku: string | null; weightGrams: number | null }
export interface ProductImportItem {
  slug: string
  productId: string
  variants: ProductImportVariantResult[]
  status: ProductStatus
  published: boolean
  publishError?: string
}
export interface ProductImportResult {
  rows: number
  products: number
  published: number
  draft: number
  items: ProductImportItem[]
}
export interface AnalyticalCompositionItem { name: string; minimum: string; maximum: string; unit: string; rawValue: string }
export interface FeedingGuideEntry { petWeightKgMin: number; petWeightKgMax: number | null; lifeStage: string | null; conditions: Record<string, string>; dailyGramsMin: number; dailyGramsMax: number | null }
export interface FeedingGuide { id: string; productId: string; sourceLabel: string; sourceUrl: string | null; requiredDimensions: Record<string, string[]>; entries: FeedingGuideEntry[] }
export interface InventoryItem { variantId: string; onHand: number; reserved: number; available: number }
export interface Variant {
  id: string; productId: string; sku: string | null; barcode: string | null; presentation: string | null
  weightGrams: number | null; salePrice: string | null; compareAtPrice: string | null
  active: boolean; preferredSupplierOfferId: string | null; revision: number
  onHand?: number; reserved?: number; availableQuantity?: number; supplierStockStatus?: StockStatus | null; supplierLeadTimeHours?: number | null
}
export interface Product {
  id: string; name: string; slug: string; description: string | null; ingredientsText: string | null
  analyticalComposition: Record<string, unknown> | AnalyticalCompositionItem[] | null
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
export interface SupplierOfferImportError { row: number; message: string }
export interface SupplierOfferImportResult {
  total: number; created: number; updated: number
  errors: SupplierOfferImportError[]; dryRun: boolean
}
export interface PricingRules {
  id: string; version: number; status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED'; currency: 'ARS'
  fulfillmentCost: string | null; packagingCost: string | null; paymentFixedCost: string | null
  paymentFeePercent: string | null; paymentFeeVatApplies: boolean | null; paymentFeeVatPercent: string | null; paymentFeeScheduleId: string | null
  subsidizedShippingCost: string | null; taxPercent: string | null
  otherCost: string | null; targetMarginPercent: string | null
  createdAt?: string; activatedAt?: string | null
}
export interface PricingReview {
  id: string; variantId: string; supplierOfferId: string; status: 'PENDING' | 'APPLIED' | 'SUPERSEDED'
  recommendedPrice: string; commercialPrice: string; createdAt: string; appliedAt: string | null
  breakdown: PricingBreakdown
}
export interface PricingReviewListItem extends PricingReview {
  product?: { id: string; name: string }
  variant?: { sku: string | null; presentation: string | null; salePrice: string | null }
  currentMarginPercent?: string | null
}
export interface BulkPricingRecalculationReview {
  variantId: string
  pricingReviewId: string
  recommendedPrice: string
  commercialPrice: string
}
export interface BulkPricingRecalculation {
  scenarioId: string
  processed: number
  reviews: BulkPricingRecalculationReview[]
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
  paymentVariable: string; paymentFeeTax: string; fixedMonthlyAllocation: string
  subsidizedShipping: string; taxes: string; other: string
  effectiveCost: string; estimatedProfit: string; resultingMarginPercent: string
}
export interface PaymentFeeSchedule {
  id: string; provider: 'MERCADOPAGO' | 'PAYWAY'; product: 'CHECKOUT_PRO'; name: string
  settlementDays: number; feePercent: string; vatApplies: boolean; vatPercent: string; fixedFee: string
  currency: 'ARS'; active: boolean; effectiveFrom: string; effectiveTo: string | null
  createdAt: string; updatedAt: string
}
export type PaymentProviderName = 'mercadopago' | 'payway' | 'simulated'
export interface PaymentProviderConfiguration {
  id: string; provider: PaymentProviderName; enabled: boolean; priority: number
  createdAt: string; updatedAt: string
}
export type OperatingCostType = 'FIXED_MONTHLY' | 'PER_ORDER' | 'PER_UNIT' | 'PERCENT_OF_SALE'
export interface OperatingCost {
  id: string; name: string; type: OperatingCostType; amount: string | null; percent: string | null
  currency: 'ARS'; active: boolean; effectiveFrom: string; effectiveTo: string | null
  createdAt: string; updatedAt: string
}
export interface PricingScenario {
  id: string; name: string; periodStart: string; periodEnd: string
  ordersSource: 'MANUAL' | 'PREVIOUS_PERIOD'; projectedOrders: number
  averageItemsPerOrder: string; paymentFeeScheduleId: string | null; active: boolean; createdAt: string; updatedAt: string
}
export interface PricingScenarioAnalysis {
  scenario: PricingScenario; ordersUsed: number; previousPeriodOrders: number | null
  sourceResolved: 'MANUAL' | 'PREVIOUS_PERIOD' | 'MANUAL_FALLBACK'
  averageSalePricePerUnit: string; averageVariableCostPerUnit: string
  averageContributionPerOrder: string; fixedMonthlyCosts: string; projectedRevenue: string
  projectedContribution: string; projectedOperatingResult: string
  breakEvenOrders: number | null; breakEvenRevenue: string | null
  paymentFeeSchedule: { id: string; provider: PaymentFeeSchedule['provider']; product: PaymentFeeSchedule['product']; name: string; settlementDays: number; feePercent: string; vatApplies: boolean; vatPercent: string; fixedFee: string } | null
  catalogCoverage: {
    variantsConsidered: number; variantsIncluded: number; variantsWithoutActiveOffer: number
    supplierOfferSelection: 'LOWEST_ACTIVE_UNIT_COST'; inventoryUsed: false
    productStatusFilterApplied: false
    includedVariants: Array<{
      variantId: string; productId: string; productName: string; productStatus: string
      sku: string | null; presentation: string | null; weightGrams: number | null
      salePrice: string; supplierOfferId: string; supplierName: string; unitCost: string
      inventory: { onHand: number; reserved: number; available: number } | null
    }>
  }
  costBreakdown: {
    fixedMonthly: Array<{ id: string; name: string; type: OperatingCostType; amount: string | null; percent: string | null }>
    perOrder: Array<{ id: string; name: string; type: OperatingCostType; amount: string | null; percent: string | null }>
    perUnit: Array<{ id: string; name: string; type: OperatingCostType; amount: string | null; percent: string | null }>
    percentOfSale: Array<{ id: string; name: string; type: OperatingCostType; amount: string | null; percent: string | null }>
    totals: { fixedMonthly: string; configuredPerOrder: string; configuredPerUnit: string; configuredPercentOfSale: string }
    rules: {
      packaging: string; subsidizedShipping: string; paymentFixed: string; fulfillment: string; other: string
      paymentFeePercent: string; paymentFeeVatApplies: boolean; paymentFeeVatPercent: string; paymentFeeEffectivePercent: string
      taxPercent: string; totalPercentRate: string
    }
    averages: {
      supplierCostPerUnit: string; operatingCostPerUnit: string; percentageCostPerUnit: string
      variableCostPerUnit: string; contributionPerUnit: string; costsPerOrder: string; contributionPerOrder: string
    }
  }
}

export type ShippingCoverageType = 'POSTAL_CODE' | 'NEIGHBORHOOD' | 'POLYGON'
export interface ShippingDeliverySlot { id: string; label: string; start: string; end: string }
export interface ShippingDeliveryWindows {
  deliverySlots: ShippingDeliverySlot[]
  daysOfWeek: number[]
  cutoff: string
  timezone: string
}
export interface ShippingOption {
  id: string; name: string; description: string | null; cost: string
  active: boolean; displayOrder: number
}
export interface ShippingZone {
  id: string; name: string; type: ShippingCoverageType; active: boolean; priority: number
  postalCodes: string[]; neighborhoods: string[]; polygon: unknown; cost: string
  freeShippingFrom: string | null; maxWeightGrams: number | null
  estimatedDaysMin: number; estimatedDaysMax: number; deliveryWindows: unknown
}
export interface ShippingQuote {
  available: boolean; zoneId: string | null; zoneName: string | null
  providerCost: string; vat: string; subsidy: string; cost: string; deliveryCount: number
  estimate: string | null; cutoffs: Array<{ time: string; coverage: 'AMBA' | 'CABA' }>
  deliverySlots: Array<ShippingDeliverySlot & { date: string }>; message: string
}
export interface DataState {
  products: Product[]; brands: Reference[]; categories: Reference[]
  suppliers: Supplier[]; offers: Offer[]; rules: { active: PricingRules | null; draft: PricingRules | null }
}

export type PromotionType = 'PERCENTAGE' | 'FIXED'
export type PromotionKind = 'DISCOUNT' | 'BUNDLE'
export interface PromotionTarget {
  productId: string | null; variantId: string | null; categoryId: string | null; brandId: string | null
}
export interface PromotionBundleItem { variantId: string; quantity: number }
export interface Promotion {
  id: string; name: string; type: PromotionType; kind: PromotionKind; value: string
  active: boolean; startsAt: string | null; endsAt: string | null; priority: number
  minimumSubtotal: string | null; maxRedemptions: number | null; redemptionCount: number
  targets: PromotionTarget[]; bundleItems: PromotionBundleItem[]
}
export interface PromotionInput {
  name: string; type: PromotionType; kind?: PromotionKind; value: string; active?: boolean
  startsAt?: string | null; endsAt?: string | null; priority?: number
  minimumSubtotal?: string | null; maxRedemptions?: number | null
  targets?: PromotionTarget[]; bundleItems?: PromotionBundleItem[]
}
export interface Coupon {
  id: string; promotionId: string; code: string; active: boolean
  startsAt: string | null; endsAt: string | null; maxRedemptions: number | null
  redemptionCount: number; perCustomerLimit: number | null; promotion: Promotion
}
export interface CouponInput {
  promotionId: string; code: string; active?: boolean; startsAt?: string | null
  endsAt?: string | null; maxRedemptions?: number | null; perCustomerLimit?: number | null
}
export interface PurchaseScheduleConfiguration {
  id: string; enabled: boolean; discountPercent: string; leadDays: number
  createdAt: string; updatedAt: string
}
export interface TransferInstructions {
  accountHolder: string; bank: string; alias: string | null; cbu: string | null; note: string | null
}
export interface TransferBenefitConfiguration {
  id: string; paymentMethod: string; enabled: boolean; discountPercent: string
  expirationMinutes: number; instructions: TransferInstructions | null
  createdAt: string; updatedAt: string
}
