/**
 * HOOK DE AUTENTICACIÓN SIMPLIFICADO
 * ==================================
 * 
 * Hook personalizado que maneja el estado de autenticación
 * de la aplicación móvil. Versión simplificada sin persistencia.
 */

import React, { createContext, useContext, useState } from 'react';
import { AuthState, User } from '../types/schema';
import { setAuthToken } from '../services/api';

interface AuthContextType {
  authState: AuthState;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Proveedor de contexto de autenticación
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
  });

  /**
   * Maneja el login del usuario
   */
  const login = (user: User, token: string) => {
    // Establecer token en el servicio de API
    setAuthToken(token);

    // Actualizar estado
    setAuthState({
      isAuthenticated: true,
      user,
      token,
      loading: false,
    });
  };

  /**
   * Maneja el logout del usuario
   */
  const logout = () => {
    // Limpiar token del servicio de API
    setAuthToken(null);

    // Actualizar estado
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
    });
  };

  const contextValue: AuthContextType = {
    authState,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para usar el contexto de autenticación
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
}