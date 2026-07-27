import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';

const STATUS_BY_PRISMA_CODE: Record<string, number> = {
  // Unique constraint violation (ex: patient_organizationId_cpf_key).
  P2002: HttpStatus.CONFLICT,
};

/**
 * Traduz PrismaClientKnownRequestError pra uma resposta HTTP limpa — sem
 * isso, um erro de constraint única (ex: CPF duplicado em Patient, ver
 * patients.service.ts) sobe cru como 500, com stack trace e detalhe
 * interno do banco na resposta. Cobre qualquer model, tenant-scoped ou
 * não, sem precisar de try/catch repetido em cada service.
 *
 * Não tenta extrair o nome da coluna que violou a constraint a partir de
 * `exception.meta` — no client engine atual (driver adapters, Prisma 7)
 * esse meta vem como `{ modelName, driverAdapterError }`, sem o
 * `meta.target` (array de colunas) que existia no query engine clássico.
 * Mensagem genérica por enquanto; mensagens por campo ficam pra quando
 * houver necessidade real de diferenciar.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      STATUS_BY_PRISMA_CODE[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      message:
        exception.code === 'P2002'
          ? 'Já existe um registro com esse valor único.'
          : 'Erro interno.',
    });
  }
}
