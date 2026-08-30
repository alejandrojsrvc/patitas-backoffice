import { FormEvent, useState } from "react";
import { Building2, MoreHorizontal, Plus, X } from "lucide-react";
import { api } from "../../../api";
import type { DataState, Offer, Supplier } from "../../../types";
import type { ToastKind, View } from "../../../app/navigation";
import { Field, Info, PageHeader, StatusBadge, StockBadge } from "../../../shared/components";
import { money } from "../../../shared/formatters";
import { formatPresentation } from "../../catalog/utils";

export function SupplierDetailPage({
  supplier,
  data,
  navigate,
  openVariant,
  mutate,
  notify,
}: {
  supplier: Supplier;
  data: DataState;
  navigate: (view: View) => void;
  openVariant: (id: string, productId?: string) => void;
  mutate: (fn: (d: DataState) => DataState) => void;
  notify: (m: string, k?: ToastKind) => void;
}) {
  const offers = data.offers.filter((o) => o.supplierId === supplier.id);
  const [editing, setEditing] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [addingOffer, setAddingOffer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: supplier.name,
    active: supplier.active,
  });
  const [offerForm, setOfferForm] = useState({
    variantId: "",
    supplierSku: "",
    unitCost: "",
    stockStatus: "AVAILABLE" as Offer["stockStatus"],
    leadTimeHours: "",
    minimumQuantity: "1",
  });
  const variantContext = (id: string) => {
    for (const product of data.products) {
      const variant = product.variants.find((v) => v.id === id);
      if (variant) return { product, variant };
    }
    return null;
  };
  const startOffer = (offer?: Offer) => {
    setEditingOffer(offer || null);
    setAddingOffer(true);
    setOfferForm(
      offer
        ? {
            variantId: offer.variantId,
            supplierSku: offer.supplierSku || "",
            unitCost: offer.unitCost,
            stockStatus: offer.stockStatus,
            leadTimeHours: offer.leadTimeHours?.toString() || "",
            minimumQuantity: offer.minimumQuantity.toString(),
          }
        : {
            variantId: "",
            supplierSku: "",
            unitCost: "",
            stockStatus: "AVAILABLE",
            leadTimeHours: "",
            minimumQuantity: "1",
          },
    );
  };
  const saveSupplier = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const updated = await api.updateSupplier(supplier.id, supplierForm);
      mutate((current) => ({
        ...current,
        suppliers: current.suppliers.map((item) =>
          item.id === supplier.id ? updated : item,
        ),
      }));
      setEditing(false);
      notify("Proveedor actualizado.");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const saveOffer = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const common = {
        supplierSku: offerForm.supplierSku || null,
        unitCost: offerForm.unitCost,
        stockStatus: offerForm.stockStatus,
        leadTimeHours: offerForm.leadTimeHours
          ? Number(offerForm.leadTimeHours)
          : null,
        minimumQuantity: Number(offerForm.minimumQuantity || 1),
      };
      const saved = editingOffer
        ? await api.updateOffer(editingOffer.id, common)
        : await api.createOffer({
            supplierId: supplier.id,
            variantId: offerForm.variantId,
            ...common,
          });
      mutate((current) => ({
        ...current,
        offers: editingOffer
          ? current.offers.map((item) => (item.id === saved.id ? saved : item))
          : [...current.offers, saved],
      }));
      setAddingOffer(false);
      setEditingOffer(null);
      notify(
        editingOffer ? "Oferta actualizada." : "SKU asociado al proveedor.",
      );
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Proveedor"
        title={supplier.name}
        description="Condiciones comerciales y productos asociados."
        back={() => navigate("suppliers")}
        actions={
          <>
            <StatusBadge status={supplier.active ? "ACTIVE" : "ARCHIVED"} />
            <button
              className="button secondary"
              onClick={() => setEditing(!editing)}
            >
              Editar proveedor
            </button>
          </>
        }
      />
      {editing && (
        <form className="panel edit-panel" onSubmit={saveSupplier}>
          <div className="panel-heading">
            <div>
              <h2>Editar proveedor</h2>
              <p>Nombre y disponibilidad comercial.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setEditing(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="form-grid edit-grid">
            <Field label="Nombre">
              <input
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, name: e.target.value })
                }
                required
              />
            </Field>
            <label className="check-field form-check">
              <input
                type="checkbox"
                checked={supplierForm.active}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, active: e.target.checked })
                }
              />{" "}
              Proveedor activo
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button ghost"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
            <button className="button primary" disabled={busy}>
              Guardar proveedor
            </button>
          </div>
        </form>
      )}
      {addingOffer && (
        <form className="panel edit-panel" onSubmit={saveOffer}>
          <div className="panel-heading">
            <div>
              <h2>{editingOffer ? "Editar oferta" : "Asociar SKU"}</h2>
              <p>Condiciones de compra para este proveedor.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setAddingOffer(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="form-grid edit-grid">
            <Field label="Producto y variante">
              <select
                disabled={Boolean(editingOffer)}
                value={offerForm.variantId}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, variantId: e.target.value })
                }
                required
              >
                <option value="">Seleccionar SKU</option>
                {data.products.flatMap((product) =>
                  product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {product.name} ·{" "}
                      {formatPresentation(
                        variant.presentation,
                        variant.weightGrams,
                      )}{" "}
                      · {variant.sku || "sin SKU"}
                    </option>
                  )),
                )}
              </select>
            </Field>
            <Field label="SKU del proveedor">
              <input
                value={offerForm.supplierSku}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, supplierSku: e.target.value })
                }
              />
            </Field>
            <Field label="Costo unitario">
              <input
                inputMode="decimal"
                value={offerForm.unitCost}
                onChange={(e) =>
                  setOfferForm({
                    ...offerForm,
                    unitCost: e.target.value.replace(/[^\d.]/g, ""),
                  })
                }
                required
              />
            </Field>
            <Field label="Disponibilidad">
              <select
                value={offerForm.stockStatus}
                onChange={(e) =>
                  setOfferForm({
                    ...offerForm,
                    stockStatus: e.target.value as Offer["stockStatus"],
                  })
                }
              >
                <option value="AVAILABLE">Disponible</option>
                <option value="ON_REQUEST">A pedido</option>
                <option value="OUT_OF_STOCK">Sin stock</option>
                <option value="UNKNOWN">Desconocido</option>
              </select>
            </Field>
            <Field label="Lead time en horas">
              <input
                inputMode="numeric"
                value={offerForm.leadTimeHours}
                onChange={(e) =>
                  setOfferForm({
                    ...offerForm,
                    leadTimeHours: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </Field>
            <Field label="Cantidad mínima">
              <input
                inputMode="numeric"
                value={offerForm.minimumQuantity}
                onChange={(e) =>
                  setOfferForm({
                    ...offerForm,
                    minimumQuantity: e.target.value.replace(/\D/g, ""),
                  })
                }
                required
              />
            </Field>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button ghost"
              onClick={() => setAddingOffer(false)}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={
                busy ||
                !offerForm.unitCost ||
                (!offerForm.variantId && !editingOffer)
              }
            >
              {busy ? "Guardando…" : "Guardar oferta"}
            </button>
          </div>
        </form>
      )}
      <div className="supplier-facts">
        <Info label="Ofertas registradas" value={offers.length} />
        <Info
          label="Ofertas disponibles"
          value={
            offers.filter((item) => item.stockStatus === "AVAILABLE").length
          }
        />
        <Info
          label="Pedido mínimo"
          value={
            offers.length
              ? `${Math.min(...offers.map((o) => o.minimumQuantity))} unidad`
              : "—"
          }
        />
        <Info label="Estado" value={supplier.active ? "Activo" : "Inactivo"} />
      </div>
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h2>Productos asociados</h2>
            <p>{offers.length} ofertas activas o registradas.</p>
          </div>
          <button className="button primary" onClick={() => startOffer()}>
            <Plus size={16} /> Asociar SKU
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Costo</th>
                <th>Disponible</th>
                <th>Lead time</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => {
                const ctx = variantContext(offer.variantId);
                if (!ctx) return null;
                return (
                  <tr
                    key={offer.id}
                    onClick={() => openVariant(ctx.variant.id, ctx.product.id)}
                  >
                    <td className="mono">{ctx.variant.sku}</td>
                    <td>
                      <strong>{ctx.product.name}</strong>
                      <br />
                      <small>
                        {formatPresentation(
                          ctx.variant.presentation,
                          ctx.variant.weightGrams,
                        )}
                      </small>
                    </td>
                    <td className="strong-cell">{money(offer.unitCost)}</td>
                    <td>
                      <StockBadge status={offer.stockStatus} />
                    </td>
                    <td>
                      {offer.leadTimeHours != null
                        ? `${offer.leadTimeHours}h`
                        : "—"}
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        title="Editar oferta"
                        onClick={(event) => {
                          event.stopPropagation();
                          startOffer(offer);
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!offers.length && (
          <div className="empty-state compact">
            <Building2 size={27} />
            <strong>Sin productos asociados</strong>
            <p>Creá la primera oferta para este proveedor.</p>
            <button className="button primary" onClick={() => startOffer()}>
              <Plus size={15} /> Asociar SKU
            </button>
          </div>
        )}
      </section>
    </>
  );
}
