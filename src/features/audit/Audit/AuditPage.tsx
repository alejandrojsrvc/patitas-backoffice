import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "../../../api";
import type { AuditLog, Page } from "../../../types";
import { AsyncError, OperationBadge, PageHeader, Pager } from "../../../shared/components";
import { dateTime } from "../../../shared/formatters";
import { emptyPage } from "../../../shared/pagination";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";

export function AuditPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [page, setPage] = useState(1);
  const resultQuery = useQuery<Page<AuditLog>>({
    queryKey: ["audit", { q: debouncedQuery, page }],
    queryFn: () => api.auditLogs({ q: debouncedQuery, page, perPage: 24 }),
    placeholderData: (previous) => previous,
  });
  const result = resultQuery.data || emptyPage<AuditLog>();

  return <><PageHeader eyebrow="Configuración" title="Auditoría administrativa" description="Actividad de los operadores sobre el backoffice." /><section className="panel table-panel"><div className="filters"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Acción, recurso o actor" /></label></div>{resultQuery.error ? <AsyncError message={resultQuery.error.message} /> : resultQuery.isPending ? <div className="loading-row">Cargando auditoría…</div> : result.items.length === 0 ? <div className="empty-state compact"><Search size={24} /><strong>Sin actividad</strong><p>No hay registros para esos filtros.</p></div> : <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Método</th><th>Acción</th><th>Resultado</th><th>Actor</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.id}><td>{dateTime(item.createdAt)}</td><td className="mono">{item.method}</td><td>{item.action}<br /><small>{item.path}</small></td><td><OperationBadge value={String(item.statusCode || "—")} tone={item.statusCode && item.statusCode >= 400 ? "danger" : "success"} /></td><td className="mono">{item.actorUserId?.slice(0, 8) || "Sistema"}</td></tr>)}</tbody></table></div>}<Pager page={result.meta.page} pages={result.meta.totalPages} onChange={setPage} /></section></>;
}
