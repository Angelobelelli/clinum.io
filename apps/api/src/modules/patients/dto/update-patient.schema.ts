import { z } from 'zod';
import { createPatientSchema } from './create-patient.schema';

export const updatePatientSchema = createPatientSchema.partial();

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
