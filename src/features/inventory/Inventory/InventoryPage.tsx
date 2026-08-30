import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search } from "lucide-react";
import { api } from "../../../api";
import type { InventoryRow, Page } from "../../../types";
import type { Notify } from "../../../app/navigation";
import { AsyncError, PageHeader, Pager } from "../../../shared/components";
import { emptyPage } from "../../../shared/pagination";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";

export function InventoryPage({ notify: _notify, openVariant }: { notify: Notify; openVariant: (id: string, productId?: string) => void }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [page, setPage] = useState(1);
  const resultQuery = useQuery<Page<InventoryRow>>({
    queryKey: ["inventory", { q: debouncedQuery, page }],
    queryFn: () => api.inventory({ q: debouncedQuery, page, perPage: 24 }),
    placeholderData: (previous) => previous,
  });
  const result = resultQuery.data || emptyPage<InventoryRow>();

  return <><PageHeader eyebrow="Operaciones" title="Inventario" description="Existencia, reservas y disponibilidad por SKU." /><section className="panel table-panel"><div className="filters"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar producto o SKU" /></label></div>{resultQuery.error ? <AsyncError message={resultQuery.error.message} /> : resultQuery.isPending ? <div className="loading-row">Cargando inventario…</div> : result.items.length === 0 ? <div className="empty-state compact"><Search size={24} /><strong>Sin resultados</strong><p>Probá con otro producto o SKU.</p></div> : <div className="table-wrap"><table><thead><tr><th>Producto</th><th>SKU</th><th>Existencia</th><th>Reservado</th><th>Disponible</th><th /></tr></thead><tbody>{result.items.map((row) => <tr key={row.variantId} tabIndex={0} onClick={() => openVariant(row.variantId, row.productId)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openVariant(row.variantId, row.productId); }}><td><strong>{row.productName}</strong><br /><small>{row.presentation || "Sin presentación"}</small></td><td className="mono">{row.sku || "—"}</td><td>{row.onHand}</td><td>{row.reserved}</td><td className="strong-cell">{row.available}</td><td><ChevronRight size={17} /></td></tr>)}</tbody></table></div>}<Pager page={result.meta.page} pages={result.meta.totalPages} onChange={setPage} /></section></>;
}
