import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { api } from "../../../api";
import type { DataState, Offer } from "../../../types";
import type { ToastKind, View } from "../../../app/navigation";
import { Field, PageHeader } from "../../../shared/components";
import { imageFileError } from "../utils";

export function NewProductPage({
  data,
  navigate,
  mutate,
  notify,
  openProduct,
}: {
  data: DataState;
  navigate: (view: View) => void;
  mutate: (fn: (d: DataState) => DataState) => void;
  notify: (m: string, k?: ToastKind) => void;
  openProduct: (id: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    brandId: "",
    name: "",
    categoryId: "",
    species: "Perro",
    description: "",
    presentation: "",
    sku: "",
    supplierId: "",
    unitCost: "",
    leadTimeHours: "48",
    imageAlt: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const save = async () => {
    setBusy(true);
    try {
      let product = await api.createProduct({
        name: form.name,
        brandId: form.brandId,
        categoryId: form.categoryId,
        species: form.species,
        description: form.description,
      });
      const variant = await api.createVariant(product.id, {
        sku: form.sku,
        presentation: form.presentation,
        active: true,
      });
      let createdOffer: Offer | null = null;
      if (form.supplierId && form.unitCost)
        createdOffer = await api.createOffer({
          supplierId: form.supplierId,
          variantId: variant.id,
          unitCost: form.unitCost,
          stockStatus: "AVAILABLE",
          leadTimeHours: Number(form.leadTimeHours),
        });
      const createdMedia =
        imageFile && form.imageAlt
          ? await api.uploadProductMedia(product.id, {
              file: imageFile,
              altText: form.imageAlt,
              displayOrder: 0,
            })
          : null;
      product.variants = [variant];
      product.media = createdMedia ? [createdMedia] : product.media;
      mutate((current) => ({
        ...current,
        products: [...current.products, product],
        offers: createdOffer
          ? [...current.offers, createdOffer]
          : current.offers,
      }));
      notify(
        "Borrador guardado. Para publicarlo, usá el importador de productos con sale_price.",
      );
      openProduct(product.id);
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Nuevo producto"
        description="Creá el producto y su primera variante en dos pasos."
        back={() => navigate("products")}
      />
      <div className="stepper">
        <div className={step >= 1 ? "active" : ""}>
          <span>{step > 1 ? <Check size={15} /> : "1"}</span>
          <p>
            <strong>Información</strong>
            <small>Datos del producto</small>
          </p>
        </div>
        <i />
        <div className={step >= 2 ? "active" : ""}>
          <span>2</span>
          <p>
            <strong>Variante y costo</strong>
            <small>SKU, proveedor e imagen</small>
          </p>
        </div>
      </div>
      <section className="panel form-panel">
        {step === 1 ? (
          <div className="form-content">
            <div className="section-title">
              <h2>Información del producto</h2>
              <p>Los datos que identifican el producto en el catálogo.</p>
            </div>
            <div className="form-grid">
              <Field label="Marca">
                <select
                  value={form.brandId}
                  onChange={(e) => update("brandId", e.target.value)}
                  required
                >
                  <option value="">Seleccionar marca</option>
                  {data.brands
                    .filter((item) => item.active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Nombre">
                <input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Ej. Adult"
                />
              </Field>
              <Field label="Categoría">
                <select
                  value={form.categoryId}
                  onChange={(e) => update("categoryId", e.target.value)}
                >
                  <option value="">Seleccionar categoría</option>
                  {data.categories
                    .filter((item) => item.active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Especie">
                <select
                  value={form.species}
                  onChange={(e) => update("species", e.target.value)}
                >
                  <option>Perro</option>
                  <option>Gato</option>
                </select>
              </Field>
              <Field label="Descripción" wide>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Descripción breve del producto…"
                  rows={4}
                />
              </Field>
            </div>
          </div>
        ) : (
          <div className="form-content">
            <div className="section-title">
              <h2>Primera variante</h2>
              <p>
                Definí el SKU y la imagen del borrador. El costo de proveedor es
                opcional y no reemplaza el precio de venta.
              </p>
            </div>
            <div className="form-grid">
              <Field label="Presentación">
                <input
                  value={form.presentation}
                  onChange={(e) => update("presentation", e.target.value)}
                  placeholder="Ej. 15 kg"
                />
              </Field>
              <Field label="SKU">
                <input
                  className="mono-input"
                  value={form.sku}
                  onChange={(e) => update("sku", e.target.value)}
                  placeholder="EXC-ADULT-15"
                />
              </Field>
              <Field label="Proveedor (opcional)">
                <select
                  value={form.supplierId}
                  onChange={(e) => update("supplierId", e.target.value)}
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
              <Field label="Costo de compra (opcional)">
                <div className="money-input">
                  <span>$</span>
                  <input
                    inputMode="numeric"
                    value={form.unitCost}
                    onChange={(e) =>
                      update("unitCost", e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="51.200"
                  />
                </div>
              </Field>
              <Field label="Lead time">
                <div className="suffix-input">
                  <input
                    inputMode="numeric"
                    value={form.leadTimeHours}
                    onChange={(e) =>
                      update("leadTimeHours", e.target.value.replace(/\D/g, ""))
                    }
                  />
                  <span>horas</span>
                </div>
              </Field>
              <Field label="Archivo de imagen">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    const error = file ? imageFileError(file) : null;
                    if (error) {
                      event.target.value = "";
                      setImageFile(null);
                      notify(error, "error");
                      return;
                    }
                    setImageFile(file);
                  }}
                />
                <small className="field-help">
                  JPEG, PNG, WebP o GIF · máximo 10 MB
                </small>
              </Field>
              <Field label="Texto alternativo">
                <input
                  value={form.imageAlt}
                  onChange={(e) => update("imageAlt", e.target.value)}
                  placeholder="Bolsa de alimento…"
                />
              </Field>
            </div>
            <div className="settings-note"><p>Para publicar este producto necesitás importarlo con las columnas <strong>sale_price</strong> e <strong>initial_stock</strong>. Las ofertas de proveedor se importan por separado.</p></div>
          </div>
        )}
        <div className="form-actions">
          {step === 1 ? (
            <>
              <button
                className="button ghost"
                onClick={() => navigate("products")}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={!form.name || !form.brandId || !form.categoryId}
                onClick={() => setStep(2)}
              >
                Continuar <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button className="button ghost" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Volver
              </button>
              <div className="push-actions">
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy || !form.sku || !form.presentation}
                  onClick={() => void save()}
                >
                  Guardar borrador
                </button>
                <button
                  className="button primary"
                  type="button"
                  disabled={busy}
                  onClick={() => navigate("product-import")}
                >
                  Ir a publicar por CSV
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
