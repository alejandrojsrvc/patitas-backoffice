import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Gift, Landmark, Plus, Tag, Trash2 } from "lucide-react";
import { api } from "../../../api";
import type { Notify } from "../../../app/navigation";
import type { Coupon, DataState, Promotion, PromotionKind, PromotionTarget, PromotionType, PurchaseScheduleConfiguration, TransferBenefitConfiguration } from "../../../types";
import { AsyncError, Field, PageHeader, StatusBadge } from "../../../shared/components";
import { money } from "../../../shared/formatters";

type Tab = "promotions" | "coupons" | "schedule" | "transfer";
type TargetScope = "productId" | "variantId" | "categoryId" | "brandId";
type TargetForm = { scope: TargetScope; id: string };
type BundleForm = { variantId: string; quantity: string };
type PromotionForm = {
  name: string; type: PromotionType; kind: PromotionKind; value: string; active: boolean;
  startsAt: string; endsAt: string; priority: string; minimumSubtotal: string;
  maxRedemptions: string; targets: TargetForm[]; bundleItems: BundleForm[];
};
type CouponForm = { promotionId: string; code: string; active: boolean; startsAt: string; endsAt: string; maxRedemptions: string; perCustomerLimit: string };
type ScheduleForm = { enabled: boolean; discountPercent: string; leadDays: string };
type TransferForm = { enabled: boolean; discountPercent: string; expirationMinutes: string; accountHolder: string; bank: string; alias: string; cbu: string; note: string };

const emptyPromotion: PromotionForm = {
  name: "", type: "PERCENTAGE", kind: "DISCOUNT", value: "", active: true,
  startsAt: "", endsAt: "", priority: "0", minimumSubtotal: "", maxRedemptions: "",
  targets: [], bundleItems: [],
};
const emptyCoupon: CouponForm = { promotionId: "", code: "", active: true, startsAt: "", endsAt: "", maxRedemptions: "", perCustomerLimit: "" };
const emptySchedule: ScheduleForm = { enabled: true, discountPercent: "", leadDays: "" };
const emptyTransfer: TransferForm = { enabled: false, discountPercent: "", expirationMinutes: "", accountHolder: "", bank: "", alias: "", cbu: "", note: "" };
const targetScopes: Array<[TargetScope, string]> = [["productId", "Producto"], ["variantId", "Variante"], ["categoryId", "Categoría"], ["brandId", "Marca"]];

const localDateTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};
const isoDateTime = (value: string) => value ? new Date(value).toISOString() : null;
const numberOrNull = (value: string) => value.trim() ? Number(value) : null;
const targetFromApi = (target: PromotionTarget): TargetForm | null => {
  for (const scope of ["variantId", "productId", "categoryId", "brandId"] as TargetScope[]) {
    if (target[scope]) return { scope, id: target[scope] as string };
  }
  return null;
};
const promotionToForm = (promotion: Promotion): PromotionForm => ({
  name: promotion.name, type: promotion.type, kind: promotion.kind, value: promotion.value, active: promotion.active,
  startsAt: localDateTime(promotion.startsAt), endsAt: localDateTime(promotion.endsAt), priority: String(promotion.priority),
  minimumSubtotal: promotion.minimumSubtotal || "", maxRedemptions: promotion.maxRedemptions == null ? "" : String(promotion.maxRedemptions),
  targets: promotion.targets.map(targetFromApi).filter((target): target is TargetForm => Boolean(target)),
  bundleItems: promotion.bundleItems.map((item) => ({ variantId: item.variantId, quantity: String(item.quantity) })),
});
const couponToForm = (coupon: Coupon): CouponForm => ({
  promotionId: coupon.promotionId, code: coupon.code, active: coupon.active, startsAt: localDateTime(coupon.startsAt), endsAt: localDateTime(coupon.endsAt),
  maxRedemptions: coupon.maxRedemptions == null ? "" : String(coupon.maxRedemptions), perCustomerLimit: coupon.perCustomerLimit == null ? "" : String(coupon.perCustomerLimit),
});
const promotionValue = (promotion: Promotion) => promotion.kind === "BUNDLE" ? `Combo a ${money(promotion.value)}` : promotion.type === "PERCENTAGE" ? `${promotion.value}%` : money(promotion.value);
const promotionScope = (promotion: Promotion) => promotion.targets.length ? `${promotion.targets.length} objetivo${promotion.targets.length === 1 ? "" : "s"}` : "Todo el catálogo";

export function PromotionsBenefitsPage({ data, notify }: { data: DataState; notify: Notify }) {
  const [tab, setTab] = useState<Tab>("promotions");
  const promotionsQuery = useQuery({ queryKey: ["promotions"], queryFn: api.promotions });
  const couponsQuery = useQuery({ queryKey: ["coupons"], queryFn: api.coupons });
  const scheduleQuery = useQuery({ queryKey: ["purchase-schedule", "configuration"], queryFn: api.purchaseScheduleConfiguration });
  const transferQuery = useQuery({ queryKey: ["transfer-benefit", "configuration"], queryFn: api.transferBenefitConfiguration });

  return <>
    <PageHeader eyebrow="Ventas" title="Promociones y beneficios" description="Administrá incentivos disponibles para el checkout." />
    <section className="panel settings-tabs benefits-module">
      <div className="tab-list" role="tablist">
        {([["promotions", "Promociones", Gift], ["coupons", "Cupones", Tag], ["schedule", "Compra programada", CalendarDays], ["transfer", "Transferencia", Landmark]] as const).map(([key, label, Icon]) => <button type="button" role="tab" aria-selected={tab === key} className={tab === key ? "selected" : ""} key={key} onClick={() => setTab(key)}><Icon size={15} />{label}</button>)}
      </div>
      <div className="settings-tab-content">
        {tab === "promotions" && <PromotionsTab data={data} query={promotionsQuery} notify={notify} />}
        {tab === "coupons" && <CouponsTab promotions={promotionsQuery.data || []} query={couponsQuery} notify={notify} />}
        {tab === "schedule" && <ScheduleTab query={scheduleQuery} notify={notify} />}
        {tab === "transfer" && <TransferTab query={transferQuery} notify={notify} />}
      </div>
    </section>
  </>;
}

function PromotionAction({ onClick }: { onClick: () => void }) {
  return <button className="button primary" type="button" onClick={onClick}><Plus size={17} /> Nueva promoción</button>;
}
function CouponAction({ onClick }: { onClick: () => void }) {
  return <button className="button primary" type="button" onClick={onClick}><Plus size={17} /> Nuevo cupón</button>;
}

function PromotionsTab({ data, query, notify }: { data: DataState; query: ReturnType<typeof useQuery<Promotion[]>>; notify: Notify }) {
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<PromotionForm>(emptyPromotion);

  const startEdit = (promotion: Promotion) => { setEditing(promotion); setAdding(true); setForm(promotionToForm(promotion)); };
  const closeForm = () => { setEditing(null); setAdding(false); setForm({ ...emptyPromotion, targets: [], bundleItems: [] }); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.value.trim()) return notify("Completá el nombre y el valor de la promoción.", "error");
    if (form.type === "PERCENTAGE" && (Number(form.value) < 0 || Number(form.value) > 100)) return notify("El porcentaje debe estar entre 0 y 100.", "error");
    if (form.startsAt && form.endsAt && new Date(form.startsAt) > new Date(form.endsAt)) return notify("La fecha de inicio no puede ser posterior a la fecha de fin.", "error");
    if (form.targets.some((target) => !target.id)) return notify("Completá todos los objetivos o quitá las filas vacías.", "error");
    if (form.kind === "BUNDLE" && (!form.bundleItems.length || form.bundleItems.some((item) => !item.variantId || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1))) return notify("Un combo debe tener variantes y cantidades válidas.", "error");
    const body = {
      name: form.name.trim(), type: form.type, kind: form.kind, value: form.value, active: form.active,
      startsAt: isoDateTime(form.startsAt), endsAt: isoDateTime(form.endsAt), priority: Number(form.priority || 0),
      minimumSubtotal: form.minimumSubtotal.trim() ? form.minimumSubtotal : null, maxRedemptions: numberOrNull(form.maxRedemptions),
      targets: form.targets.map((target) => ({ productId: target.scope === "productId" ? target.id : null, variantId: target.scope === "variantId" ? target.id : null, categoryId: target.scope === "categoryId" ? target.id : null, brandId: target.scope === "brandId" ? target.id : null })),
      bundleItems: form.kind === "BUNDLE" ? form.bundleItems.map((item) => ({ variantId: item.variantId, quantity: Number(item.quantity) })) : [],
    };
    const wasEditing = Boolean(editing);
    try { if (editing) await api.updatePromotion(editing.id, body); else await api.createPromotion(body); await query.refetch(); closeForm(); notify(wasEditing ? "Promoción actualizada." : "Promoción creada."); }
    catch (error) { notify((error as Error).message, "error"); }
  };
  const updateTarget = (index: number, key: keyof TargetForm, value: string) => setForm((current) => ({ ...current, targets: current.targets.map((target, targetIndex) => targetIndex === index ? { ...target, [key]: value, ...(key === "scope" ? { id: "" } : {}) } : target) }));
  const updateBundle = (index: number, key: keyof BundleForm, value: string) => setForm((current) => ({ ...current, bundleItems: current.bundleItems.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  return <>
    <div className="section-title"><div><h2>Promociones automáticas</h2><p>El checkout decide si una promoción aplica y cómo se combina con otros beneficios.</p></div><PromotionAction onClick={() => { setAdding(true); setEditing(null); setForm({ ...emptyPromotion, targets: [], bundleItems: [] }); }} /></div>
    {adding && <form className="panel edit-panel" onSubmit={save}><div className="panel-heading"><div><h2>{editing ? "Editar promoción" : "Nueva promoción"}</h2><p>Los cambios se aplican según las validaciones del backend.</p></div><button type="button" className="button ghost small" onClick={closeForm}>Cancelar</button></div><div className="form-grid">
      <Field label="Nombre"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
      <Field label="Tipo"><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as PromotionType })}><option value="PERCENTAGE">Porcentaje</option><option value="FIXED">Importe fijo</option></select></Field>
      <Field label="Clase"><select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as PromotionKind })}><option value="DISCOUNT">Descuento</option><option value="BUNDLE">Combo</option></select></Field>
      <Field label={form.kind === "BUNDLE" ? "Precio final del combo" : form.type === "PERCENTAGE" ? "Porcentaje" : "Importe"}><input inputMode="decimal" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} required /></Field>
      <Field label="Prioridad"><input type="number" min="0" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} /></Field>
      <Field label="Subtotal mínimo"><input inputMode="decimal" value={form.minimumSubtotal} onChange={(event) => setForm({ ...form, minimumSubtotal: event.target.value })} placeholder="Opcional" /></Field>
      <Field label="Máximo de usos"><input type="number" min="1" value={form.maxRedemptions} onChange={(event) => setForm({ ...form, maxRedemptions: event.target.value })} placeholder="Sin límite" /></Field>
      <label className="check-field form-check"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Activa</label>
      <Field label="Comienza"><input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></Field>
      <Field label="Finaliza"><input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></Field>
      <div className="form-section wide"><div className="subsection-heading"><div><h3>Objetivos</h3><p>Sin objetivos, la promoción aplica al catálogo completo.</p></div><button type="button" className="button secondary small" onClick={() => setForm({ ...form, targets: [...form.targets, { scope: "productId", id: "" }] })}><Plus size={15} /> Agregar objetivo</button></div>{form.targets.length === 0 ? <p className="form-hint">No hay objetivos específicos.</p> : <div className="repeat-list">{form.targets.map((target, index) => <div className="repeat-row" key={`${index}-${target.scope}`}><select aria-label={`Tipo de objetivo ${index + 1}`} value={target.scope} onChange={(event) => updateTarget(index, "scope", event.target.value)}>{targetScopes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select aria-label={`Objetivo ${index + 1}`} value={target.id} onChange={(event) => updateTarget(index, "id", event.target.value)}><option value="">Seleccionar {targetScopes.find(([value]) => value === target.scope)?.[1].toLowerCase()}</option>{target.scope === "productId" && data.products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}{target.scope === "variantId" && data.products.flatMap((product) => product.variants.map((variant) => <option key={variant.id} value={variant.id}>{product.name} · {variant.sku || variant.presentation || variant.id}</option>))}{target.scope === "categoryId" && data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}{target.scope === "brandId" && data.brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className="icon-button" aria-label="Quitar objetivo" onClick={() => setForm({ ...form, targets: form.targets.filter((_, targetIndex) => targetIndex !== index) })}><Trash2 size={16} /></button></div>)}</div>}</div>
      {form.kind === "BUNDLE" && <div className="form-section wide"><div className="subsection-heading"><div><h3>Componentes del combo</h3><p>El checkout exige estas cantidades para aplicar el precio del combo.</p></div><button type="button" className="button secondary small" onClick={() => setForm({ ...form, bundleItems: [...form.bundleItems, { variantId: "", quantity: "1" }] })}><Plus size={15} /> Agregar variante</button></div>{form.bundleItems.length === 0 ? <p className="form-hint">Agregá al menos una variante.</p> : <div className="repeat-list">{form.bundleItems.map((item, index) => <div className="repeat-row" key={`${index}-${item.variantId}`}><select aria-label={`Variante del combo ${index + 1}`} value={item.variantId} onChange={(event) => updateBundle(index, "variantId", event.target.value)}><option value="">Seleccionar variante</option>{data.products.flatMap((product) => product.variants.map((variant) => <option key={variant.id} value={variant.id}>{product.name} · {variant.sku || variant.presentation || variant.id}</option>))}</select><input aria-label={`Cantidad del combo ${index + 1}`} type="number" min="1" value={item.quantity} onChange={(event) => updateBundle(index, "quantity", event.target.value)} /><button type="button" className="icon-button" aria-label="Quitar variante" onClick={() => setForm({ ...form, bundleItems: form.bundleItems.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={16} /></button></div>)}</div>}</div>}
    </div><div className="form-actions"><button type="button" className="button ghost" onClick={closeForm}>Cancelar</button><button className="button primary">Guardar promoción</button></div></form>}
    {query.error ? <AsyncError message={query.error.message} /> : query.isPending ? <div className="loading-row">Cargando promociones…</div> : query.data?.length ? <div className="settings-list">{query.data.map((promotion) => <article className={`settings-list-row ${promotion.active ? "" : "inactive"}`} key={promotion.id}><div><strong>{promotion.name}</strong><small>{promotion.kind === "BUNDLE" ? "Combo" : "Descuento"} · {promotionValue(promotion)} · {promotionScope(promotion)} · Prioridad {promotion.priority}</small><small>{promotion.redemptionCount}{promotion.maxRedemptions == null ? " usos" : ` de ${promotion.maxRedemptions} usos`} · {promotion.startsAt ? `Desde ${new Date(promotion.startsAt).toLocaleDateString("es-AR")}` : "Sin inicio"}{promotion.endsAt ? ` hasta ${new Date(promotion.endsAt).toLocaleDateString("es-AR")}` : ""}</small></div><StatusBadge status={promotion.active ? "ACTIVE" : "ARCHIVED"} /><button type="button" className="button small ghost" onClick={() => startEdit(promotion)}>Editar</button></article>)}</div> : <div className="empty-state"><Gift size={28} /><strong>No hay promociones configuradas</strong><p>Creá una promoción automática para el checkout.</p></div>}
  </>;
}

function CouponsTab({ promotions, query, notify }: { promotions: Promotion[]; query: ReturnType<typeof useQuery<Coupon[]>>; notify: Notify }) {
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyCoupon);
  const startEdit = (coupon: Coupon) => { setEditing(coupon); setAdding(true); setForm(couponToForm(coupon)); };
  const closeForm = () => { setAdding(false); setEditing(null); setForm({ ...emptyCoupon }); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.promotionId || !/^[A-Za-z0-9][A-Za-z0-9_-]{2,79}$/.test(form.code.trim())) return notify("Elegí una promoción y usá un código de 3 a 80 caracteres alfanuméricos, guion o guion bajo.", "error");
    if (form.startsAt && form.endsAt && new Date(form.startsAt) > new Date(form.endsAt)) return notify("La fecha de inicio no puede ser posterior a la fecha de fin.", "error");
    const body = { promotionId: form.promotionId, code: form.code.trim().toUpperCase(), active: form.active, startsAt: isoDateTime(form.startsAt), endsAt: isoDateTime(form.endsAt), maxRedemptions: numberOrNull(form.maxRedemptions), perCustomerLimit: numberOrNull(form.perCustomerLimit) };
    const wasEditing = Boolean(editing);
    try { if (editing) await api.updateCoupon(editing.id, body); else await api.createCoupon(body); await query.refetch(); closeForm(); notify(wasEditing ? "Cupón actualizado." : "Cupón creado."); } catch (error) { notify((error as Error).message, "error"); }
  };
  return <>
    <div className="section-title"><div><h2>Cupones</h2><p>Asociá códigos a promociones existentes; el checkout valida su vigencia y límites.</p></div><CouponAction onClick={() => { setAdding(true); setEditing(null); setForm({ ...emptyCoupon }); }} /></div>
    {adding && <form className="panel edit-panel" onSubmit={save}><div className="panel-heading"><div><h2>{editing ? "Editar cupón" : "Nuevo cupón"}</h2></div><button type="button" className="button ghost small" onClick={closeForm}>Cancelar</button></div><div className="form-grid"><Field label="Promoción"><select value={form.promotionId} onChange={(event) => setForm({ ...form, promotionId: event.target.value })} required><option value="">Seleccionar promoción</option>{promotions.map((promotion) => <option key={promotion.id} value={promotion.id}>{promotion.name} · {promotionValue(promotion)}</option>)}</select></Field><Field label="Código"><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} required maxLength={80} /></Field><Field label="Máximo de usos"><input type="number" min="1" value={form.maxRedemptions} onChange={(event) => setForm({ ...form, maxRedemptions: event.target.value })} placeholder="Sin límite" /></Field><Field label="Límite por cliente"><input type="number" min="1" value={form.perCustomerLimit} onChange={(event) => setForm({ ...form, perCustomerLimit: event.target.value })} placeholder="Sin límite" /></Field><label className="check-field form-check"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Activo</label><Field label="Comienza"><input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></Field><Field label="Finaliza"><input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></Field></div><div className="form-actions"><button type="button" className="button ghost" onClick={closeForm}>Cancelar</button><button className="button primary">Guardar cupón</button></div></form>}
    {query.error ? <AsyncError message={query.error.message} /> : query.isPending ? <div className="loading-row">Cargando cupones…</div> : query.data?.length ? <div className="settings-list">{query.data.map((coupon) => <article className={`settings-list-row ${coupon.active ? "" : "inactive"}`} key={coupon.id}><div><strong className="mono">{coupon.code}</strong><small>{coupon.promotion.name} · {promotionValue(coupon.promotion)}</small><small>{coupon.redemptionCount}{coupon.maxRedemptions == null ? " usos" : ` de ${coupon.maxRedemptions} usos`}{coupon.perCustomerLimit == null ? "" : ` · ${coupon.perCustomerLimit} por cliente`}</small></div><StatusBadge status={coupon.active ? "ACTIVE" : "ARCHIVED"} /><button type="button" className="button small ghost" onClick={() => startEdit(coupon)}>Editar</button></article>)}</div> : <div className="empty-state"><Tag size={28} /><strong>No hay cupones configurados</strong><p>Creá un código asociado a una promoción.</p></div>}
  </>;
}

function ScheduleTab({ query, notify }: { query: ReturnType<typeof useQuery<PurchaseScheduleConfiguration>>; notify: Notify }) {
  const [form, setForm] = useState<ScheduleForm>(emptySchedule);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (query.data) setForm({ enabled: query.data.enabled, discountPercent: query.data.discountPercent, leadDays: String(query.data.leadDays) }); }, [query.data]);
  const save = async (event: FormEvent) => { event.preventDefault(); setBusy(true); try { await api.updatePurchaseScheduleConfiguration({ enabled: form.enabled, discountPercent: form.discountPercent, leadDays: Number(form.leadDays) }); await query.refetch(); notify("Configuración de compra programada actualizada."); } catch (error) { notify((error as Error).message, "error"); } finally { setBusy(false); } };
  return <><div className="section-title"><div><h2>Compra programada</h2><p>Configurá el beneficio que se toma como snapshot al crear cada compra recurrente.</p></div></div>{query.error ? <AsyncError message={query.error.message} /> : query.isPending ? <div className="loading-row">Cargando configuración…</div> : <form className="panel edit-panel benefit-config-form" onSubmit={save}><div className="form-grid"><label className="check-field form-check wide"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /> Habilitar compra programada</label><Field label="Descuento (%)"><input inputMode="decimal" value={form.discountPercent} onChange={(event) => setForm({ ...form, discountPercent: event.target.value })} required /></Field><Field label="Anticipación mínima (días)"><input type="number" min="0" max="30" value={form.leadDays} onChange={(event) => setForm({ ...form, leadDays: event.target.value })} required /></Field></div><div className="settings-note"><CalendarDays size={17} /><p><strong>Frecuencias disponibles:</strong> 7, 14, 21 o 30 días. La compatibilidad con cupones, promociones, transferencia y envío la resuelve el backend.</p></div><div className="form-actions"><span className="form-hint">No modifica las reglas generales de pricing.</span><button className="button primary" disabled={busy}>Guardar configuración</button></div></form>}</>;
}

function TransferTab({ query, notify }: { query: ReturnType<typeof useQuery<TransferBenefitConfiguration>>; notify: Notify }) {
  const [form, setForm] = useState<TransferForm>(emptyTransfer);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const config = query.data; if (!config) return; setForm({ enabled: config.enabled, discountPercent: config.discountPercent, expirationMinutes: String(config.expirationMinutes), accountHolder: config.instructions?.accountHolder || "", bank: config.instructions?.bank || "", alias: config.instructions?.alias || "", cbu: config.instructions?.cbu || "", note: config.instructions?.note || "" }); }, [query.data]);
  const save = async (event: FormEvent) => { event.preventDefault(); if (form.enabled && (!form.accountHolder.trim() || !form.bank.trim() || (!form.alias.trim() && !form.cbu.trim()))) return notify("Para habilitar transferencia configurá titular, banco y alias o CBU.", "error"); setBusy(true); const hasInstructions = Boolean(form.accountHolder.trim() || form.bank.trim() || form.alias.trim() || form.cbu.trim() || form.note.trim()); const instructions = hasInstructions ? { accountHolder: form.accountHolder.trim(), bank: form.bank.trim(), alias: form.alias.trim() || null, cbu: form.cbu.trim() || null, note: form.note.trim() || null } : null; try { await api.updateTransferBenefitConfiguration({ enabled: form.enabled, discountPercent: form.discountPercent, expirationMinutes: Number(form.expirationMinutes), instructions }); await query.refetch(); notify("Beneficio por transferencia actualizado."); } catch (error) { notify((error as Error).message, "error"); } finally { setBusy(false); } };
  return <><div className="section-title"><div><h2>Beneficio por transferencia</h2><p>Administrá el descuento y los datos que verá el cliente para informar el pago.</p></div></div>{query.error ? <AsyncError message={query.error.message} /> : query.isPending ? <div className="loading-row">Cargando configuración…</div> : <form className="panel edit-panel benefit-config-form" onSubmit={save}><div className="form-grid"><label className="check-field form-check wide"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /> Habilitar transferencia</label><Field label="Descuento (%)"><input inputMode="decimal" value={form.discountPercent} onChange={(event) => setForm({ ...form, discountPercent: event.target.value })} required /></Field><Field label="Vencimiento de reserva (minutos)"><input type="number" min="1" max="10080" value={form.expirationMinutes} onChange={(event) => setForm({ ...form, expirationMinutes: event.target.value })} required /></Field><Field label="Titular de la cuenta"><input value={form.accountHolder} onChange={(event) => setForm({ ...form, accountHolder: event.target.value })} maxLength={160} /></Field><Field label="Banco"><input value={form.bank} onChange={(event) => setForm({ ...form, bank: event.target.value })} maxLength={160} /></Field><Field label="Alias"><input value={form.alias} onChange={(event) => setForm({ ...form, alias: event.target.value })} maxLength={120} /></Field><Field label="CBU"><input value={form.cbu} onChange={(event) => setForm({ ...form, cbu: event.target.value })} maxLength={80} /></Field><Field label="Nota para el cliente" wide><textarea rows={3} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} maxLength={500} /></Field></div><div className="settings-note"><Landmark size={17} /><p>El backend calcula el importe esperado, la compatibilidad con otros beneficios y el estado del pago. El backoffice no contacta directamente a una pasarela.</p></div><div className="form-actions"><span className="form-hint">Alias o CBU: al menos uno es obligatorio al habilitar.</span><button className="button primary" disabled={busy}>Guardar configuración</button></div></form>}</>;
}
