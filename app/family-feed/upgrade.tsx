import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  DEMO_WALLET_PRO_ENTITLEMENT,
  PHONE_VIEWPORTS_2022,
  WALLET_PRO_PLATFORMS,
} from '@family-health-vault/shared';
import {
  enableSandboxWalletPro,
  getDeviceWalletPlan,
  getDevicePlatforms,
} from '../../services/walletEntitlements';

/**
 * WALLET_PRO (~$20/mo) — mobile + website + desktop. Sandbox unlock for QA.
 */
export default function FamilyFeedUpgradeScreen() {
  const [plan, setPlan] = useState(getDeviceWalletPlan());
  const [platforms, setPlatforms] = useState(getDevicePlatforms());

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Subscription</Text>
      <Text style={styles.heading}>Personal Health Wallet</Text>
      <Text style={styles.price}>$20 / month</Text>
      <Text style={styles.lede}>
        One plan unlocks the full Family Health Vault on phone, website, and
        desktop app. Freemium stays limited to a non-clinical facility timeline.
      </Text>

      <Text style={styles.section}>Included platforms</Text>
      {WALLET_PRO_PLATFORMS.map((p) => (
        <Text key={p} style={styles.bullet}>
          · {p}
        </Text>
      ))}

      <Text style={styles.section}>Paid QA viewports (2022+ phones)</Text>
      <Text style={styles.bullet}>
        · {PHONE_VIEWPORTS_2022.iphoneStandard.width}×
        {PHONE_VIEWPORTS_2022.iphoneStandard.height}{' '}
        {PHONE_VIEWPORTS_2022.iphoneStandard.label}
      </Text>
      <Text style={styles.bullet}>
        · {PHONE_VIEWPORTS_2022.iphoneMax.width}×
        {PHONE_VIEWPORTS_2022.iphoneMax.height}{' '}
        {PHONE_VIEWPORTS_2022.iphoneMax.label}
      </Text>

      <Text style={styles.meta}>
        Current: {plan} · [{platforms.join(', ')}]
      </Text>

      <Pressable
        style={styles.cta}
        onPress={() => {
          enableSandboxWalletPro();
          setPlan(getDeviceWalletPlan());
          setPlatforms(getDevicePlatforms());
        }}
      >
        <Text style={styles.ctaText}>
          Enable sandbox {DEMO_WALLET_PRO_ENTITLEMENT.plan} (no Stripe)
        </Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upgrade unlocks</Text>
        <Text style={styles.bullet}>· Documents & portal history</Text>
        <Text style={styles.bullet}>· FOI / access requests</Text>
        <Text style={styles.bullet}>· SBAR export</Text>
        <Text style={styles.bullet}>· Full clinical POA chart views</Text>
      </View>

      <Link href="/family-feed/res-1" asChild>
        <Pressable style={styles.link}>
          <Text style={styles.linkText}>← Back to family feed</Text>
        </Pressable>
      </Link>
      <Link href="/sandbox" asChild>
        <Pressable style={styles.link}>
          <Text style={styles.linkText}>Open QA sandbox</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 48 },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  heading: { fontSize: 26, fontWeight: '700', color: '#0f3d3e' },
  price: { fontSize: 22, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 22 },
  section: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  bullet: { fontSize: 15, color: '#0f3d3e', lineHeight: 22 },
  meta: { fontSize: 13, color: '#5a7374' },
  cta: {
    backgroundColor: '#0f3d3e',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  ctaText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  card: {
    backgroundColor: '#eef4f4',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f3d3e' },
  link: { paddingVertical: 8 },
  linkText: { color: '#0f3d3e', fontWeight: '600' },
});
