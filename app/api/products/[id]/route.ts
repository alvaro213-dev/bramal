import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireRole, sessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/validations";

function errorResponse(error: unknown) {
  const status = error instanceof AuthError ? error.status : 400;
  return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo procesar el producto." }, { status });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireRole(await sessionFromRequest(request), [Role.ADMINISTRADOR, Role.OPERADOR]);
    const product = await prisma.product.update({ where: { id: (await params).id }, data: productSchema.partial().parse(await request.json()) });
    return NextResponse.json(product);
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireRole(await sessionFromRequest(request), [Role.ADMINISTRADOR]);
    const id = (await params).id;
    const product = await prisma.product.findUnique({ where: { id }, select: { id: true, _count: { select: { movements: true } } } });
    if (!product) return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    if (product._count.movements > 0) return NextResponse.json({ error: "No se puede eliminar un producto con movimientos. Desactívalo para conservar la trazabilidad." }, { status: 409 });
    await prisma.product.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return errorResponse(error); }
}