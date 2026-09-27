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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.kicker}>اليوم في دفتر التاجر</Text>
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
          onPress={() => router.push({ pathname: '/(app)/invoices/new', params: { draftId: String(Date.now()) } })}
          style={styles.primaryAction}
        />
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push('/(app)/customers/new')}>
            <Ionicons name="person-add-outline" size={19} color={BLUE} />
            <Text style={styles.secondaryActionText}>إضافة زبون</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push('/(app)/products/new')}>
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
              onPress={() => router.push(`/(app)/invoices/${invoice.id}`)}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: 16, paddingBottom: 28 },
  hero: {
    backgroundColor: BLUE,
    borderRadius: 18,
    padding: 18,
    minHeight: 118,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroText: { flex: 1, alignItems: 'flex-end' },
  kicker: { color: '#DCEBFF', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  title: { fontSize: 23, fontWeight: '900', color: '#FFFFFF', textAlign: 'right' },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, padding: 12, minHeight: 88, justifyContent: 'center' },
  debtCard: { flex: 1.35, padding: 12, minHeight: 88, justifyContent: 'center', backgroundColor: '#0B1220', borderColor: '#0B1220' },
  statLabel: { color: '#7A8699', fontSize: 12, textAlign: 'right', marginBottom: 6 },
  statLabelLight: { color: '#C9D7EA', fontSize: 12, textAlign: 'right', marginBottom: 6 },
  statValue: { color: '#0B1220', fontSize: 22, fontWeight: '900', textAlign: 'right' },
  debtValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', textAlign: 'right' },
  actionsCard: { marginBottom: 12 },
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
