import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { mountBetterAuth } from './core/auth/mount-auth';

async function bootstrap() {
  // bodyParser desabilitado globalmente: o handler do better-auth (montado
  // abaixo) precisa do corpo cru da requisição. O parser é reabilitado logo
  // em seguida para todas as outras rotas.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  mountBetterAuth(app);

  app.use(json());
  app.use(urlencoded({ extended: true }));

  await app.listen(process.env.API_PORT ?? 3001);
}
void bootstrap();
