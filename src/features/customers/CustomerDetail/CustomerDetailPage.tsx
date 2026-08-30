import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "../../../api";
import type { Customer, Order, Page } from "../../../types";
import type { Notify } from "../../../app/navigation";
import { AsyncError, Field, OperationBadge, PageHeader } from "../../../shared/components";
import { emptyPage } from "../../../shared/pagination";
import { OrdersTable } from "../../orders/OrdersTable";

export function CustomerDetailPage({ id, notify, back, openOrder }: { id: string; notify: Notify; back: () => void; openOrder: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const detailQuery = useQuery<{ customer: Customer; orders: Page<Order> }>({
    queryKey: ["customer", id],
    queryFn: async () => {
      const [customer, orders] = await Promise.all([api.customer(id), api.orders({ customerId: id, page: 1, perPage: 24 })]);
      return { customer, orders };
    },
  });
  const customer = detailQuery.data?.customer || null;
  const orders = detailQuery.data?.orders || emptyPage<Order>();

  if (detailQuery.error) return <><button type="button" className="back-button" onClick={back}><ArrowLeft /></button><AsyncError message={detailQuery.error.message} /></>;
  if (detailQuery.isPending || !customer) return <div className="loading-row">Cargando cliente…</div>;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api.updateCustomer(id, { fullName: String(form.get("fullName")), email: String(form.get("email")), phone: String(form.get("phone")) || null, active: form.get("active") === "on" });
      setEditing(false);
      await detailQuery.refetch();
      notify("Cliente actualizado.");
    } catch (cause) {
      notify((cause as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return <><PageHeader eyebrow="Cliente" title={customer.fullName} description={customer.email} back={back} actions={<><OperationBadge value={customer.active ? "Activo" : "Inactivo"} tone={customer.active ? "success" : "neutral"} /><button type="button" className="button secondary" onClick={() => setEditing(!editing)}>Editar cliente</button></>} />
    {editing && <form className="panel edit-panel" onSubmit={save}><div className="form-grid edit-grid"><Field label="Nombre"><input name="fullName" defaultValue={customer.fullName} required /></Field><Field label="Email"><input name="email" type="email" defaultValue={customer.email} required /></Field><Field label="Teléfono"><input name="phone" defaultValue={customer.phone || ""} /></Field><label className="check-field form-check"><input name="active" type="checkbox" defaultChecked={customer.active} /> Cliente activo</label></div><div className="form-actions"><button type="button" className="button ghost" onClick={() => setEditing(false)}>Cancelar</button><button className="button primary" disabled={busy}>Guardar cambios</button></div></form>}
    <section className="panel table-panel"><div className="panel-heading"><div><h2>Pedidos</h2><p>{orders.meta.total} pedidos asociados.</p></div></div><OrdersTable orders={orders.items} openOrder={openOrder} /></section>
  </>;
}
