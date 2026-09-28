import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { customersApi } from '../../../src/features/customers/api/customersApi';
import { invoicesApi } from '../../../src/features/invoices/api/invoicesApi';
import { formatMoney } from '../../../src/utils/money';
import { formatQuantity } from '../../../src/utils/quantity';
import { inventoryApi } from '../../../src/features/inventory/api/inventoryApi';

const BLUE = '#075FD8';

export default function DashboardScreen() {
  const router = useRouter();

  const { data: summaryRes } = useQuery({
    queryKey: ['customerDebtSummary'],
    queryFn: () => customersApi.getDebtSummary(),
  });

  const { data: invoicesRes } = useQuery({
    queryKey: ['invoices', 'dashboard'],
    queryFn: () => invoicesApi.getInvoices('', 1),
  });

  const summary = summaryRes?.data;
  const invoices = invoicesRes?.data || [];
  const { data: lowStockRes } = useQuery({ queryKey: ['lowStock'], queryFn: () => inventoryApi.getLowStock() });
  const lowStockItems = lowStockRes?.data || [];
  const lowStockCount = lowStockItems.length;
  const lowStockSummary = lowStockItems
    .slice(0, 2)
    .map((product) => `${product.name}: ${formatQuantity(product.stockQuantity)} ${product.unitNameAr}`)
    .join('، ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.kicker}>دفتر التاجر</Text>
          <Text style={styles.title}>تابع البيع والذمم بسرعة</Text>
        </View>
        <View style={styles.heroIcon}>
          <Ionicons name="storefront" size={34} color="#FFFFFF" />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.debtCard}>
          <Text style={styles.statLabelLight}>إجمالي الذمم</Text>
          <Text style={styles.debtValue}>{formatMoney(summary?.totalRemaining || 0)}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>زبائن</Text>
          <Text style={styles.statValue}>{summary?.activeCustomers || 0}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>طلبيات مفتوحة</Text>
          <Text style={styles.statValue}>{summary?.openInvoices || 0}</Text>
        </Card>
      </View>

      <Card style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>إجراء سريع</Text>
        <Button
          title="إنشاء طلبية جديدة"
          onPress={() => router.push({ pathname: '/(app)/invoices/new', params: { draftId: String(Date.now()), returnTo: '/(app)/dashboard' } })}
          style={styles.primaryAction}
        />
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push({ pathname: '/(app)/customers/new', params: { returnTo: '/(app)/dashboard' } })}>
            <Ionicons name="person-add-outline" size={19} color={BLUE} />
            <Text style={styles.secondaryActionText}>إضافة زبون</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push({ pathname: '/(app)/products/new', params: { returnTo: '/(app)/dashboard' } })}>
            <Ionicons name="cube-outline" size={19} color={BLUE} />
            <Text style={styles.secondaryActionText}>إضافة منتج</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => router.push('/(app)/invoices')}>
            <Text style={styles.linkText}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>آخر الطلبيات</Text>
        </View>

        {invoices.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد طلبيات بعد</Text>
        ) : (
          invoices.slice(0, 5).map((invoice) => (
            <TouchableOpacity
              key={invoice.id}
              style={styles.invoiceRow}
              onPress={() => router.push({ pathname: '/(app)/invoices/[id]', params: { id: invoice.id, returnTo: '/(app)/dashboard' } })}
            >
              <View style={styles.invoiceAmounts}>
                <Text style={styles.invoiceTotal}>{formatMoney(invoice.total)}</Text>
                <Text style={invoice.remaining > 0 ? styles.remainingText : styles.paidText}>
                  {invoice.remaining > 0 ? `متبقي ${formatMoney(invoice.remaining)}` : 'مدفوعة'}
                </Text>
              </View>
              <View style={styles.invoiceInfo}>
                <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                <Text style={styles.invoiceCustomer}>{invoice.customerName}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </Card>

      <TouchableOpacity style={[styles.inventoryNote, lowStockCount ? styles.inventoryWarning : styles.inventoryHealthy]} onPress={() => router.push('/(app)/products')}>
        <Ionicons name={lowStockCount ? 'alert-circle-outline' : 'cube-outline'} size={21} color={lowStockCount ? '#B45309' : '#16A34A'} />
        <View style={styles.inventoryNoteText}>
          <Text style={[styles.inventoryNoteTitle, lowStockCount ? styles.inventoryWarningText : styles.inventoryHealthyText]}>المخزون</Text>
          <Text style={styles.inventoryNoteSub}>
            {lowStockCount
              ? `${lowStockSummary}${lowStockCount > 2 ? `، و${lowStockCount - 2} أصناف أخرى` : ''}`
              : 'لا توجد أصناف تحتاج تحديثاً'}
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: 16, paddingBottom: 28 },
  hero: {
    backgroundColor: BLUE,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minHeight: 78,
    marginBottom: 12,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { alignItems: 'center', justifyContent: 'center' },
  kicker: { color: '#DCEBFF', fontSize: 13, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
  },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, padding: 12, minHeight: 90, justifyContent: 'center' },
  debtCard: { flex: 1.35, padding: 12, minHeight: 90, justifyContent: 'center', backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statLabel: { color: '#7A8699', fontSize: 13, textAlign: 'right', marginBottom: 6 },
  statLabelLight: { color: '#991B1B', fontSize: 13, textAlign: 'right', marginBottom: 6 },
  statValue: { color: '#0B1220', fontSize: 24, fontWeight: '900', textAlign: 'right' },
  debtValue: { color: '#DC2626', fontSize: 22, fontWeight: '900', textAlign: 'right' },
  actionsCard: { marginBottom: 12 },
  inventoryNote: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, marginTop: 8 }, inventoryHealthy: { backgroundColor: '#F0FDF4' }, inventoryWarning: { backgroundColor: '#FFF7ED' }, inventoryNoteText: { flex: 1, alignItems: 'flex-end' }, inventoryNoteTitle: { fontWeight: '900' }, inventoryHealthyText: { color: '#15803D' }, inventoryWarningText: { color: '#B45309' }, inventoryNoteSub: { color: '#7A8699', fontSize: 12, marginTop: 2, textAlign: 'right' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { color: '#0B1220', fontSize: 16, fontWeight: '900', textAlign: 'right', marginBottom: 10 },
  primaryAction: { backgroundColor: BLUE },
  actionsRow: { flexDirection: 'row', gap: 8 },
  secondaryAction: { flex: 1, backgroundColor: '#EAF2FF', borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 5 },
  secondaryActionText: { color: BLUE, fontWeight: '900' },
  linkText: { color: BLUE, fontWeight: '900' },
  emptyText: { color: '#9AA6B8', textAlign: 'center', paddingVertical: 18 },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#EEF3FA' },
  invoiceInfo: { flex: 1, alignItems: 'flex-end' },
  invoiceNumber: { color: '#0B1220', fontWeight: '900' },
  invoiceCustomer: { color: '#7A8699', fontSize: 12, marginTop: 2 },
  invoiceAmounts: { minWidth: 112, alignItems: 'flex-start' },
  invoiceTotal: { color: '#0B1220', fontWeight: '900' },
  remainingText: { color: '#DC2626', fontSize: 12, fontWeight: '900', marginTop: 2 },
  paidText: { color: '#16A34A', fontSize: 12, fontWeight: '900', marginTop: 2 },
});
