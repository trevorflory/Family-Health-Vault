import type { LtcMemoryDb } from '../db';
import { appendAccessAudit } from '../rls/familyAccess';

export function auditAccessMiddleware(
  db: LtcMemoryDb,
  input: {
    family_account_id: string;
    resident_id: string;
    action: string;
    permitted: boolean;
  },
): void {
  appendAccessAudit(db, input);
}
