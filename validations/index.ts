import { MovementType, Role, Status } from "@prisma/client";
import { z } from "zod";
export const productSchema = z.object({ sku: z.string().min(2).max(60), name: z.string().min(2).max(160), description: z.string().max(1000).optional().nullable(), categoryId: z.string().min(1), supplierId: z.string().optional().nullable(), purchasePrice: z.coerce.number().nonnegative(), salePrice: z.coerce.number().nonnegative(), minimumStock: z.coerce.number().int().nonnegative(), unit: z.string().min(1).max(30), status: z.nativeEnum(Status).default(Status.ACTIVO) });
export const categorySchema = z.object({ name: z.string().min(2).max(100), description: z.string().max(500).optional().nullable(), status: z.nativeEnum(Status).default(Status.ACTIVO) });
export const supplierSchema = z.object({ name: z.string().min(2).max(160), rut: z.string().max(20).optional().nullable(), phone: z.string().max(30).optional().nullable(), email: z.string().email().optional().or(z.literal("")).nullable(), address: z.string().max(250).optional().nullable(), contactName: z.string().max(120).optional().nullable(), status: z.nativeEnum(Status).default(Status.ACTIVO) });
export const movementSchema = z.object({ productId: z.string().min(1), type: z.nativeEnum(MovementType), quantity: z.coerce.number().int().refine((value) => value !== 0, "La cantidad no puede ser cero"), unitCost: z.coerce.number().nonnegative().optional().nullable(), reason: z.string().min(3).max(160), notes: z.string().max(1000).optional().nullable() });
export const userSchema = z.object({
  name: z.string().min(2).max(120),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,50}$/, "El usuario debe tener entre 3 y 50 caracteres: letras, números, punto, guion o guion bajo."),
  password: z.string().min(12, "La contraseña debe tener al menos 12 caracteres.").max(128),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  role: z.nativeEnum(Role),
  status: z.nativeEnum(Status).default(Status.ACTIVO),
});
