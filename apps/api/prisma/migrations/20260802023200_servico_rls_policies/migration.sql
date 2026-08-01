-- Row-Level Security para servico — ver prisma/rls-policies.sql (fonte
-- da verdade/documentação completa).
ALTER TABLE "servico" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "servico" FORCE ROW LEVEL SECURITY;

CREATE POLICY servico_tenant_isolation ON "servico"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
