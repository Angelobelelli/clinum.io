#!/bin/sh
set -e

# Cria um role Postgres RESTRITO (sem SUPERUSER) para a aplicação usar em
# runtime nas tabelas de NEGÓCIO (Patient, PatientHealthRecord, futuros
# models) — necessário para que Row-Level Security (ver
# apps/api/prisma/rls-policies.sql) tenha efeito de verdade: superusuário
# SEMPRE ignora RLS, não importa a policy.
#
# O role $POSTGRES_USER (superuser, criado pela imagem oficial do Postgres)
# continua existindo e é usado para: migrations/CLI do Prisma (precisam de
# DDL, que o role restrito não tem) E para as tabelas de auth/tenant já
# existentes (user/session/organization/member/etc.) — essas NÃO passam a
# usar o role restrito, porque o TenantMiddleware precisa ler a tabela
# "organization" para resolver o tenant ANTES de qualquer
# app.current_organization_id existir (problema de ovo-e-galinha). Só as
# tabelas de negócio (patient/patient_health_record) usam o role restrito,
# via um Prisma Client separado (ver
# apps/api/src/core/database/tenant-scoped-prisma-client.ts).
#
# Rodado automaticamente pelo entrypoint oficial do Postgres na PRIMEIRA
# inicialização do container (volume vazio). Se você já tem um container
# rodando com dados (volume não-vazio), aplique manualmente, sem perder
# nada:
#   docker exec -i clinum-postgres sh /docker-entrypoint-initdb.d/create-app-role.sh

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
DO \$do\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$POSTGRES_APP_USER') THEN
    CREATE ROLE "$POSTGRES_APP_USER" LOGIN PASSWORD '$POSTGRES_APP_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
\$do\$;

GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO "$POSTGRES_APP_USER";
GRANT USAGE ON SCHEMA public TO "$POSTGRES_APP_USER";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "$POSTGRES_APP_USER";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "$POSTGRES_APP_USER";
-- Garante que tabelas de negócio criadas por migrations FUTURAS já nasçam
-- com o grant certo, sem precisar rodar este script de novo.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "$POSTGRES_APP_USER";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "$POSTGRES_APP_USER";
SQL
