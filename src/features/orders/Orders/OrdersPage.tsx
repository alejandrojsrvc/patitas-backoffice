import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { api } from "../../../api";
import type { Order, OrderStatus, Page, PaymentStatus } from "../../../types";
import { AsyncError, PageHeader, Pager, Select } from "../../../shared/components";
import { emptyPage } from "../../../shared/pagination";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import { orderLabel, transitions } from "../constants";
import { OrdersTable } from "../OrdersTable";

export function OrdersPage({ openOrder, newOrder }: { openOrder: (id: string) => void; newOrder: () => void }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);
  const resultQuery = useQuery<Page<Order>>({
    queryKey: ["orders", { q: debouncedQuery, status, paymentStatus, page }],
    queryFn: () => api.orders({ q: debouncedQuery, status: (status || undefined) as OrderStatus | undefined, paymentStatus: (paymentStatus || undefined) as PaymentStatus | undefined, page, perPage: 24 }),
    placeholderData: (previous) => previous,
  });
  const result = resultQuery.data || emptyPage<Order>();
  const statusOptions = Object.keys(transitions).map((value) => [value, orderLabel[value]]);
  const paymentOptions = ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"].map((value) => [value, orderLabel[value] || value]);

  return (
    <>
      <PageHeader eyebrow="Ventas" title="Pedidos" description={`${result.meta.total} pedidos`} actions={<button type="button" className="button primary" onClick={newOrder}><Plus size={16} /> Nuevo pedido</button>} />
      <section className="panel table-panel"><div className="filters"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Pedido, nombre o email" /></label><Select value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[["", "Todos los estados"], ...statusOptions]} /><Select value={paymentStatus} onChange={(value) => { setPaymentStatus(value); setPage(1); }} options={[["", "Todos los pagos"], ...paymentOptions]} /></div>{resultQuery.error ? <AsyncError message={resultQuery.error.message} /> : resultQuery.isPending ? <div className="loading-row">Cargando pedidos…</div> : <OrdersTable orders={result.items} openOrder={openOrder} />}<Pager page={result.meta.page} pages={result.meta.totalPages} onChange={setPage} /></section>
    </>
  );
}
