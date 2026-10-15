import { useState } from 'react';
import { Alert, Button, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import AuthScreen from '../auth/AuthScreen';
import { useAuth } from '../auth/session';
export default function Login() {
  const {login, register} = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  async function submit(action: () => Promise<void>) {
    setError(null);
    try { await action(); } catch (err) {
      const text = err instanceof Error ? err.message : 'Unable to authenticate';
      setError(text);
      if (Platform.OS === 'web') setShowError(true);
      else Alert.alert('Unable to sign in', text);
    }
  }
  return <><AuthScreen mode={mode} onModeChange={next => {setMode(next); setError(null);}}
    onLogin={(username, password) => submit(() => {
      if (!username.trim() || !password) throw new Error('Please enter username and password.');
      return login(username, password);
    })}
    onSignup={(username, password, confirm, email) => submit(() => register(username, password, confirm, email))}
    errorMessage={error} />
    <Modal visible={showError} transparent animationType="fade" onRequestClose={() => setShowError(false)}>
      <View style={styles.overlay}><View accessibilityViewIsModal style={styles.card}>
        <Text style={styles.title}>Unable to authenticate</Text>
        <Text accessibilityRole="alert">{error}</Text>
        <Button title="OK" onPress={() => setShowError(false)} />
      </View></View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(17, 40, 32, 0.45)', justifyContent: 'center', alignItems: 'center', padding: 24},
  card: {width: '100%', maxWidth: 420, padding: 24, borderRadius: 18, backgroundColor: '#FFFFFF', gap: 18},
  title: {fontSize: 20, fontWeight: '700', color: '#173B34'},
});
