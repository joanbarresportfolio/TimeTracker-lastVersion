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
import { User, Schedule, DateSchedule } from '../types/schema';
import { getMySchedules, getMyDateSchedules } from '../services/api';

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

interface SchedulesByDate {
  [dateStr: string]: {
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

// Timezone-safe YYYY-MM-DD formatter using local time
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get week start (Monday) for a given date
const getWeekStart = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  d.setDate(diff);
  return formatLocalDate(d);
};

export default function SchedulesScreen({ route }: SchedulesScreenProps) {
  const navigation = useNavigation<SchedulesNavigationProp>();
  const { user } = route.params;
  
  // New state for date-specific schedules
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(getWeekStart(new Date()));
  const [schedulesByDate, setSchedulesByDate] = useState<SchedulesByDate>({});
  
  // Legacy state (kept for fallback compatibility)
  const [schedules, setSchedules] = useState<SchedulesByDay>({});
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Carga los horarios del empleado con date-first fetch + legacy fallback
   */
  const loadSchedules = async () => {
    try {
      setLoading(true);
      
      // Calculate week range from selectedWeekStart
      const weekStart = selectedWeekStart;
      const weekEndDate = new Date(weekStart);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const weekEnd = formatLocalDate(weekEndDate);
      
      // STEP 1: Try date-specific schedules first (with resilient fallback)
      let dateSchedules: DateSchedule[] = [];
      let usedFallback = false;
      
      try {
        dateSchedules = await getMyDateSchedules(weekStart, weekEnd);
      } catch (error) {
        console.warn('Date-specific schedules failed, falling back to legacy:', error);
        usedFallback = true;
      }
      
      if (dateSchedules.length > 0) {
        // Date-specific schedules found, group by date
        const newSchedulesByDate: SchedulesByDate = {};
        
        dateSchedules.forEach((schedule: DateSchedule) => {
          if (!newSchedulesByDate[schedule.date]) {
            newSchedulesByDate[schedule.date] = [];
          }
          newSchedulesByDate[schedule.date].push({
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isActive: schedule.isActive,
          });
        });
        
        setSchedulesByDate(newSchedulesByDate);
        setSchedules({}); // Clear legacy state
      } else {
        // STEP 2: Fallback to legacy weekly schedules (on error OR empty result)
        const legacySchedules = await getMySchedules();
        
        if (legacySchedules.length > 0) {
          // Synthesize schedulesByDate for selected week using dayOfWeek mapping
          const synthesizedByDate: SchedulesByDate = {};
          
          for (let i = 0; i < 7; i++) {
            const currentDate = new Date(weekStart);
            currentDate.setDate(currentDate.getDate() + i);
            const dateStr = formatLocalDate(currentDate);
            const dayOfWeek = currentDate.getDay();
            
            const daySchedules = legacySchedules.filter(s => s.dayOfWeek === dayOfWeek && s.isActive);
            if (daySchedules.length > 0) {
              synthesizedByDate[dateStr] = daySchedules.map(s => ({
                startTime: s.startTime,
                endTime: s.endTime,
                isActive: s.isActive,
              }));
            }
          }
          
          setSchedulesByDate(synthesizedByDate);
          setSchedules({}); // Clear legacy state
        } else {
          // No schedules found at all
          setSchedulesByDate({});
          setSchedules({});
        }
      }
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
  }, [user.id, selectedWeekStart]);

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
   * Formatea una fecha como "Lun 16/09" usando locale español
   */
  const formatDateLabel = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
      const dayMonth = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayMonth}`;
    } catch {
      return dateStr;
    }
  };

  /**
   * Navegación a semana anterior
   */
  const goToPreviousWeek = () => {
    const prevWeekDate = new Date(selectedWeekStart);
    prevWeekDate.setDate(prevWeekDate.getDate() - 7);
    setSelectedWeekStart(getWeekStart(prevWeekDate));
  };

  /**
   * Navegación a semana siguiente
   */
  const goToNextWeek = () => {
    const nextWeekDate = new Date(selectedWeekStart);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    setSelectedWeekStart(getWeekStart(nextWeekDate));
  };

  /**
   * Renderiza una fila de fecha específica
   */
  const renderDateSchedule = (dateStr: string) => {
    const dateSchedules = schedulesByDate[dateStr] || [];
    const activeSchedules = dateSchedules.filter(s => s.isActive);
    
    return (
      <View key={dateStr} style={styles.dayRow}>
        <Text style={styles.dayName}>{formatDateLabel(dateStr)}</Text>
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
   * Genera array de fechas de la semana seleccionada
   */
  const getWeekDates = (): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(selectedWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(formatLocalDate(date));
    }
    return dates;
  };

  /**
   * Renderiza la tarjeta de horarios por semana (date-based)
   */
  const renderWeeklyScheduleByDate = () => {
    const weekDates = getWeekDates();
    const weekStartDate = new Date(selectedWeekStart);
    const weekEndDate = new Date(selectedWeekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    
    const weekLabel = `${weekStartDate.getDate()}/${weekStartDate.getMonth() + 1} - ${weekEndDate.getDate()}/${weekEndDate.getMonth() + 1}`;
    
    return (
      <View style={styles.scheduleCard}>
        {/* Week Navigation Header */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity style={styles.navButton} onPress={goToPreviousWeek}>
            <Text style={styles.navButtonText}>← Anterior</Text>
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity style={styles.navButton} onPress={goToNextWeek}>
            <Text style={styles.navButtonText}>Siguiente →</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.scheduleHeader}>
          <Text style={styles.scheduleTitle}>Horario Semanal</Text>
          <Text style={styles.scheduleDescription}>Tu horario de trabajo asignado</Text>
        </View>
        
        <View style={styles.scheduleBody}>
          {weekDates.map(dateStr => renderDateSchedule(dateStr))}
        </View>
      </View>
    );
  };

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

        {Object.keys(schedulesByDate).length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes horarios asignados</Text>
            <Text style={styles.emptySubtext}>
              Contacta a tu supervisor para que te asigne un horario de trabajo.
            </Text>
          </View>
        ) : (
          <View style={styles.schedulesContainer}>
            {renderWeeklyScheduleByDate()}
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
  // Week navigation styles
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
});