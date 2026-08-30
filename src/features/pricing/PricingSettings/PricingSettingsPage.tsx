import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, RefreshCw } from "lucide-react";
import { api } from "../../../api";
import type { DataState, OperatingCost, PaymentFeeSchedule, PaymentProviderConfiguration, PaymentProviderName, PricingRules, PricingScenario, PricingScenarioAnalysis } from "../../../types";
import type { ToastKind } from "../../../app/navigation";
import { ConfirmDialog, Field, PageHeader, StatusBadge } from "../../../shared/components";
import { money, percentage } from "../../../shared/formatters";

type Tab = "rules" | "providers" | "fees" | "costs" | "scenarios";

const tabs: Array<[Tab, string]> = [
  ["rules", "Reglas"],
  ["providers", "Proveedores de pago"],
  ["fees", "Tarifa de pago"],
  ["costs", "Costos operativos"],
  ["scenarios", "Escenarios"],
];

const localDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const isoDateTime = (value: string) => new Date(value).toISOString();

const providerLabels: Record<PaymentProviderName, { name: string; description: string }> = {
  mercadopago: { name: "Mercado Pago", description: "Checkout Pro y enlaces de pago." },
  payway: { name: "Payway", description: "Pagos con tarjeta tokenizada." },
  simulated: { name: "Pago simulado", description: "Medio de prueba para operaciones internas." },
};

const analysisLabels: Array<[keyof PricingScenarioAnalysis, string, (value: unknown) => string]> = [
  ["ordersUsed", "Pedidos usados", (value) => String(value)],
  ["averageSalePricePerUnit", "Venta media por unidad", (value) => money(value as string)],
  ["averageVariableCostPerUnit", "Costo variable medio", (value) => money(value as string)],
  ["averageContributionPerOrder", "Aporte por pedido", (value) => money(value as string)],
  ["fixedMonthlyCosts", "Costos fijos mensuales", (value) => money(value as string)],
  ["projectedRevenue", "Facturación proyectada", (value) => money(value as string)],
  ["projectedOperatingResult", "Resultado operativo", (value) => money(value as string)],
  ["breakEvenOrders", "Pedidos de equilibrio", (value) => value == null ? "—" : String(value)],
  ["breakEvenRevenue", "Facturación de equilibrio", (value) => money(value as string | null)],
];

const sourceLabel = (analysis: PricingScenarioAnalysis) => {
  if (analysis.sourceResolved === "PREVIOUS_PERIOD") return "Pedidos reales del período anterior";
  if (analysis.sourceResolved === "MANUAL_FALLBACK") return "Proyección manual (sin pedidos anteriores)";
  return "Proyección manual";
};

function ScenarioAnalysisDetails({ analysis }: { analysis: PricingScenarioAnalysis }) {
  const { catalogCoverage, costBreakdown } = analysis;
  const ruleCosts = [
    ["Packaging por pedido", costBreakdown.rules.packaging],
    ["Envío subsidiado por pedido", costBreakdown.rules.subsidizedShipping],
    ["Costo fijo de pago por pedido", costBreakdown.rules.paymentFixed],
    ["Fulfillment por unidad", costBreakdown.rules.fulfillment],
    ["Otros costos por unidad", costBreakdown.rules.other],
  ] as const;
  const costLines = [
    ...costBreakdown.fixedMonthly,
    ...costBreakdown.perOrder,
    ...costBreakdown.perUnit,
    ...costBreakdown.percentOfSale,
  ];

  return <>
    <div className="analysis-grid">
      {analysisLabels.map(([key, label, format]) => <div className="analysis-item" key={String(key)}><span>{label}</span><strong>{format(analysis[key])}</strong></div>)}
    </div>
    <div className="analysis-details">
      <div className="analysis-detail-columns">
        <section className="analysis-detail-card">
          <h3>Base del análisis</h3>
          <dl>
            <dt>Origen de pedidos</dt><dd>{sourceLabel(analysis)}</dd>
            <dt>Productos por pedido</dt><dd>{analysis.scenario.averageItemsPerOrder}</dd>
            <dt>Variantes consideradas</dt><dd>{catalogCoverage.variantsConsidered}</dd>
            <dt>Variantes incluidas</dt><dd>{catalogCoverage.variantsIncluded}</dd>
            <dt>Sin oferta activa</dt><dd>{catalogCoverage.variantsWithoutActiveOffer}</dd>
            <dt>Inventario en el cálculo</dt><dd>No</dd>
            <dt>Oferta elegida</dt><dd>Menor costo activo</dd>
          </dl>
        </section>
        <section className="analysis-detail-card">
          <h3>Costos que entran por venta</h3>
          <dl>
            {ruleCosts.map(([label, value]) => <Fragment key={label}><dt>{label}</dt><dd>{money(value)}</dd></Fragment>)}
            <dt>{analysis.paymentFeeSchedule?.provider || "Pasarela global"}</dt><dd>{costBreakdown.rules.paymentFeePercent}% {costBreakdown.rules.paymentFeeVatApplies ? `+ IVA ${costBreakdown.rules.paymentFeeVatPercent}% = ${costBreakdown.rules.paymentFeeEffectivePercent}%` : "· IVA no aplica"}</dd>
            <dt>Porcentaje total sobre venta</dt><dd>{costBreakdown.rules.totalPercentRate}%</dd>
          </dl>
        </section>
      </div>
      <section className="analysis-detail-card">
        <h3>Composición de los promedios</h3>
        <dl className="analysis-average-list">
          <dt>Costo medio del proveedor</dt><dd>{money(costBreakdown.averages.supplierCostPerUnit)}</dd>
          <dt>Costos operativos por unidad</dt><dd>{money(costBreakdown.averages.operatingCostPerUnit)}</dd>
          <dt>Costos porcentuales por unidad</dt><dd>{money(costBreakdown.averages.percentageCostPerUnit)}</dd>
          <dt>Costo variable medio</dt><dd>{money(costBreakdown.averages.variableCostPerUnit)}</dd>
          <dt>Aporte antes de costos por pedido</dt><dd>{money(costBreakdown.averages.contributionPerUnit)}</dd>
          <dt>Costos por pedido</dt><dd>{money(costBreakdown.averages.costsPerOrder)}</dd>
          <dt>Aporte final por pedido</dt><dd>{money(costBreakdown.averages.contributionPerOrder)}</dd>
        </dl>
      </section>
      <section className="analysis-detail-card">
        <h3>Costos fijos mensuales</h3>
        {costBreakdown.fixedMonthly.length ? <div className="analysis-cost-lines">{costBreakdown.fixedMonthly.map((cost) => <div key={cost.id}><span>{cost.name}</span><strong>{money(cost.amount)}</strong></div>)}</div> : <p className="analysis-muted">No hay costos fijos activos para el período.</p>}
        <p className="analysis-formula">Equilibrio: costos fijos ÷ aporte por pedido. La facturación de equilibrio es bruta.</p>
      </section>
      {costLines.length > 0 && <details className="analysis-detail-card analysis-cost-detail"><summary>Ver líneas de costos configuradas</summary><div className="analysis-cost-lines">{costLines.map((cost) => <div key={`${cost.type}-${cost.id}`}><span>{cost.name} <small>{cost.type}</small></span><strong>{cost.type === "PERCENT_OF_SALE" ? `${cost.percent || "0"}%` : money(cost.amount)}</strong></div>)}</div></details>}
      <details className="analysis-detail-card analysis-variants"><summary>Ver variantes y ofertas usadas ({catalogCoverage.includedVariants.length})</summary>
        <div className="analysis-table-wrapper"><table><thead><tr><th>Producto</th><th>SKU / peso</th><th>Venta</th><th>Proveedor</th><th>Costo</th><th>Disponible</th></tr></thead><tbody>{catalogCoverage.includedVariants.map((variant) => <tr key={variant.variantId}><td>{variant.productName}</td><td>{variant.sku || "—"}{variant.weightGrams ? ` · ${variant.weightGrams} g` : ""}</td><td>{money(variant.salePrice)}</td><td>{variant.supplierName}</td><td>{money(variant.unitCost)}</td><td>{variant.inventory ? String(variant.inventory.available) : "Sin registro"}</td></tr>)}</tbody></table></div>
      </details>
      <div className="settings-note analysis-warning"><AlertTriangle size={17} /><p><strong>El inventario es informativo.</strong><br />El análisis no descuenta stock, reservas ni ventas por producto. Proyecta usando el promedio de las variantes incluidas.</p></div>
    </div>
  </>;
}

const ruleFields = [
  ["fulfillmentCost", "Fulfillment"],
  ["packagingCost", "Packaging"],
  ["subsidizedShippingCost", "Logística absorbida"],
  ["taxPercent", "Impuestos (%)"],
  ["otherCost", "Otros costos"],
  ["targetMarginPercent", "Margen objetivo (%)"],
] as const;

export function PricingSettingsPage({
  data,
  mutate,
  notify,
}: {
  data: DataState;
  mutate: (fn: (d: DataState) => DataState) => void;
  notify: (m: string, k?: ToastKind) => void;
}) {
  const [tab, setTab] = useState<Tab>("rules");
  const active = data.rules.active;
  const source = data.rules.draft || active;
  const activeMissing = active
    ? ([
        ["fulfillmentCost", "Fulfillment"],
        ["packagingCost", "Packaging"],
        ["paymentFixedCost", "costo fijo de pago"],
        ["paymentFeePercent", "comisión de pago"],
        ["subsidizedShippingCost", "logística absorbida"],
        ["taxPercent", "impuestos"],
        ["otherCost", "otros costos"],
        ["targetMarginPercent", "margen objetivo"],
      ] as const).filter(([key]) => active[key] === null || active[key] === undefined || active[key] === "").map(([, label]) => label)
    : ["reglas activas"];
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [editingFee, setEditingFee] = useState<string | null>(null);
  const [feeForm, setFeeForm] = useState({ provider: "MERCADOPAGO" as PaymentFeeSchedule["provider"], name: "", settlementDays: "0", feePercent: "", vatApplies: true, vatPercent: "21.00", fixedFee: "0.00" });
  const [editingCost, setEditingCost] = useState<string | null>(null);
  const [costForm, setCostForm] = useState({ name: "", type: "FIXED_MONTHLY" as OperatingCost["type"], amount: "", percent: "" });
  const [editingScenario, setEditingScenario] = useState<string | null>(null);
  const [scenarioForm, setScenarioForm] = useState({ name: "", periodStart: "", periodEnd: "", ordersSource: "MANUAL" as PricingScenario["ordersSource"], projectedOrders: "20", averageItemsPerOrder: "1.00", paymentFeeScheduleId: "" });
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [bulkRecalculateConfirm, setBulkRecalculateConfirm] = useState(false);
  const [providerForms, setProviderForms] = useState<Record<string, { enabled: boolean; priority: string }>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    setValues(Object.fromEntries(ruleFields.map(([key]) => [key, source?.[key as keyof PricingRules] || ""])) as Record<string, string>);
  }, [source?.id]);

  const feesQuery = useQuery({ queryKey: ["pricing", "payment-fees"], queryFn: api.paymentFeeSchedules, enabled: tab === "fees" || tab === "scenarios" });
  const providersQuery = useQuery({ queryKey: ["payment-providers"], queryFn: api.paymentProviderConfigurations, enabled: tab === "providers" });
  const costsQuery = useQuery({ queryKey: ["pricing", "operating-costs"], queryFn: api.operatingCosts, enabled: tab === "costs" });
  const scenariosQuery = useQuery({ queryKey: ["pricing", "scenarios"], queryFn: api.pricingScenarios, enabled: tab === "scenarios" || Boolean(selectedScenarioId) });
  const scenarios = scenariosQuery.data || [];
  const selectedScenario = scenarios.find((item) => item.id === selectedScenarioId);
  const analysisQuery = useQuery({ queryKey: ["pricing", "scenario-analysis", selectedScenarioId], queryFn: () => api.pricingScenarioAnalysis(selectedScenarioId), enabled: Boolean(selectedScenarioId) });

  useEffect(() => {
    if (!providersQuery.data) return;
    setProviderForms(Object.fromEntries(providersQuery.data.map((provider) => [provider.provider, { enabled: provider.enabled, priority: String(provider.priority) }])));
  }, [providersQuery.data]);

  const saveRules = async () => {
    setBusy(true);
    try {
      const draft = await api.updateRules(values);
      mutate((current) => ({ ...current, rules: { ...current.rules, draft } }));
      notify("Reglas guardadas como borrador.");
    } catch (error) { notify((error as Error).message, "error"); } finally { setBusy(false); }
  };
  const activate = async () => {
    if (!data.rules.draft) return;
    setBusy(true);
    try {
      const activated = await api.activateRules();
      mutate((current) => ({ ...current, rules: { active: activated, draft: null } }));
      notify(`Reglas v${activated.version} activadas.`);
    } catch (error) { notify((error as Error).message, "error"); } finally { setBusy(false); }
  };
  const selectFee = async (id: string) => {
    setBusy(true);
    try {
      const draft = await api.selectPaymentFeeSchedule(id);
      mutate((current) => ({ ...current, rules: { ...current.rules, draft } }));
      notify("Tarifa seleccionada en el borrador. Activá las reglas para usarla.");
    } catch (error) { notify((error as Error).message, "error"); } finally { setBusy(false); }
  };
  const submitFee = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const body = { provider: feeForm.provider, product: "CHECKOUT_PRO" as const, name: feeForm.name, settlementDays: Number(feeForm.settlementDays), feePercent: feeForm.feePercent, vatApplies: feeForm.vatApplies, vatPercent: feeForm.vatPercent || "0.00", fixedFee: feeForm.fixedFee || "0.00" };
      if (editingFee) await api.updatePaymentFeeSchedule(editingFee, body);
      else await api.createPaymentFeeSchedule(body);
      await feesQuery.refetch(); setEditingFee(null); setFeeForm({ provider: "MERCADOPAGO", name: "", settlementDays: "0", feePercent: "", vatApplies: true, vatPercent: "21.00", fixedFee: "0.00" });
      notify(editingFee ? "Tarifa actualizada." : "Tarifa creada.");
    } catch (error) { notify((error as Error).message, "error"); } finally { setBusy(false); }
  };
  const submitCost = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const body = { name: costForm.name, type: costForm.type, amount: costForm.type === "PERCENT_OF_SALE" ? null : costForm.amount || null, percent: costForm.type === "PERCENT_OF_SALE" ? costForm.percent || null : null };
      if (editingCost) await api.updateOperatingCost(editingCost, body);
      else await api.createOperatingCost(body);
      await costsQuery.refetch(); setEditingCost(null); setCostForm({ name: "", type: "FIXED_MONTHLY", amount: "", percent: "" });
      notify(editingCost ? "Costo actualizado." : "Costo creado.");
    } catch (error) { notify((error as Error).message, "error"); } finally { setBusy(false); }
  };
  const submitScenario = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const body = { name: scenarioForm.name, periodStart: isoDateTime(scenarioForm.periodStart), periodEnd: isoDateTime(scenarioForm.periodEnd), ordersSource: scenarioForm.ordersSource, projectedOrders: Number(scenarioForm.projectedOrders), averageItemsPerOrder: scenarioForm.averageItemsPerOrder, paymentFeeScheduleId: scenarioForm.paymentFeeScheduleId || null };
      const saved = editingScenario ? await api.updatePricingScenario(editingScenario, body) : await api.createPricingScenario(body);
      await scenariosQuery.refetch(); setSelectedScenarioId(saved.id); setEditingScenario(null); setScenarioForm({ name: "", periodStart: "", periodEnd: "", ordersSource: "MANUAL", projectedOrders: "20", averageItemsPerOrder: "1.00", paymentFeeScheduleId: "" });
      notify(editingScenario ? "Escenario actualizado." : "Escenario creado.");
    } catch (error) { notify((error as Error).message, "error"); } finally { setBusy(false); }
  };
  const editScenario = (scenario: PricingScenario) => {
    setEditingScenario(scenario.id); setSelectedScenarioId(scenario.id);
    setScenarioForm({ name: scenario.name, periodStart: localDateTime(scenario.periodStart), periodEnd: localDateTime(scenario.periodEnd), ordersSource: scenario.ordersSource, projectedOrders: String(scenario.projectedOrders), averageItemsPerOrder: scenario.averageItemsPerOrder, paymentFeeScheduleId: scenario.paymentFeeScheduleId || "" });
  };
  const deactivateScenario = async (id: string) => {
    setBusy(true);
    try { await api.updatePricingScenario(id, { active: false }); await scenariosQuery.refetch(); if (selectedScenarioId === id) setSelectedScenarioId(""); notify("Escenario desactivado."); }
    catch (error) { notify((error as Error).message, "error"); } finally { setBusy(false); }
  };
  const saveProvider = async (provider: PaymentProviderConfiguration) => {
    const form = providerForms[provider.provider];
    if (!form) return;
    const priority = Number(form.priority);
    if (!Number.isInteger(priority) || priority < 0) {
      notify("La prioridad debe ser un número entero mayor o igual a 0.", "error");
      return;
    }
    setBusy(true);
    try {
      await api.updatePaymentProviderConfiguration(provider.provider, { enabled: form.enabled, priority });
      await providersQuery.refetch();
      notify(`${providerLabels[provider.provider].name} actualizado.`);
    } catch (error) { notify((error as Error).message, "error"); } finally { setBusy(false); }
  };
  const recalculateAllPricing = async () => {
    if (!selectedScenarioId) return;
    setBusy(true);
    try {
      const result = await api.recalculateAllPricing(selectedScenarioId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pricing-reviews"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      setBulkRecalculateConfirm(false);
      notify(`${result.processed} variantes recalculadas. Las revisiones quedaron pendientes de aplicación.`);
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return <>
    <PageHeader eyebrow="Configuración" title="Pricing y activación" description="Prepará las reglas y escenarios antes de aplicar precios al catálogo." actions={<>{data.rules.draft && <button className="button primary" disabled={busy} onClick={() => void activate()}><Check size={16} /> Activar borrador v{data.rules.draft.version}</button>}<span className="rule-version">Reglas activas v{active?.version || "—"}</span></>} />
    <section className="panel settings-tabs" aria-label="Configuración de pricing">
      <div className="tab-list" role="tablist">{tabs.map(([key, label]) => <button type="button" role="tab" aria-selected={tab === key} className={tab === key ? "selected" : ""} key={key} onClick={() => setTab(key)}>{label}</button>)}</div>
      <div className="settings-tab-content">
        {tab === "rules" && <>
          <div className="section-title"><h2>Reglas generales</h2><p>Estos importes se usan para calcular precios. Los cambios quedan en borrador.</p></div>
          <div className="form-grid">{ruleFields.map(([key, label]) => <Field key={key} label={label}><input inputMode="decimal" value={values[key] || ""} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} required /></Field>)}</div>
          <div className="settings-note"><AlertTriangle size={17} /><p><strong>Las comisiones de pago se configuran desde “Tarifa de pago”.</strong><br />Seleccionar una tarifa actualiza el borrador, pero no la activa automáticamente.</p></div>
          {activeMissing.length > 0 && <div className="inline-error operation-error"><AlertTriangle size={17} /><div><strong>La configuración activa todavía no permite calcular.</strong><p>Faltan: {activeMissing.join(", ")}.</p></div></div>}
          <div className="form-actions end"><button className="button primary" disabled={busy} onClick={() => void saveRules()}>{busy ? "Guardando…" : "Guardar borrador"}</button></div>
          <section className="embedded-summary"><strong>Tarifa aplicada</strong><span>{active?.paymentFeeScheduleId ? "Configurada desde una tarifa de pago" : "Sin tarifa seleccionada"}</span><span>Comisión {percentage(active?.paymentFeePercent ? Number(active.paymentFeePercent) : null)} · {active?.paymentFeeVatApplies === false ? "IVA no aplica" : `IVA ${percentage(active?.paymentFeeVatPercent ? Number(active.paymentFeeVatPercent) : null)}`}</span></section>
        </>}
         {tab === "providers" && <>
           <div className="section-title"><h2>Proveedores de pago</h2><p>Definí qué medios puede ofrecer el checkout y en qué orden aparecen.</p></div>
           <div className="settings-note"><AlertTriangle size={17} /><p><strong>Desactivar un proveedor no afecta sus webhooks.</strong><br />Los pagos ya iniciados continúan pudiendo ser procesados.</p></div>
           {providersQuery.error ? <div className="inline-error"><AlertTriangle size={16} />{providersQuery.error.message}</div> : providersQuery.isPending ? <div className="loading-row">Cargando proveedores…</div> : <div className="provider-list">{(providersQuery.data || []).map((provider) => { const form = providerForms[provider.provider] || { enabled: provider.enabled, priority: String(provider.priority) }; const label = providerLabels[provider.provider]; return <article className={`provider-card ${form.enabled ? "enabled" : "disabled"}`} key={provider.id}><div className="provider-card-icon">{provider.provider === "simulated" ? "S" : provider.provider === "payway" ? "P" : "MP"}</div><div className="provider-card-copy"><div className="provider-card-title"><strong>{label.name}</strong><StatusBadge status={form.enabled ? "ACTIVE" : "ARCHIVED"} /></div><p>{label.description}</p><small>Última actualización: {new Date(provider.updatedAt).toLocaleDateString("es-AR")}</small></div><div className="provider-card-controls"><label className="provider-toggle"><input type="checkbox" checked={form.enabled} onChange={(event) => setProviderForms((current) => ({ ...current, [provider.provider]: { ...form, enabled: event.target.checked } }))} /><span>{form.enabled ? "Activo" : "Inactivo"}</span></label><Field label="Prioridad"><input type="number" min="0" step="1" value={form.priority} onChange={(event) => setProviderForms((current) => ({ ...current, [provider.provider]: { ...form, priority: event.target.value } }))} /></Field><button className="button small primary" disabled={busy} onClick={() => void saveProvider(provider)}>Guardar</button></div></article> })}</div>}
         </>}
         {tab === "fees" && <>
          <div className="section-title"><h2>Tarifas de pago</h2><p>Creá una tarifa por pasarela y forma de acreditación. La selección global alimenta las reglas activas.</p></div>
          <form className="inline-create settings-form-grid" onSubmit={submitFee}><Field label="Pasarela"><select value={feeForm.provider} onChange={(event) => setFeeForm({ ...feeForm, provider: event.target.value as PaymentFeeSchedule["provider"] })}><option value="MERCADOPAGO">Mercado Pago</option><option value="PAYWAY">Payway</option></select></Field><Field label="Nombre"><input value={feeForm.name} onChange={(event) => setFeeForm({ ...feeForm, name: event.target.value })} required /></Field><Field label="Acreditación (días)"><input type="number" min="0" value={feeForm.settlementDays} onChange={(event) => setFeeForm({ ...feeForm, settlementDays: event.target.value })} required /></Field><Field label="Comisión (%)"><input inputMode="decimal" value={feeForm.feePercent} onChange={(event) => setFeeForm({ ...feeForm, feePercent: event.target.value })} required /></Field><Field label="IVA (%)"><input inputMode="decimal" value={feeForm.vatPercent} onChange={(event) => setFeeForm({ ...feeForm, vatPercent: event.target.value })} disabled={!feeForm.vatApplies} required={feeForm.vatApplies} /></Field><Field label="Costo fijo"><input inputMode="decimal" value={feeForm.fixedFee} onChange={(event) => setFeeForm({ ...feeForm, fixedFee: event.target.value })} required /></Field><label className="checkbox-field"><input type="checkbox" checked={feeForm.vatApplies} onChange={(event) => setFeeForm({ ...feeForm, vatApplies: event.target.checked })} /> Aplica IVA a la comisión</label><div className="form-actions"><button type="button" className="button ghost" onClick={() => { setEditingFee(null); setFeeForm({ provider: "MERCADOPAGO", name: "", settlementDays: "0", feePercent: "", vatApplies: true, vatPercent: "21.00", fixedFee: "0.00" }); }}>Limpiar</button><button className="button primary" disabled={busy}>{editingFee ? "Guardar tarifa" : "Agregar tarifa"}</button></div></form>
          {feesQuery.error ? <div className="inline-error"><AlertTriangle size={16} />{feesQuery.error.message}</div> : feesQuery.isPending ? <div className="loading-row">Cargando tarifas…</div> : <div className="settings-list">{(feesQuery.data || []).map((fee) => { const selected = data.rules.draft?.paymentFeeScheduleId === fee.id || data.rules.active?.paymentFeeScheduleId === fee.id; return <article className={`settings-list-row ${selected ? "selected" : ""}`} key={fee.id}><div><strong>{fee.name}</strong><small>{fee.provider} · {fee.product} · Acreditación: {fee.settlementDays} días</small><small>{fee.feePercent}% {fee.vatApplies ? `+ IVA ${fee.vatPercent}%` : "· IVA no aplica"} · Fijo {money(fee.fixedFee)}</small></div><div className="row-actions"><button className="button small ghost" onClick={() => { setEditingFee(fee.id); setFeeForm({ provider: fee.provider, name: fee.name, settlementDays: String(fee.settlementDays), feePercent: fee.feePercent, vatApplies: fee.vatApplies, vatPercent: fee.vatPercent, fixedFee: fee.fixedFee }); }}>Editar</button>{selected && <StatusBadge status={data.rules.active?.paymentFeeScheduleId === fee.id ? "ACTIVE" : "DRAFT"} />}<button className="button small secondary" disabled={busy || !fee.active} onClick={() => void selectFee(fee.id)}>{selected ? "Seleccionada" : "Usar esta tarifa"}</button></div></article>})}</div>}
        </>}
        {tab === "costs" && <>
          <div className="section-title"><h2>Costos operativos</h2><p>Los costos fijos se distribuyen mediante un escenario; los demás entran en el análisis.</p></div>
          <form className="inline-create settings-form-grid" onSubmit={submitCost}><Field label="Nombre"><input value={costForm.name} onChange={(event) => setCostForm({ ...costForm, name: event.target.value })} required /></Field><Field label="Tipo"><select value={costForm.type} onChange={(event) => setCostForm({ ...costForm, type: event.target.value as OperatingCost["type"] })}><option value="FIXED_MONTHLY">Mensual fijo</option><option value="PER_ORDER">Por pedido</option><option value="PER_UNIT">Por unidad</option><option value="PERCENT_OF_SALE">Porcentaje de venta</option></select></Field><Field label={costForm.type === "PERCENT_OF_SALE" ? "Porcentaje" : "Importe"}><input inputMode="decimal" value={costForm.type === "PERCENT_OF_SALE" ? costForm.percent : costForm.amount} onChange={(event) => setCostForm({ ...costForm, [costForm.type === "PERCENT_OF_SALE" ? "percent" : "amount"]: event.target.value })} required /></Field><div className="form-actions"><button type="button" className="button ghost" onClick={() => { setEditingCost(null); setCostForm({ name: "", type: "FIXED_MONTHLY", amount: "", percent: "" }); }}>Limpiar</button><button className="button primary" disabled={busy}>{editingCost ? "Guardar costo" : "Agregar costo"}</button></div></form>
          {costsQuery.error ? <div className="inline-error"><AlertTriangle size={16} />{costsQuery.error.message}</div> : costsQuery.isPending ? <div className="loading-row">Cargando costos…</div> : <div className="settings-list">{(costsQuery.data || []).map((cost) => <article className={`settings-list-row ${cost.active ? "" : "inactive"}`} key={cost.id}><div><strong>{cost.name}</strong><small>{cost.type} · {cost.type === "PERCENT_OF_SALE" ? `${cost.percent || "0"}%` : money(cost.amount)} · {cost.active ? "Activo" : "Inactivo"}</small></div><div className="row-actions"><button className="button small secondary" onClick={() => { setEditingCost(cost.id); setCostForm({ name: cost.name, type: cost.type, amount: cost.amount || "", percent: cost.percent || "" }); }}>Editar</button>{cost.active && <button className="button small ghost" disabled={busy} onClick={() => { setBusy(true); void api.updateOperatingCost(cost.id, { active: false }).then(() => costsQuery.refetch()).then(() => notify("Costo desactivado.")).catch((error) => notify((error as Error).message, "error")).finally(() => setBusy(false)); }}>Desactivar</button>}</div></article>)}</div>}
        </>}
        {tab === "scenarios" && <>
          <div className="section-title"><h2>Escenarios mensuales</h2><p>Proyectá ventas y distribuí costos fijos por unidad cuando calcules precios.</p></div>
          <form className="form-grid scenario-form" onSubmit={submitScenario}><Field label="Nombre"><input value={scenarioForm.name} onChange={(event) => setScenarioForm({ ...scenarioForm, name: event.target.value })} required /></Field><Field label="Fuente de pedidos"><select value={scenarioForm.ordersSource} onChange={(event) => setScenarioForm({ ...scenarioForm, ordersSource: event.target.value as PricingScenario["ordersSource"] })}><option value="MANUAL">Proyección manual</option><option value="PREVIOUS_PERIOD">Período anterior</option></select></Field><Field label="Tarifa de pago"><select value={scenarioForm.paymentFeeScheduleId} onChange={(event) => setScenarioForm({ ...scenarioForm, paymentFeeScheduleId: event.target.value })}><option value="">Usar regla global activa</option>{(feesQuery.data || []).map((fee) => <option key={fee.id} value={fee.id}>{fee.provider} · {fee.name} · {fee.feePercent}%</option>)}</select></Field><Field label="Inicio"><input type="datetime-local" value={scenarioForm.periodStart} onChange={(event) => setScenarioForm({ ...scenarioForm, periodStart: event.target.value })} required /></Field><Field label="Fin"><input type="datetime-local" value={scenarioForm.periodEnd} onChange={(event) => setScenarioForm({ ...scenarioForm, periodEnd: event.target.value })} required /></Field><Field label="Pedidos proyectados"><input type="number" min="0" value={scenarioForm.projectedOrders} onChange={(event) => setScenarioForm({ ...scenarioForm, projectedOrders: event.target.value })} required /></Field><Field label="Productos por pedido"><input inputMode="decimal" value={scenarioForm.averageItemsPerOrder} onChange={(event) => setScenarioForm({ ...scenarioForm, averageItemsPerOrder: event.target.value })} required /></Field><div className="form-actions end"><button type="button" className="button ghost" onClick={() => { setEditingScenario(null); setScenarioForm({ name: "", periodStart: "", periodEnd: "", ordersSource: "MANUAL", projectedOrders: "20", averageItemsPerOrder: "1.00", paymentFeeScheduleId: "" }); }}>Limpiar</button><button className="button primary" disabled={busy}>{editingScenario ? "Guardar escenario" : "Crear escenario"}</button></div></form>
          {scenariosQuery.error ? <div className="inline-error"><AlertTriangle size={16} />{scenariosQuery.error.message}</div> : scenariosQuery.isPending ? <div className="loading-row">Cargando escenarios…</div> : <div className="settings-list">{scenarios.map((scenario) => <article className={`settings-list-row ${selectedScenarioId === scenario.id ? "selected" : ""}`} key={scenario.id}><div><strong>{scenario.name}</strong><small>{new Date(scenario.periodStart).toLocaleDateString("es-AR")} – {new Date(scenario.periodEnd).toLocaleDateString("es-AR")} · {scenario.ordersSource === "MANUAL" ? `${scenario.projectedOrders} pedidos` : "Pedidos del período anterior"}</small><small>{scenario.averageItemsPerOrder} productos por pedido · {scenario.paymentFeeScheduleId ? (feesQuery.data || []).find((fee) => fee.id === scenario.paymentFeeScheduleId)?.name || "Tarifa seleccionada" : "Regla global activa"}</small></div><div className="row-actions"><button className="button small secondary" onClick={() => { setSelectedScenarioId(scenario.id); void analysisQuery.refetch(); }}>Analizar</button><button className="button small ghost" onClick={() => editScenario(scenario)}>Editar</button><button className="button small ghost" disabled={busy} onClick={() => void deactivateScenario(scenario.id)}>Desactivar</button></div></article>)}</div>}
           {selectedScenario && <section className="scenario-analysis panel"><div className="panel-heading"><div><h2>Análisis: {selectedScenario.name}</h2><p>Resultado calculado por el backend.</p></div><div className="header-actions"><button className="button small secondary" onClick={() => void analysisQuery.refetch()}><RefreshCw size={14} /> Actualizar</button><button className="button small primary" disabled={busy} onClick={() => setBulkRecalculateConfirm(true)}><RefreshCw size={14} /> Recalcular precios</button></div></div>{analysisQuery.error ? <div className="inline-error"><AlertTriangle size={16} />{analysisQuery.error.message}</div> : analysisQuery.isPending ? <div className="loading-row">Analizando escenario…</div> : analysisQuery.data && <ScenarioAnalysisDetails analysis={analysisQuery.data} />}</section>}
         </>}
      </div>
    </section>
    {bulkRecalculateConfirm && selectedScenario && <ConfirmDialog title="Recalcular precios" message={`Se crearán revisiones pendientes para las variantes activas con ofertas activas usando “${selectedScenario.name}”. Las revisiones pendientes anteriores serán reemplazadas y no se modificarán precios de venta.`} confirmLabel="Recalcular precios" busy={busy} onCancel={() => setBulkRecalculateConfirm(false)} onConfirm={() => void recalculateAllPricing()} />}
  </>;
}
