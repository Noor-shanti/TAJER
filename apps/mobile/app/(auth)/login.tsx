import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/common/Button';
import { Input } from '../../src/components/common/Input';
import { authApi } from '../../src/features/auth/api/authApi';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await authApi.login({ username: username.trim(), password });
      router.replace('/(app)/dashboard');
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول، يرجى التأكد من البيانات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <Text style={styles.logoTitle}>تبيين للمبيعات</Text>
          <Text style={styles.subTitle}>تطبيق إدارة المبيعات والفواتير للتاجر</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>تسجيل الدخول</Text>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <Input
            label="اسم المستخدم"
            placeholder="أدخل اسم المستخدم"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Input
            label="كلمة المرور"
            placeholder="أدخل كلمة المرور"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            title="دخول"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#38BDF8',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 20,
    textAlign: 'right',
  },
  loginButton: {
    marginTop: 14,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'right',
  },
});
