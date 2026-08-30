import type { OrderStatus } from "../../types";

export const orderLabel: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagado",
  PROCESSING: "Preparando",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  UNPAID: "Sin pagar",
  PENDING: "Pago parcial",
  FAILED: "Fallido",
  REFUNDED: "Reintegrado",
};

export const transitions: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["PENDING_PAYMENT", "CANCELLED"],
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
