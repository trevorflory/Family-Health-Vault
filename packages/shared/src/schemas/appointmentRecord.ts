import { z } from 'zod';

export const AppointmentRecordSchema = z.object({
  id: z.string().min(1),
  resident_id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().nullable().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().nullable().optional(),
  provider: z.string().nullable().optional(),
});

export type AppointmentRecord = z.infer<typeof AppointmentRecordSchema>;
