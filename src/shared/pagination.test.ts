import { describe, expect, it } from "vitest";
import { emptyPage } from "./pagination";

describe("emptyPage", () => {
  it("starts an empty list at page one", () => {
    expect(emptyPage()).toEqual({
      items: [],
      meta: { page: 1, perPage: 24, total: 0, totalPages: 0 },
    });
  });
});
