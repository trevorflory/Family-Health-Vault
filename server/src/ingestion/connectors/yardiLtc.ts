import { denyWriteBack, type ReadOnlyEhrConnector } from './types';

export function createYardiLtcConnector(): ReadOnlyEhrConnector {
  return {
    vendor: 'YARDI_LTC',
    readiness: 'NOT_LIVE',
    async authenticateFacility() {
      return {
        ok: false,
        message:
          'Yardi LTC marketplace integration is NOT_LIVE — use fixtures/sandbox when certified',
      };
    },
    async pullResources() {
      return { envelopes: [] };
    },
    writeBack() {
      return denyWriteBack('YARDI_LTC');
    },
  };
}
