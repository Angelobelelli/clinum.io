-- Row-Level Security para "organization" — segunda camada de isolamento de
-- tenant. Fonte da verdade e documentação completa: apps/api/prisma/rls-policies.sql
-- (copie o conteúdo atualizado de lá para uma nova migration sempre que a
-- política mudar).

ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization" FORCE ROW LEVEL SECURITY;

CREATE POLICY organization_tenant_isolation ON "organization"
  USING (id = current_setting('app.current_organization_id', true))
  WITH CHECK (id = current_setting('app.current_organization_id', true));
