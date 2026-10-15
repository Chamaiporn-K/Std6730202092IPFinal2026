import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/session';
import { apiCall } from '../lib/api';

type Employee = {id: string; employee_code: string; name: string; position: string; status: 'Active' | 'On Leave'; salary: number};
type Cluster = {group: string; centroid: number | null; count: number};
const emptyForm = {first_name: '', last_name: '', position: '', salary: ''};
const money = (value: number) => value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to connect. Please try again.';

function Action({title, onPress, disabled = false, secondary = false, danger = false}: {
  title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; danger?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.secondaryButton, danger && styles.dangerButton, disabled && styles.disabled]}>
    <Text style={[styles.buttonText, secondary && styles.secondaryText, danger && styles.dangerText]}>{title}</Text>
  </Pressable>;
}

export default function Home() {
  const {user, logout} = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const working = loading || !!busy || analyzing;

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCall('/employees');
      if (!Array.isArray(data)) throw new Error('Invalid employee response from server.');
      setEmployees(data);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { loadEmployees().catch(err => setError(message(err))); }, [loadEmployees]);
  function invalidateAnalysis() { setClusters(null); setAnalysisError(''); }

  async function refresh() {
    setError(''); setNotice(''); invalidateAnalysis();
    try { await loadEmployees(); } catch (err) { setError(message(err)); }
  }
  async function mutate(label: string, path: string, method: string, body?: object) {
    if (working) return;
    setBusy(label); setError(''); setNotice('');
    let saved = false;
    try {
      const result = await apiCall(path, {method, ...(body ? {body: JSON.stringify(body)} : {})});
      saved = true; invalidateAnalysis();
      if (label === 'add') { setForm(emptyForm); setNotice(`Employee added: ${result.employee_code}`); }
      else setNotice(label.startsWith('delete') ? 'Employee deleted.' : 'Status updated.');
      await loadEmployees();
    } catch (err) {
      setError(saved ? `Saved, but the list could not refresh. Press Refresh. ${message(err)}` : message(err));
    } finally { setBusy(null); }
  }
  function addEmployee() {
    const first = form.first_name.trim(), last = form.last_name.trim(), position = form.position.trim(), salary = form.salary.trim();
    setError(''); setNotice('');
    if (!first || !last || !position || !salary) { setError('Please complete every field.'); return; }
    const namePattern = /^[A-Za-z][A-Za-z '\-]*$/;
    if (!namePattern.test(first) || !namePattern.test(last)) {
      setError('Enter names in English. Spaces, apostrophes and hyphens are allowed.'); return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(salary) || Number(salary) > 9999999999.99) {
      setError('Salary must be between 0 and 9,999,999,999.99 with at most 2 decimal places.'); return;
    }
    void mutate('add', '/employees', 'POST', {first_name: first, last_name: last, position, salary});
  }
  function confirmDelete(employee: Employee) {
    if (working) return;
    if (Platform.OS === 'web') { setDeleteTarget(employee); return; }
    Alert.alert('Are you sure?', `Delete ${employee.name} (${employee.employee_code})?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => { void mutate(`delete-${employee.id}`, `/employees/${employee.id}`, 'DELETE'); }},
    ]);
  }
  async function analyze() {
    if (working) return;
    setAnalyzing(true); setAnalysisError(''); setClusters(null);
    try {
      const data = await apiCall('/employees/salary-clusters');
      if (!data?.success || !Array.isArray(data.clusters)) throw new Error('Invalid analysis response from server.');
      setClusters(data.clusters);
    } catch (err) { setAnalysisError(message(err)); }
    finally { setAnalyzing(false); }
  }
  async function signOut() {
    setBusy('logout');
    try { await logout(); } catch { /* Session provider also clears the local session offline. */ }
    finally { setBusy(null); }
  }
  if (!user) return null;
  const activeCount = employees.filter(employee => employee.status === 'Active').length;
  return <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList data={employees} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.sectionGap}>
          <View style={styles.row}>
            <View style={styles.grow}><Text style={styles.eyebrow}>PEOPLE & PAYROLL</Text><Text style={styles.title}>HR Manager</Text>
              <Text style={styles.muted}>Welcome, {user.username} · {user.role}</Text></View>
            <Action title={busy === 'logout' ? 'Signing out...' : 'Sign out'} onPress={() => { void signOut(); }} secondary disabled={working} />
          </View>
          <View style={styles.row}>
            {[{label: 'Employees', value: employees.length}, {label: 'Active', value: activeCount}, {label: 'On leave', value: employees.length - activeCount}].map(stat =>
              <View key={stat.label} style={styles.stat}><Text style={styles.statValue}>{loading ? '—' : stat.value}</Text><Text style={styles.muted}>{stat.label}</Text></View>)}
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Add employee</Text>
            <Text style={styles.muted}>Code is generated from the first 3 letters of each name and a unique number.</Text>
            <View style={styles.row}>
              {([{key: 'first_name', label: 'First name (English)', hint: 'Nina', max: 100}, {key: 'last_name', label: 'Last name (English)', hint: 'Somchai', max: 100},
                {key: 'position', label: 'Position', hint: 'Software Engineer', max: 150}, {key: 'salary', label: 'Monthly salary (THB)', hint: '45000', max: 13}] as const).map(field =>
                <View key={field.key} style={styles.field}>
                  <Text style={styles.label}>{field.label}</Text>
                  <TextInput accessibilityLabel={field.label} placeholder={field.hint} value={form[field.key]} maxLength={field.max}
                    autoCorrect={false} editable={!working} keyboardType={field.key === 'salary' ? 'decimal-pad' : 'default'}
                    onChangeText={value => setForm(current => ({...current, [field.key]: value}))} style={styles.input} />
                </View>)}
            </View>
            <Action title={busy === 'add' ? 'Saving...' : 'Add employee'} onPress={addEmployee} disabled={working} />
          </View>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Salary structure</Text>
            <Text style={styles.muted}>Group current salaries into 3 tiers, from lowest to highest, using K-Means.</Text>
            <Action title={analyzing ? 'Analyzing...' : 'Analyze Salary Structure'} onPress={() => { void analyze(); }} disabled={working} />
            {analyzing ? <ActivityIndicator color="#176B5B" accessibilityLabel="Analyzing salary structure" /> : null}
            {analysisError ? <Text accessibilityRole="alert" style={styles.error}>{analysisError}</Text> : null}
            {clusters ? <View style={styles.row}>{clusters.map(cluster =>
              <View key={cluster.group} style={styles.tier}>
                <Text style={styles.code}>{cluster.group}</Text><Text style={styles.statValue}>{cluster.count}</Text><Text style={styles.muted}>employees</Text>
                <Text style={styles.salary}>{cluster.centroid === null ? '—' : `${money(cluster.centroid)} THB`}</Text><Text style={styles.muted}>Average salary</Text>
              </View>)}</View> : null}
            {clusters?.some(cluster => !cluster.count) ? <Text style={styles.muted}>Empty tiers have no average. Fewer than 3 distinct salaries may leave tiers empty.</Text> : null}
          </View>
          <View style={styles.row}><Text style={styles.sectionTitle}>Employee directory</Text>
            <Action title={loading ? 'Loading...' : 'Refresh'} onPress={() => { void refresh(); }} disabled={working} secondary /></View>
          {loading ? <ActivityIndicator color="#176B5B" accessibilityLabel="Loading employees" /> : null}
        </View>}
        ListEmptyComponent={!loading ? <View style={styles.card}><Text style={styles.muted}>{error ? 'Could not load employees. Press Refresh to retry.' : 'No employees yet. Add your first employee above.'}</Text></View> : null}
        renderItem={({item}) => <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.grow}><Text style={styles.code}>{item.employee_code}</Text><Text style={styles.employeeName}>{item.name}</Text><Text style={styles.muted}>{item.position}</Text></View>
            <View style={[styles.badge, item.status === 'On Leave' && styles.leaveBadge]}><Text style={styles.badgeText}>{item.status}</Text></View>
          </View>
          <Text style={styles.salary}>{money(item.salary)} THB <Text style={styles.muted}>/ month</Text></Text>
          <View style={styles.row}>
            <Action title={busy === `toggle-${item.id}` ? 'Updating...' : 'Toggle Status'} disabled={working} secondary
              onPress={() => { void mutate(`toggle-${item.id}`, `/employees/${item.id}/status`, 'PUT'); }} />
            <Action title={busy === `delete-${item.id}` ? 'Deleting...' : 'Delete'} disabled={working} danger onPress={() => confirmDelete(item)} />
          </View>
        </View>} />
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={styles.modalBackdrop}><View accessibilityViewIsModal style={styles.modalCard}>
          <Text style={styles.sectionTitle}>Are you sure?</Text><Text style={styles.muted}>Delete {deleteTarget?.name} ({deleteTarget?.employee_code})?</Text>
          <View style={styles.row}><Action title="Cancel" secondary onPress={() => setDeleteTarget(null)} />
            <Action title="Delete" danger disabled={working} onPress={() => {
              const employee = deleteTarget; setDeleteTarget(null);
              if (employee) void mutate(`delete-${employee.id}`, `/employees/${employee.id}`, 'DELETE');
            }} /></View>
        </View></View>
      </Modal>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#F3F6F5'},
  content: {width: '100%', maxWidth: 1050, alignSelf: 'center', padding: 20, paddingBottom: 48, gap: 14},
  sectionGap: {gap: 22, marginBottom: 4},
  row: {flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap'},
  grow: {flex: 1, minWidth: 170, gap: 4},
  eyebrow: {fontSize: 11, letterSpacing: 2, color: '#176B5B', fontWeight: '700'},
  title: {fontSize: 32, fontWeight: '800', color: '#173B34'},
  muted: {fontSize: 13, lineHeight: 20, color: '#61766F'},
  stat: {flex: 1, minWidth: 85, backgroundColor: '#E6EFEB', padding: 16, borderRadius: 14, gap: 5},
  statValue: {fontSize: 26, fontWeight: '700', color: '#173B34'},
  card: {backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE7E1', borderRadius: 18, padding: 20, gap: 14},
  sectionTitle: {fontSize: 20, fontWeight: '700', color: '#173B34'},
  field: {flex: 1, minWidth: 210, gap: 6},
  label: {fontSize: 13, color: '#334E45', fontWeight: '600'},
  input: {borderWidth: 1, borderColor: '#CBDCD3', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#173B34', backgroundColor: '#FAFCFB'},
  button: {backgroundColor: '#176B5B', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44},
  buttonText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
  secondaryButton: {backgroundColor: '#EAF2EE'}, secondaryText: {color: '#176B5B'},
  dangerButton: {backgroundColor: '#FCEDEA'}, dangerText: {color: '#A4342C'}, disabled: {opacity: 0.5},
  error: {color: '#A4342C', fontSize: 14, lineHeight: 21, padding: 12, backgroundColor: '#FCEDEA', borderRadius: 10},
  notice: {color: '#176B5B', fontSize: 14, padding: 12, backgroundColor: '#E2F1E9', borderRadius: 10},
  tier: {flex: 1, minWidth: 190, padding: 16, backgroundColor: '#F3F7F5', borderRadius: 12, gap: 6},
  code: {fontSize: 12, fontWeight: '700', color: '#176B5B', letterSpacing: 0.5},
  employeeName: {fontSize: 20, color: '#173B34', fontWeight: '700'},
  badge: {backgroundColor: '#E2F1E9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6},
  badgeText: {color: '#334E45', fontWeight: '600', fontSize: 12}, leaveBadge: {backgroundColor: '#FFF2D9'},
  salary: {fontSize: 16, fontWeight: '700', color: '#173B34'},
  modalBackdrop: {flex: 1, backgroundColor: 'rgba(17, 40, 32, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 24},
  modalCard: {width: '100%', maxWidth: 420, padding: 24, borderRadius: 18, backgroundColor: '#FFFFFF', gap: 18},
});
