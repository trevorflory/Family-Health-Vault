import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const DEMO_PATIENTS = [
  { id: 'pt-7801', name: 'Robert Ellis', dob: '1948-02-19' },
  { id: 'pt-leo-04', name: 'Leo Ellis', dob: '2022-03-08' },
  { id: 'pt-self-01', name: 'Alex Ellis', dob: '1984-09-14' },
  { id: 'pt-1001', name: 'Avery Chen', dob: '1968-04-12' },
  { id: 'pt-2044', name: 'Jordan Okonkwo', dob: '1975-11-03' },
  { id: 'pt-child-09', name: 'Mia Ellis', dob: '2017-06-01' },
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Healthcare App</Text>
      <Text style={styles.lede}>
        Sandwich-generation digests, visit SBAR exports, proxy access, Canadian
        FOI requests, and caregiver 811 call prep — summaries only, never diagnoses.
      </Text>

      <Text style={styles.section}>Developer sandbox</Text>
      <Link href="/sandbox" asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>QA core-loop sandbox</Text>
          <Text style={styles.rowMeta}>
            Seed Dad/Child · digest · SBAR · SK HIPA FOI · 811 script
          </Text>
        </Pressable>
      </Link>
      <Link href="/sandbox/aiTest" asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>Local LLM bridge test</Text>
          <Text style={styles.rowMeta}>
            Ollama · SaMD summarizer · mock Dad health records
          </Text>
        </Pressable>
      </Link>

      <Text style={styles.section}>Caregiver digests</Text>
      <Link href="/digest/daily" asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>Daily Morning Digest</Text>
          <Text style={styles.rowMeta}>
            Meds · 72h visits · overdue FOI/labs · 7:00 AM alert
          </Text>
        </Pressable>
      </Link>
      <Link href="/digest/weekly" asChild>
        <Pressable style={styles.row}>
          <Text style={styles.rowTitle}>Weekly Sunday Overview</Text>
          <Text style={styles.rowMeta}>
            Vitals · adherence · next week · Sunday 4:00 PM alert
          </Text>
        </Pressable>
      </Link>

      <Text style={styles.section}>Patients</Text>
      {DEMO_PATIENTS.map((p) => (
        <Link
          key={p.id}
          href={`/patient/${p.id}`}
          asChild
        >
          <Pressable style={styles.row}>
            <Text style={styles.rowTitle}>{p.name}</Text>
            <Text style={styles.rowMeta}>DOB {p.dob} · {p.id}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  brand: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f3d3e',
    letterSpacing: -0.5,
  },
  lede: {
    fontSize: 16,
    color: '#355556',
    marginBottom: 12,
    lineHeight: 22,
  },
  section: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#5a7374',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#143536',
  },
  rowMeta: {
    marginTop: 4,
    color: '#5a7374',
    fontSize: 13,
  },
});
