import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DEMO_CAREGIVER_ID } from '../../../data/caregiverHousehold';
import {
  DEMO_PRIMARY_NAME,
  DEMO_SIBLING_ID,
  DEMO_SIBLING_NAME,
} from '../../../data/proxyGrants';
import { getPatientVaultProfile } from '../../../data/patientVault';
import {
  checkPermission,
  evaluateAgeOut,
  executeAgeOutHandOff,
  grantProxyAccess,
  listAccessLog,
  listProxyGrants,
  resetProxyAccessStore,
  revokeProxyGrant,
  roleLabel,
} from '../../../services/proxyAccessEngine';
import type {
  AccessLogEntry,
  AgeOutEvaluation,
  ProxyGrant,
} from '../../../types/proxyAccess';

export default function ProxyAccessScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const profile = getPatientVaultProfile(patientId ?? '');

  const [grants, setGrants] = useState<ProxyGrant[]>([]);
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [ageOut, setAgeOut] = useState<AgeOutEvaluation | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    if (!patientId) return;
    try {
      setBusy(true);
      const [g, l] = await Promise.all([
        listProxyGrants(patientId),
        listAccessLog(patientId),
      ]);
      setGrants(g);
      setLogs(l.slice(0, 12));
      setAgeOut(evaluateAgeOut(patientId));
    } finally {
      setBusy(false);
    }
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!profile || !patientId) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Proxy Access</Text>
        <Text style={styles.lede}>No vault profile for patient {patientId}.</Text>
      </View>
    );
  }

  async function onCheck(
    permission: 'EXPORT_SBAR' | 'MANAGE_PROXIES' | 'READ_VAULT',
  ) {
    const result = await checkPermission(
      DEMO_CAREGIVER_ID,
      patientId!,
      permission,
    );
    Alert.alert(
      result.permitted ? 'Permitted' : 'Denied',
      `${DEMO_PRIMARY_NAME} → ${permission}\n${result.log.detail ?? ''}`,
    );
    await load();
  }

  async function onInviteSibling() {
    try {
      await grantProxyAccess({
        patientId: patientId!,
        granteeId: DEMO_SIBLING_ID,
        granteeDisplayName: DEMO_SIBLING_NAME,
        role: 'SIBLING_COORDINATOR',
        createdBy: DEMO_CAREGIVER_ID,
        notes: 'Invited from proxy access screen',
      });
      Alert.alert(
        'Sibling invited',
        `${DEMO_SIBLING_NAME} granted Sibling Care Coordinator.`,
      );
      await load();
    } catch (err) {
      Alert.alert(
        'Invite failed',
        err instanceof Error ? err.message : 'Unknown error',
      );
    }
  }

  async function onRevoke(grant: ProxyGrant) {
    await revokeProxyGrant(grant.grantId, DEMO_CAREGIVER_ID);
    Alert.alert(
      'Grant revoked',
      `${grant.granteeDisplayName} (${roleLabel(grant.role)})`,
    );
    await load();
  }

  async function onAgeOut(force: boolean) {
    try {
      const result = await executeAgeOutHandOff(
        patientId!,
        DEMO_CAREGIVER_ID,
        undefined,
        new Date(),
        { force },
      );
      Alert.alert(
        'Age-out hand-off complete',
        `${result.handOffNote}\nRevoked: ${result.revokedGrantIds.length} grant(s).`,
      );
      await load();
    } catch (err) {
      Alert.alert(
        'Age-out blocked',
        err instanceof Error ? err.message : 'Unknown error',
      );
    }
  }

  async function onReset() {
    await resetProxyAccessStore();
    await load();
    Alert.alert(
      'Demo grants reset',
      'Seeded Primary POA, Sibling, and Emergency Pass grants (persisted).',
    );
  }

  if (busy && grants.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f3d3e" />
        <Text style={styles.meta}>Loading proxy grants…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>Multi-generational proxy access</Text>
      <Text style={styles.heading}>Proxy & permissions</Text>
      <Text style={styles.lede}>
        {profile.fullName} · {profile.ageYears}y · {profile.relationshipLabel}
      </Text>
      <Text style={styles.notice}>
        Tiered roles with a persisted, append-only access log. Emergency QR
        passes remain short-lived; age-out hand-off marks parental POA AGED_OUT
        when consent age is reached (demo default 16).
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active grants</Text>
        {grants.length === 0 ? (
          <Text style={styles.meta}>No grants on file.</Text>
        ) : (
          grants.map((g) => (
            <View key={g.grantId} style={styles.grantRow}>
              <Text style={styles.grantTitle}>
                {g.granteeDisplayName} · {roleLabel(g.role)}
              </Text>
              <Text style={styles.meta}>
                {g.status}
                {g.expiresAt
                  ? ` · expires ${new Date(g.expiresAt).toLocaleString('en-CA')}`
                  : ' · no expiry'}
              </Text>
              <Text style={styles.meta}>{g.permissions.join(', ')}</Text>
              {g.status === 'ACTIVE' && g.role !== 'PRIMARY_POA' ? (
                <Pressable style={styles.smallBtn} onPress={() => onRevoke(g)}>
                  <Text style={styles.smallBtnText}>Revoke</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick actions</Text>
        <Pressable style={styles.secondaryBtn} onPress={onInviteSibling}>
          <Text style={styles.secondaryBtnText}>Invite Sibling Coordinator</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => onCheck('EXPORT_SBAR')}
        >
          <Text style={styles.secondaryBtnText}>Check: Export SBAR</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => onCheck('MANAGE_PROXIES')}
        >
          <Text style={styles.secondaryBtnText}>Check: Manage Proxies</Text>
        </Pressable>
        <Link href={`/patient/${patientId}/emergencyPass`} asChild>
          <Pressable style={styles.emergencyBtn}>
            <Text style={styles.emergencyBtnText}>Open Emergency QR Pass</Text>
          </Pressable>
        </Link>
      </View>

      {ageOut ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Age-out hand-off</Text>
          <Text style={styles.body}>{ageOut.message}</Text>
          {ageOut.due ? (
            <Pressable style={styles.primaryBtn} onPress={() => onAgeOut(false)}>
              <Text style={styles.primaryBtnText}>Execute age-out hand-off</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.secondaryBtn} onPress={() => onAgeOut(true)}>
              <Text style={styles.secondaryBtnText}>
                Demo: force consent-age hand-off
              </Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Immutable access log</Text>
        {logs.length === 0 ? (
          <Text style={styles.meta}>No entries yet — run a permission check.</Text>
        ) : (
          logs.map((entry: AccessLogEntry) => (
            <Text key={entry.logId} style={styles.logLine}>
              {new Date(entry.at).toLocaleTimeString('en-CA')} ·{' '}
              {entry.actorDisplayName} · {entry.action} ·{' '}
              {entry.permitted ? 'OK' : 'DENIED'}
            </Text>
          ))
        )}
      </View>

      <Pressable style={styles.linkBtn} onPress={onReset}>
        <Text style={styles.linkBtnText}>Reset demo grants</Text>
      </Pressable>
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
    letterSpacing: 0.6,
  },
  heading: { fontSize: 24, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21 },
  notice: {
    fontSize: 13,
    color: '#6b4f1d',
    backgroundColor: '#f7f0dd',
    borderRadius: 8,
    padding: 12,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#143536' },
  body: { fontSize: 14, color: '#355556', lineHeight: 20 },
  meta: { fontSize: 12, color: '#5a7374', lineHeight: 18 },
  grantRow: {
    borderTopWidth: 1,
    borderTopColor: '#e7f1f1',
    paddingTop: 8,
    gap: 2,
  },
  grantTitle: { fontSize: 14, fontWeight: '600', color: '#143536' },
  primaryBtn: {
    backgroundColor: '#1d5c5e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#f4f7f5', fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#0f3d3e', fontWeight: '600' },
  emergencyBtn: {
    backgroundColor: '#000',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emergencyBtnText: { color: '#fff', fontWeight: '800' },
  smallBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#8a2b1e',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  logLine: { fontSize: 12, color: '#355556', lineHeight: 18 },
  linkBtn: { paddingVertical: 8, alignItems: 'center' },
  linkBtnText: { color: '#1d5c5e', fontWeight: '600' },
});
