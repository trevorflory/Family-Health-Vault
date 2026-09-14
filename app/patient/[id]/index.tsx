import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function PatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Patient {id}</Text>
      <Text style={styles.lede}>
        Prepare an 811 triage call, export a visit SBAR, manage proxy access,
        upload records, or request a chart package from a provincial health
        authority.
      </Text>

      <Link href={`/patient/${id}/call811Prep`} asChild>
        <Pressable style={styles.cta}>
          <Text style={styles.ctaText}>Prepare 811 Call</Text>
        </Pressable>
      </Link>

      <Link href={`/patient/${id}/sbarExport`} asChild>
        <Pressable style={styles.secondaryCta}>
          <Text style={styles.secondaryCtaText}>Export Visit SBAR</Text>
        </Pressable>
      </Link>

      <Link href={`/patient/${id}/uploadDoc`} asChild>
        <Pressable style={styles.secondaryCta}>
          <Text style={styles.secondaryCtaText}>Upload Lab / Rx Document</Text>
        </Pressable>
      </Link>

      <Link href={`/patient/${id}/voiceDebrief`} asChild>
        <Pressable style={styles.secondaryCta}>
          <Text style={styles.secondaryCtaText}>Record Visit Debrief</Text>
        </Pressable>
      </Link>

      <Link href={`/patient/${id}/emergencyPass`} asChild>
        <Pressable style={styles.emergencyCta}>
          <Text style={styles.emergencyCtaText}>Emergency Pass / Wallet Card</Text>
        </Pressable>
      </Link>

      <Link href={`/patient/${id}/proxyAccess`} asChild>
        <Pressable style={styles.secondaryCta}>
          <Text style={styles.secondaryCtaText}>Proxy Access & Age-Out</Text>
        </Pressable>
      </Link>

      <Link href={`/patient/${id}/foiWizard`} asChild>
        <Pressable style={styles.secondaryCta}>
          <Text style={styles.secondaryCtaText}>Start FOI / Access Request</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f3d3e' },
  lede: { fontSize: 15, color: '#355556', lineHeight: 21, marginBottom: 8 },
  cta: {
    backgroundColor: '#0f3d3e',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaText: { color: '#f4f7f5', fontWeight: '600', fontSize: 16 },
  secondaryCta: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0f3d3e',
  },
  secondaryCtaText: { color: '#0f3d3e', fontWeight: '600', fontSize: 16 },
  emergencyCta: {
    backgroundColor: '#000000',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  emergencyCtaText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
});
