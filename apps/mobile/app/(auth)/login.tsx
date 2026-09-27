import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <Ionicons name="storefront" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.brand}>دفتر التاجر</Text>
          <Text style={styles.subtitle}>إدارة الزبائن والطلبيات والدفعات من مكان واحد</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>تسجيل الدخول</Text>
          <Text style={styles.cardHint}>ادخل لحساب التاجر لمتابعة العمل اليومي.</Text>

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
  container: { flex: 1, backgroundColor: '#075FD8' },
  content: { flexGrow: 1, justifyContent: 'flex-end', paddingTop: 56 },
  hero: { minHeight: 250, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logoMark: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: 14,
  },
  brand: { fontSize: 31, fontWeight: '900', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#DCEBFF', marginTop: 8, textAlign: 'center', lineHeight: 22 },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 22,
    paddingBottom: 30,
    minHeight: 370,
  },
  cardTitle: { fontSize: 22, fontWeight: '900', color: '#0B1220', marginBottom: 4, textAlign: 'right' },
  cardHint: { fontSize: 13, color: '#7A8699', marginBottom: 12, textAlign: 'right', lineHeight: 20 },
  loginButton: { marginTop: 14 },
  errorBanner: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: 10, borderRadius: 10, fontSize: 13, marginBottom: 12, textAlign: 'right' },
});
