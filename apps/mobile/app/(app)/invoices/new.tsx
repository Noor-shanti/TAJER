import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { calculateDiscountAmount, calculateLineSubtotal } from '@merchant/shared';
import type { CustomerSummary, Product } from '@merchant/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { customersApi } from '../../../src/features/customers/api/customersApi';
import { invoicesApi, type CreateInvoiceItemPayload } from '../../../src/features/invoices/api/invoicesApi';
import { productsApi } from '../../../src/features/products/api/productsApi';
import { formatMoney, parseMoneyInput } from '../../../src/utils/money';
import { formatQuantity, parseQuantityInput } from '../../../src/utils/quantity';

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function moneyInputValue(value: number) {
  if (value <= 0) return '';
  return (value / 100).toString();
}

export default function NewInvoiceScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ customerId?: string; customerName?: string; draftId?: string }>();

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    params.customerId ? Number(params.customerId) : null
  );
  const [selectedCustomerName, setSelectedCustomerName] = useState(params.customerName || '');
  const [items, setItems] = useState<CreateInvoiceItemPayload[]>([]);
  const [invoiceDiscountInput, setInvoiceDiscountInput] = useState('');
  const [initialPaymentInput, setInitialPaymentInput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    const customerId = params.customerId ? Number(params.customerId) : null;
    setSelectedCustomerId(Number.isFinite(customerId) ? customerId : null);
    setSelectedCustomerName(params.customerName || '');
    setItems([]);
    setInvoiceDiscountInput('');
    setInitialPaymentInput('');
    setNotes('');
    setError('');
    setCustomerSearch('');
    setProductSearch('');
    setShowCustomerModal(false);
    setShowProductModal(false);
    setIdempotencyKey(Crypto.randomUUID());
  }, [params.customerId, params.customerName, params.draftId]);

  const { data: customersRes } = useQuery({
    queryKey: ['customersSelect', customerSearch],
    queryFn: () => customersApi.getCustomers(customerSearch, 1),
  });

  const { data: productsRes } = useQuery({
    queryKey: ['productsSelect', productSearch],
    queryFn: () => productsApi.getProducts(productSearch, 1),
  });

  const customers = customersRes?.data || [];
  const products = productsRes?.data || [];

  const selectCustomer = (customer: CustomerSummary) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomerName(customer.name);
    setShowCustomerModal(false);
  };

  const addProduct = (product: Product) => {
    setShowProductModal(false);
    const existingIndex = items.findIndex((item) => item.productId === product.id);
    if (existingIndex >= 0) {
      setItems((prev) =>
        prev.map((item, index) =>
          index === existingIndex ? { ...item, quantity: item.quantity + 1000 } : item
        )
      );
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productNameSnapshot: product.name,
        unitNameSnapshot: product.unitNameAr,
        quantity: 1000,
        unitPrice: product.currentPrice,
        discountType: 'NONE',
        discountValue: 0,
      },
    ]);
  };

  const updateItem = (index: number, patch: Partial<CreateInvoiceItemPayload>) => {
    setItems((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const itemTotals = (item: CreateInvoiceItemPayload) => {
    const lineSubtotal = calculateLineSubtotal(item.quantity, item.unitPrice);
    const itemDiscount = calculateDiscountAmount(lineSubtotal, item.discountType, item.discountValue);
    return { lineSubtotal, itemDiscount, lineTotal: lineSubtotal - itemDiscount };
  };

  const totals = useMemo(() => {
    const itemsSubtotal = items.reduce((sum, item) => sum + itemTotals(item).lineSubtotal, 0);
    const itemDiscount = items.reduce((sum, item) => sum + itemTotals(item).itemDiscount, 0);
    const subtotal = itemsSubtotal - itemDiscount;
    const invoiceDiscount = Math.min(subtotal, parseMoneyInput(invoiceDiscountInput));
    const total = subtotal - invoiceDiscount;
    const initialPayment = parseMoneyInput(initialPaymentInput);
    const remaining = Math.max(0, total - initialPayment);
    return { itemsSubtotal, itemDiscount, subtotal, invoiceDiscount, total, initialPayment, remaining };
  }, [items, invoiceDiscountInput, initialPaymentInput]);

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      setError('اختر الزبون قبل حفظ الطلبية');
      return;
    }
    if (items.length === 0) {
      setError('أضف صنفا واحدا على الأقل');
      return;
    }
    if (totals.initialPayment > totals.total) {
      setError('المدفوع أكبر من مجموع الفاتورة');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await invoicesApi.createInvoice({
        customerId: selectedCustomerId,
        items,
        discountType: totals.invoiceDiscount > 0 ? 'FIXED' : 'NONE',
        discountValue: totals.invoiceDiscount,
        initialPaymentAmount: totals.initialPayment,
        notes: notes.trim() || undefined,
        idempotencyKey,
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoicesList'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customersSelect'] });
      queryClient.invalidateQueries({ queryKey: ['customerDetail'] });
      queryClient.invalidateQueries({ queryKey: ['customerDebtSummary'] });
      queryClient.invalidateQueries({ queryKey: ['customerInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['salesReport'] });
      router.replace(`/(app)/invoices/${res.data.id}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'تعذر حفظ الطلبية'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>الزبون</Text>
          <TouchableOpacity style={styles.customerPicker} onPress={() => setShowCustomerModal(true)}>
            <Text style={selectedCustomerName ? styles.customerName : styles.placeholderText}>
              {selectedCustomerName || 'اختر زبون للطلبية'}
            </Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>الأصناف</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowProductModal(true)}>
              <Text style={styles.addButtonText}>إضافة صنف</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <Text style={styles.emptyText}>لم يتم إضافة أصناف بعد</Text>
          ) : (
            items.map((item, index) => {
              const { lineSubtotal, itemDiscount, lineTotal } = itemTotals(item);
              return (
                <View key={`${item.productId || item.productNameSnapshot}-${index}`} style={styles.itemBox}>
                  <View style={styles.itemHeader}>
                    <TouchableOpacity onPress={() => removeItem(index)}>
                      <Text style={styles.removeText}>حذف</Text>
                    </TouchableOpacity>
                    <Text style={styles.itemName}>{item.productNameSnapshot}</Text>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.inputCol}>
                      <Input
                        label={`السعر / ${item.unitNameSnapshot}`}
                        defaultValue={moneyInputValue(item.unitPrice)}
                        onChangeText={(value) => updateItem(index, { unitPrice: parseMoneyInput(value) })}
                        keyboardType="decimal-pad"
                        style={styles.compactInput}
                      />
                    </View>
                    <View style={styles.inputCol}>
                      <Input
                        label="الكمية"
                        defaultValue={formatQuantity(item.quantity)}
                        onChangeText={(value) => updateItem(index, { quantity: parseQuantityInput(value) })}
                        keyboardType="decimal-pad"
                        style={styles.compactInput}
                      />
                    </View>
                  </View>

                  <Input
                    label="خصم على الصنف"
                    placeholder="مثال: 2.50"
                    defaultValue={moneyInputValue(item.discountValue)}
                    onChangeText={(value) =>
                      updateItem(index, {
                        discountValue: parseMoneyInput(value),
                        discountType: parseMoneyInput(value) > 0 ? 'FIXED' : 'NONE',
                      })
                    }
                    keyboardType="decimal-pad"
                    style={styles.compactInput}
                  />

                  <View style={styles.itemTotalRow}>
                    <Text style={styles.itemMeta}>
                      {itemDiscount > 0
                        ? `قبل الخصم ${formatMoney(lineSubtotal)}، الخصم ${formatMoney(itemDiscount)}`
                        : 'بدون خصم على الصنف'}
                    </Text>
                    <Text style={styles.itemTotal}>{formatMoney(lineTotal)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>الحساب والدفع</Text>
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>إجمالي الأصناف قبل الخصم</Text>
            <Text style={styles.calcValue}>{formatMoney(totals.itemsSubtotal)}</Text>
          </View>
          {totals.itemDiscount > 0 ? (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>خصم الأصناف</Text>
              <Text style={styles.discountValue}>-{formatMoney(totals.itemDiscount)}</Text>
            </View>
          ) : null}
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>إجمالي الأصناف بعد الخصم</Text>
            <Text style={styles.calcValue}>{formatMoney(totals.subtotal)}</Text>
          </View>

          <Input
            label="خصم على الفاتورة"
            placeholder="مثال: 5"
            value={invoiceDiscountInput}
            onChangeText={setInvoiceDiscountInput}
            keyboardType="decimal-pad"
          />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>إجمالي الفاتورة</Text>
            <Text style={styles.totalValue}>{formatMoney(totals.total)}</Text>
          </View>

          <Input
            label="المدفوع الآن"
            placeholder="مثال: 100"
            value={initialPaymentInput}
            onChangeText={setInitialPaymentInput}
            keyboardType="decimal-pad"
          />

          <View style={styles.remainingRow}>
            <Text style={styles.remainingLabel}>المتبقي على الزبون</Text>
            <Text style={styles.remainingValue}>{formatMoney(totals.remaining)}</Text>
          </View>

          <Input
            label="ملاحظات"
            placeholder="أي تفاصيل مهمة عن الطلبية"
            value={notes}
            onChangeText={setNotes}
          />
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>الإجمالي</Text>
          <Text style={styles.footerTotal}>{formatMoney(totals.total)}</Text>
        </View>
        <Button title="حفظ الطلبية" onPress={handleSubmit} loading={loading} style={styles.saveButton} />
      </View>

      <Modal visible={showCustomerModal} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>اختر الزبون</Text>
          <Input
            placeholder="ابحث باسم الزبون أو الهاتف"
            value={customerSearch}
            onChangeText={setCustomerSearch}
            style={styles.modalSearchInput}
          />
          <FlatList
            data={customers}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={<Text style={styles.modalEmptyText}>لا يوجد زبائن مطابقون</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => selectCustomer(item)}>
                <Text style={styles.modalItemText}>{item.name}</Text>
                {item.phone ? <Text style={styles.modalSubText}>{item.phone}</Text> : null}
              </TouchableOpacity>
            )}
          />
          <Button title="إغلاق" onPress={() => setShowCustomerModal(false)} variant="outline" />
        </View>
      </Modal>

      <Modal visible={showProductModal} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>اختر المنتج</Text>
          <Input
            placeholder="ابحث باسم المنتج أو التصنيف"
            value={productSearch}
            onChangeText={setProductSearch}
            style={styles.modalSearchInput}
          />
          <FlatList
            data={products}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={<Text style={styles.modalEmptyText}>لا يوجد منتجات مطابقة</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => addProduct(item)}>
                <Text style={styles.modalItemText}>{item.name}</Text>
                <Text style={styles.modalSubText}>{formatMoney(item.currentPrice)} / {item.unitNameAr}</Text>
              </TouchableOpacity>
            )}
          />
          <Button title="إغلاق" onPress={() => setShowProductModal(false)} variant="outline" />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: 16, paddingBottom: 110 },
  section: { marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#0B1220', textAlign: 'right', marginBottom: 10 },
  customerPicker: { padding: 14, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, backgroundColor: '#F4F7FB' },
  customerName: { color: '#0B1220', fontWeight: 'bold', fontSize: 16, textAlign: 'right' },
  placeholderText: { color: '#64748B', fontSize: 15, textAlign: 'right' },
  addButton: { backgroundColor: '#075FD8', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#94A3B8', paddingVertical: 20 },
  itemBox: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12, marginBottom: 10 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemName: { flex: 1, color: '#0B1220', fontWeight: 'bold', fontSize: 16, textAlign: 'right' },
  removeText: { color: '#DC2626', fontWeight: 'bold', paddingHorizontal: 8 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputCol: { flex: 1 },
  compactInput: { height: 42, fontSize: 14 },
  itemTotalRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemMeta: { color: '#64748B', fontSize: 12, flex: 1, textAlign: 'right', paddingRight: 8 },
  itemTotal: { color: '#0B1220', fontWeight: 'bold', fontSize: 16 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  calcLabel: { color: '#475569', fontWeight: '600' },
  calcValue: { color: '#0B1220', fontWeight: 'bold' },
  discountValue: { color: '#DC2626', fontWeight: 'bold' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', marginVertical: 6 },
  totalLabel: { color: '#0B1220', fontWeight: 'bold', fontSize: 16 },
  totalValue: { color: '#075FD8', fontWeight: 'bold', fontSize: 18 },
  remainingRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginVertical: 8 },
  remainingLabel: { color: '#991B1B', fontWeight: 'bold' },
  remainingValue: { color: '#DC2626', fontWeight: 'bold', fontSize: 16 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { color: '#64748B', textAlign: 'right', fontSize: 12 },
  footerTotal: { color: '#0B1220', fontWeight: 'bold', fontSize: 18 },
  saveButton: { minWidth: 170, marginVertical: 0, backgroundColor: '#16A34A' },
  errorBanner: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12, textAlign: 'right' },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF', padding: 20, paddingTop: 48 },
  modalTitle: { color: '#0B1220', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  modalSearchInput: { height: 44, fontSize: 14 },
  modalEmptyText: { color: '#94A3B8', textAlign: 'center', paddingVertical: 24 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemText: { color: '#0B1220', fontWeight: 'bold', fontSize: 16, textAlign: 'right' },
  modalSubText: { color: '#64748B', fontSize: 12, textAlign: 'right', marginTop: 2 },
});
