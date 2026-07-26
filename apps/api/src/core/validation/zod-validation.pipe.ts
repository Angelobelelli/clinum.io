import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/**
 * Pipe genérico de validação com Zod, para controllers Nest — equivalente
 * ao ValidationPipe padrão do Nest (que é pensado pra class-validator), só
 * que recebendo um schema Zod em vez de uma classe decorada.
 *
 * Uso: @UsePipes(new ZodValidationPipe(meuSchema)) no handler.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    return result.data;
  }
}
