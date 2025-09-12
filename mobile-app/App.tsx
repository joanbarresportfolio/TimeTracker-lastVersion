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
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { User } from './src/types/schema';
import { setAuthToken } from './src/services/api';

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

  // Mostrar pantalla según estado de autenticación
  return (
    <>
      {authState.isAuthenticated && authState.user ? (
        <DashboardScreen
          user={authState.user}
          onLogout={handleLogout}
        />
      ) : (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
      <StatusBar style="auto" />
    </>
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