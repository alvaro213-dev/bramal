import { MovementType, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
type MovementInput = { productId: string; type: MovementType; quantity: number; unitCost?: number | null; reason: string; notes?: string | null };
export async function registerMovement(input: MovementInput, userId: string, role: Role) {
  const permittedRoles: Role[] = [Role.ADMINISTRADOR, Role.VENDEDOR];
  if (!permittedRoles.includes(role)) throw new Error("No tienes permisos para registrar movimientos.");
  if (role === Role.VENDEDOR && input.type === MovementType.AJUSTE) throw new Error("Los vendedores sólo pueden registrar entradas y salidas.");
  return prisma.$transaction(async (tx) => {
    // Row lock makes concurrent withdrawals serialize and prevents negative stock.
    const locked = await tx.$queryRaw<{ id: string; currentStock: number }[]>`SELECT id, "currentStock" FROM "Product" WHERE id = ${input.productId} FOR UPDATE`;
    const product = locked[0];
    if (!product) throw new Error("Producto no encontrado.");
    const absolute = Math.abs(input.quantity);
    const delta = input.type === MovementType.ENTRADA ? absolute : input.type === MovementType.SALIDA ? -absolute : input.quantity;
    const next = product.currentStock + delta;
    if (next < 0) throw new Error(`Stock insuficiente. Actualmente existen ${product.currentStock} unidades disponibles.`);
    await tx.product.update({ where: { id: product.id }, data: { currentStock: next } });
    return tx.inventoryMovement.create({ data: { productId: product.id, userId, type: input.type, quantity: delta, previousStock: product.currentStock, resultingStock: next, unitCost: input.unitCost === undefined || input.unitCost === null ? undefined : new Prisma.Decimal(input.unitCost), reason: input.reason, notes: input.notes } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
