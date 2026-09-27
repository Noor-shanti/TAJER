import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productsApi.getProducts(search, 1),
  });

  const allProducts = data?.data || [];
  const categories = Array.from(
    new Set(allProducts.map((product) => product.categoryName).filter((name): name is string => Boolean(name)))
  );
  const products = allProducts.filter(
    (product) => selectedCategory === 'ALL' || product.categoryName === selectedCategory
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Input
          placeholder="ابحث باسم المنتج أو التصنيف"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />

        <View style={styles.categoryChipsRow}>
          {['ALL', ...categories].map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.catChip, selectedCategory === category && styles.catChipActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.catText, selectedCategory === category && styles.catTextActive]}>
                {category === 'ALL' ? 'الكل' : category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title="إضافة منتج" onPress={() => router.push('/(app)/products/new')} style={styles.addBtn} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>لا يوجد منتجات مطابقة</Text> : null}
        renderItem={({ item }) => (
          <Card style={styles.productCard}>
            <View style={styles.cardHeader}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>{formatMoney(item.currentPrice)}</Text>
                <Text style={styles.unitText}>/ {item.unitNameAr}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.categoryBadge}>{item.categoryName || 'بدون تصنيف'}</Text>
              </View>
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
  categoryChipsRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  catChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  catText: { fontSize: 12, color: '#334155', fontWeight: '500' },
  catTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  addBtn: { height: 44, backgroundColor: '#0284C7' },
  listContent: { padding: 16 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontSize: 15 },
  productCard: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productInfo: { flex: 1, alignItems: 'flex-end' },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', textAlign: 'right' },
  categoryBadge: { fontSize: 12, color: '#64748B', marginTop: 2, textAlign: 'right' },
  priceContainer: { alignItems: 'flex-start', paddingRight: 12 },
  priceText: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  unitText: { fontSize: 11, color: '#64748B' },
});
