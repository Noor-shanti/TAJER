import React, { useEffect, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { customersApi } from '../../../src/features/customers/api/customersApi';
import { invoicesApi, type CreateInvoiceItemPayload } from '../../../src/features/invoices/api/invoicesApi';
import { productsApi } from '../../../src/features/products/api/productsApi';
import { formatMoney, parseMoneyInput } from '../../../src/utils/money';
import { formatQuantity, parseQuantityInput } from '../../../src/utils/quantity';

export default function NewInvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ customerId?: string; customerName?: string }>();

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    params.customerId ? Number(params.customerId) : null
  );
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>(
    params.customerName || ''
  );

  const [items, setItems] = useState<CreateInvoiceItemPayload[]>([]);
  const [invoiceDiscountInput, setInvoiceDiscountInput] = useState('');
  const [initialPaymentInput, setInitialPaymentInput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  const { data: customersRes } = useQuery({
    queryKey: ['customersSelect'],
    queryFn: () => customersApi.getCustomers('', 1),
    enabled: showCustomerModal,
  });

  const { data: productsRes } = useQuery({
    queryKey: ['productsSelect'],
    queryFn: () => productsApi.getProducts('', 1),
    enabled: showProductModal,
  });

  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    setIdempotencyKey(Crypto.randomUUID());
  }, []);

  const handleAddProduct = (product: any) => {
    setShowProductModal(false);
    const newItem: CreateInvoiceItemPayload = {
      productId: product.id,
      productNameSnapshot: product.name,
      unitNameSnapshot: product.unitNameAr,
      quantity: 1000, // Default 1 carton/piece
      unitPrice: product.currentPrice,
      discountType: 'NONE',
      discountValue: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItemQuantity = (index: number, quantityInput: string) => {
    const qMinor = parseQuantityInput(quantityInput);
    setItems((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index]!, quantity: qMinor };
      }
      return copy;
    });
  };

  const handleSetQuickQuantity = (index: number, majorQty: number) => {
    setItems((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index]!, quantity: Math.round(majorQty * 1000) };
      }
      return copy;
    });
  };

  const handleUpdateItemPrice = (index: number, priceInputStr: string) => {
    const priceMinor = parseMoneyInput(priceInputStr);
    setItems((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index]!, unitPrice: priceMinor };
      }
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live Auto Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    items.forEach((item) => {
      const lineSubtotal = Math.round((item.quantity * item.unitPrice) / 1000);
      subtotal += lineSubtotal;
    });

    const invoiceDiscount = parseMoneyInput(invoiceDiscountInput);
    const finalTotal = Math.max(0, subtotal - invoiceDiscount);

    const initialPayment = parseMoneyInput(initialPaymentInput);
    const remaining = Math.max(0, finalTotal - initialPayment);

    return { subtotal, invoiceDiscount, total: finalTotal, initialPayment, remaining };
  };

  const totals = calculateTotals();

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      setError('يرجى اختيار الزبون أولاً');
      return;
    }

    if (items.length === 0) {
      setError('يرجى إضافة صنف واحد على الأقل في الفاتورة');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await invoicesApi.createInvoice({
        customerId: selectedCustomerId,
        items,
        discountType: totals.invoiceDiscount > 0 ? 'FIXED' : 'NONE',
        discountValue: totals.invoiceDiscount,
        initialPaymentAmount: totals.initialPayment,
        notes: notes.trim() || undefined,
        idempotencyKey,
      });

      router.replace('/(app)/dashboard');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في حفظ الفاتورة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      {/* Customer Selection */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>1. اختيار الزبون</Text>
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowCustomerModal(true)}
        >
          <Text style={styles.selectBtnText}>
            {selectedCustomerName ? `الزبون الحالي: ${selectedCustomerName}` : '🔍 انقر لاختيار زبون من القائمة...'}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Items Section */}
      <Card style={styles.sectionCard}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>2. أصناف الطلبية ({items.length})</Text>
          <TouchableOpacity
            style={styles.addItemsBtn}
            onPress={() => setShowProductModal(true)}
          >
            <Text style={styles.addItemsBtnText}>➕ إضافة صنف</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <Text style={styles.emptyItemsText}>انقر على "إضافة صنف" لإدخال المنتجات والكميات</Text>
        ) : (
          items.map((item, index) => {
            const lineTotal = Math.round((item.quantity * item.unitPrice) / 1000);
            return (
              <View key={index} style={styles.itemRowContainer}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.productNameSnapshot}</Text>
                  <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                    <Text style={styles.removeText}>❌ حذف</Text>
                  </TouchableOpacity>
                </View>

                {/* Price and Unit Controls */}
                <View style={styles.rowControls}>
                  <View style={styles.flex1}>
                    <Input
                      label={`السعر (${item.unitNameSnapshot})`}
                      defaultValue={(item.unitPrice / 100).toString()}
                      onChangeText={(v) => handleUpdateItemPrice(index, v)}
                      keyboardType="decimal-pad"
                      style={styles.smallInput}
                    />
                  </View>

                  <View style={styles.flex1}>
                    <Input
                      label="الكمية المطلوبة"
                      defaultValue={formatQuantity(item.quantity)}
                      onChangeText={(val) => handleUpdateItemQuantity(index, val)}
                      keyboardType="decimal-pad"
                      style={styles.smallInput}
                    />
                  </View>
                </View>

                {/* Quick Quantity Chips */}
                <Text style={styles.quickLabel}>اختيار سريع للكمية:</Text>
                <View style={styles.quickQtyRow}>
                  {[0.5, 1, 2, 4, 6, 10].map((qty) => (
                    <TouchableOpacity
                      key={qty}
                      style={[
                        styles.qtyChip,
                        formatQuantity(item.quantity) === String(qty) && styles.qtyChipSelected,
                      ]}
                      onPress={() => handleSetQuickQuantity(index, qty)}
                    >
                      <Text
                        style={[
                          styles.qtyChipText,
                          formatQuantity(item.quantity) === String(qty) && styles.qtyChipTextSelected,
                        ]}
                      >
                        {qty}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.itemSubtotalFooter}>
                  <Text style={styles.subLabel}>إجمالي الصنف:</Text>
                  <Text style={styles.subVal}>{formatMoney(lineTotal)}</Text>
                </View>
              </View>
            );
          })
        )}
      </Card>

      {/* Live Auto Summary */}
      <Card style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>3. حساب الفاتورة الإجمالي 🧮</Text>

        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>مجموع الأصناف:</Text>
          <Text style={styles.calcValue}>{formatMoney(totals.subtotal)}</Text>
        </View>

        <Input
          label="خصم الفاتورة (بالشيكل)"
          placeholder="مثال: 5 أو 0"
          value={invoiceDiscountInput}
          onChangeText={setInvoiceDiscountInput}
          keyboardType="decimal-pad"
        />

        <View style={styles.calcRowHighlight}>
          <Text style={styles.calcLabelBold}>المجموع النهائي للفاتورة:</Text>
          <Text style={styles.calcValueBold}>{formatMoney(totals.total)}</Text>
        </View>

        <Input
          label="المدفوع الآن (دفعة نقدية أولى)"
          placeholder="مثال: 100 أو 0"
          value={initialPaymentInput}
          onChangeText={setInitialPaymentInput}
          keyboardType="decimal-pad"
        />

        <View style={styles.calcRowDanger}>
          <Text style={styles.calcLabelDanger}>المتبقي ديناً على الزبون:</Text>
          <Text style={styles.calcValueDanger}>{formatMoney(totals.remaining)}</Text>
        </View>

        <Input
          label="ملاحظات الفاتورة"
          placeholder="أدخل أي ملاحظات..."
          value={notes}
          onChangeText={setNotes}
        />

        <Button
          title="حفظ وإصدار الفاتورة"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />
      </Card>

      {/* Customer Modal */}
      <Modal visible={showCustomerModal} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>اختر الزبون</Text>
          <FlatList
            data={customersRes?.data || []}
            keyExtractor={(c) => String(c.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setSelectedCustomerId(item.id);
                  setSelectedCustomerName(item.name);
                  setShowCustomerModal(false);
                }}
              >
                <Text style={styles.modalItemText}>{item.name}</Text>
                {item.phone ? <Text style={styles.modalItemSub}>📞 {item.phone}</Text> : null}
              </TouchableOpacity>
            )}
          />
          <Button title="إغلاق" onPress={() => setShowCustomerModal(false)} variant="outline" />
        </View>
      </Modal>

      {/* Product Modal */}
      <Modal visible={showProductModal} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>اختر الصنف / المنتج</Text>
          <FlatList
            data={productsRes?.data || []}
            keyExtractor={(p) => String(p.id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => handleAddProduct(item)}>
                <Text style={styles.modalItemText}>{item.name}</Text>
                <Text style={styles.modalItemSub}>
                  {formatMoney(item.currentPrice)} / {item.unitNameAr}
                </Text>
              </TouchableOpacity>
            )}
          />
          <Button title="إغلاق" onPress={() => setShowProductModal(false)} variant="outline" />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  sectionCard: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', textAlign: 'right', marginBottom: 8 },
  selectBtn: { padding: 14, backgroundColor: '#F1F5F9', borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' },
  selectBtnText: { fontSize: 15, fontWeight: 'bold', color: '#0F172A', textAlign: 'right' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  addItemsBtn: { backgroundColor: '#0284C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addItemsBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  emptyItemsText: { textAlign: 'center', color: '#94A3B8', paddingVertical: 16, fontSize: 13 },
  itemRowContainer: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
  removeText: { fontSize: 12, color: '#DC2626', fontWeight: 'bold' },
  rowControls: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  smallInput: { height: 40, fontSize: 14 },
  quickLabel: { fontSize: 11, color: '#64748B', marginTop: 4, marginBottom: 4, textAlign: 'right' },
  quickQtyRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  qtyChip: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' },
  qtyChipSelected: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  qtyChipText: { fontSize: 12, color: '#334155' },
  qtyChipTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },
  itemSubtotalFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 6, marginTop: 4 },
  subLabel: { fontSize: 12, color: '#475569' },
  subVal: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  summaryCard: { backgroundColor: '#FFFFFF' },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  calcRowHighlight: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', marginVertical: 6 },
  calcRowDanger: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, backgroundColor: '#FEF2F2', paddingHorizontal: 10, borderRadius: 8, marginVertical: 8 },
  calcLabel: { color: '#475569' },
  calcValue: { fontWeight: 'bold', color: '#0F172A' },
  calcLabelBold: { fontWeight: 'bold', fontSize: 15, color: '#0F172A' },
  calcValueBold: { fontWeight: 'bold', fontSize: 16, color: '#0284C7' },
  calcLabelDanger: { fontWeight: 'bold', color: '#991B1B' },
  calcValueDanger: { fontWeight: 'bold', fontSize: 16, color: '#DC2626' },
  submitBtn: { backgroundColor: '#16A34A', marginTop: 14 },
  errorBanner: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12, textAlign: 'right' },
  modalContainer: { flex: 1, padding: 20, backgroundColor: '#FFFFFF', marginTop: 40 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 16 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemText: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', textAlign: 'right' },
  modalItemSub: { fontSize: 12, color: '#64748B', textAlign: 'right', marginTop: 2 },
});
