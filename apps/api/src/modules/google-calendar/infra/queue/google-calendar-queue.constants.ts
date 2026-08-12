export const GOOGLE_CALENDAR_SYNC_QUEUE = 'google-calendar-sync';
export const GOOGLE_CALENDAR_WEBHOOK_QUEUE = 'google-calendar-webhook';
export const GOOGLE_CALENDAR_WATCH_RENEWAL_QUEUE =
  'google-calendar-watch-renewal';

export const SYNC_AGENDAMENTO_JOB = 'sync-agendamento';
export const PROCESS_WEBHOOK_NOTIFICATION_JOB = 'process-notification';
export const WATCH_RENEWAL_SWEEP_JOB = 'sweep-expiring-channels';

/** jobId fixo do repeatable job — reexecutar `queue.add` com o mesmo jobId em todo boot é idempotente (BullMQ dedupe). */
export const WATCH_RENEWAL_REPEATABLE_JOB_ID = 'watch-renewal-daily';
