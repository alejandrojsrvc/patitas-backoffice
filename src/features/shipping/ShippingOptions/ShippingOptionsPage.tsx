import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Check, Map, Plus, Truck, X } from "lucide-react";
import { api } from "../../../api";
import type { Notify } from "../../../app/navigation";
import type { ShippingDeliveryWindows, ShippingOption, ShippingQuote, ShippingZone } from "../../../types";
import { AsyncError, Field, PageHeader, StatusBadge } from "../../../shared/components";
import { money } from "../../../shared/formatters";

type Tab = "options" | "zones" | "quote";
type OptionForm = { name: string; description: string; cost: string; displayOrder: string; active: boolean };
type ZoneForm = {
  name: string; type: ShippingZone["type"]; postalCodes: string; neighborhoods: string;
  cost: string; freeShippingFrom: string; maxWeightGrams: string; estimatedDaysMin: string;
  estimatedDaysMax: string; priority: string; active: boolean; polygon: string;
  deliverySlots: Array<{ id: string; label: string; start: string; end: string }>;
  daysOfWeek: number[]; cutoff: string; timezone: string;
};

const emptyOption: OptionForm = { name: "", description: "", cost: "0.00", displayOrder: "0", active: true };
const emptyZone: ZoneForm = {
  name: "", type: "NEIGHBORHOOD", postalCodes: "", neighborhoods: "", cost: "0.00",
  freeShippingFrom: "", maxWeightGrams: "30000", estimatedDaysMin: "1", estimatedDaysMax: "3",
  priority: "0", active: true, polygon: "", deliverySlots: [
    { id: "MORNING", label: "10:00 a 12:00", start: "10:00", end: "12:00" },
    { id: "EVENING", label: "18:00 a 20:00", start: "18:00", end: "20:00" },
  ], daysOfWeek: [1, 2, 3, 4, 5], cutoff: "13:00", timezone: "America/Argentina/Buenos_Aires",
};
const dayLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const weekday = (date: string) => {
  const label = new Intl.DateTimeFormat("es-AR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const asWindows = (form: ZoneForm): ShippingDeliveryWindows => ({
  deliverySlots: form.deliverySlots,
  daysOfWeek: form.daysOfWeek,
  cutoff: form.cutoff,
  timezone: form.timezone,
});
const windowFromZone = (zone: ShippingZone) => {
  const value = zone.deliveryWindows as Partial<ShippingDeliveryWindows> | null;
  return {
    deliverySlots: value?.deliverySlots?.length === 2 ? value.deliverySlots : emptyZone.deliverySlots,
    daysOfWeek: value?.daysOfWeek || emptyZone.daysOfWeek,
    cutoff: value?.cutoff || emptyZone.cutoff,
    timezone: value?.timezone || emptyZone.timezone,
  };
};

export function ShippingOptionsPage({ notify }: { notify: Notify }) {
  const [tab, setTab] = useState<Tab>("options");
  const [busy, setBusy] = useState(false);
  const [addingOption, setAddingOption] = useState(false);
  const [editingOption, setEditingOption] = useState<ShippingOption | null>(null);
  const [optionForm, setOptionForm] = useState<OptionForm>(emptyOption);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [addingZone, setAddingZone] = useState(false);
  const [zoneForm, setZoneForm] = useState<ZoneForm>(emptyZone);
  const [quoteForm, setQuoteForm] = useState({ postalCode: "", neighborhood: "", city: "", province: "", subtotal: "0", weightGrams: "" });
  const optionsQuery = useQuery({ queryKey: ["shipping", "options"], queryFn: () => api.shippingOptions() });
  const zonesQuery = useQuery({ queryKey: ["shipping", "zones"], queryFn: () => api.shippingZones() });
  const quoteQuery = useQuery<ShippingQuote>({
    queryKey: ["shipping", "quote"],
    queryFn: () => api.shippingQuote({ ...quoteForm, weightGrams: quoteForm.weightGrams ? Number(quoteForm.weightGrams) : undefined }),
    enabled: false,
  });
  const options = optionsQuery.data || [];
  const zones = zonesQuery.data || [];

  const saveOption = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const body = { name: optionForm.name, description: optionForm.description || null, cost: optionForm.cost, displayOrder: Number(optionForm.displayOrder || 0), active: optionForm.active };
      if (editingOption) await api.updateShippingOption(editingOption.id, body); else await api.createShippingOption(body);
      await optionsQuery.refetch(); setAddingOption(false); setEditingOption(null); setOptionForm(emptyOption); notify(editingOption ? "Opción de envío actualizada." : "Opción de envío creada.");
    } catch (error) { notify((error as Error).message, "error"); } finally { setBusy(false); }
  };
  const startOptionEdit = (option: ShippingOption) => {
    setAddingOption(true); setEditingOption(option); setOptionForm({ name: option.name, description: option.description || "", cost: option.cost, displayOrder: String(option.displayOrder), active: option.active });
  };
  const startZoneEdit = (zone: ShippingZone) => {
    const windows = windowFromZone(zone);
    setEditingZone(zone); setZoneForm({ name: zone.name, type: zone.type, postalCodes: zone.postalCodes.join(", "), neighborhoods: zone.neighborhoods.join(", "), cost: zone.cost, freeShippingFrom: zone.freeShippingFrom || "", maxWeightGrams: zone.maxWeightGrams == null ? "" : String(zone.maxWeightGrams), estimatedDaysMin: String(zone.estimatedDaysMin), estimatedDaysMax: String(zone.estimatedDaysMax), priority: String(zone.priority), active: zone.active, polygon: zone.polygon ? JSON.stringify(zone.polygon, null, 2) : "", ...windows });
  };
  const saveZone = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      let polygon: unknown = undefined;
      if (zoneForm.polygon.trim()) polygon = JSON.parse(zoneForm.polygon);
      const body = { name: zoneForm.name, type: zoneForm.type, active: zoneForm.active, priority: Number(zoneForm.priority || 0), postalCodes: zoneForm.postalCodes.split(",").map((value) => value.trim()).filter(Boolean), neighborhoods: zoneForm.neighborhoods.split(",").map((value) => value.trim()).filter(Boolean), ...(polygon === undefined ? {} : { polygon }), cost: zoneForm.cost, freeShippingFrom: zoneForm.freeShippingFrom || null, maxWeightGrams: zoneForm.maxWeightGrams ? Number(zoneForm.maxWeightGrams) : null, estimatedDaysMin: Number(zoneForm.estimatedDaysMin), estimatedDaysMax: Number(zoneForm.estimatedDaysMax), deliveryWindows: asWindows(zoneForm) };
      if (editingZone) await api.updateShippingZone(editingZone.id, body); else await api.createShippingZone(body);
      await zonesQuery.refetch(); setAddingZone(false); setEditingZone(null); setZoneForm(emptyZone); notify(editingZone ? "Zona actualizada." : "Zona creada.");
    } catch (error) { notify(error instanceof SyntaxError ? "El polígono debe ser un JSON válido." : (error as Error).message, "error"); } finally { setBusy(false); }
  };
  const runQuote = async (event: FormEvent) => { event.preventDefault(); await quoteQuery.refetch(); };
  const updateSlot = (index: number, key: "id" | "label" | "start" | "end", value: string) => setZoneForm((current) => ({ ...current, deliverySlots: current.deliverySlots.map((slot, slotIndex) => slotIndex === index ? { ...slot, [key]: value } : slot) }));

  return <>
    <PageHeader eyebrow="Configuración" title="Envíos" description="Administrá métodos, cobertura y ventanas de entrega." actions={tab !== "quote" && <button className="button primary" onClick={() => { if (tab === "options") { setAddingOption(true); setEditingOption(null); setOptionForm({ ...emptyOption }); } else { setAddingZone(true); setEditingZone(null); setZoneForm({ ...emptyZone, deliverySlots: emptyZone.deliverySlots.map((slot) => ({ ...slot })), daysOfWeek: [...emptyZone.daysOfWeek] }); } }}><Plus size={17} /> Nuevo {tab === "options" ? "método" : "zona"}</button>} />
    <section className="panel settings-tabs shipping-module">
      <div className="tab-list" role="tablist">{([ ["options", "Métodos de envío"], ["zones", "Zonas de cobertura"], ["quote", "Simulador"] ] as Array<[Tab, string]>).map(([key, label]) => <button type="button" role="tab" aria-selected={tab === key} className={tab === key ? "selected" : ""} key={key} onClick={() => setTab(key)}>{label}</button>)}</div>
      <div className="settings-tab-content">
        {tab === "options" && <>
          <div className="section-title"><h2>Métodos disponibles</h2><p>El costo base se combina con la zona y el subsidio de pricing.</p></div>
          {(addingOption || editingOption) && <form className="panel edit-panel" onSubmit={saveOption}><div className="panel-heading"><div><h2>{editingOption ? "Editar método" : "Nuevo método"}</h2></div><button type="button" className="icon-button" onClick={() => { setAddingOption(false); setEditingOption(null); setOptionForm(emptyOption); }}><X size={18} /></button></div><div className="form-grid"><Field label="Nombre"><input value={optionForm.name} onChange={(event) => setOptionForm({ ...optionForm, name: event.target.value })} required /></Field><Field label="Costo base"><input inputMode="decimal" value={optionForm.cost} onChange={(event) => setOptionForm({ ...optionForm, cost: event.target.value })} required /></Field><Field label="Orden"><input type="number" min="0" value={optionForm.displayOrder} onChange={(event) => setOptionForm({ ...optionForm, displayOrder: event.target.value })} /></Field><label className="check-field form-check"><input type="checkbox" checked={optionForm.active} onChange={(event) => setOptionForm({ ...optionForm, active: event.target.checked })} /> Activo</label><Field label="Descripción" wide><textarea rows={2} value={optionForm.description} onChange={(event) => setOptionForm({ ...optionForm, description: event.target.value })} /></Field></div><div className="form-actions"><button type="button" className="button ghost" onClick={() => { setAddingOption(false); setEditingOption(null); setOptionForm(emptyOption); }}>Cancelar</button><button className="button primary" disabled={busy}>Guardar</button></div></form>}
          {optionsQuery.error ? <AsyncError message={optionsQuery.error.message} /> : optionsQuery.isPending ? <div className="loading-row">Cargando métodos…</div> : options.length === 0 ? <div className="empty-state"><Truck size={28} /><strong>No hay métodos configurados</strong><p>Creá el primer método de envío.</p></div> : <div className="settings-list">{options.map((option) => <article className={`settings-list-row ${option.active ? "" : "inactive"}`} key={option.id}><div><strong>{option.name}</strong><small>{option.description || "Sin descripción"} · {money(option.cost)} · Orden {option.displayOrder}</small></div><StatusBadge status={option.active ? "ACTIVE" : "ARCHIVED"} /><button className="button small ghost" onClick={() => startOptionEdit(option)}>Editar</button></article>)}</div>}
        </>}
        {tab === "zones" && <>
          <div className="section-title"><h2>Zonas de cobertura</h2><p>Definí localidades, códigos postales, costos y límites de entrega.</p></div>
          {(addingZone || editingZone) && <form className="panel edit-panel" onSubmit={saveZone}><div className="panel-heading"><div><h2>{editingZone ? "Editar zona" : "Nueva zona"}</h2><p>Las listas se separan con comas.</p></div><button type="button" className="icon-button" onClick={() => { setAddingZone(false); setEditingZone(null); setZoneForm(emptyZone); }}><X size={18} /></button></div><div className="form-grid"><Field label="Nombre"><input value={zoneForm.name} onChange={(event) => setZoneForm({ ...zoneForm, name: event.target.value })} required /></Field><Field label="Tipo"><select value={zoneForm.type} onChange={(event) => setZoneForm({ ...zoneForm, type: event.target.value as ShippingZone["type"] })}><option value="NEIGHBORHOOD">Localidad / barrio</option><option value="POSTAL_CODE">Código postal</option><option value="POLYGON">Polígono</option></select></Field><Field label="Costo"><input inputMode="decimal" value={zoneForm.cost} onChange={(event) => setZoneForm({ ...zoneForm, cost: event.target.value })} required /></Field><Field label="Prioridad"><input type="number" value={zoneForm.priority} onChange={(event) => setZoneForm({ ...zoneForm, priority: event.target.value })} /></Field><Field label="Códigos postales" wide><input value={zoneForm.postalCodes} onChange={(event) => setZoneForm({ ...zoneForm, postalCodes: event.target.value })} placeholder="1000, 1400, 1414" /></Field><Field label="Localidades / barrios" wide><input value={zoneForm.neighborhoods} onChange={(event) => setZoneForm({ ...zoneForm, neighborhoods: event.target.value })} placeholder="CABA, Vicente López" /></Field><Field label="Envío gratis desde"><input inputMode="decimal" value={zoneForm.freeShippingFrom} onChange={(event) => setZoneForm({ ...zoneForm, freeShippingFrom: event.target.value })} placeholder="Opcional" /></Field><Field label="Peso máximo (gramos)"><input type="number" min="1" value={zoneForm.maxWeightGrams} onChange={(event) => setZoneForm({ ...zoneForm, maxWeightGrams: event.target.value })} /></Field><Field label="Días mínimo"><input type="number" min="0" value={zoneForm.estimatedDaysMin} onChange={(event) => setZoneForm({ ...zoneForm, estimatedDaysMin: event.target.value })} required /></Field><Field label="Días máximo"><input type="number" min="0" value={zoneForm.estimatedDaysMax} onChange={(event) => setZoneForm({ ...zoneForm, estimatedDaysMax: event.target.value })} required /></Field><Field label="Polígono JSON" wide><textarea rows={2} value={zoneForm.polygon} onChange={(event) => setZoneForm({ ...zoneForm, polygon: event.target.value })} placeholder="Opcional para zonas tipo POLYGON" /></Field><label className="check-field form-check"><input type="checkbox" checked={zoneForm.active} onChange={(event) => setZoneForm({ ...zoneForm, active: event.target.checked })} /> Activa</label></div><div className="shipping-window-form"><h3>Ventanas de entrega</h3><div className="form-grid">{zoneForm.deliverySlots.map((slot, index) => <div className="shipping-slot" key={`${slot.id}-${index}`}><strong>Franja {index + 1}</strong><input aria-label={`Id de franja ${index + 1}`} value={slot.id} onChange={(event) => updateSlot(index, "id", event.target.value)} placeholder="MORNING" required /><input aria-label={`Etiqueta de franja ${index + 1}`} value={slot.label} onChange={(event) => updateSlot(index, "label", event.target.value)} placeholder="10:00 a 12:00" required /><div><input aria-label={`Inicio de franja ${index + 1}`} type="time" value={slot.start} onChange={(event) => updateSlot(index, "start", event.target.value)} required /> <input aria-label={`Fin de franja ${index + 1}`} type="time" value={slot.end} onChange={(event) => updateSlot(index, "end", event.target.value)} required /></div></div>)}<Field label="Corte diario"><input type="time" value={zoneForm.cutoff} onChange={(event) => setZoneForm({ ...zoneForm, cutoff: event.target.value })} required /></Field><Field label="Zona horaria"><input value={zoneForm.timezone} onChange={(event) => setZoneForm({ ...zoneForm, timezone: event.target.value })} required /></Field></div><div className="shipping-days"><span>Días de entrega</span>{dayLabels.map((label, index) => <label key={label}><input type="checkbox" checked={zoneForm.daysOfWeek.includes(index + 1)} onChange={(event) => setZoneForm({ ...zoneForm, daysOfWeek: event.target.checked ? [...zoneForm.daysOfWeek, index + 1].sort() : zoneForm.daysOfWeek.filter((day) => day !== index + 1) })} /> {label}</label>)}</div></div><div className="form-actions"><button type="button" className="button ghost" onClick={() => { setAddingZone(false); setEditingZone(null); setZoneForm(emptyZone); }}>Cancelar</button><button className="button primary" disabled={busy}>Guardar zona</button></div></form>}
          {zonesQuery.error ? <AsyncError message={zonesQuery.error.message} /> : zonesQuery.isPending ? <div className="loading-row">Cargando zonas…</div> : <div className="settings-list">{zones.map((zone) => <article className={`settings-list-row ${zone.active ? "" : "inactive"}`} key={zone.id}><div><strong>{zone.name}</strong><small>{zone.type} · {money(zone.cost)} · {zone.estimatedDaysMin}-{zone.estimatedDaysMax} días · Prioridad {zone.priority}</small><small>{zone.neighborhoods.length ? zone.neighborhoods.join(", ") : zone.postalCodes.join(", ") || "Cobertura geométrica"}</small></div><StatusBadge status={zone.active ? "ACTIVE" : "ARCHIVED"} /><button className="button small ghost" onClick={() => startZoneEdit(zone)}>Editar</button></article>)}</div>}
        </>}
        {tab === "quote" && <><div className="section-title"><h2>Simular cotización</h2><p>Consulta el cálculo interno que usa cobertura, IVA y subsidio de pricing.</p></div><form className="panel quote-form" onSubmit={runQuote}><div className="form-grid"><Field label="Código postal"><input value={quoteForm.postalCode} onChange={(event) => setQuoteForm({ ...quoteForm, postalCode: event.target.value })} /></Field><Field label="Localidad / barrio"><input value={quoteForm.neighborhood} onChange={(event) => setQuoteForm({ ...quoteForm, neighborhood: event.target.value })} /></Field><Field label="Ciudad"><input value={quoteForm.city} onChange={(event) => setQuoteForm({ ...quoteForm, city: event.target.value })} /></Field><Field label="Provincia"><input value={quoteForm.province} onChange={(event) => setQuoteForm({ ...quoteForm, province: event.target.value })} /></Field><Field label="Subtotal"><input inputMode="decimal" value={quoteForm.subtotal} onChange={(event) => setQuoteForm({ ...quoteForm, subtotal: event.target.value })} required /></Field><Field label="Peso (gramos)"><input type="number" min="0" value={quoteForm.weightGrams} onChange={(event) => setQuoteForm({ ...quoteForm, weightGrams: event.target.value })} required /></Field></div><div className="form-actions end"><button className="button primary" disabled={quoteQuery.isFetching}><Map size={16} /> Calcular envío</button></div></form>{quoteQuery.error ? <AsyncError message={quoteQuery.error.message} /> : quoteQuery.data && <QuoteResult quote={quoteQuery.data} />}</>}
      </div>
    </section>
  </>;
}

function QuoteResult({ quote }: { quote: ShippingQuote }) {
  if (!quote.available) return <div className="inline-error"><AlertTriangle size={17} /><div><strong>Envío no disponible</strong><p>{quote.message}</p></div></div>;
  return <section className="panel quote-result"><div className="panel-heading"><div><h2><Check size={18} /> Envío disponible</h2><p>{quote.zoneName || "Zona sin nombre"} · {quote.estimate || "Sin estimación"}</p></div><strong className="quote-total">{money(quote.cost)}</strong></div><div className="analysis-grid"><div className="analysis-item"><span>Costo logístico</span><strong>{money(quote.providerCost)}</strong></div><div className="analysis-item"><span>IVA</span><strong>{money(quote.vat)}</strong></div><div className="analysis-item"><span>Subsidio</span><strong>{money(quote.subsidy)}</strong></div><div className="analysis-item"><span>Entregas</span><strong>{quote.deliveryCount}</strong></div><div className="analysis-item"><span>Cortes</span><strong>{quote.cutoffs.map((cutoff) => `${cutoff.time} ${cutoff.coverage}`).join(" · ") || "—"}</strong></div><div className="analysis-item"><span>Franjas</span><strong>{quote.deliverySlots.length ? quote.deliverySlots.map((slot) => <span className="quote-slot" key={`${slot.date}-${slot.id}`}><b>{weekday(slot.date)}</b> {slot.label}</span>) : "—"}</strong></div></div></section>;
}
