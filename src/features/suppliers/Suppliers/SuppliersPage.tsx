import { FormEvent, useState } from "react";
import { Building2, ChevronRight, Plus, Search, Upload } from "lucide-react";
import { api } from "../../../api";
import type { DataState } from "../../../types";
import type { ToastKind } from "../../../app/navigation";
import { PageHeader, StatusBadge } from "../../../shared/components";
import { SupplierOfferImportPanel } from "../SupplierOfferImport/SupplierOfferImportPanel";

export function SuppliersPage({
  data,
  mutate,
  notify,
  openSupplier,
  reload,
}: {
  data: DataState;
  mutate: (fn: (d: DataState) => DataState) => void;
  notify: (m: string, k?: ToastKind) => void;
  openSupplier: (id: string) => void;
  reload: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const items = data.suppliers.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()),
  );
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const supplier = await api.createSupplier({ name, active: true });
      mutate((d) => ({ ...d, suppliers: [...d.suppliers, supplier] }));
      setName("");
      setAdding(false);
      notify("Proveedor creado correctamente.");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Abastecimiento"
        title="Proveedores"
        description={`${data.suppliers.filter((s) => s.active).length} proveedores activos`}
        actions={
          <>
            <button className="button secondary" type="button" onClick={() => setImporting(true)}>
              <Upload size={16} /> Importar ofertas
            </button>
            <button className="button primary" type="button" onClick={() => setAdding(true)}>
              <Plus size={17} /> Nuevo proveedor
            </button>
          </>
        }
      />
      {adding && (
        <form className="inline-create panel" onSubmit={save}>
          <label>
            Nombre del proveedor
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Distribuidora Norte"
              required
            />
          </label>
          <button
            type="button"
            className="button ghost"
            onClick={() => setAdding(false)}
          >
            Cancelar
          </button>
          <button className="button primary" disabled={busy}>
            Guardar
          </button>
        </form>
      )}
      {importing && <SupplierOfferImportPanel notify={notify} reload={reload} onClose={() => setImporting(false)} />}
      <section className="panel table-panel">
        <div className="filters">
          <label className="search-field">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar proveedor"
            />
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>SKU asociados</th>
                <th>Disponibles</th>
                <th>Lead time promedio</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((supplier) => {
                const offers = data.offers.filter(
                  (o) => o.supplierId === supplier.id,
                );
                const leads = offers
                  .map((o) => o.leadTimeHours)
                  .filter((v): v is number => v !== null);
                return (
                  <tr
                    key={supplier.id}
                    onClick={() => openSupplier(supplier.id)}
                  >
                    <td>
                      <div className="product-cell">
                        <span className="product-thumb supplier">
                          <Building2 size={19} />
                        </span>
                        <span>
                          <strong>{supplier.name}</strong>
                          <small>Proveedor comercial</small>
                        </span>
                      </div>
                    </td>
                    <td>{offers.length}</td>
                    <td>
                      {
                        offers.filter((o) => o.stockStatus === "AVAILABLE")
                          .length
                      }
                    </td>
                    <td>
                      {leads.length
                        ? `${Math.round(leads.reduce((a, b) => a + b, 0) / leads.length)} horas`
                        : "—"}
                    </td>
                    <td>
                      <StatusBadge
                        status={supplier.active ? "ACTIVE" : "ARCHIVED"}
                      />
                    </td>
                    <td>
                      <ChevronRight size={17} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
