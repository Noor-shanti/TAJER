import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Badge } from '../../../src/components/common/Badge';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { invoicesApi } from '../../../src/features/invoices/api/invoicesApi';
import { formatMoney } from '../../../src/utils/money';

type Filter = 'ALL' | 'OPEN' | 'PAID' | 'CANCELLED';

const BLUE = '#075FD8';

function paymentLabel(status: string) {
  if (status === 'PAID') return 'مدفوعة';
  if (status === 'PARTIALLY_PAID') return 'دفع جزئي';
  return 'غير مدفوعة';
}

export default function InvoicesListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoicesList', search],
    queryFn: () => invoicesApi.getInvoices(search, 1),
  });

  const invoices = data?.data || [];
  const visibleInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const date = invoice.createdAt.slice(0, 10);
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      if (filter === 'OPEN') return invoice.orderStatus !== 'CANCELLED' && invoice.remaining > 0;
      if (filter === 'PAID') return invoice.orderStatus !== 'CANCELLED' && invoice.paymentStatus === 'PAID';
      if (filter === 'CANCELLED') return invoice.orderStatus === 'CANCELLED';
      return invoice.orderStatus !== 'CANCELLED';
    });
  }, [filter, fromDate, invoices, toDate]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Input
          placeholder="ابحث برقم الطلبية أو اسم الزبون"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        <View style={styles.dateRow}>
          <Input placeholder="من YYYY-MM-DD" value={fromDate} onChangeText={setFromDate} style={styles.dateInput} />
          <Input placeholder="إلى YYYY-MM-DD" value={toDate} onChangeText={setToDate} style={styles.dateInput} />
        </View>
        <View style={styles.actionRow}>
          <Button title="تقرير المبيعات" onPress={() => router.push('/(app)/invoices/report')} variant="secondary" style={styles.actionBtn} />
          <Button
            title="طلبية جديدة"
            onPress={() => router.push({ pathname: '/(app)/invoices/new', params: { draftId: String(Date.now()) } })}
            style={styles.actionBtn}
          />
        </View>

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
                <Badge
                  label={paymentLabel(item.paymentStatus)}
                  variant={
                    item.paymentStatus === 'PAID'
                      ? 'success'
                      : item.paymentStatus === 'PARTIALLY_PAID'
                      ? 'warning'
                      : 'danger'
                  }
                />
                <View style={styles.invoiceTitle}>
                  <View style={styles.invoiceIcon}>
                    <Ionicons name="receipt-outline" size={18} color={BLUE} />
                  </View>
                  <View style={styles.invoiceTexts}>
                    <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
                    <Text style={styles.customerName}>{item.customerName}</Text>
                  </View>
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
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  topBar: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E6EDF7' },
  searchInput: { marginBottom: 8 },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dateInput: { flex: 1, height: 42, fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, height: 44 },
  filtersRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  filterChip: { flex: 1, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2EAF5', alignItems: 'center', backgroundColor: '#EEF3FA' },
  filterChipActive: { backgroundColor: BLUE, borderColor: BLUE },
  filterText: { color: '#44546A', fontWeight: '800', fontSize: 12 },
  filterTextActive: { color: '#FFFFFF' },
  listContent: { padding: 16 },
  emptyText: { color: '#9AA6B8', textAlign: 'center', marginTop: 40 },
  invoiceCard: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  invoiceTitle: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  invoiceIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center' },
  invoiceTexts: { flex: 1, alignItems: 'flex-end' },
  invoiceNumber: { color: '#0B1220', fontWeight: '900', fontSize: 16 },
  customerName: { color: '#7A8699', marginTop: 2, textAlign: 'right' },
  amountsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#EEF3FA', paddingTop: 10 },
  alignRight: { alignItems: 'flex-end' },
  label: { color: '#7A8699', fontSize: 12 },
  totalValue: { color: '#0B1220', fontWeight: '900', marginTop: 2 },
  paidValue: { color: '#16A34A', fontWeight: '900', marginTop: 2 },
  remainingDanger: { color: '#DC2626', fontWeight: '900', marginTop: 2 },
  remainingClean: { color: '#16A34A', fontWeight: '900', marginTop: 2 },
});
