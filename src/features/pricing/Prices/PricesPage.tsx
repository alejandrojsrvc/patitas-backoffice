import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Package } from "lucide-react";
import { api } from "../../../api";
import type { DataState, Page, PricingReviewListItem } from "../../../types";
import type { ToastKind } from "../../../app/navigation";
import { CATALOG_QUERY_KEY } from "../../../app/AppProviders";
import { AsyncError, PageHeader, Pager } from "../../../shared/components";
import { money, percentage } from "../../../shared/formatters";
import { emptyPage } from "../../../shared/pagination";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";

export function PricesPage({ data, mutate, notify, openVariant }: { data: DataState; mutate: (fn: (d: DataState) => DataState) => void; notify: (m: string, k?: ToastKind) => void; openVariant: (id: string, productId?: string) => void }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const reviewsQuery = useQuery<Page<PricingReviewListItem>>({
    queryKey: ["pricing-reviews", { status: "PENDING", q: debouncedQuery, page }],
    queryFn: () => api.allReviews({ status: "PENDING", q: debouncedQuery || undefined, page, perPage: 24 }),
    placeholderData: (previous) => previous,
  });
  const applyMutation = useMutation({
    mutationFn: ({ variantId, reviewId }: { variantId: string; reviewId: string }) => api.applyPrice(variantId, reviewId, false),
    onSuccess: async (review) => {
      await queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["pricing-reviews"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      notify(`Nuevo precio aplicado: ${money(review.commercialPrice)}.`);
    },
    onError: (error) => notify((error as Error).message, "error"),
  });
  const result = reviewsQuery.data || emptyPage<PricingReviewListItem>();
  const fallback = (review: PricingReviewListItem) => {
    const catalogProduct = data.products.find((item) => item.variants.some((variant) => variant.id === review.variantId));
    const product = catalogProduct || review.product;
    const variant = review.variant || catalogProduct?.variants.find((item) => item.id === review.variantId);
    return { product, variant };
  };

  return <><PageHeader eyebrow="Rentabilidad" title="Precios a revisar" description="Cambios sugeridos según costos y margen objetivo." /><section className="panel table-panel"><div className="panel-heading pricing-heading"><div><h2>{result.meta.total} ajustes pendientes</h2><p>Revisá cada recomendación antes de aplicarla.</p></div><span className="rule-version">Margen objetivo {data.rules.active?.targetMarginPercent || "—"}%</span></div><div className="filters"><label className="search-field"><Package size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Producto o SKU" /></label></div>{reviewsQuery.error ? <AsyncError message={reviewsQuery.error.message} /> : reviewsQuery.isPending ? <div className="loading-row">Cargando revisiones…</div> : result.items.length === 0 ? <div className="empty-state"><Check size={30} /><strong>Todos los precios están al día</strong><p>No hay diferencias relevantes para revisar.</p></div> : <div className="table-wrap"><table><thead><tr><th>Producto</th><th>Actual</th><th>Recomendado</th><th>Variación</th><th>Margen actual</th><th /></tr></thead><tbody>{result.items.map((review) => { const { product, variant } = fallback(review); const current = Number(variant?.salePrice || 0); const commercial = Number(review.commercialPrice); const diff = current ? ((commercial - current) / current) * 100 : null; const margin = review.currentMarginPercent == null ? null : Number(review.currentMarginPercent); return <tr key={review.id}><td onClick={() => openVariant(review.variantId, product?.id)}><div className="product-cell"><span className="product-thumb"><Package size={19} /></span><span><strong>{product?.name || "Producto sin cargar"} · {variant?.presentation || "SKU"}</strong><small>{variant?.sku || review.variantId}</small></span></div></td><td>{money(variant?.salePrice)}</td><td className="strong-cell recommended">{money(review.commercialPrice)}</td><td><span className="delta">{diff == null ? "Nuevo" : `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`}</span></td><td className={margin !== null && margin < Number(data.rules.active?.targetMarginPercent || 25) ? "danger-text" : ""}>{percentage(margin)} {margin !== null && margin < Number(data.rules.active?.targetMarginPercent || 25) && <AlertTriangle size={14} />}</td><td><button type="button" className="button small secondary" disabled={applyMutation.isPending} onClick={() => applyMutation.mutate({ variantId: review.variantId, reviewId: review.id })}>{applyMutation.isPending ? "Aplicando…" : "Aplicar recomendado"}</button></td></tr>; })}</tbody></table></div>}<Pager page={result.meta.page} pages={result.meta.totalPages} onChange={setPage} /></section></>;
}
