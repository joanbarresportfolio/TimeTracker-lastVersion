import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { apiService } from '../services/api';
import { User } from '../types/auth';

interface HomeScreenProps {
  user: User;
  onLogout: () => void;
}

export default function HomeScreen({ user, onLogout }: HomeScreenProps) {
  const [loading, setLoading] = useState(false);
  const [currentTimeEntry, setCurrentTimeEntry] = useState<any>(null);
  const [activeBreak, setActiveBreak] = useState<any>(null);
  const [todayHours, setTodayHours] = useState(0);

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
        setTodayHours(todayEntry.totalHours || 0);
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
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Error al registrar entrada');
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
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Error al registrar salida');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async (type: 'coffee' | 'lunch') => {
    if (!currentTimeEntry?.id) {
      Alert.alert('Error', 'Debes fichar entrada primero');
      return;
    }

    setLoading(true);
    try {
      const breakEntry = await apiService.startBreak(currentTimeEntry.id, type);
      setActiveBreak(breakEntry);
      Alert.alert('Éxito', `Pausa de ${type === 'coffee' ? 'café' : 'almuerzo'} iniciada`);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Error al iniciar pausa');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!activeBreak?.id) {
      Alert.alert('Error', 'No hay pausa activa');
      return;
    }

    setLoading(true);
    try {
      await apiService.endBreak(activeBreak.id);
      setActiveBreak(null);
      Alert.alert('Éxito', 'Pausa finalizada');
      loadTodayData();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Error al finalizar pausa');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Hola, {user.firstName} {user.lastName}
        </Text>
        <Text style={styles.roleText}>
          {user.employeeNumber} - {user.role === 'admin' ? 'Administrador' : 'Empleado'}
        </Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timeCard}>
        <Text style={styles.cardTitle}>Horario de Hoy</Text>
        
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Entrada:</Text>
          <Text style={styles.timeValue}>{formatTime(currentTimeEntry?.clockIn)}</Text>
        </View>
        
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Salida:</Text>
          <Text style={styles.timeValue}>{formatTime(currentTimeEntry?.clockOut)}</Text>
        </View>
        
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Horas trabajadas:</Text>
          <Text style={styles.timeValue}>{formatHours(todayHours)}</Text>
        </View>
      </View>

      <View style={styles.actionsCard}>
        <Text style={styles.cardTitle}>Acciones</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.clockInButton]}
            onPress={handleClockIn}
            disabled={loading || !!currentTimeEntry?.clockIn}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.actionButtonText}>Fichar Entrada</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.clockOutButton]}
            onPress={handleClockOut}
            disabled={loading || !currentTimeEntry?.clockIn || !!currentTimeEntry?.clockOut}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.actionButtonText}>Fichar Salida</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {currentTimeEntry?.clockIn && !currentTimeEntry?.clockOut && (
        <View style={styles.breaksCard}>
          <Text style={styles.cardTitle}>Pausas</Text>
          
          {activeBreak ? (
            <View>
              <Text style={styles.activeBreakText}>
                Pausa activa: {activeBreak.type === 'coffee' ? 'Café' : 'Almuerzo'}
              </Text>
              <TouchableOpacity
                style={[styles.actionButton, styles.endBreakButton]}
                onPress={handleEndBreak}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>Finalizar Pausa</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.coffeeButton]}
                onPress={() => handleStartBreak('coffee')}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>Pausa Café</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.lunchButton]}
                onPress={() => handleStartBreak('lunch')}
                disabled={loading}
              >
                <Text style={styles.actionButtonText}>Pausa Almuerzo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007bff',
    padding: 20,
    paddingTop: 40,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  roleText: {
    fontSize: 14,
    color: '#e3f2fd',
    marginBottom: 15,
  },
  logoutButton: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
  timeCard: {
    backgroundColor: '#ffffff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionsCard: {
    backgroundColor: '#ffffff',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  breaksCard: {
    backgroundColor: '#ffffff',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeLabel: {
    fontSize: 16,
    color: '#666',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  clockInButton: {
    backgroundColor: '#28a745',
  },
  clockOutButton: {
    backgroundColor: '#dc3545',
  },
  coffeeButton: {
    backgroundColor: '#795548',
  },
  lunchButton: {
    backgroundColor: '#ff9800',
  },
  endBreakButton: {
    backgroundColor: '#6c757d',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeBreakText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 5,
  },
});