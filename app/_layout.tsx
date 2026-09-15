import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f3d3e' },
          headerTintColor: '#f4f7f5',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#f4f7f5' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Healthcare App' }} />
        <Stack.Screen
          name="patient/[id]/index"
          options={{ title: 'Patient' }}
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
          options={{ title: '811 Call Prep' }}
        />
        <Stack.Screen
          name="patient/[id]/sbarExport"
          options={{ title: 'Export Visit SBAR' }}
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
          options={{ title: 'Daily Morning Digest' }}
        />
        <Stack.Screen
          name="digest/weekly"
          options={{ title: 'Weekly Sunday Overview' }}
        />
        <Stack.Screen
          name="sandbox/index"
          options={{ title: 'QA Sandbox' }}
        />
        <Stack.Screen
          name="sandbox/aiTest"
          options={{ title: 'Local LLM Sandbox' }}
        />
      </Stack>
    </>
  );
}
