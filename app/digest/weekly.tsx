import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  DEMO_DAD_ID,
  getHousehold,
} from '../../data/caregiverHousehold';
import { listAgendaItemsDone, setAgendaItemDone } from '../../db/agendaMarks';
import { upsertAppointments } from '../../db/appointments';
import {
  appointmentsFromGoogleIcsExport,
  GOOGLE_CALENDAR_READINESS,
  shareAppointmentsIcs,
} from '../../services/calendar/googleCalendarBridge';
import {
  compileWeeklyDigest,
  createLiveDigestLoaders,
} from '../../services/digestEngine';
import type { DigestAppointment, WeeklyDigestPayload } from '../../types/digest';
import {
  buildWeekViewRows,
  filterWeekViewRows,
  type WeekViewSort,
} from '../../utils/homeAgenda';

type DayFilter = 'all' | string;
type PersonFilter = 'all' | string;

function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function WeeklyDigestScreen() {
  const params = useLocalSearchParams<{ caregiverId?: string }>();
  const caregiverId = params.caregiverId || DEMO_CAREGIVER_ID;

  const [digest, setDigest] = useState<WeeklyDigestPayload | null>(null);
  const [agendaDone, setAgendaDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [icsPaste, setIcsPaste] = useState('');
  const [importPatientId, setImportPatientId] = useState(DEMO_DAD_ID);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [sort, setSort] = useState<WeekViewSort>('priority');
  const [dayFilter, setDayFilter] = useState<DayFilter>('all');
  const [personFilter, setPersonFilter] = useState<PersonFilter>('all');

  const refreshQuiet = useCallback(async () => {
    const dateKey = localDateKey();
    const [payload, doneIds] = await Promise.all([
      compileWeeklyDigest(
        caregiverId,
        new Date(),
        createLiveDigestLoaders(),
      ),
      listAgendaItemsDone(dateKey),
    ]);
    setDigest(payload);
    setAgendaDone(new Set(doneIds));
  }, [caregiverId]);

  const load = useCallback(async () => {
    try {
      setBusy(true);
      setError(null);
      await refreshQuiet();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to compile weekly digest',
      );
    } finally {
      setBusy(false);
    }
  }, [refreshQuiet]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const exportableAppointments = useMemo((): DigestAppointment[] => {
    const household = getHousehold(caregiverId);
    if (!household) return [];
    return household.dependants.flatMap((d) => d.appointments);
  }, [caregiverId]);

  const dayOptions = useMemo(() => {
    if (!digest) return [] as string[];
    const keys: string[] = [];
    const start = new Date(`${digest.windowStart}T12:00:00`);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      keys.push(localDateKey(d));
    }
    return keys;
  }, [digest]);

  const filteredRows = useMemo(() => {
    if (!digest) return [];
    const rows = filterWeekViewRows(buildWeekViewRows(digest, new Date()), {
      sort,
      dayKey: dayFilter === 'all' ? null : dayFilter,
      patientId: personFilter === 'all' ? null : personFilter,
    });
    return rows
      .map((r) => ({ ...r, done: agendaDone.has(r.id) }))
      .sort((a, b) => Number(a.done) - Number(b.done));
  }, [digest, sort, dayFilter, personFilter, agendaDone]);

  async function toggleRow(itemId: string, done: boolean) {
    setAgendaDone((prev) => {
      const next = new Set(prev);
      if (done) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
    try {
      await setAgendaItemDone({
        itemId,
        dateKey: localDateKey(),
        done,
      });
    } catch (err) {
      Alert.alert(
        'Could not save',
        err instanceof Error ? err.message : 'Checklist update failed',
      );
      await refreshQuiet();
    }
  }

  const onExportIcs = async () => {
    try {
      setCalendarBusy(true);
      const { icsText } = await shareAppointmentsIcs({
        appointments: exportableAppointments,
        calendarName: 'Family Health Vault',
      });
      if (!icsText.includes('BEGIN:VEVENT')) {
        Alert.alert(
          'Nothing to export',
          'No appointments in the household schedule.',
        );
      }
    } catch (err) {
      Alert.alert(
        'Export failed',
        err instanceof Error ? err.message : 'Could not share .ics file',
      );
    } finally {
      setCalendarBusy(false);
    }
  };

  const onImportIcs = async () => {
    try {
      setCalendarBusy(true);
      const parsed = appointmentsFromGoogleIcsExport(icsPaste);
      if (parsed.length === 0) {
        Alert.alert(
          'No events found',
          'Paste a Google Calendar .ics export (BEGIN:VCALENDAR …).',
        );
        return;
      }
      await upsertAppointments(importPatientId, parsed);
      setIcsPaste('');
      await load();
      Alert.alert(
        'Imported',
        `${parsed.length} event(s) saved — they feed Today / My Week prompts.`,
      );
    } catch (err) {
      Alert.alert(
        'Import failed',
        err instanceof Error ? err.message : 'Could not parse ICS',
      );
    } finally {
      setCalendarBusy(false);
    }
  };

  if (busy && !digest) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f3d3e" />
        <Text style={styles.meta}>Compiling next 7 days…</Text>
      </View>
    );
  }

  if (error || !digest) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Weekly Overview</Text>
        <Text style={styles.meta}>{error ?? 'No digest available'}</Text>
        <Pressable style={styles.primaryBtn} onPress={load}>
          <Text style={styles.primaryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const household = getHousehold(caregiverId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>
        Rolling window · {digest.windowStart} → {digest.windowEnd}
      </Text>
      <Text style={styles.heading}>Weekly Overview</Text>
      <Text style={styles.lede}>{digest.headline}</Text>
      <Text style={styles.narrative}>{digest.narrativeSummary}</Text>
      <Text style={styles.note}>
        Planning view for the week — priorities and schedule. Medication
        adherence is on My Family; 7-day vitals live on each person’s Appointment
        Prep. Check off items to sync with Today / Daily.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Schedule & to-dos</Text>
        {filteredRows.length === 0 ? (
          <Text style={styles.meta}>Nothing matches this view</Text>
        ) : (
          filteredRows.map((row) => (
            <View key={row.id} style={styles.row}>
              <Pressable
                onPress={() => void toggleRow(row.id, !row.done)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: row.done }}
              >
                <View style={[styles.checkbox, row.done && styles.checkboxOn]}>
                  {row.done ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
              </Pressable>
              {row.href ? (
                <Link href={row.href} asChild>
                  <Pressable style={styles.rowText}>
                    <Text
                      style={[styles.lineLink, row.done && styles.lineDone]}
                    >
                      {row.label}
                    </Text>
                  </Pressable>
                </Link>
              ) : (
                <Text style={[styles.line, row.done && styles.lineDone]}>
                  {row.label}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Google Calendar (.ics)</Text>
        <Text style={styles.meta}>{GOOGLE_CALENDAR_READINESS.summary}</Text>
        <Text style={styles.note}>
          {GOOGLE_CALENDAR_READINESS.googleCalendarHint}
        </Text>
        <Pressable
          style={[styles.primaryBtn, calendarBusy && styles.btnDisabled]}
          onPress={onExportIcs}
          disabled={calendarBusy}
        >
          <Text style={styles.primaryBtnText}>
            {calendarBusy ? 'Working…' : 'Export appointments (.ics)'}
          </Text>
        </Pressable>
        <Text style={styles.meta}>Import into vault for patient:</Text>
        <View style={styles.chipRow}>
          {(household?.dependants ?? []).map((d) => (
            <Pressable
              key={d.dependant.patientId}
              style={[
                styles.chip,
                importPatientId === d.dependant.patientId && styles.chipOn,
              ]}
              onPress={() => setImportPatientId(d.dependant.patientId)}
            >
              <Text
                style={[
                  styles.chipText,
                  importPatientId === d.dependant.patientId &&
                    styles.chipTextOn,
                ]}
              >
                {d.dependant.nickname}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.icsInput}
          multiline
          placeholder="Paste Google Calendar .ics export here…"
          placeholderTextColor="#8aa0a1"
          value={icsPaste}
          onChangeText={setIcsPaste}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          style={[styles.secondaryBtn, calendarBusy && styles.btnDisabled]}
          onPress={onImportIcs}
          disabled={calendarBusy || !icsPaste.trim()}
        >
          <Text style={styles.secondaryBtnText}>Import pasted .ics</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>View & sorting</Text>
        <Text style={styles.meta}>Sort</Text>
        <View style={styles.chipRow}>
          {(
            [
              ['priority', 'Priority'],
              ['day', 'Day'],
              ['person', 'People'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              style={[styles.chip, sort === key && styles.chipOn]}
              onPress={() => setSort(key)}
            >
              <Text
                style={[styles.chipText, sort === key && styles.chipTextOn]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.meta}>Day</Text>
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, dayFilter === 'all' && styles.chipOn]}
            onPress={() => setDayFilter('all')}
          >
            <Text
              style={[
                styles.chipText,
                dayFilter === 'all' && styles.chipTextOn,
              ]}
            >
              All
            </Text>
          </Pressable>
          {dayOptions.map((key) => (
            <Pressable
              key={key}
              style={[styles.chip, dayFilter === key && styles.chipOn]}
              onPress={() => setDayFilter(key)}
            >
              <Text
                style={[
                  styles.chipText,
                  dayFilter === key && styles.chipTextOn,
                ]}
              >
                {new Date(`${key}T12:00:00`).toLocaleDateString('en-CA', {
                  weekday: 'short',
                  day: 'numeric',
                })}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.meta}>Person</Text>
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, personFilter === 'all' && styles.chipOn]}
            onPress={() => setPersonFilter('all')}
          >
            <Text
              style={[
                styles.chipText,
                personFilter === 'all' && styles.chipTextOn,
              ]}
            >
              All
            </Text>
          </Pressable>
          {(household?.dependants ?? []).map((d) => (
            <Pressable
              key={d.dependant.patientId}
              style={[
                styles.chip,
                personFilter === d.dependant.patientId && styles.chipOn,
              ]}
              onPress={() => setPersonFilter(d.dependant.patientId)}
            >
              <Text
                style={[
                  styles.chipText,
                  personFilter === d.dependant.patientId && styles.chipTextOn,
                ]}
              >
                {d.dependant.nickname}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Link href="/" asChild>
        <Pressable style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>← Back to home</Text>
        </Pressable>
      </Link>
      <Link href="/digest/daily" asChild>
        <Pressable style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>← Daily Morning Status</Text>
        </Pressable>
      </Link>
      <Link href="/family" asChild>
        <Pressable style={styles.linkBtn}>
          <Text style={styles.linkBtnText}>My Family (adherence) →</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, gap: 12 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  narrative: { fontSize: 14, color: '#355556', lineHeight: 20 },
  note: { fontSize: 12, color: '#5a7374', lineHeight: 18 },
  meta: { fontSize: 13, color: '#5a7374' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#143536',
    marginBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowText: { flex: 1 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0f3d3e',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: '#0f3d3e' },
  checkMark: { color: '#f4f7f5', fontSize: 13, fontWeight: '700' },
  line: { flex: 1, fontSize: 14, color: '#143536', lineHeight: 20 },
  lineLink: { flex: 1, fontSize: 14, color: '#1d5c5e', lineHeight: 20 },
  lineDone: { color: '#8aa0a0', textDecorationLine: 'line-through' },
  primaryBtn: {
    backgroundColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  primaryBtnText: { color: '#f4f7f5', fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  secondaryBtnText: { color: '#0f3d3e', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#b7caca',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipOn: { backgroundColor: '#0f3d3e', borderColor: '#0f3d3e' },
  chipText: { color: '#143536', fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: '#f4f7f5' },
  icsInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: '#143536',
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
  linkBtn: { paddingVertical: 4 },
  linkBtnText: { color: '#1d5c5e', fontWeight: '600' },
});
