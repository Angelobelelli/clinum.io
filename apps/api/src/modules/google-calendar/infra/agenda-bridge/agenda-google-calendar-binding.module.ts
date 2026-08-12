import { Global, Module } from '@nestjs/common';
import { AgendaExternalCalendarSyncPort } from '@/modules/agenda/application/ports/agenda-external-calendar-sync';
import { GoogleCalendarModule } from '@/modules/google-calendar/google-calendar.module';
import { AgendaExternalCalendarSyncImpl } from '@/modules/google-calendar/infra/agenda-bridge/agenda-external-calendar-sync.impl';

/**
 * Resolve a dependência MÚTUA entre agenda/ e google-calendar/: agenda/
 * consome AgendaExternalCalendarSyncPort (implementado aqui), e
 * google-calendar/ consome AgendamentoExternalSyncTarget (exportado por
 * AgendaModule). Se os dois módulos se importassem diretamente um ao
 * outro, seria um ciclo de módulos Nest.
 *
 * A saída escolhida (em vez de forwardRef() dos dois lados): este módulo
 * @Global() importa GoogleCalendarModule (que já importa AgendaModule,
 * sentido único) e expõe AgendaExternalCalendarSyncPort para TODA a
 * aplicação — AgendaModule nunca precisa importar nada, o provider já fica
 * disponível assim que este módulo é registrado em AppModule. Nenhum
 * forwardRef espalhado, e a estrutura fica fácil de ler num único lugar.
 */
@Global()
@Module({
  imports: [GoogleCalendarModule],
  providers: [
    {
      provide: AgendaExternalCalendarSyncPort,
      useClass: AgendaExternalCalendarSyncImpl,
    },
  ],
  exports: [AgendaExternalCalendarSyncPort],
})
export class AgendaGoogleCalendarBindingModule {}
