import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Badge } from '../../../src/components/common/Badge';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { invoicesApi } from '../../../src/features/invoices/api/invoicesApi';
import { formatMoney, parseMoneyInput } from '../../../src/utils/money';
import { formatQuantity } from '../../../src/utils/quantity';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const invoiceId = Number(id);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoiceDetail', invoiceId],
    queryFn: () => invoicesApi.getInvoiceById(invoiceId),
  });

  const invoice = data?.data;

  const handleAddPayment = async () => {
    const amountMinor = parseMoneyInput(paymentAmountInput);
    if (amountMinor <= 0) {
      setError('يرجى إدخال مبلغ دفع أكبر من صفر');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await invoicesApi.addPayment(invoiceId, {
        amount: amountMinor,
        paymentMethod: 'CASH',
        notes: paymentNotes.trim() || undefined,
        idempotencyKey: Crypto.randomUUID(),
      });

      setShowPaymentModal(false);
      setPaymentAmountInput('');
      setPaymentNotes('');
      refetch();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في إضافة الدفعة');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !invoice) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>جاري تحميل تفاصيل الفاتورة...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.invNumber}>{invoice.invoiceNumber}</Text>
          <Badge
            label={
              invoice.paymentStatus === 'PAID'
                ? 'مدفوعة بالكامل'
                : invoice.paymentStatus === 'PARTIALLY_PAID'
                ? 'مدفوعة جزئياً'
                : 'غير مدفوعة'
            }
            variant={
              invoice.paymentStatus === 'PAID'
                ? 'success'
                : invoice.paymentStatus === 'PARTIALLY_PAID'
                ? 'warning'
                : 'danger'
            }
          />
        </View>

        <Text style={styles.customerName}>الزبون: {invoice.customerName}</Text>
        <Text style={styles.dateText}>تاريخ الفاتورة: {new Date(invoice.createdAt).toLocaleDateString('ar')}</Text>
      </Card>

      {/* Items Breakdown */}
      <Card>
        <Text style={styles.sectionTitle}>أصناف الطلبية</Text>
        {invoice.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View>
              <Text style={styles.itemName}>{item.productNameSnapshot}</Text>
              <Text style={styles.itemSub}>
                {formatQuantity(item.quantity)} {item.unitNameSnapshot} × {formatMoney(item.unitPrice)}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{formatMoney(item.lineTotal)}</Text>
          </View>
        ))}
      </Card>

      {/* Financial Summary & Action */}
      <Card style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>الملخص المالي</Text>

        <View style={styles.calcRow}>
          <Text style={styles.label}>مجموع الأصناف:</Text>
          <Text style={styles.val}>{formatMoney(invoice.subtotal)}</Text>
        </View>

        <View style={styles.calcRowHighlight}>
          <Text style={styles.labelBold}>المجموع النهائي:</Text>
          <Text style={styles.valBold}>{formatMoney(invoice.total)}</Text>
        </View>

        <View style={styles.calcRow}>
          <Text style={styles.label}>إجمالي المدفوع:</Text>
          <Text style={styles.valGreen}>{formatMoney(invoice.amountPaid)}</Text>
        </View>

        <View style={styles.calcRowDanger}>
          <Text style={styles.labelDanger}>المتبقي غير المدفوع:</Text>
          <Text style={styles.valDanger}>{formatMoney(invoice.remaining)}</Text>
        </View>

        {invoice.remaining > 0 ? (
          <Button
            title="💳 تسديد دفعة جديدة"
            onPress={() => setShowPaymentModal(true)}
            style={styles.payBtn}
          />
        ) : (
          <Text style={styles.paidNotice}>✨ هذه الفاتورة مسددة بالكامل ولا يوجد متبقي</Text>
        )}
      </Card>

      {/* Add Payment Modal */}
      <Modal visible={showPaymentModal} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>تسجيل دفعة جديدة للفاتورة</Text>
          <Text style={styles.modalSub}>المتبقي الحالي: {formatMoney(invoice.remaining)}</Text>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <Input
            label="مبلغ الدفعة (بالشيكل) *"
            placeholder="مثال: 50"
            value={paymentAmountInput}
            onChangeText={setPaymentAmountInput}
            keyboardType="decimal-pad"
          />

          <Input
            label="ملاحظات الدفعة"
            placeholder="مثال: دفعة نقدية تسليم يد"
            value={paymentNotes}
            onChangeText={setPaymentNotes}
          />

          <Button
            title="حفظ وتسديد الدفعة"
            onPress={handleAddPayment}
            loading={loading}
            style={styles.modalPayBtn}
          />

          <Button
            title="إلغاء"
            onPress={() => setShowPaymentModal(false)}
            variant="outline"
            style={styles.modalCancelBtn}
          />
        </View>
      </Modal>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748B',
  },
  headerCard: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  customerName: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '600',
    textAlign: 'right',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  itemSub: {
    fontSize: 12,
    color: '#64748B',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  summaryCard: {
    marginTop: 12,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  calcRowHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 6,
  },
  calcRowDanger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  label: {
    color: '#475569',
  },
  val: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  labelBold: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  valBold: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#0284C7',
  },
  valGreen: {
    fontWeight: 'bold',
    color: '#16A34A',
  },
  labelDanger: {
    fontWeight: 'bold',
    color: '#991B1B',
  },
  valDanger: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#DC2626',
  },
  payBtn: {
    backgroundColor: '#16A34A',
    marginTop: 12,
  },
  paidNotice: {
    textAlign: 'center',
    color: '#16A34A',
    fontWeight: 'bold',
    paddingVertical: 10,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalPayBtn: {
    backgroundColor: '#16A34A',
    marginTop: 16,
  },
  modalCancelBtn: {
    marginTop: 8,
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
