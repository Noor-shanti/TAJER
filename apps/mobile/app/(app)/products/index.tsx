import React, { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Input } from '../../../src/components/common/Input';
import { productsApi } from '../../../src/features/products/api/productsApi';
import { formatMoney } from '../../../src/utils/money';
import { formatQuantity } from '../../../src/utils/quantity';

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
    (product) => selectedCategory === 'ALL' || (selectedCategory === 'LOW' ? product.stockQuantity <= product.reorderLevel : product.categoryName === selectedCategory)
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
          {['ALL', 'LOW', ...categories].map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.catChip, selectedCategory === category && styles.catChipActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.catText, selectedCategory === category && styles.catTextActive]}>
                {category === 'ALL' ? 'الكل' : category === 'LOW' ? 'ناقص' : category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>لا يوجد منتجات مطابقة</Text> : null}
        ListHeaderComponent={products.length ? <View style={styles.tableHeader}><Text style={[styles.headerCell, styles.editColumn]}>تعديل</Text><Text style={[styles.headerCell, styles.stockColumn]}>المتوفر</Text><Text style={[styles.headerCell, styles.priceColumn]}>السعر</Text><Text style={[styles.headerCell, styles.productColumn]}>المنتج</Text></View> : null}
        ListFooterComponent={<Button title="إضافة منتج" onPress={() => router.push({ pathname: '/(app)/products/new', params: { returnTo: '/(app)/products' } })} style={styles.addBtn} />}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <TouchableOpacity style={styles.editColumn} onPress={() => router.push({ pathname: '/(app)/products/[id]', params: { id: item.id, returnTo: '/(app)/products' } })}><Text style={styles.editText}>تعديل</Text></TouchableOpacity>
            <View style={styles.stockColumn}><Text style={item.stockQuantity <= item.reorderLevel ? styles.lowStock : styles.stockValue}>{formatQuantity(item.stockQuantity)} {item.unitNameAr}</Text><Text style={styles.stockState}>{item.stockQuantity <= item.reorderLevel ? 'ناقص' : 'متوفر'}</Text></View>
            <View style={styles.priceColumn}><Text style={styles.priceText}>{formatMoney(item.currentPrice)}</Text><Text style={styles.unitText}>/ {item.unitNameAr}</Text></View>
            <View style={styles.productColumn}><Text style={styles.productName}>{item.name}</Text><Text style={styles.categoryBadge}>{item.categoryName || 'بدون تصنيف'}</Text></View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  topBar: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E6EDF7' },
  searchInput: { marginBottom: 8 },
  categoryChipsRow: { flexDirection: 'row', gap: 6, marginBottom: 2, flexWrap: 'wrap' },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: '#EEF3FA', borderWidth: 1, borderColor: '#E2EAF5' },
  catChipActive: { backgroundColor: BLUE, borderColor: BLUE },
  catText: { fontSize: 12, color: '#44546A', fontWeight: '700' },
  catTextActive: { color: '#FFFFFF', fontWeight: '900' },
  addBtn: { height: 46, backgroundColor: BLUE, marginTop: 14 },
  listContent: { padding: 16, paddingTop: 10 },
  emptyText: { textAlign: 'center', color: '#9AA6B8', marginTop: 40, fontSize: 15 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#EAF2FF', paddingVertical: 9, paddingHorizontal: 6, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  headerCell: { color: '#52657C', fontWeight: '800', fontSize: 11, textAlign: 'right' },
  tableRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', minHeight: 68, paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#E6EDF7', alignItems: 'center' },
  editColumn: { width: '17%', alignItems: 'flex-start' }, stockColumn: { width: '27%', alignItems: 'center' }, priceColumn: { width: '23%', alignItems: 'center' }, productColumn: { width: '33%', alignItems: 'flex-end' },
  editText: { color: BLUE, fontWeight: '900', fontSize: 12 }, productName: { fontSize: 14, fontWeight: '900', color: '#0B1220', textAlign: 'right' }, categoryBadge: { fontSize: 11, color: '#7A8699', marginTop: 3, textAlign: 'right' }, priceText: { fontSize: 13, fontWeight: '900', color: '#0B1220' }, unitText: { fontSize: 10, color: '#7A8699', marginTop: 2 }, stockValue: { fontSize: 13, color: '#15803D', fontWeight: '900', textAlign: 'center' }, lowStock: { fontSize: 13, color: '#DC2626', fontWeight: '900', textAlign: 'center' }, stockState: { color: '#7A8699', fontSize: 10, marginTop: 3 },
});
