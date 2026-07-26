
-- CreateTable
CREATE TABLE "patient" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "dadosVerticais" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_health_record" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "alergias" TEXT,
    "historico" TEXT,
    "observacoesClinicas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_health_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_organizationId_idx" ON "patient"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_id_organizationId_key" ON "patient"("id", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_organizationId_cpf_key" ON "patient"("organizationId", "cpf");

-- CreateIndex
CREATE INDEX "patient_health_record_organizationId_idx" ON "patient_health_record"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "patient_health_record_patientId_organizationId_key" ON "patient_health_record"("patientId", "organizationId");

-- AddForeignKey
ALTER TABLE "patient" ADD CONSTRAINT "patient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_health_record" ADD CONSTRAINT "patient_health_record_patientId_organizationId_fkey" FOREIGN KEY ("patientId", "organizationId") REFERENCES "patient"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_health_record" ADD CONSTRAINT "patient_health_record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

