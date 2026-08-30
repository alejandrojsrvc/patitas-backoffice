import { describe, expect, it } from "vitest";
import type { Variant } from "../../types";
import { fulfillmentStatus } from "./utils";

const variant = (overrides: Partial<Variant> = {}): Variant => ({
  id: "variant-1",
  productId: "product-1",
  sku: "SKU-1",
  barcode: null,
  presentation: "15 kg",
  weightGrams: 15000,
  salePrice: "65000.00",
  compareAtPrice: null,
  active: true,
  preferredSupplierOfferId: null,
  revision: 1,
  ...overrides,
});

describe("fulfillmentStatus", () => {
  it("prioritizes available inventory", () => {
    expect(fulfillmentStatus(variant({ availableQuantity: 3 }))).toBe("IN_STOCK");
  });

  it("marks a supplier-backed variant as on request", () => {
    expect(fulfillmentStatus(variant({ supplierStockStatus: "AVAILABLE", supplierLeadTimeHours: 48 }))).toBe("ON_REQUEST");
  });

  it("keeps published products without fulfillment out of stock", () => {
    expect(fulfillmentStatus(variant())).toBe("OUT_OF_STOCK");
  });
});
