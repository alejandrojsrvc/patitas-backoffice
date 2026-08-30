import { afterEach, describe, expect, it, vi } from "vitest";
import { api, session } from "./api";

describe("payment provider configuration API contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    session.clear();
  });

  it("lists admin payment providers", async () => {
    session.set({ accessToken: "access", refreshToken: "refresh", expiresAt: null });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify([]), { status: 200 }),
    );

    await api.paymentProviderConfigurations();

    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/admin/payment-providers");
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer access");
  });

  it("updates enabled state and priority for a provider", async () => {
    session.set({ accessToken: "access", refreshToken: "refresh", expiresAt: null });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ provider: "payway", enabled: true, priority: 8 }), { status: 200 }),
    );

    await api.updatePaymentProviderConfiguration("payway", { enabled: true, priority: 8 });

    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/admin/payment-providers/payway");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ enabled: true, priority: 8 });
  });
});
