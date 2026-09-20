import { useState, type ReactNode } from "react";
import {
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  CircleDollarSign,
  LayoutDashboard,
  Package,
  Percent,
  Settings,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import type { Navigate, View } from "../../../app/navigation";

export function Sidebar({
  view,
  open,
  navigate,
  onClose,
}: {
  view: View;
  open: boolean;
  navigate: Navigate;
  onClose: () => void;
}) {
  const [catalogOpen, setCatalogOpen] = useState(true);
  const item = (target: View, icon: ReactNode, label: string, sub = false) => (
    <button
      className={`nav-item ${sub ? "sub" : ""} ${view === target ? "active" : ""}`}
      onClick={() => navigate(target)}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-head">
          <img
            className="sidebar-logo"
            src="/brand/patitas-logo-horizontal.png"
            alt="Patitas Inquietas"
          />
          <span className="backoffice-label">Backoffice</span>
          <button className="mobile-close" type="button" aria-label="Cerrar navegación" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <nav>
          {item("dashboard", <LayoutDashboard size={18} />, "Dashboard")}
          <button
            className={`nav-item ${["products", "product", "product-edit", "sku", "new-product", "product-import", "brands", "categories"].includes(view) ? "parent-active" : ""}`}
            type="button"
            aria-expanded={catalogOpen}
            aria-controls="catalog-navigation"
            onClick={() => setCatalogOpen(!catalogOpen)}
          >
            <Package size={18} />
            <span>Catálogo</span>
            <ChevronDown className={catalogOpen ? "rotated" : ""} size={15} />
          </button>
          {catalogOpen && (
            <div className="nav-group" id="catalog-navigation">
              {item("products", null, "Productos", true)}
              {item("categories", null, "Categorías", true)}
              {item("brands", null, "Marcas", true)}
            </div>
          )}
          {item("suppliers", <Building2 size={18} />, "Proveedores")}
          {item("prices", <CircleDollarSign size={18} />, "Precios")}
          {item("promotions-benefits", <Percent size={18} />, "Promociones y beneficios")}
          <div className="nav-separator" />
          {item("inventory", <Boxes size={18} />, "Inventario")}
          {item("orders", <ShoppingBag size={18} />, "Pedidos")}
          {item("customers", <Users size={18} />, "Clientes")}
        </nav>
        <div className="sidebar-foot">
           {item("settings", <Settings size={18} />, "Configuración")}
          {item("shipping-options", <Package size={18} />, "Opciones de envío")}
          <button
            className={`nav-item ${view === "audit" ? "active" : ""}`}
            onClick={() => navigate("audit")}
          >
            <ClipboardList size={18} />
            <span>Auditoría</span>
          </button>
        </div>
      </aside>
      {open && <div className="backdrop" onClick={onClose} />}
    </>
  );
}
