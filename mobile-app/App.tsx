/**
 * APLICACIÓN MÓVIL PRINCIPAL
 * ==========================
 * 
 * App principal para la aplicación móvil de seguimiento de tiempo.
 * Maneja la navegación entre pantallas de login y dashboard.
 */

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SchedulesScreen from './src/screens/SchedulesScreen';
import IncidentsScreen from './src/screens/IncidentsScreen';
import { User } from './src/types/schema';
import { setAuthToken } from './src/services/api';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: { user: User };
  Schedules: { user: User };
  Incidents: { user: User };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false, // Inicialmente false porque no hay persistencia aún
  });

  /**
   * Maneja el login exitoso
   */
  const handleLoginSuccess = (user: User, token: string) => {
    // Establecer token en el servicio API
    setAuthToken(token);
    
    // Actualizar estado de autenticación
    setAuthState({
      isAuthenticated: true,
      user,
      token,
      loading: false,
    });
  };

  /**
   * Maneja el logout
   */
  const handleLogout = () => {
    // Limpiar token del servicio API
    setAuthToken(null);
    
    // Resetear estado de autenticación
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
    });
  };

  // Hacer handleLogout accesible globalmente para el DashboardScreen
  React.useEffect(() => {
    (global as any).handleLogout = handleLogout;
    return () => {
      delete (global as any).handleLogout;
    };
  }, []);

  // Mostrar loading si está cargando
  if (authState.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando...</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  // Mostrar navegación según estado de autenticación
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {authState.isAuthenticated && authState.user ? (
          // Usuario autenticado - Mostrar stack de navegación principal
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false,
              animation: 'slide_from_right' 
            }}
          >
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen}
              initialParams={{ user: authState.user }}
            />
            <Stack.Screen 
              name="Schedules" 
              component={SchedulesScreen}
            />
            <Stack.Screen 
              name="Incidents" 
              component={IncidentsScreen}
            />
          </Stack.Navigator>
        ) : (
          // Usuario no autenticado - Solo pantalla de login
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false 
            }}
          >
            <Stack.Screen name="Login">
              {() => <LoginScreen onLoginSuccess={handleLoginSuccess} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
});