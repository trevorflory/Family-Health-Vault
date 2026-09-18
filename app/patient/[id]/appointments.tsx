import { Link, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  DEMO_CAREGIVER_ID,
  getHousehold,
} from '../../../data/caregiverHousehold';
import { getPatientVaultProfile } from '../../../data/patientVault';
import type { DigestAppointment } from '../../../types/digest';

function pickNextAppointment(
  appointments: DigestAppointment[],
  now: Date,
): DigestAppointment | null {
  const upcoming = appointments
    .filter((a) => new Date(a.startsAt).getTime() >= now.getTime() - 2 * 3600_000)
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  return upcoming[0] ?? null;
}

/**
 * Medical Appointments hub — Record visit · Appointment Prep.
 */
export default function AppointmentsHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = id ? getPatientVaultProfile(id) : undefined;
  const now = useMemo(() => new Date(), []);
  const household = getHousehold(DEMO_CAREGIVER_ID, now);
  const dep = household?.dependants.find((d) => d.dependant.patientId === id);
  const next = pickNextAppointment(dep?.appointments ?? [], now);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Medical Appointments</Text>
      <Text style={styles.lede}>
        {profile?.preferredName ?? profile?.fullName ?? 'This person'} — record
        visits and prepare for the next one.
      </Text>

      {next ? (
        <View style={styles.nextCard}>
          <Text style={styles.nextLabel}>Next visit</Text>
          <Text style={styles.nextTitle}>{next.title}</Text>
          <Text style={styles.meta}>
            {new Date(next.startsAt).toLocaleString('en-CA', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
            {next.clinicianName ? ` · ${next.clinicianName}` : ''}
          </Text>
        </View>
      ) : (
        <Text style={styles.meta}>No upcoming appointments on file.</Text>
      )}

      <Link href={`/patient/${id}/voiceDebrief`} asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>Record Appointment</Text>
          <Text style={styles.rowMeta}>
            Voice / typed debrief · post-visit notes
          </Text>
        </Pressable>
      </Link>

      <Link
        href={{
          pathname: `/patient/${id}/appointmentPrep`,
          params: next?.appointmentId
            ? { appointmentId: next.appointmentId }
            : undefined,
        }}
        asChild
      >
        <Pressable style={styles.primary}>
          <Text style={styles.primaryText}>Appointment Prep</Text>
          <Text style={styles.primarySub}>
            Visit goals · insights · SBAR / one-page summary for the visit
          </Text>
        </Pressable>
      </Link>

      <Link href={`/patient/${id}`} asChild>
        <Pressable style={styles.homeLink}>
          <Text style={styles.homeLinkText}>← Care hub</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  meta: { fontSize: 13, color: '#5a7374', lineHeight: 18 },
  nextCard: {
    backgroundColor: '#eef4f4',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  nextLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  nextTitle: { fontSize: 17, fontWeight: '700', color: '#0f3d3e' },
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
  primary: {
    backgroundColor: '#0f3d3e',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 4,
  },
  primaryText: { color: '#f4f7f5', fontWeight: '700', fontSize: 17 },
  primarySub: { color: '#c5d6d6', fontSize: 13, lineHeight: 18 },
  homeLink: { paddingVertical: 12 },
  homeLinkText: { color: '#1d5c5e', fontWeight: '600' },
});
