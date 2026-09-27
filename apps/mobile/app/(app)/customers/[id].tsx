import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '../../../src/components/common/Badge';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { customersApi } from '../../../src/features/customers/api/customersApi';
import { invoicesApi } from '../../../src/features/invoices/api/invoicesApi';
import { formatMoney } from '../../../src/utils/money';

export default function CustomerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = Number(id);

  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UNPAID'>('UNPAID');

  const { data: customerRes } = useQuery({
    queryKey: ['customerDetail', customerId],
    queryFn: () => customersApi.getCustomerById(customerId),
  });

  const { data: invoicesRes, isLoading, refetch } = useQuery({
    queryKey: ['customerInvoices', customerId],
    queryFn: () => invoicesApi.getInvoices('', 1),
  });

  const customer = customerRes?.data;
  // Filter invoices for this specific customer
  const allCustomerInvoices = (invoicesRes?.data || []).filter(
    (inv) => !customer || inv.customerName === customer.name
  );

  const filteredInvoices = allCustomerInvoices.filter((inv) => {
    if (filterStatus === 'UNPAID') return inv.remaining > 0;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Customer Header Info */}
      <Card style={styles.headerCard}>
        <Text style={styles.customerName}>{customer?.name || 'الزبون'}</Text>
        {customer?.phone ? <Text style={styles.phoneText}>📞 {customer.phone}</Text> : null}

        <View style={styles.debtBanner}>
          <Text style={styles.debtLabel}>إجمالي الديون والذمم المتبقية:</Text>
          <Text style={customer?.totalRemaining ? styles.debtValueDanger : styles.debtValueClean}>
            {formatMoney(customer?.totalRemaining || 0)}
          </Text>
        </View>

        <Button
          title="➕ طلبية جديدة لهذا الزبون"
          onPress={() =>
            router.push({
              pathname: '/(app)/invoices/new',
              params: { customerId, customerName: customer?.name },
            })
          }
          style={styles.newInvoiceBtn}
        />
      </Card>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'UNPAID' && styles.filterChipActive]}
          onPress={() => setFilterStatus('UNPAID')}
        >
          <Text style={[styles.filterText, filterStatus === 'UNPAID' && styles.filterTextActive]}>
            الذمم غير المدفوعة فقط
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'ALL' && styles.filterChipActive]}
          onPress={() => setFilterStatus('ALL')}
        >
          <Text style={[styles.filterText, filterStatus === 'ALL' && styles.filterTextActive]}>
            جميع الطلبيات والسجل
          </Text>
        </TouchableOpacity>
      </View>

      {/* Invoices List for Customer */}
      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.emptyText}>
              {filterStatus === 'UNPAID' ? 'لا يوجد فواتير متبقية غير مدفوعة على هذا الزبون 🎉' : 'لا يوجد طلبيات مسجلة لهذا الزبون'}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(app)/invoices/${item.id}`)}>
            <Card style={styles.invCard}>
              <View style={styles.invHeaderRow}>
                <Text style={styles.invNumber}>{item.invoiceNumber}</Text>
                <Badge
                  label={
                    item.paymentStatus === 'PAID'
                      ? 'مدفوعة'
                      : item.paymentStatus === 'PARTIALLY_PAID'
                      ? 'متبقي جزئي'
                      : 'غير مدفوعة'
                  }
                  variant={
                    item.paymentStatus === 'PAID'
                      ? 'success'
                      : item.paymentStatus === 'PARTIALLY_PAID'
                      ? 'warning'
                      : 'danger'
                  }
                />
              </View>

              <View style={styles.invTotalsRow}>
                <View>
                  <Text style={styles.smallLabel}>مجموع الفاتورة:</Text>
                  <Text style={styles.valText}>{formatMoney(item.total)}</Text>
                </View>

                <View style={styles.alignRight}>
                  <Text style={styles.smallLabel}>المتبقي من هذه الفاتورة:</Text>
                  <Text style={item.remaining > 0 ? styles.remDanger : styles.remClean}>
                    {formatMoney(item.remaining)}
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
  },
  phoneText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 2,
  },
  debtBanner: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  debtLabel: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: 'bold',
  },
  debtValueDanger: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  debtValueClean: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  newInvoiceBtn: {
    marginTop: 12,
    backgroundColor: '#0F172A',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  filterText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 20,
    fontSize: 14,
  },
  invCard: {
    marginBottom: 10,
  },
  invHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  invTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  smallLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  valText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  remDanger: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  remClean: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#16A34A',
  },
});
