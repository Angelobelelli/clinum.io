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
-- memória, via AsyncLocalStorage. Para as políticas abaixo funcionarem de
-- fato, a MESMA conexão usada para rodar a query precisa executar
-- `SET LOCAL app.current_organization_id = '<organizationId>'` antes da
-- query, dentro da mesma transação. Isso ainda NÃO está implementado na
-- prisma-tenant.extension.ts (que hoje é só a camada 1, em memória/app) —
-- fica para quando a extension passar a abrir uma transação por
-- request/query de negócio. Registrado aqui para não ser esquecido.
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
-- MODELO PARA TABELAS DE NEGÓCIO FUTURAS
--
-- Toda nova tabela de negócio (agenda, financeiro, clientes finais, etc.)
-- deve ter uma coluna "organizationId" e replicar exatamente este padrão,
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
-- -----------------------------------------------------------------------------
