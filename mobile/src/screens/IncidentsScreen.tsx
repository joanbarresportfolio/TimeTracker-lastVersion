import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Incident } from '../types';

export default function IncidentsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newIncident, setNewIncident] = useState({
    type: '',
    description: '',
  });

  const incidentTypes = [
    { key: 'late', label: 'Llegada tarde' },
    { key: 'absence', label: 'Ausencia' },
    { key: 'early_departure', label: 'Salida temprana' },
    { key: 'forgot_clock_in', label: 'Olvidé fichar entrada' },
    { key: 'forgot_clock_out', label: 'Olvidé fichar salida' },
  ];

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const data = await apiService.getMyIncidents();
      setIncidents(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIncidents();
    setRefreshing(false);
  };

  const handleCreateIncident = async () => {
    if (!newIncident.type || !newIncident.description.trim()) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    try {
      await apiService.createIncident({
        type: newIncident.type,
        description: newIncident.description.trim(),
        date: new Date(),
      });

      setModalVisible(false);
      setNewIncident({ type: '', description: '' });
      Alert.alert('Éxito', 'Incidencia reportada correctamente');
      await loadIncidents();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Error al crear incidencia');
    }
  };

  const getIncidentTypeLabel = (type: string) => {
    const found = incidentTypes.find((t) => t.key === type);
    return found ? found.label : type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      default:
        return '#FF9500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      default:
        return 'Pendiente';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderIncidentItem = ({ item }: { item: Incident }) => (
    <View style={styles.incidentCard}>
      <View style={styles.incidentHeader}>
        <Text style={styles.incidentType}>{getIncidentTypeLabel(item.type)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.incidentDescription}>{item.description}</Text>
      <Text style={styles.incidentDate}>
        Fecha: {formatDate(item.date.toString())} | Reportado: {formatDate(item.createdAt.toString())}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Incidencias</Text>
        </View>
        <View style={styles.centered}>
          <Text>Cargando incidencias...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Incidencias</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Text style={styles.addText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {incidents.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No tienes incidencias reportadas</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.createButton}>
            <Text style={styles.createButtonText}>Reportar primera incidencia</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={renderIncidentItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Create Incident Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reportar Incidencia</Text>

            <Text style={styles.fieldLabel}>Tipo de incidencia</Text>
            <View style={styles.typeContainer}>
              {incidentTypes.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeButton,
                    newIncident.type === type.key && styles.typeButtonSelected,
                  ]}
                  onPress={() => setNewIncident({ ...newIncident, type: type.key })}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      newIncident.type === type.key && styles.typeButtonTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Descripción</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Describe la incidencia..."
              value={newIncident.description}
              onChangeText={(text) => setNewIncident({ ...newIncident, description: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setNewIncident({ type: '', description: '' });
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateIncident} style={styles.submitButton}>
                <Text style={styles.submitButtonText}>Reportar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
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
    flex: 1,
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  incidentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  incidentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  incidentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  incidentDate: {
    fontSize: 12,
    color: '#999',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  typeContainer: {
    marginBottom: 20,
  },
  typeButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  typeButtonSelected: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  typeButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  descriptionInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    height: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});