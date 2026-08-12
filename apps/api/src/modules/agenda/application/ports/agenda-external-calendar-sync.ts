/**
 * Porta que agenda/ consome (implementada por modules/google-calendar/,
 * ver AgendaGoogleCalendarBindingModule) para: (1) checar disponibilidade
 * num calendário externo antes de confirmar um Agendamento, e (2)
 * disparar a sincronização assíncrona depois de criar/atualizar/cancelar.
 *
 * agenda/ nunca sabe que "Google" existe — só conhece este contrato
 * genérico. Isso evita AgendaModule importar GoogleCalendarModule
 * diretamente (ver nota de dependência circular em
 * modules/google-calendar/infra/agenda-bridge/).
 */
export interface EnqueueAgendaExternalSyncParams {
  agendamentoId: string;
  profissionalId: string;
  /**
   * Preenchido só quando profissionalId mudou numa remarcação — permite ao
   * consumidor remover o evento da agenda do profissional ANTERIOR, se ele
   * também tiver conexão ativa.
   */
  previousProfissionalId?: string;
  type: 'upsert' | 'cancel';
  /**
   * Dados já resolvidos pelo use-case (nome do paciente, nome do serviço)
   * no momento da chamada — evita que o processor da fila precise
   * reconsultar Patient/Servico só para montar o evento do Google.
   */
  snapshot?: {
    patientNome: string;
    servicoNome?: string;
    dataHoraInicio: Date;
    dataHoraFim: Date;
    observacao?: string | null;
  };
}

export abstract class AgendaExternalCalendarSyncPort {
  /**
   * `true` = o calendário externo do profissional indica conflito nesse
   * intervalo. Sempre `false`, sem chamar nenhuma API, se o profissional
   * não tiver conexão ativa com o Google Calendar.
   */
  abstract checkFreeBusyConflict(params: {
    profissionalId: string;
    dataHoraInicio: Date;
    dataHoraFim: Date;
  }): Promise<boolean>;

  /**
   * No-op silencioso se o profissional (e o profissional anterior, se
   * houver) não tiver conexão ativa — agenda/ não precisa checar isso
   * antes de chamar.
   */
  abstract enqueueSync(params: EnqueueAgendaExternalSyncParams): Promise<void>;
}
