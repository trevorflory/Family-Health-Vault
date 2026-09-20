#!/usr/bin/env node
/**
 * Prints the paid QA matrix for phone / desktop / 2022+ phone viewports.
 */
const viewports = {
  iphoneStandard: { width: 390, height: 844 },
  iphoneMax: { width: 430, height: 932 },
  androidLarge: { width: 412, height: 915 },
};

console.log('Family Health Vault — WALLET_PRO paid QA matrix');
console.log('');
console.log('[ ] 1. Native phone (Expo iOS/Android device or emulator)');
console.log('    - Enable sandbox WALLET_PRO on /family-feed/upgrade');
console.log('    - Exercise FOI, SBAR, documents, family feed clinical');
console.log('');
console.log('[ ] 2. Desktop app / wide web window');
console.log('    - npm run web:desktop  (Expo web on port 43127)');
console.log('    - Same paid flows at laptop width');
console.log('');
console.log('[ ] 3. Phone viewport on desktop/web (post-2022 sizes)');
console.log(
  `    - ${viewports.iphoneStandard.width}x${viewports.iphoneStandard.height} (iPhone 14/15 class)`,
);
console.log(
  `    - ${viewports.iphoneMax.width}x${viewports.iphoneMax.height} (Plus/Pro Max class)`,
);
console.log(
  `    - optional ${viewports.androidLarge.width}x${viewports.androidLarge.height}`,
);
console.log('    - Browser device mode or CSS viewport; npm run web:phone');
console.log('');
console.log('Demo entitlement: services/walletEntitlements.enableSandboxWalletPro()');
console.log('No Stripe required for QA.');
