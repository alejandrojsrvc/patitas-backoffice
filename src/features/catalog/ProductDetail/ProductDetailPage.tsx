import { FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, ChevronRight, Package, Pencil, Plus, X } from "lucide-react";
import { api } from "../../../api";
import type { AnalyticalCompositionItem, DataState, FeedingGuide, FeedingGuideEntry, Product, ProductMedia } from "../../../types";
import type { ToastKind, View } from "../../../app/navigation";
import { ConfirmDialog, Field, FulfillmentBadge, Info, PageHeader, PublicationBadge, StatusBadge } from "../../../shared/components";
import { money } from "../../../shared/formatters";
import { compositionPayload, compositionRows, formatPresentation, fulfillmentStatus, imageFileError } from "../utils";
import { getWinningOffer } from "../../pricing/calculations";

export function ProductDetailPage({
  product,
  data,
  editingFromRoute,
  navigate,
  editProduct,
  openVariant,
  mutate,
  notify,
}: {
  product: Product;
  data: DataState;
  editingFromRoute: boolean;
  navigate: (view: View) => void;
  editProduct: (id: string) => void;
  openVariant: (id: string, productId?: string) => void;
  mutate: (fn: (d: DataState) => DataState) => void;
  notify: (m: string, k?: ToastKind) => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(editingFromRoute);
  const [addingVariant, setAddingVariant] = useState(false);
  const [addingMedia, setAddingMedia] = useState(false);
  const [editingGuide, setEditingGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: product.name,
    brandId: product.brandId,
    categoryId: product.categoryId || "",
    species: product.species || "",
    line: product.line || "",
    lifeStage: product.lifeStage || "",
    breedSize: product.breedSize || "",
    description: product.description || "",
    ingredientsText: product.ingredientsText || "",
    featuredRank: product.featuredRank?.toString() || "",
    status: product.status,
  });
  const [composition, setComposition] = useState<AnalyticalCompositionItem[]>(
    () => compositionRows(product.analyticalComposition),
  );
  const [variantForm, setVariantForm] = useState({
    sku: "",
    presentation: "",
    weightGrams: "",
    active: true,
  });
  const [mediaForm, setMediaForm] = useState<{
    file: File | null;
    altText: string;
    variantId: string;
    displayOrder: string;
  }>({
    file: null,
    altText: `Imagen de ${product.name}`,
    variantId: "",
    displayOrder: "0",
  });
  const [editingMedia, setEditingMedia] = useState<ProductMedia | null>(null);
  const [deletingMedia, setDeletingMedia] = useState<ProductMedia | null>(null);
  const [mediaEditForm, setMediaEditForm] = useState({
    altText: "",
    variantId: "",
    displayOrder: "0",
  });
  const [guideForm, setGuideForm] = useState({
    sourceLabel: "",
    sourceUrl: "",
    entries: [
      {
        petWeightKgMin: "",
        petWeightKgMax: "",
        lifeStage: "",
        dailyGramsMin: "",
        dailyGramsMax: "",
      },
    ],
  });
  const activeSkuVariants = product.variants.filter(
    (item) => item.active && Boolean(item.sku),
  );
  const hasSalePrice = activeSkuVariants.some(
    (item) => Number(item.salePrice) > 0,
  );
  useEffect(() => {
    setEditing(editingFromRoute);
  }, [editingFromRoute]);
  useEffect(() => {
    if (!editingGuide) return;
    void api
      .feedingGuide(product.id)
      .then((guide: FeedingGuide | null) => {
        setGuideForm(
          guide
            ? {
                sourceLabel: guide.sourceLabel,
                sourceUrl: guide.sourceUrl || "",
                entries: guide.entries.map((entry) => ({
                  petWeightKgMin: String(entry.petWeightKgMin),
                  petWeightKgMax:
                    entry.petWeightKgMax == null
                      ? ""
                      : String(entry.petWeightKgMax),
                  lifeStage:
                    entry.lifeStage || entry.conditions?.condition || "",
                  dailyGramsMin: String(entry.dailyGramsMin),
                  dailyGramsMax:
                    entry.dailyGramsMax == null
                      ? ""
                      : String(entry.dailyGramsMax),
                })),
              }
            : {
                sourceLabel: "",
                sourceUrl: "",
                entries: [
                  {
                    petWeightKgMin: "",
                    petWeightKgMax: "",
                    lifeStage: "",
                    dailyGramsMin: "",
                    dailyGramsMax: "",
                  },
                ],
              },
        );
      })
      .catch((error) => notify((error as Error).message, "error"));
  }, [editingGuide, product.id]);
  const openEditing = () => {
    setEditing(true);
    editProduct(product.id);
  };
  const closeEditing = () => {
    setEditing(false);
    navigate("product");
  };
  const publishChecks = [
    {
      label: "Marca y categoría activas",
      ready: Boolean(product.brand.active && product.category?.active),
      action: { label: "Editar información", run: openEditing },
    },
    {
      label: "Al menos una imagen",
      ready: Boolean(product.media?.some((item) => item.url.trim())),
      action: { label: "Agregar imagen", run: () => setAddingMedia(true) },
    },
    {
      label: "Variante activa con SKU",
      ready: activeSkuVariants.length > 0,
      action: activeSkuVariants.length
        ? { label: "Configurar SKU", run: () => openVariant(activeSkuVariants[0].id, product.id) }
        : { label: "Agregar variante", run: () => setAddingVariant(true) },
    },
    {
      label: "Precio de venta mayor que cero",
      ready: hasSalePrice,
      action: activeSkuVariants.length
        ? { label: "Configurar precio", run: () => openVariant(activeSkuVariants[0].id, product.id) }
        : { label: "Agregar variante", run: () => setAddingVariant(true) },
    },
  ];
  const replaceProduct = (updated: Product) => {
    queryClient.setQueryData(["catalog", "product", product.id], updated);
    mutate((current) => ({
      ...current,
      products: current.products.map((item) =>
        item.id === product.id ? updated : item,
      ),
    }));
  };
  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        brandId: form.brandId,
        categoryId: form.categoryId,
        species: form.species || null,
        line: form.line || null,
        lifeStage: form.lifeStage || null,
        breedSize: form.breedSize || null,
        description: form.description || null,
        ingredientsText: form.ingredientsText || null,
        analyticalComposition: compositionPayload(composition),
        featuredRank: form.featuredRank ? Number(form.featuredRank) : null,
        ...(form.status !== "ACTIVE" ? { status: form.status } : {}),
      };
      const updated = await api.updateProduct(product.id, payload);
      replaceProduct(updated);
      closeEditing();
      notify("Producto actualizado correctamente.");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const changeStatus = async (status: Exclude<Product["status"], "ACTIVE">) => {
    setBusy(true);
    try {
      const updated = await api.updateProduct(product.id, { status });
      replaceProduct(updated);
      setForm((current) => ({ ...current, status }));
      notify(
        status === "DRAFT" ? "Producto pasado a borrador." : "Producto archivado.",
      );
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const addVariant = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        sku: variantForm.sku || undefined,
        presentation: variantForm.presentation || undefined,
        weightGrams: variantForm.weightGrams
          ? Number(variantForm.weightGrams)
          : undefined,
        active: variantForm.active,
      };
      const created = await api.createVariant(product.id, payload);
      replaceProduct({ ...product, variants: [...product.variants, created] });
      setVariantForm({
        sku: "",
        presentation: "",
        weightGrams: "",
        active: true,
      });
      setAddingVariant(false);
      notify("Variante agregada. Ya podés asociarle un proveedor.");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const addMedia = async (event: FormEvent) => {
    event.preventDefault();
    if (!mediaForm.file) return;
    setBusy(true);
    try {
      const input = {
        file: mediaForm.file,
        altText: mediaForm.altText,
        variantId: mediaForm.variantId || null,
        displayOrder: Number(mediaForm.displayOrder || 0),
      };
      const created = await api.uploadProductMedia(product.id, input);
      replaceProduct({
        ...product,
        media: [...(product.media || []), created],
      });
      setMediaForm({
        file: null,
        altText: `Imagen de ${product.name}`,
        variantId: "",
        displayOrder: "0",
      });
      setAddingMedia(false);
      notify("Imagen subida y asociada al producto.");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const startMediaEdit = (media: ProductMedia) => {
    setEditingMedia(media);
    setMediaEditForm({
      altText: media.altText,
      variantId: media.variantId || "",
      displayOrder: String(media.displayOrder),
    });
  };
  const saveMedia = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingMedia) return;
    setBusy(true);
    try {
      const payload = {
        altText: mediaEditForm.altText,
        variantId: mediaEditForm.variantId || null,
        displayOrder: Number(mediaEditForm.displayOrder || 0),
      };
      const updated = await api.updateProductMedia(
        product.id,
        editingMedia.id,
        payload,
      );
      replaceProduct({
        ...product,
        media: (product.media || []).map((media) =>
          media.id === updated.id ? updated : media,
        ),
      });
      setEditingMedia(null);
      notify("Información de la imagen actualizada.");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const deleteMedia = (media: ProductMedia) => {
    setDeletingMedia(media);
  };
  const confirmDeleteMedia = async () => {
    if (!deletingMedia) return;
    setBusy(true);
    try {
      await api.deleteProductMedia(product.id, deletingMedia.id);
      replaceProduct({
        ...product,
        media: (product.media || []).filter((item) => item.id !== deletingMedia.id),
      });
      if (editingMedia?.id === deletingMedia.id) setEditingMedia(null);
      setDeletingMedia(null);
      notify("Imagen eliminada.");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const loadGuide = async () => {
    setBusy(true);
    try {
      const guide = await api.feedingGuide(product.id);
      setGuideForm(
        guide
          ? {
              sourceLabel: guide.sourceLabel,
              sourceUrl: guide.sourceUrl || "",
              entries: guide.entries.map((entry) => ({
                petWeightKgMin: String(entry.petWeightKgMin),
                petWeightKgMax:
                  entry.petWeightKgMax == null
                    ? ""
                    : String(entry.petWeightKgMax),
                lifeStage: entry.lifeStage || entry.conditions?.condition || "",
                dailyGramsMin: String(entry.dailyGramsMin),
                dailyGramsMax:
                  entry.dailyGramsMax == null
                    ? ""
                    : String(entry.dailyGramsMax),
              })),
            }
          : {
              sourceLabel: "",
              sourceUrl: "",
              entries: [
                {
                  petWeightKgMin: "",
                  petWeightKgMax: "",
                  lifeStage: "",
                  dailyGramsMin: "",
                  dailyGramsMax: "",
                },
              ],
            },
      );
      setEditingGuide(true);
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const saveGuide = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const entries: FeedingGuideEntry[] = guideForm.entries
        .filter((entry) => entry.petWeightKgMin && entry.dailyGramsMin)
        .map((entry) => ({
          petWeightKgMin: Number(entry.petWeightKgMin),
          petWeightKgMax: entry.petWeightKgMax
            ? Number(entry.petWeightKgMax)
            : null,
          lifeStage: entry.lifeStage || null,
          conditions: entry.lifeStage ? { condition: entry.lifeStage } : ({} as Record<string, string>),
          dailyGramsMin: Number(entry.dailyGramsMin),
          dailyGramsMax: entry.dailyGramsMax
            ? Number(entry.dailyGramsMax)
            : null,
        }));
      if (!entries.length) throw new Error("Agregá al menos un tramo válido.");
      if (
        entries.some(
          (entry) =>
            entry.dailyGramsMax !== null &&
            entry.dailyGramsMax < entry.dailyGramsMin,
        )
      )
        throw new Error(
          "Los gramos máximos no pueden ser menores que los mínimos.",
        );
      await api.replaceFeedingGuide(product.id, {
        sourceLabel: guideForm.sourceLabel,
        sourceUrl: guideForm.sourceUrl || null,
        entries,
      });
      setEditingGuide(false);
      notify(
        `Guía de alimentación guardada con ${entries.length} tramo${entries.length === 1 ? "" : "s"}.`,
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
        eyebrow="Producto"
        title={product.name}
        description={`${product.brand.name} · ${product.category?.name || "Sin categoría"}`}
        back={() => navigate("products")}
        actions={
          <>
            <PublicationBadge status={product.status} />
            {product.status !== "ACTIVE" && (
              <button
                className="button primary"
                type="button"
                disabled={busy}
                onClick={() => activeSkuVariants.length ? openVariant(activeSkuVariants[0].id, product.id) : setAddingVariant(true)}
              >
                <Check size={16} /> Preparar activación
              </button>
            )}
            {product.status === "ACTIVE" && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void changeStatus("DRAFT")}
              >
                Pasar a borrador
              </button>
            )}
            <button
              className="button secondary"
              onClick={editing ? closeEditing : openEditing}
            >
              <Pencil size={16} />{" "}
              {editing ? "Cerrar edición" : "Editar información"}
            </button>
          </>
        }
      />
      {product.status !== "ACTIVE" && (
        <section className="panel readiness" id="publish-readiness">
          <div>
            <strong>Preparación para activar</strong>
            <span>
              {publishChecks.every((item) => item.ready)
                ? "El producto cumple los datos mínimos para activarse mediante una revisión de precio."
                : "Completá estos datos y aplicá un precio desde una variante para activarlo."}
            </span>
          </div>
          {publishChecks.map((item) => <div className={`readiness-check ${item.ready ? "ready" : "pending"}`} key={item.label}>
            <span>{item.ready ? <Check size={14} /> : <AlertTriangle size={14} />} {item.label}</span>
            {!item.ready && <button type="button" className="text-button" onClick={item.action.run}>{item.action.label}</button>}
          </div>)}
        </section>
      )}
      {editing && (
        <form className="panel edit-panel" onSubmit={saveProduct}>
          <div className="panel-heading">
            <div>
              <h2>Editar producto</h2>
              <p>Información comercial y ficha nutricional.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={closeEditing}
            >
              <X size={18} />
            </button>
          </div>
          <div className="form-grid edit-grid">
            <Field label="Nombre">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Marca">
              <select
                value={form.brandId}
                onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              >
                {data.brands.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Categoría">
              <select
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
              >
                {data.categories.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Especie">
              <select
                value={form.species}
                onChange={(e) => setForm({ ...form, species: e.target.value })}
              >
                <option value="">Sin especificar</option>
                <option>Perro</option>
                <option>Gato</option>
              </select>
            </Field>
            <Field label="Línea">
              <input
                value={form.line}
                onChange={(e) => setForm({ ...form, line: e.target.value })}
                placeholder="Ej. Adult"
              />
            </Field>
            <Field label="Etapa de vida">
              <input
                value={form.lifeStage}
                onChange={(e) =>
                  setForm({ ...form, lifeStage: e.target.value })
                }
                placeholder="Ej. Adulto"
              />
            </Field>
            <Field label="Tamaño de raza">
              <input
                value={form.breedSize}
                onChange={(e) =>
                  setForm({ ...form, breedSize: e.target.value })
                }
                placeholder="Ej. Mediana"
              />
            </Field>
            <Field label="Orden destacado">
              <input
                inputMode="numeric"
                value={form.featuredRank}
                onChange={(e) =>
                  setForm({
                    ...form,
                    featuredRank: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="Vacío = no destacado"
              />
            </Field>
            <Field label="Estado">
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as Product["status"],
                  })
                }
              >
                {product.status === "ACTIVE" && <option value="ACTIVE">Publicado</option>}
                {product.status !== "ACTIVE" && <option value="DRAFT">Borrador</option>}
                <option value="ARCHIVED">Archivado</option>
              </select>
              <small className="field-help">La publicación se realiza desde el importador de productos.</small>
            </Field>
            <Field label="Descripción" wide>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <Field label="Ingredientes" wide>
              <textarea
                rows={5}
                value={form.ingredientsText}
                onChange={(e) =>
                  setForm({ ...form, ingredientsText: e.target.value })
                }
                placeholder="Ingredientes declarados por el fabricante"
              />
            </Field>
          </div>
          <div className="section-title">
            <h2>Composición centesimal</h2>
            <button
              type="button"
              className="button small secondary"
              onClick={() =>
                setComposition([
                  ...composition,
                  {
                    name: "",
                    minimum: "",
                    maximum: "",
                    unit: "%",
                    rawValue: "",
                  },
                ])
              }
            >
              <Plus size={14} /> Agregar componente
            </button>
          </div>
          <div className="composition-entries">
            {composition.map((row, index) => (
              <div className="composition-row" key={index}>
                <input
                  aria-label="Nombre del componente"
                  placeholder="Proteína"
                  value={row.name}
                  onChange={(e) =>
                    setComposition(
                      composition.map((item, i) =>
                        i === index ? { ...item, name: e.target.value } : item,
                      ),
                    )
                  }
                />
                <input
                  inputMode="decimal"
                  aria-label="Mínimo"
                  placeholder="Mín."
                  value={row.minimum}
                  onChange={(e) =>
                    setComposition(
                      composition.map((item, i) =>
                        i === index
                          ? { ...item, minimum: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  inputMode="decimal"
                  aria-label="Máximo"
                  placeholder="Máx."
                  value={row.maximum}
                  onChange={(e) =>
                    setComposition(
                      composition.map((item, i) =>
                        i === index
                          ? { ...item, maximum: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  aria-label="Unidad"
                  placeholder="%"
                  value={row.unit}
                  onChange={(e) =>
                    setComposition(
                      composition.map((item, i) =>
                        i === index ? { ...item, unit: e.target.value } : item,
                      ),
                    )
                  }
                />
                {composition.length > 1 && (
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() =>
                      setComposition(composition.filter((_, i) => i !== index))
                    }
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button ghost"
              onClick={closeEditing}
            >
              Cancelar
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}
      {addingMedia && (
        <form className="panel edit-panel" onSubmit={addMedia}>
          <div className="panel-heading">
            <div>
              <h2>Agregar imagen</h2>
              <p>
                Se almacenará de forma privada y la API resolverá su acceso.
              </p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setAddingMedia(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="form-grid edit-grid">
            <Field label="Archivo de imagen" wide>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  const error = file ? imageFileError(file) : null;
                  if (error) {
                    event.target.value = "";
                    setMediaForm({ ...mediaForm, file: null });
                    notify(error, "error");
                    return;
                  }
                  setMediaForm({ ...mediaForm, file });
                }}
                required
              />
              <small className="field-help">
                JPEG, PNG, WebP o GIF · máximo 10 MB
              </small>
            </Field>
            <Field label="Texto alternativo">
              <input
                value={mediaForm.altText}
                onChange={(e) =>
                  setMediaForm({ ...mediaForm, altText: e.target.value })
                }
                placeholder="Ej. Alimento para perro adulto"
                required
              />
            </Field>
            <Field label="Variante específica">
              <select
                value={mediaForm.variantId}
                onChange={(e) =>
                  setMediaForm({ ...mediaForm, variantId: e.target.value })
                }
              >
                <option value="">Imagen general</option>
                {product.variants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatPresentation(item.presentation, item.weightGrams)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Orden">
              <input
                inputMode="numeric"
                value={mediaForm.displayOrder}
                onChange={(e) =>
                  setMediaForm({
                    ...mediaForm,
                    displayOrder: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </Field>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button ghost"
              onClick={() => setAddingMedia(false)}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={busy || !mediaForm.file}
            >
              {busy ? "Subiendo…" : "Subir imagen"}
            </button>
          </div>
        </form>
      )}
      {editingMedia && (
        <form className="panel edit-panel" onSubmit={saveMedia}>
          <div className="panel-heading">
            <div>
              <h2>Editar imagen</h2>
              <p>Actualizá su descripción, variante y orden de aparición.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setEditingMedia(null)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="form-grid edit-grid">
            <Field label="Texto alternativo">
              <input
                autoFocus
                value={mediaEditForm.altText}
                onChange={(event) =>
                  setMediaEditForm({
                    ...mediaEditForm,
                    altText: event.target.value,
                  })
                }
                required
              />
            </Field>
            <Field label="Variante específica">
              <select
                value={mediaEditForm.variantId}
                onChange={(event) =>
                  setMediaEditForm({
                    ...mediaEditForm,
                    variantId: event.target.value,
                  })
                }
              >
                <option value="">Imagen general</option>
                {product.variants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatPresentation(item.presentation, item.weightGrams)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Orden">
              <input
                inputMode="numeric"
                value={mediaEditForm.displayOrder}
                onChange={(event) =>
                  setMediaEditForm({
                    ...mediaEditForm,
                    displayOrder: event.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </Field>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => void deleteMedia(editingMedia)}
            >
              Eliminar imagen
            </button>
            <div className="push-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setEditingMedia(null)}
              >
                Cancelar
              </button>
              <button className="button primary" disabled={busy}>
                Guardar cambios
              </button>
            </div>
          </div>
        </form>
      )}
      {editingGuide && (
        <form className="panel edit-panel" onSubmit={saveGuide}>
          <div className="panel-heading">
            <div>
              <h2>Guía de alimentación</h2>
              <p>Rangos de peso y gramos diarios recomendados.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setEditingGuide(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="form-grid edit-grid">
            <Field label="Fuente">
              <input
                value={guideForm.sourceLabel}
                onChange={(e) =>
                  setGuideForm({ ...guideForm, sourceLabel: e.target.value })
                }
                placeholder="Ej. Tabla del fabricante"
                required
              />
            </Field>
            <Field label="URL de la fuente">
              <input
                type="url"
                value={guideForm.sourceUrl}
                onChange={(e) =>
                  setGuideForm({ ...guideForm, sourceUrl: e.target.value })
                }
                placeholder="Opcional"
              />
            </Field>
          </div>
          <div className="guide-entries">
            {guideForm.entries.map((entry, index) => (
              <div className="guide-row" key={index}>
                <Field label="Peso mín. (kg)">
                  <input
                    inputMode="decimal"
                    value={entry.petWeightKgMin}
                    onChange={(e) =>
                      setGuideForm({
                        ...guideForm,
                        entries: guideForm.entries.map((item, i) =>
                          i === index
                            ? { ...item, petWeightKgMin: e.target.value }
                            : item,
                        ),
                      })
                    }
                    required
                  />
                </Field>
                <Field label="Peso máx. (kg)">
                  <input
                    inputMode="decimal"
                    value={entry.petWeightKgMax}
                    onChange={(e) =>
                      setGuideForm({
                        ...guideForm,
                        entries: guideForm.entries.map((item, i) =>
                          i === index
                            ? { ...item, petWeightKgMax: e.target.value }
                            : item,
                        ),
                      })
                    }
                    placeholder="Opcional"
                  />
                </Field>
                <Field label="Etapa / condición">
                  <input
                    value={entry.lifeStage}
                    onChange={(e) =>
                      setGuideForm({
                        ...guideForm,
                        entries: guideForm.entries.map((item, i) =>
                          i === index
                            ? { ...item, lifeStage: e.target.value }
                            : item,
                        ),
                      })
                    }
                    placeholder="Adulto, cachorro…"
                  />
                </Field>
                <Field label="Gramos mín.">
                  <input
                    inputMode="decimal"
                    value={entry.dailyGramsMin}
                    onChange={(e) =>
                      setGuideForm({
                        ...guideForm,
                        entries: guideForm.entries.map((item, i) =>
                          i === index
                            ? { ...item, dailyGramsMin: e.target.value }
                            : item,
                        ),
                      })
                    }
                    required
                  />
                </Field>
                <Field label="Gramos máx.">
                  <input
                    inputMode="decimal"
                    value={entry.dailyGramsMax}
                    onChange={(e) =>
                      setGuideForm({
                        ...guideForm,
                        entries: guideForm.entries.map((item, i) =>
                          i === index
                            ? { ...item, dailyGramsMax: e.target.value }
                            : item,
                        ),
                      })
                    }
                    placeholder="Opcional"
                  />
                </Field>
                {guideForm.entries.length > 1 && (
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() =>
                      setGuideForm({
                        ...guideForm,
                        entries: guideForm.entries.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="guide-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                setGuideForm({
                  ...guideForm,
                  entries: [
                    ...guideForm.entries,
                    {
                      petWeightKgMin: "",
                      petWeightKgMax: "",
                      lifeStage: "",
                      dailyGramsMin: "",
                      dailyGramsMax: "",
                    },
                  ],
                })
              }
            >
              <Plus size={15} /> Agregar tramo
            </button>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button ghost"
              onClick={() => setEditingGuide(false)}
            >
              Cancelar
            </button>
            <button className="button primary" disabled={busy}>
              Guardar guía
            </button>
          </div>
        </form>
      )}
      <div className="detail-grid">
        <section className="panel information-card">
          <div className="panel-heading">
            <h2>Información</h2>
            <div className="panel-actions">
              <button className="button small secondary" onClick={openEditing}>
                <Pencil size={14} /> Editar
              </button>
              <button
                className="text-button"
                onClick={() => setEditingGuide(true)}
              >
                Configurar guía
              </button>
            </div>
          </div>
          <div className="info-rows">
            <Info
              label="Categoría"
              value={product.category?.name || "Sin categoría"}
            />
            <Info label="Marca" value={product.brand.name} />
            <Info
              label="Especie"
              value={product.species || "Sin especificar"}
            />
            <Info
              label="Etapa"
              value={product.lifeStage || "Sin especificar"}
            />
          </div>
          <div className="description-block">
            <span>Descripción</span>
            <p>
              {product.description ||
                "Este producto todavía no tiene una descripción."}
            </p>
          </div>
        </section>
        <section className="panel product-media-panel">
          <div className="panel-heading">
            <div>
              <h2>Imágenes</h2>
              <p>{product.media?.length || 0} asociadas al producto.</p>
            </div>
            <button
              className="button small secondary"
              onClick={() => setAddingMedia(true)}
            >
              <Plus size={14} /> Agregar
            </button>
          </div>
          {product.media?.length ? (
            <div className="media-gallery">
              {[...product.media]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((media) => (
                  <article key={media.id}>
                    <img src={media.url} alt={media.altText} />
                    <div>
                      <strong>{media.altText}</strong>
                      <small>
                        {media.variantId
                          ? formatPresentation(
                              product.variants.find(
                                (item) => item.id === media.variantId,
                              )?.presentation || null,
                              product.variants.find(
                                (item) => item.id === media.variantId,
                              )?.weightGrams,
                            )
                          : "Imagen general"}{" "}
                        · orden {media.displayOrder}
                      </small>
                    </div>
                    <button
                      className="icon-button"
                      title="Editar imagen"
                      onClick={() => startMediaEdit(media)}
                    >
                      <Pencil size={15} />
                    </button>
                  </article>
                ))}
            </div>
          ) : (
            <div className="product-placeholder">
              <Package size={48} />
              <span>Sin imagen</span>
              <small>Requerida para activar el producto.</small>
              <button
                className="button primary"
                onClick={() => setAddingMedia(true)}
              >
                <Plus size={15} /> Agregar imagen
              </button>
            </div>
          )}
        </section>
      </div>
      {addingVariant && (
        <form className="panel inline-operation" onSubmit={addVariant}>
          <div>
            <h2>Nueva variante</h2>
            <p>
              Creá el SKU; luego podrás asociar ofertas y calcular su precio.
            </p>
          </div>
          <Field label="SKU">
            <input
              value={variantForm.sku}
              onChange={(e) =>
                setVariantForm({ ...variantForm, sku: e.target.value })
              }
              placeholder="EXC-ADULT-15"
            />
          </Field>
          <Field label="Presentación">
            <input
              value={variantForm.presentation}
              onChange={(e) =>
                setVariantForm({ ...variantForm, presentation: e.target.value })
              }
              placeholder="15 kg"
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
              placeholder="15000"
            />
          </Field>
          <label className="check-field">
            <input
              type="checkbox"
              checked={variantForm.active}
              onChange={(e) =>
                setVariantForm({ ...variantForm, active: e.target.checked })
              }
            />{" "}
            Activa
          </label>
          <div className="inline-actions">
            <button
              type="button"
              className="button ghost"
              onClick={() => setAddingVariant(false)}
            >
              Cancelar
            </button>
            <button className="button primary" disabled={busy}>
              Agregar
            </button>
          </div>
        </form>
      )}
      <section className="panel table-panel variants-panel">
        <div className="panel-heading">
          <div>
            <h2>Variantes</h2>
            <p>{product.variants.length} presentaciones asociadas.</p>
          </div>
          <button
            className="button secondary"
            onClick={() => setAddingVariant(true)}
          >
            <Plus size={16} /> Agregar variante
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Presentación</th>
                <th>Precio</th>
                <th>Oferta ganadora</th>
                <th>Publicación</th>
                <th>Compra</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => {
                const offer = getWinningOffer(variant, data.offers);
                const supplier = data.suppliers.find(
                  (s) => s.id === offer?.supplierId,
                );
                return (
                  <tr
                    key={variant.id}
                    onClick={() => openVariant(variant.id, product.id)}
                  >
                    <td className="mono">{variant.sku || "—"}</td>
                    <td>
                      {formatPresentation(
                        variant.presentation,
                        variant.weightGrams,
                      )}
                    </td>
                    <td className="strong-cell">{money(variant.salePrice)}</td>
                    <td>
                      {offer ? (
                        <span className="offer-winner">
                          <span className="offer-winner-badge">
                            <Check size={12} /> Ganadora
                          </span>
                          <span>
                            {supplier?.name || "Proveedor"}
                            <small>{money(offer.unitCost)}</small>
                          </span>
                        </span>
                      ) : (
                        <span className="offer-missing">Sin oferta activa</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge
                        status={variant.active ? "ACTIVE" : "DRAFT"}
                      />
                    </td>
                    <td>
                      <FulfillmentBadge status={fulfillmentStatus(variant)} />
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
      {deletingMedia && <ConfirmDialog title="Eliminar imagen" message="Esta acción quitará la imagen del producto. ¿Querés continuar?" confirmLabel="Eliminar imagen" busy={busy} onCancel={() => { if (!busy) setDeletingMedia(null); }} onConfirm={() => void confirmDeleteMedia()} />}
    </>
  );
}
