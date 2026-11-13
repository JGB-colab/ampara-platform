import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';

import { coleta } from '../lib/coleta';
import { colors } from '../lib/theme';

export default function RootLayout() {
  coleta.ensureConfigLoaded();
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          sceneStyle: { backgroundColor: colors.bg },
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Coleta',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="speedometer-outline" color={color as string} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Painel',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="analytics-outline" color={color as string} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="codigos"
          options={{
            title: 'Códigos',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="warning-outline" color={color as string} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="config"
          options={{
            title: 'Ajustes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" color={color as string} size={size} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
