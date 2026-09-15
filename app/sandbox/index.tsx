import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Triage811Output } from '../../types/triage811';
import type { SBARDocument } from '../../types/sbar';
import {
  SEED_CHILD_ID,
  SEED_DAD_ID,
  seedLocalSandboxData,
  type SeedResult,
} from '../../utils/mockSeeder';
import {
  run811ScriptSandbox,
  runDadEmergencyPassSandbox,
  runDadOcrLabSandbox,
  runDadVoiceDebriefSandbox,
  runDailyDigestSandbox,
  runDadSbarSandbox,
  runLeoAgeOutSandbox,
  runSkHipaFoiSandbox,
  runWeeklyDigestSandbox,
  type DigestSandboxResult,
  type EmergencyPassSandboxResult,
  type OcrLabSandboxResult,
  type VoiceDebriefSandboxResult,
  type WeeklyDigestSandboxResult,
} from '../../utils/sandboxFlows';

type BusyKey =
  | 'seed'
  | 'digest'
  | 'weekly'
  | 'sbar'
  | 'foi'
  | 'script811'
  | 'ageOut'
  | 'emergency'
  | 'ocr'
  | 'voice'
  | null;

export default function SandboxHomeScreen() {
  const [busy, setBusy] = useState<BusyKey>(null);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [digestResult, setDigestResult] = useState<DigestSandboxResult | null>(
    null,
  );
  const [weeklyResult, setWeeklyResult] =
    useState<WeeklyDigestSandboxResult | null>(null);
  const [sbarHtml, setSbarHtml] = useState<string | null>(null);
  const [sbarUri, setSbarUri] = useState<string | null>(null);
  const [sbarDoc, setSbarDoc] = useState<SBARDocument | null>(null);
  const [foiUri, setFoiUri] = useState<string | null>(null);
  const [script811, setScript811] = useState<Triage811Output | null>(null);
  const [ageOutResult, setAgeOutResult] = useState<{
    handOffNote: string;
    grantStatuses: string[];
    accessLogCount: number;
  } | null>(null);
  const [emergencyResult, setEmergencyResult] =
    useState<EmergencyPassSandboxResult | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrLabSandboxResult | null>(null);
  const [voiceResult, setVoiceResult] =
    useState<VoiceDebriefSandboxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function withBusy<T>(
    key: BusyKey,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    setBusy(key);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sandbox action failed');
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function onSeed() {
    const result = await withBusy('seed', () => seedLocalSandboxData());
    if (result) setSeedResult(result);
  }

  async function onDigest() {
    const result = await withBusy('digest', () => runDailyDigestSandbox());
    if (result) setDigestResult(result);
  }

  async function onWeekly() {
    const result = await withBusy('weekly', () => runWeeklyDigestSandbox());
    if (result) setWeeklyResult(result);
  }

  async function onSbar() {
    const result = await withBusy('sbar', () => runDadSbarSandbox());
    if (!result) return;
    setSbarHtml(result.html);
    setSbarUri(result.uri);
    setSbarDoc(result.document);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: "Dad's SBAR note",
        UTI: 'com.adobe.pdf',
      });
    }
  }

  async function onFoi() {
    const result = await withBusy('foi', () => runSkHipaFoiSandbox());
    if (!result) return;
    setFoiUri(result.uri);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'SK HIPA FOI Request',
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Print.printAsync({ uri: result.uri }).catch(() => undefined);
    }
  }

  async function on811() {
    const result = await withBusy('script811', () => run811ScriptSandbox());
    if (result) setScript811(result);
  }

  async function onAgeOut() {
    const result = await withBusy('ageOut', () => runLeoAgeOutSandbox());
    if (result) setAgeOutResult(result);
  }

  async function onEmergency() {
    const result = await withBusy('emergency', () =>
      runDadEmergencyPassSandbox(),
    );
    if (!result) return;
    setEmergencyResult(result);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Dad emergency wallet card',
        UTI: 'com.adobe.pdf',
      });
    }
  }

  async function onOcr() {
    const result = await withBusy('ocr', () => runDadOcrLabSandbox());
    if (result) setOcrResult(result);
  }

  async function onVoice() {
    const result = await withBusy('voice', () => runDadVoiceDebriefSandbox());
    if (result) setVoiceResult(result);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>QA sandbox</Text>
      <Text style={styles.heading}>Local core-loop exercises</Text>
      <Text style={styles.lede}>
        Seed Dad (78) + Child (4) into SQLite, then one-click the digest, SBAR,
        SK HIPA FOI, and 811 teleprompter loops.
      </Text>

      <Pressable
        style={styles.seedBtn}
        onPress={onSeed}
        disabled={busy !== null}
      >
        {busy === 'seed' ? (
          <ActivityIndicator color="#f4f7f5" />
        ) : (
          <Text style={styles.seedBtnText}>Seed local SQLite profiles</Text>
        )}
      </Pressable>
      {seedResult ? (
        <Text style={styles.ok}>
          Seeded {seedResult.profiles.map((p) => p.displayName).join(' · ')}.
          Lab {seedResult.labEventId} · visit debrief{' '}
          {seedResult.visitDebriefEventId}. {seedResult.vaccineNote}
        </Text>
      ) : null}

      <ActionCard
        title="1. Run Daily Digest Generator"
        subtitle="Compile morning digest + verify push alert payload"
        busy={busy === 'digest'}
        disabled={busy !== null}
        onPress={onDigest}
      />
      {digestResult ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Push alert payload</Text>
          <Text style={styles.mono}>
            {JSON.stringify(digestResult.pushPayload, null, 2)}
          </Text>
          <Text style={styles.meta}>
            Meds {digestResult.totalMedsDue} · Visits{' '}
            {digestResult.totalAppointments} · Overdue{' '}
            {digestResult.totalOverdue}
          </Text>
          <Link href="/digest/daily" asChild>
            <Pressable>
              <Text style={styles.link}>Open Daily Digest screen →</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      <ActionCard
        title="1b. Run Weekly Digest Generator"
        subtitle="Sunday overview + verify weekly push payload"
        busy={busy === 'weekly'}
        disabled={busy !== null}
        onPress={onWeekly}
      />
      {weeklyResult ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly push alert payload</Text>
          <Text style={styles.mono}>
            {JSON.stringify(weeklyResult.pushPayload, null, 2)}
          </Text>
          <Text style={styles.meta}>{weeklyResult.digest.narrativeSummary}</Text>
          <Link href="/digest/weekly" asChild>
            <Pressable>
              <Text style={styles.link}>Open Weekly Digest screen →</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      <ActionCard
        title="2. Synthesize Dad's SBAR Note"
        subtitle="compileSBAR + MedicalEvents → 1-page PDF (same path as export UI)"
        busy={busy === 'sbar'}
        disabled={busy !== null}
        onPress={onSbar}
      />
      {sbarHtml ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SBAR from vault engine</Text>
          {sbarDoc ? (
            <>
              <Text style={styles.meta}>
                Sources: {sbarDoc.sourceEventSummaries.join(' · ') || 'none'}
              </Text>
              <Text style={styles.notice}>{sbarDoc.regulatoryNotice}</Text>
            </>
          ) : null}
          <Text style={styles.preview}>{sbarHtml.slice(0, 700)}…</Text>
          {sbarUri ? <Text style={styles.meta}>PDF: {sbarUri}</Text> : null}
          <Link href={`/patient/${SEED_DAD_ID}/sbarExport`} asChild>
            <Pressable>
              <Text style={styles.link}>Open full SBAR export →</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      <ActionCard
        title="3. Generate SK HIPA FOI Request"
        subtitle="Printable legal PDF for Saskatchewan Health Authority"
        busy={busy === 'foi'}
        disabled={busy !== null}
        onPress={onFoi}
      />
      {foiUri ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Saskatchewan HIPA PDF ready</Text>
          <Text style={styles.meta}>{foiUri}</Text>
        </View>
      ) : null}

      <ActionCard
        title="4. Trigger 811 Call Script"
        subtitle="Flustered-caregiver teleprompter for Dad"
        busy={busy === 'script811'}
        disabled={busy !== null}
        onPress={on811}
      />
      {script811 ? (
        <View style={styles.teleprompter}>
          <Text style={styles.teleLabel}>Opening (why you’re calling)</Text>
          <Text style={styles.teleText}>{script811.spokenIntroScript}</Text>
          <Text style={styles.teleLabel}>Dispatcher will ask — ready answers</Text>
          {script811.dispatcherCueSheet.map((cue, i) => (
            <Text key={cue.dispatcherAsks} style={styles.teleBullet}>
              {i + 1}. {cue.dispatcherAsks} → {cue.readyAnswer}
            </Text>
          ))}
          <Text style={styles.teleLabel}>Historical context</Text>
          {script811.historicalRedFlags.map((f) => (
            <Text key={f} style={styles.teleBullet}>
              • {f}
            </Text>
          ))}
          <Text style={styles.teleLabel}>Clarify after their script</Text>
          {script811.questionsToAskNurse.map((q, i) => (
            <Text key={q} style={styles.teleBullet}>
              {i + 1}. {q}
            </Text>
          ))}
          <Text style={styles.notice}>{script811.regulatoryNotice}</Text>
          <Link href={`/patient/${SEED_DAD_ID}/call811Prep`} asChild>
            <Pressable>
              <Text style={styles.linkLight}>Open full 811 prep →</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      <ActionCard
        title="5. Leo age-out hand-off"
        subtitle="Force parental PRIMARY_POA → AGED_OUT (persisted log)"
        busy={busy === 'ageOut'}
        disabled={busy !== null}
        onPress={onAgeOut}
      />
      {ageOutResult ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Age-out result</Text>
          <Text style={styles.meta}>{ageOutResult.handOffNote}</Text>
          <Text style={styles.meta}>
            Grant statuses: {ageOutResult.grantStatuses.join(', ')} · Log entries:{' '}
            {ageOutResult.accessLogCount}
          </Text>
          <Link href={`/patient/${SEED_CHILD_ID}/proxyAccess`} asChild>
            <Pressable>
              <Text style={styles.link}>Open Leo proxy access →</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      <ActionCard
        title="6. Dad Emergency Pass"
        subtitle="AES-256 QR ciphertext + printable wallet card PDF"
        busy={busy === 'emergency'}
        disabled={busy !== null}
        onPress={onEmergency}
      />
      {emergencyResult ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Emergency pass generated</Text>
          <Text style={styles.meta}>
            {emergencyResult.pass.context.fullName} · expires{' '}
            {new Date(emergencyResult.pass.expiresAt).toLocaleString('en-CA')}
          </Text>
          <Text style={styles.meta}>
            Allergies: {emergencyResult.pass.context.allergies.join('; ')}
          </Text>
          <Text style={styles.meta}>
            Token prefix: {emergencyResult.pass.qrValue.slice(0, 12)}… (ciphertext
            only)
          </Text>
          <Text style={styles.meta}>PDF: {emergencyResult.pdfUri}</Text>
          <Link href={`/patient/${SEED_DAD_ID}/emergencyPass`} asChild>
            <Pressable>
              <Text style={styles.link}>Open Emergency QR screen →</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      <ActionCard
        title="7. Dad OCR lab ingest"
        subtitle="Parse SHA lab mock → MedicalEvents PENDING_REVIEW"
        busy={busy === 'ocr'}
        disabled={busy !== null}
        onPress={onOcr}
      />
      {ocrResult ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>OCR lab saved</Text>
          <Text style={styles.meta}>
            {ocrResult.record.id} · {ocrResult.record.status} · labs:{' '}
            {ocrResult.parsed.labs.map((l) => l.testName).join(', ')}
          </Text>
          <Link href={ocrResult.deepLink} asChild>
            <Pressable>
              <Text style={styles.link}>Open upload / verify UI →</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      <ActionCard
        title="8. Dad voice visit debrief"
        subtitle="Extract transcript → VISIT_DEBRIEF MedicalEvent"
        busy={busy === 'voice'}
        disabled={busy !== null}
        onPress={onVoice}
      />
      {voiceResult ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Visit debrief saved</Text>
          <Text style={styles.meta}>
            {voiceResult.record.id} · {voiceResult.record.status}
          </Text>
          <Text style={styles.meta}>
            Actions: {voiceResult.extracted.actionItems.join('; ')}
          </Text>
          <Link href={voiceResult.deepLink} asChild>
            <Pressable>
              <Text style={styles.link}>Open voice debrief UI →</Text>
            </Pressable>
          </Link>
        </View>
      ) : null}

      <Link href="/sandbox/aiTest" asChild>
        <Pressable style={styles.secondary}>
          <Text style={styles.secondaryText}>Open Local LLM sandbox →</Text>
        </Pressable>
      </Link>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

function ActionCard({
  title,
  subtitle,
  onPress,
  busy,
  disabled,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  return (
    <Pressable
      style={[styles.action, disabled && !busy && styles.actionDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      {busy ? (
        <ActivityIndicator color="#0f3d3e" />
      ) : (
        <>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionSub}>{subtitle}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, gap: 12 },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  seedBtn: {
    backgroundColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  seedBtnText: { color: '#f4f7f5', fontWeight: '700', fontSize: 16 },
  ok: { fontSize: 13, color: '#1d5c5e', lineHeight: 18 },
  action: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 4,
  },
  actionDisabled: { opacity: 0.5 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#143536' },
  actionSub: { fontSize: 13, color: '#5a7374', lineHeight: 18 },
  card: {
    backgroundColor: '#eef5f5',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  cardTitle: { fontWeight: '700', color: '#0f3d3e' },
  mono: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#143536',
    lineHeight: 15,
  },
  meta: { fontSize: 12, color: '#5a7374' },
  preview: { fontSize: 11, color: '#355556', lineHeight: 15 },
  teleprompter: {
    backgroundColor: '#0b2c2d',
    borderRadius: 14,
    padding: 18,
    gap: 8,
  },
  teleLabel: {
    color: '#9ec4c5',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
  teleText: {
    color: '#f4f7f5',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  teleBullet: { color: '#e4efef', fontSize: 14, lineHeight: 20 },
  notice: { color: '#c9b27a', fontSize: 11, lineHeight: 15, marginTop: 6 },
  link: { color: '#1d5c5e', fontWeight: '600' },
  linkLight: { color: '#9ec4c5', fontWeight: '600' },
  secondary: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: '#0f3d3e', fontWeight: '600' },
  error: {
    backgroundColor: '#fde8e6',
    color: '#8a2b1e',
    padding: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
