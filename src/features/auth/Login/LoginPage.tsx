import { FormEvent, useState } from "react";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import { api, session } from "../../../api";

const apiUrl = import.meta.env.VITE_API_URL || "/api/v1";

export function LoginPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.login(email, password);
      if (!result.session?.accessToken || result.user?.role !== "ADMIN")
        throw new Error("Esta cuenta no tiene acceso al backoffice.");
      session.set(result.session);
      onAuthenticated();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-page">
      <section className="login-brand">
        <div className="brand-mark large">
          <img src="/brand/patitas-isotipo.png" alt="Patitas Inquietas" />
        </div>
        <div>
          <p className="eyebrow light">Patitas Backoffice</p>
          <h1>Todo el negocio,<br />sin abrir una planilla.</h1>
          <p>Catálogo, proveedores y precios conectados en un solo flujo operativo.</p>
        </div>
        <div className="login-proof">
          <span><Check size={15} /> Precio recomendado al instante</span>
          <span><Check size={15} /> Margen y costos siempre visibles</span>
        </div>
      </section>
      <section className="login-panel">
        <form onSubmit={submit} className="login-card">
          <div>
            <p className="eyebrow">Acceso operativo</p>
            <h2>Ingresá a Patitas</h2>
            <p className="muted">Usá tu cuenta administradora de la API.</p>
          </div>
          <label>
            Email
            <input autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@patitas.com" required />
          </label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" minLength={8} required />
          </label>
          {error && <div className="inline-error"><AlertTriangle size={16} />{error}</div>}
          <button className="button primary full" disabled={busy}>
            {busy ? "Ingresando…" : <>Ingresar <ArrowRight size={17} /></>}
          </button>
          <small>API: {apiUrl}</small>
        </form>
      </section>
    </div>
  );
}
