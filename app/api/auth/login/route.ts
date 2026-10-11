import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionCookie, verifyPassword } from "@/lib/auth";
import { z } from "zod";
const schema = z.object({ username: z.string().trim().toLowerCase().min(1), password: z.string().min(1) });
export async function POST(request: NextRequest) { try { const { username, password } = schema.parse(await request.json()); const user = await prisma.user.findUnique({ where: { username } }); if (!user || user.status !== "ACTIVO" || !(await verifyPassword(password, user.passwordHash))) return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 }); const response = NextResponse.json({ ok: true }); const cookie = sessionCookie(user); response.cookies.set(cookie.name, cookie.value, cookie.options); return response; } catch { return NextResponse.json({ error: "Datos de inicio de sesión inválidos." }, { status: 400 }); } }