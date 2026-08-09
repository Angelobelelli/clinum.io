import { z } from 'zod';

export const updateServicoSchema = z.object({
  nome: z.string().min(1, 'nome é obrigatório').optional(),
  duracaoMinutos: z
    .number()
    .int()
    .min(1, 'duracaoMinutos deve ser no mínimo 1')
    .optional(),
  preco: z.number().int().min(0, 'preco não pode ser negativo').optional(),
});

export type UpdateServicoInput = z.infer<typeof updateServicoSchema>;
