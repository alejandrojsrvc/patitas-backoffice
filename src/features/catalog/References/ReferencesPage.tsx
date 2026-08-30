import { FormEvent, useState } from "react";
import { MoreHorizontal, Package, Plus, Tags, X } from "lucide-react";
import { api } from "../../../api";
import type { DataState, Reference } from "../../../types";
import type { ToastKind } from "../../../app/navigation";
import { Field, PageHeader, StatusBadge } from "../../../shared/components";
import { imageFileError } from "../utils";

export function ReferencesPage({
  type,
  data,
  mutate,
  notify,
}: {
  type: "brands" | "categories";
  data: DataState;
  mutate: (fn: (d: DataState) => DataState) => void;
  notify: (m: string, k?: ToastKind) => void;
}) {
  const list = type === "brands" ? data.brands : data.categories;
  const singular = type === "brands" ? "marca" : "categoría";
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoUploading, setLogoUploading] = useState<string | null>(null);
  const [editing, setEditing] = useState<Reference | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    description: "",
    seoTitle: "",
    seoDescription: "",
    displayOrder: "0",
    active: true,
  });
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await api.createReference(type, { name, active: true });
      mutate((d) => ({ ...d, [type]: [...d[type], created] }));
      setName("");
      setAdding(false);
      notify(`${singular[0].toUpperCase() + singular.slice(1)} creada.`);
    } catch (err) {
      notify((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const startEdit = (item: Reference) => {
    setEditing(item);
    setEditForm({
      name: item.name,
      slug: item.slug,
      description: item.description || "",
      seoTitle: item.seoTitle || "",
      seoDescription: item.seoDescription || "",
      displayOrder: String(item.displayOrder || 0),
      active: item.active,
    });
  };
  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const payload = {
        name: editForm.name,
        slug: editForm.slug,
        description: editForm.description || null,
        seoTitle: editForm.seoTitle || null,
        seoDescription: editForm.seoDescription || null,
        displayOrder: Number(editForm.displayOrder || 0),
        active: editForm.active,
      };
      const updated = await api.updateReference(type, editing.id, payload);
      mutate((current) => ({
        ...current,
        [type]: current[type].map((item) =>
          item.id === editing.id ? updated : item,
        ),
      }));
      setEditing(null);
      notify(`${singular[0].toUpperCase() + singular.slice(1)} actualizada.`);
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const uploadLogo = async (brand: Reference, file: File) => {
    const error = imageFileError(file);
    if (error) {
      notify(error, "error");
      return;
    }
    setLogoUploading(brand.id);
    try {
      const updated = await api.uploadBrandLogo(brand.id, file);
      mutate((current) => ({
        ...current,
        brands: current.brands.map((item) =>
          item.id === brand.id ? updated : item,
        ),
      }));
      notify(`Logo de ${brand.name} actualizado.`);
    } catch (cause) {
      notify((cause as Error).message, "error");
    } finally {
      setLogoUploading(null);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title={type === "brands" ? "Marcas" : "Categorías"}
        description={`${list.length} ${type} registradas`}
        actions={
          <button className="button primary" onClick={() => setAdding(true)}>
            <Plus size={17} /> Nueva {singular}
          </button>
        }
      />
      {adding && (
        <form className="inline-create panel" onSubmit={save}>
          <label>
            Nombre de la {singular}
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === "brands" ? "Ej. Excellent" : "Ej. Alimento seco"
              }
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
      {editing && (
        <form className="panel edit-panel" onSubmit={saveEdit}>
          <div className="panel-heading">
            <div>
              <h2>Editar {singular}</h2>
              <p>Información operativa y metadatos del catálogo público.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setEditing(null)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="form-grid edit-grid">
            <Field label="Nombre">
              <input
                autoFocus
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Slug">
              <input
                value={editForm.slug}
                onChange={(e) =>
                  setEditForm({ ...editForm, slug: e.target.value })
                }
                required
              />
            </Field>
            <Field label="Orden">
              <input
                inputMode="numeric"
                value={editForm.displayOrder}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    displayOrder: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </Field>
            <label className="check-field form-check">
              <input
                type="checkbox"
                checked={editForm.active}
                onChange={(e) =>
                  setEditForm({ ...editForm, active: e.target.checked })
                }
              />{" "}
              Activa
            </label>
            <Field label="Descripción" wide>
              <textarea
                rows={3}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
              />
            </Field>
            <Field label="Título SEO">
              <input
                value={editForm.seoTitle}
                onChange={(e) =>
                  setEditForm({ ...editForm, seoTitle: e.target.value })
                }
              />
            </Field>
            <Field label="Descripción SEO">
              <input
                value={editForm.seoDescription}
                onChange={(e) =>
                  setEditForm({ ...editForm, seoDescription: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button ghost"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
            <button className="button primary" disabled={busy}>
              Guardar cambios
            </button>
          </div>
        </form>
      )}
      <section className="reference-grid">
        {list.map((item) => (
          <article className="panel reference-card" key={item.id}>
            <span
              className={`reference-icon ${item.logoUrl ? "has-logo" : ""}`}
            >
              {item.logoUrl ? (
                <img src={item.logoUrl} alt={`Logo de ${item.name}`} />
              ) : type === "brands" ? (
                <Tags size={20} />
              ) : (
                <Package size={20} />
              )}
            </span>
            <div>
              <strong>{item.name}</strong>
              <small>/{item.slug}</small>
              {type === "brands" && (
                <label className="logo-upload">
                  {logoUploading === item.id
                    ? "Subiendo…"
                    : item.logoUrl
                      ? "Reemplazar logo"
                      : "Subir logo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={logoUploading === item.id}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadLogo(item, file);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
            <StatusBadge status={item.active ? "ACTIVE" : "ARCHIVED"} />
            <button
              className="icon-button"
              title={`Editar ${singular}`}
              onClick={() => startEdit(item)}
            >
              <MoreHorizontal size={18} />
            </button>
          </article>
        ))}
      </section>
    </>
  );
}
