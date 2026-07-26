import { z } from 'zod';

/**
 * dadosVerticais: schema exato por vertical (clinica_medica/estetica/
 * studio_beleza) AINDA NÃO definido pelo produto (TODO: confirmar com o
 * dono do produto). Por ora, aceita qualquer objeto — validação mais
 * específica por vertical fica para quando os campos forem definidos.
 */
export const createPatientSchema = z.object({
  nome: z.string().min(1, 'nome é obrigatório'),
  cpf: z
    .string()
    .regex(/^\d{11}$/, 'cpf deve ter 11 dígitos numéricos')
    .optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional(),
  dataNascimento: z.coerce.date().optional(),
  dadosVerticais: z.record(z.string(), z.unknown()).optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
