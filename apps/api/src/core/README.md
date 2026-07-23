# core

Infraestrutura transversal da aplicação — código do qual todo o resto depende,
mas que não é, em si, uma regra de negócio.

Planejado para viver aqui conforme o projeto evolui:

- **tenant/** — resolução e contexto de tenant (multi-tenancy)
- **auth/** — autenticação e autorização
- **database/** — módulo Prisma/conexão com o Postgres, guards de tenant no
  nível de dados
- **queue/** — configuração de filas (BullMQ/Redis) e workers

Nada disso está implementado ainda — esta pasta existe apenas para reservar o
lugar na arquitetura.
