import { AlertTriangle, ArrowRight, Building2, Check, ChevronRight, CircleDollarSign, MoreHorizontal, PackagePlus, Plus } from "lucide-react";
import type { DashboardSummary, DataState } from "../../../types";
import type { View } from "../../../app/navigation";
import { PageHeader } from "../../../shared/components";
import { percentage } from "../../../shared/formatters";
import { ProductTable } from "../../catalog/components/ProductTable";

export function DashboardPage({
  data,
  summary,
  navigate,
  openProduct,
  openVariant,
}: {
  data: DataState;
  summary?: DashboardSummary;
  navigate: (view: View) => void;
  openProduct: (id: string) => void;
  openVariant: (id: string, productId?: string) => void;
}) {
  const variants = data.products.flatMap((p) =>
    p.variants.map((v) => ({ ...v, product: p })),
  );
  const active = summary?.activeProducts ?? data.products.filter((p) => p.status === "ACTIVE").length;
  const withoutPrice = summary?.variantsWithoutPrice ?? variants.filter((v) => !v.salePrice).length;
  const noSupplier = summary?.variantsWithoutSupplier ?? variants.filter(
    (v) =>
      !data.offers.some(
        (o) => o.variantId === v.id && o.stockStatus === "AVAILABLE",
      ),
  ).length;
  const target = Number(data.rules.active?.targetMarginPercent || 0);
  const lowMargin = summary?.alerts.filter((alert) => alert.type === "LOW_MARGIN") || [];
  const metrics = [
    {
      label: "Productos activos",
      value: active,
      hint: `${data.products.length} en catálogo`,
      tone: "neutral",
    },
    {
      label: "Productos sin precio",
      value: withoutPrice,
      hint: withoutPrice ? "Requieren atención" : "Todo en orden",
      tone: withoutPrice ? "warning" : "success",
    },
    {
      label: "Precios a revisar",
      value: summary?.pendingPricingReviews ?? lowMargin.length,
      hint: target ? `Margen objetivo ${target}%` : "Configurá las reglas",
      tone: lowMargin.length ? "warning" : "success",
    },
    {
      label: "Sin proveedor",
      value: noSupplier,
      hint: "Sin oferta disponible",
      tone: noSupplier ? "danger" : "success",
    },
    {
      label: "Margen promedio",
      value: percentage(summary?.averageMarginPercent ?? null),
      hint: "Sobre costo mercadería",
      tone: "success",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Resumen operativo"
        title="Buen día"
        description="Esto es lo que requiere tu atención hoy."
        actions={
          <button
            className="button primary"
            onClick={() => navigate("new-product")}
          >
            <Plus size={17} /> Nuevo producto
          </button>
        }
      />
      <div className="metrics-grid">
        {metrics.map((metric) => (
          <div className="metric-card" key={metric.label}>
            <div className="metric-label">
              <span>{metric.label}</span>
              <MoreHorizontal size={17} />
            </div>
            <strong>{metric.value}</strong>
            <small className={metric.tone}>
              {metric.tone === "success" && <Check size={13} />}
              {metric.hint}
            </small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel alerts-panel">
          <div className="panel-heading">
            <div>
              <h2>Alertas</h2>
              <p>Prioridades que impactan tus ventas.</p>
            </div>
            <span className="count-badge">{lowMargin.length + noSupplier}</span>
          </div>
          <div className="alerts-list">
            {lowMargin.slice(0, 3).map((item) => (
              <button
                key={item.variantId}
                onClick={() => openVariant(item.variantId, item.productId)}
              >
                <span className="alert-icon warning">
                  <AlertTriangle size={18} />
                </span>
                <span>
                  <strong>
                    {item.label}
                  </strong>
                  <small>
                    {`Margen de ${percentage(item.currentMargin ?? null)}, por debajo del objetivo.`}
                  </small>
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
            {noSupplier > 0 && (
              <button onClick={() => navigate("products")}>
                <span className="alert-icon danger">
                  <Building2 size={18} />
                </span>
                <span>
                  <strong>
                    {noSupplier} SKU{noSupplier > 1 ? "s" : ""} sin proveedor
                    disponible
                  </strong>
                  <small>No se pueden reponer hasta asociar una oferta.</small>
                </span>
                <ChevronRight size={17} />
              </button>
            )}
            {lowMargin.length + noSupplier === 0 && (
              <div className="empty-state compact">
                <Check size={24} />
                <strong>Todo bajo control</strong>
                <p>No hay alertas operativas por ahora.</p>
              </div>
            )}
          </div>
        </section>
        <section className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <h2>Accesos rápidos</h2>
              <p>Operaciones frecuentes.</p>
            </div>
          </div>
          <button onClick={() => navigate("new-product")}>
            <span>
              <PackagePlus size={19} />
            </span>
            <div>
              <strong>Crear producto</strong>
              <small>Producto, variante y proveedor</small>
            </div>
            <ChevronRight size={17} />
          </button>
          <button onClick={() => navigate("prices")}>
            <span>
              <CircleDollarSign size={19} />
            </span>
            <div>
              <strong>Revisar precios</strong>
                <small>{summary?.pendingPricingReviews ?? lowMargin.length} pendientes</small>
            </div>
            <ChevronRight size={17} />
          </button>
          <button onClick={() => navigate("suppliers")}>
            <span>
              <Building2 size={19} />
            </span>
            <div>
              <strong>Ver proveedores</strong>
              <small>
                {data.suppliers.filter((s) => s.active).length} activos
              </small>
            </div>
            <ChevronRight size={17} />
          </button>
        </section>
      </div>
      <section className="panel recent">
        <div className="panel-heading">
          <div>
            <h2>Catálogo</h2>
            <p>Vista rápida de productos recientes.</p>
          </div>
          <button className="text-button" onClick={() => navigate("products")}>
            Ver catálogo <ArrowRight size={16} />
          </button>
        </div>
        <ProductTable
          products={data.products.slice(0, 5)}
          offers={data.offers}
          suppliers={data.suppliers}
          openProduct={openProduct}
          openVariant={openVariant}
        />
      </section>
    </>
  );
}
