-- CreateEnum
CREATE TYPE "TipoVinculo" AS ENUM ('funcionario', 'parceiro_comissionado');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ativo', 'inativo');

-- AlterTable
ALTER TABLE "member" ADD COLUMN     "status" "MemberStatus" NOT NULL DEFAULT 'ativo',
ADD COLUMN     "tipoVinculo" "TipoVinculo";

-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");
