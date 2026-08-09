import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'name é obrigatório'),
  slug: z.string().min(1, 'slug é obrigatório'),
  customDomain: z.string().optional(),
  vertical: z.string().optional(),
  plano: z.string().optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
