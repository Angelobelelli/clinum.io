-- CreateTable
CREATE TABLE "servico" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL,
    "preco" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "servico_organizationId_idx" ON "servico"("organizationId");

-- AddForeignKey
ALTER TABLE "servico" ADD CONSTRAINT "servico_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
