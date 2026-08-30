import { describe, expect, it } from "vitest";
import { readRoute } from "./routing";

describe("readRoute", () => {
  it("recognizes the product import screen before the dynamic product route", () => {
    expect(readRoute("/catalogo/productos/importar")).toMatchObject({
      view: "product-import",
      valid: true,
    });
  });

  it("decodes product and variant identifiers", () => {
    expect(readRoute("/catalogo/productos/product%201/variantes/sku%2F1")).toMatchObject({
      view: "sku",
      productId: "product 1",
      variantId: "sku/1",
      valid: true,
    });
  });

  it("marks unknown paths as invalid without throwing", () => {
    expect(readRoute("/ruta-inexistente")).toMatchObject({ view: "dashboard", valid: false });
  });

  it("recognizes the shipping configuration screen", () => {
    expect(readRoute("/configuracion/opciones-envio")).toMatchObject({
      view: "shipping-options",
      valid: true,
    });
  });
});
