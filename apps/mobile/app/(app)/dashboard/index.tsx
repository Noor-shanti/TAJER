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

  const totalRemainingBalance = customers.reduce((sum, c) => sum + (c.totalRemaining || 0), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.welcomeText}>مرحباً بك، التاجر 👋</Text>
      <Text style={styles.subWelcome}>لوحة التحكم وإدارة مبيعات المحل</Text>

      {/* Main Stats Cards */}
      <View style={styles.statsRow}>
        <Card style={[styles.statCard, styles.dangerCard]}>
          <Text style={styles.statLabel}>إجمالي الديون المتبقية</Text>
          <Text style={styles.statValueDanger}>{formatMoney(totalRemainingBalance)}</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>عدد الزبائن</Text>
          <Text style={styles.statValue}>{customersRes?.meta?.total || 0}</Text>
        </Card>
      </View>

      {/* Quick Action Buttons */}
      <Card style={styles.quickActionCard}>
        <Text style={styles.sectionTitle}>العمليات السريعة</Text>

        <Button
          title="➕ طلبية جديدة (إصدار فاتورة)"
          onPress={() => router.push('/(app)/invoices/new')}
          style={styles.actionButton}
        />

        <View style={styles.secondaryActionsRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(app)/customers/new')}
          >
            <Text style={styles.secondaryBtnText}>👤 إضافة زبون</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(app)/products/new')}
          >
            <Text style={styles.secondaryBtnText}>📦 إضافة منتج</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Quick Links Section */}
      <View style={styles.navLinksRow}>
        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/(app)/customers')}
        >
          <Text style={styles.navTitle}>👥 الزبائن والديون</Text>
          <Text style={styles.navSub}>عرض السجل والذمم</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/(app)/products')}
        >
          <Text style={styles.navTitle}>🏷️ المنتجات والأسعار</Text>
          <Text style={styles.navSub}>تعديل وإضافة الأصناف</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Invoices List */}
      <Card style={styles.recentCard}>
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>آخر الطلبيات والبيع</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/invoices')}>
            <Text style={styles.linkText}>عرض الكل</Text>
          </TouchableOpacity>
        </View>

        {invoices.length === 0 ? (
          <Text style={styles.emptyText}>لا يوجد طلبيات مسجلة حتى الآن</Text>
        ) : (
          invoices.slice(0, 5).map((inv) => (
            <TouchableOpacity
              key={inv.id}
              style={styles.invoiceRow}
              onPress={() => router.push(`/(app)/invoices/${inv.id}`)}
            >
              <View>
                <Text style={styles.invNumber}>{inv.invoiceNumber}</Text>
                <Text style={styles.invCustomer}>{inv.customerName}</Text>
              </View>
              <View style={styles.invRight}>
                <Text style={styles.invTotal}>{formatMoney(inv.total)}</Text>
                <Text style={inv.remaining > 0 ? styles.invUnpaid : styles.invPaid}>
                  {inv.remaining > 0 ? `متبقي: ${formatMoney(inv.remaining)}` : 'مدفوعة'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </Card>
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
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
  },
  subWelcome: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'right',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
  },
  dangerCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  statLabel: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  statValueDanger: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#0284C7',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  navLinksRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  navCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
  },
  navSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 2,
  },
  recentCard: {
    marginTop: 4,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  linkText: {
    color: '#0284C7',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    paddingVertical: 16,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  invNumber: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  invCustomer: {
    fontSize: 12,
    color: '#64748B',
  },
  invRight: {
    alignItems: 'flex-end',
  },
  invTotal: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  invUnpaid: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: 'bold',
  },
  invPaid: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: 'bold',
  },
});
