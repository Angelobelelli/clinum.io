-- Row-Level Security para agendamento_audit_log — ver prisma/rls-policies.sql
-- (fonte da verdade/documentação completa).
ALTER TABLE "agendamento_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agendamento_audit_log" FORCE ROW LEVEL SECURITY;

CREATE POLICY agendamento_audit_log_tenant_isolation ON "agendamento_audit_log"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
