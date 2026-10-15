import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
type AuthMode = 'login' | 'signup';

export default function AuthScreen({
  mode,
  onModeChange,
  onLogin,
  onSignup,
  errorMessage,
}: {
  mode: AuthMode;
  onModeChange: (next: AuthMode) => void;
  onLogin: (username: string, password: string) => Promise<void>;
  onSignup: (username: string, password: string, confirmPassword: string, email: string) => Promise<void>;
  errorMessage: string | null;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await onLogin(username.trim(), password);
      } else {
        await onSignup(username.trim(), password, confirmPassword, email.trim());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.authCard}>
        <Text style={styles.authTitle}>{mode === 'login' ? 'Welcome back' : 'Create account'}</Text>
        <Text style={styles.authSubtitle}>
          {mode === 'login' ? 'Sign in with your username and password.' : 'Create a new username and secure password.'}
        </Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Username"
          accessibilityLabel="Username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.authInput}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          accessibilityLabel="Password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          secureTextEntry
          style={styles.authInput}
        />

        {mode === 'signup' ? (
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            accessibilityLabel="Email"
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.authInput}
          />
        ) : null}

        {mode === 'signup' ? (
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            accessibilityLabel="Confirm password"
            autoComplete="new-password"
            secureTextEntry
            style={styles.authInput}
          />
        ) : null}

        <Pressable accessibilityRole="button" style={[styles.authButton, isSubmitting && styles.authButtonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>
          <Text style={styles.authButtonText}>{isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Sign up'}</Text>
        </Pressable>

        {errorMessage ? <Text style={styles.authError}>{errorMessage}</Text> : null}

        <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => onModeChange(mode === 'login' ? 'signup' : 'login')}>
          <Text style={styles.authToggleText}>
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F7FB' },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
    padding: 24,
  },
  authCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B2A4A',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  authInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
    color: '#0F172A',
  },
  authButton: {
    backgroundColor: '#1B2A4A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  authError: {
    marginTop: 12,
    textAlign: 'center',
    color: '#C53030',
    fontSize: 14,
  },
  authToggleText: {
    marginTop: 18,
    textAlign: 'center',
    color: '#1B2A4A',
    fontWeight: '600',
  },
});
