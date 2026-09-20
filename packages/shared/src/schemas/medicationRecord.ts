import { z } from 'zod';

export const MedicationRecordSchema = z.object({
  id: z.string().min(1),
  resident_id: z.string().min(1),
  medication_name: z.string().min(1),
  dosage: z.string().nullable().optional(),
  schedule: z.string().nullable().optional(),
  last_administered_at: z.string().datetime().nullable().optional(),
});

export type MedicationRecord = z.infer<typeof MedicationRecordSchema>;
