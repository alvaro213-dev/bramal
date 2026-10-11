import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const movements = await prisma.inventoryMovement.findMany({
    include: {
      user: true,
      product: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const rows = movements.map((movement) => ({
    Fecha: movement.createdAt.toLocaleDateString("es-CL"),
    Usuario: movement.user.name,
    Correo: movement.user.email,
    Producto: movement.product.name,
    SKU: movement.product.sku,
    Tipo: movement.type,
    Cantidad: movement.quantity,
    "Stock anterior": movement.previousStock,
    "Stock resultante": movement.resultingStock,
    Motivo: movement.reason,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Movimientos");

  const file = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  return new Response(file, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="informe-movimientos.xlsx"',
    },
  });
}