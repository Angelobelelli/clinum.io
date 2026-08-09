# modules

Módulos de negócio da aplicação, organizados por bounded context (`agenda/`,
`patients/`, `members/`, `organizations/`, `platform-admin/`, ...). Cada
subpasta é um módulo Nest autocontido, seguindo Clean Architecture em 3
camadas + DTOs de validação. Este guia mostra, na prática, como montar um
módulo do zero seguindo exatamente esse padrão — todos os trechos de código
abaixo são cópias reais de `organizations/` (caso simples) e `patients/`
(caso com isolamento por tenant + paginação), não pseudocódigo.

## Anatomia de um módulo

```
modules/<nome>/
  enterprise/
    entities/<nome>.ts              # entidade de domínio
  application/
    repositories/<nome>-repository.ts   # contrato abstrato (sem Prisma)
    use-cases/
      <acao>-<nome>.ts               # 1 classe por caso de uso
      <acao>-<nome>.spec.ts          # teste unitário (repo fake em memória)
      errors/<erro>.ts               # erros de negócio esperados (se houver)
  dto/<acao>-<nome>.schema.ts        # validação Zod do body/query HTTP
  infra/
    database/
      mappers/prisma-<nome>-mapper.ts
      prisma-<nome-plural>-repository.ts  # implementação Prisma do contrato
    http/
      controllers/<acao>-<nome>.controller.ts
      presenters/<nome>-presenter.ts
      <nome>-error-mapper.ts         # erro de negócio -> HttpException
  <nome-plural>.module.ts            # wiring do NestModule
```

Regra de dependência: `enterprise/` e `application/` nunca importam Nest,
Prisma ou Express — só `core/` (`Entity`, `Either`, paginação). Quem conhece
framework/driver é sempre `infra/`. Isso é o que permite testar use-cases com
um repositório fake em memória, sem banco (ver Passo 8).

## Passo a passo: criando um módulo do zero

Vamos seguir a ordem de dependência (de dentro pra fora): entidade → contrato
→ caso de uso → DTO → mapper → repositório Prisma → presenter → controller →
module → teste.

### 1. Entidade de domínio (`enterprise/entities/`)

Estende `Entity<Props>` (`src/core/entities/entity.ts`), que já dá `id`
(`UniqueEntityID`) e `equals()`. Getters explícitos por campo, e um
`static create()` que aplica defaults (ex: `createdAt`).

```ts
// enterprise/entities/organization.ts
import { Entity } from '../../../../core/entities/entity';
import { UniqueEntityID } from '../../../../core/entities/unique-entity-id';

export interface OrganizationProps {
  name: string;
  slug: string;
  customDomain?: string | null;
  createdAt: Date;
}

export class Organization extends Entity<OrganizationProps> {
  get name(): string {
    return this.props.name;
  }
  get slug(): string {
    return this.props.slug;
  }
  get customDomain(): string | null | undefined {
    return this.props.customDomain;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  static create(
    props: Omit<OrganizationProps, 'createdAt'> &
      Partial<Pick<OrganizationProps, 'createdAt'>>,
    id?: UniqueEntityID,
  ): Organization {
    return new Organization(
      { ...props, createdAt: props.createdAt ?? new Date() },
      id,
    );
  }
}
```

### 2. Contrato do repositório (`application/repositories/`)

`abstract class`, não `interface` — precisa ser usável como token de DI do
Nest (`provide: XRepository, useClass: PrismaXRepository`). Só os métodos
que os use-cases realmente chamam.

```ts
// application/repositories/organizations-repository.ts
import { Organization } from '../../enterprise/entities/organization';

export abstract class OrganizationsRepository {
  abstract findById(id: string): Promise<Organization | null>;
  abstract create(organization: Organization): Promise<Organization>;
}
```

### 3. Caso de uso (`application/use-cases/`)

Uma classe `@Injectable()` por ação, com `Request`/`Response` explícitos.
Duas variantes:

**Sem erro de negócio esperado** (o único jeito de falhar é uma constraint
do banco, já tratada globalmente pelo `PrismaExceptionFilter`) — retorna
direto, sem `Either`:

```ts
// application/use-cases/create-organization.ts
@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute(request: CreateOrganizationUseCaseRequest) {
    const organization = Organization.create({ ...request });
    const created = await this.organizationsRepository.create(organization);
    return { organization: created };
  }
}
```

**Com erro de negócio esperado** (ex: recurso não encontrado) — usa
`Either<Erro, Sucesso>` de `src/core/either.ts`:

```ts
// application/use-cases/get-current-organization.ts
export type GetCurrentOrganizationUseCaseResponse = Either<
  OrganizationNotFoundError,
  { organization: Organization }
>;

@Injectable()
export class GetCurrentOrganizationUseCase {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
  ) {}

  async execute({ organizationId }: GetCurrentOrganizationUseCaseRequest) {
    const organization =
      await this.organizationsRepository.findById(organizationId);
    if (!organization) return left(new OrganizationNotFoundError());
    return right({ organization });
  }
}
```

```ts
// application/use-cases/errors/organization-not-found-error.ts
export class OrganizationNotFoundError extends Error {
  constructor() {
    super('Organização não encontrada.');
    this.name = 'OrganizationNotFoundError';
  }
}
```

Regra prática: se existe um jeito "esperado" do use-case não completar (não
achou, já existe, está em estado inválido), use `Either`. Se a única forma
de falhar é o banco reclamar (unique constraint etc.), deixe subir como
exception normal.

### 4. DTO de validação (`dto/*.schema.ts`)

Zod puro, sem depender de Nest — o `ZodValidationPipe` genérico
(`src/infra/http/pipes/zod-validation.pipe.ts`) que faz a ponte com o
controller.

```ts
// dto/create-organization.schema.ts
export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'name é obrigatório'),
  slug: z.string().min(1, 'slug é obrigatório'),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
```

Se o endpoint for uma listagem paginada, use o schema compartilhado em vez de
criar um novo: `paginationQuerySchema` (`src/core/pagination/pagination-query.schema.ts`),
que já valida `page`/`perPage` como query params.

### 5. Mapper Prisma (`infra/database/mappers/`)

Só conversão — `toDomain` (linha do banco → entidade) e `toPrismaCreate`/
`toPrismaUpdate` (entidade → shape do Prisma).

```ts
// infra/database/mappers/prisma-organization-mapper.ts
export class PrismaOrganizationMapper {
  static toDomain(raw: PrismaOrganization): Organization {
    return Organization.create(
      { name: raw.name, slug: raw.slug, createdAt: raw.createdAt },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrismaCreate(
    organization: Organization,
  ): Prisma.OrganizationCreateInput {
    return {
      id: organization.id.toValue(),
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
    };
  }
}
```

### 6. Implementação do repositório (`infra/database/`)

Aqui entra a decisão mais importante: **`PrismaService` ou
`TenantScopedPrismaService`?**

- **`PrismaService`** (client cru) — para tabelas que não pertencem a um
  tenant específico (a própria `Organization`, tabelas do better-auth,
  read-models cross-tenant de `platform-admin/`).
- **`TenantScopedPrismaService`** — para qualquer tabela de negócio de
  verdade (ex: `Patient`, `Agendamento`, `Servico`). Injeta e filtra
  `organizationId` automaticamente a partir do tenant da requisição atual —
  **use sempre isso** para dados de clínica, nunca o client cru.

```ts
// infra/database/prisma-organizations-repository.ts (client cru)
@Injectable()
export class PrismaOrganizationsRepository implements OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Organization | null> {
    const organization = await this.prisma.db.organization.findUnique({
      where: { id },
    });
    return organization
      ? PrismaOrganizationMapper.toDomain(organization)
      : null;
  }
}
```

```ts
// infra/database/prisma-patients-repository.ts (tenant-scoped)
@Injectable()
export class PrismaPatientsRepository implements PatientsRepository {
  constructor(private readonly tenantPrisma: TenantScopedPrismaService) {}

  async findMany({ page, perPage }: FindManyPatientsParams) {
    const [patients, total] = await Promise.all([
      this.tenantPrisma.db.patient.findMany({
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: 'asc' },
      }),
      this.tenantPrisma.db.patient.count(), // já filtrado por organizationId
    ]);
    return {
      items: patients.map(PrismaPatientMapper.toDomain),
      total,
      page,
      perPage,
    };
  }
}
```

**Se o model for tenant-scoped, tem passo extra no schema/isolamento** —
ver a seção "Isolamento por tenant" abaixo antes de escrever o repositório.

### 7. Presenter (`infra/http/presenters/`)

Achata a entidade pro formato JSON de resposta — nunca devolva a entidade
de domínio direto no controller.

```ts
// infra/http/presenters/organization-presenter.ts
export class OrganizationPresenter {
  static toHTTP(organization: Organization) {
    return {
      id: organization.id.toValue(),
      name: organization.name,
      slug: organization.slug,
    };
  }
}
```

Se o endpoint for uma listagem, use `toPaginatedHTTP()`
(`src/core/pagination/to-paginated-http.ts`) no controller para envelopar o
resultado no formato padrão `{ data, meta: { page, perPage, total, totalPages } }`.

### 8. Error mapper (`infra/http/<nome>-error-mapper.ts`)

Só existe se o use-case usa `Either` — traduz o erro de negócio pra
`HttpException` do Nest.

```ts
// infra/http/organization-error-mapper.ts
export function organizationErrorToHttpException(
  error: OrganizationNotFoundError,
) {
  return new NotFoundException(error.message);
}
```

### 9. Controller (`infra/http/controllers/`)

Um controller por ação (não um controller "gordo" com todos os métodos).
Padrão pra endpoint que lê erro `Either`:

```ts
// infra/http/controllers/get-current-organization.controller.ts
@Controller('organizations')
export class GetCurrentOrganizationController {
  constructor(private readonly useCase: GetCurrentOrganizationUseCase) {}

  @Get('me')
  async me() {
    const organizationId = getCurrentTenantId();
    const result = await this.useCase.execute({ organizationId });

    if (result.isLeft()) {
      throw organizationErrorToHttpException(result.value);
    }
    return OrganizationPresenter.toHTTP(result.value.organization);
  }
}
```

Se a rota exige permissão de RBAC (qualquer recurso que não seja
"pré-tenant", ver `organizations` POST como exceção), adicione
`@RequirePermission('<resource>', '<action>')` — ver seção de permissões
abaixo:

```ts
@Get()
@RequirePermission('patient', 'read')
async findMany(@Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery) {
  const result = await this.listPatientsUseCase.execute(query);
  return toPaginatedHTTP({ ...result, items: result.items.map(PatientPresenter.toListItem) });
}
```

### 10. Module Nest (`<nome-plural>.module.ts`)

Liga o contrato abstrato à implementação Prisma via `provide`/`useClass`.

```ts
@Module({
  controllers: [CreateOrganizationController, GetCurrentOrganizationController],
  providers: [
    {
      provide: OrganizationsRepository,
      useClass: PrismaOrganizationsRepository,
    },
    CreateOrganizationUseCase,
    GetCurrentOrganizationUseCase,
  ],
})
export class OrganizationsModule {}
```

Depois, registre em `src/app.module.ts` (import + array `imports: [...]`).

### 11. Teste do use-case (repositório fake em memória)

Nunca bata no Postgres real no teste de use-case — implemente o contrato
abstrato com um array em memória (`src/test/repositories/`) e injete direto
no `sut` (system under test), sem Nest DI:

```ts
// test/repositories/in-memory-tenant-organizations-repository.ts
export class InMemoryTenantOrganizationsRepository implements OrganizationsRepository {
  public items: Organization[] = [];
  findById(id: string) {
    return Promise.resolve(
      this.items.find((i) => i.id.toValue() === id) ?? null,
    );
  }
  create(organization: Organization) {
    this.items.push(organization);
    return Promise.resolve(organization);
  }
}
```

```ts
// application/use-cases/create-organization.spec.ts
describe('CreateOrganizationUseCase', () => {
  let organizationsRepository: InMemoryTenantOrganizationsRepository;
  let sut: CreateOrganizationUseCase;

  beforeEach(() => {
    organizationsRepository = new InMemoryTenantOrganizationsRepository();
    sut = new CreateOrganizationUseCase(organizationsRepository);
  });

  it('cria uma organização', async () => {
    const { organization } = await sut.execute({
      name: 'Clínica Teste',
      slug: 'clinica-teste',
    });
    expect(organization.name).toBe('Clínica Teste');
    expect(organizationsRepository.items).toHaveLength(1);
  });
});
```

Roda com `pnpm test` (jest, pega qualquer `*.spec.ts`). Testes e2e (que
sobem a aplicação e batem no Postgres real) ficam em `test/*.e2e-spec.ts`,
rodados via `pnpm test:e2e`.

## Isolamento por tenant (se o model é dado de clínica)

Qualquer tabela nova que pertence a uma organização (não é o caso de
`Organization` em si, nem de tabelas do better-auth) precisa de **duas**
camadas de isolamento, documentadas com um exemplo completo em
`src/infra/database/prisma-tenant.extension.ts`:

1. `schema.prisma`: coluna `organizationId` + relação + `@@index([organizationId])`.
2. Adicionar o nome do model a `TENANT_SCOPED_MODELS` nesse mesmo arquivo.
3. Adicionar a RLS policy correspondente em `prisma/rls-policies.sql`.
4. No repositório, usar `TenantScopedPrismaService` (nunca `PrismaService`)
   — o `organizationId` é injetado/filtrado automaticamente, nunca vem do
   client.

Sem os 4 passos, o model fica sem isolamento nenhum (application E banco) —
não pule nenhum deles. `Patient`/`Agendamento`/`Servico` são exemplos reais
já em produção.

## Permissões (RBAC)

Se a rota precisa de controle de acesso por papel (owner/admin/staff/
reception/member), adicione o resource em `src/infra/auth/access-control.ts`:

1. Adicione o resource e suas ações possíveis em `statement`.
2. Em cada `ac.newRole({...})` (owner, admin, member, staff, reception),
   declare quais dessas ações aquele papel pode executar.
3. Use `@RequirePermission('<resource>', '<action>')` no controller —
   `PermissionGuard` (registrado globalmente em `app.module.ts`) lê esse
   metadata e autoriza via better-auth.

Restrições de **linha** (ex: staff só vê os próprios agendamentos) não são
modeladas em `access-control.ts` — isso é boolean por papel, não por
registro. Reforce essa regra na camada de aplicação (ver comentário em
`access-control.ts` sobre `agendamento`).

## Rotas "pré-tenant"

Se o módulo expõe uma rota que roda ANTES de existir um tenant resolvível
(ex: `POST /organizations`, criando a própria organização), exclua-a do
`TenantMiddleware` em `app.module.ts` (`consumer.apply(TenantMiddleware).exclude(...)`).
Isso é raro — a maioria das rotas de negócio já nasce dentro de um tenant.
