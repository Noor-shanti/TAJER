import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { customersApi } from '../../../src/features/customers/api/customersApi';

export default function NewCustomerScreen() {
  const router = useRouter();
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
      await customersApi.createCustomer({
        name: name.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في حفظ بيانات الزبون');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>معلومات الزبون الجديد</Text>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <Input
          label="اسم الزبون *"
          placeholder="مثال: أحمد المحمود"
          value={name}
          onChangeText={setName}
        />

        <Input
          label="رقم الهاتف"
          placeholder="مثال: 0599000000"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Input
          label="ملاحظات"
          placeholder="أدخل أي ملاحظات خاصة بالزبون..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />

        <Button
          title="حفظ الزبون"
          onPress={handleSubmit}
          loading={loading}
          style={styles.saveBtn}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'right',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveBtn: {
    marginTop: 16,
    backgroundColor: '#0F172A',
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
