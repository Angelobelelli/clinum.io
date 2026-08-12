-- Row-Level Security para google_calendar_connection — ver
-- prisma/rls-policies.sql (fonte da verdade/documentação completa).
ALTER TABLE "google_calendar_connection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "google_calendar_connection" FORCE ROW LEVEL SECURITY;

CREATE POLICY google_calendar_connection_tenant_isolation ON "google_calendar_connection"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
