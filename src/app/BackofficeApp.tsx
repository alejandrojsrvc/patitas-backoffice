import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, session, SESSION_EXPIRED_EVENT } from "../api";
import { LoginPage } from "../features/auth/Login/LoginPage";
import { LoadingScreen, ToastMessage } from "../shared/components";
import { Sidebar, Topbar } from "../shared/components/layout";
import type { DataState } from "../types";
import type { Navigate, ToastKind } from "./navigation";
import { CATALOG_QUERY_KEY, queryClient } from "./AppProviders";
import { readRoute, STATIC_PATHS } from "./routing";
import { ScreenRouter } from "./ScreenRouter";

type Toast = { kind: ToastKind; message: string } | null;

export default function BackofficeApp() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const route = readRoute(location.pathname);
  const [authenticated, setAuthenticated] = useState(Boolean(session.get()));
  const [toast, setToast] = useState<Toast>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const catalogQuery = useQuery<DataState, Error>({
    queryKey: CATALOG_QUERY_KEY,
    queryFn: api.loadAll,
    enabled: authenticated,
  });
  const data = catalogQuery.data || null;
  const loading = catalogQuery.isPending || catalogQuery.isFetching;
  const load = async () => {
    await catalogQuery.refetch();
  };

  useEffect(() => {
    const status = (catalogQuery.error as Error & { status?: number } | null)?.status;
    if (status === 401 || status === 403) {
      session.clear();
      setAuthenticated(false);
    }
    if (catalogQuery.error) setToast({ kind: "error", message: catalogQuery.error.message });
  }, [catalogQuery.error]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const handleExpiredSession = () => {
      setAuthenticated(false);
      routerNavigate("/login", { replace: true });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpiredSession);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpiredSession);
  }, [routerNavigate]);

  useEffect(() => {
    if (!authenticated && location.pathname !== "/login")
      routerNavigate("/login", { replace: true });
    if (authenticated && location.pathname === "/login")
      routerNavigate("/", { replace: true });
  }, [authenticated, location.pathname, routerNavigate]);

  useEffect(() => {
    if (authenticated && location.pathname !== "/login" && !route.valid)
      routerNavigate("/", { replace: true });
  }, [authenticated, location.pathname, route.valid, routerNavigate]);

  const navigate: Navigate = (next) => {
    let path = STATIC_PATHS[next];
    if (next === "product" && route.productId)
      path = `/catalogo/productos/${encodeURIComponent(route.productId)}`;
    if (next === "product-edit" && route.productId)
      path = `/catalogo/productos/${encodeURIComponent(route.productId)}/editar`;
    if (path) routerNavigate(path);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openProduct = (id: string) => {
    routerNavigate(`/catalogo/productos/${encodeURIComponent(id)}`);
    setMobileNav(false);
  };
  const editProduct = (id: string) =>
    routerNavigate(`/catalogo/productos/${encodeURIComponent(id)}/editar`);
  const openVariant = (id: string, productId?: string) => {
    const ownerId =
      productId ||
      data?.products.find((product) =>
        product.variants.some((variant) => variant.id === id),
      )?.id;
    if (ownerId)
      routerNavigate(
        `/catalogo/productos/${encodeURIComponent(ownerId)}/variantes/${encodeURIComponent(id)}`,
      );
    setMobileNav(false);
  };
  const openSupplier = (id: string) => {
    routerNavigate(`/proveedores/${encodeURIComponent(id)}`);
    setMobileNav(false);
  };
  const openCustomer = (id: string) => {
    routerNavigate(`/clientes/${encodeURIComponent(id)}`);
    setMobileNav(false);
  };
  const openOrder = (id: string) => {
    routerNavigate(`/pedidos/${encodeURIComponent(id)}`);
    setMobileNav(false);
  };
  const notify = (message: string, kind: ToastKind = "success") =>
    setToast({ kind, message });
  const mutate = (recipe: (current: DataState) => DataState) =>
    queryClient.setQueryData<DataState>(CATALOG_QUERY_KEY, (current) =>
      current ? recipe(current) : current,
    );

  if (!authenticated)
    return <LoginPage onAuthenticated={() => setAuthenticated(true)} />;
  if (!data && catalogQuery.error)
    return <LoadingScreen error={catalogQuery.error.message} onRetry={() => void load()} />;
  if (!data) return <LoadingScreen />;

  return (
    <div className="app-shell">
      <Sidebar
        view={route.view}
        open={mobileNav}
        navigate={navigate}
        onClose={() => setMobileNav(false)}
      />
      <div className="app-main">
        <Topbar
          onMenu={() => setMobileNav(true)}
          onLogout={() => {
            session.clear();
            setAuthenticated(false);
            routerNavigate("/login", { replace: true });
          }}
        />
        <main className="content">
          <ScreenRouter
            route={route}
            data={data}
            loading={loading}
            navigate={navigate}
            notify={notify}
            mutate={mutate}
            openProduct={openProduct}
            editProduct={editProduct}
            openVariant={openVariant}
            openSupplier={openSupplier}
            openCustomer={openCustomer}
            openOrder={openOrder}
            reload={load}
          />
        </main>
      </div>
      {toast && (
        <ToastMessage
          kind={toast.kind}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
