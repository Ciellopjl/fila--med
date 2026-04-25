import { z } from 'zod';

export const PatientPrioritySchema = z.enum(['NORMAL', 'PRIORITY']);
export const PatientStatusSchema = z.enum(['WAITING', 'CALLED', 'DONE']);

export const PatientCreateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  symptoms: z.string().optional().nullable(),
  priority: PatientPrioritySchema.default('NORMAL'),
  specialty: z.string().optional().nullable(),
});

export const PatientUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  symptoms: z.string().optional().nullable(),
  priority: PatientPrioritySchema.optional(),
  status: PatientStatusSchema.optional(),
  specialty: z.string().optional().nullable(),
});

export const CallCreateSchema = z.object({
  patientId: z.string().uuid('ID do paciente inválido'),
  room: z.string().min(1, 'Sala é obrigatória').max(50),
});

export const AuthUserCreateSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.enum(['ADMIN', 'RECEPTION', 'DOCTOR']).default('RECEPTION'),
});
