import { Role, Status } from "@prisma/client";
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "inventario_session";
const maxAge = 60 * 60 * 8;
export type Session = { id: string; role: Role; name: string; username: string };
export class AuthError extends Error { constructor(message = "Debes iniciar sesión.", public status = 401) { super(message); } }
function secret() { const value = process.env.AUTH_SECRET; if (!value || value.length < 32) throw new Error("AUTH_SECRET debe tener al menos 32 caracteres."); return value; }
export async function hashPassword(password: string) { const salt = randomBytes(16).toString("hex"); const derived = await scrypt(password, salt, 64) as Buffer; return `scrypt$${salt}$${derived.toString("hex")}`; }
export async function verifyPassword(password: string, encoded: string) { const [algorithm, salt, expected] = encoded.split("$"); if (algorithm !== "scrypt" || !salt || !expected) return false; const derived = await scrypt(password, salt, 64) as Buffer; return timingSafeEqual(Buffer.from(expected, "hex"), derived); }
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }
function encode(session: Session) { const payload = Buffer.from(JSON.stringify({ id: session.id, exp: Date.now() + maxAge * 1000 })).toString("base64url"); return `${payload}.${sign(payload)}`; }
async function decode(token?: string): Promise<Session | null> { if (!token) return null; const [payload, signature] = token.split("."); if (!payload || !signature || !timingSafeEqual(Buffer.from(sign(payload)), Buffer.from(signature))) return null; try { const value = JSON.parse(Buffer.from(payload, "base64url").toString()) as { id: string; exp: number }; if (!value.id || value.exp < Date.now()) return null; const user = await prisma.user.findUnique({ where: { id: value.id }, select: { id: true, name: true, username: true, role: true, status: true } }); return user?.status === Status.ACTIVO ? user : null; } catch { return null; } }
export async function getSession(): Promise<Session> { const session = await decode((await cookies()).get(SESSION_COOKIE)?.value); if (!session) throw new AuthError(); return session; }
export async function sessionFromRequest(request: NextRequest): Promise<Session> { const session = await decode(request.cookies.get(SESSION_COOKIE)?.value); if (!session) throw new AuthError(); return session; }
export function requireRole(session: Session, allowed: Role[]) { if (!allowed.includes(session.role)) throw new AuthError("No tienes permisos para esta acción.", 403); }
export function sessionCookie(session: Session) { return { name: SESSION_COOKIE, value: encode(session), options: { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge } }; }