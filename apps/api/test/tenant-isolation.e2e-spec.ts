/**
 * Testes de isolamento multi-tenant.
 *
 * Este arquivo é executado pelo job "tenant-isolation" em
 * .github/workflows/ci.yml e é OBRIGATÓRIO no pipeline — não pode ser
 * removido nem substituído por `it.skip` só para o CI "passar". O objetivo
 * dele é garantir que nenhuma query/endpoint retorne ou modifique dado de
 * um tenant (clínica/estética/studio) a partir de outro tenant, já que a
 * aplicação lida com prontuário/ficha de atendimento e dados financeiros.
 *
 * Ainda não existe tenant/auth implementados (ver README de
 * apps/api/src/core), então os casos abaixo estão como `it.todo` — eles
 * precisam virar testes reais, com asserts de verdade contra o banco (via
 * dois tenants de teste distintos), antes de qualquer funcionalidade
 * multi-tenant ir para produção.
 */
describe('Isolamento multi-tenant (e2e)', () => {
  it.todo('não deve retornar registros de outro tenant ao listar um recurso');
  it.todo(
    'não deve permitir acessar um recurso de outro tenant pelo ID (404, não 200/403)',
  );
  it.todo(
    'não deve permitir criar/atualizar um recurso apontando para outro tenant',
  );
  it.todo('não deve vazar dado de outro tenant em respostas de erro/validação');
});
