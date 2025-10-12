/**
 * PANTALLA DE HISTORIAL DE TURNOS
 * ================================
 * 
 * Pantalla para visualizar el historial de turnos/fichajes del empleado.
 * Incluye filtros por fecha y visualización de detalles de cada turno.
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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { User, DailyWorkday } from '../types/schema';
import { getDailyWorkdays } from '../services/api';

type HistoryNavigationProp = NativeStackNavigationProp<RootStackParamList, 'History'>;

interface HistoryScreenProps {
  route: {
    params: {
      user: User;
    };
  };
}

export default function HistoryScreen({ route }: HistoryScreenProps) {
  const navigation = useNavigation<HistoryNavigationProp>();
  const { user } = route.params;
  
  const [dailyWorkdays, setDailyWorkdays] = useState<DailyWorkday[]>([]);
  const [filteredWorkdays, setFilteredWorkdays] = useState<DailyWorkday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  /**
   * Carga las jornadas diarias del empleado
   */
  const loadDailyWorkdays = async () => {
    try {
      setLoading(true);
      
      // Cargar últimos 30 días por defecto
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const defaultStartDate = thirtyDaysAgo.toISOString().split('T')[0];
      const defaultEndDate = new Date().toISOString().split('T')[0];
      
      const workdays = await getDailyWorkdays(
        startDate || defaultStartDate,
        endDate || defaultEndDate
      );
      
      setDailyWorkdays(workdays);
      setFilteredWorkdays(workdays);
    } catch (error) {
      console.error('Error loading daily workdays:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los registros. Verifica tu conexión e inténtalo nuevamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Aplica filtros a los registros
   */
  const applyFilters = () => {
    let filtered = [...dailyWorkdays];
    
    if (startDate) {
      filtered = filtered.filter(workday => workday.date >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(workday => workday.date <= endDate);
    }
    
    setFilteredWorkdays(filtered);
  };

  /**
   * Limpia los filtros
   */
  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilteredWorkdays(dailyWorkdays);
  };

  /**
   * Maneja el refresh pull-to-refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDailyWorkdays();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDailyWorkdays();
  }, []);

  /**
   * Formatea la fecha para mostrar
   */
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  /**
   * Formatea minutos a horas:minutos
   */
  const formatDuration = (minutes: number | null | undefined): string => {
    if (minutes === null || minutes === undefined) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  /**
   * Renderiza una tarjeta de jornada diaria
   */
  const renderWorkdayCard = (workday: DailyWorkday) => {
    const isComplete = workday.status === 'closed';
    
    return (
      <View key={workday.id} style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryDate}>{formatDate(workday.date)}</Text>
          {isComplete ? (
            <View style={styles.completeBadge}>
              <Text style={styles.completeText}>Completo</Text>
            </View>
          ) : (
            <View style={styles.incompleteBadge}>
              <Text style={styles.incompleteText}>En curso</Text>
            </View>
          )}
        </View>
        
        <View style={styles.entryDetails}>
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Tiempo trabajado:</Text>
            <Text style={styles.timeValue}>{formatDuration(workday.workedMinutes)}</Text>
          </View>
          
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Pausas:</Text>
            <Text style={styles.timeValue}>{formatDuration(workday.breakMinutes)}</Text>
          </View>
          
          {workday.overtimeMinutes > 0 && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Horas extra:</Text>
              <Text style={[styles.timeValue, { color: '#f59e0b' }]}>{formatDuration(workday.overtimeMinutes)}</Text>
            </View>
          )}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>
              {formatDuration(workday.workedMinutes + workday.breakMinutes)}
            </Text>
          </View>
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
          <Text style={styles.title}>Historial</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando historial...</Text>
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
        <Text style={styles.title}>Historial</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Filtros */}
        <View style={styles.filtersCard}>
          <Text style={styles.filtersTitle}>Filtros</Text>
          
          <View style={styles.filterRow}>
            <View style={styles.filterInput}>
              <Text style={styles.filterLabel}>Desde:</Text>
              <TextInput
                style={styles.dateInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            </View>
            
            <View style={styles.filterInput}>
              <Text style={styles.filterLabel}>Hasta:</Text>
              <TextInput
                style={styles.dateInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>
          
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={applyFilters}
            >
              <Text style={styles.applyButtonText}>Aplicar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Resultados */}
        <Text style={styles.resultsText}>
          {filteredWorkdays.length} registro{filteredWorkdays.length !== 1 ? 's' : ''} encontrado{filteredWorkdays.length !== 1 ? 's' : ''}
        </Text>

        {filteredWorkdays.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay registros para mostrar</Text>
            <Text style={styles.emptySubtext}>
              Ajusta los filtros o espera a tener más jornadas registradas.
            </Text>
          </View>
        ) : (
          <View style={styles.entriesContainer}>
            {filteredWorkdays
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(renderWorkdayCard)}
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
  filtersCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  filterInput: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: '#1f2937',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  resultsText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  entriesContainer: {
    paddingBottom: 20,
  },
  entryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  completeBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completeText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  incompleteBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  incompleteText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  entryDetails: {
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  timeValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  totalLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  breaksSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  breaksTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  breakRow: {
    paddingLeft: 8,
  },
  breakLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
});
