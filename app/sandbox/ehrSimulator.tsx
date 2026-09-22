import { Link } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  buildCustomEnvelope,
  presetDeliveryRevoked,
  presetPrimaryPoaClinical,
  presetSecondaryScheduleOnly,
  runSimulatorIngest,
} from '../../services/ehr/simulator';
import type { EhrIngestEnvelope } from '@family-health-vault/shared';

/**
 * Dev/QA only — simulates facility EHR webhooks into the read-only normalizer.
 * Production remains marketplace ingest with zero staff workload.
 */
export default function EhrSimulatorScreen() {
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [medName, setMedName] = useState('Metformin');
  const [vitalValue, setVitalValue] = useState('130');

  async function run(
    label: string,
    envelopes: EhrIngestEnvelope[],
  ) {
    setBusy(true);
    setResult(null);
    try {
      const out = await runSimulatorIngest(envelopes, {
        reset: true,
        bridgeToVault: true,
      });
      setResult(
        `${label}: ingested ${out.ingested}, vault events ${out.vaultSaved}, resident ${out.residentId ?? '—'}`,
      );
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Simulator failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Dev / QA only</Text>
        <Text style={styles.bannerBody}>
          Simulates facility EHR webhooks into the same normalizer used for
          PointClickCare. Production remains read-only marketplace ingest —
          frontline staff never use this screen.
        </Text>
      </View>

      <Text style={styles.heading}>EHR ingest simulator</Text>

      <Pressable
        style={styles.primary}
        disabled={busy}
        onPress={() =>
          void run('Primary POA clinical', presetPrimaryPoaClinical())
        }
      >
        <Text style={styles.primaryText}>Preset: Primary POA clinical</Text>
      </Pressable>
      <Pressable
        style={styles.secondary}
        disabled={busy}
        onPress={() =>
          void run('Secondary schedule-only', presetSecondaryScheduleOnly())
        }
      >
        <Text style={styles.secondaryText}>
          Preset: Secondary schedule-only
        </Text>
      </Pressable>
      <Pressable
        style={styles.secondary}
        disabled={busy}
        onPress={() =>
          void run('Delivery revoked', presetDeliveryRevoked())
        }
      >
        <Text style={styles.secondaryText}>
          Preset: Unsubscribe / delivery off
        </Text>
      </Pressable>

      <Text style={styles.section}>Custom medication</Text>
      <TextInput
        style={styles.input}
        value={medName}
        onChangeText={setMedName}
        placeholder="Medication name"
      />
      <Pressable
        style={styles.secondary}
        disabled={busy}
        onPress={() =>
          void run('Custom med', [
            buildCustomEnvelope({
              resource_type: 'MEDICATION',
              medication_name: medName,
              dosage: '1 tab',
              schedule: 'daily',
            }),
            buildCustomEnvelope({
              resource_type: 'MED_ADMIN',
              medication_name: medName,
            }),
          ])
        }
      >
        <Text style={styles.secondaryText}>Inject medication + eMAR</Text>
      </Pressable>

      <Text style={styles.section}>Custom vital</Text>
      <TextInput
        style={styles.input}
        value={vitalValue}
        onChangeText={setVitalValue}
        keyboardType="decimal-pad"
      />
      <Pressable
        style={styles.secondary}
        disabled={busy}
        onPress={() =>
          void run('Custom vital', [
            buildCustomEnvelope({
              resource_type: 'VITAL',
              vital_type: 'BP_SYS',
              vital_value: vitalValue,
            }),
          ])
        }
      >
        <Text style={styles.secondaryText}>Inject BP_SYS vital</Text>
      </Pressable>

      {result ? <Text style={styles.result}>{result}</Text> : null}

      <Link href="/family-feed" asChild>
        <Pressable style={styles.linkRow}>
          <Text style={styles.link}>Open family feed →</Text>
        </Pressable>
      </Link>
      <Link href="/sandbox" asChild>
        <Pressable style={styles.linkRow}>
          <Text style={styles.link}>← Sandbox</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingBottom: 48 },
  banner: {
    backgroundColor: '#fff4e5',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e8c48a',
  },
  bannerTitle: { fontWeight: '800', color: '#6b4500' },
  bannerBody: { fontSize: 13, color: '#6b4500', lineHeight: 18 },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f3d3e' },
  section: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#5a7374',
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d5e2e2',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  primary: {
    backgroundColor: '#0f3d3e',
    borderRadius: 12,
    padding: 14,
  },
  primaryText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  secondary: {
    backgroundColor: '#eef4f4',
    borderRadius: 12,
    padding: 14,
  },
  secondaryText: { color: '#0f3d3e', fontWeight: '700', textAlign: 'center' },
  result: { fontSize: 13, color: '#355556', lineHeight: 18 },
  linkRow: { paddingVertical: 6 },
  link: { color: '#1d5c5e', fontWeight: '600' },
});
