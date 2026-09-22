/**
 * In-app QA link board — use these Links (not typed URLs) so Expo Router resolves correctly.
 * Also documents desktop / Expo / phone-frame targets.
 */
import { Link, type Href } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const DAD = 'pt-7801';

type QaLink = { href: Href; label: string; note?: string };

const LINKS: QaLink[] = [
  { href: '/', label: 'Home' },
  { href: '/sandbox', label: 'QA Sandbox', note: '0c full path · seed · PCC' },
  {
    href: '/sandbox/ehrSimulator',
    label: 'EHR ingest simulator',
    note: 'QA only — not staff charting',
  },
  { href: '/sandbox/aiTest', label: 'Local LLM sandbox' },
  { href: '/family', label: 'My Family roster' },
  { href: '/family-feed', label: 'Family feed (LTC)', note: 'redirects to demo resident' },
  { href: '/family-feed/upgrade', label: 'WALLET_PRO upgrade / toggle' },
  { href: '/digest/daily', label: 'Daily digest' },
  { href: '/digest/weekly', label: 'Weekly digest' },
  { href: `/patient/${DAD}`, label: 'Dad care hub', note: DAD },
  { href: `/patient/${DAD}/profile`, label: 'Dad · Profile (local)' },
  { href: `/patient/${DAD}/prescriptions`, label: 'Dad · Prescriptions' },
  { href: `/patient/${DAD}/appointments`, label: 'Dad · Appointments CRUD' },
  { href: `/patient/${DAD}/vitals`, label: 'Dad · Vitals' },
  { href: `/patient/${DAD}/events`, label: 'Dad · MedicalEvents inbox' },
  { href: `/patient/${DAD}/foiWizard`, label: 'Dad · FOI (paywalled if FREE)' },
  { href: `/patient/${DAD}/sbarExport`, label: 'Dad · SBAR (paywalled if FREE)' },
  { href: `/patient/${DAD}/call811Prep`, label: 'Dad · Symptom Checker / 811' },
  { href: `/patient/${DAD}/insights`, label: 'Dad · Insights' },
  { href: `/patient/${DAD}/portalSync`, label: 'Dad · Portal sync' },
  { href: `/patient/${DAD}/proxyAccess`, label: 'Dad · Proxy access' },
  { href: `/patient/${DAD}/emergencyPass`, label: 'Dad · Emergency Pass' },
];

export default function QaLinksScreen() {
  const webBase =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:43127';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>QA links</Text>
      <Text style={styles.lede}>
        Tap links below (Expo Router). Typed browser URLs only work while Metro
        web is running on port 43127.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Targets</Text>
        <Text style={styles.meta}>
          Desktop web (390×844 frame): npm run web → {webBase}
        </Text>
        <Text style={styles.meta}>
          Clear cache: npm run web:clear
        </Text>
        <Text style={styles.meta}>
          Native phone: npm start → Expo Go QR · or npm run android / ios
        </Text>
        <Text style={styles.meta}>
          Plus size check: DevTools device mode 430×932 on the same origin
        </Text>
      </View>

      {LINKS.map((item) => {
        const path = typeof item.href === 'string' ? item.href : String(item.href);
        return (
          <Link key={path} href={item.href} asChild>
            <Pressable style={styles.row}>
              <Text style={styles.rowTitle}>{item.label}</Text>
              <Text style={styles.rowHref}>
                {webBase}
                {path === '/' ? '' : path}
              </Text>
              {item.note ? <Text style={styles.meta}>{item.note}</Text> : null}
            </Pressable>
          </Link>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 48 },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 14, color: '#355556', lineHeight: 20 },
  card: {
    backgroundColor: '#eef4f4',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  cardTitle: { fontWeight: '700', color: '#0f3d3e' },
  meta: { fontSize: 12, color: '#5a7374', lineHeight: 17 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 2,
  },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#0f3d3e' },
  rowHref: { fontSize: 11, color: '#1d5c5e', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
});
