import type { View } from "./navigation";

export type RouteState = {
  view: View;
  productId?: string;
  variantId?: string;
  supplierId?: string;
  customerId?: string;
  orderId?: string;
  valid: boolean;
};

export const STATIC_PATHS: Partial<Record<View, string>> = {
  dashboard: "/",
  products: "/catalogo/productos",
  "new-product": "/catalogo/productos/nuevo",
  "product-import": "/catalogo/productos/importar",
  categories: "/catalogo/categorias",
  brands: "/catalogo/marcas",
  suppliers: "/proveedores",
  prices: "/precios",
  inventory: "/inventario",
  customers: "/clientes",
  orders: "/pedidos",
  "new-order": "/pedidos/nuevo",
  settings: "/configuracion",
  "promotions-benefits": "/promociones-beneficios",
  "shipping-options": "/configuracion/opciones-envio",
  audit: "/configuracion/auditoria",
};

export const readRoute = (pathname: string): RouteState => {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const skuMatch = path.match(
    /^\/catalogo\/productos\/([^/]+)\/variantes\/([^/]+)$/,
  );
  if (skuMatch)
    return {
      view: "sku",
      productId: decodeURIComponent(skuMatch[1]),
      variantId: decodeURIComponent(skuMatch[2]),
      valid: true,
    };
  const editMatch = path.match(/^\/catalogo\/productos\/([^/]+)\/editar$/);
  if (editMatch)
    return {
      view: "product-edit",
      productId: decodeURIComponent(editMatch[1]),
      valid: true,
    };
  const productMatch = path.match(/^\/catalogo\/productos\/([^/]+)$/);
  if (productMatch && productMatch[1] !== "nuevo" && productMatch[1] !== "importar")
    return {
      view: "product",
      productId: decodeURIComponent(productMatch[1]),
      valid: true,
    };
  const supplierMatch = path.match(/^\/proveedores\/([^/]+)$/);
  if (supplierMatch)
    return {
      view: "supplier",
      supplierId: decodeURIComponent(supplierMatch[1]),
      valid: true,
    };
  const customerMatch = path.match(/^\/clientes\/([^/]+)$/);
  if (customerMatch && customerMatch[1] !== "nuevo")
    return {
      view: "customer",
      customerId: decodeURIComponent(customerMatch[1]),
      valid: true,
    };
  const orderMatch = path.match(/^\/pedidos\/([^/]+)$/);
  if (orderMatch && orderMatch[1] !== "nuevo")
    return {
      view: "order",
      orderId: decodeURIComponent(orderMatch[1]),
      valid: true,
    };
  const staticRoute = Object.entries(STATIC_PATHS).find(
    ([, routePath]) => routePath === path,
  );
  return staticRoute
    ? { view: staticRoute[0] as View, valid: true }
    : { view: "dashboard", valid: false };
};
