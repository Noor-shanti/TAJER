import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { customersApi } from '../../../src/features/customers/api/customersApi';

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function NewCustomerScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('اسم الزبون مطلوب');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await customersApi.createCustomer({
        name: name.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customersSelect'] });
      queryClient.invalidateQueries({ queryKey: ['customerDebtSummary'] });
      router.replace({ pathname: '/(app)/customers/[id]', params: { id: res.data.id, ...(returnTo ? { returnTo } : {}) } });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'تعذر حفظ الزبون'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>إضافة زبون جديد</Text>
        <Text style={styles.subtitle}>بعد الحفظ ستنتقل مباشرة إلى ملف الزبون لإضافة طلبية أو متابعة الذمة.</Text>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <Input label="اسم الزبون" placeholder="مثال: أحمد المحمود" value={name} onChangeText={setName} />
        <Input label="رقم الهاتف" placeholder="مثال: 0599000000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input
          label="ملاحظات"
          placeholder="أي ملاحظات عن الزبون"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />

        <Button title="حفظ الزبون" onPress={handleSubmit} loading={loading} style={styles.saveBtn} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: 16 },
  title: { color: '#0B1220', fontSize: 20, fontWeight: 'bold', textAlign: 'right', marginBottom: 4 },
  subtitle: { color: '#64748B', textAlign: 'right', marginBottom: 14, lineHeight: 20 },
  textArea: { height: 88, textAlignVertical: 'top' },
  saveBtn: { marginTop: 16, backgroundColor: '#0B1220' },
  errorBanner: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12, textAlign: 'right' },
});
