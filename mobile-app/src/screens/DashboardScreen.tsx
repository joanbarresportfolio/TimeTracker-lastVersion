/**
 * PANTALLA DE DASHBOARD PRINCIPAL
 * ===============================
 * 
 * Pantalla principal de la aplicación móvil que muestra el resumen
 * del estado actual del empleado, fichajes, horarios y estadísticas.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import {
  getCurrentTimeEntry,
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getTimeStats,
  logoutUser,
} from '../services/api';
import { 
  User, 
  TimeEntry, 
  TimeStats 
} from '../types/schema';

type DashboardNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;

interface DashboardScreenProps {
  route: {
    params: {
      user: User;
    };
  };
}

export default function DashboardScreen({ route }: DashboardScreenProps) {
  const navigation = useNavigation<DashboardNavigationProp>();
  const { user } = route.params;
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<TimeStats | null>(null);

  /**
   * Carga los datos iniciales del empleado
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Cargar estado de fichaje actual y estadísticas en paralelo
      const [currentEntryData, statsData] = await Promise.all([
        getCurrentTimeEntry(),
        getTimeStats().catch(() => null), // No fallar si stats no están disponibles
      ]);

      setCurrentEntry(currentEntryData);
      setIsWorking(!!currentEntryData && !currentEntryData.clockOut);
      setStats(statsData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el fichaje de entrada
   */
  const handleClockIn = async () => {
    try {
      setClockLoading(true);
      
      const entry = await clockIn();
      setCurrentEntry(entry);
      setIsWorking(true);
      
      Alert.alert('¡Fichaje Exitoso!', 'Tu entrada ha sido registrada correctamente');
      
    } catch (error) {
      console.error('Error en clock-in:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error al registrar entrada';
      Alert.alert('Error de Fichaje', errorMessage);
    } finally {
      setClockLoading(false);
    }
  };

  /**
   * Maneja el fichaje de salida
   */
  const handleClockOut = async () => {
    try {
      setClockLoading(true);
      
      const entry = await clockOut();
      setCurrentEntry(entry);
      setIsWorking(false);
      setIsOnBreak(false); // Al salir, ya no está en pausa
      
      Alert.alert('¡Salida Registrada!', 'Tu salida ha sido registrada correctamente');
      
      // Recargar stats después del clock-out
      const newStats = await getTimeStats();
      setStats(newStats);
      
    } catch (error) {
      console.error('Error en clock-out:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error al registrar salida';
      Alert.alert('Error de Fichaje', errorMessage);
    } finally {
      setClockLoading(false);
    }
  };

  /**
   * Maneja el inicio de pausa
   */
  const handleStartBreak = async () => {
    try {
      setBreakLoading(true);
      
      await startBreak();
      setIsOnBreak(true);
      
      Alert.alert('¡Pausa Iniciada!', 'Tu pausa ha sido registrada correctamente');
      
    } catch (error) {
      console.error('Error al iniciar pausa:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error al iniciar pausa';
      Alert.alert('Error', errorMessage);
    } finally {
      setBreakLoading(false);
    }
  };

  /**
   * Maneja el fin de pausa
   */
  const handleEndBreak = async () => {
    try {
      setBreakLoading(true);
      
      await endBreak();
      setIsOnBreak(false);
      
      Alert.alert('¡Pausa Finalizada!', 'Has vuelto al trabajo');
      
    } catch (error) {
      console.error('Error al finalizar pausa:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error al finalizar pausa';
      Alert.alert('Error', errorMessage);
    } finally {
      setBreakLoading(false);
    }
  };

  /**
   * Maneja el logout del usuario
   */
  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              // Llamar al servidor para logout
              await logoutUser();
            } catch (error) {
              console.warn('Error al hacer logout en el servidor:', error);
              // Continuar con el logout local aunque el servidor falle
            }
            
            // Siempre hacer logout local
            if ((global as any).handleLogout) {
              (global as any).handleLogout();
            } else {
              Alert.alert('Error', 'No se pudo cerrar sesión. Por favor, reinicia la aplicación.');
            }
          },
        },
      ]
    );
  };

  /**
   * Maneja el refresh de la pantalla
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Formatear hora para mostrar
  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Formatear fecha para mostrar
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header con información del usuario */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>¡Hola, {user.firstName}!</Text>
            <Text style={styles.date}>{formatDate(new Date())}</Text>
            <Text style={styles.role}>
              {user.roleSystem === 'admin' ? 'Administrador' : 'Empleado'} • #{user.numEmployee}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjeta de estado de fichaje */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estado Actual</Text>
          
          {currentEntry ? (
            <View style={styles.timeEntryInfo}>
              <Text style={[
                styles.statusText, 
                isOnBreak ? styles.onBreak : (isWorking ? styles.working : styles.notWorking)
              ]}>
                {isOnBreak ? 'EN PAUSA' : (isWorking ? 'TRABAJANDO' : 'FUERA DE SERVICIO')}
              </Text>
              <Text style={styles.clockInText}>
                Entrada: {formatTime(currentEntry.clockIn)}
              </Text>
              {currentEntry.clockOut && (
                <Text style={styles.clockOutText}>
                  Salida: {formatTime(currentEntry.clockOut)}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.noEntryText}>
              No hay fichajes registrados hoy
            </Text>
          )}

          {/* Botón de fichaje */}
          <TouchableOpacity
            style={[
              styles.clockButton,
              isWorking ? styles.clockOutButton : styles.clockInButton,
              clockLoading && styles.clockButtonDisabled
            ]}
            onPress={isWorking ? handleClockOut : handleClockIn}
            disabled={clockLoading}
          >
            {clockLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.clockButtonText}>
                {isWorking ? 'Registrar Salida' : 'Registrar Entrada'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Botones de pausa - solo mostrar cuando está trabajando */}
          {isWorking && !currentEntry?.clockOut && (
            <View style={styles.breakButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.breakButton,
                  isOnBreak ? styles.endBreakButton : styles.startBreakButton,
                  breakLoading && styles.clockButtonDisabled
                ]}
                onPress={isOnBreak ? handleEndBreak : handleStartBreak}
                disabled={breakLoading}
              >
                {breakLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.breakButtonText}>
                    {isOnBreak ? 'Finalizar Pausa' : 'Iniciar Pausa'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tarjeta de estadísticas */}
        {stats && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Estadísticas</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalHoursThisWeek}h</Text>
                <Text style={styles.statLabel}>Esta semana</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalHoursThisMonth}h</Text>
                <Text style={styles.statLabel}>Este mes</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.averageHoursPerDay}h</Text>
                <Text style={styles.statLabel}>Promedio diario</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.daysWorkedThisMonth}</Text>
                <Text style={styles.statLabel}>Días trabajados</Text>
              </View>
            </View>
          </View>
        )}

        {/* Botones de navegación */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('Schedules', { user })}
          >
            <Text style={styles.navButtonText}>Ver Horarios</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('History', { user })}
          >
            <Text style={styles.navButtonText}>Historial</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => navigation.navigate('Incidents', { user })}
          >
            <Text style={styles.navButtonText}>Incidencias</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  date: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  role: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  timeEntryInfo: {
    marginBottom: 20,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  working: {
    color: '#10b981',
  },
  notWorking: {
    color: '#ef4444',
  },
  onBreak: {
    color: '#f59e0b',
  },
  clockInText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  clockOutText: {
    fontSize: 16,
    color: '#374151',
  },
  noEntryText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  clockButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  clockInButton: {
    backgroundColor: '#10b981',
  },
  clockOutButton: {
    backgroundColor: '#ef4444',
  },
  clockButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  clockButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  breakButtonsContainer: {
    marginTop: 12,
  },
  breakButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startBreakButton: {
    backgroundColor: '#f59e0b',
  },
  endBreakButton: {
    backgroundColor: '#10b981',
  },
  breakButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  navigationButtons: {
    padding: 16,
  },
  navButton: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  navButtonText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
});