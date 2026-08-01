import { z } from 'zod';

/**
 * Query params de paginação compartilhados por todo endpoint "findAll"
 * (ver modules/patients/infra/http/controllers/list-patients.controller.ts
 * e modules/agenda/infra/http/controllers/list-agendamentos.controller.ts).
 * z.coerce.number() porque query params sempre chegam como string.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(200).default(30),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
