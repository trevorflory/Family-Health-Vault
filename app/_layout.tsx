import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useDigestNotificationRouting } from '../hooks/useDigestNotificationRouting';

/** iPhone 14 / 15 logical size — used for desktop web critique. */
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;

function WebPhoneFrame({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.backdrop} accessibilityLabel="Phone-sized review frame">
      <Text style={styles.hint}>Review frame · {PHONE_WIDTH}×{PHONE_HEIGHT}</Text>
      <View style={styles.phoneChrome}>
        <View style={styles.phoneNotch} />
        <View style={styles.phoneScreen}>{children}</View>
      </View>
    </View>
  );
}

export default function RootLayout() {
  useDigestNotificationRouting();

  return (
    <WebPhoneFrame>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f3d3e' },
          headerTintColor: '#f4f7f5',
          headerTitleStyle: { fontWeight: '700', fontSize: 20 },
          contentStyle: { backgroundColor: '#f4f7f5' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Family Health Vault' }} />
        <Stack.Screen name="family/index" options={{ title: 'My Family' }} />
        <Stack.Screen
          name="patient/[id]/index"
          options={{ title: 'Care hub' }}
        />
        <Stack.Screen
          name="patient/[id]/appointments"
          options={{ title: 'Medical Appointments' }}
        />
        <Stack.Screen
          name="patient/[id]/appointmentPrep"
          options={{ title: 'Appointment Prep' }}
        />
        <Stack.Screen
          name="patient/[id]/prescriptions"
          options={{ title: 'Prescriptions' }}
        />
        <Stack.Screen
          name="patient/[id]/vitals"
          options={{ title: 'Vitals (local)' }}
        />
        <Stack.Screen
          name="patient/[id]/events"
          options={{ title: 'MedicalEvents inbox' }}
        />
        <Stack.Screen
          name="patient/[id]/profile"
          options={{ title: 'Profile (local)' }}
        />
        <Stack.Screen
          name="patient/[id]/foiWizard"
          options={{ title: 'FOI Record Request' }}
        />
        <Stack.Screen
          name="patient/[id]/foiStatus"
          options={{ title: 'FOI Status' }}
        />
        <Stack.Screen
          name="patient/[id]/call811Prep"
          options={{ title: 'Symptom Checker' }}
        />
        <Stack.Screen
          name="patient/[id]/sbarExport"
          options={{ title: 'Export Visit SBAR' }}
        />
        <Stack.Screen
          name="patient/[id]/insights"
          options={{ title: 'Visit Prep Insights' }}
        />
        <Stack.Screen
          name="patient/[id]/portalSync"
          options={{ title: 'Authority Sync' }}
        />
        <Stack.Screen
          name="patient/[id]/askVault"
          options={{ title: 'Ask My Vault' }}
        />
        <Stack.Screen
          name="patient/[id]/uploadDoc"
          options={{ title: 'Upload Document' }}
        />
        <Stack.Screen
          name="patient/[id]/voiceDebrief"
          options={{ title: 'Visit Debrief' }}
        />
        <Stack.Screen
          name="patient/[id]/emergencyPass"
          options={{
            title: 'Emergency Pass',
            headerStyle: { backgroundColor: '#000000' },
            headerTintColor: '#ffffff',
          }}
        />
        <Stack.Screen
          name="patient/[id]/proxyAccess"
          options={{ title: 'Proxy Access' }}
        />
        <Stack.Screen
          name="digest/daily"
          options={{ title: 'Daily Morning Status' }}
        />
        <Stack.Screen
          name="digest/weekly"
          options={{ title: 'Weekly Overview' }}
        />
        <Stack.Screen
          name="delegate/[token]"
          options={{ title: 'Aide Access' }}
        />
        <Stack.Screen
          name="delegate/log"
          options={{ title: 'Shift Handover Log' }}
        />
        <Stack.Screen
          name="sandbox/index"
          options={{ title: 'QA Sandbox' }}
        />
        <Stack.Screen
          name="sandbox/ehrSimulator"
          options={{ title: 'EHR Ingest Simulator' }}
        />
        <Stack.Screen
          name="sandbox/aiTest"
          options={{ title: 'Local LLM Sandbox' }}
        />
        <Stack.Screen
          name="family-feed/index"
          options={{ title: 'Family feed' }}
        />
        <Stack.Screen
          name="family-feed/[residentId]"
          options={{ title: 'Family feed' }}
        />
        <Stack.Screen
          name="family-feed/upgrade"
          options={{ title: 'WALLET_PRO' }}
        />
      </Stack>
    </WebPhoneFrame>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a2e2f',
    paddingVertical: 24,
    ...(Platform.OS === 'web'
      ? ({ minHeight: '100vh' } as object)
      : null),
  },
  hint: {
    color: '#9bb3b3',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  phoneChrome: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    borderRadius: 36,
    backgroundColor: '#0a1616',
    padding: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2c4546',
  },
  phoneNotch: {
    alignSelf: 'center',
    width: 120,
    height: 28,
    borderRadius: 16,
    backgroundColor: '#0a1616',
    marginBottom: 4,
    zIndex: 2,
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#f4f7f5',
  },
});
