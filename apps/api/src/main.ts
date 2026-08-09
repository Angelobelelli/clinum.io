import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { attachDevForwardedFor } from './infra/auth/attach-dev-forwarded-for';
import { mountBetterAuth } from './infra/auth/mount-auth';
import { env } from './core/env/env';

async function bootstrap() {
  // bodyParser desabilitado globalmente: o handler do better-auth (montado
  // abaixo) precisa do corpo cru da requisição. O parser é reabilitado logo
  // em seguida para todas as outras rotas.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Precisa rodar ANTES de mountBetterAuth: o rate limit do better-auth lê
  // x-forwarded-for no momento em que recebe a requisição. Em produção isso
  // é papel do reverse proxy (ver comentário em auth.ts), ainda não
  // provisionado.
  if (env.NODE_ENV !== 'production') {
    app.use(attachDevForwardedFor);
  }

  mountBetterAuth(app);

  app.use(json());
  app.use(urlencoded({ extended: true }));

  // Bind explícito em '0.0.0.0' (IPv4, todas as interfaces): sem host
  // explícito o Node escuta em '::' (dual-stack IPv6), caminho com bugs
  // conhecidos de libuv no Windows que fazem socket.remoteAddress reportar
  // o endereço "não especificado" (::) em vez do IP real do peer — quebra
  // attachDevForwardedFor acima e o rate limit por IP.
  await app.listen(env.API_PORT, '0.0.0.0');
}
void bootstrap();
