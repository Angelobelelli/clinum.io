# modules

Módulos de negócio da aplicação, organizados por bounded context. Cada
subpasta deve ser um módulo NestJS autocontido (controllers, services,
DTOs, entities/schema Prisma relacionado).

Exemplos de módulos previstos (nenhum implementado ainda):

- **agenda/** — agendamentos, horários, disponibilidade de profissionais
- **financeiro/** — contas a pagar/receber, comissões, fechamento de caixa
- **fiscal/** — emissão fiscal, regras tributárias
- **convenios/** — convênios e parcerias com planos/operadoras

Esta pasta está vazia por enquanto — apenas reserva o lugar na arquitetura.
