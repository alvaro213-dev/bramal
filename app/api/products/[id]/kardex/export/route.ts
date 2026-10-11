import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      movements: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!product) {
    return new Response("Producto no encontrado", { status: 404 });
  }

  let saldoDinero = 0;

  const rows = product.movements.map((movement) => {
    const costoUnitario = Number(
      movement.unitCost ?? product.purchasePrice
    );

    const entradaUnidades =
      movement.quantity > 0 ? movement.quantity : 0;

    const salidaUnidades =
      movement.quantity < 0 ? Math.abs(movement.quantity) : 0;

    const entradaDinero = entradaUnidades * costoUnitario;
    const salidaDinero = salidaUnidades * costoUnitario;

    saldoDinero = saldoDinero + entradaDinero - salidaDinero;

    return {
      Fecha: movement.createdAt.toLocaleDateString("es-CL"),
      Detalle: `${movement.type}: ${movement.reason}`,
      "Costo unitario": costoUnitario,
      "Entrada unidades": entradaUnidades,
      "Salida unidades": salidaUnidades,
      "Saldo unidades": movement.resultingStock,
      "Entrada dinero": entradaDinero,
      "Salida dinero": salidaDinero,
      "Saldo dinero": saldoDinero,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Kardex");

  const file = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
  });

  const filename = `kardex-${product.sku}.xlsx`;

  return new Response(file, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}