-- =============================================================================
-- Row-Level Security (RLS) — segunda camada de isolamento de tenant.
--
-- A primeira camada é a Prisma Client Extension em
-- apps/api/src/core/database/prisma-tenant.extension.ts, que injeta/filtra
-- organizationId automaticamente nas queries feitas pela aplicação. RLS é a
-- rede de segurança do banco: mesmo que a extension seja esquecida numa
-- query nova, ou que outra ferramenta acesse o banco diretamente, o
-- Postgres ainda assim recusa ler/escrever linhas de outro tenant.
--
-- COMO ESTE ARQUIVO É APLICADO NESTE PROJETO
-- Este arquivo é a fonte da verdade / documentação das políticas de RLS. O
-- SQL é aplicado ao banco através de uma Prisma Migration (raw SQL), e não
-- por um script separado — decisão documentada em apps/api/README.md
-- (seção "Row-Level Security"). Ao alterar este arquivo:
--
--   pnpm prisma:migrate  (ou `prisma migrate dev --create-only` se quiser
--                         revisar o SQL antes de aplicar)
--   -> copie o conteúdo atualizado deste arquivo para o migration.sql gerado
--
-- COMO A APLICAÇÃO INFORMA O TENANT ATUAL AO POSTGRES
-- getCurrentTenantId() (tenant-context.ts) resolve o organizationId em
-- memória, via AsyncLocalStorage. Para as políticas de tabelas de NEGÓCIO
-- (ex: patient) funcionarem de fato, a MESMA conexão usada para rodar a
-- query precisa executar `set_config('app.current_organization_id', <id>,
-- true)` (equivalente a SET LOCAL) antes da query, na mesma transação —
-- IMPLEMENTADO em prisma-tenant.extension.ts via `$transaction([...])`
-- (forma sequencial, não a de callback interativo).
--
-- IMPORTANTE: isso só tem efeito porque as tabelas de negócio são acessadas
-- através de tenantScopedPrismaClient (tenant-scoped-prisma-client.ts), que
-- conecta como um role Postgres RESTRITO, sem SUPERUSER (ver
-- docker-init/create-app-role.sh + APP_DATABASE_URL) — superusuário SEMPRE
-- ignora RLS, mesmo com FORCE ROW LEVEL SECURITY.
--
-- A tabela "organization" (abaixo) é uma EXCEÇÃO deliberada a esse modelo:
-- ela continua sendo lida pela conexão superuser (prismaClient/
-- DATABASE_URL), porque o TenantMiddleware precisa resolver o tenant a
-- partir do Host ANTES de qualquer app.current_organization_id existir
-- (problema de ovo-e-galinha). A policy abaixo existe e é tecnicamente
-- válida, mas fica inerte na prática nessa tabela — o isolamento real de
-- "organization" hoje é feito pelo TenantMatchGuard (camada de aplicação),
-- não por RLS. Registrado aqui para não ser confundido com um bug.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabela: organization
--
-- A tabela "organization" não tem organizationId (ela É o tenant), então a
-- política aqui restringe cada sessão de banco a enxergar apenas a linha da
-- organização setada em app.current_organization_id.
--
-- Sessões administrativas (migrations, scripts internos, o usuário de
-- migração do Prisma) devem rodar com um role que faça BYPASS RLS — nunca
-- com o role usado pela aplicação em runtime.
-- -----------------------------------------------------------------------------

ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;

-- FORCE garante que a política vale até para o dono da tabela — por padrão
-- o Postgres deixa o owner ignorar RLS.
ALTER TABLE "organization" FORCE ROW LEVEL SECURITY;

CREATE POLICY organization_tenant_isolation ON "organization"
  USING (id = current_setting('app.current_organization_id', true))
  WITH CHECK (id = current_setting('app.current_organization_id', true));

-- -----------------------------------------------------------------------------
-- Tabelas: patient, patient_health_record
--
-- Primeiras tabelas de negócio reais — acessadas via
-- tenantScopedPrismaClient (role Postgres restrito, sem SUPERUSER), então
-- estas policies têm efeito de verdade (diferente da de "organization",
-- ver nota acima).
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- Tabela: agendamento
--
-- Primeira feature realmente operacional do produto (ver modules/agenda/).
-- Mesmo padrão de patient/patient_health_record: acessada via
-- tenantScopedPrismaClient, policy tem efeito de verdade.
-- -----------------------------------------------------------------------------

ALTER TABLE "agendamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agendamento" FORCE ROW LEVEL SECURITY;

CREATE POLICY agendamento_tenant_isolation ON "agendamento"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

-- -----------------------------------------------------------------------------
-- Tabela: agendamento_audit_log
--
-- Auditoria de TENANT da reversão de estado terminal de Agendamento (ver
-- AgendaService.reverter(), modules/agenda/) — diferente de admin_audit_log
-- (fora deste bloco), que é cross-tenant/da administração da PLATAFORMA.
-- -----------------------------------------------------------------------------

ALTER TABLE "agendamento_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agendamento_audit_log" FORCE ROW LEVEL SECURITY;

CREATE POLICY agendamento_audit_log_tenant_isolation ON "agendamento_audit_log"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

-- -----------------------------------------------------------------------------
-- Tabela: servico
--
-- Catálogo de serviços/procedimentos oferecidos pela organização — ainda
-- SEM relação com agendamento nesta primeira versão. Mesmo padrão de
-- patient/agendamento: acessada via tenantScopedPrismaClient, policy tem
-- efeito de verdade.
-- -----------------------------------------------------------------------------

ALTER TABLE "servico" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "servico" FORCE ROW LEVEL SECURITY;

CREATE POLICY servico_tenant_isolation ON "servico"
  USING ("organizationId" = current_setting('app.current_organization_id', true))
  WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));

-- -----------------------------------------------------------------------------
-- MODELO PARA TABELAS DE NEGÓCIO FUTURAS
--
-- Toda nova tabela de negócio (agenda, financeiro, etc.) deve ter uma
-- coluna "organizationId", ser acessada via tenantScopedPrismaClient (ver
-- tenant-scoped-prisma-client.ts) e replicar exatamente este padrão,
-- trocando "nome_da_tabela" pelo nome real (mapeado via @@map no schema):
--
--   ALTER TABLE "nome_da_tabela" ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE "nome_da_tabela" FORCE ROW LEVEL SECURITY;
--
--   CREATE POLICY nome_da_tabela_tenant_isolation ON "nome_da_tabela"
--     USING ("organizationId" = current_setting('app.current_organization_id', true))
--     WITH CHECK ("organizationId" = current_setting('app.current_organization_id', true));
--
-- `current_setting(..., true)` — o segundo argumento `true` faz retornar
-- NULL em vez de lançar erro quando a variável de sessão não foi setada.
-- Nesse caso "coluna = NULL" nunca é verdadeiro, ou seja: sem
-- app.current_organization_id setado, a política nega tudo por padrão
-- (fail closed) em vez de vazar dados de qualquer tenant.
--
-- Não esqueça de GRANT SELECT/INSERT/UPDATE/DELETE pro role restrito nessa
-- tabela — já coberto automaticamente por ALTER DEFAULT PRIVILEGES em
-- docker-init/create-app-role.sh para tabelas novas, mas confirme.
-- -----------------------------------------------------------------------------
