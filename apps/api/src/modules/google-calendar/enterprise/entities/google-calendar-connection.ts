import { Entity } from '@/core/entities/entity';
import { UniqueEntityID } from '@/core/entities/unique-entity-id';

export interface GoogleCalendarConnectionProps {
  organizationId: string;
  memberId: string;
  googleAccountEmail: string;
  /**
   * Texto plano em memória — a criptografia (AES-256-GCM, ver
   * core/crypto/token-cipher.ts) acontece só na borda do repositório
   * (infra/database/mappers/), nunca em enterprise/application. Sem
   * setters públicos: toda mudança de estado passa por um método de
   * negócio (ver abaixo), diferente de Agendamento (que usa setters —
   * convenção anterior a este módulo).
   */
  refreshToken: string;
  calendarId: string;
  watchChannelId?: string | null;
  watchChannelToken?: string | null;
  watchResourceId?: string | null;
  watchExpiresAt?: Date | null;
  syncToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class GoogleCalendarConnection extends Entity<GoogleCalendarConnectionProps> {
  get organizationId(): string {
    return this.props.organizationId;
  }

  get memberId(): string {
    return this.props.memberId;
  }

  get googleAccountEmail(): string {
    return this.props.googleAccountEmail;
  }

  get refreshToken(): string {
    return this.props.refreshToken;
  }

  get calendarId(): string {
    return this.props.calendarId;
  }

  get watchChannelId(): string | null | undefined {
    return this.props.watchChannelId;
  }

  get watchChannelToken(): string | null | undefined {
    return this.props.watchChannelToken;
  }

  get watchResourceId(): string | null | undefined {
    return this.props.watchResourceId;
  }

  get watchExpiresAt(): Date | null | undefined {
    return this.props.watchExpiresAt;
  }

  get syncToken(): string | null | undefined {
    return this.props.syncToken;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }

  static create(
    props: Omit<GoogleCalendarConnectionProps, 'createdAt' | 'updatedAt'> &
      Partial<Pick<GoogleCalendarConnectionProps, 'createdAt' | 'updatedAt'>>,
    id?: UniqueEntityID,
  ): GoogleCalendarConnection {
    const now = new Date();

    return new GoogleCalendarConnection(
      {
        ...props,
        createdAt: props.createdAt ?? now,
        updatedAt: props.updatedAt ?? now,
      },
      id,
    );
  }

  /** Reautorização: o Google pode devolver um refresh token novo e/ou uma conta diferente. */
  reautorizar(params: {
    refreshToken: string;
    googleAccountEmail: string;
  }): void {
    this.props.refreshToken = params.refreshToken;
    this.props.googleAccountEmail = params.googleAccountEmail;
    this.touch();
  }

  registrarCanalWatch(params: {
    channelId: string;
    channelToken: string;
    resourceId: string;
    expiresAt: Date;
  }): void {
    this.props.watchChannelId = params.channelId;
    this.props.watchChannelToken = params.channelToken;
    this.props.watchResourceId = params.resourceId;
    this.props.watchExpiresAt = params.expiresAt;
    this.touch();
  }

  atualizarSyncToken(syncToken: string | undefined): void {
    this.props.syncToken = syncToken ?? null;
    this.touch();
  }
}
