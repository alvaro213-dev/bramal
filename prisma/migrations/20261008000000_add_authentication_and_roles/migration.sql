-- Replace the legacy read-only role with the requested seller role.
ALTER TYPE "Role" RENAME VALUE 'VISUALIZADOR' TO 'VENDEDOR';
ALTER TABLE "User" ADD COLUMN "username" TEXT, ADD COLUMN "passwordHash" TEXT;
UPDATE "User" SET "username" = lower(split_part("email", '@', 1)), "passwordHash" = 'RESET_REQUIRED';
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL, ALTER COLUMN "passwordHash" SET NOT NULL, ALTER COLUMN "email" DROP NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");