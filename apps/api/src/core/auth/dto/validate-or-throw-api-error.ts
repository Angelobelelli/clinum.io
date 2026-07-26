import { APIError } from 'better-auth/api';
import type { z } from 'zod';

/**
 * Valida `data` contra um schema Zod e, se inválido, lança um APIError do
 * better-auth (BAD_REQUEST) — usado dentro de hooks do better-auth
 * (organizationHooks em auth.ts), onde não existe um Pipe do Nest rodando
 * (a requisição nunca passa por um controller nosso).
 */
export function validateOrThrowApiError<T extends z.ZodType>(
  schema: T,
  data: unknown,
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => issue.message)
      .join('; ');
    throw new APIError('BAD_REQUEST', { message });
  }

  return result.data;
}
