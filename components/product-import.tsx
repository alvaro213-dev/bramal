"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function ProductImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<string[]>([]);
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setError("Selecciona un archivo Excel."); return; }
    setLoading(true); setError(""); setDetails([]); setSuccess("");
    const data = new FormData(); data.set("file", file);
    const response = await fetch("/api/products/import", { method: "POST", body: data });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) { setError(body.error || "No se pudo importar el archivo."); setDetails(body.details || []); return; }
    const categories = body.categoriesCreated ? ` y se crearon ${body.categoriesCreated} categoría${body.categoriesCreated === 1 ? "" : "s"}` : "";
    setSuccess(`Se registraron ${body.created} producto${body.created === 1 ? "" : "s"}${categories} correctamente.`);
    setFile(null); (event.currentTarget.elements.namedItem("file") as HTMLInputElement).value = "";
    router.refresh();
  }

  return <form onSubmit={submit} className="card max-w-3xl space-y-5 p-6">
    <div><h2 className="text-lg font-semibold">Importar productos desde Excel</h2><p className="muted mt-1">Carga hasta 500 productos. No se registrará ninguno si el archivo contiene errores.</p></div>
    <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600"><li>Descarga la plantilla y completa una fila por producto.</li><li>Las categorías nuevas se crean automáticamente para administradores; los proveedores deben existir y estar activos.</li><li>El SKU debe ser único. El stock inicial se registra después mediante movimientos.</li></ol>
    <Link href="/api/products/import" className="inline-block rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Descargar plantilla Excel</Link>
    <label className="block text-sm font-medium">Archivo Excel (.xlsx o .xls)<input name="file" type="file" accept=".xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-lg border p-2.5" /></label>
    {success && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
    {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700"><p>{error}</p>{details.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}</div>}
    <div className="flex justify-end gap-3"><Link href="/products" className="rounded-lg border px-4 py-2.5 text-sm font-semibold">Cancelar</Link><button disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Importando..." : "Importar productos"}</button></div>
  </form>;
}
