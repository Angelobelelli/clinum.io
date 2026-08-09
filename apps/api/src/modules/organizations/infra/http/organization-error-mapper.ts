import { NotFoundException } from '@nestjs/common';
import { OrganizationNotFoundError } from '@/modules/organizations/application/use-cases/errors/organization-not-found-error';

export function organizationErrorToHttpException(
  error: OrganizationNotFoundError,
): NotFoundException {
  return new NotFoundException(error.message);
}
