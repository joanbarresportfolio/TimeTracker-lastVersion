import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Schedule } from '../types';

export default function SchedulesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const data = await apiService.getMySchedules();
      setSchedules(data);
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSchedules();
    setRefreshing(false);
  };

  const getDayName = (dayOfWeek: number) => {
    const days = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    return days[dayOfWeek];
  };

  const formatTime = (time: string) => {
    return time;
  };

  const renderScheduleItem = ({ item }: { item: Schedule }) => (
    <View style={[styles.scheduleCard, !item.isActive && styles.inactiveCard]}>
      <View style={styles.scheduleHeader}>
        <Text style={styles.dayText}>{getDayName(item.dayOfWeek)}</Text>
        {!item.isActive && <Text style={styles.inactiveText}>Inactivo</Text>}
      </View>
      <Text style={styles.timeText}>
        {formatTime(item.startTime)} - {formatTime(item.endTime)}
      </Text>
    </View>
  );

  const groupSchedulesByDay = () => {
    const grouped = schedules.reduce((acc, schedule) => {
      if (!acc[schedule.dayOfWeek]) {
        acc[schedule.dayOfWeek] = [];
      }
      acc[schedule.dayOfWeek].push(schedule);
      return acc;
    }, {} as Record<number, Schedule[]>);

    // Convert to array and sort by day of week
    return Object.entries(grouped)
      .map(([day, schedules]) => ({
        dayOfWeek: parseInt(day),
        schedules: schedules.sort((a, b) => a.startTime.localeCompare(b.startTime)),
      }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Horarios</Text>
        </View>
        <View style={styles.centered}>
          <Text>Cargando horarios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const groupedSchedules = groupSchedulesByDay();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Horarios</Text>
      </View>

      {groupedSchedules.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No tienes horarios asignados</Text>
          <Text style={styles.emptySubtext}>
            Contacta con tu supervisor para configurar tus horarios de trabajo
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedSchedules}
          keyExtractor={(item) => item.dayOfWeek.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.daySection}>
              <Text style={styles.dayHeader}>{getDayName(item.dayOfWeek)}</Text>
              {item.schedules.map((schedule, index) => (
                <View key={schedule.id || index} style={[styles.scheduleCard, !schedule.isActive && styles.inactiveCard]}>
                  <View style={styles.scheduleContent}>
                    <Text style={styles.timeText}>
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </Text>
                    {!schedule.isActive && <Text style={styles.inactiveLabel}>Inactivo</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    marginRight: 15,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContainer: {
    padding: 20,
  },
  daySection: {
    marginBottom: 20,
  },
  dayHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inactiveCard: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  scheduleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 16,
    color: '#666',
  },
  inactiveText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveLabel: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});