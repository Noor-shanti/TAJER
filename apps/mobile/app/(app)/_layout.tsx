import React from 'react';
import { Tabs } from 'expo-router';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#0284C7',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: { borderTopColor: '#E2E8F0', height: 62, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="dashboard/index" options={{ title: 'الرئيسية', tabBarLabel: 'الرئيسية' }} />
      <Tabs.Screen name="customers/index" options={{ title: 'الزبائن', tabBarLabel: 'الزبائن' }} />
      <Tabs.Screen name="invoices/index" options={{ title: 'الطلبيات', tabBarLabel: 'الطلبيات' }} />
      <Tabs.Screen name="products/index" options={{ title: 'المنتجات', tabBarLabel: 'المنتجات' }} />

      <Tabs.Screen name="customers/new" options={{ href: null, title: 'إضافة زبون' }} />
      <Tabs.Screen name="customers/[id]" options={{ href: null, title: 'ملف الزبون' }} />
      <Tabs.Screen name="invoices/new" options={{ href: null, title: 'طلبية جديدة' }} />
      <Tabs.Screen name="invoices/[id]" options={{ href: null, title: 'تفاصيل الطلبية' }} />
      <Tabs.Screen name="products/new" options={{ href: null, title: 'إضافة منتج' }} />
    </Tabs>
  );
}
