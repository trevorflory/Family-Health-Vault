import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  buildEmergencyWalletCardHtml,
  generateEmergencyQR,
  printEmergencyWalletCard,
  type EmergencyQRResult,
} from '../../../services/emergencyPass';

export default function EmergencyPassScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const [pass, setPass] = useState<EmergencyQRResult | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const load = useCallback(async () => {
    if (!patientId) return;
    try {
      setBusy(true);
      setError(null);
      setPass(await generateEmergencyQR(patientId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate emergency pass');
      setPass(null);
    } finally {
      setBusy(false);
    }
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onPrintWalletCard() {
    if (!pass) return;
    try {
      setPdfBusy(true);
      const uri = await printEmergencyWalletCard(pass);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Emergency Wallet Card PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Wallet card ready', `PDF saved at:\n${uri}`);
      }
    } catch (err) {
      // Fallback: open system print dialog with HTML when file export fails
      try {
        await Print.printAsync({ html: buildEmergencyWalletCardHtml(pass) });
      } catch {
        Alert.alert(
          'Print failed',
          err instanceof Error ? err.message : 'Unable to create wallet card PDF',
        );
      }
    } finally {
      setPdfBusy(false);
    }
  }

  if (busy) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Generating encrypted emergency pass…</Text>
      </View>
    );
  }

  if (error || !pass) {
    return (
      <View style={styles.centered}>
        <Text style={styles.bannerTitle}>EMERGENCY PASS</Text>
        <Text style={styles.loadingText}>{error ?? 'Unavailable'}</Text>
        <Pressable style={styles.refreshBtn} onPress={load}>
          <Text style={styles.refreshBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const { context } = pass;

  return (
    <ScrollView contentContainerStyle={styles.container} style={styles.screen}>
      <Text style={styles.bannerTitle}>EMERGENCY PASS</Text>
      <Text style={styles.patientName}>
        {context.fullName.toUpperCase()} · {context.ageYears}Y
      </Text>
      <Text style={styles.allergyBanner}>
        ALLERGIES: {context.allergies.join(' · ') || 'NONE LISTED'}
      </Text>

      <View style={styles.qrFrame} accessibilityLabel="Emergency QR code">
        <QRCode
          value={pass.qrValue}
          size={260}
          backgroundColor="#ffffff"
          color="#000000"
          ecl="M"
        />
      </View>

      <Text style={styles.scanHint}>
        ER STAFF: SCAN QR FOR AES-256 ENCRYPTED CONTEXT
      </Text>
      <Text style={styles.expiry}>
        EXPIRES {new Date(pass.expiresAt).toLocaleString()}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CAREGIVER PHONE</Text>
        <Text style={styles.sectionBody}>{context.primaryCaregiverPhone}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACTIVE MEDICATIONS</Text>
        {context.activeMedications.length === 0 ? (
          <Text style={styles.sectionBody}>None listed</Text>
        ) : (
          context.activeMedications.map((m) => (
            <Text key={m} style={styles.sectionBody}>
              • {m}
            </Text>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>EMERGENCY CONTACTS</Text>
        {context.emergencyContacts.map((c) => (
          <Text key={`${c.name}-${c.phone}`} style={styles.sectionBody}>
            • {c.name} ({c.relationship}) {c.phone}
          </Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CRITICAL ALERTS</Text>
        {context.criticalAlerts.map((a) => (
          <Text key={a} style={styles.sectionBody}>
            • {a}
          </Text>
        ))}
      </View>

      <Pressable
        style={[styles.printBtn, pdfBusy && styles.disabled]}
        onPress={onPrintWalletCard}
        disabled={pdfBusy}
      >
        {pdfBusy ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.printBtnText}>Print Emergency Wallet Card PDF</Text>
        )}
      </Pressable>

      <Pressable style={styles.refreshBtn} onPress={load}>
        <Text style={styles.refreshBtnText}>Refresh short-lived QR</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#000000' },
  container: {
    padding: 20,
    paddingBottom: 48,
    gap: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: { color: '#ffffff', fontSize: 16, textAlign: 'center' },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  patientName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  allergyBanner: {
    width: '100%',
    backgroundColor: '#ffffff',
    color: '#000000',
    fontSize: 18,
    fontWeight: '900',
    paddingVertical: 14,
    paddingHorizontal: 12,
    textAlign: 'center',
    overflow: 'hidden',
  },
  qrFrame: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  scanHint: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  expiry: { color: '#f0f0f0', fontSize: 13, fontWeight: '600' },
  section: { width: '100%', gap: 4, marginTop: 4 },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionBody: { color: '#ffffff', fontSize: 16, lineHeight: 22, fontWeight: '600' },
  printBtn: {
    marginTop: 8,
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  printBtnText: { color: '#000000', fontWeight: '900', fontSize: 16 },
  refreshBtn: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  refreshBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  disabled: { opacity: 0.6 },
});
