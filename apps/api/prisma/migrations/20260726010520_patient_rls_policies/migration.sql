-- Row-Level Security para patient/patient_health_record — ver
-- prisma/rls-policies.sql (fonte da verdade/documentação completa).
ALTER TABLE "patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient" FORCE ROW LEVEL SECURITY;

CREATE POLICY patient_tenant_isolation ON "patient"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

ALTER TABLE "patient_health_record" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_health_record" FORCE ROW LEVEL SECURITY;

CREATE POLICY patient_health_record_tenant_isolation ON "patient_health_record"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
