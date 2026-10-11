import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { AuthError, hashPassword, requireRole, sessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userSchema } from "@/validations";
function failure(error: unknown) { const status = error instanceof AuthError ? error.status : 400; return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo procesar el usuario" }, { status }); }
export async function GET(request: NextRequest) { try { requireRole(await sessionFromRequest(request), [Role.ADMINISTRADOR]); return NextResponse.json(await prisma.user.findMany({ select: { id: true, name: true, username: true, email: true, role: true, status: true, createdAt: true }, orderBy: { name: "asc" } })); } catch (error) { return failure(error); } }
export async function POST(request: NextRequest) { try { requireRole(await sessionFromRequest(request), [Role.ADMINISTRADOR]); const { password, email, ...data } = userSchema.parse(await request.json()); const user = await prisma.user.create({ data: { ...data, email: email || null, passwordHash: await hashPassword(password) }, select: { id: true, name: true, username: true, email: true, role: true, status: true } }); return NextResponse.json(user, { status: 201 }); } catch (error) { return failure(error); } }