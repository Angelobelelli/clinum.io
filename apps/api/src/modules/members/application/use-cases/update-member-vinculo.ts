import { Injectable } from '@nestjs/common';
import { Either, left, right } from '@/core/either';
import {
  Member,
  MemberStatusValue,
  MemberTipoVinculoValue,
} from '@/modules/members/enterprise/entities/member';
import { MembersRepository } from '@/modules/members/application/repositories/members-repository';
import { MemberNotFoundError } from '@/modules/members/application/use-cases/errors/member-not-found-error';

export interface UpdateMemberVinculoUseCaseRequest {
  memberId: string;
  tipoVinculo?: MemberTipoVinculoValue;
  status?: MemberStatusValue;
}

export type UpdateMemberVinculoUseCaseResponse = Either<
  MemberNotFoundError,
  { member: Member }
>;

/**
 * Escreve tipoVinculo/status DIRETO no repositório — nunca através de
 * alguma função/endpoint do better-auth (ver comentário original em
 * members.service.ts sobre por que esses campos ficam num fluxo de escrita
 * separado do `role`).
 *
 * MemberOrgAdminGuard já garante, antes deste use-case rodar, que o member
 * existe no tenant atual e que quem chama é owner/admin — o
 * MemberNotFoundError aqui é só uma segunda camada defensiva, não o
 * caminho normal de 404 (que acontece na guard).
 */
@Injectable()
export class UpdateMemberVinculoUseCase {
  constructor(private readonly membersRepository: MembersRepository) {}

  async execute(
    request: UpdateMemberVinculoUseCaseRequest,
  ): Promise<UpdateMemberVinculoUseCaseResponse> {
    const member = await this.membersRepository.findById(request.memberId);

    if (!member) {
      return left(new MemberNotFoundError());
    }

    if (request.tipoVinculo !== undefined)
      member.tipoVinculo = request.tipoVinculo;
    if (request.status !== undefined) member.status = request.status;

    const updatedMember = await this.membersRepository.save(member);

    return right({ member: updatedMember });
  }
}
