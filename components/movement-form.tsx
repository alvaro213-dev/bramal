"use client";
import { useMemo, useState } from "react";

type Product = { id: string; name: string; sku: string; currentStock: number; category: { name: string } };
type SearchField = "category" | "name" | "sku";

export function MovementForm({ products, allowAdjustment }: { products: Product[]; allowAdjustment: boolean }) {
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [searchBy, setSearchBy] = useState<SearchField>("name");
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState("");
  const categories = useMemo(() => [...new Set(products.map(product => product.category.name))].sort(), [products]);
  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-CL");
    if (!normalized) return products;
    return products.filter(product => {
      const value = searchBy === "category" ? product.category.name : searchBy === "name" ? product.name : product.sku;
      return value.toLocaleLowerCase("es-CL").includes(normalized);
    });
  }, [products, query, searchBy]);
  function changeSearch(value: SearchField) { setSearchBy(value); setQuery(""); setProductId(""); }
  async function submit(form: FormData) { setLoading(true); setMessage(undefined); const payload = Object.fromEntries(form); const response = await fetch("/api/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const result = await response.json(); setMessage(response.ok ? "Movimiento registrado correctamente." : result.error); setLoading(false); if (response.ok) window.location.reload(); }
  const placeholder = searchBy === "category" ? "Selecciona una categoría" : searchBy === "name" ? "Escribe el nombre del producto" : "Escribe el SKU";
  return <form action={submit} className="card grid gap-3 p-5 md:grid-cols-2"><div className="md:col-span-2"><h2 className="font-semibold">Registrar movimiento</h2><p className="mt-1 text-sm text-slate-500">Busca primero el producto y luego registra la operación.</p></div><label className="text-sm font-medium">Buscar por<select value={searchBy} onChange={event => changeSearch(event.target.value as SearchField)} className="mt-1 w-full rounded-lg border p-2.5 text-sm"><option value="category">Categoría</option><option value="name">Nombre</option><option value="sku">SKU</option></select></label><label className="text-sm font-medium">{searchBy === "category" ? "Categoría" : searchBy === "name" ? "Nombre" : "SKU"}{searchBy === "category" ? <select value={query} onChange={event => { setQuery(event.target.value); setProductId(""); }} className="mt-1 w-full rounded-lg border p-2.5 text-sm"><option value="">Todas las categorías</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select> : <input value={query} onChange={event => { setQuery(event.target.value); setProductId(""); }} placeholder={placeholder} className="mt-1 w-full rounded-lg border p-2.5 text-sm"/>}</label><label className="md:col-span-2 text-sm font-medium">Producto<select name="productId" value={productId} onChange={event => setProductId(event.target.value)} required className="mt-1 w-full rounded-lg border p-2.5 text-sm"><option value="">Selecciona producto {query ? `(${filteredProducts.length} encontrados)` : ""}</option>{filteredProducts.map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku} · {product.category.name} · stock {product.currentStock}</option>)}</select></label>{query && !filteredProducts.length && <p className="text-sm text-amber-700 md:col-span-2">No hay productos que coincidan con la búsqueda.</p>}<select name="type" className="rounded-lg border p-2.5 text-sm"><option value="ENTRADA">Entrada</option><option value="SALIDA">Salida</option>{allowAdjustment && <option value="AJUSTE">Ajuste (+/-)</option>}</select><input name="quantity" type="number" required placeholder="Cantidad" className="rounded-lg border p-2.5 text-sm"/><input name="reason" required placeholder="Motivo" className="rounded-lg border p-2.5 text-sm"/><input name="unitCost" type="number" step="0.01" placeholder="Costo unitario (opcional)" className="rounded-lg border p-2.5 text-sm"/><button disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Guardando…" : "Registrar"}</button>{message && <p className="text-sm text-slate-600 md:col-span-2">{message}</p>}</form>;
}