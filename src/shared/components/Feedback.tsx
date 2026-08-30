import { AlertTriangle, Check, Package, X } from "lucide-react";
import type { Navigate } from "../../app/navigation";

export function AsyncError({ message }: { message: string }) {
  return (
    <div className="inline-error operation-error">
      <AlertTriangle size={18} />
      <div>
        <strong>No se pudo cargar el módulo</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}

export function Pager({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <button
        className="button secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      <span>Página {page} de {pages}</span>
      <button
        className="button secondary"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Siguiente
      </button>
    </div>
  );
}

export function NotFound({ navigate }: { navigate: Navigate }) {
  return (
    <section className="panel empty-state">
      <Package size={30} />
      <strong>No encontramos este registro</strong>
      <p>Puede haber sido eliminado o la dirección ya no es válida.</p>
      <button className="button primary" onClick={() => navigate("products")}>
        Volver al catálogo
      </button>
    </section>
  );
}

export function LoadingScreen({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  return (
    <div className="loading-screen">
      <div className="brand-mark large">
        <img src="/brand/patitas-isotipo.png" alt="" />
      </div>
      {error ? <div className="inline-error"><AlertTriangle size={18} /><p>{error}</p></div> : <><span className="spinner" /><p>Conectando con Patitas…</p></>}
      {error && onRetry && <button className="button primary" type="button" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}

export function ToastMessage({
  kind,
  message,
  onClose,
}: {
  kind: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  return (
    <div className={`toast ${kind}`} role={kind === "error" ? "alert" : "status"} aria-live="polite">
      <span>
        {kind === "success" ? <Check size={17} /> : <AlertTriangle size={17} />}
      </span>
      {message}
      <button type="button" aria-label="Cerrar notificación" onClick={onClose}>
        <X size={15} />
      </button>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="dialog panel" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{message}</p>
        <div className="form-actions">
          <button type="button" className="button ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="button danger" disabled={busy} onClick={onConfirm}>{busy ? "Procesando…" : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
