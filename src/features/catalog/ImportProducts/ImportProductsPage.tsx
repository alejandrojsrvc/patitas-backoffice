import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Download, FileSpreadsheet, Upload } from "lucide-react";
import { api } from "../../../api";
import type { Navigate, Notify } from "../../../app/navigation";
import type { ProductImportResult } from "../../../types";
import { AsyncError, PageHeader, OperationBadge } from "../../../shared/components";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const REQUIRED_HEADERS = ["name", "brand", "weight_kg", "sale_price", "image_url", "initial_stock"];
const TEMPLATE_HEADERS = [
  "name", "brand", "weight_kg", "sku", "barcode", "slug", "category",
  "species", "line", "life_stage", "breed_size", "description", "image_url",
  "sale_price", "initial_stock",
];

export function ImportProductsPage({
  notify,
  navigate,
  openProduct,
  reload,
}: {
  notify: Notify;
  navigate: Navigate;
  openProduct: (id: string) => void;
  reload: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [publish, setPublish] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [result, setResult] = useState<ProductImportResult | null>(null);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Seleccioná un archivo CSV.");
      return api.importProductsCsv(file, publish);
    },
    onSuccess: async (importResult) => {
      setResult(importResult);
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await reload();
      notify(`Importación completada: ${importResult.published} publicados y ${importResult.draft} borradores.`);
    },
    onError: (error) => notify((error as Error).message, "error"),
  });

  const chooseFile = async (candidate: File | null) => {
    setResult(null);
    setValidationError("");
    if (!candidate) {
      setFile(null);
      return;
    }
    if (!candidate.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setValidationError("El archivo debe tener extensión .csv.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setFile(null);
      setValidationError("El archivo no puede superar los 2 MB.");
      return;
    }
    const headerLine = (await candidate.slice(0, 64 * 1024).text()).split(/\r?\n/, 1)[0];
    const headers = new Set(headerLine.split(",").map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase()));
    const missing = REQUIRED_HEADERS.filter((header) => !headers.has(header));
    if (missing.length) {
      setFile(null);
      setValidationError(`Faltan columnas obligatorias: ${missing.join(", ")}.`);
      return;
    }
    setFile(candidate);
  };

  const downloadTemplate = () => {
    const content = `${TEMPLATE_HEADERS.join(",")}\nExcellent Adult,Excellent,15,EXC-ADULT-15,,excellent-adult,alimento-seco,perro,,,Adulto,,https://example.com/product.jpg,79990,10\n`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla-catalogo.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Importar productos"
        description="Creá y publicá productos con precio de venta, imágenes y stock desde un CSV."
        back={() => navigate("products")}
        actions={<button className="button secondary" type="button" onClick={downloadTemplate}><Download size={16} /> Descargar plantilla</button>}
      />
      <section className="panel import-page">
        <div className="import-dropzone" onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}>
          <FileSpreadsheet size={34} />
          <strong>{file ? file.name : "Seleccioná un archivo CSV"}</strong>
          <span>{file ? `${(file.size / 1024).toFixed(1)} KB` : "Máximo 2 MB"}</span>
          <button className="button secondary small" type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}><Upload size={15} /> Elegir archivo</button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => chooseFile(event.target.files?.[0] || null)} />
        </div>
        {validationError && <AsyncError message={validationError} />}
        <div className="import-help">
          <strong>Columnas obligatorias</strong>
          <span>{REQUIRED_HEADERS.join(", ")}</span>
          <p>Publicar no requiere ofertas de proveedor. El campo <strong>sale_price</strong> es el precio de venta; <strong>unit_cost</strong> pertenece al importador separado de proveedores.</p>
        </div>
        <label className="check-field import-publish">
          <input type="checkbox" checked={publish} onChange={(event) => setPublish(event.target.checked)} />
          Publicar productos importados cuando cumplan los requisitos (sin esperar ofertas de proveedor)
        </label>
        {publish && <div className="settings-note"><p>Si algún producto no puede publicarse, la importación se conserva como borrador y el resultado mostrará el motivo.</p></div>}
        <div className="form-actions">
          <button type="button" className="button ghost" onClick={() => navigate("products")}>Cancelar</button>
          <button type="button" className="button primary" disabled={!file || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Importando…" : publish ? "Publicar productos" : "Importar borradores"}</button>
        </div>
      </section>
      {result && <section className="panel import-results">
        <div className="panel-heading"><div><h2>Resultado de la importación</h2><p>{result.rows} filas procesadas.</p></div><OperationBadge value={`${result.products} productos`} tone="success" /></div>
        <div className="import-summary"><div><strong>{result.products}</strong><span>Productos</span></div><div><strong>{result.published}</strong><span>Publicados</span></div><div><strong>{result.draft}</strong><span>Borradores</span></div></div>
        <div className="table-wrap"><table><thead><tr><th>Producto</th><th>Variantes</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>{result.items.map((item) => <tr key={item.productId}><td><button className="text-button" type="button" onClick={() => openProduct(item.productId)}>{item.slug}</button></td><td>{item.variants.length}</td><td><OperationBadge value={item.published ? "Publicado" : "Borrador"} tone={item.published ? "success" : "warning"} /></td><td>{item.publishError ? <span className="danger-text">{item.publishError}</span> : <span className="success-text"><Check size={14} /> Procesado</span>}</td></tr>)}</tbody></table></div>
      </section>}
    </>
  );
}
