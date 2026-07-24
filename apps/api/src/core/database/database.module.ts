import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global para que PrismaService (e, futuramente, o client Prisma estendido
 * com isolamento de tenant) fique disponível em qualquer módulo sem precisar
 * reimportar DatabaseModule toda vez.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
