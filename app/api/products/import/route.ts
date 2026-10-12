import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { sessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema, productSchema } from "@/validations";

const columns = ["SKU", "Nombre", "Categoria", "Proveedor", "Precio compra", "Precio venta", "Stock minimo", "Unidad", "Descripcion"];
const normalize = (value: unknown) => String(value ?? "").trim();
const nameKey = (value: string) => value.trim().toLocaleLowerCase("es-CL");

export async function GET() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    columns,
    ["SKU-001", "Producto de ejemplo", "Nombre de categoria existente", "Proveedor opcional", 1000, 1500, 5, "unidad", "Descripcion opcional"],
  ]);
  sheet["!cols"] = columns.map((column) => ({ wch: Math.max(column.length + 4, 18) }));
  XLSX.utils.book_append_sheet(workbook, sheet, "Productos");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-productos.xlsx"',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await sessionFromRequest(request);
    requireRole(session, [Role.ADMINISTRADOR, Role.OPERADOR]);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Selecciona un archivo Excel.");
    if (!/\.(xlsx|xls)$/i.test(file.name)) throw new Error("El archivo debe ser Excel (.xlsx o .xls).");

    const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error("El archivo no contiene una hoja de cálculo.");
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
    if (!rows.length) throw new Error("El archivo no contiene productos.");
    if (rows.length > 500) throw new Error("Puedes importar hasta 500 productos por archivo.");

    const [categories, suppliers, existingProducts] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true, status: true } }),
      prisma.supplier.findMany({ where: { status: "ACTIVO" }, select: { id: true, name: true } }),
      prisma.product.findMany({ select: { sku: true } }),
    ]);
    const categoryByName = new Map(categories.map((item) => [nameKey(item.name), item]));
    const supplierByName = new Map(suppliers.map((item) => [nameKey(item.name), item.id]));
    const existingSkus = new Set(existingProducts.map((item) => item.sku.toLowerCase()));
    const importedSkus = new Set<string>();
    const newCategories = new Map<string, string>();
    const errors: string[] = [];
    const products: Array<ReturnType<typeof productSchema.parse>> = [];

    rows.forEach((row, index) => {
      const line = index + 2;
      const sku = normalize(row.SKU);
      const categoryName = normalize(row.Categoria);
      const supplierName = normalize(row.Proveedor);
      const categoryKey = nameKey(categoryName);
      const category = categoryByName.get(categoryKey);
      const supplierId = supplierName ? supplierByName.get(nameKey(supplierName)) : undefined;
      if (!categoryName) {
        errors.push(`Fila ${line}: debes indicar una categoría.`);
      } else if (category?.status === "INACTIVO") {
        errors.push(`Fila ${line}: la categoría "${categoryName}" existe, pero está inactiva.`);
      } else if (!category) {
        const categoryResult = categorySchema.safeParse({ name: categoryName });
        if (!categoryResult.success) {
          errors.push(`Fila ${line}: el nombre de categoría "${categoryName}" no es válido.`);
        } else if (session.role !== Role.ADMINISTRADOR) {
          errors.push(`Fila ${line}: sólo un administrador puede crear la nueva categoría "${categoryName}".`);
        } else {
          newCategories.set(categoryKey, categoryResult.data.name);
        }
      }
      if (supplierName && !supplierId) errors.push(`Fila ${line}: el proveedor "${supplierName}" no existe o está inactivo.`);
      if (existingSkus.has(sku.toLowerCase())) errors.push(`Fila ${line}: el SKU "${sku}" ya existe.`);
      if (importedSkus.has(sku.toLowerCase())) errors.push(`Fila ${line}: el SKU "${sku}" está repetido en el archivo.`);
      importedSkus.add(sku.toLowerCase());
      try {
        products.push(productSchema.parse({
          sku,
          name: normalize(row.Nombre),
          categoryId: category?.id || `new-category:${categoryKey}`,
          supplierId: supplierId || null,
          purchasePrice: row["Precio compra"],
          salePrice: row["Precio venta"],
          minimumStock: row["Stock minimo"],
          unit: normalize(row.Unidad) || "unidad",
          description: normalize(row.Descripcion) || null,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message.replace(/\n/g, "; ") : "datos inválidos";
        errors.push(`Fila ${line}: ${message}`);
      }
    });
    if (errors.length) return NextResponse.json({ error: "Corrige el archivo antes de importar.", details: errors.slice(0, 20) }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      const createdCategories = new Map<string, string>();
      for (const [key, name] of newCategories) {
        const created = await tx.category.create({ data: { name } });
        createdCategories.set(key, created.id);
      }
      await tx.product.createMany({
        data: products.map(({ supplierId, description, categoryId, ...product }) => ({
          ...product,
          categoryId: categoryId.startsWith("new-category:") ? createdCategories.get(categoryId.slice("new-category:".length))! : categoryId,
          supplierId: supplierId || null,
          description: description || null,
        })),
      });
    });
    return NextResponse.json({ created: products.length, categoriesCreated: newCategories.size });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo importar el archivo." }, { status: 400 });
  }
}
