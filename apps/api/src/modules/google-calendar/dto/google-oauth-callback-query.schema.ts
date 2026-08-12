import { z } from 'zod';

export const googleOAuthCallbackQuerySchema = z.object({
  code: z.string().min(1, 'code é obrigatório'),
  state: z.string().min(1, 'state é obrigatório'),
});

export type GoogleOAuthCallbackQueryInput = z.infer<
  typeof googleOAuthCallbackQuerySchema
>;
