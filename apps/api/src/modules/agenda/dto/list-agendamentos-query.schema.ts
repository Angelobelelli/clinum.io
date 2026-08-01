import { z } from 'zod';
import { paginationQuerySchema } from '../../../core/pagination/pagination-query.schema';

export const listAgendamentosQuerySchema = paginationQuerySchema.extend({
  data: z.string().optional(),
  profissionalId: z.string().optional(),
});

export type ListAgendamentosQuery = z.infer<typeof listAgendamentosQuerySchema>;
