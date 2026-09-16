import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getDelegateGrant,
  isDelegateGrantUsable,
} from '../../services/delegateAccess';
import type { DelegateGrant } from '../../types/careObservation';

/**
 * Token gate for aide / care-home delegates.
 * No FOI, POA, chart, or SBAR chrome — handover only.
 */
export default function DelegateTokenGateScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [grant, setGrant] = useState<DelegateGrant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    try {
      setBusy(true);
      setError(null);
      if (!token) {
        setError('Missing delegate token');
        setGrant(null);
        return;
      }
      const row = await getDelegateGrant(token);
      if (!row || !isDelegateGrantUsable(row)) {
        setError('This aide link is inactive or expired');
        setGrant(null);
        return;
      }
      setGrant(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open link');
      setGrant(null);
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (busy) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#0f3d3e" />
        <Text style={styles.meta}>Checking aide access…</Text>
      </View>
    );
  }

  if (error || !grant) {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Aide access</Text>
        <Text style={styles.meta}>{error ?? 'Access denied'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>Scoped aide access</Text>
      <Text style={styles.heading}>Hello, {grant.recipientName}</Text>
      <Text style={styles.lede}>
        You can log a 30-second shift handover (meds, intake, mood). You cannot
        open FOI files, legal POA documents, or the full medical chart.
      </Text>
      <Text style={styles.meta}>
        Scopes: {grant.grantedScopes.join(', ')}
      </Text>
      <Text style={styles.meta}>
        Expires: {new Date(grant.expiresAtISO).toLocaleString()}
      </Text>

      <Link
        href={{ pathname: '/delegate/log', params: { token: grant.tokenId } }}
        asChild
      >
        <Pressable style={styles.cta}>
          <Text style={styles.ctaText}>Open Shift Handover Log</Text>
        </Pressable>
      </Link>

      <Pressable style={styles.secondary} onPress={() => router.back()}>
        <Text style={styles.secondaryText}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: '#f4f7f5' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#5a6b66',
  },
  heading: { fontSize: 28, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 16, lineHeight: 24, color: '#1b2b28' },
  meta: { fontSize: 14, color: '#5a6b66' },
  cta: {
    marginTop: 12,
    backgroundColor: '#0f3d3e',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  ctaText: {
    color: '#f4f7f5',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondary: { paddingVertical: 12 },
  secondaryText: { color: '#0f3d3e', textAlign: 'center', fontSize: 16 },
});
