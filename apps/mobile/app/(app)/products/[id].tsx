import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { auditApi } from '../../../src/features/audit/api/auditApi';
import { inventoryApi } from '../../../src/features/inventory/api/inventoryApi';
import { productsApi } from '../../../src/features/products/api/productsApi';
import { formatMoney, parseMoneyInput } from '../../../src/utils/money';
import { formatQuantity, parseQuantityInput } from '../../../src/utils/quantity';

function movementLabel(type: string, notes: string | null) {
  if (type === 'SALE') return 'بيع';
  if (type === 'CANCELLATION') return 'إلغاء طلبية';
  if (type === 'RECEIPT') return 'توريد مخزون';
  if (notes?.includes('الكمية الافتتاحية')) return 'كمية افتتاحية';
  return 'تسوية مخزون';
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [receivedStock, setReceivedStock] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [saving, setSaving] = useState(false);
  const { data } = useQuery({ queryKey: ['productDetail', productId], queryFn: () => productsApi.getProductById(productId) });
  const { data: movements } = useQuery({ queryKey: ['stockMovements', productId], queryFn: () => inventoryApi.getMovements(productId) });
  const { data: logs } = useQuery({ queryKey: ['audit', 'PRODUCT', productId], queryFn: () => auditApi.getLogs('PRODUCT', productId) });
  const product = data?.data;

  useEffect(() => {
    if (!product) return;
    setName(product.name);
    setPrice(String(product.currentPrice / 100));
    setReorderLevel(formatQuantity(product.reorderLevel));
  }, [product?.id, product?.updatedAt]);

  const invalidateProductData = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['productsSelect'] });
    queryClient.invalidateQueries({ queryKey: ['productDetail'] });
    queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
    queryClient.invalidateQueries({ queryKey: ['lowStock'] });
    queryClient.invalidateQueries({ queryKey: ['audit'] });
  };

  const saveDetails = async () => {
    if (!product) return;
    try {
      setSaving(true);
      await productsApi.updateProduct(productId, { name: name.trim(), currentPrice: parseMoneyInput(price) });
      invalidateProductData();
    } finally { setSaving(false); }
  };

  const receiveStock = async () => {
    if (!product) return;
    const quantity = parseQuantityInput(receivedStock);
    if (quantity <= 0) {
      Alert.alert('أدخل كمية التوريد', 'أدخل كمية أكبر من صفر لإضافتها إلى المخزون.');
      return;
    }
    try {
      setSaving(true);
      await inventoryApi.receiveStock(productId, { quantity });
      setReceivedStock('');
      invalidateProductData();
    } finally { setSaving(false); }
  };

  const saveReorderLevel = async () => {
    if (!product) return;
    try {
      setSaving(true);
      await inventoryApi.setStock(productId, { quantity: product.stockQuantity, reorderLevel: parseQuantityInput(reorderLevel) });
      invalidateProductData();
    } finally { setSaving(false); }
  };

  const archive = () => Alert.alert('إيقاف المنتج', 'سيبقى موجودا في الفواتير السابقة، لكنه لن يظهر في طلبية جديدة.', [
    { text: 'رجوع', style: 'cancel' },
    { text: 'إيقاف', style: 'destructive', onPress: async () => { await productsApi.archiveProduct(productId); invalidateProductData(); router.replace('/(app)/products'); } },
  ]);

  if (!product) return <View style={styles.loading}><Text>جاري تحميل المنتج...</Text></View>;

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Card style={styles.section}>
      <Text style={styles.title}>بيانات المنتج</Text>
      <Input label="اسم المنتج" value={name} onChangeText={setName} />
      <Input label="السعر بالشيكل" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
      <Text style={styles.hint}>الوحدة: {product.unitNameAr} | السعر الحالي: {formatMoney(product.currentPrice)}</Text>
      <Button title="حفظ تعديل المنتج" onPress={saveDetails} loading={saving} />
      <Button title="إيقاف المنتج" onPress={archive} variant="outline" />
    </Card>

    <Card style={styles.section}>
      <Text style={styles.title}>المخزون</Text>
      <View style={styles.stockHeadline}><Text style={styles.stockNumber}>{formatQuantity(product.stockQuantity)} {product.unitNameAr}</Text><Text style={styles.stockLabel}>المتوفر الآن</Text></View>
      <Input label={`كمية وصلت للمخزون (${product.unitNameAr})`} placeholder="مثال: 3 أو 0.5" value={receivedStock} onChangeText={setReceivedStock} keyboardType="decimal-pad" />
      {parseQuantityInput(receivedStock) > 0 ? <Text style={styles.receiptPreview}>سيصبح المتوفر: {formatQuantity(product.stockQuantity + parseQuantityInput(receivedStock))} {product.unitNameAr}</Text> : null}
      <Button title="إضافة للمخزون" onPress={receiveStock} loading={saving} />
      <Input label={`حد التنبيه (${product.unitNameAr})`} value={reorderLevel} onChangeText={setReorderLevel} keyboardType="decimal-pad" />
      <Button title="حفظ حد التنبيه" onPress={saveReorderLevel} loading={saving} variant="secondary" />
    </Card>

    <Card style={styles.section}>
      <Text style={styles.title}>حركة المخزون</Text>
      <View style={styles.tableHeader}><Text style={[styles.tableHeaderText, styles.dateCell]}>التاريخ</Text><Text style={[styles.tableHeaderText, styles.actionCell]}>العملية</Text><Text style={[styles.tableHeaderText, styles.changeCell]}>التغيير</Text><Text style={[styles.tableHeaderText, styles.balanceCell]}>المتوفر</Text></View>
      {(movements?.data || []).map((movement) => <View key={movement.id} style={styles.tableRow}><Text style={[styles.tableText, styles.dateCell]}>{new Date(movement.createdAt).toLocaleDateString('ar')}</Text><Text style={[styles.tableText, styles.actionCell]}>{movementLabel(movement.movementType, movement.notes)}</Text><Text style={[movement.quantityDelta < 0 ? styles.minus : styles.plus, styles.changeCell]}>{movement.quantityDelta > 0 ? '+' : ''}{formatQuantity(movement.quantityDelta)}</Text><Text style={[styles.tableText, styles.balanceCell]}>{formatQuantity(movement.balanceAfter)}</Text></View>)}
      {!movements?.data?.length ? <Text style={styles.empty}>لا توجد حركة بعد</Text> : null}
    </Card>

    {(logs?.data || []).length ? <Card style={styles.section}><Text style={styles.title}>سجل التعديلات</Text>{logs?.data.map((log) => <Text key={log.id} style={styles.logText}>{log.description}</Text>)}</Card> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' }, content: { padding: 16, paddingBottom: 28 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' }, section: { marginBottom: 12 },
  title: { color: '#0B1220', fontWeight: '900', fontSize: 17, textAlign: 'right', marginBottom: 10 }, hint: { color: '#64748B', textAlign: 'right', fontSize: 12, marginBottom: 10 },
  stockHeadline: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 12, alignItems: 'flex-end', marginBottom: 10 }, stockNumber: { color: '#15803D', fontWeight: '900', fontSize: 24 }, stockLabel: { color: '#64748B', fontSize: 12, marginTop: 2 },
  receiptPreview: { color: '#15803D', fontSize: 13, fontWeight: '800', textAlign: 'right', marginTop: -2, marginBottom: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#EAF2FF', paddingVertical: 8, paddingHorizontal: 4 }, tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#EEF3FA' }, tableHeaderText: { color: '#52657C', fontSize: 10, fontWeight: '900', textAlign: 'center' }, tableText: { color: '#334155', fontSize: 11, textAlign: 'center' }, dateCell: { width: '27%' }, actionCell: { width: '28%' }, changeCell: { width: '22%', textAlign: 'center' }, balanceCell: { width: '23%', textAlign: 'center' }, plus: { color: '#15803D', fontWeight: '900', fontSize: 11 }, minus: { color: '#DC2626', fontWeight: '900', fontSize: 11 }, empty: { color: '#7A8699', textAlign: 'center', paddingVertical: 14 }, logText: { color: '#64748B', textAlign: 'right', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#EEF3FA' },
});
