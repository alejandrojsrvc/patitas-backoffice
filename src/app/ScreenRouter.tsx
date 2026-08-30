import type { DashboardSummary, DataState } from "../types";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import type { Navigate, Notify, MutateData } from "./navigation";
import type { RouteState } from "./routing";
import { NotFound } from "../shared/components";
import { lazy, Suspense } from "react";

const DashboardPage = lazy(() => import("../features/dashboard/Dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const ProductsPage = lazy(() => import("../features/catalog/Products/ProductsPage").then((module) => ({ default: module.ProductsPage })));
const ProductDetailPage = lazy(() => import("../features/catalog/ProductDetail/ProductDetailPage").then((module) => ({ default: module.ProductDetailPage })));
const SkuDetailPage = lazy(() => import("../features/catalog/SkuDetail/SkuDetailPage").then((module) => ({ default: module.SkuDetailPage })));
const NewProductPage = lazy(() => import("../features/catalog/NewProduct/NewProductPage").then((module) => ({ default: module.NewProductPage })));
const ImportProductsPage = lazy(() => import("../features/catalog/ImportProducts/ImportProductsPage").then((module) => ({ default: module.ImportProductsPage })));
const ReferencesPage = lazy(() => import("../features/catalog/References/ReferencesPage").then((module) => ({ default: module.ReferencesPage })));
const SuppliersPage = lazy(() => import("../features/suppliers/Suppliers/SuppliersPage").then((module) => ({ default: module.SuppliersPage })));
const SupplierDetailPage = lazy(() => import("../features/suppliers/SupplierDetail/SupplierDetailPage").then((module) => ({ default: module.SupplierDetailPage })));
const PricesPage = lazy(() => import("../features/pricing/Prices/PricesPage").then((module) => ({ default: module.PricesPage })));
const InventoryPage = lazy(() => import("../features/inventory/Inventory/InventoryPage").then((module) => ({ default: module.InventoryPage })));
const CustomersPage = lazy(() => import("../features/customers/Customers/CustomersPage").then((module) => ({ default: module.CustomersPage })));
const CustomerDetailPage = lazy(() => import("../features/customers/CustomerDetail/CustomerDetailPage").then((module) => ({ default: module.CustomerDetailPage })));
const OrdersPage = lazy(() => import("../features/orders/Orders/OrdersPage").then((module) => ({ default: module.OrdersPage })));
const NewOrderPage = lazy(() => import("../features/orders/NewOrder/NewOrderPage").then((module) => ({ default: module.NewOrderPage })));
const OrderDetailPage = lazy(() => import("../features/orders/OrderDetail/OrderDetailPage").then((module) => ({ default: module.OrderDetailPage })));
const PricingSettingsPage = lazy(() => import("../features/pricing/PricingSettings/PricingSettingsPage").then((module) => ({ default: module.PricingSettingsPage })));
const ShippingOptionsPage = lazy(() => import("../features/shipping/ShippingOptions/ShippingOptionsPage").then((module) => ({ default: module.ShippingOptionsPage })));
const AuditPage = lazy(() => import("../features/audit/Audit/AuditPage").then((module) => ({ default: module.AuditPage })));

export function ScreenRouter({
  route,
  data,
  loading,
  navigate,
  notify,
  mutate,
  openProduct,
  editProduct,
  openVariant,
  openSupplier,
  openCustomer,
  openOrder,
  reload,
}: {
  route: RouteState;
  data: DataState;
  loading: boolean;
  navigate: Navigate;
  notify: Notify;
  mutate: MutateData;
  openProduct: (id: string) => void;
  editProduct: (id: string) => void;
  openVariant: (id: string, productId?: string) => void;
  openSupplier: (id: string) => void;
  openCustomer: (id: string) => void;
  openOrder: (id: string) => void;
  reload: () => Promise<void>;
}) {
  const view = route.view;
  const selectedProductFallback =
    data.products.find((product) => product.id === route.productId) || null;
  const selectedProductQuery = useQuery({
    queryKey: ["catalog", "product", route.productId],
    queryFn: () => api.product(route.productId as string),
    enabled: Boolean(route.productId && (view === "product" || view === "product-edit")),
  });
  const selectedProduct = selectedProductQuery.data || selectedProductFallback;
  const selectedVariant = data.products
    .flatMap((product) => product.variants)
    .find((variant) => variant.id === route.variantId) || null;
  const selectedSupplier =
    data.suppliers.find((supplier) => supplier.id === route.supplierId) || null;
  const dashboardQuery = useQuery<DashboardSummary>({
    queryKey: ["dashboard", "summary"],
    queryFn: api.dashboardSummary,
    enabled: view === "dashboard",
  });

  return (
    <Suspense fallback={<div className="loading-row">Cargando módulo…</div>}>
    <>
      {loading && <div className="loading-bar" />}
      {view === "dashboard" && (
        <DashboardPage data={data} summary={dashboardQuery.data} navigate={navigate} openProduct={openProduct} openVariant={openVariant} />
      )}
      {view === "products" && (
        <ProductsPage
          data={data}
          openProduct={openProduct}
          editProduct={editProduct}
          openVariant={openVariant}
          navigate={navigate}
        />
      )}
      {(view === "product" || view === "product-edit") && selectedProduct && (
        <ProductDetailPage
          product={selectedProduct}
          data={data}
          editingFromRoute={view === "product-edit"}
          navigate={navigate}
          editProduct={editProduct}
          openVariant={openVariant}
          mutate={mutate}
          notify={notify}
        />
      )}
      {view === "sku" && selectedVariant && (
        <SkuDetailPage
          variant={selectedVariant}
          data={data}
          navigate={navigate}
          openVariant={openVariant}
          mutate={mutate}
          notify={notify}
        />
      )}
      {view === "new-product" && (
        <NewProductPage
          data={data}
          navigate={navigate}
          mutate={mutate}
          notify={notify}
          openProduct={openProduct}
        />
      )}
      {view === "product-import" && (
        <ImportProductsPage
          notify={notify}
          navigate={navigate}
          openProduct={openProduct}
          reload={reload}
        />
      )}
      {(view === "brands" || view === "categories") && (
        <ReferencesPage type={view} data={data} mutate={mutate} notify={notify} />
      )}
      {view === "suppliers" && (
        <SuppliersPage
          data={data}
          mutate={mutate}
          notify={notify}
          openSupplier={openSupplier}
          reload={reload}
        />
      )}
      {view === "supplier" && selectedSupplier && (
        <SupplierDetailPage
          supplier={selectedSupplier}
          data={data}
          navigate={navigate}
          openVariant={openVariant}
          mutate={mutate}
          notify={notify}
        />
      )}
      {view === "prices" && (
        <PricesPage
          data={data}
          mutate={mutate}
          notify={notify}
          openVariant={openVariant}
        />
      )}
      {view === "inventory" && (
        <InventoryPage notify={notify} openVariant={openVariant} />
      )}
      {view === "customers" && (
        <CustomersPage notify={notify} openCustomer={openCustomer} />
      )}
      {view === "customer" && route.customerId && (
        <CustomerDetailPage
          id={route.customerId}
          notify={notify}
          back={() => navigate("customers")}
          openOrder={openOrder}
        />
      )}
      {view === "orders" && (
        <OrdersPage
          openOrder={openOrder}
          newOrder={() => navigate("new-order")}
        />
      )}
      {view === "new-order" && (
        <NewOrderPage
          data={data}
          notify={notify}
          back={() => navigate("orders")}
          openOrder={openOrder}
        />
      )}
      {view === "order" && route.orderId && (
        <OrderDetailPage
          id={route.orderId}
          notify={notify}
          back={() => navigate("orders")}
        />
      )}
      {view === "settings" && (
        <PricingSettingsPage data={data} mutate={mutate} notify={notify} />
      )}
      {view === "shipping-options" && <ShippingOptionsPage notify={notify} />}
      {view === "audit" && <AuditPage />}
      {((view === "product" || view === "product-edit") && !selectedProduct) ||
      (view === "sku" && !selectedVariant) ||
      (view === "supplier" && !selectedSupplier) ? (
        <NotFound navigate={navigate} />
      ) : null}
    </>
    </Suspense>
  );
}
