import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Badge } from '../../../src/components/common/Badge';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { invoicesApi } from '../../../src/features/invoices/api/invoicesApi';
import { formatMoney } from '../../../src/utils/money';

type Filter = 'ALL' | 'OPEN' | 'PAID' | 'CANCELLED';

export default function InvoicesListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoicesList', search],
    queryFn: () => invoicesApi.getInvoices(search, 1),
  });

  const invoices = data?.data || [];
  const visibleInvoices = useMemo(() => {
    if (filter === 'OPEN') return invoices.filter((invoice) => invoice.remaining > 0 && invoice.orderStatus !== 'CANCELLED');
    if (filter === 'PAID') return invoices.filter((invoice) => invoice.paymentStatus === 'PAID');
    if (filter === 'CANCELLED') return invoices.filter((invoice) => invoice.orderStatus === 'CANCELLED');
    return invoices;
  }, [filter, invoices]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Input
          placeholder="ابحث برقم الطلبية أو اسم الزبون"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        <Button title="طلبية جديدة" onPress={() => router.push('/(app)/invoices/new')} style={styles.addBtn} />

        <View style={styles.filtersRow}>
          {[
            ['ALL', 'الكل'],
            ['OPEN', 'ذمم'],
            ['PAID', 'مدفوعة'],
            ['CANCELLED', 'ملغاة'],
          ].map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[styles.filterChip, filter === value && styles.filterChipActive]}
              onPress={() => setFilter(value as Filter)}
            >
              <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={visibleInvoices}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>لا توجد طلبيات مطابقة</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(app)/invoices/${item.id}`)}>
            <Card style={styles.invoiceCard}>
              <View style={styles.cardHeader}>
                <View style={styles.badges}>
                  <Badge
                    label={
                      item.paymentStatus === 'PAID'
                        ? 'مدفوعة'
                        : item.paymentStatus === 'PARTIALLY_PAID'
                        ? 'دفع جزئي'
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
                  <Badge
                    label={
                      item.orderStatus === 'CONFIRMED'
                        ? 'مؤكدة'
                        : item.orderStatus === 'COMPLETED'
                        ? 'مكتملة'
                        : 'ملغاة'
                    }
                    variant={item.orderStatus === 'CANCELLED' ? 'danger' : 'info'}
                  />
                </View>
                <View style={styles.invoiceTitle}>
                  <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
                  <Text style={styles.customerName}>{item.customerName}</Text>
                </View>
              </View>

              <View style={styles.amountsRow}>
                <View>
                  <Text style={styles.label}>المجموع</Text>
                  <Text style={styles.totalValue}>{formatMoney(item.total)}</Text>
                </View>
                <View style={styles.alignRight}>
                  <Text style={styles.label}>المدفوع</Text>
                  <Text style={styles.paidValue}>{formatMoney(item.amountPaid)}</Text>
                </View>
                <View style={styles.alignRight}>
                  <Text style={styles.label}>المتبقي</Text>
                  <Text style={item.remaining > 0 ? styles.remainingDanger : styles.remainingClean}>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchInput: { marginBottom: 8 },
  addBtn: { height: 44, backgroundColor: '#16A34A' },
  filtersRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  filterChip: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', backgroundColor: '#F8FAFC' },
  filterChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  filterText: { color: '#334155', fontWeight: '700', fontSize: 12 },
  filterTextActive: { color: '#FFFFFF' },
  listContent: { padding: 16 },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 40 },
  invoiceCard: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  badges: { gap: 4, alignItems: 'flex-start' },
  invoiceTitle: { flex: 1, alignItems: 'flex-end' },
  invoiceNumber: { color: '#0F172A', fontWeight: 'bold', fontSize: 16 },
  customerName: { color: '#64748B', marginTop: 2, textAlign: 'right' },
  amountsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  alignRight: { alignItems: 'flex-end' },
  label: { color: '#64748B', fontSize: 12 },
  totalValue: { color: '#0F172A', fontWeight: 'bold', marginTop: 2 },
  paidValue: { color: '#16A34A', fontWeight: 'bold', marginTop: 2 },
  remainingDanger: { color: '#DC2626', fontWeight: 'bold', marginTop: 2 },
  remainingClean: { color: '#16A34A', fontWeight: 'bold', marginTop: 2 },
});
