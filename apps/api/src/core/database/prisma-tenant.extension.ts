import { Prisma } from '../../../generated/prisma/client';
import { getCurrentTenantId } from '../tenant/tenant-context';

/**
 * Models de negócio que possuem a coluna `organizationId` e que, portanto,
 * devem ter esse valor injetado/filtrado automaticamente.
 *
 * Ainda vazio — não há models de negócio nesta fase (só a fundação de
 * tenant/auth). Ao criar o primeiro (ex: "Patient"), siga o exemplo no fim
 * deste arquivo.
 */
const TENANT_SCOPED_MODELS = new Set<string>([
  // 'Patient',
  // 'Appointment',
]);

const FILTERABLE_OPERATIONS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
  'upsert',
]);

/**
 * Prisma Client Extension responsável pela camada de isolamento de tenant em
 * nível de aplicação (a segunda camada é o Row-Level Security do Postgres,
 * ver prisma/rls-policies.sql).
 *
 * Para cada model listado em TENANT_SCOPED_MODELS, ela:
 *   - injeta `organizationId` automaticamente em `create`/`createMany`;
 *   - injeta `organizationId` no `where` de toda leitura/atualização/exclusão.
 *
 * O organizationId sempre vem de getCurrentTenantId() (AsyncLocalStorage
 * populado pelo TenantMiddleware) — nunca de input do cliente, para que não
 * seja possível manipular a query para ler/escrever em outro tenant.
 */
export const prismaTenantExtension = Prisma.defineExtension({
  name: 'tenant-isolation',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_SCOPED_MODELS.has(model)) {
          return query(args);
        }

        const organizationId = getCurrentTenantId();
        const scopedArgs = args as Record<string, unknown>;

        if (operation === 'create') {
          scopedArgs.data = { ...(scopedArgs.data as object), organizationId };
        } else if (
          operation === 'createMany' &&
          Array.isArray(scopedArgs.data)
        ) {
          scopedArgs.data = (scopedArgs.data as object[]).map((item) => ({
            ...item,
            organizationId,
          }));
        } else if (FILTERABLE_OPERATIONS.has(operation)) {
          scopedArgs.where = {
            ...(scopedArgs.where as object),
            organizationId,
          };
        }

        return query(scopedArgs);
      },
    },
  },
});

/**
 * EXEMPLO — habilitando isolamento automático para um novo model de negócio:
 *
 * 1. No schema.prisma, garanta a coluna organizationId + relação:
 *
 *    model Patient {
 *      id             String       @id @default(cuid())
 *      organizationId String
 *      organization   Organization @relation(fields: [organizationId], references: [id])
 *      // ...demais campos
 *
 *      @@index([organizationId])
 *    }
 *
 * 2. Adicione 'Patient' ao Set TENANT_SCOPED_MODELS no topo deste arquivo.
 *
 * 3. Use sempre o client estendido (não o PrismaService "cru") para queries
 *    de negócio:
 *
 *    const tenantScopedPrisma = prismaClient.$extends(prismaTenantExtension);
 *    await tenantScopedPrisma.patient.create({ data: { name: 'Ana' } });
 *    // organizationId é injetado automaticamente a partir do tenant atual.
 *
 *    await tenantScopedPrisma.patient.findMany();
 *    // equivalente a: findMany({ where: { organizationId: <tenant atual> } })
 */
