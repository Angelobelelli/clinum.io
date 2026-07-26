import { z } from 'zod';

export const upsertHealthRecordSchema = z.object({
  alergias: z.string().optional(),
  historico: z.string().optional(),
  observacoesClinicas: z.string().optional(),
});

export type UpsertHealthRecordInput = z.infer<typeof upsertHealthRecordSchema>;
