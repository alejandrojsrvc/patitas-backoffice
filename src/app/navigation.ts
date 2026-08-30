import type { DataState } from "../types";

export type View =
  | "dashboard"
  | "products"
  | "product"
  | "product-edit"
  | "sku"
  | "new-product"
  | "product-import"
  | "brands"
  | "categories"
  | "suppliers"
  | "supplier"
  | "prices"
  | "inventory"
  | "customers"
  | "customer"
  | "orders"
  | "new-order"
  | "order"
  | "settings"
  | "shipping-options"
  | "audit";

export type ToastKind = "success" | "error";
export type Notify = (message: string, kind?: ToastKind) => void;
export type Navigate = (view: View) => void;
export type MutateData = (recipe: (current: DataState) => DataState) => void;
