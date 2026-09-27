import React from 'react';
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
        headerTitleAlign: 'center',
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="dashboard/index" options={{ title: 'الرئيسية' }} />
      <Stack.Screen name="customers/index" options={{ title: 'الزبائن' }} />
      <Stack.Screen name="customers/new" options={{ title: 'إضافة زبون جديد' }} />
      <Stack.Screen name="products/index" options={{ title: 'المنتجات' }} />
      <Stack.Screen name="products/new" options={{ title: 'إضافة منتج جديد' }} />
      <Stack.Screen name="invoices/index" options={{ title: 'سجل الطلبيات والفواتير' }} />
      <Stack.Screen name="invoices/new" options={{ title: 'طلبية جديدة' }} />
      <Stack.Screen name="invoices/[id]" options={{ title: 'تفاصيل الفاتورة' }} />
    </Stack>
  );
}
