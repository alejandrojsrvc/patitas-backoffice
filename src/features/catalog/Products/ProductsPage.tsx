import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Plus, Search } from "lucide-react";
import { api } from "../../../api";
import type { DataState, Page, Product } from "../../../types";
import type { View } from "../../../app/navigation";
import { PageHeader, Pager, Select } from "../../../shared/components";
import { ProductTable } from "../components/ProductTable";
import { emptyPage } from "../../../shared/pagination";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";

export function ProductsPage({
  data,
  openProduct,
  editProduct,
  openVariant,
  navigate,
}: {
  data: DataState;
  openProduct: (id: string) => void;
  editProduct: (id: string) => void;
  openVariant: (id: string, productId?: string) => void;
  navigate: (view: View) => void;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query);
  const [species, setSpecies] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const resultQuery = useQuery<Page<Product>>({
    queryKey: ["catalog", "products", { query: debouncedQuery, species, category, brand, status, page }],
    queryFn: () => api.products({ q: debouncedQuery || undefined, species: species || undefined, categoryId: category || undefined, brandId: brand || undefined, status: (status || undefined) as Product["status"] | undefined, page, perPage: 24 }),
    placeholderData: (previous) => previous,
  });
  const result = resultQuery.data || emptyPage<Product>();
  const products = Array.isArray(result.items) ? result.items : [];
  const brands = Array.isArray(data.brands) ? data.brands : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const exportProducts = async () => {
    setExporting(true);
    try {
      const blob = await api.downloadProductsCsv();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "products.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      // The products screen does not receive notifications; surface the API error to the browser.
      window.alert((error as Error).message);
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Productos"
        description={`${result.meta.total} productos en catálogo`}
        actions={
          <>
            <button className="button secondary" type="button" onClick={() => void exportProducts()} disabled={exporting}>
              <Download size={16} /> {exporting ? "Exportando…" : "Exportar productos"}
            </button>
            <button className="button secondary" type="button" onClick={() => navigate("product-import")}>
              Importar CSV
            </button>
            <button
              className="button primary"
              type="button"
              onClick={() => navigate("new-product")}
            >
              <Plus size={17} /> Nuevo producto
            </button>
          </>
        }
      />
      <section className="panel table-panel">
        <div className="filters">
          <label className="search-field">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto o SKU"
            />
          </label>
          <Select
            value={species}
              onChange={(value) => { setSpecies(value); setPage(1); }}
            options={[
              ["", "Perro / Gato"],
              ["Perro", "Perro"],
              ["Gato", "Gato"],
            ]}
          />
          <Select
            value={category}
            onChange={(value) => { setCategory(value); setPage(1); }}
            options={[
              ["", "Categoría"],
              ...categories.map((x) => [x.id, x.name]),
            ]}
          />
          <Select
            value={brand}
            onChange={(value) => { setBrand(value); setPage(1); }}
            options={[["", "Marca"], ...brands.map((x) => [x.id, x.name])]}
          />
          <Select
            value={status}
            onChange={(value) => { setStatus(value); setPage(1); }}
            options={[
              ["", "Estado"],
              ["ACTIVE", "Activo"],
              ["DRAFT", "Borrador"],
              ["ARCHIVED", "Archivado"],
            ]}
          />
        </div>
        {resultQuery.error ? <div className="operation-error"><span>{resultQuery.error.message}</span><button type="button" className="button secondary small" onClick={() => void resultQuery.refetch()}>Reintentar</button></div> : resultQuery.isPending ? <div className="loading-row">Cargando productos…</div> : <ProductTable
          products={products}
          offers={data.offers}
          suppliers={data.suppliers}
          openVariant={openVariant}
          openProduct={openProduct}
          editProduct={editProduct}
        />}
        {!resultQuery.isPending && !resultQuery.error && products.length === 0 && (
          <div className="empty-state">
            <Search size={28} />
            <strong>Sin resultados</strong>
            <p>Probá cambiando o limpiando los filtros.</p>
          </div>
        )}
        <Pager page={result.meta.page} pages={result.meta.totalPages} onChange={setPage} />
      </section>
    </>
  );
}
