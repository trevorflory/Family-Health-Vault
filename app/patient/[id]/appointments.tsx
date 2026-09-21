import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  DEMO_CAREGIVER_ID,
  getHousehold,
} from '../../../data/caregiverHousehold';
import { getPatientVaultProfile } from '../../../data/patientVault';
import {
  deleteAppointment,
  listAppointmentsForPatient,
  upsertAppointment,
} from '../../../db/appointments';
import { mergeAppointments } from '../../../services/digestEngine';
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

function newApptId(): string {
  return `appt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Medical Appointments hub — CRUD for local full-test + Record / Prep.
 */
export default function AppointmentsHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = id ? getPatientVaultProfile(id) : undefined;
  const now = useMemo(() => new Date(), []);
  const household = getHousehold(DEMO_CAREGIVER_ID, now);
  const dep = household?.dependants.find((d) => d.dependant.patientId === id);

  const [live, setLive] = useState<DigestAppointment[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [location, setLocation] = useState('');
  const [clinicianName, setClinicianName] = useState('');
  const [prep, setPrep] = useState('');
  const [saving, setSaving] = useState(false);

  const merged = useMemo(
    () => mergeAppointments(dep?.appointments ?? [], live),
    [dep?.appointments, live],
  );
  const next = pickNextAppointment(merged, now);

  const load = useCallback(async () => {
    if (!id) return;
    setLive(await listAppointmentsForPatient(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function startCreate() {
    setEditingId('new');
    setTitle('');
    const d = new Date(Date.now() + 24 * 3600_000);
    d.setMinutes(0, 0, 0);
    setStartsAt(d.toISOString().slice(0, 16));
    setLocation('');
    setClinicianName('');
    setPrep('Bring SBAR and current meds list');
  }

  function startEdit(a: DigestAppointment) {
    setEditingId(a.appointmentId);
    setTitle(a.title);
    setStartsAt(a.startsAt.slice(0, 16));
    setLocation(a.location);
    setClinicianName(a.clinicianName ?? '');
    setPrep(a.preparationAlert);
  }

  async function onSave() {
    if (!id || !title.trim() || !startsAt.trim()) {
      Alert.alert('Missing fields', 'Title and start time are required.');
      return;
    }
    setSaving(true);
    try {
      const iso = startsAt.includes('T')
        ? new Date(startsAt).toISOString()
        : new Date(startsAt).toISOString();
      const appointmentId = editingId === 'new' ? newApptId() : editingId!;
      await upsertAppointment(id, {
        appointmentId,
        title: title.trim(),
        startsAt: iso,
        location: location.trim() || 'TBD',
        preparationAlert: prep.trim() || 'Prepare questions for the clinician',
        clinicianName: clinicianName.trim() || undefined,
        source: 'VAULT',
      });
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(appointmentId: string) {
    await deleteAppointment(appointmentId);
    if (editingId === appointmentId) setEditingId(null);
    await load();
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Medical Appointments</Text>
      <Text style={styles.lede}>
        {profile?.preferredName ?? profile?.fullName ?? 'This person'} — add or
        edit visits for local full-test digests (no cloud calendar required).
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

      <Pressable style={styles.addBtn} onPress={startCreate}>
        <Text style={styles.addBtnText}>+ Add appointment</Text>
      </Pressable>

      {editingId ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>
            {editingId === 'new' ? 'New appointment' : 'Edit appointment'}
          </Text>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Nephrology follow-up"
          />
          <Text style={styles.label}>Starts (local ISO-ish)</Text>
          <TextInput
            style={styles.input}
            value={startsAt}
            onChangeText={setStartsAt}
            placeholder="2026-09-22T15:00"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Clinic"
          />
          <Text style={styles.label}>Clinician</Text>
          <TextInput
            style={styles.input}
            value={clinicianName}
            onChangeText={setClinicianName}
            placeholder="Dr Name"
          />
          <Text style={styles.label}>Prep alert</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={prep}
            onChangeText={setPrep}
            multiline
          />
          <View style={styles.formRow}>
            <Pressable style={styles.primary} onPress={() => void onSave()}>
              <Text style={styles.primaryText}>
                {saving ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => setEditingId(null)}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Text style={styles.section}>On file ({merged.length})</Text>
      {merged.map((a) => (
        <View key={a.appointmentId} style={styles.card}>
          <Text style={styles.cardTitle}>{a.title}</Text>
          <Text style={styles.meta}>
            {new Date(a.startsAt).toLocaleString('en-CA')} · {a.location}
            {a.source ? ` · ${a.source}` : ''}
          </Text>
          <View style={styles.formRow}>
            <Pressable onPress={() => startEdit(a)}>
              <Text style={styles.link}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => void onDelete(a.appointmentId)}>
              <Text style={styles.danger}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}

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
  section: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
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
  addBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#d9e6e6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { fontWeight: '700', color: '#0f3d3e' },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#d5e2e2',
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#0f3d3e' },
  label: { fontSize: 12, fontWeight: '600', color: '#5a7374' },
  input: {
    borderWidth: 1,
    borderColor: '#d5e2e2',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fafcfc',
    color: '#0f3d3e',
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0f3d3e' },
  link: { color: '#1d5c5e', fontWeight: '600' },
  danger: { color: '#8b2e2e', fontWeight: '600' },
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
    flex: 1,
  },
  primaryText: { color: '#f4f7f5', fontWeight: '700', fontSize: 16 },
  primarySub: { color: '#c5d6d6', fontSize: 13, lineHeight: 18 },
  secondary: { padding: 12 },
  secondaryText: { color: '#5a7374', fontWeight: '600' },
  homeLink: { paddingVertical: 12 },
  homeLinkText: { color: '#1d5c5e', fontWeight: '600' },
});
