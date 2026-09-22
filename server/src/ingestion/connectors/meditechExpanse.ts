import { denyWriteBack, type ReadOnlyEhrConnector } from './types';

/** Honest NOT_LIVE stub — fixtures only when explicitly enabled later. */
export function createMeditechExpanseConnector(): ReadOnlyEhrConnector {
  return {
    vendor: 'MEDITECH_EXPANSE',
    readiness: 'NOT_LIVE',
    async authenticateFacility() {
      return {
        ok: false,
        message:
          'MEDITECH Expanse marketplace integration is NOT_LIVE — use fixtures/sandbox when certified',
      };
    },
    async pullResources() {
      return { envelopes: [] };
    },
    writeBack() {
      return denyWriteBack('MEDITECH_EXPANSE');
    },
  };
}
