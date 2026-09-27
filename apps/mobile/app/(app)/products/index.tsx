import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { productsApi } from '../../../src/features/products/api/productsApi';
import { formatMoney } from '../../../src/utils/money';

const BLUE = '#075FD8';

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
          <TouchableOpacity onPress={() => router.push(`/(app)/products/${item.id}`)}><Card style={styles.productCard}>
            <View style={styles.cardHeader}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>{formatMoney(item.currentPrice)}</Text>
                <Text style={styles.unitText}>/ {item.unitNameAr}</Text>
              </View>
              <View style={styles.productInfo}>
                <View style={styles.iconWrap}>
                  <Ionicons name="cube-outline" size={18} color={BLUE} />
                </View>
                <View style={styles.productTexts}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.categoryBadge}>{item.categoryName || 'بدون تصنيف'}</Text>
                </View>
              </View>
            </View>
          </Card></TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  topBar: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E6EDF7' },
  searchInput: { marginBottom: 8 },
  categoryChipsRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: '#EEF3FA', borderWidth: 1, borderColor: '#E2EAF5' },
  catChipActive: { backgroundColor: BLUE, borderColor: BLUE },
  catText: { fontSize: 12, color: '#44546A', fontWeight: '700' },
  catTextActive: { color: '#FFFFFF', fontWeight: '900' },
  addBtn: { height: 44, backgroundColor: BLUE },
  listContent: { padding: 16 },
  emptyText: { textAlign: 'center', color: '#9AA6B8', marginTop: 40, fontSize: 15 },
  productCard: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productInfo: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  productTexts: { flex: 1, alignItems: 'flex-end' },
  iconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EAF2FF', alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 16, fontWeight: '900', color: '#0B1220', textAlign: 'right' },
  categoryBadge: { fontSize: 12, color: '#7A8699', marginTop: 2, textAlign: 'right' },
  priceContainer: { alignItems: 'flex-start', paddingRight: 12 },
  priceText: { fontSize: 16, fontWeight: '900', color: '#0B1220' },
  unitText: { fontSize: 11, color: '#7A8699' },
});
