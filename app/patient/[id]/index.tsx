import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  DEMO_CAREGIVER_ID,
} from '../../../data/caregiverHousehold';
import { getPatientVaultProfile } from '../../../data/patientVault';
import { getVaultMedOverrides } from '../../../db/vaultMedOverrides';
import {
  compileWeeklyDigest,
  createLiveDigestLoaders,
} from '../../../services/digestEngine';
import type {
  MedicationAdherenceSummary,
  VitalTrendPoint,
} from '../../../types/digest';
import type { MedicationRecord } from '../../../types/triage811';
import { formatHealthStory } from '../../../utils/healthStory';
import { paidHrefOrUpgrade } from '../../../services/walletPaywall';
import { getDeviceWalletPlan } from '../../../services/walletEntitlements';

/**
 * Person care hub — Ask vault · My Care · My History (no duplicate About me).
 */
export default function PatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = id ? getPatientVaultProfile(id) : undefined;
  const isSelf = profile?.relationshipLabel === 'self' || id === 'pt-self-01';
  const title = isSelf
    ? 'Myself'
    : profile?.preferredName ?? profile?.fullName ?? 'Care hub';
  const shortStory = profile
    ? formatHealthStory(profile)
    : 'No vault profile on file for this person yet.';

  const [meds, setMeds] = useState<MedicationRecord[]>([]);
  const [adherence, setAdherence] = useState<MedicationAdherenceSummary | null>(
    null,
  );
  const [vitals, setVitals] = useState<VitalTrendPoint[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void (async () => {
        const override = await getVaultMedOverrides(id);
        const base =
          override ??
          (profile?.activeMedications ?? []).filter(
            (m): m is MedicationRecord => Boolean(m?.name),
          );
        setMeds(base);

        const weekly = await compileWeeklyDigest(
          DEMO_CAREGIVER_ID,
          new Date(),
          createLiveDigestLoaders(),
        );
        setAdherence(
          weekly.adherence.find((a) => a.patientId === id) ?? null,
        );
        setVitals(
          weekly.vitalTrends.filter((v) => v.patientId === id).slice(0, 6),
        );
      })();
    }, [id, profile]),
  );

  const medSummary =
    meds.length > 0
      ? meds
          .map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ''}`)
          .join(' · ')
      : 'No active medications on file';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Family Health Vault</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.lede}>{shortStory}</Text>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>This week</Text>
        {adherence ? (
          <Text style={styles.statsLine}>
            Med adherence (prior 7d): {Math.round(adherence.adherenceRate * 100)}% (
            {adherence.dosesTaken}/{adherence.dosesScheduled})
          </Text>
        ) : (
          <Text style={styles.statsLine}>Med adherence: not tracked</Text>
        )}
        {vitals.length === 0 ? (
          <Text style={styles.statsMeta}>No 7-day vital samples on file.</Text>
        ) : (
          vitals.map((v, i) => (
            <Text key={`${v.date}-${v.label}-${i}`} style={styles.statsMeta}>
              {v.date} · {v.label}: {v.value} {v.unit}
            </Text>
          ))
        )}
      </View>

      <Link href={`/patient/${id}/askVault`} asChild>
        <Pressable style={styles.primary}>
          <Text style={styles.primaryText}>Ask my vault</Text>
          <Text style={styles.primarySub}>
            Ask any question about this person’s vault · BLUF then detail
          </Text>
        </Pressable>
      </Link>

      <Text style={styles.section}>My Care</Text>
      <Link href={`/patient/${id}/appointments`} asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>Medical Appointments</Text>
          <Text style={styles.rowMeta}>
            Record a visit · appointment prep (SBAR / insights / goals)
          </Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${id}/call811Prep`} asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>Symptom Checker</Text>
          <Text style={styles.rowMeta}>
            Life-threatening gate first · then 811 prep for this person
          </Text>
        </Pressable>
      </Link>
      <Link href={`/patient/${id}/prescriptions`} asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>Prescriptions</Text>
          <Text style={styles.rowMeta}>{medSummary}</Text>
        </Pressable>
      </Link>

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
          <Text style={styles.rowMeta}>
            On-device OCR · {getDeviceWalletPlan() === 'WALLET_PRO' ? 'included' : 'requires WALLET_PRO'}
          </Text>
        </Pressable>
      </Link>
      <Link
        href={paidHrefOrUpgrade('FOI', `/patient/${id}/foiWizard`) as never}
        asChild
      >
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>FOI / access request</Text>
          <Text style={styles.rowMeta}>
            When the portal is incomplete
            {getDeviceWalletPlan() === 'FREE_FEED' ? ' · upgrade to unlock' : ''}
          </Text>
        </Pressable>
      </Link>
      <Link
        href={
          paidHrefOrUpgrade('SBAR_EXPORT', `/patient/${id}/sbarExport`) as never
        }
        asChild
      >
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>Export visit SBAR</Text>
          <Text style={styles.rowMeta}>
            1-page physician summary
            {getDeviceWalletPlan() === 'FREE_FEED' ? ' · WALLET_PRO' : ''}
          </Text>
        </Pressable>
      </Link>
      <Link href="/family-feed/res-1" asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>LTC facility family feed</Text>
          <Text style={styles.rowMeta}>
            Read-only EHR timeline · PointClickCare fixtures
          </Text>
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
  statsCard: {
    backgroundColor: '#eef4f4',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  statsLine: { fontSize: 14, fontWeight: '600', color: '#0f3d3e' },
  statsMeta: { fontSize: 13, color: '#5a7374', lineHeight: 18 },
  section: {
    marginTop: 14,
    marginBottom: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
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
