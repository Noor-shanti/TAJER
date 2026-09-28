import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useGlobalSearchParams, useRouter } from 'expo-router';
import type { ColorValue } from 'react-native';
import { authApi } from '../../src/features/auth/api/authApi';

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
  const { returnTo } = useGlobalSearchParams<{ returnTo?: string }>();

  const goBack = (fallback: string) => {
    const origin = Array.isArray(returnTo) ? returnTo[0] : returnTo;
    if (origin?.startsWith('/(app)/')) {
      router.replace(origin as never);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallback as never);
  };

  const requestLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد الخروج من حساب التاجر على هذا الجهاز؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تسجيل الخروج',
        style: 'destructive',
        onPress: async () => {
          await authApi.logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const backOptions = (title: string, fallback: string) => ({
    href: null,
    title,
    headerLeft: () => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        onPress={() => goBack(fallback)}
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
        headerTitleStyle: {
          color: '#FFFFFF',
          fontWeight: '800',
          fontSize: 21,
          transform: [{ translateY: -22 }],
        },
        headerTitleAlign: 'center',
        headerRight: () => (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="تسجيل الخروج" onPress={requestLogout} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ),
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
