import { afterEach, describe, expect, it, vi } from "vitest";
import { api, session } from "./api";

describe("shipping API contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    session.clear();
  });

  it("lists options and zones with the admin endpoints", async () => {
    session.set({ accessToken: "access", refreshToken: "refresh", expiresAt: null });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify([]), { status: 200 }),
    );

    await api.shippingOptions(true);
    await api.shippingZones();

    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/admin/shipping-options?active=true");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/api/v1/admin/shipping-options/zones");
  });

  it("sends zone delivery windows and quote parameters", async () => {
    session.set({ accessToken: "access", refreshToken: "refresh", expiresAt: null });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({}), { status: 200 }),
    );
    const windows = {
      deliverySlots: [
        { id: "MORNING", label: "10 a 12", start: "10:00", end: "12:00" },
        { id: "EVENING", label: "18 a 20", start: "18:00", end: "20:00" },
      ],
      daysOfWeek: [1, 2, 3, 4, 5],
      cutoff: "13:00",
      timezone: "America/Argentina/Buenos_Aires",
    };

    await api.updateShippingDeliveryWindows("zone-1", windows);
    await api.shippingQuote({ neighborhood: "CABA", subtotal: "10000.00", weightGrams: 20000 });

    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/admin/shipping-options/zones/zone-1/delivery-windows");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(windows);
    expect(String(fetchMock.mock.calls[1][0])).toContain("/api/v1/admin/shipping-options/quote?neighborhood=CABA&subtotal=10000.00&weightGrams=20000");
  });
});
