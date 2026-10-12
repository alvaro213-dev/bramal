import Link from "next/link";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSession, requireRole } from "@/lib/auth";
import { ProductImport } from "@/components/product-import";

export default async function ImportProductsPage() {
  try { requireRole(await getSession(), [Role.ADMINISTRADOR, Role.OPERADOR]); } catch { redirect("/products?error=sin-permisos"); }
  return <section><Link href="/products" className="muted">← Volver a productos</Link><h1 className="mb-6 mt-2 text-2xl font-bold">Importar productos</h1><ProductImport /></section>;
}
