import { MovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export async function dashboardData() {
  const now = new Date(); const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [products, units, activeStock, out, monthly, categories, recent] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVO" } }), prisma.product.aggregate({ _sum: { currentStock: true }, where: { status: "ACTIVO" } }), prisma.product.findMany({ where: { status: "ACTIVO" }, select: { id: true, name: true, sku: true, currentStock: true, minimumStock: true } }), prisma.product.count({ where: { status: "ACTIVO", currentStock: 0 } }), prisma.inventoryMovement.groupBy({ by: ["type"], _sum: { quantity: true }, where: { createdAt: { gte: monthStart } } }), prisma.category.findMany({ include: { products: { select: { currentStock: true, purchasePrice: true } } } }), prisma.inventoryMovement.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { product: true } })
  ]);
  const low = activeStock.filter(product => product.currentStock > 0 && product.currentStock <= product.minimumStock);
  const totalValue = (await prisma.product.findMany({ select: { currentStock: true, purchasePrice: true }, where: { status: "ACTIVO" } })).reduce((sum, p) => sum + p.currentStock * Number(p.purchasePrice), 0);
  return { products, units: units._sum.currentStock ?? 0, totalValue, low, out, monthly, categoryValues: categories.map(c => ({ name: c.name, value: c.products.reduce((s,p) => s + p.currentStock * Number(p.purchasePrice), 0) })), recent };
}
