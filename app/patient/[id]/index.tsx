import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getPatientVaultProfile } from '../../../data/patientVault';
import {
  formatHealthStory,
  formatHealthStoryDeep,
} from '../../../utils/healthStory';

/**
 * Person care hub — Myself / family member IA (About me · My Care · My History).
 */
export default function PatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = id ? getPatientVaultProfile(id) : undefined;
  const isSelf = profile?.relationshipLabel === 'self' || id === 'pt-self-01';
  const title = isSelf
    ? 'Myself'
    : profile?.preferredName ?? profile?.fullName ?? 'Care hub';
  const story = profile
    ? formatHealthStoryDeep(profile)
    : 'No vault profile on file for this person yet.';
  const shortStory = profile ? formatHealthStory(profile) : story;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Family Health Vault</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.lede}>{shortStory}</Text>

      <Text style={styles.section}>About me</Text>
      <View style={styles.tile}>
        <Text style={styles.tileBody}>{story}</Text>
      </View>
      <Link href={`/patient/${id}/askVault`} asChild>
        <Pressable style={styles.primary}>
          <Text style={styles.primaryText}>Ask my vault</Text>
          <Text style={styles.primarySub}>
            SaMD-safe Q&A over vault history · chat-style
          </Text>
        </Pressable>
      </Link>

      <Text style={styles.section}>My Care</Text>
      <Link href={`/patient/${id}/voiceDebrief`} asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>Medical professionals · record visit</Text>
          <Text style={styles.rowMeta}>
            Voice / typed debrief · post-visit notes
          </Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${id}/insights`} asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>Visit info & prep insights</Text>
          <Text style={styles.rowMeta}>Past context · biomarker trends</Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${id}/sbarExport`} asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>SBAR / summary for visit</Text>
          <Text style={styles.rowMeta}>
            Tailor for visit type · educational handoff
          </Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${id}/call811Prep`} asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>811 · Connection & Info</Text>
          <Text style={styles.rowMeta}>Dispatcher cue sheet for caregivers</Text>
        </Pressable>
      </Link>
      <View style={styles.row}>
        <Text style={styles.rowTitle}>Prescriptions</Text>
        <Text style={styles.rowMeta}>
          {profile?.activeMedications
            ?.filter((m): m is NonNullable<typeof m> => Boolean(m?.name))
            .map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ''}`)
            .join(' · ') || 'No active medications on file'}
        </Text>
      </View>

      <Text style={styles.section}>My History</Text>
      <Link href={`/patient/${id}/portalSync`} asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>Labs, imaging, Rx via portal</Text>
          <Text style={styles.rowMeta}>
            Provincial FILE_IMPORT · MySaskHealth / etc.
          </Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${id}/uploadDoc`} asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>Add history with camera</Text>
          <Text style={styles.rowMeta}>On-device OCR · confirm before use</Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${id}/foiWizard`} asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>FOI / access request</Text>
          <Text style={styles.rowMeta}>When the portal is incomplete</Text>
        </Pressable>
      </Link>

      <Text style={styles.section}>Share safely</Text>
      <Link href={`/patient/${id}/emergencyPass`} asChild>
        <Pressable style={styles.emergency}>
          <Text style={styles.emergencyText}>Emergency Pass / wallet card</Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${id}/proxyAccess`} asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>Proxy access, age-out & aide delegate</Text>
          <Text style={styles.rowMeta}>
            Roles · append-only log · care-home shift handover
          </Text>
        </Pressable>
      </Link>

      <Link href="/" asChild>
        <Pressable style={styles.homeLink}>
          <Text style={styles.homeLinkText}>← Home</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 40 },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f3d3e',
    letterSpacing: -0.4,
  },
  lede: { fontSize: 15, color: '#355556', lineHeight: 22, marginBottom: 4 },
  section: {
    marginTop: 14,
    marginBottom: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tile: {
    backgroundColor: '#eef4f4',
    borderRadius: 12,
    padding: 14,
  },
  tileBody: { fontSize: 14, color: '#355556', lineHeight: 20 },
  primary: {
    backgroundColor: '#0f3d3e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 4,
  },
  primaryText: { color: '#f4f7f5', fontWeight: '700', fontSize: 17 },
  primarySub: { color: '#c5d6d6', fontSize: 13, lineHeight: 18 },
  row: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 2,
  },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#0f3d3e' },
  rowMeta: { fontSize: 13, color: '#5a7374', lineHeight: 18 },
  emergency: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emergencyText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  homeLink: { paddingVertical: 12 },
  homeLinkText: { color: '#1d5c5e', fontWeight: '600' },
});
