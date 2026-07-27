-- Row-Level Security para agendamento — ver prisma/rls-policies.sql (fonte
-- da verdade/documentação completa).
ALTER TABLE "agendamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agendamento" FORCE ROW LEVEL SECURITY;

CREATE POLICY agendamento_tenant_isolation ON "agendamento"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
