"use client";
import { useRouter } from "next/navigation";

export function ProductActions({ id, name, status, canDelete }: { id: string; name: string; status: string; canDelete: boolean }) {
  const router = useRouter();
  async function changeStatus() { const nextStatus = status === "ACTIVO" ? "INACTIVO" : "ACTIVO"; if (!window.confirm(`¿Deseas ${nextStatus === "ACTIVO" ? "reactivar" : "desactivar"} el producto "${name}"?`)) return; const response = await fetch(`/api/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) }); if (!response.ok) { alert((await response.json()).error || "No se pudo actualizar el producto."); return; } router.refresh(); }
  async function remove() { if (!window.confirm(`Eliminar definitivamente "${name}"? Esta acción no se puede deshacer.`)) return; const response = await fetch(`/api/products/${id}`, { method: "DELETE" }); if (!response.ok) { alert((await response.json()).error || "No se pudo eliminar el producto."); return; } router.refresh(); }
  const isActive = status === "ACTIVO";
  return <div className="flex flex-wrap gap-2"><button onClick={changeStatus} className={isActive ? "rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100" : "rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"}>{isActive ? "Desactivar" : "Reactivar"}</button>{canDelete && <button onClick={remove} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">Eliminar</button>}</div>;
}