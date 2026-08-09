import { z } from 'zod';
import { validateOrThrowApiError } from '@/infra/auth/dto/validate-or-throw-api-error';

/**
 * Papéis de ORGANIZAÇÃO (dentro de uma única empresa cliente) — ver
 * access-control.ts. Não confundir com platformRole (papel de plataforma,
 * ver platform-role.ts) nem com tipoVinculo/status (ver
 * modules/members/dto/update-member-vinculo.schema.ts).
 */
export const MEMBER_ROLE_VALUES = [
  'owner',
  'admin',
  'staff',
  'reception',
] as const;

/**
 * Valida o papel de Member nas escritas do better-auth
 * (organization.add-member / update-member-role) — ver organizationHooks
 * em auth.ts. Member.role não é Prisma enum (ver nota no topo do
 * schema.prisma), então este é a única camada real de validação desses
 * valores.
 */
export const memberRoleSchema = z.object({
  role: z.enum(MEMBER_ROLE_VALUES),
});

/**
 * O better-auth aceita `role` como string única ou array de strings
 * (multi-role) em member.add/update-member-role — validamos cada valor
 * individualmente contra MEMBER_ROLE_VALUES.
 */
export function validateMemberRole(role: string | string[]): void {
  const roles = Array.isArray(role) ? role : [role];
  for (const role_ of roles) {
    validateOrThrowApiError(memberRoleSchema, { role: role_ });
  }
}
