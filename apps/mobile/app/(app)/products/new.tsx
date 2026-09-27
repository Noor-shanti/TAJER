import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { productsApi } from '../../../src/features/products/api/productsApi';
import { parseMoneyInput } from '../../../src/utils/money';

export default function NewProductScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: unitsRes } = useQuery({
    queryKey: ['productUnits'],
    queryFn: () => productsApi.getUnits(),
  });

  const units = unitsRes?.data || [];

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('اسم المنتج مطلوب');
      return;
    }

    if (!selectedUnitId) {
      setError('يرجى اختيار وحدة القياس (كروز، حبة...)');
      return;
    }

    const priceMinor = parseMoneyInput(priceInput);

    try {
      setLoading(true);
      setError('');
      await productsApi.createProduct({
        name: name.trim(),
        unitId: selectedUnitId,
        currentPrice: priceMinor,
      });
      router.back();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في إضافة المنتج');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.title}>معلومات المنتج الجديد</Text>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <Input
          label="اسم المنتج *"
          placeholder="مثال: مالبورو / ال ام / وينستون"
          value={name}
          onChangeText={setName}
        />

        <Input
          label="السعر (بالشيكل) *"
          placeholder="مثال: 74 أو 0.50"
          value={priceInput}
          onChangeText={setPriceInput}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>وحدة القياس *</Text>
        <View style={styles.unitsContainer}>
          {units.map((unit) => {
            const isSelected = selectedUnitId === unit.id;
            return (
              <TouchableOpacity
                key={unit.id}
                style={[styles.unitChip, isSelected && styles.unitChipSelected]}
                onPress={() => setSelectedUnitId(unit.id)}
              >
                <Text style={[styles.unitChipText, isSelected && styles.unitChipTextSelected]}>
                  {unit.nameAr} ({unit.nameEn})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          title="حفظ المنتج"
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    textAlign: 'right',
    marginTop: 8,
  },
  unitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  unitChipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  unitChipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  unitChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  saveBtn: {
    marginTop: 12,
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
