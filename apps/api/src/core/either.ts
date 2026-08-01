/**
 * Either<L, R> — usado nos use-cases (application/use-cases/*) só quando
 * existe um erro de NEGÓCIO esperado (ex: recurso não encontrado). Erros de
 * infra (ex: violação de constraint única do Postgres) continuam subindo
 * como exceptions de verdade, tratadas pelo PrismaExceptionFilter global —
 * não são modelados aqui.
 */
export class Left<L, R> {
  readonly value: L;

  constructor(value: L) {
    this.value = value;
  }

  isLeft(): this is Left<L, R> {
    return true;
  }

  isRight(): this is Right<L, R> {
    return false;
  }
}

export class Right<L, R> {
  readonly value: R;

  constructor(value: R) {
    this.value = value;
  }

  isLeft(): this is Left<L, R> {
    return false;
  }

  isRight(): this is Right<L, R> {
    return true;
  }
}

export type Either<L, R> = Left<L, R> | Right<L, R>;

export function left<L, R>(value: L): Either<L, R> {
  return new Left(value);
}

export function right<L, R>(value: R): Either<L, R> {
  return new Right(value);
}
