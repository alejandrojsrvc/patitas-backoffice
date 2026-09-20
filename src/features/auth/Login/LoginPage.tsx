import { FormEvent, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";
import { api, session } from "../../../api";

const apiUrl = import.meta.env.VITE_API_URL || "/api/v1";
const turnstileSiteKey = (import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || "").trim();
const turnstileScriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    action: string;
    theme: "light";
    size: "flexible";
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
  }) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function TurnstileChallenge({ onToken, resetKey }: { onToken: (token: string | null) => void; resetKey: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!turnstileSiteKey) return;
    let removeWidget: (() => void) | undefined;

    const render = () => {
      if (!window.turnstile || !containerRef.current) return undefined;
      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: turnstileSiteKey,
        action: "auth-login",
        theme: "light",
        size: "flexible",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
      });
      return () => window.turnstile?.remove(widgetId);
    };

    if (window.turnstile) {
      removeWidget = render();
      return removeWidget;
    }

    const handleReady = () => {
      removeWidget = render();
    };
    window.addEventListener("patitas-turnstile-ready", handleReady);
    if (!document.querySelector(`script[src="${turnstileScriptUrl}"]`)) {
      const script = document.createElement("script");
      script.src = turnstileScriptUrl;
      script.async = true;
      script.defer = true;
      script.onload = () => window.dispatchEvent(new Event("patitas-turnstile-ready"));
      document.head.appendChild(script);
    }

    return () => {
      window.removeEventListener("patitas-turnstile-ready", handleReady);
      removeWidget?.();
    };
  }, [resetKey]);

  if (!turnstileSiteKey) return null;
  return <div ref={containerRef} className="turnstile-challenge" aria-label="Verificación de seguridad" />;
}

export function LoginPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api.login(email, password, turnstileToken ?? undefined);
      if (!result.session?.accessToken || result.user?.role !== "ADMIN")
        throw new Error("Esta cuenta no tiene acceso al backoffice.");
      session.set(result.session);
      onAuthenticated();
    } catch (cause) {
      setError((cause as Error).message);
      setTurnstileToken(null);
      setTurnstileResetKey((current) => current + 1);
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
          <TurnstileChallenge onToken={setTurnstileToken} resetKey={turnstileResetKey} />
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
