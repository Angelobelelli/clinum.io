-- CreateTable
CREATE TABLE "agendamento_audit_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "statusAnterior" "AgendamentoStatus" NOT NULL,
    "statusNovo" "AgendamentoStatus" NOT NULL,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agendamento_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agendamento_audit_log_organizationId_idx" ON "agendamento_audit_log"("organizationId");

-- CreateIndex
CREATE INDEX "agendamento_audit_log_agendamentoId_idx" ON "agendamento_audit_log"("agendamentoId");

-- AddForeignKey
ALTER TABLE "agendamento_audit_log" ADD CONSTRAINT "agendamento_audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
