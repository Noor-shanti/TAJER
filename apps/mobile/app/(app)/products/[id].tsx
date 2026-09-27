import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { auditApi } from '../../../src/features/audit/api/auditApi';
import { productsApi } from '../../../src/features/products/api/productsApi';
import { formatMoney, parseMoneyInput } from '../../../src/utils/money';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const productId = Number(id); const router = useRouter(); const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['productDetail', productId], queryFn: () => productsApi.getProductById(productId) });
  const { data: logs } = useQuery({ queryKey: ['audit', 'PRODUCT', productId], queryFn: () => auditApi.getLogs('PRODUCT', productId) });
  const product = data?.data; const [name, setName] = useState(''); const [price, setPrice] = useState('');
  const save = async () => { if (!product) return; await productsApi.updateProduct(productId, { name: name.trim() || product.name, currentPrice: price ? parseMoneyInput(price) : product.currentPrice }); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['productsSelect'] }); qc.invalidateQueries({ queryKey: ['audit'] }); router.back(); };
  const archive = () => Alert.alert('إيقاف المنتج', 'سيختفي من الاختيار، لكن يبقى محفوظا في الفواتير السابقة.', [{ text: 'إلغاء', style: 'cancel' }, { text: 'إيقاف', style: 'destructive', onPress: async () => { await productsApi.archiveProduct(productId); qc.invalidateQueries({ queryKey: ['products'] }); qc.invalidateQueries({ queryKey: ['productsSelect'] }); router.replace('/(app)/products'); } }]);
  if (!product) return <Text style={styles.loading}>جاري التحميل...</Text>;
  return <ScrollView style={styles.container} contentContainerStyle={styles.content}><Card><Text style={styles.title}>تعديل المنتج</Text><Input label="الاسم" value={name || product.name} onChangeText={setName} /><Input label="السعر بالشيكل" value={price || String(product.currentPrice / 100)} onChangeText={setPrice} keyboardType="decimal-pad" /><Text style={styles.hint}>الوحدة الحالية: {product.unitNameAr} | السعر: {formatMoney(product.currentPrice)}</Text><Button title="حفظ التعديل" onPress={save} /><Button title="إيقاف المنتج" variant="outline" onPress={archive} /></Card><Card style={styles.log}><Text style={styles.title}>سجل التغييرات</Text>{(logs?.data || []).map((log) => <Text key={log.id} style={styles.logText}>{log.description}</Text>)}{!logs?.data?.length ? <Text style={styles.hint}>لا توجد تغييرات مسجلة بعد</Text> : null}</Card></ScrollView>;
}
const styles = StyleSheet.create({ container:{flex:1,backgroundColor:'#F4F7FB'},content:{padding:16},loading:{flex:1,textAlign:'center',marginTop:30},title:{fontSize:18,fontWeight:'800',textAlign:'right',marginBottom:10,color:'#0B1220'},hint:{textAlign:'right',color:'#64748B',marginBottom:12},log:{marginTop:12},logText:{textAlign:'right',paddingVertical:8,borderBottomWidth:1,borderColor:'#EEF3FA',color:'#334155'} });
