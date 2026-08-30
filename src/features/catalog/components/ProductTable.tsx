import { ChevronDown, ChevronRight, Package, Pencil } from "lucide-react";
import { useState } from "react";
import type { Offer, Product, Supplier } from "../../../types";
import { FulfillmentBadge, PublicationBadge } from "../../../shared/components";
import { money } from "../../../shared/formatters";
import { formatPresentation, fulfillmentStatus } from "../utils";

export function ProductTable({ products, offers, suppliers: _suppliers, openVariant, openProduct, editProduct }: {
  products: Product[];
  offers: Offer[];
  suppliers: Supplier[];
  openVariant: (id: string, productId?: string) => void;
  openProduct?: (id: string) => void;
  editProduct?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return <div className="table-wrap product-table-wrap"><table className="product-table">
    <thead><tr><th>Producto</th><th>Marca</th><th>Presentaciones</th><th>Categoría</th><th>Especie</th><th>Estado</th><th /></tr></thead>
    {products.map((product) => {
      const isExpanded = expanded[product.id] === true;
      return <ProductGroup key={product.id} product={product} offers={offers} isExpanded={isExpanded} openVariant={openVariant} openProduct={openProduct} editProduct={editProduct} onToggle={() => setExpanded((current) => ({ ...current, [product.id]: !isExpanded }))} />;
    })}
  </table></div>;
}

function ProductGroup({ product, offers, isExpanded, openVariant, openProduct, editProduct, onToggle }: {
  product: Product;
  offers: Offer[];
  isExpanded: boolean;
  openVariant: (id: string, productId?: string) => void;
  openProduct?: (id: string) => void;
  editProduct?: (id: string) => void;
  onToggle: () => void;
}) {
  return <tbody className="product-group-body">
    <tr className="product-group-row" tabIndex={openProduct ? 0 : -1} onClick={() => openProduct?.(product.id)} onKeyDown={(event) => {
      if (!openProduct || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault(); openProduct(product.id);
    }}>
      <td><div className="product-cell"><span className="product-thumb"><Package size={18} /></span><span><strong>{product.name}</strong><small>{product.variants.length} {product.variants.length === 1 ? "presentación registrada" : "presentaciones registradas"}</small></span></div></td>
      <td className="product-brand-cell">{product.brand.name}</td>
      <td><button type="button" className="presentation-toggle" aria-expanded={isExpanded} onClick={(event) => { event.stopPropagation(); onToggle(); }}><ChevronDown size={14} className={isExpanded ? "rotated" : ""} />{product.variants.length}</button></td>
      <td className="product-category-cell">{product.category?.name || "—"}</td>
      <td className="product-species-cell">{product.species || "—"}</td>
      <td><PublicationBadge status={product.status} /></td>
      <td><span className="product-row-actions"><button type="button" className={`icon-button table-expand ${isExpanded ? "expanded" : ""}`} title={isExpanded ? "Ocultar presentaciones" : "Mostrar presentaciones"} aria-label={`${isExpanded ? "Ocultar" : "Mostrar"} presentaciones de ${product.name}`} onClick={(event) => { event.stopPropagation(); onToggle(); }}><ChevronRight size={16} /></button>{editProduct && <button type="button" className="icon-button table-edit" title="Editar información del producto" aria-label={`Editar ${product.name}`} onClick={(event) => { event.stopPropagation(); editProduct(product.id); }}><Pencil size={15} /></button>}</span></td>
    </tr>
    {isExpanded && (product.variants.length ? <tr className="product-variant-row"><td colSpan={2}><div className="product-variants">{product.variants.map((variant) => {
      const status = fulfillmentStatus(variant);
      const available = status === "IN_STOCK" || status === "ON_REQUEST";
      return <button type="button" className="product-variant-item" tabIndex={0} key={variant.id} onClick={() => openVariant(variant.id, product.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openVariant(variant.id, product.id); } }}>
        <span className="variant-presentation"><strong>{formatPresentation(variant.presentation, variant.weightGrams)}</strong></span>
        <span className="variant-price">{money(variant.salePrice)}</span>
        <span className="variant-availability"><FulfillmentBadge status={status} /><small>{available ? "Disponible" : "No disponible"}</small></span>
        <ChevronRight size={15} />
      </button>;
    })}</div></td><td className="variant-meta">—</td><td className="variant-meta">—</td><td className="variant-meta">—</td><td className="variant-meta">—</td></tr> : <tr className="product-variants-empty-row"><td colSpan={7}>Este producto todavía no tiene presentaciones.</td></tr>)}
  </tbody>;
}
