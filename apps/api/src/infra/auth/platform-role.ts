/**
 * Papel de PLATAFORMA (dono do SaaS, acesso cross-tenant) — via plugin
 * `admin` do better-auth. Conceito completamente diferente de Member.role
 * (papel de alguém DENTRO de uma organização/cliente, ver
 * apps/api/src/infra/auth/access-control.ts).
 *
 * O plugin `admin` do better-auth 1.4.21 sempre expõe este dado como
 * `user.role` na API/tipos da própria lib (auth.api.setRole,
 * session.user.role, UserWithRole) — isso é fixo e não é renomeável nesse
 * nível. O que É renomeado (ver `schema.user.fields.role` em auth.ts) é
 * apenas o campo/coluna físico no Prisma, de "role" para "platformRole",
 * para que o schema.prisma nunca tenha uma coluna genérica "role" que possa
 * ser confundida com Member.role.
 *
 * Em código nosso, nunca leia `session.user.role` diretamente — sempre
 * passe por getPlatformRole()/isPlatformSuperAdmin() abaixo, para que toda
 * leitura do papel de PLATAFORMA fique textualmente marcada como tal.
 */
export const PLATFORM_SUPER_ADMIN_ROLE = 'super_admin' as const;

export function getPlatformRole(
  user: { role?: string | null } | null | undefined,
): string | undefined {
  return user?.role ?? undefined;
}

export function isPlatformSuperAdmin(
  user: { role?: string | null } | null | undefined,
): boolean {
  return getPlatformRole(user) === PLATFORM_SUPER_ADMIN_ROLE;
}
