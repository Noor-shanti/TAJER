import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { Input } from '../../../src/components/common/Input';
import { invoicesApi } from '../../../src/features/invoices/api/invoicesApi';
import { formatMoney } from '../../../src/utils/money';
import { formatQuantity } from '../../../src/utils/quantity';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartIso() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default function SalesReportScreen() {
  const [fromInput, setFromInput] = useState(monthStartIso());
  const [toInput, setToInput] = useState(todayIso());
  const [range, setRange] = useState({ from: fromInput, to: toInput });

  const { data, isFetching } = useQuery({
    queryKey: ['salesReport', range.from, range.to],
    queryFn: () => invoicesApi.getSalesReport(range.from, range.to),
  });

  const report = data?.data;
  const items = useMemo(() => report?.items || [], [report]);

  const applyRange = () => {
    const from = fromInput.trim();
    const to = toInput.trim();
    if (!isValidDate(from) || !isValidDate(to) || from > to) {
      Alert.alert('الفترة غير صحيحة', 'اكتب تاريخا صحيحا بصيغة YYYY-MM-DD وتأكد أن البداية قبل النهاية.');
      return;
    }
    setRange({ from, to });
  };

  const reportHtml = () => `<!doctype html><html dir="rtl"><meta charset="utf-8" /><style>body{font-family:Arial;padding:24px;color:#111827;direction:rtl}h1{color:#075FD8}table{width:100%;border-collapse:collapse}th,td{padding:9px;border-bottom:1px solid #ddd;text-align:right}th{background:#f1f5f9}</style><body><h1>تقرير المبيعات</h1><p>من ${range.from} إلى ${range.to}</p><p>إجمالي البيع: ${formatMoney(report?.totalSales || 0)}</p><p>المدفوع: ${formatMoney(report?.totalPaid || 0)} | المتبقي: ${formatMoney(report?.totalRemaining || 0)}</p><table><tr><th>الصنف</th><th>الكمية</th><th>الإجمالي</th></tr>${items.map((item) => `<tr><td>${item.productName}</td><td>${formatQuantity(item.quantity)} ${item.unitName}</td><td>${formatMoney(item.total)}</td></tr>`).join('')}</table></body></html>`;

  const sharePdf = async () => {
    try {
      const file = await Print.printToFileAsync({ html: reportHtml() });
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'تصدير تقرير المبيعات' });
    } catch {
      Alert.alert('تعذر التصدير', 'حاول مرة أخرى.');
    }
  };

  const exportExcel = async () => {
    try {
      const sheet = XLSX.utils.json_to_sheet(items.map((item) => ({ الصنف: item.productName, الوحدة: item.unitName, الكمية: formatQuantity(item.quantity), الإجمالي: item.total / 100 })));
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, 'المبيعات');
      const base64 = XLSX.write(book, { type: 'base64', bookType: 'xlsx' });
      const uri = `${FileSystem.cacheDirectory}تقرير-المبيعات-${range.from}-${range.to}.xlsx`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'تصدير Excel' });
    } catch {
      Alert.alert('تعذر تصدير Excel', 'حاول مرة أخرى.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.section}>
        <Text style={styles.title}>تقرير المبيعات</Text>
        <Text style={styles.hint}>اكتب التاريخ بصيغة YYYY-MM-DD لمعرفة ما تم بيعه خلال الفترة.</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <Input label="من تاريخ" value={fromInput} onChangeText={setFromInput} placeholder="2026-09-01" />
          </View>
          <View style={styles.dateCol}>
            <Input label="إلى تاريخ" value={toInput} onChangeText={setToInput} placeholder="2026-09-30" />
          </View>
        </View>
        <Button title="عرض التقرير" onPress={applyRange} loading={isFetching} />
        <View style={styles.exportRow}>
          <Button title="Excel" onPress={exportExcel} variant="secondary" style={styles.exportButton} />
          <Button title="PDF" onPress={sharePdf} variant="secondary" style={styles.exportButton} />
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>عدد الفواتير</Text>
          <Text style={styles.statValue}>{report?.invoiceCount || 0}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>إجمالي البيع</Text>
          <Text style={styles.statValue}>{formatMoney(report?.totalSales || 0)}</Text>
        </Card>
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>المدفوع</Text>
          <Text style={styles.paidValue}>{formatMoney(report?.totalPaid || 0)}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>المتبقي</Text>
          <Text style={styles.remainingValue}>{formatMoney(report?.totalRemaining || 0)}</Text>
        </Card>
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>الأصناف المباعة</Text>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد مبيعات في هذه الفترة</Text>
        ) : (
          items.map((item) => (
            <View key={`${item.productName}-${item.unitName}`} style={styles.itemRow}>
              <View>
                <Text style={styles.itemTotal}>{formatMoney(item.total)}</Text>
                <Text style={styles.itemQty}>{formatQuantity(item.quantity)} {item.unitName}</Text>
              </View>
              <Text style={styles.itemName}>{item.productName}</Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  content: { padding: 16, paddingBottom: 28 },
  section: { marginBottom: 12 },
  title: { color: '#0B1220', fontSize: 22, fontWeight: '900', textAlign: 'right' },
  hint: { color: '#7A8699', fontSize: 13, lineHeight: 20, textAlign: 'right', marginTop: 4, marginBottom: 8 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateCol: { flex: 1 },
  exportRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  exportButton: { flex: 1, height: 42 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statCard: { flex: 1, minHeight: 86, justifyContent: 'center' },
  statLabel: { color: '#7A8699', fontSize: 12, textAlign: 'right', marginBottom: 6 },
  statValue: { color: '#0B1220', fontSize: 18, fontWeight: '900', textAlign: 'right' },
  paidValue: { color: '#16A34A', fontSize: 18, fontWeight: '900', textAlign: 'right' },
  remainingValue: { color: '#DC2626', fontSize: 18, fontWeight: '900', textAlign: 'right' },
  sectionTitle: { color: '#0B1220', fontSize: 16, fontWeight: '900', textAlign: 'right', marginBottom: 10 },
  emptyText: { color: '#9AA6B8', textAlign: 'center', paddingVertical: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEF3FA', paddingVertical: 10, gap: 12 },
  itemName: { flex: 1, color: '#0B1220', fontWeight: '900', textAlign: 'right' },
  itemTotal: { color: '#0B1220', fontWeight: '900' },
  itemQty: { color: '#7A8699', fontSize: 12, marginTop: 2 },
});
