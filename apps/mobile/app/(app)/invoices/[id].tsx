import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '../../../src/components/common/Badge';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { invoicesApi } from '../../../src/features/invoices/api/invoicesApi';
import { formatMoney, parseMoneyInput } from '../../../src/utils/money';
import { formatQuantity } from '../../../src/utils/quantity';

type OrderStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoiceId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoiceDetail', invoiceId],
    queryFn: () => invoicesApi.getInvoiceById(invoiceId),
  });

  const invoice = data?.data;

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['invoicesList'] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['customerInvoices'] });
  };

  const handleAddPayment = async () => {
    if (!invoice) return;
    const amount = parseMoneyInput(paymentAmountInput);
    if (amount <= 0) {
      setError('أدخل مبلغ دفعة أكبر من صفر');
      return;
    }
    if (amount > invoice.remaining) {
      setError('مبلغ الدفعة أكبر من المتبقي على الفاتورة');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await invoicesApi.addPayment(invoiceId, {
        amount,
        paymentMethod: 'CASH',
        notes: paymentNotes.trim() || undefined,
        idempotencyKey: Crypto.randomUUID(),
      });
      setShowPaymentModal(false);
      setPaymentAmountInput('');
      setPaymentNotes('');
      await refetch();
      invalidateLists();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'تعذر تسجيل الدفعة'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderStatus: OrderStatus) => {
    try {
      setStatusLoading(true);
      setError('');
      await invoicesApi.updateOrderStatus(invoiceId, orderStatus);
      await refetch();
      invalidateLists();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'تعذر تحديث حالة الطلبية'));
    } finally {
      setStatusLoading(false);
    }
  };

  if (isLoading || !invoice) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>جاري تحميل الطلبية...</Text>
      </View>
    );
  }

  const invoiceDiscount = Math.max(0, invoice.subtotal - invoice.total);
  const payments = invoice.payments || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <Card style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.badgesCol}>
            <Badge
              label={invoice.paymentStatus === 'PAID' ? 'مدفوعة' : invoice.paymentStatus === 'PARTIALLY_PAID' ? 'دفع جزئي' : 'غير مدفوعة'}
              variant={invoice.paymentStatus === 'PAID' ? 'success' : invoice.paymentStatus === 'PARTIALLY_PAID' ? 'warning' : 'danger'}
            />
            <Badge
              label={invoice.orderStatus === 'CONFIRMED' ? 'مؤكدة' : invoice.orderStatus === 'COMPLETED' ? 'مكتملة' : 'ملغاة'}
              variant={invoice.orderStatus === 'CANCELLED' ? 'danger' : 'info'}
            />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <TouchableOpacity onPress={() => router.push(`/(app)/customers/${invoice.customerId}`)}>
              <Text style={styles.customerName}>{invoice.customerName}</Text>
            </TouchableOpacity>
            <Text style={styles.dateText}>{new Date(invoice.createdAt).toLocaleDateString('ar')}</Text>
          </View>
        </View>

        <View style={styles.statusActions}>
          {[
            ['CONFIRMED', 'مؤكدة'],
            ['COMPLETED', 'مكتملة'],
            ['CANCELLED', 'ملغاة'],
          ].map(([value, label]) => (
            <TouchableOpacity
              key={value}
              disabled={statusLoading}
              style={[
                styles.statusBtn,
                invoice.orderStatus === value && styles.statusBtnActive,
                invoice.orderStatus === value && value === 'CANCELLED' && styles.statusBtnDanger,
              ]}
              onPress={() => handleUpdateStatus(value as OrderStatus)}
            >
              <Text style={[styles.statusBtnText, invoice.orderStatus === value && styles.statusBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>الأصناف</Text>
        {invoice.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemAmount}>
              <Text style={styles.itemTotal}>{formatMoney(item.lineTotal)}</Text>
              {item.lineSubtotal > item.lineTotal ? (
                <Text style={styles.discountText}>خصم {formatMoney(item.lineSubtotal - item.lineTotal)}</Text>
              ) : null}
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.productNameSnapshot}</Text>
              <Text style={styles.itemSub}>
                {formatQuantity(item.quantity)} {item.unitNameSnapshot} x {formatMoney(item.unitPrice)}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>الملخص المالي</Text>
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>مجموع الأصناف</Text>
          <Text style={styles.calcValue}>{formatMoney(invoice.subtotal)}</Text>
        </View>
        {invoiceDiscount > 0 ? (
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>خصم الفاتورة</Text>
            <Text style={styles.discountValue}>-{formatMoney(invoiceDiscount)}</Text>
          </View>
        ) : null}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>مجموع الفاتورة</Text>
          <Text style={styles.totalValue}>{formatMoney(invoice.total)}</Text>
        </View>
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>المدفوع</Text>
          <Text style={styles.paidValue}>{formatMoney(invoice.amountPaid)}</Text>
        </View>
        <View style={styles.remainingRow}>
          <Text style={styles.remainingLabel}>المتبقي</Text>
          <Text style={styles.remainingValue}>{formatMoney(invoice.remaining)}</Text>
        </View>

        {invoice.remaining > 0 ? (
          <Button title="تسجيل دفعة" onPress={() => setShowPaymentModal(true)} style={styles.payBtn} />
        ) : (
          <Text style={styles.paidNotice}>الفاتورة مسددة بالكامل</Text>
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>سجل الدفعات</Text>
        {payments.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد دفعات مسجلة</Text>
        ) : (
          payments.map((payment) => (
            <View key={payment.id} style={styles.paymentRow}>
              <View>
                <Text style={styles.paymentAmount}>{formatMoney(payment.amount)}</Text>
                <Text style={styles.paymentDate}>{new Date(payment.createdAt).toLocaleDateString('ar')}</Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentMethod}>نقدا</Text>
                {payment.notes ? <Text style={styles.paymentNotes}>{payment.notes}</Text> : null}
              </View>
            </View>
          ))
        )}
      </Card>

      <Modal visible={showPaymentModal} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>تسجيل دفعة</Text>
          <Text style={styles.modalSub}>المتبقي الحالي: {formatMoney(invoice.remaining)}</Text>
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <Input
            label="مبلغ الدفعة"
            placeholder="مثال: 50 أو 12.50"
            value={paymentAmountInput}
            onChangeText={setPaymentAmountInput}
            keyboardType="decimal-pad"
          />
          <Input
            label="ملاحظات"
            placeholder="مثال: دفعة نقدية"
            value={paymentNotes}
            onChangeText={setPaymentNotes}
          />
          <Button title="حفظ الدفعة" onPress={handleAddPayment} loading={loading} style={styles.modalPayBtn} />
          <Button title="إلغاء" onPress={() => setShowPaymentModal(false)} variant="outline" />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748B' },
  headerCard: { marginBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  titleBlock: { flex: 1, alignItems: 'flex-end' },
  invoiceNumber: { color: '#0F172A', fontWeight: 'bold', fontSize: 20 },
  customerName: { color: '#0284C7', fontWeight: 'bold', marginTop: 4, textAlign: 'right' },
  dateText: { color: '#64748B', fontSize: 12, marginTop: 4 },
  badgesCol: { gap: 4, alignItems: 'flex-start' },
  statusActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statusBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', alignItems: 'center' },
  statusBtnActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  statusBtnDanger: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  statusBtnText: { color: '#334155', fontWeight: 'bold' },
  statusBtnTextActive: { color: '#FFFFFF' },
  section: { marginBottom: 12 },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontWeight: 'bold', textAlign: 'right', marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 10, gap: 10 },
  itemInfo: { flex: 1, alignItems: 'flex-end' },
  itemName: { color: '#0F172A', fontWeight: 'bold', textAlign: 'right' },
  itemSub: { color: '#64748B', fontSize: 12, marginTop: 3, textAlign: 'right' },
  itemAmount: { minWidth: 110 },
  itemTotal: { color: '#0F172A', fontWeight: 'bold' },
  discountText: { color: '#B45309', fontSize: 12, marginTop: 3 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  calcLabel: { color: '#475569', fontWeight: '600' },
  calcValue: { color: '#0F172A', fontWeight: 'bold' },
  discountValue: { color: '#DC2626', fontWeight: 'bold' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', paddingVertical: 10, marginVertical: 6 },
  totalLabel: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
  totalValue: { color: '#0284C7', fontWeight: 'bold', fontSize: 18 },
  paidValue: { color: '#16A34A', fontWeight: 'bold' },
  remainingRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginTop: 6 },
  remainingLabel: { color: '#991B1B', fontWeight: 'bold' },
  remainingValue: { color: '#DC2626', fontWeight: 'bold', fontSize: 16 },
  payBtn: { backgroundColor: '#16A34A', marginTop: 12 },
  paidNotice: { color: '#16A34A', textAlign: 'center', fontWeight: 'bold', paddingVertical: 10 },
  emptyText: { color: '#94A3B8', textAlign: 'center', paddingVertical: 12 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  paymentAmount: { color: '#16A34A', fontWeight: 'bold' },
  paymentDate: { color: '#64748B', fontSize: 12, marginTop: 3 },
  paymentInfo: { flex: 1, alignItems: 'flex-end' },
  paymentMethod: { color: '#0F172A', fontWeight: 'bold' },
  paymentNotes: { color: '#64748B', fontSize: 12, marginTop: 3, textAlign: 'right' },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF', padding: 20, paddingTop: 48 },
  modalTitle: { color: '#0F172A', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  modalSub: { color: '#64748B', textAlign: 'center', marginBottom: 18 },
  modalPayBtn: { backgroundColor: '#16A34A', marginTop: 14 },
  errorBanner: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12, textAlign: 'right' },
});
