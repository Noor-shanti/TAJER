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
      {/* Top Controls */}
      <View style={styles.topBar}>
        <Input
          placeholder="ابحث باسم الزبون أو الهاتف..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        <Button
          title="➕ إضافة زبون"
          onPress={() => router.push('/(app)/customers/new')}
          style={styles.addBtn}
        />
      </View>

      {/* Customers List */}
      <FlatList
        data={customers}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.emptyText}>لا يوجد زبائن مطايقون للبحث</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.customerCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.customerName}>{item.name}</Text>
              {item.phone ? <Text style={styles.phoneText}>{item.phone}</Text> : null}
            </View>

            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.balanceLabel}>المتبقي الذمم:</Text>
                <Text style={item.totalRemaining > 0 ? styles.balanceValueDanger : styles.balanceValueClean}>
                  {formatMoney(item.totalRemaining)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.newInvoiceBtn}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/invoices/new',
                    params: { customerId: item.id, customerName: item.name },
                  })
                }
              >
                <Text style={styles.newInvoiceBtnText}>طلبية جديدة</Text>
              </TouchableOpacity>
            </View>
          </Card>
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
  customerCard: {
    marginBottom: 10,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  customerName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
  },
  phoneText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  balanceValueDanger: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  balanceValueClean: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  newInvoiceBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newInvoiceBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
