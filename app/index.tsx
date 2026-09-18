import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  DEMO_CAREGIVER_ID,
  DEMO_SELF_ID,
  getHousehold,
} from '../data/caregiverHousehold';
import { getPatientVaultProfile } from '../data/patientVault';
import { listAgendaItemsDone } from '../db/agendaMarks';
import {
  compileDailyDigest,
  compileWeeklyDigest,
  createLiveDigestLoaders,
} from '../services/digestEngine';
import type { DigestDependantRef } from '../types/digest';
import { formatHealthStory } from '../utils/healthStory';
import {
  buildHomeAgenda,
  type HomeAgenda,
  type HomeAgendaItem,
} from '../utils/homeAgenda';

function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const TODAY_PREVIEW = 4;

/** Read-only tick mirror (1B) — checking happens on Daily. */
function TodayMirrorRow({ item }: { item: HomeAgendaItem }) {
  return (
    <View style={styles.mirrorRow} accessibilityRole="text">
      <Text style={[styles.mirrorTick, item.done && styles.mirrorTickDone]}>
        {item.done ? '✓' : '○'}
      </Text>
      <Text
        style={[styles.mirrorLabel, item.done && styles.mirrorLabelDone]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </View>
  );
}

function SectionHeadingLink({
  href,
  label,
  onPress,
}: {
  href?: string;
  label: string;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        style={styles.sectionHit}
      >
        <Text style={styles.sectionLink}>{label}</Text>
      </Pressable>
    );
  }
  if (!href) {
    return <Text style={styles.section}>{label}</Text>;
  }
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" style={styles.sectionHit}>
        <Text style={styles.sectionLink}>{label}</Text>
      </Pressable>
    </Link>
  );
}

function groupWeekByPerson(items: HomeAgendaItem[]): {
  key: string;
  label: string;
  items: HomeAgendaItem[];
}[] {
  const map = new Map<string, { label: string; items: HomeAgendaItem[] }>();
  for (const item of items) {
    const key = item.nickname ?? item.patientId ?? 'Household';
    const existing = map.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(key, { label: key, items: [item] });
    }
  }
  return [...map.entries()].map(([key, v]) => ({ key, ...v }));
}

export default function HomeScreen() {
  const router = useRouter();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [story, setStory] = useState('');
  const [family, setFamily] = useState<DigestDependantRef[]>([]);
  const [agenda, setAgenda] = useState<HomeAgenda | null>(null);
  const [showSymptomPicker, setShowSymptomPicker] = useState(false);

  const load = useCallback(async () => {
    try {
      setBusy(true);
      setError(null);
      const now = new Date();
      const dateKey = localDateKey(now);
      const loaders = createLiveDigestLoaders();
      const [daily, weekly, agendaDoneIds] = await Promise.all([
        compileDailyDigest(DEMO_CAREGIVER_ID, now, loaders),
        compileWeeklyDigest(DEMO_CAREGIVER_ID, now, loaders),
        listAgendaItemsDone(dateKey),
      ]);
      const selfVault = getPatientVaultProfile(DEMO_SELF_ID);
      setStory(
        selfVault
          ? formatHealthStory(selfVault)
          : 'Your vault profile is empty.',
      );
      const household = getHousehold(DEMO_CAREGIVER_ID, now);
      setFamily(
        (household?.dependants ?? [])
          .map((d) => d.dependant)
          .filter((d) => d.role !== 'self'),
      );
      setAgenda(buildHomeAgenda(daily, weekly, now, { agendaDoneIds }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load home');
    } finally {
      setBusy(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const todayPreview = useMemo(() => {
    const items = agenda?.today ?? [];
    const open = items.filter((i) => !i.done);
    const done = items.filter((i) => i.done);
    const ordered = [...open, ...done];
    return {
      shown: ordered.slice(0, TODAY_PREVIEW),
      more: Math.max(0, ordered.length - TODAY_PREVIEW),
      total: ordered.length,
      openCount: open.length,
    };
  }, [agenda]);

  const weekGroups = useMemo(() => {
    const open = (agenda?.week ?? []).filter((i) => !i.done);
    return groupWeekByPerson(open).slice(0, 4);
  }, [agenda]);

  const familyDensity =
    family.length >= 6 ? 'dense' : family.length >= 4 ? 'compact' : 'roomy';

  const familyTileStyle =
    familyDensity === 'dense'
      ? styles.miniTileDenseMerged
      : familyDensity === 'compact'
        ? styles.miniTileCompactMerged
        : styles.miniTile;

  const pickerPeople: DigestDependantRef[] = [
    {
      patientId: DEMO_SELF_ID,
      displayName: 'Myself',
      nickname: 'Myself',
      role: 'self',
      ageYears: 42,
      city: 'Regina',
    },
    ...family,
  ];

  if (busy && !agenda) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f3d3e" />
        <Text style={styles.meta}>Loading your vault…</Text>
      </View>
    );
  }

  if (error && !agenda) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Could not load home</Text>
        <Text style={styles.meta}>{error}</Text>
        <Pressable style={styles.primaryBtn} onPress={load}>
          <Text style={styles.primaryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.disclaimer}>
        A Vault for you and your families health to keep safe, provide summaries
        and ask questions of — but there are no diagnoses.
      </Text>

      <SectionHeadingLink
        href={`/patient/${DEMO_SELF_ID}`}
        label="Myself"
      />
      <Link href={`/patient/${DEMO_SELF_ID}`} asChild>
        <Pressable style={styles.tile} accessibilityRole="link">
          <Text style={styles.tileBody} numberOfLines={3}>
            {story}
          </Text>
        </Pressable>
      </Link>

      <SectionHeadingLink href="/family" label="My Family" />
      <View style={styles.familyRow}>
        {family.map((p) => (
          <Pressable
            key={p.patientId}
            style={familyTileStyle}
            accessibilityRole="link"
            onPress={() => router.push(`/patient/${p.patientId}`)}
          >
            <Text
              style={
                familyDensity === 'dense' ? styles.miniNickDenseMerged : styles.miniNick
              }
              numberOfLines={1}
            >
              {p.nickname}
            </Text>
            {familyDensity === 'roomy' ? (
              <Text style={styles.miniMeta}>
                {p.ageYears}y · {p.city}
              </Text>
            ) : familyDensity === 'compact' ? (
              <Text style={styles.miniMeta}>{p.ageYears}y</Text>
            ) : null}
          </Pressable>
        ))}
      </View>

      <SectionHeadingLink href="/digest/daily" label="Today" />
      <Link href="/digest/daily" asChild>
        <Pressable style={styles.tileCompact} accessibilityRole="link">
          {todayPreview.total === 0 ? (
            <Text style={styles.tileBody}>Nothing queued for today.</Text>
          ) : (
            <>
              <Text style={styles.todayMeta}>
                {todayPreview.openCount} open · priority order · check off on
                Daily
              </Text>
              {todayPreview.shown.map((item) => (
                <TodayMirrorRow key={item.id} item={item} />
              ))}
              {todayPreview.more > 0 ? (
                <Text style={styles.moreHint}>+{todayPreview.more} more</Text>
              ) : null}
            </>
          )}
        </Pressable>
      </Link>

      <SectionHeadingLink href="/digest/weekly" label="My Week" />
      <Link href="/digest/weekly" asChild>
        <Pressable style={styles.tile} accessibilityRole="link">
          {weekGroups.length === 0 ? (
            <Text style={styles.tileBody}>No open events this week.</Text>
          ) : (
            weekGroups.map((g) => (
              <View key={g.key} style={styles.weekGroup}>
                <Text style={styles.weekGroupTitle}>{g.label}</Text>
                {g.items.slice(0, 2).map((item) => (
                  <Text key={item.id} style={styles.bullet} numberOfLines={2}>
                    · {item.label.replace(`${g.label} — `, '').replace(`${g.label}: `, '')}
                  </Text>
                ))}
              </View>
            ))
          )}
        </Pressable>
      </Link>

      <SectionHeadingLink
        label="Symptom Checker"
        onPress={() => setShowSymptomPicker(true)}
      />
      <Pressable
        style={styles.primary}
        onPress={() => setShowSymptomPicker(true)}
      >
        <Text style={styles.primarySub}>
          Life-threatening check first → then 811 call prep when needed
        </Text>
      </Pressable>

      <Text style={styles.devSection}>Developer</Text>
      <Link href="/sandbox" asChild>
        <Pressable style={styles.devRow}>
          <Text style={styles.devText}>QA sandbox</Text>
        </Pressable>
      </Link>

      <Modal
        visible={showSymptomPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSymptomPicker(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowSymptomPicker(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Who are these symptoms for?</Text>
            {pickerPeople.map((p) => (
              <Pressable
                key={p.patientId}
                style={styles.modalRow}
                onPress={() => {
                  setShowSymptomPicker(false);
                  router.push(`/patient/${p.patientId}/call811Prep`);
                }}
              >
                <Text style={styles.modalNick}>{p.nickname}</Text>
                <Text style={styles.modalMeta}>{p.displayName}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.modalCancel}
              onPress={() => setShowSymptomPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, gap: 8 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f3d3e' },
  disclaimer: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b4f1d',
    backgroundColor: '#f7f0dd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    overflow: 'hidden',
    lineHeight: 17,
  },
  meta: { fontSize: 13, color: '#5a7374' },
  section: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionHit: { marginTop: 8, alignSelf: 'flex-start' },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d5c5e',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textDecorationLine: 'underline',
  },
  tile: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 4,
  },
  tileCompact: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 2,
  },
  tileBody: { fontSize: 14, color: '#355556', lineHeight: 20 },
  todayMeta: {
    fontSize: 11,
    color: '#5a7374',
    marginBottom: 4,
    fontWeight: '600',
  },
  mirrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  mirrorTick: {
    width: 14,
    fontSize: 13,
    color: '#0f3d3e',
    fontWeight: '700',
  },
  mirrorTickDone: { color: '#5a7374' },
  mirrorLabel: { flex: 1, fontSize: 13, color: '#143536', lineHeight: 18 },
  mirrorLabelDone: {
    color: '#8aa0a0',
    textDecorationLine: 'line-through',
  },
  moreHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#1d5c5e',
  },
  bullet: { fontSize: 14, color: '#143536', lineHeight: 20 },
  weekGroup: { marginTop: 4, gap: 2 },
  weekGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  familyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  miniTile: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    minWidth: 100,
  },
  miniTileCompactMerged: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    minWidth: 72,
  },
  miniTileDenseMerged: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    minWidth: 56,
  },
  miniNick: { fontSize: 17, fontWeight: '700', color: '#0f3d3e' },
  miniNickDenseMerged: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f3d3e',
  },
  miniMeta: { marginTop: 2, fontSize: 12, color: '#5a7374' },
  primary: {
    backgroundColor: '#0f3d3e',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  primarySub: { color: '#c5d6d6', fontSize: 13, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  primaryBtnText: { color: '#f4f7f5', fontWeight: '700' },
  devSection: {
    marginTop: 20,
    fontSize: 11,
    fontWeight: '600',
    color: '#8aa0a0',
    textTransform: 'uppercase',
  },
  devRow: { paddingVertical: 8 },
  devText: { fontSize: 13, color: '#5a7374' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 61, 62, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#f4f7f5',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f3d3e',
    marginBottom: 6,
  },
  modalRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d5e2e2',
  },
  modalNick: { fontSize: 16, fontWeight: '700', color: '#0f3d3e' },
  modalMeta: { fontSize: 12, color: '#5a7374', marginTop: 2 },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: '#5a7374', fontWeight: '600' },
});
