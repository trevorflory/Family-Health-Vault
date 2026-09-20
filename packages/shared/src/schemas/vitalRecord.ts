import { z } from 'zod';

export const VitalRecordSchema = z.object({
  id: z.string().min(1),
  resident_id: z.string().min(1),
  type: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().nullable().optional(),
  recorded_at: z.string().datetime(),
});

export type VitalRecord = z.infer<typeof VitalRecordSchema>;
