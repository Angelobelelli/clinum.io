import { z } from 'zod';

export const createServicoSchema = z.object({
  nome: z.string().min(1, 'nome é obrigatório'),
  duracaoMinutos: z
    .number()
    .int()
    .min(1, 'duracaoMinutos deve ser no mínimo 1'),
  preco: z.number().int().min(0, 'preco não pode ser negativo'),
});

export type CreateServicoInput = z.infer<typeof createServicoSchema>;
