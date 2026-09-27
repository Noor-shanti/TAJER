import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { customersApi } from '../../../src/features/customers/api/customersApi';
import { invoicesApi } from '../../../src/features/invoices/api/invoicesApi';
import { formatMoney } from '../../../src/utils/money';

export default function DashboardScreen() {
  const router = useRouter();

  const { data: customersRes } = useQuery({
    queryKey: ['customers', 'dashboard'],
    queryFn: () => customersApi.getCustomers('', 1),
  });

  const { data: invoicesRes } = useQuery({
    queryKey: ['invoices', 'dashboard'],
    queryFn: () => invoicesApi.getInvoices('', 1),
  });

  const customers = customersRes?.data || [];
  const invoices = invoicesRes?.data || [];
  const totalRemaining = customers.reduce((sum, customer) => sum + (customer.totalRemaining || 0), 0);
  const openInvoices = invoices.filter((invoice) => invoice.remaining > 0).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>إدارة المبيعات</Text>
        <Text style={styles.subtitle}>تابع الزبائن والطلبيات والديون من مكان واحد</Text>
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>إجمالي الذمم</Text>
          <Text style={styles.debtValue}>{formatMoney(totalRemaining)}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>زبائن نشطون</Text>
          <Text style={styles.statValue}>{customersRes?.meta?.total || customers.length}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>طلبيات مفتوحة</Text>
          <Text style={styles.statValue}>{openInvoices}</Text>
        </Card>
      </View>

      <Card style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>إجراء سريع</Text>
        <Button
          title="إنشاء طلبية جديدة"
          onPress={() => router.push('/(app)/invoices/new')}
          style={styles.primaryAction}
        />
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push('/(app)/customers/new')}>
            <Text style={styles.secondaryActionText}>إضافة زبون</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction} onPress={() => router.push('/(app)/products/new')}>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  header: { marginBottom: 14 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', textAlign: 'right' },
  subtitle: { color: '#64748B', textAlign: 'right', marginTop: 4 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, padding: 12, minHeight: 92, justifyContent: 'center' },
  statLabel: { color: '#64748B', fontSize: 12, textAlign: 'right', marginBottom: 6 },
  statValue: { color: '#0F172A', fontSize: 22, fontWeight: 'bold', textAlign: 'right' },
  debtValue: { color: '#DC2626', fontSize: 17, fontWeight: 'bold', textAlign: 'right' },
  actionsCard: { marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { color: '#0F172A', fontSize: 16, fontWeight: 'bold', textAlign: 'right', marginBottom: 10 },
  primaryAction: { backgroundColor: '#0284C7' },
  actionsRow: { flexDirection: 'row', gap: 8 },
  secondaryAction: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  secondaryActionText: { color: '#0F172A', fontWeight: 'bold' },
  linkText: { color: '#0284C7', fontWeight: 'bold' },
  emptyText: { color: '#94A3B8', textAlign: 'center', paddingVertical: 18 },
  invoiceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  invoiceInfo: { flex: 1, alignItems: 'flex-end' },
  invoiceNumber: { color: '#0F172A', fontWeight: 'bold' },
  invoiceCustomer: { color: '#64748B', fontSize: 12, marginTop: 2 },
  invoiceAmounts: { minWidth: 112, alignItems: 'flex-start' },
  invoiceTotal: { color: '#0F172A', fontWeight: 'bold' },
  remainingText: { color: '#DC2626', fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  paidText: { color: '#16A34A', fontSize: 12, fontWeight: 'bold', marginTop: 2 },
});
