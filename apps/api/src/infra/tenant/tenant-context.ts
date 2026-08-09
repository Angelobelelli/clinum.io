import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  organizationId: string;
}

const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Executa `callback` dentro do contexto do tenant resolvido. Deve ser
 * chamada uma única vez por requisição, pelo TenantMiddleware, envolvendo
 * o restante do pipeline (guards, interceptors, handler).
 */
export function runWithTenantContext<T>(
  context: TenantContext,
  callback: () => T,
): T {
  return tenantContextStorage.run(context, callback);
}

/**
 * Retorna o organizationId do tenant resolvido para a requisição atual.
 *
 * Lança um erro se chamada fora de um contexto de tenant resolvido (ex: fora
 * de uma requisição HTTP, ou antes do TenantMiddleware rodar) — isso é
 * intencional: qualquer código que dependa do tenant atual deve falhar alto
 * e cedo em vez de silenciosamente vazar dados de outro tenant.
 */
export function getCurrentTenantId(): string {
  const context = tenantContextStorage.getStore();
  if (!context) {
    throw new Error(
      'getCurrentTenantId() foi chamada fora de um contexto de tenant resolvido. ' +
        'Certifique-se de que a requisição passou pelo TenantMiddleware (apps/api/src/infra/tenant/tenant.middleware.ts) ' +
        'antes de chegar aqui.',
    );
  }
  return context.organizationId;
}

/**
 * Variante que não lança erro — usada em pontos (ex: guards) que precisam
 * saber SE o tenant já foi resolvido, sem tratar a ausência como exceção.
 */
export function getCurrentTenantIdOrNull(): string | null {
  return tenantContextStorage.getStore()?.organizationId ?? null;
}
