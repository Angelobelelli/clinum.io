-- CreateEnum
CREATE TYPE "AgendamentoStatus" AS ENUM ('agendado', 'confirmado', 'realizado', 'cancelado', 'falta');

-- CreateTable
CREATE TABLE "agendamento" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "dataHoraInicio" TIMESTAMP(3) NOT NULL,
    "dataHoraFim" TIMESTAMP(3) NOT NULL,
    "status" "AgendamentoStatus" NOT NULL DEFAULT 'agendado',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agendamento_organizationId_idx" ON "agendamento"("organizationId");

-- CreateIndex
CREATE INDEX "agendamento_organizationId_profissionalId_dataHoraInicio_idx" ON "agendamento"("organizationId", "profissionalId", "dataHoraInicio");

-- AddForeignKey
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
