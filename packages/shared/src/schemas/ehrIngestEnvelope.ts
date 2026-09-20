import { z } from 'zod';

export const EhrVendorSchema = z.enum([
  'POINTCLICKCARE',
  'MEDITECH_EXPANSE',
  'YARDI_LTC',
]);

export type EhrVendor = z.infer<typeof EhrVendorSchema>;

export const EhrIngestEnvelopeSchema = z.object({
  vendor: EhrVendorSchema,
  facility_external_id: z.string().min(1),
  resource_type: z.enum([
    'MEDICATION',
    'MED_ADMIN',
    'APPOINTMENT',
    'VITAL',
    'CONTACT',
  ]),
  external_id: z.string().min(1),
  resident_external_id: z.string().min(1),
  payload: z.record(z.unknown()),
  observed_at: z.string().datetime(),
});

export type EhrIngestEnvelope = z.infer<typeof EhrIngestEnvelopeSchema>;
