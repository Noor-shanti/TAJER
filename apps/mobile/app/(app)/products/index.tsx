import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { productsApi } from '../../../src/features/products/api/productsApi';
import { formatMoney } from '../../../src/utils/money';

export default function ProductsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productsApi.getProducts(search, 1),
  });

  const products = data?.data || [];

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Input
          placeholder="ابحث باسم المنتج أو الأصناف..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        <Button
          title="➕ إضافة منتج جديد"
          onPress={() => router.push('/(app)/products/new')}
          style={styles.addBtn}
        />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.emptyText}>لا يوجد منتجات في القائمة</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.productCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.productName}>{item.name}</Text>
                {item.categoryName ? (
                  <Text style={styles.categoryBadge}>{item.categoryName}</Text>
                ) : null}
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>{formatMoney(item.currentPrice)}</Text>
                <Text style={styles.unitText}>/ {item.unitNameAr}</Text>
              </View>
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
    backgroundColor: '#0284C7',
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
  productCard: {
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
  },
  categoryBadge: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'right',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  unitText: {
    fontSize: 11,
    color: '#64748B',
  },
});
