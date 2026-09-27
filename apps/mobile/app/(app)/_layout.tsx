import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import type { ColorValue } from 'react-native';

const BLUE = '#075FD8';
const MUTED = '#8A94A6';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: TabIconName, activeName: TabIconName = name) {
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? activeName : name} size={size || 22} color={String(color)} />
  );
}

export default function AppLayout() {
  const router = useRouter();

  const backOptions = (title: string, fallback: string) => ({
    href: null,
    title,
    headerLeft: () => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback as never))}
        style={{ paddingHorizontal: 14, paddingVertical: 8 }}
      >
        <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    ),
  });

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: BLUE,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '800', fontSize: 17 },
        headerTitleAlign: 'center',
        tabBarActiveTintColor: BLUE,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: 66,
          paddingBottom: 8,
          paddingTop: 7,
          shadowColor: '#14213D',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800', marginTop: 2 },
        tabBarItemStyle: { borderRadius: 14 },
      }}
    >
      <Tabs.Screen
        name="dashboard/index"
        options={{ title: 'الرئيسية', tabBarLabel: 'الرئيسية', tabBarIcon: tabIcon('grid-outline', 'grid') }}
      />
      <Tabs.Screen
        name="customers/index"
        options={{ title: 'الزبائن', tabBarLabel: 'الزبائن', tabBarIcon: tabIcon('people-outline', 'people') }}
      />
      <Tabs.Screen
        name="invoices/index"
        options={{ title: 'الطلبيات', tabBarLabel: 'الطلبيات', tabBarIcon: tabIcon('receipt-outline', 'receipt') }}
      />
      <Tabs.Screen
        name="products/index"
        options={{ title: 'المنتجات', tabBarLabel: 'المنتجات', tabBarIcon: tabIcon('cube-outline', 'cube') }}
      />

      <Tabs.Screen name="customers/new" options={backOptions('إضافة زبون', '/(app)/customers')} />
      <Tabs.Screen name="customers/[id]" options={backOptions('ملف الزبون', '/(app)/customers')} />
      <Tabs.Screen name="invoices/new" options={backOptions('طلبية جديدة', '/(app)/invoices')} />
      <Tabs.Screen name="invoices/[id]" options={backOptions('تفاصيل الطلبية', '/(app)/invoices')} />
      <Tabs.Screen name="invoices/report" options={backOptions('تقرير المبيعات', '/(app)/invoices')} />
      <Tabs.Screen name="products/new" options={backOptions('إضافة منتج', '/(app)/products')} />
      <Tabs.Screen name="products/[id]" options={backOptions('تفاصيل المنتج', '/(app)/products')} />
    </Tabs>
  );
}
