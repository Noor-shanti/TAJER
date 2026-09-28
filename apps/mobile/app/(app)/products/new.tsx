import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { productsApi } from '../../../src/features/products/api/productsApi';
import { formatMoney, parseMoneyInput } from '../../../src/utils/money';
import { parseQuantityInput } from '../../../src/utils/quantity';

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function NewProductScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [initialStockInput, setInitialStockInput] = useState('');
  const [reorderLevelInput, setReorderLevelInput] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: unitsRes } = useQuery({
    queryKey: ['productUnits'],
    queryFn: () => productsApi.getUnits(),
  });

  const { data: categoriesRes, refetch: refetchCategories } = useQuery({
    queryKey: ['productCategories'],
    queryFn: () => productsApi.getCategories(),
  });

  const units = unitsRes?.data || [];
  const categories = categoriesRes?.data || [];
  const parsedPrice = parseMoneyInput(priceInput);
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId);

  const handleCreateCategory = async () => {
    const categoryName = newCategoryName.trim();
    if (!categoryName) {
      setError('اكتب اسم التصنيف الجديد أولا');
      return;
    }

    try {
      setCategoryLoading(true);
      setError('');
      const res = await productsApi.createCategory({ name: categoryName });
      setSelectedCategoryId(res.data.id);
      setNewCategoryName('');
      await refetchCategories();
      queryClient.invalidateQueries({ queryKey: ['productCategories'] });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'تعذر إضافة التصنيف'));
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleSubmit = async () => {
    const productName = name.trim();

    if (!productName) {
      setError('اسم المنتج مطلوب');
      return;
    }

    if (!selectedUnitId) {
      setError('اختر وحدة القياس مثل كروز أو حبة');
      return;
    }

    if (parsedPrice < 0) {
      setError('السعر يجب أن يكون صفرا أو أكثر');
      return;
    }

    if (!initialStockInput.trim()) {
      setError('أدخل الكمية المتوفرة عند إضافة المنتج');
      return;
    }
    if (!reorderLevelInput.trim()) {
      setError('أدخل حد التنبيه للمخزون');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await productsApi.createProduct({
        name: productName,
        unitId: selectedUnitId,
        categoryId: selectedCategoryId || undefined,
        currentPrice: parsedPrice,
        stockQuantity: parseQuantityInput(initialStockInput),
        reorderLevel: parseQuantityInput(reorderLevelInput),
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['productsSelect'] });
      queryClient.invalidateQueries({ queryKey: ['lowStock'] });
      router.replace('/(app)/products');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'تعذر حفظ المنتج'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>منتج جديد</Text>
        <Text style={styles.subtitle}>أضف الصنف مرة واحدة، وسيظهر مباشرة أثناء تجهيز الطلبيات.</Text>
      </View>

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>بيانات المنتج</Text>

        <Input
          label="اسم المنتج"
          placeholder="مثال: مالبورو أحمر"
          value={name}
          onChangeText={setName}
        />

        <Input
          label="السعر بالشيكل"
          placeholder="مثال: 74 أو 0.50"
          value={priceInput}
          onChangeText={setPriceInput}
          keyboardType="decimal-pad"
        />

        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>السعر الذي سيستخدم بالفاتورة</Text>
          <Text style={styles.previewValue}>{formatMoney(parsedPrice)}</Text>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>التصنيف</Text>
        <View style={styles.chipsContainer}>
          <TouchableOpacity
            style={[styles.chip, selectedCategoryId === null && styles.chipSelected]}
            onPress={() => setSelectedCategoryId(null)}
          >
            <Text style={[styles.chipText, selectedCategoryId === null && styles.chipTextSelected]}>بدون تصنيف</Text>
          </TouchableOpacity>

          {categories.map((category) => {
            const isSelected = selectedCategoryId === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setSelectedCategoryId(category.id)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{category.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.inlineCreateRow}>
          <View style={styles.inlineInputWrap}>
            <Input
              placeholder="تصنيف جديد مثل سجائر"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              style={styles.inlineInput}
            />
          </View>
          <Button
            title="إضافة"
            onPress={handleCreateCategory}
            loading={categoryLoading}
            style={styles.inlineButton}
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>وحدة القياس</Text>
        <View style={styles.chipsContainer}>
          {units.map((unit) => {
            const isSelected = selectedUnitId === unit.id;
            return (
              <TouchableOpacity
                key={unit.id}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setSelectedUnitId(unit.id)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {unit.nameAr} ({unit.nameEn})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedUnit ? (
          <Text style={styles.hint}>يمكن لاحقا إدخال كمية كسرية من هذه الوحدة، مثل 0.5 {selectedUnit.nameAr}.</Text>
        ) : (
          <Text style={styles.hint}>اختر الوحدة التي يفهمها التاجر عند البيع.</Text>
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>المخزون عند الإضافة</Text>
        <Input
          label={selectedUnit ? `الكمية المتوفرة الآن (${selectedUnit.nameAr})` : 'الكمية المتوفرة الآن'}
          placeholder="مثال: 12 أو 0.5"
          value={initialStockInput}
          onChangeText={setInitialStockInput}
          keyboardType="decimal-pad"
        />
        <Input
          label={selectedUnit ? `تنبيه عند الوصول إلى (${selectedUnit.nameAr})` : 'تنبيه عند الوصول إلى'}
          placeholder="مثال: 3"
          value={reorderLevelInput}
          onChangeText={setReorderLevelInput}
          keyboardType="decimal-pad"
        />
      </Card>

      <Button
        title="حفظ المنتج"
        onPress={handleSubmit}
        loading={loading}
        style={styles.saveBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 14 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0B1220', textAlign: 'right' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4, textAlign: 'right', lineHeight: 22 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0B1220', marginBottom: 12, textAlign: 'right' },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  chipSelected: { backgroundColor: '#0B1220', borderColor: '#0B1220' },
  chipText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  chipTextSelected: { color: '#FFFFFF' },
  inlineCreateRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inlineInputWrap: { flex: 1 },
  inlineInput: { height: 42 },
  inlineButton: { width: 96, height: 42, marginVertical: 0, backgroundColor: '#075FD8' },
  saveBtn: { marginTop: 4, backgroundColor: '#0B1220' },
  errorBanner: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12, textAlign: 'right' },
  previewRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 12, marginTop: 4 },
  previewLabel: { color: '#475569', fontSize: 13, fontWeight: '600' },
  previewValue: { color: '#0B1220', fontSize: 16, fontWeight: 'bold' },
  hint: { color: '#64748B', fontSize: 13, lineHeight: 20, textAlign: 'right' },
});
