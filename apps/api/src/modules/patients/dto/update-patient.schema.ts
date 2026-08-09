import { z } from 'zod';
import { createPatientSchema } from '@/modules/patients/dto/create-patient.schema';

export const updatePatientSchema = createPatientSchema.partial();

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
