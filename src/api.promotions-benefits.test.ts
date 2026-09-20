import { afterEach, describe, expect, it, vi } from "vitest";
import { api, session } from "./api";

const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("promotions and benefits API contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    session.clear();
  });

  it("uses the authenticated admin routes for promotions and coupons", async () => {
    session.set({ accessToken: "access", refreshToken: "refresh", expiresAt: null });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => response({}));
    const promotion = { name: "Promo", type: "PERCENTAGE" as const, kind: "DISCOUNT" as const, value: "10.00", targets: [], bundleItems: [] };
    const coupon = { promotionId: "promotion-1", code: "AHORRO10" };

    await api.promotions();
    await api.createPromotion(promotion);
    await api.updatePromotion("promotion-1", { active: false });
    await api.coupons();
    await api.createCoupon(coupon);
    await api.updateCoupon("coupon-1", { active: false });

    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url), "http://localhost").pathname)).toEqual([
      "/api/v1/admin/promotions",
      "/api/v1/admin/promotions",
      "/api/v1/admin/promotions/promotion-1",
      "/api/v1/admin/coupons",
      "/api/v1/admin/coupons",
      "/api/v1/admin/coupons/coupon-1",
    ]);
    expect(fetchMock.mock.calls.every(([, init]) => new Headers(init?.headers).get("Authorization") === "Bearer access")).toBe(true);
    expect(fetchMock.mock.calls[1][1]?.method).toBe("POST");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual(promotion);
    expect(fetchMock.mock.calls[5][1]?.method).toBe("PATCH");
  });

  it("sends purchase schedule and transfer configuration payloads", async () => {
    session.set({ accessToken: "access", refreshToken: "refresh", expiresAt: null });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => response({}));
    const schedule = { enabled: true, discountPercent: "10.00", leadDays: 5 };
    const transfer = { enabled: true, discountPercent: "3.00", expirationMinutes: 120, instructions: { accountHolder: "Patitas", bank: "Banco", alias: "patitas", cbu: null, note: null } };

    await api.purchaseScheduleConfiguration();
    await api.updatePurchaseScheduleConfiguration(schedule);
    await api.transferBenefitConfiguration();
    await api.updateTransferBenefitConfiguration(transfer);

    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/admin/purchase-schedules/configuration");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/api/v1/admin/purchase-schedules/configuration");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual(schedule);
    expect(String(fetchMock.mock.calls[2][0])).toContain("/api/v1/admin/payment-method-benefits/transfer");
    expect(fetchMock.mock.calls[3][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetchMock.mock.calls[3][1]?.body))).toEqual(transfer);
  });
});
