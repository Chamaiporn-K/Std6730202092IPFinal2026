import { Stack } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../auth/session';
function Routes() {
  const {ready, user} = useAuth();
  if (!ready) return <ActivityIndicator accessibilityLabel="Loading session" />;
  return <Stack>
    <Stack.Protected guard={!user}><Stack.Screen name="login" options={{title: 'Sign in'}} /></Stack.Protected>
    <Stack.Protected guard={!!user}><Stack.Screen name="index" options={{title: 'HR Manager'}} /></Stack.Protected>
  </Stack>;
}
export default function Layout() { return <AuthProvider><Routes /></AuthProvider>; }
