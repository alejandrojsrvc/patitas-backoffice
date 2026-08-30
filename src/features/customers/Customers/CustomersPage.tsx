import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Plus, Search } from "lucide-react";
import { api } from "../../../api";
import type { Customer, Page } from "../../../types";
import type { Notify } from "../../../app/navigation";
import { AsyncError, Field, OperationBadge, PageHeader, Pager, Select } from "../../../shared/components";
import { emptyPage } from "../../../shared/pagination";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";

export function CustomersPage({ notify, openCustomer }: { notify: Notify; openCustomer: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [active, setActive] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const resultQuery = useQuery<Page<Customer>>({
    queryKey: ["customers", { q: debouncedQuery, active, page }],
    queryFn: () => api.customers({ q: debouncedQuery, active: active === "" ? undefined : active === "true", page, perPage: 24 }),
    placeholderData: (previous) => previous,
  });
  const result = resultQuery.data || emptyPage<Customer>();

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.createCustomer({ ...form, phone: form.phone || null, active: true });
      setAdding(false);
      setForm({ fullName: "", email: "", phone: "" });
      await resultQuery.refetch();
      notify("Cliente creado correctamente.");
    } catch (cause) {
      notify((cause as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Relaciones" title="Clientes" description={`${result.meta.total} clientes registrados`} actions={<button type="button" className="button primary" onClick={() => setAdding(true)}><Plus size={16} /> Nuevo cliente</button>} />
      {adding && <form className="panel edit-panel" onSubmit={save}><div className="panel-heading"><h2>Nuevo cliente</h2></div><div className="form-grid edit-grid"><Field label="Nombre completo"><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></Field><Field label="Email"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field><Field label="Teléfono"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field></div><div className="form-actions"><button type="button" className="button ghost" onClick={() => setAdding(false)}>Cancelar</button><button className="button primary" disabled={busy}>Guardar cliente</button></div></form>}
      <section className="panel table-panel"><div className="filters"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Nombre, email o teléfono" /></label><Select value={active} onChange={(value) => { setActive(value); setPage(1); }} options={[["", "Todos los estados"], ["true", "Activos"], ["false", "Inactivos"]]} /></div>{resultQuery.error ? <AsyncError message={resultQuery.error.message} /> : resultQuery.isPending ? <div className="loading-row">Cargando clientes…</div> : result.items.length === 0 ? <div className="empty-state compact"><Search size={24} /><strong>Sin clientes</strong><p>Probá cambiando los filtros.</p></div> : <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Email</th><th>Teléfono</th><th>Estado</th><th /></tr></thead><tbody>{result.items.map((customer) => <tr key={customer.id} tabIndex={0} onClick={() => openCustomer(customer.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openCustomer(customer.id); }}><td><strong>{customer.fullName}</strong></td><td>{customer.email}</td><td>{customer.phone || "—"}</td><td><OperationBadge value={customer.active ? "Activo" : "Inactivo"} tone={customer.active ? "success" : "neutral"} /></td><td><ChevronRight size={17} /></td></tr>)}</tbody></table></div>}<Pager page={result.meta.page} pages={result.meta.totalPages} onChange={setPage} /></section>
    </>
  );
}
