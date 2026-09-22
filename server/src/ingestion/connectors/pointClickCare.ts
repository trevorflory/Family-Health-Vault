import type { EhrIngestEnvelope } from '@family-health-vault/shared';
import { denyWriteBack, type ReadOnlyEhrConnector } from './types';
import { PCC_FIXTURE_ENVELOPES } from '../fixtures/pointClickCareFixtures';

export function createPointClickCareConnector(): ReadOnlyEhrConnector {
  return {
    vendor: 'POINTCLICKCARE',
    readiness: 'FIXTURE',
    async authenticateFacility(externalFacilityId: string) {
      return {
        ok: true,
        message: `POINTCLICKCARE fixture auth for facility ${externalFacilityId} (marketplace OAuth stub)`,
        tokenCiphertext: 'enc:pcc-demo-token',
      };
    },
    async pullResources(externalFacilityId: string) {
      const envelopes: EhrIngestEnvelope[] = PCC_FIXTURE_ENVELOPES.map((e) => ({
        ...e,
        facility_external_id: externalFacilityId,
      }));
      return { envelopes };
    },
    writeBack() {
      return denyWriteBack('POINTCLICKCARE');
    },
  };
}
