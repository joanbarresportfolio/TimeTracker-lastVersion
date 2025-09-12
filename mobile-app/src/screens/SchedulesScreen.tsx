/**
 * PANTALLA DE HORARIOS
 * ====================
 * 
 * Pantalla para visualizar los horarios asignados al empleado actual.
 * Muestra horarios semanales y permite ver detalles de cada día.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { User, Schedule } from '../types/schema';
import { getMySchedules } from '../services/api';

type SchedulesNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Schedules'>;

interface SchedulesScreenProps {
  route: {
    params: {
      user: User;
    };
  };
}

interface SchedulesByDay {
  [dayOfWeek: number]: {
    startTime: string;
    endTime: string;
    isActive: boolean;
  }[];
}

/**
 * Días de la semana en español
 */
const DAYS_OF_WEEK = [
  'Domingo',
  'Lunes',
  'Martes', 
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export default function SchedulesScreen({ route }: SchedulesScreenProps) {
  const navigation = useNavigation<SchedulesNavigationProp>();
  const { user } = route.params;
  const [schedules, setSchedules] = useState<SchedulesByDay>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Carga los horarios del empleado
   */
  const loadSchedules = async () => {
    try {
      setLoading(true);
      const userSchedules = await getMySchedules();
      
      // Agrupar horarios por día de la semana
      const schedulesByDay: SchedulesByDay = {};
      
      userSchedules.forEach((schedule: Schedule) => {
        if (!schedulesByDay[schedule.dayOfWeek]) {
          schedulesByDay[schedule.dayOfWeek] = [];
        }
        schedulesByDay[schedule.dayOfWeek].push({
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isActive: schedule.isActive,
        });
      });
      
      setSchedules(schedulesByDay);
    } catch (error) {
      console.error('Error loading schedules:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los horarios. Verifica tu conexión e inténtalo nuevamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Maneja el refresh pull-to-refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSchedules();
    setRefreshing(false);
  };

  useEffect(() => {
    loadSchedules();
  }, [user.id]);

  /**
   * Formatea el tiempo en formato 24h a 12h
   */
  const formatTime = (time: string): string => {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  /**
   * Renderiza una fila de día de la semana
   */
  const renderDaySchedule = (dayOfWeek: number) => {
    const daySchedules = schedules[dayOfWeek] || [];
    const activeSchedules = daySchedules.filter(s => s.isActive);
    
    return (
      <View key={dayOfWeek} style={styles.dayRow}>
        <Text style={styles.dayName}>{DAYS_OF_WEEK[dayOfWeek]}</Text>
        <View style={styles.timeContainer}>
          {activeSchedules.length > 0 ? (
            activeSchedules.map((sched, index) => (
              <Text key={index} style={styles.timeText}>
                {formatTime(sched.startTime)} - {formatTime(sched.endTime)}
              </Text>
            ))
          ) : (
            <Text style={styles.noWorkText}>Sin horario</Text>
          )}
        </View>
      </View>
    );
  };

  /**
   * Renderiza la tarjeta de horarios semanal
   */
  const renderWeeklySchedule = () => (
    <View style={styles.scheduleCard}>
      <View style={styles.scheduleHeader}>
        <Text style={styles.scheduleTitle}>Horario Semanal</Text>
        <Text style={styles.scheduleDescription}>Tu horario de trabajo asignado</Text>
      </View>
      
      <View style={styles.scheduleBody}>
        {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => renderDaySchedule(dayOfWeek))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Horarios</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando horarios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Horarios</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.subtitle}>
          Horarios asignados para {user.firstName} {user.lastName}
        </Text>

        {Object.keys(schedules).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes horarios asignados</Text>
            <Text style={styles.emptySubtext}>
              Contacta a tu supervisor para que te asigne un horario de trabajo.
            </Text>
          </View>
        ) : (
          <View style={styles.schedulesContainer}>
            {renderWeeklySchedule()}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  schedulesContainer: {
    paddingBottom: 20,
  },
  scheduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scheduleHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  scheduleDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  scheduleBody: {
    padding: 16,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
  },
  timeContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  noWorkText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});