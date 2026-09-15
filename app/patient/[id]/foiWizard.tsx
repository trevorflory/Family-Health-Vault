import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FOI_JURISDICTION_OPTIONS } from '../../../data/foiJurisdictions';
import {
  HEALTH_AUTHORITIES,
  facilitiesForJurisdiction,
} from '../../../data/healthAuthorities';
import { saveFOIRequest } from '../../../db/foiRequests';
import { generateFOIPDF } from '../../../services/foiGenerator';
import { getLegalMeta } from '../../../services/foiTemplate';
import type {
  AuthorityAttachment,
  CanadianJurisdiction,
  FOIRequestPayload,
  FOIScopeItem,
  HealthAuthorityContact,
} from '../../../types/foiPayload';

const SCOPE_OPTIONS: { id: FOIScopeItem; label: string }[] = [
  { id: 'FULL_CHART', label: 'Full historical chart' },
  { id: 'DICOM_CDS', label: 'DICOM medical imaging CDs' },
  { id: 'LAB_HISTORY', label: 'Lab history / reports' },
  { id: 'SPECIALIST_NOTES', label: 'Specialist consult notes' },
];

const DEMO_PATIENTS: Record<
  string,
  { fullName: string; dateOfBirth: string; encryptedPhn: string }
> = {
  'pt-1001': {
    fullName: 'Avery Chen',
    dateOfBirth: '1968-04-12',
    encryptedPhn: '••••-•••-8841',
  },
  'pt-2044': {
    fullName: 'Jordan Okonkwo',
    dateOfBirth: '1975-11-03',
    encryptedPhn: '••••-•••-2290',
  },
};

type WizardStep = 1 | 2 | 3 | 4;

export default function FOIWizardScreen() {
  const { id: patientId } = useLocalSearchParams<{ id: string }>();
  const patientMeta = DEMO_PATIENTS[patientId ?? ''] ?? {
    fullName: 'Unknown Patient',
    dateOfBirth: '1900-01-01',
    encryptedPhn: '••••-•••-0000',
  };

  const [step, setStep] = useState<WizardStep>(1);
  const [jurisdiction, setJurisdiction] = useState<CanadianJurisdiction>('SK');
  const [facilityId, setFacilityId] = useState<string>('sk-sha');
  const [scope, setScope] = useState<FOIScopeItem[]>([
    'FULL_CHART',
    'DICOM_CDS',
  ]);
  const [attachments, setAttachments] = useState<AuthorityAttachment[]>([]);
  const [hasPoa, setHasPoa] = useState(false);
  const [applicantName, setApplicantName] = useState(patientMeta.fullName);
  const [relationship, setRelationship] = useState('Self');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mailingAddress, setMailingAddress] = useState('');
  const [feeWaiver, setFeeWaiver] = useState(false);
  const [feeWaiverReason, setFeeWaiverReason] = useState('');
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const facilities = useMemo(
    () => facilitiesForJurisdiction(jurisdiction),
    [jurisdiction],
  );

  const selectedFacility: HealthAuthorityContact | undefined = useMemo(() => {
    return (
      facilities.find((f) => f.id === facilityId) ??
      facilities[0] ??
      HEALTH_AUTHORITIES[0]
    );
  }, [facilities, facilityId]);

  const legal = getLegalMeta(jurisdiction);

  function onSelectJurisdiction(code: CanadianJurisdiction) {
    setJurisdiction(code);
    const next = facilitiesForJurisdiction(code);
    setFacilityId(next[0]?.id ?? '');
  }

  function toggleScope(item: FOIScopeItem) {
    setScope((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item],
    );
  }

  async function attachProof() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const kind: AuthorityAttachment['kind'] = hasPoa
      ? 'POA'
      : asset.mimeType?.includes('pdf')
        ? 'OTHER_ID'
        : 'DRIVERS_LICENSE';
    setAttachments((prev) => [
      ...prev,
      {
        uri: asset.uri,
        fileName: asset.name ?? 'identity-document',
        mimeType: asset.mimeType ?? 'application/octet-stream',
        kind,
      },
    ]);
  }

  function buildPayload(): FOIRequestPayload {
    if (!selectedFacility) {
      throw new Error('Select a facility before generating');
    }
    return {
      jurisdiction,
      facility: selectedFacility,
      patient: {
        patientId: patientId ?? 'unknown',
        fullName: patientMeta.fullName,
        dateOfBirth: patientMeta.dateOfBirth,
        encryptedPhn: patientMeta.encryptedPhn,
      },
      scope,
      applicant: {
        fullName: applicantName.trim() || patientMeta.fullName,
        relationship: relationship.trim() || 'Self',
        email: email.trim(),
        phone: phone.trim(),
        mailingAddress: mailingAddress.trim(),
        hasPowerOfAttorney: hasPoa,
      },
      attachments,
      feeWaiver: {
        requested: feeWaiver,
        reason: feeWaiver ? feeWaiverReason.trim() : undefined,
      },
      requestedAt: new Date().toISOString(),
    };
  }

  async function handleGenerate(status: 'DRAFT' | 'DISPATCHED') {
    try {
      setBusy(true);
      setStatusMessage(null);
      const payload = buildPayload();
      const uri = await generateFOIPDF(payload);
      setPdfUri(uri);
      const saved = await saveFOIRequest({
        id: requestId,
        patientId: patientId ?? 'unknown',
        payload,
        pdfUri: uri,
        status,
      });
      setRequestId(saved.id);
      setStatusMessage(
        status === 'DISPATCHED'
          ? `Request ${saved.id} marked DISPATCHED.`
          : `Draft ${saved.id} saved with generated PDF.`,
      );
      return uri;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('FOI generation failed', message);
      setStatusMessage(message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function savePdfToDevice() {
    const uri = pdfUri ?? (await handleGenerate('DRAFT'));
    if (!uri) return;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save FOI PDF',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Saved', `PDF available at:\n${uri}`);
    }
  }

  async function shareViaFaxEmail() {
    const uri = pdfUri ?? (await handleGenerate('DRAFT'));
    if (!uri) return;
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(
        'Sharing unavailable',
        'This environment cannot open the system share sheet. PDF URI is ready for fax/email handoff.',
      );
      return;
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share FOI request via Email / Fax app',
      UTI: 'com.adobe.pdf',
    });
  }

  async function dispatchRequest() {
    const uri = await handleGenerate('DISPATCHED');
    if (!uri) return;
    Alert.alert(
      'Request dispatched',
      'Local status set to DISPATCHED. Attach the PDF to your fax/email submission to the facility records department.',
    );
  }

  function canAdvanceFrom(current: WizardStep): boolean {
    if (current === 1) return Boolean(selectedFacility?.id);
    if (current === 2) return scope.length > 0;
    if (current === 3) return applicantName.trim().length > 0;
    return true;
  }

  async function goNext() {
    if (!canAdvanceFrom(step)) {
      Alert.alert('Incomplete step', 'Please finish the required fields.');
      return;
    }
    if (step === 3) {
      setStep(4);
      await handleGenerate('DRAFT');
      return;
    }
    setStep((s) => Math.min(4, (s + 1) as WizardStep) as WizardStep);
  }

  function goBack() {
    setStep((s) => Math.max(1, (s - 1) as WizardStep) as WizardStep);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.progress}>Step {step} of 4</Text>
      <Text style={styles.heading}>FOI / Access to Information Request</Text>
      <Text style={styles.sub}>
        Patient {patientMeta.fullName} · PHN {patientMeta.encryptedPhn} ·{' '}
        {legal.actShortName}
      </Text>

      {step === 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Jurisdiction & Facility</Text>
          <Text style={styles.label}>
            Province or territory / governing access statute
          </Text>
          <Text style={styles.hint}>
            All 13 Canadian jurisdictions. Selecting a region loads matching
            health-authority address templates and the correct legal declaration.
          </Text>
          <View style={styles.chipRow}>
            {FOI_JURISDICTION_OPTIONS.map((j) => (
              <Pressable
                key={j.code}
                onPress={() => onSelectJurisdiction(j.code)}
                style={[
                  styles.chip,
                  jurisdiction === j.code && styles.chipActive,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: jurisdiction === j.code }}
                accessibilityLabel={`${j.regionName}, ${j.actShortName}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    jurisdiction === j.code && styles.chipTextActive,
                  ]}
                >
                  {j.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.selectedJurisdiction}>
            {FOI_JURISDICTION_OPTIONS.find((j) => j.code === jurisdiction)
              ?.regionName ?? jurisdiction}{' '}
            · {legal.actFullName}
          </Text>

          <Text style={[styles.label, { marginTop: 16 }]}>
            Health authority / facility template
          </Text>
          {facilities.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setFacilityId(f.id)}
              style={[
                styles.facilityRow,
                facilityId === f.id && styles.facilityRowActive,
              ]}
            >
              <Text style={styles.facilityName}>{f.name}</Text>
              <Text style={styles.facilityMeta}>{f.departmentName}</Text>
              <Text style={styles.facilityMeta}>
                {f.addressLines[f.addressLines.length - 1]}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Record Scope</Text>
          {SCOPE_OPTIONS.map((opt) => {
            const checked = scope.includes(opt.id);
            return (
              <Pressable
                key={opt.id}
                onPress={() => toggleScope(opt.id)}
                style={styles.checkRow}
              >
                <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                  {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
                <Text style={styles.checkLabel}>{opt.label}</Text>
              </Pressable>
            );
          })}

          <View style={styles.switchRow}>
            <Text style={styles.checkLabel}>Request fee waiver</Text>
            <Switch value={feeWaiver} onValueChange={setFeeWaiver} />
          </View>
          {feeWaiver ? (
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Fee waiver justification"
              value={feeWaiverReason}
              onChangeText={setFeeWaiverReason}
              multiline
            />
          ) : null}
        </View>
      )}

      {step === 3 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>3. Proof of Authority / Identity</Text>
          <TextInput
            style={styles.input}
            placeholder="Applicant full name"
            value={applicantName}
            onChangeText={setApplicantName}
          />
          <TextInput
            style={styles.input}
            placeholder="Relationship to patient"
            value={relationship}
            onChangeText={setRelationship}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Mailing address"
            value={mailingAddress}
            onChangeText={setMailingAddress}
            multiline
          />
          <View style={styles.switchRow}>
            <Text style={styles.checkLabel}>Power of Attorney on file</Text>
            <Switch value={hasPoa} onValueChange={setHasPoa} />
          </View>
          <Pressable style={styles.secondaryBtn} onPress={attachProof}>
            <Text style={styles.secondaryBtnText}>
              Attach POA or driver&apos;s license scan
            </Text>
          </Pressable>
          {attachments.map((a) => (
            <Text key={`${a.uri}-${a.fileName}`} style={styles.attachLine}>
              {a.kind}: {a.fileName}
            </Text>
          ))}
        </View>
      )}

      {step === 4 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>4. Preview & Actions</Text>
          <Text style={styles.previewLine}>
            Target: {selectedFacility?.name}
          </Text>
          <Text style={styles.previewLine}>Act: {legal.actFullName}</Text>
          <Text style={styles.previewLine}>
            Scope: {scope.join(', ') || 'None'}
          </Text>
          <Text style={styles.previewLine}>
            POA: {hasPoa ? 'Yes' : 'No'} · Attachments: {attachments.length}
          </Text>
          <Text style={styles.previewLine}>
            Fee waiver: {feeWaiver ? 'Requested' : 'Not requested'}
          </Text>
          <Text style={styles.previewLine}>
            PDF: {pdfUri ? 'Generated' : 'Not yet generated'}
          </Text>
          {statusMessage ? (
            <Text style={styles.status}>{statusMessage}</Text>
          ) : null}

          {busy ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color="#0f3d3e" />
          ) : (
            <View style={styles.actionBar}>
              <Pressable style={styles.actionBtn} onPress={savePdfToDevice}>
                <Text style={styles.actionBtnText}>Save PDF to Device</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={shareViaFaxEmail}>
                <Text style={styles.actionBtnText}>Share via Fax/Email</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.dispatchBtn]}
                onPress={dispatchRequest}
              >
                <Text style={styles.actionBtnText}>Dispatch Request</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      <View style={styles.navRow}>
        {step > 1 ? (
          <Pressable style={styles.navBtn} onPress={goBack} disabled={busy}>
            <Text style={styles.navBtnText}>Back</Text>
          </Pressable>
        ) : (
          <View />
        )}
        {step < 4 ? (
          <Pressable
            style={[styles.navBtn, styles.navBtnPrimary]}
            onPress={goNext}
            disabled={busy}
          >
            <Text style={[styles.navBtnText, styles.navBtnTextPrimary]}>
              {step === 3 ? 'Generate Preview' : 'Next'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, gap: 12 },
  progress: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5a7374',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f3d3e' },
  sub: { fontSize: 14, color: '#355556', marginBottom: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d5e2e2',
    gap: 10,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#143536' },
  label: { fontSize: 13, fontWeight: '600', color: '#5a7374' },
  hint: { fontSize: 12, color: '#5a7374', lineHeight: 17 },
  selectedJurisdiction: {
    fontSize: 12,
    color: '#355556',
    lineHeight: 17,
    marginTop: 4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#9bb5b6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f4f7f5',
  },
  chipActive: { backgroundColor: '#0f3d3e', borderColor: '#0f3d3e' },
  chipText: { color: '#143536', fontSize: 13 },
  chipTextActive: { color: '#f4f7f5', fontWeight: '600' },
  facilityRow: {
    borderWidth: 1,
    borderColor: '#d5e2e2',
    borderRadius: 8,
    padding: 12,
  },
  facilityRowActive: {
    borderColor: '#0f3d3e',
    backgroundColor: '#e7f1f1',
  },
  facilityName: { fontWeight: '600', color: '#143536' },
  facilityMeta: { color: '#5a7374', fontSize: 12, marginTop: 2 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#0f3d3e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#0f3d3e' },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkLabel: { flex: 1, color: '#143536', fontSize: 15 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#c5d6d6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fbfcfc',
    color: '#143536',
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#0f3d3e',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#0f3d3e', fontWeight: '600' },
  attachLine: { fontSize: 12, color: '#5a7374' },
  previewLine: { color: '#355556', fontSize: 14, lineHeight: 20 },
  status: { marginTop: 8, color: '#0f3d3e', fontWeight: '600' },
  actionBar: { gap: 10, marginTop: 8 },
  actionBtn: {
    backgroundColor: '#1d5c5e',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dispatchBtn: { backgroundColor: '#0f3d3e' },
  actionBtnText: { color: '#f4f7f5', fontWeight: '600' },
  navRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0f3d3e',
  },
  navBtnPrimary: { backgroundColor: '#0f3d3e' },
  navBtnText: { color: '#0f3d3e', fontWeight: '600' },
  navBtnTextPrimary: { color: '#f4f7f5' },
});
