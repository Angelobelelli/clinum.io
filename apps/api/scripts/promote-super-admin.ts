import { prismaClient } from '@/infra/database/prisma-client';

/**
 * Promove um usuário já existente (criado normalmente via
 * POST /api/auth/sign-up/email) a platformRole="super_admin".
 *
 * Bootstrap manual de propósito: o próprio endpoint do plugin `admin`
 * (POST /api/auth/admin/set-role) exige que quem chama JÁ seja um
 * super_admin — alguém precisa ser o primeiro.
 *
 * Uso:
 *   pnpm run admin:promote -- seu-email@dominio.com
 */
async function main(): Promise<void> {
  // pnpm ecoa (e, dependendo da versão, repassa) o "--" usado para separar
  // os args do script dos args do comando em si — filtramos por segurança
  // para aceitar tanto `pnpm run admin:promote -- <email>` quanto uma
  // chamada direta (`ts-node scripts/promote-super-admin.ts <email>`).
  const [email] = process.argv.slice(2).filter((arg) => arg !== '--');
  if (!email) {
    console.error('Uso: pnpm run admin:promote -- <email>');
    process.exitCode = 1;
    return;
  }

  const user = await prismaClient.user.update({
    where: { email },
    data: { platformRole: 'super_admin' },
  });

  console.log(`OK: ${user.email} agora tem platformRole = "super_admin".`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prismaClient.$disconnect();
  });
