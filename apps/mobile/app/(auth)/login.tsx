import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { authApi } from '../../src/features/auth/api/authApi';

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('merchant');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('أدخل اسم المستخدم وكلمة المرور');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await authApi.login({ username: username.trim(), password });
      router.replace('/(app)/dashboard');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'فشل تسجيل الدخول، تأكد من البيانات'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>دفتر التاجر</Text>
          <Text style={styles.subtitle}>إدارة الزبائن والطلبيات والذمم</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>تسجيل الدخول</Text>
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <Input
            label="اسم المستخدم"
            placeholder="merchant"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <Input
            label="كلمة المرور"
            placeholder="password123"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button title="دخول" onPress={handleLogin} loading={loading} style={styles.loginButton} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 26 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#CBD5E1', marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 22 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 14, textAlign: 'right' },
  loginButton: { marginTop: 14 },
  errorBanner: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12, textAlign: 'right' },
});
