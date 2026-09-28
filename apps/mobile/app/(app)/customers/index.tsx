import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { customersApi } from '../../../src/features/customers/api/customersApi';
import { formatMoney } from '../../../src/utils/money';

const BLUE = '#075FD8';

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
        <Button title="إضافة زبون" onPress={() => router.push({ pathname: '/(app)/customers/new', params: { returnTo: '/(app)/customers' } })} style={styles.addBtn} />
      </View>

      <FlatList
        data={customers}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>لا يوجد زبائن مطابقون</Text> : null}
        renderItem={({ item }) => (
          <Card style={styles.customerCard}>
            <TouchableOpacity style={styles.customerMain} onPress={() => router.push({ pathname: '/(app)/customers/[id]', params: { id: item.id, returnTo: '/(app)/customers' } })}>
              <View style={styles.balanceBlock}>
                <Text style={styles.balanceLabel}>الذمة</Text>
                <Text style={item.totalRemaining > 0 ? styles.balanceDanger : styles.balanceClean}>
                  {formatMoney(item.totalRemaining)}
                </Text>
              </View>
              <View style={styles.customerInfo}>
                <View style={styles.avatar}>
                  <Ionicons name="person-outline" size={18} color={BLUE} />
                </View>
                <View style={styles.customerTexts}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  {item.phone ? <Text style={styles.phoneText}>{item.phone}</Text> : <Text style={styles.phoneText}>بدون رقم هاتف</Text>}
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/invoices/new',
                    params: { customerId: item.id, customerName: item.name, draftId: String(Date.now()), returnTo: '/(app)/customers' },
                  })
                }
              >
                <Text style={styles.primaryBtnText}>تجهيز طلبية</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  topBar: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E6EDF7' },
  searchInput: { marginBottom: 8 },
  addBtn: { height: 44, backgroundColor: BLUE },
  listContent: { padding: 16 },
  emptyText: { color: '#9AA6B8', textAlign: 'center', marginTop: 40 },
  customerCard: { marginBottom: 10 },
  customerMain: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EEF3FA' },
  customerInfo: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  customerTexts: { flex: 1, alignItems: 'flex-end' },
  avatar: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center' },
  customerName: { color: '#0B1220', fontWeight: '900', fontSize: 18, textAlign: 'right' },
  phoneText: { color: '#7A8699', fontSize: 13, marginTop: 3, textAlign: 'right' },
  balanceBlock: { minWidth: 110, alignItems: 'flex-start' },
  balanceLabel: { color: '#7A8699', fontSize: 12 },
  balanceDanger: { color: '#DC2626', fontWeight: '900', fontSize: 15, marginTop: 3 },
  balanceClean: { color: '#16A34A', fontWeight: '900', fontSize: 15, marginTop: 3 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  primaryBtn: { flex: 1, backgroundColor: BLUE, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900' },
});
