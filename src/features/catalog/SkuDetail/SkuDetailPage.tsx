import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, Boxes, Building2, Check, CircleDollarSign, Clock3, Plus, RefreshCw, Tags, X } from "lucide-react";
import { api } from "../../../api";
import type { DataState, InventoryMovement, Offer, PricingBreakdown, PricingReview, PricingScenario, Variant } from "../../../types";
import type { ToastKind, View } from "../../../app/navigation";
import { ConfirmDialog, CostRow, Field, FulfillmentBadge, Info, PageHeader, StatusBadge, SummaryItem, stockLabel } from "../../../shared/components";
import { money, percentage } from "../../../shared/formatters";
import { formatPresentation, fulfillmentStatus } from "../utils";
import { getWinningOffer } from "../../pricing/calculations";

export function SkuDetailPage({
  variant,
  data,
  navigate,
  openVariant,
  mutate,
  notify,
}: {
  variant: Variant;
  data: DataState;
  navigate: (view: View) => void;
  openVariant: (id: string, productId?: string) => void;
  mutate: (fn: (d: DataState) => DataState) => void;
  notify: (m: string, k?: ToastKind) => void;
}) {
  const product = data.products.find((p) => p.id === variant.productId)!;
  const queryClient = useQueryClient();
  const variantOffers = data.offers
    .filter((o) => o.variantId === variant.id)
    .sort((a, b) => Number(a.unitCost) - Number(b.unitCost));
  const [offerId, setOfferId] = useState(
    getWinningOffer(variant, data.offers)?.id || "",
  );
  const [calculation, setCalculation] = useState<{
    recommendedPrice: string;
    commercialPrice: string;
    breakdown: PricingBreakdown;
  } | null>(null);
  const [review, setReview] = useState<PricingReview | null>(null);
  const [scenarioId, setScenarioId] = useState("__auto__");
  const [activationConfirm, setActivationConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingVariant, setEditingVariant] = useState(false);
  const [editingInventory, setEditingInventory] = useState(false);
  const [offerMode, setOfferMode] = useState<"new" | "edit" | null>(null);
  const [variantForm, setVariantForm] = useState({
    sku: variant.sku || "",
    barcode: variant.barcode || "",
    presentation: variant.presentation || "",
    weightGrams: variant.weightGrams?.toString() || "",
    compareAtPrice: variant.compareAtPrice || "",
    active: variant.active,
    preferredSupplierOfferId: variant.preferredSupplierOfferId || "",
  });
  const [offerForm, setOfferForm] = useState({
    supplierId: "",
    supplierSku: "",
    unitCost: "",
    stockStatus: "AVAILABLE" as Offer["stockStatus"],
    leadTimeHours: "",
    minimumQuantity: "1",
  });
  const [inventoryForm, setInventoryForm] = useState({
    quantityDelta: "",
    reason: "",
  });
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movementsError, setMovementsError] = useState("");
  const selectedOffer = variantOffers.find((o) => o.id === offerId);
  const winningOffer = getWinningOffer(variant, data.offers);
  const supplier = data.suppliers.find(
    (s) => s.id === selectedOffer?.supplierId,
  );
  const scenariosQuery = useQuery<PricingScenario[]>({
    queryKey: ["pricing", "scenarios"],
    queryFn: api.pricingScenarios,
  });
  const reviewsQuery = useQuery<PricingReview[]>({
    queryKey: ["pricing", "reviews", variant.id],
    queryFn: () => api.reviews(variant.id),
  });
  const scenarios = scenariosQuery.data || [];
  const effectiveScenarioId = scenarioId === "__auto__"
    ? scenarios[0]?.id
    : scenarioId === "__none__" ? undefined : scenarioId;
  useEffect(() => {
    if (scenarioId === "__auto__" && scenariosQuery.data) {
      setScenarioId(scenariosQuery.data[0]?.id || "__none__");
    }
  }, [scenarioId, scenariosQuery.data]);
  useEffect(() => {
    if (!review && reviewsQuery.data) {
      setReview(reviewsQuery.data.find((item) => item.status === "PENDING") || null);
    }
  }, [review, reviewsQuery.data]);
  const replaceVariant = (updated: Variant) =>
    mutate((current) => ({
      ...current,
      products: current.products.map((item) => ({
        ...item,
        variants: item.variants.map((candidate) =>
          candidate.id === variant.id ? updated : candidate,
        ),
      })),
    }));
  const saveVariant = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        sku: variantForm.sku || null,
        barcode: variantForm.barcode || null,
        presentation: variantForm.presentation || null,
        weightGrams: variantForm.weightGrams
          ? Number(variantForm.weightGrams)
          : null,
        compareAtPrice: variantForm.compareAtPrice || null,
        active: variantForm.active,
        preferredSupplierOfferId: variantForm.preferredSupplierOfferId || null,
      };
      const updated = await api.updateVariant(variant.id, payload);
      replaceVariant(updated);
      setEditingVariant(false);
      notify("Variante actualizada correctamente.");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const loadMovements = async () => {
    try {
      setMovementsError("");
      setMovements(await api.inventoryMovements(variant.id));
    } catch (error) {
      setMovementsError((error as Error).message);
    }
  };
  useEffect(() => {
    void loadMovements();
  }, [variant.id]);
  const saveInventory = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const quantityDelta = Number(inventoryForm.quantityDelta);
      const saved = await api.adjustInventory(variant.id, {
        quantityDelta,
        reason: inventoryForm.reason,
      });
      replaceVariant({
        ...variant,
        onHand: saved.onHand,
        reserved: saved.reserved,
        availableQuantity: saved.available,
      });
      setInventoryForm({ quantityDelta: "", reason: "" });
      setEditingInventory(false);
      await loadMovements();
      notify(`Ajuste registrado: ${saved.available} unidades disponibles.`);
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const beginOffer = (mode: "new" | "edit") => {
    if (mode === "edit" && selectedOffer)
      setOfferForm({
        supplierId: selectedOffer.supplierId,
        supplierSku: selectedOffer.supplierSku || "",
        unitCost: selectedOffer.unitCost,
        stockStatus: selectedOffer.stockStatus,
        leadTimeHours: selectedOffer.leadTimeHours?.toString() || "",
        minimumQuantity: selectedOffer.minimumQuantity.toString(),
      });
    else
      setOfferForm({
        supplierId: "",
        supplierSku: "",
        unitCost: "",
        stockStatus: "AVAILABLE",
        leadTimeHours: "",
        minimumQuantity: "1",
      });
    setOfferMode(mode);
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
      let saved: Offer;
      if (offerMode === "edit" && selectedOffer)
        saved = await api.updateOffer(selectedOffer.id, common);
      else
        saved = await api.createOffer({
          supplierId: offerForm.supplierId,
          variantId: variant.id,
          ...common,
        });
      mutate((current) => ({
        ...current,
        offers:
          offerMode === "edit"
            ? current.offers.map((item) =>
                item.id === saved.id ? saved : item,
              )
            : [...current.offers, saved],
      }));
      setOfferId(saved.id);
      setOfferMode(null);
      setCalculation(null);
      setReview(null);
      notify(
        offerMode === "edit"
          ? "Oferta actualizada."
          : "Oferta asociada al SKU.",
      );
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const recalculate = async () => {
    setBusy(true);
    try {
      setCalculation((await api.calculate(variant.id, offerId || undefined, effectiveScenarioId)).calculation);
      notify("Vista previa calculada con la oferta y escenario seleccionados.");
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const saveReview = async () => {
    if (!calculation) return;
    setBusy(true);
    try {
      const saved = await api.recalculate(variant.id, {
        ...(offerId ? { supplierOfferId: offerId } : {}),
        ...(effectiveScenarioId ? { scenarioId: effectiveScenarioId } : {}),
      });
      setReview(saved);
      await reviewsQuery.refetch();
      notify("Revisión guardada. Ahora podés aplicar el precio.");
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const apply = async (activateProduct = false) => {
    if (!review) return;
    setBusy(true);
    try {
      const applied = await api.applyPrice(variant.id, review.id, activateProduct);
      mutate((current) => ({
        ...current,
        products: current.products.map((p) => ({
          ...p,
          status: activateProduct && p.id === product.id ? "ACTIVE" : p.status,
          variants: p.variants.map((v) => v.id === variant.id ? { ...v, salePrice: applied.commercialPrice } : v),
        })),
      }));
      await queryClient.invalidateQueries({ queryKey: ["catalog", "product", product.id] });
      await queryClient.invalidateQueries({ queryKey: ["backoffice", "catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setReview({ ...review, ...applied });
      setActivationConfirm(false);
      notify(activateProduct ? `Precio aplicado y producto activado: ${money(applied.commercialPrice)}.` : `Precio aplicado: ${money(applied.commercialPrice)}.`);
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow={`${product.name} · ${product.brand.name}`}
        title={formatPresentation(variant.presentation, variant.weightGrams)}
        description={`SKU ${variant.sku || "sin código"}`}
        back={() => navigate("product")}
        actions={
          <>
            <StatusBadge status={variant.active ? "ACTIVE" : "DRAFT"} />
            <button
              className="button secondary"
              onClick={() => setEditingInventory(!editingInventory)}
            >
              <Boxes size={16} /> Inventario
            </button>
            <button
              className="button secondary"
              onClick={() => setEditingVariant(!editingVariant)}
            >
              Editar SKU
            </button>
          </>
        }
      />
      <section
        className="panel variant-switcher"
        aria-label="Navegar entre variantes"
      >
        <div className="variant-switcher-copy">
          <span className="eyebrow">Producto</span>
          <strong>{product.name}</strong>
          <small>
            {product.variants.length}{" "}
            {product.variants.length === 1 ? "presentación" : "presentaciones"}
          </small>
        </div>
        <div className="variant-switcher-list">
          {product.variants.map((item, index) => (
            <button
              type="button"
              className={item.id === variant.id ? "selected" : ""}
              key={item.id}
              onClick={() => openVariant(item.id, product.id)}
              aria-current={item.id === variant.id ? "page" : undefined}
            >
              <span>{index + 1}</span>
              <strong>
                {formatPresentation(item.presentation, item.weightGrams)}
              </strong>
              <small>{item.sku || "Sin SKU"}</small>
            </button>
          ))}
        </div>
      </section>
      {editingVariant && (
        <form className="panel edit-panel" onSubmit={saveVariant}>
          <div className="panel-heading">
            <div>
              <h2>Editar variante</h2>
              <p>
                Identificación, código universal, presentación y disponibilidad.
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setEditingVariant(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="form-grid edit-grid">
            <Field label="SKU interno">
              <input
                className="mono-input"
                value={variantForm.sku}
                onChange={(e) =>
                  setVariantForm({ ...variantForm, sku: e.target.value })
                }
              />
            </Field>
            <Field label="EAN / GTIN">
              <input
                inputMode="numeric"
                value={variantForm.barcode}
                onChange={(e) =>
                  setVariantForm({
                    ...variantForm,
                    barcode: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="Opcional"
              />
            </Field>
            <Field label="Presentación">
              <input
                value={variantForm.presentation}
                onChange={(e) =>
                  setVariantForm({
                    ...variantForm,
                    presentation: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Peso en gramos">
              <input
                inputMode="numeric"
                value={variantForm.weightGrams}
                onChange={(e) =>
                  setVariantForm({
                    ...variantForm,
                    weightGrams: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </Field>
            <Field label="Precio de comparación">
              <input
                inputMode="decimal"
                value={variantForm.compareAtPrice}
                onChange={(e) =>
                  setVariantForm({
                    ...variantForm,
                    compareAtPrice: e.target.value,
                  })
                }
                placeholder="Opcional"
              />
            </Field>
            <Field label="Oferta preferida">
              <select
                value={variantForm.preferredSupplierOfferId}
                onChange={(e) =>
                  setVariantForm({
                    ...variantForm,
                    preferredSupplierOfferId: e.target.value,
                  })
                }
              >
                <option value="">Selección automática</option>
                {variantOffers.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {
                      data.suppliers.find(
                        (item) => item.id === offer.supplierId,
                      )?.name
                    }{" "}
                    · {money(offer.unitCost)}
                  </option>
                ))}
              </select>
            </Field>
            <label className="check-field form-check">
              <input
                type="checkbox"
                checked={variantForm.active}
                onChange={(e) =>
                  setVariantForm({ ...variantForm, active: e.target.checked })
                }
              />{" "}
              SKU activo
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button ghost"
              onClick={() => setEditingVariant(false)}
            >
              Cancelar
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? "Guardando…" : "Guardar variante"}
            </button>
          </div>
        </form>
      )}
      {editingInventory && (
        <form className="panel edit-panel" onSubmit={saveInventory}>
          <div className="panel-heading">
            <div>
              <h2>Ajustar inventario</h2>
              <p>
                Sumá o descontá existencia física. Las reservas se administran
                desde los pedidos.
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setEditingInventory(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="form-grid edit-grid">
            <Field label="Ajuste de unidades">
              <input
                autoFocus
                type="number"
                value={inventoryForm.quantityDelta}
                onChange={(event) =>
                  setInventoryForm({
                    ...inventoryForm,
                    quantityDelta: event.target.value,
                  })
                }
                placeholder="Ej. 10 o -2"
                required
              />
            </Field>
            <Field label="Motivo">
              <input
                value={inventoryForm.reason}
                onChange={(event) =>
                  setInventoryForm({
                    ...inventoryForm,
                    reason: event.target.value,
                  })
                }
                placeholder="Recepción, rotura, corrección…"
                required
              />
            </Field>
          </div>
          <div className="inventory-readonly">
            <Info label="Existencia actual" value={variant.onHand ?? "—"} />
            <Info label="Reservadas" value={variant.reserved ?? "—"} />
            <Info
              label="Disponibles"
              value={variant.availableQuantity ?? "—"}
            />
          </div>
          <div className="form-actions end">
            <button
              className="button primary"
              disabled={
                busy ||
                !inventoryForm.quantityDelta ||
                !inventoryForm.reason.trim()
              }
            >
              {busy ? "Registrando…" : "Registrar ajuste"}
            </button>
          </div>
        </form>
      )}
      {offerMode && (
        <form className="panel edit-panel" onSubmit={saveOffer}>
          <div className="panel-heading">
            <div>
              <h2>
                {offerMode === "edit"
                  ? "Editar oferta"
                  : "Nueva oferta de proveedor"}
              </h2>
              <p>Costo, disponibilidad y condiciones de reposición.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setOfferMode(null)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="form-grid edit-grid">
            <Field label="Proveedor">
              <select
                disabled={offerMode === "edit"}
                value={offerForm.supplierId}
                onChange={(e) =>
                  setOfferForm({ ...offerForm, supplierId: e.target.value })
                }
                required
              >
                <option value="">Seleccionar proveedor</option>
                {data.suppliers
                  .filter((item) => item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
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
              onClick={() => setOfferMode(null)}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={
                busy ||
                !offerForm.unitCost ||
                (!offerForm.supplierId && offerMode === "new")
              }
            >
              {busy ? "Guardando…" : "Guardar oferta"}
            </button>
          </div>
        </form>
      )}
      <div className="sku-summary">
        <SummaryItem
          label="Precio de venta"
          value={money(variant.salePrice)}
          icon={<CircleDollarSign size={19} />}
        />
        <SummaryItem
          label="Margen de revisión"
          value={review?.breakdown.resultingMarginPercent ? percentage(Number(review.breakdown.resultingMarginPercent)) : "—"}
          icon={<BarChart3 size={19} />}
        />
        <SummaryItem
          label="Proveedor"
          value={supplier?.name || "Sin proveedor"}
          icon={<Building2 size={19} />}
        />
        <SummaryItem
          label="Costo proveedor"
          value={money(selectedOffer?.unitCost)}
          icon={<Tags size={19} />}
        />
        <SummaryItem
          label="Disponibilidad"
          value={<FulfillmentBadge status={fulfillmentStatus(variant)} />}
          icon={<Boxes size={19} />}
        />
        <SummaryItem
          label="Lead time"
          value={
            selectedOffer?.leadTimeHours != null
              ? `${selectedOffer.leadTimeHours} horas`
              : "—"
          }
          icon={<Clock3 size={19} />}
        />
      </div>
      <div className="sku-grid">
        <section className="panel calculator">
          <div className="panel-heading">
            <div>
              <h2>Calculadora de precio</h2>
              <p>Costos y reglas activas para esta variante.</p>
            </div>
            <span className="rule-version">
              Reglas v{data.rules.active?.version || "—"}
            </span>
          </div>
          <div className="calculator-context">
            <Field label="Escenario para distribuir costos fijos">
              <select value={scenarioId} onChange={(event) => { setScenarioId(event.target.value); setCalculation(null); setReview(null); }}>
                <option value="__none__">Sin escenario</option>
                {scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}
              </select>
            </Field>
            <p className="field-help">{scenarioId === "__none__" ? "Solo se aplicarán costos variables." : scenariosQuery.isPending ? "Cargando escenarios…" : "El escenario seleccionado distribuye los costos fijos por unidad."}</p>
          </div>
          {calculation ? (
            <>
              <div className="breakdown">
                <CostRow
                  label="Costo mercadería"
                  value={calculation.breakdown.productCost}
                />
                <CostRow
                  label="Fulfillment"
                  value={calculation.breakdown.fulfillment}
                />
                <CostRow
                  label="Packaging"
                  value={calculation.breakdown.packaging}
                />
                <CostRow
                  label="Comisión estimada"
                  value={calculation.breakdown.paymentVariable}
                />
                <CostRow
                  label="IVA de comisión"
                  value={calculation.breakdown.paymentFeeTax}
                />
                <CostRow
                  label="Costos fijos distribuidos"
                  value={calculation.breakdown.fixedMonthlyAllocation}
                />
                <CostRow
                  label="Logística absorbida"
                  value={calculation.breakdown.subsidizedShipping}
                />
                <CostRow label="Impuestos" value={calculation.breakdown.taxes} />
                <CostRow label="Otros" value={calculation.breakdown.other} />
                <CostRow
                  label="Costo total"
                  value={calculation.breakdown.effectiveCost}
                  total
                />
              </div>
              <div className="price-result">
                <div>
                  <span>Margen objetivo</span>
                  <strong>
                    {data.rules.active?.targetMarginPercent || "—"}%
                  </strong>
                </div>
                <div>
                  <span>Precio recomendado</span>
                  <strong>{money(calculation.recommendedPrice)}</strong>
                </div>
                <div className="commercial">
                  <span>Precio comercial sugerido</span>
                  <strong>{money(calculation.commercialPrice)}</strong>
                </div>
                <div>
                  <span>Ganancia estimada</span>
                  <strong>{money(calculation.breakdown.estimatedProfit)} · {percentage(Number(calculation.breakdown.resultingMarginPercent))}</strong>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state compact">
              <CircleDollarSign size={27} />
              <strong>Listo para calcular</strong>
              <p>Seleccioná una oferta disponible y recalculá.</p>
            </div>
          )}
          <div className="calculator-actions">
            <button
              className="button secondary"
              disabled={busy || !selectedOffer}
              onClick={recalculate}
            >
              <RefreshCw size={16} /> {busy ? "Calculando…" : "Recalcular"}
            </button>
            <button
              className="button secondary"
              disabled={busy || !calculation}
              onClick={() => void saveReview()}
            >
              <Check size={16} /> Guardar revisión
            </button>
            <button className="button primary" disabled={busy || !review || review.status !== "PENDING"} onClick={() => void apply(false)}>Aplicar precio</button>
            <button className="button primary" disabled={busy || !review || review.status !== "PENDING"} onClick={() => setActivationConfirm(true)}>Aplicar y activar</button>
          </div>
          <div className="pricing-state">{review?.status === "PENDING" ? "Revisión pendiente de aplicación." : variant.salePrice ? product.status === "ACTIVE" ? "Producto activo y precio aplicado." : "Precio aplicado; producto todavía en borrador." : "Sin precio aplicado."}</div>
        </section>
        <section className="panel offers-panel">
          <div className="panel-heading">
            <div>
              <h2>Ofertas de proveedores</h2>
              <p>Elegí la base para el cálculo.</p>
            </div>
            <button
              className="button small secondary"
              onClick={() => beginOffer("new")}
            >
              <Plus size={14} /> Nueva
            </button>
          </div>
          {variantOffers.length ? (
            <>
              <div className="offer-list">
                {variantOffers.map((offer) => {
                  const sup = data.suppliers.find(
                    (s) => s.id === offer.supplierId,
                  );
                  return (
                    <button
                      className={offerId === offer.id ? "selected" : ""}
                      key={offer.id}
                      onClick={() => { setOfferId(offer.id); setCalculation(null); setReview(null); }}
                    >
                      <span className="radio">
                        {offerId === offer.id && <span />}
                      </span>
                      <span>
                        <strong>{sup?.name}</strong>
                        <small>
                          {stockLabel(offer.stockStatus)} ·{" "}
                          {offer.leadTimeHours
                            ? `${offer.leadTimeHours}h`
                            : "sin lead time"}
                        </small>
                        {offer.id === winningOffer?.id && (
                          <em className="offer-winner-badge">
                            <Check size={12} /> Ganadora
                          </em>
                        )}
                      </span>
                      <b>{money(offer.unitCost)}</b>
                    </button>
                  );
                })}
              </div>
              {selectedOffer && (
                <div className="offer-footer">
                  <button
                    className="text-button"
                    onClick={() => beginOffer("edit")}
                  >
                    Editar oferta seleccionada
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state compact">
              <Building2 size={27} />
              <strong>Sin ofertas asociadas</strong>
              <p>Asociá una oferta para poder calcular el precio.</p>
              <button
                className="button primary"
                onClick={() => beginOffer("new")}
              >
                <Plus size={15} /> Agregar oferta
              </button>
            </div>
          )}
        </section>
      </div>
      <section className="panel table-panel inventory-history">
        <div className="panel-heading">
          <div>
            <h2>Movimientos de inventario</h2>
            <p>Reservas, despachos, liberaciones y ajustes del SKU.</p>
          </div>
          <button
            className="button small secondary"
            onClick={() => void loadMovements()}
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
        {movementsError ? (
          <div className="inline-error">
            <AlertTriangle size={16} />
            {movementsError}
          </div>
        ) : movements.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Motivo</th>
                  <th>Pedido</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>
                      {new Date(movement.createdAt).toLocaleString("es-AR")}
                    </td>
                    <td>{movement.type}</td>
                    <td
                      className={
                        movement.quantity < 0 ? "danger-text" : "success-text"
                      }
                    >
                      {movement.quantity > 0 ? "+" : ""}
                      {movement.quantity}
                    </td>
                    <td>{movement.reason || "—"}</td>
                    <td className="mono">{movement.orderId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state compact">
            <Boxes size={27} />
            <strong>Sin movimientos</strong>
            <p>Todavía no hay actividad de inventario para este SKU.</p>
          </div>
        )}
      </section>
      {activationConfirm && <ConfirmDialog title="Activar producto" message="Se aplicará el precio de la revisión y el backend validará imagen, marca, categoría, SKU y precio. ¿Querés activar este producto para la venta?" confirmLabel="Aplicar y activar" busy={busy} onCancel={() => setActivationConfirm(false)} onConfirm={() => void apply(true)} />}
    </>
  );
}
