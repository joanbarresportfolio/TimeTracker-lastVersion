/**
 * PANTALLA DE INCIDENCIAS
 * =======================
 * 
 * Pantalla para visualizar y crear incidencias del empleado.
 * Permite ver el historial de incidencias y reportar nuevas incidencias.
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
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { User, Incident, InsertIncident } from '../types/schema';
import { getMyIncidents, createIncident } from '../services/api';

type IncidentsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Incidents'>;

interface IncidentsScreenProps {
  route: {
    params: {
      user: User;
    };
  };
}

/**
 * Tipos de incidencias con traducciones
 */
const INCIDENT_TYPES = {
  late: 'Llegada tardía',
  absence: 'Ausencia',
  early_departure: 'Salida temprana',
  forgot_clock_in: 'Olvido de fichaje de entrada',
  forgot_clock_out: 'Olvido de fichaje de salida',
} as const;

/**
 * Estados de incidencias con traducciones
 */
const INCIDENT_STATUSES = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
} as const;

/**
 * Colores para estados de incidencias
 */
const STATUS_COLORS = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
} as const;

export default function IncidentsScreen({ route }: IncidentsScreenProps) {
  const navigation = useNavigation<IncidentsNavigationProp>();
  const { user } = route.params;
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Estado del formulario de nueva incidencia
  const [newIncident, setNewIncident] = useState({
    type: 'late' as const,
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  /**
   * Carga las incidencias del empleado
   */
  const loadIncidents = async () => {
    try {
      setLoading(true);
      const userIncidents = await getMyIncidents();
      setIncidents(userIncidents);
    } catch (error) {
      console.error('Error loading incidents:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar las incidencias. Verifica tu conexión e inténtalo nuevamente.',
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
    await loadIncidents();
    setRefreshing(false);
  };

  /**
   * Crea una nueva incidencia
   */
  const handleCreateIncident = async () => {
    if (!newIncident.description.trim()) {
      Alert.alert('Error', 'Debes proporcionar una descripción para la incidencia.');
      return;
    }

    try {
      setCreating(true);
      const incidentData: InsertIncident = {
        employeeId: user.id,
        type: newIncident.type,
        description: newIncident.description.trim(),
        date: newIncident.date,
        status: 'pending',
      };

      await createIncident(incidentData);
      
      // Resetear formulario
      setNewIncident({
        type: 'late',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      
      setShowCreateModal(false);
      
      // Recargar incidencias
      await loadIncidents();
      
      Alert.alert(
        'Éxito',
        'La incidencia ha sido reportada correctamente. Será revisada por tu supervisor.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error creating incident:', error);
      Alert.alert(
        'Error',
        'No se pudo crear la incidencia. Inténtalo nuevamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  /**
   * Formatea la fecha para mostrar
   */
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  /**
   * Renderiza una tarjeta de incidencia
   */
  const renderIncidentCard = (incident: Incident) => (
    <View key={incident.id} style={styles.incidentCard}>
      <View style={styles.incidentHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.incidentType}>
            {INCIDENT_TYPES[incident.type]}
          </Text>
          <Text style={styles.incidentDate}>
            {formatDate(incident.date)}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: STATUS_COLORS[incident.status] }
        ]}>
          <Text style={styles.statusText}>
            {INCIDENT_STATUSES[incident.status]}
          </Text>
        </View>
      </View>
      
      <Text style={styles.incidentDescription}>
        {incident.description}
      </Text>
      
      <Text style={styles.createdAt}>
        Reportada: {formatDate(incident.createdAt)}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Incidencias</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando incidencias...</Text>
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
        <Text style={styles.title}>Incidencias</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.addButtonText}>+ Reportar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.subtitle}>
          Incidencias de {user.firstName} {user.lastName}
        </Text>

        {incidents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay incidencias registradas</Text>
            <Text style={styles.emptySubtext}>
              Cuando tengas alguna incidencia laboral, puedes reportarla aquí.
            </Text>
          </View>
        ) : (
          <View style={styles.incidentsContainer}>
            {incidents
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(renderIncidentCard)}
          </View>
        )}
      </ScrollView>

      {/* Modal para crear nueva incidencia */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Reportar Incidencia</Text>
            <TouchableOpacity
              onPress={handleCreateIncident}
              disabled={creating}
            >
              <Text style={[
                styles.modalSaveText,
                creating && styles.modalSaveTextDisabled
              ]}>
                {creating ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tipo de incidencia</Text>
              <View style={styles.typeButtons}>
                {Object.entries(INCIDENT_TYPES).map(([type, label]) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      newIncident.type === type && styles.typeButtonActive
                    ]}
                    onPress={() => setNewIncident({ ...newIncident, type: type as any })}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      newIncident.type === type && styles.typeButtonTextActive
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Fecha</Text>
              <TextInput
                style={styles.dateInput}
                value={newIncident.date}
                onChangeText={(date) => setNewIncident({ ...newIncident, date })}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Descripción</Text>
              <TextInput
                style={styles.descriptionInput}
                value={newIncident.description}
                onChangeText={(description) => setNewIncident({ ...newIncident, description })}
                placeholder="Describe los detalles de la incidencia..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    minWidth: 60,
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
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
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
  incidentsContainer: {
    paddingBottom: 20,
  },
  incidentCard: {
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
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  incidentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  incidentDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  incidentDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  createdAt: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6b7280',
    minWidth: 70,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
  },
  modalSaveTextDisabled: {
    color: '#9ca3af',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  typeButtonTextActive: {
    color: '#ffffff',
    fontWeight: '500',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    fontSize: 16,
    color: '#1f2937',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    fontSize: 16,
    color: '#1f2937',
    minHeight: 100,
  },
});