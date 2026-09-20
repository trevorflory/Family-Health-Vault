import { z } from 'zod';

export const POAScopeSchema = z.object({
  contact_id: z.string().min(1),
  resident_id: z.string().min(1),
  is_legal_poa: z.boolean(),
  clinical_access_granted: z.boolean(),
  delivery_enabled: z.boolean().default(true),
  family_account_id: z.string().uuid().nullable().optional(),
  raw_relationship: z.string().nullable().optional(),
});

export type POAScope = z.infer<typeof POAScopeSchema>;
