import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Badge } from '../../../src/components/common/Badge';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { invoicesApi } from '../../../src/features/invoices/api/invoicesApi';
import { formatMoney } from '../../../src/utils/money';

export default function InvoicesListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoicesList', search],
    queryFn: () => invoicesApi.getInvoices(search, 1),
  });

  const invoices = data?.data || [];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Input
          placeholder="ابحث برقم الفاتورة أو اسم الزبون..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        <Button
          title="➕ طلبية جديدة"
          onPress={() => router.push('/(app)/invoices/new')}
          style={styles.addBtn}
        />
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.emptyText}>لا يوجد فواتير مسجلة</Text> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(app)/invoices/${item.id}`)}>
            <Card style={styles.invCard}>
              <View style={styles.headerRow}>
                <Text style={styles.invNumber}>{item.invoiceNumber}</Text>
                <Badge
                  label={
                    item.paymentStatus === 'PAID'
                      ? 'مدفوعة بالكامل'
                      : item.paymentStatus === 'PARTIALLY_PAID'
                      ? 'مدفوعة جزئياً'
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

              <Text style={styles.customerName}>الزبون: {item.customerName}</Text>

              <View style={styles.totalsRow}>
                <View>
                  <Text style={styles.label}>المجموع:</Text>
                  <Text style={styles.totalValue}>{formatMoney(item.total)}</Text>
                </View>

                <View style={styles.rightAlign}>
                  <Text style={styles.label}>المتبقي:</Text>
                  <Text style={item.remaining > 0 ? styles.remainingValueDanger : styles.remainingValueClean}>
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
  topBar: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    marginBottom: 8,
  },
  addBtn: {
    height: 44,
    backgroundColor: '#16A34A',
  },
  listContent: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 40,
    fontSize: 15,
  },
  invCard: {
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  invNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  customerName: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'right',
    marginBottom: 10,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  rightAlign: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 11,
    color: '#64748B',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  remainingValueDanger: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  remainingValueClean: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#16A34A',
  },
});
