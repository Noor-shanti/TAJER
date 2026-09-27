import React, { useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '../../../src/components/common/Badge';
import { Button } from '../../../src/components/common/Button';
import { Card } from '../../../src/components/common/Card';
import { customersApi } from '../../../src/features/customers/api/customersApi';
import { invoicesApi } from '../../../src/features/invoices/api/invoicesApi';
import { formatMoney } from '../../../src/utils/money';
import { Input } from '../../../src/components/common/Input';
import { auditApi } from '../../../src/features/audit/api/auditApi';

export default function CustomerDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = Number(id);
  const [filterStatus, setFilterStatus] = useState<'OPEN' | 'ALL'>('OPEN');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const { data: customerRes } = useQuery({
    queryKey: ['customerDetail', customerId],
    queryFn: () => customersApi.getCustomerById(customerId),
  });

  const { data: invoicesRes, isLoading, refetch } = useQuery({
    queryKey: ['customerInvoices', customerId],
    queryFn: () => invoicesApi.getInvoicesByCustomer(customerId),
  });

  const customer = customerRes?.data;
  const { data: logsRes } = useQuery({ queryKey: ['audit', 'CUSTOMER', customerId], queryFn: () => auditApi.getLogs('CUSTOMER', customerId) });
  const invoices = invoicesRes?.data || [];
  const visibleInvoices =
    filterStatus === 'OPEN'
      ? invoices.filter((invoice) => invoice.remaining > 0 && invoice.orderStatus !== 'CANCELLED')
      : invoices;

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <Text style={styles.customerName}>{customer?.name || 'الزبون'}</Text>
        {customer?.phone ? <Text style={styles.phoneText}>{customer.phone}</Text> : null}

        <View style={styles.debtBox}>
          <Text style={styles.debtLabel}>إجمالي المتبقي</Text>
          <Text style={(customer?.totalRemaining || 0) > 0 ? styles.debtDanger : styles.debtClean}>
            {formatMoney(customer?.totalRemaining || 0)}
          </Text>
        </View>

        <Button
          title="طلبية جديدة لهذا الزبون"
          onPress={() =>
            router.push({
              pathname: '/(app)/invoices/new',
              params: { customerId, customerName: customer?.name || '', draftId: String(Date.now()) },
            })
          }
          style={styles.newInvoiceBtn}
        />
        <View style={styles.manageRow}>
          <Button title="تعديل البيانات" variant="secondary" style={styles.manageButton} onPress={() => { setName(customer?.name || ''); setPhone(customer?.phone || ''); setEditing(true); }} />
          <Button title="إيقاف الزبون" variant="outline" style={styles.manageButton} onPress={() => Alert.alert('إيقاف الزبون', 'يبقى سجل الفواتير محفوظا، لكن لا يمكن اختياره لطلبية جديدة.', [{ text: 'إلغاء', style: 'cancel' }, { text: 'إيقاف', style: 'destructive', onPress: async () => { await customersApi.archiveCustomer(customerId); queryClient.invalidateQueries({ queryKey: ['customers'] }); queryClient.invalidateQueries({ queryKey: ['customerDebtSummary'] }); router.replace('/(app)/customers'); } }])} />
        </View>
      </Card>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'OPEN' && styles.filterChipActive]}
          onPress={() => setFilterStatus('OPEN')}
        >
          <Text style={[styles.filterText, filterStatus === 'OPEN' && styles.filterTextActive]}>ذمم مفتوحة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'ALL' && styles.filterChipActive]}
          onPress={() => setFilterStatus('ALL')}
        >
          <Text style={[styles.filterText, filterStatus === 'ALL' && styles.filterTextActive]}>كل السجل</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleInvoices}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!isLoading ? <Text style={styles.emptyText}>لا توجد طلبيات في هذا القسم</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/(app)/invoices/${item.id}`)}>
            <Card style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <Badge
                  label={
                    item.paymentStatus === 'PAID'
                      ? 'مدفوعة'
                      : item.paymentStatus === 'PARTIALLY_PAID'
                      ? 'دفع جزئي'
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
                <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
              </View>

              <View style={styles.amountsRow}>
                <View>
                  <Text style={styles.smallLabel}>المجموع</Text>
                  <Text style={styles.totalText}>{formatMoney(item.total)}</Text>
                </View>
                <View style={styles.alignRight}>
                  <Text style={styles.smallLabel}>المتبقي</Text>
                  <Text style={item.remaining > 0 ? styles.remainingDanger : styles.remainingClean}>
                    {formatMoney(item.remaining)}
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
      <View style={styles.logBox}><Text style={styles.logTitle}>سجل التغييرات</Text>{(logsRes?.data || []).map((log) => <Text key={log.id} style={styles.logText}>{log.description}</Text>)}</View>
      <Modal visible={editing} animationType="slide"><View style={styles.modal}><Text style={styles.modalTitle}>تعديل الزبون</Text><Input label="الاسم" value={name} onChangeText={setName} /><Input label="الهاتف" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /><Button title="حفظ" onPress={async () => { await customersApi.updateCustomer(customerId, { name, phone }); queryClient.invalidateQueries({ queryKey: ['customers'] }); queryClient.invalidateQueries({ queryKey: ['customerDetail'] }); queryClient.invalidateQueries({ queryKey: ['audit'] }); setEditing(false); }} /><Button title="إلغاء" variant="outline" onPress={() => setEditing(false)} /></View></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  headerCard: { margin: 16, marginBottom: 8 },
  customerName: { color: '#0B1220', fontWeight: 'bold', fontSize: 22, textAlign: 'right' },
  phoneText: { color: '#64748B', textAlign: 'right', marginTop: 4 },
  debtBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, padding: 12, marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  debtLabel: { color: '#991B1B', fontWeight: 'bold' },
  debtDanger: { color: '#DC2626', fontWeight: 'bold', fontSize: 18 },
  debtClean: { color: '#16A34A', fontWeight: 'bold', fontSize: 18 },
  newInvoiceBtn: { backgroundColor: '#075FD8', marginTop: 12 },
  manageRow: { flexDirection: 'row', gap: 8, marginTop: 8 }, manageButton: { flex: 1, height: 42 },
  logBox: { padding: 16, backgroundColor: '#FFFFFF', margin: 16, marginTop: 0, borderRadius: 8 }, logTitle: { textAlign: 'right', fontWeight: 'bold', marginBottom: 8 }, logText: { textAlign: 'right', color: '#64748B', paddingVertical: 5 },
  modal: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#FFFFFF' }, modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'right', marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  filterChip: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', backgroundColor: '#FFFFFF' },
  filterChipActive: { backgroundColor: '#075FD8', borderColor: '#075FD8' },
  filterText: { color: '#334155', fontWeight: 'bold' },
  filterTextActive: { color: '#FFFFFF' },
  listContent: { padding: 16, paddingTop: 0 },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 28 },
  invoiceCard: { marginBottom: 10 },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  invoiceNumber: { color: '#0B1220', fontWeight: 'bold', fontSize: 16 },
  amountsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  smallLabel: { color: '#64748B', fontSize: 12 },
  totalText: { color: '#0B1220', fontWeight: 'bold', marginTop: 2 },
  alignRight: { alignItems: 'flex-end' },
  remainingDanger: { color: '#DC2626', fontWeight: 'bold', marginTop: 2 },
  remainingClean: { color: '#16A34A', fontWeight: 'bold', marginTop: 2 },
});
