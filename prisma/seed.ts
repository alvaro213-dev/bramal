import { PrismaClient, Role, Status, MovementType } from "@prisma/client";
import { hashPassword } from "../lib/auth";
const prisma = new PrismaClient();
async function main() {
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!password || password.length < 12) throw new Error("INITIAL_ADMIN_PASSWORD debe estar definida y tener al menos 12 caracteres.");
  const admin = await prisma.user.upsert({ where: { username: "admin" }, update: { name: "Administrador", role: Role.ADMINISTRADOR, status: Status.ACTIVO, passwordHash: await hashPassword(password) }, create: { id: "seed-admin", username: "admin", name: "Administrador", passwordHash: await hashPassword(password), email: "admin@inventariopro.cl", role: Role.ADMINISTRADOR } });
  const categoryNames = ["Bebidas", "Alimentos", "Electrónica", "Limpieza", "Oficina"];
  const categories = await Promise.all(categoryNames.map(name => prisma.category.upsert({ where: { name }, update: {}, create: { name } })));
  const suppliers = await Promise.all(["Distribuidora Andes", "Comercial Pacífico", "Suministros Chile"].map((name,i) => prisma.supplier.upsert({ where: { rut: `76.123.45${i}-K` }, update: {}, create: { name, rut: `76.123.45${i}-K`, email: `ventas${i}@proveedor.cl`, contactName: "Equipo ventas" } })));
  for (let i=0;i<15;i++) { const stock = [0, 3, 8, 20, 45][i % 5]; const product = await prisma.product.upsert({ where: { sku: `SKU-${String(i+1).padStart(3,"0")}` }, update: {}, create: { sku: `SKU-${String(i+1).padStart(3,"0")}`, name: `Producto de prueba ${i+1}`, categoryId: categories[i % categories.length].id, supplierId: suppliers[i % suppliers.length].id, purchasePrice: 1000 + i * 350, salePrice: 1500 + i * 450, currentStock: stock, minimumStock: 5, unit: "unidad", status: Status.ACTIVO } }); if (stock > 0) await prisma.inventoryMovement.create({ data: { productId: product.id, userId: admin.id, type: MovementType.ENTRADA, quantity: stock, previousStock: 0, resultingStock: stock, unitCost: 1000 + i * 350, reason: "Carga inicial" } }); }
}
main().then(() => prisma.$disconnect()).catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });