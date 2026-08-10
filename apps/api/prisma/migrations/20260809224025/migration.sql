-- AlterTable
ALTER TABLE "agendamento" ADD COLUMN     "servicoId" TEXT;

-- CreateIndex
CREATE INDEX "agendamento_servicoId_idx" ON "agendamento"("servicoId");

-- AddForeignKey
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
