import { z } from 'zod';

export const ORGANIZATION_VERTICAL_VALUES = [
  'clinica_medica',
  'estetica',
  'studio_beleza',
] as const;

/**
 * TODO(produto): a lista de planos ainda não foi definida pelo negócio —
 * hoje só existe "basico" (o default atual do schema, ver
 * prisma/schema.prisma). Perguntar ao dono do produto quais são os planos
 * reais (ex: basico/pro/enterprise?) e atualizar esta lista antes de
 * expor troca de plano pro cliente.
 */
export const ORGANIZATION_PLANO_VALUES = ['basico'] as const;

/**
 * Valida vertical/plano nas escritas de Organization feitas pelo better-auth
 * (organization.create/update) — ver organizationHooks em auth.ts. Não são
 * campos com Prisma enum (ver nota no topo do schema.prisma), então este é
 * a única camada real de validação de valores permitidos para eles.
 */
export const organizationVerticalPlanoSchema = z.object({
  // .nullish() (não só .optional()) porque o better-auth pode repassar
  // `null` explicitamente para campos não enviados, dependendo da rota.
  vertical: z.enum(ORGANIZATION_VERTICAL_VALUES).nullish(),
  plano: z.enum(ORGANIZATION_PLANO_VALUES).nullish(),
});

export type OrganizationVerticalPlanoInput = z.infer<
  typeof organizationVerticalPlanoSchema
>;
