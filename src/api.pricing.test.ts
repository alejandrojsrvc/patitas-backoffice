import { afterEach, describe, expect, it, vi } from "vitest";
import { api, session } from "./api";

describe("pricing API contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    session.clear();
  });

  it("sends the selected offer and scenario to the preview calculation", async () => {
    session.set({ accessToken: "access", refreshToken: "refresh", expiresAt: null });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ calculation: {} }), { status: 200 }),
    );

    await api.calculate("variant-1", "offer-1", "scenario-1");

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      variantId: "variant-1",
      supplierOfferId: "offer-1",
      scenarioId: "scenario-1",
    });
  });

  it("persists the review inputs and sends explicit activation intent", async () => {
    session.set({ accessToken: "access", refreshToken: "refresh", expiresAt: null });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ id: "review-1" }), { status: 200 }),
    );

    await api.recalculate("variant-1", { supplierOfferId: "offer-1", scenarioId: "scenario-1" });
    await api.applyPrice("variant-1", "review-1", true);

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      supplierOfferId: "offer-1",
      scenarioId: "scenario-1",
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      pricingReviewId: "review-1",
      activateProduct: true,
    });
  });

  it("recalculates all active variants for a scenario", async () => {
    session.set({ accessToken: "access", refreshToken: "refresh", expiresAt: null });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ scenarioId: "scenario-1", processed: 42, reviews: [] }), { status: 200 }),
    );

    await api.recalculateAllPricing("scenario-1");

    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/admin/pricing/recalculate");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("POST");
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer access");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ scenarioId: "scenario-1" });
  });

  it("supports Payway fees and scenario-specific payment schedules", async () => {
    session.set({ accessToken: "access", refreshToken: "refresh", expiresAt: null });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ id: "saved" }), { status: 200 }),
    );

    await api.createPaymentFeeSchedule({
      provider: "PAYWAY",
      product: "CHECKOUT_PRO",
      name: "Payway débito",
      settlementDays: 2,
      feePercent: "4.50",
      vatApplies: false,
      vatPercent: "21.00",
      fixedFee: "100.00",
    });
    await api.createPricingScenario({
      name: "Escenario Payway",
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-09-01T00:00:00.000Z",
      ordersSource: "MANUAL",
      projectedOrders: 20,
      averageItemsPerOrder: "1.00",
      paymentFeeScheduleId: "payway-1",
    });

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ provider: "PAYWAY", vatApplies: false });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({ paymentFeeScheduleId: "payway-1" });
  });
});
