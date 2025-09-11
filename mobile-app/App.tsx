import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, SafeAreaView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

class ApiService {
  private baseUrl = API_URL;
  private authToken: string | null = null;

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }

  private async request<T>(endpoint: string, options: any = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async login(credentials: any) {
    return this.request('/api/auth/mobile/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async clockIn() {
    return this.request('/api/time-entries/clock-in', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async clockOut() {
    return this.request('/api/time-entries/clock-out', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async startBreak(type: string) {
    return this.request('/api/breaks/start', {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }

  async endBreak() {
    return this.request('/api/breaks/end', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getMyTimeEntries() {
    return this.request('/api/time-entries/my');
  }
}

const apiService = new ApiService();

function LoginScreen({ onLoginSuccess }: { onLoginSuccess: (token: string, user: User) => void }) {
  const [email, setEmail] = useState('ana.garcia@company.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingresa email y contraseña');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.login({
        email: email.trim(),
        password: password.trim(),
      });
      
      await SecureStore.setItemAsync('auth_token', response.token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(response.user));
      
      apiService.setAuthToken(response.token);
      onLoginSuccess(response.token, response.user);
      
    } catch (error: any) {
      Alert.alert('Error de inicio de sesión', error.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginContainer}>
        <Text style={styles.title}>Control de Horarios</Text>
        <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function HomeScreen({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [loading, setLoading] = useState(false);
  const [currentTimeEntry, setCurrentTimeEntry] = useState<any>(null);
  const [activeBreak, setActiveBreak] = useState<any>(null);

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    try {
      const timeEntries = await apiService.getMyTimeEntries();
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = timeEntries.find((entry: any) => entry.date === today);
      
      if (todayEntry) {
        setCurrentTimeEntry(todayEntry);
        setActiveBreak(todayEntry.activeBreak);
      }
    } catch (error) {
      console.error('Error loading today data:', error);
    }
  };

  const handleClockIn = async () => {
    setLoading(true);
    try {
      await apiService.clockIn();
      Alert.alert('Éxito', 'Entrada registrada correctamente');
      loadTodayData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al registrar entrada');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      await apiService.clockOut();
      Alert.alert('Éxito', 'Salida registrada correctamente');
      loadTodayData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al registrar salida');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async (type: 'coffee' | 'lunch') => {
    setLoading(true);
    try {
      await apiService.startBreak(type);
      Alert.alert('Éxito', `Pausa de ${type === 'coffee' ? 'café' : 'almuerzo'} iniciada`);
      loadTodayData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al iniciar pausa');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setLoading(true);
    try {
      await apiService.endBreak();
      Alert.alert('Éxito', 'Pausa finalizada');
      loadTodayData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al finalizar pausa');
    } finally {
      setLoading(false);
    }
  };

  const isWorking = currentTimeEntry && currentTimeEntry.clockIn && !currentTimeEntry.clockOut;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.homeContainer}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>¡Hola, {user.firstName}!</Text>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            Estado: {isWorking ? '🟢 Trabajando' : '🔴 No trabajando'}
          </Text>
          {currentTimeEntry && (
            <Text style={styles.hoursText}>
              Horas hoy: {(currentTimeEntry.totalHours || 0).toFixed(2)}h
            </Text>
          )}
        </View>

        <View style={styles.actionsContainer}>
          {!isWorking ? (
            <TouchableOpacity 
              style={[styles.button, styles.successButton]} 
              onPress={handleClockIn}
              disabled={loading}
            >
              <Text style={styles.buttonText}>🕒 Fichar Entrada</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.dangerButton]} 
              onPress={handleClockOut}
              disabled={loading}
            >
              <Text style={styles.buttonText}>🏁 Fichar Salida</Text>
            </TouchableOpacity>
          )}
        </View>

        {isWorking && (
          <View style={styles.breakSection}>
            <Text style={styles.sectionTitle}>Pausas</Text>
            {!activeBreak ? (
              <View style={styles.breakButtons}>
                <TouchableOpacity 
                  style={[styles.button, styles.warningButton]} 
                  onPress={() => handleStartBreak('coffee')}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>☕ Pausa Café</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.infoButton]} 
                  onPress={() => handleStartBreak('lunch')}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>🍽️ Pausa Almuerzo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.activeBreakContainer}>
                <Text style={styles.activeBreakText}>
                  🟡 Pausa activa: {activeBreak.type === 'coffee' ? 'Café ☕' : 'Almuerzo 🍽️'}
                </Text>
                <TouchableOpacity 
                  style={[styles.button, styles.primaryButton]} 
                  onPress={handleEndBreak}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>Finalizar Pausa</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007bff" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userData = await SecureStore.getItemAsync('user_data');
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        apiService.setAuthToken(token);
        setAuthToken(token);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      await handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (token: string, userData: User) => {
    setAuthToken(token);
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('user_data');
      apiService.clearAuthToken();
      setAuthToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user && authToken ? (
        <HomeScreen user={user} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  homeContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  successButton: {
    backgroundColor: '#28a745',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  warningButton: {
    backgroundColor: '#ffc107',
  },
  infoButton: {
    backgroundColor: '#17a2b8',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#dc3545',
    fontSize: 14,
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  hoursText: {
    fontSize: 16,
    color: '#666',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  breakSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  breakButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  activeBreakContainer: {
    alignItems: 'center',
  },
  activeBreakText: {
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});