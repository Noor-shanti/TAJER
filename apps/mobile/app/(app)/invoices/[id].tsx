import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Invoice } from '@merchant/shared';
import { Badge } from '../../../src/components/common/Badge';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { invoicesApi } from '../../../src/features/invoices/api/invoicesApi';
import { formatMoney, parseMoneyInput } from '../../../src/utils/money';
import { formatQuantity, formatQuantitySummary } from '../../../src/utils/quantity';

type OrderStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function paymentLabel(status: string) {
  if (status === 'PAID') return 'مدفوعة';
  if (status === 'PARTIALLY_PAID') return 'دفع جزئي';
  return 'غير مدفوعة';
}

function orderLabel(status: string) {
  if (status === 'COMPLETED') return 'تم التسليم';
  if (status === 'CANCELLED') return 'ملغاة';
  return 'قيد التجهيز';
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char] || char);
}

function invoiceHtml(invoice: Invoice) {
  const itemsSubtotal = invoice.items.reduce((sum, item) => sum + item.lineSubtotal, 0);
  const itemDiscount = Math.max(0, itemsSubtotal - invoice.subtotal);
  const invoiceDiscount = Math.max(0, invoice.subtotal - invoice.total);
  const quantitySummary = formatQuantitySummary(invoice.items.map((item) => ({ quantity: item.quantity, unitName: item.unitNameSnapshot })));
  const rows = invoice.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.productNameSnapshot)}</td>
      <td>${formatQuantity(item.quantity)} ${escapeHtml(item.unitNameSnapshot)}</td>
      <td>${formatMoney(item.unitPrice)}</td>
      <td>${formatMoney(item.lineTotal)}</td>
    </tr>
  `).join('');

  return `
    <html dir="rtl">
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; direction: rtl; padding: 24px; color: #111827; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #075FD8; padding-bottom: 12px; margin-bottom: 18px; }
          h1 { margin: 0 0 6px; color: #075FD8; font-size: 26px; }
          .muted { color: #64748B; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border-bottom: 1px solid #E5E7EB; padding: 10px 8px; text-align: right; font-size: 13px; }
          th { background: #F1F5F9; color: #334155; }
          .summary { margin-top: 18px; width: 100%; }
          .line { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #EEF2F7; }
          .total { font-size: 18px; font-weight: 800; color: #075FD8; }
          .remaining { color: #DC2626; font-weight: 800; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>فاتورة بيع</h1>
            <div class="muted">دفتر التاجر</div>
          </div>
          <div>
            <strong>${escapeHtml(invoice.invoiceNumber)}</strong><br />
            <span class="muted">${new Date(invoice.createdAt).toLocaleDateString('ar')}</span>
          </div>
        </div>
        <div><strong>الزبون:</strong> ${escapeHtml(invoice.customerName)}</div>
        <div><strong>حالة الدفع:</strong> ${paymentLabel(invoice.paymentStatus)}</div>
        <div><strong>حالة الطلبية:</strong> ${orderLabel(invoice.orderStatus)}</div>

        <table>
          <thead>
            <tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="summary">
          <div class="line"><span>عدد الأنواع</span><strong>${invoice.items.length}</strong></div>
          <div class="line"><span>إجمالي الكمية</span><strong>${quantitySummary}</strong></div>
          <div class="line"><span>إجمالي الأصناف قبل الخصم</span><strong>${formatMoney(itemsSubtotal)}</strong></div>
          ${itemDiscount > 0 ? `<div class="line"><span>خصم الأصناف</span><strong>${formatMoney(itemDiscount)}</strong></div>` : ''}
          <div class="line"><span>إجمالي الأصناف بعد الخصم</span><strong>${formatMoney(invoice.subtotal)}</strong></div>
          ${invoiceDiscount > 0 ? `<div class="line"><span>خصم الفاتورة</span><strong>${formatMoney(invoiceDiscount)}</strong></div>` : ''}
          <div class="line"><span>إجمالي الفاتورة</span><strong class="total">${formatMoney(invoice.total)}</strong></div>
          <div class="line"><span>المدفوع</span><strong>${formatMoney(invoice.amountPaid)}</strong></div>
          <div class="line"><span>المتبقي</span><strong class="remaining">${formatMoney(invoice.remaining)}</strong></div>
        </div>
      </body>
    </html>
  `;
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
    queryClient.invalidateQueries({ queryKey: ['customerDetail'] });
    queryClient.invalidateQueries({ queryKey: ['customerDebtSummary'] });
    queryClient.invalidateQueries({ queryKey: ['customerInvoices'] });
    queryClient.invalidateQueries({ queryKey: ['salesReport'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['productsSelect'] });
    queryClient.invalidateQueries({ queryKey: ['productDetail'] });
    queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
    queryClient.invalidateQueries({ queryKey: ['lowStock'] });
  };

  const handlePrint = async () => {
    if (!invoice) return;
    try {
      await Print.printAsync({ html: invoiceHtml(invoice) });
    } catch {
      Alert.alert('تعذر فتح الطباعة', 'تأكد من وجود طابعة أو جرّب مشاركة ملف PDF.');
    }
  };

  const handleShare = async () => {
    if (!invoice) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('المشاركة غير متاحة', 'هذا الجهاز لا يدعم مشاركة الملفات من هنا.');
        return;
      }
      const file = await Print.printToFileAsync({ html: invoiceHtml(invoice) });
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `مشاركة الفاتورة ${invoice.invoiceNumber}`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('تعذرت مشاركة الفاتورة', 'حاول مرة أخرى أو استخدم خيار الطباعة لحفظها كملف PDF.');
    }
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

  const requestStatusUpdate = (orderStatus: OrderStatus) => {
    if (orderStatus !== 'CANCELLED') {
      void handleUpdateStatus(orderStatus);
      return;
    }
    Alert.alert('إلغاء الفاتورة', 'سيتم استبعادها من الذمم والمبيعات، وإرجاع كمياتها إلى المتوفر.', [
      { text: 'رجوع', style: 'cancel' },
      { text: 'إلغاء الفاتورة', style: 'destructive', onPress: () => void handleUpdateStatus('CANCELLED') },
    ]);
  };

  if (isLoading || !invoice) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>جاري تحميل الطلبية...</Text>
      </View>
    );
  }

  const itemsSubtotal = invoice.items.reduce((sum, item) => sum + item.lineSubtotal, 0);
  const itemDiscount = Math.max(0, itemsSubtotal - invoice.subtotal);
  const invoiceDiscount = Math.max(0, invoice.subtotal - invoice.total);
  const quantitySummary = formatQuantitySummary(invoice.items.map((item) => ({ quantity: item.quantity, unitName: item.unitNameSnapshot })));
  const payments = invoice.payments || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      <Card style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Badge
            label={paymentLabel(invoice.paymentStatus)}
            variant={invoice.paymentStatus === 'PAID' ? 'success' : invoice.paymentStatus === 'PARTIALLY_PAID' ? 'warning' : 'danger'}
          />
          <View style={styles.titleBlock}>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/customers/[id]', params: { id: invoice.customerId, returnTo: `/(app)/invoices/${invoiceId}` } })}>
              <Text style={styles.customerName}>{invoice.customerName}</Text>
            </TouchableOpacity>
            <Text style={styles.dateText}>{new Date(invoice.createdAt).toLocaleDateString('ar')}</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <Button title="مشاركة PDF" onPress={handleShare} variant="secondary" style={styles.actionBtn} />
          <Button title="طباعة" onPress={handlePrint} style={styles.actionBtn} />
        </View>
      </Card>

      <Card style={styles.section}>
        <View style={styles.statusHeader}>
          <Badge label={orderLabel(invoice.orderStatus)} variant={invoice.orderStatus === 'CANCELLED' ? 'danger' : 'info'} />
          <View style={styles.statusTitleBlock}>
            <Text style={styles.sectionTitleNoMargin}>حالة الطلبية</Text>
            {invoice.orderStatus === 'CANCELLED' ? <Text style={styles.statusHint}>تم إرجاع الأصناف إلى المتوفر.</Text> : null}
          </View>
        </View>
        {invoice.orderStatus !== 'CANCELLED' ? <View style={styles.statusActions}>
          {invoice.orderStatus === 'CONFIRMED' ? <Button title="تم التسليم" onPress={() => requestStatusUpdate('COMPLETED')} loading={statusLoading} style={styles.deliveryButton} /> : null}
          <Button title="إلغاء الفاتورة" onPress={() => requestStatusUpdate('CANCELLED')} loading={statusLoading} variant="outline" style={styles.cancelButton} />
        </View> : null}
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
        <View style={styles.orderSummaryRow}>
          <View><Text style={styles.orderSummaryLabel}>عدد الأنواع</Text><Text style={styles.orderSummaryValue}>{invoice.items.length}</Text></View>
          <View style={styles.orderSummaryRight}><Text style={styles.orderSummaryLabel}>إجمالي الكمية</Text><Text style={styles.orderSummaryValue}>{quantitySummary}</Text></View>
        </View>
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>إجمالي الأصناف قبل الخصم</Text>
          <Text style={styles.calcValue}>{formatMoney(itemsSubtotal)}</Text>
        </View>
        {itemDiscount > 0 ? (
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>خصم الأصناف</Text>
            <Text style={styles.discountValue}>-{formatMoney(itemDiscount)}</Text>
          </View>
        ) : null}
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>إجمالي الأصناف بعد الخصم</Text>
          <Text style={styles.calcValue}>{formatMoney(invoice.subtotal)}</Text>
        </View>
        {invoiceDiscount > 0 ? (
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>خصم الفاتورة</Text>
            <Text style={styles.discountValue}>-{formatMoney(invoiceDiscount)}</Text>
          </View>
        ) : null}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>إجمالي الفاتورة</Text>
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
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748B' },
  headerCard: { marginBottom: 12 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  titleBlock: { flex: 1, alignItems: 'flex-end' },
  invoiceNumber: { color: '#0B1220', fontWeight: 'bold', fontSize: 20 },
  customerName: { color: '#075FD8', fontWeight: 'bold', marginTop: 4, textAlign: 'right' },
  dateText: { color: '#64748B', fontSize: 12, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, height: 44 },
  section: { marginBottom: 12 },
  sectionTitle: { color: '#0B1220', fontSize: 16, fontWeight: 'bold', textAlign: 'right', marginBottom: 10 },
  sectionTitleNoMargin: { color: '#0B1220', fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  statusTitleBlock: { flex: 1, alignItems: 'flex-end' },
  statusHint: { color: '#7A8699', fontSize: 12, lineHeight: 18, textAlign: 'right', marginTop: 3 },
  statusActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  deliveryButton: { flex: 1, marginVertical: 0 },
  cancelButton: { flex: 1, marginVertical: 0, borderColor: '#FCA5A5' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 10, gap: 10 },
  itemInfo: { flex: 1, alignItems: 'flex-end' },
  itemName: { color: '#0B1220', fontWeight: 'bold', textAlign: 'right' },
  itemSub: { color: '#64748B', fontSize: 12, marginTop: 3, textAlign: 'right' },
  itemAmount: { minWidth: 110 },
  itemTotal: { color: '#0B1220', fontWeight: 'bold' },
  discountText: { color: '#B45309', fontSize: 12, marginTop: 3 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  orderSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#EAF2FF', borderRadius: 8, padding: 10, marginBottom: 8 },
  orderSummaryRight: { alignItems: 'flex-end', flex: 1 }, orderSummaryLabel: { color: '#52657C', fontSize: 12 }, orderSummaryValue: { color: '#075FD8', fontWeight: '900', marginTop: 3 },
  calcLabel: { color: '#475569', fontWeight: '600' },
  calcValue: { color: '#0B1220', fontWeight: 'bold' },
  discountValue: { color: '#DC2626', fontWeight: 'bold' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', paddingVertical: 10, marginVertical: 6 },
  totalLabel: { color: '#0B1220', fontWeight: 'bold', fontSize: 16 },
  totalValue: { color: '#075FD8', fontWeight: 'bold', fontSize: 18 },
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
  paymentMethod: { color: '#0B1220', fontWeight: 'bold' },
  paymentNotes: { color: '#64748B', fontSize: 12, marginTop: 3, textAlign: 'right' },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF', padding: 20, paddingTop: 48 },
  modalTitle: { color: '#0B1220', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  modalSub: { color: '#64748B', textAlign: 'center', marginBottom: 18 },
  modalPayBtn: { backgroundColor: '#16A34A', marginTop: 14 },
  errorBanner: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12, textAlign: 'right' },
});
