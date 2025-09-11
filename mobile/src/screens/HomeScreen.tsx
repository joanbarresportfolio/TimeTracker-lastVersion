import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { TimeEntry, Break } from '../types';

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [currentTimeEntry, setCurrentTimeEntry] = useState<TimeEntry | null>(null);
  const [activeBreak, setActiveBreak] = useState<Break | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCurrentStatus();
  }, []);

  const loadCurrentStatus = async () => {
    try {
      const timeEntries = await apiService.getMyTimeEntries();
      // Find today's entry that's not clocked out
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = timeEntries.find(
        (entry) => entry.date === today && !entry.clockOut
      );
      setCurrentTimeEntry(todayEntry || null);

      // Check for active break
      if (todayEntry?.breaks) {
        const activeBreak = todayEntry.breaks.find((b) => !b.endTime);
        setActiveBreak(activeBreak || null);
      }
    } catch (error) {
      console.error('Error loading status:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCurrentStatus();
    setRefreshing(false);
  };

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const entry = await apiService.clockIn();
      setCurrentTimeEntry(entry);
      Alert.alert('Éxito', 'Has fichado la entrada correctamente');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Error al fichar entrada');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      const entry = await apiService.clockOut();
      setCurrentTimeEntry(null);
      setActiveBreak(null);
      Alert.alert('Éxito', 'Has fichado la salida correctamente');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Error al fichar salida');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = (type: 'coffee' | 'lunch' | 'bathroom' | 'other') => {
    Alert.alert(
      'Iniciar Pausa',
      `¿Quieres iniciar una pausa para ${getBreakTypeText(type)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: async () => {
            setLoading(true);
            try {
              const breakEntry = await apiService.startBreak(type);
              setActiveBreak(breakEntry);
              Alert.alert('Pausa Iniciada', `Has iniciado una pausa para ${getBreakTypeText(type)}`);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Error al iniciar pausa');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEndBreak = async () => {
    if (!activeBreak) return;

    setLoading(true);
    try {
      await apiService.endBreak(activeBreak.id);
      setActiveBreak(null);
      Alert.alert('Pausa Finalizada', 'Has finalizado tu pausa');
      await loadCurrentStatus(); // Reload to get updated data
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Error al finalizar pausa');
    } finally {
      setLoading(false);
    }
  };

  const getBreakTypeText = (type: string) => {
    switch (type) {
      case 'coffee':
        return 'café';
      case 'lunch':
        return 'almuerzo';
      case 'bathroom':
        return 'baño';
      default:
        return 'otro';
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Hola, {user?.firstName}</Text>
            <Text style={styles.subtitleText}>{user?.position}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Current Status */}
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>Estado Actual</Text>
          {currentTimeEntry ? (
            <View>
              <Text style={styles.statusText}>
                Fichado desde: {formatTime(currentTimeEntry.clockIn)}
              </Text>
              {activeBreak && (
                <Text style={styles.breakText}>
                  En pausa ({getBreakTypeText(activeBreak.type)}) desde:{' '}
                  {formatTime(activeBreak.startTime)}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.statusText}>No has fichado hoy</Text>
          )}
        </View>

        {/* Clock In/Out Buttons */}
        <View style={styles.clockButtons}>
          {!currentTimeEntry ? (
            <TouchableOpacity
              style={[styles.clockButton, styles.clockInButton]}
              onPress={handleClockIn}
              disabled={loading}
            >
              <Text style={styles.clockButtonText}>Fichar Entrada</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.clockButton, styles.clockOutButton]}
              onPress={handleClockOut}
              disabled={loading || !!activeBreak}
            >
              <Text style={styles.clockButtonText}>
                {activeBreak ? 'Finaliza pausa primero' : 'Fichar Salida'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Break Buttons */}
        {currentTimeEntry && !activeBreak && (
          <View style={styles.breakSection}>
            <Text style={styles.sectionTitle}>Pausas</Text>
            <View style={styles.breakButtons}>
              <TouchableOpacity
                style={styles.breakButton}
                onPress={() => handleStartBreak('coffee')}
                disabled={loading}
              >
                <Text style={styles.breakButtonText}>☕ Café</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.breakButton}
                onPress={() => handleStartBreak('lunch')}
                disabled={loading}
              >
                <Text style={styles.breakButtonText}>🍽️ Almuerzo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.breakButton}
                onPress={() => handleStartBreak('bathroom')}
                disabled={loading}
              >
                <Text style={styles.breakButtonText}>🚻 Baño</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.breakButton}
                onPress={() => handleStartBreak('other')}
                disabled={loading}
              >
                <Text style={styles.breakButtonText}>⏸️ Otro</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* End Break Button */}
        {activeBreak && (
          <View style={styles.endBreakSection}>
            <TouchableOpacity
              style={[styles.clockButton, styles.endBreakButton]}
              onPress={handleEndBreak}
              disabled={loading}
            >
              <Text style={styles.clockButtonText}>Finalizar Pausa</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Navigation */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Schedules')}
          >
            <Text style={styles.navButtonText}>📅 Horarios</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Incidents')}
          >
            <Text style={styles.navButtonText}>⚠️ Incidencias</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#007AFF',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitleText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 16,
    color: '#666',
  },
  breakText: {
    fontSize: 14,
    color: '#FF6B35',
    marginTop: 5,
    fontWeight: '500',
  },
  clockButtons: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  clockButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  clockInButton: {
    backgroundColor: '#34C759',
  },
  clockOutButton: {
    backgroundColor: '#FF3B30',
  },
  endBreakButton: {
    backgroundColor: '#FF9500',
  },
  clockButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  breakSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  breakButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  breakButton: {
    backgroundColor: '#fff',
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  breakButtonText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  endBreakSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  navButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 16,
    marginHorizontal: 5,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});