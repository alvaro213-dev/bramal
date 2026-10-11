import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductActions } from "@/components/product-actions"; import { getSession } from "@/lib/auth";

export default async function ProductsPage() { const session = await getSession(); const canManage = String(session.role) === "ADMINISTRADOR" || String(session.role) === "OPERADOR"; const canDelete = String(session.role) === "ADMINISTRADOR";
  const products = await prisma.product.findMany({
    include: {
      category: true,
      supplier: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <section>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="muted">Catálogo y existencias</p>
          <h1 className="text-2xl font-bold">Productos</h1>
        </div>

        <Link
          href="/products/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Nuevo producto
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-4">Producto</th>
              <th>SKU</th>
              <th>Categoría</th>
              <th>Stock</th>
              <th>Costo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-4 font-medium">
                  <Link
                    href={`/products/${p.id}`}
                    className="text-blue-700 hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>

                <td className="text-slate-500">{p.sku}</td>
                <td>{p.category.name}</td>

                <td>
                  <span
                    className={`badge ${
                      p.currentStock === 0
                        ? "bg-red-100 text-red-700"
                        : p.currentStock <= p.minimumStock
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {p.currentStock} {p.unit}
                  </span>
                </td>

                <td>${Number(p.purchasePrice).toLocaleString("es-CL")}</td>

                <td>
                  <span className="badge bg-slate-100 text-slate-600">
                    {p.status}
                  </span>
                </td>

                <td>
                  {canManage ? <ProductActions id={p.id} name={p.name} status={p.status} canDelete={canDelete} /> : <span className="text-xs text-slate-400">Sin permisos</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}