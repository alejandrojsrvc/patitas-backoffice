import { describe, expect, it } from "vitest";
import { getWinningOffer } from "./calculations";
import type { Offer, Variant } from "../../types";

const variant: Variant = { id: "variant-1", productId: "product-1", sku: "SKU-1", barcode: null, presentation: "1 kg", weightGrams: 1000, salePrice: "1000", compareAtPrice: null, active: true, preferredSupplierOfferId: "offer-1", revision: 1 };
const offer: Offer = { id: "offer-1", supplierId: "supplier-1", variantId: "variant-1", supplierSku: null, unitCost: "700", currency: "ARS", stockStatus: "AVAILABLE", leadTimeHours: null, minimumQuantity: 1, revision: 1 };

describe("pricing calculations", () => {
  it("selects the active offer with the lowest unit cost", () => {
    const expensive = { ...offer, id: "offer-1", unitCost: "900" };
    const cheapest = { ...offer, id: "offer-2", unitCost: "700" };

    expect(getWinningOffer(variant, [expensive, cheapest])).toEqual(cheapest);
  });

  it("does not select an inactive offer", () => {
    const inactiveCheapest = { ...offer, id: "offer-2", unitCost: "500", active: false };

    expect(getWinningOffer(variant, [offer, inactiveCheapest])).toEqual(offer);
  });

  it("returns an offer for a variant with a single supplier", () => {
    expect(getWinningOffer(variant, [offer])).toEqual(offer);
  });
});
