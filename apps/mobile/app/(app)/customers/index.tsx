import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { customersApi } from '../../../src/features/customers/api/customersApi';
import { formatMoney } from '../../../src/utils/money';

export default function CustomersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.getCustomers(search, 1),
  });

  const customers = data?.data || [];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Input
          placeholder="ابحث باسم الزبون أو رقم الهاتف"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        <Button title="إضافة زبون" onPress={() => router.push('/(app)/customers/new')} style={styles.addBtn} />
      </View>

      <FlatList
        data={customers}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>لا يوجد زبائن مطابقون</Text> : null}
        renderItem={({ item }) => (
          <Card style={styles.customerCard}>
            <TouchableOpacity style={styles.customerMain} onPress={() => router.push(`/(app)/customers/${item.id}`)}>
              <View style={styles.balanceBlock}>
                <Text style={styles.balanceLabel}>الذمة</Text>
                <Text style={item.totalRemaining > 0 ? styles.balanceDanger : styles.balanceClean}>
                  {formatMoney(item.totalRemaining)}
                </Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{item.name}</Text>
                {item.phone ? <Text style={styles.phoneText}>{item.phone}</Text> : <Text style={styles.phoneText}>بدون رقم هاتف</Text>}
              </View>
            </TouchableOpacity>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push(`/(app)/customers/${item.id}`)}>
                <Text style={styles.secondaryBtnText}>سجل الزبون</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/invoices/new',
                    params: { customerId: item.id, customerName: item.name },
                  })
                }
              >
                <Text style={styles.primaryBtnText}>طلبية جديدة</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchInput: { marginBottom: 8 },
  addBtn: { height: 44, backgroundColor: '#0284C7' },
  listContent: { padding: 16 },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 40 },
  customerCard: { marginBottom: 10 },
  customerMain: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  customerInfo: { flex: 1, alignItems: 'flex-end' },
  customerName: { color: '#0F172A', fontWeight: 'bold', fontSize: 18, textAlign: 'right' },
  phoneText: { color: '#64748B', fontSize: 13, marginTop: 3, textAlign: 'right' },
  balanceBlock: { minWidth: 110, alignItems: 'flex-start' },
  balanceLabel: { color: '#64748B', fontSize: 12 },
  balanceDanger: { color: '#DC2626', fontWeight: 'bold', fontSize: 15, marginTop: 3 },
  balanceClean: { color: '#16A34A', fontWeight: 'bold', fontSize: 15, marginTop: 3 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  primaryBtn: { flex: 1, backgroundColor: '#0F172A', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: 'bold' },
  secondaryBtn: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  secondaryBtnText: { color: '#0F172A', fontWeight: 'bold' },
});
