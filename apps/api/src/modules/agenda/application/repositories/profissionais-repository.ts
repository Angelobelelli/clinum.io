/**
 * Porta estreita (ACL) para o agregado Member (módulo members, ainda não
 * DDD-ificado) — agenda só precisa saber "esse profissionalId existe nesta
 * organização?", nunca o Member inteiro. Evita a application layer de
 * agenda falar direto com Prisma/tabelas de auth.
 */
export abstract class ProfissionaisRepository {
  abstract existsInCurrentOrganization(
    profissionalId: string,
  ): Promise<boolean>;
}
