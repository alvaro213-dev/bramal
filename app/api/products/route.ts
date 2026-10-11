import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { sessionFromRequest, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/validations";
export async function GET(request: NextRequest) { await sessionFromRequest(request); const q = request.nextUrl.searchParams.get("q") || ""; const products = await prisma.product.findMany({ where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] }, include: { category: true, supplier: true }, orderBy: { name: "asc" } }); return NextResponse.json(products); }
export async function POST(request: NextRequest) { try { const session = await sessionFromRequest(request); requireRole(session, [Role.ADMINISTRADOR, Role.OPERADOR]); const parsed = productSchema.parse(await request.json()); const data = { ...parsed, supplierId: parsed.supplierId || null, description: parsed.description || null }; const product = await prisma.product.create({ data }); return NextResponse.json(product, { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Datos inválidos" }, { status: 400 }); } }
