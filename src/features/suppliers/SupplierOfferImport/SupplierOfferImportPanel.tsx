import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Check, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { api } from "../../../api";
import type { Notify } from "../../../app/navigation";
import type { SupplierOfferImportResult } from "../../../types";
import { AsyncError, OperationBadge } from "../../../shared/components";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function SupplierOfferImportPanel({
  notify,
  reload,
  onClose,
}: {
  notify: Notify;
  reload: () => Promise<void>;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [validationError, setValidationError] = useState("");
  const [result, setResult] = useState<SupplierOfferImportResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Seleccioná un archivo CSV.");
      return api.importSupplierOffersCsv(file, dryRun);
    },
    onSuccess: async (importResult) => {
      setResult(importResult);
      if (!importResult.dryRun) await reload();
      const action = importResult.dryRun ? "Validación" : "Importación";
      notify(`${action} completada: ${importResult.created} creadas, ${importResult.updated} actualizadas${importResult.errors.length ? ` y ${importResult.errors.length} con error` : "."}`);
    },
    onError: (error) => notify((error as Error).message, "error"),
  });

  const chooseFile = (candidate: File | null) => {
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
      setValidationError("El archivo no puede superar los 10 MB.");
      return;
    }
    setFile(candidate);
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const blob = await api.downloadSupplierOffersTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "supplier-offers-template.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="panel import-page supplier-offer-import">
      <div className="panel-heading">
        <div>
          <h2>Importar ofertas</h2>
          <p>Creá o actualizá costos y disponibilidad de proveedores desde un CSV.</p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar importación">
          <X size={18} />
        </button>
      </div>
      <div className="import-dropzone" onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}>
        <FileSpreadsheet size={34} />
        <strong>{file ? file.name : "Seleccioná un archivo CSV"}</strong>
        <span>{file ? `${(file.size / 1024).toFixed(1)} KB` : "Máximo 10 MB"}</span>
        <button className="button secondary small" type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}>
          <Upload size={15} /> Elegir archivo
        </button>
        <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => chooseFile(event.target.files?.[0] || null)} />
      </div>
      {validationError && <AsyncError message={validationError} />}
      <div className="import-help">
        <strong>Identificación requerida por fila</strong>
        <span>supplier_id o supplier_name · variant_id, sku o barcode · unit_cost</span>
        <p>Podés descargar la plantilla oficial. Las filas pueden resolver proveedor y variante por ID, nombre, SKU o código de barras.</p>
        <button type="button" className="button secondary small" onClick={() => void downloadTemplate()} disabled={downloading}>
          <Download size={15} /> {downloading ? "Descargando…" : "Descargar plantilla oficial"}
        </button>
      </div>
      <label className="check-field import-publish">
        <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
        Solo validar, no guardar cambios
      </label>
      {dryRun && <div className="settings-note"><p>La validación detecta filas inválidas y conflictos sin crear ni actualizar ofertas.</p></div>}
      <div className="form-actions">
        <button type="button" className="button ghost" onClick={onClose}>Cerrar</button>
        <button type="button" className="button primary" disabled={!file || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? (dryRun ? "Validando…" : "Importando…") : (dryRun ? "Validar CSV" : "Importar ofertas")}
        </button>
      </div>
      {result && (
        <div className="import-results">
          <div className="panel-heading">
            <div><h2>{result.dryRun ? "Resultado de validación" : "Resultado de importación"}</h2><p>{result.total} filas procesadas.</p></div>
            <OperationBadge value={result.errors.length ? `${result.errors.length} errores` : "Sin errores"} tone={result.errors.length ? "warning" : "success"} />
          </div>
          <div className="import-summary">
            <div><strong>{result.total}</strong><span>Filas</span></div>
            <div><strong>{result.created}</strong><span>Creadas</span></div>
            <div><strong>{result.updated}</strong><span>Actualizadas</span></div>
          </div>
          {result.errors.length > 0 && <div className="table-wrap"><table><thead><tr><th>Fila</th><th>Detalle</th></tr></thead><tbody>{result.errors.map((error) => <tr key={`${error.row}-${error.message}`}><td>{error.row}</td><td className="danger-text"><AlertTriangle size={14} /> {error.message}</td></tr>)}</tbody></table></div>}
          {!result.errors.length && <p className="import-success"><Check size={15} /> {result.dryRun ? "El archivo está listo para importar." : "Las ofertas quedaron actualizadas."}</p>}
        </div>
      )}
    </section>
  );
}
