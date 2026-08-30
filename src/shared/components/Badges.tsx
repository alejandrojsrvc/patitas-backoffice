import type { FulfillmentStatus, Offer, ProductStatus } from "../../types";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "Activo",
    DRAFT: "Borrador",
    ARCHIVED: "Archivado",
  };
  return (
    <span className={`status-badge ${status.toLowerCase()}`}>
      <i />
      {map[status] || status}
    </span>
  );
}

export function PublicationBadge({ status }: { status: ProductStatus }) {
  const labels: Record<ProductStatus, string> = {
    ACTIVE: "Publicado",
    DRAFT: "Borrador",
    ARCHIVED: "Archivado",
  };
  return <span className={`status-badge ${status.toLowerCase()}`}><i />{labels[status]}</span>;
}

export function FulfillmentBadge({ status }: { status: FulfillmentStatus }) {
  const labels: Record<FulfillmentStatus, string> = {
    IN_STOCK: "En stock",
    ON_REQUEST: "A pedido",
    OUT_OF_STOCK: "Sin stock",
  };
  return <span className={`fulfillment-badge ${status.toLowerCase()}`}>{labels[status]}</span>;
}

export function StockBadge({ status }: { status: Offer["stockStatus"] }) {
  return (
    <span className={`stock-badge ${status.toLowerCase()}`}>
      {stockLabel(status)}
    </span>
  );
}

export function stockLabel(status?: Offer["stockStatus"]) {
  return (
    {
      AVAILABLE: "Disponible",
      OUT_OF_STOCK: "Sin stock",
      ON_REQUEST: "A pedido",
      UNKNOWN: "Desconocido",
    } as Record<string, string>
  )[status || "UNKNOWN"];
}

export function OperationBadge({
  value,
  tone,
}: {
  value: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  return <span className={`operation-badge ${tone}`}>{value}</span>;
}
