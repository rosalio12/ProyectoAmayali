import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';


const API_BASE_URL = 'http://localhost:3000';

// Componente para cada tarjeta del historial (sin cambios)
const HistoryEntryCard = ({ entry, isEditingContact, onEdit, onSave, onCancel, draftContact, setDraftContact }) => {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyCardHeader}>
        <Ionicons name="calendar-outline" size={20} color="#7E57C2" />
        <Text style={styles.historyCardDateText}>
          Visita del {new Date(entry.FechaVisitaMedica).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      {entry.ObservacionesMedicas && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="document-text-outline" size={16} /> Observaciones
          </Text>
          <Text style={styles.sectionContent}>{entry.ObservacionesMedicas}</Text>
        </View>
      )}

      {entry.Vacunas && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="eyedrop-outline" size={16} /> Vacunas
          </Text>
          <Text style={styles.sectionContent}>{entry.Vacunas}</Text>
        </View>
      )}

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="shield-checkmark-outline" size={16} /> Contacto de Emergencia
        </Text>
        {isEditingContact ? (
          <View>
            <TextInput style={styles.input} placeholder="Nombre del Contacto" value={draftContact.contactoNombre} onChangeText={t => setDraftContact(prev => ({ ...prev, contactoNombre: t }))} />
            <TextInput style={styles.input} placeholder="Teléfono" keyboardType="phone-pad" value={draftContact.contactoTelefono} onChangeText={t => setDraftContact(prev => ({ ...prev, contactoTelefono: t }))} />
            <TextInput style={styles.input} placeholder="Relación (ej. Madre, Padre)" value={draftContact.contactoRelacion} onChangeText={t => setDraftContact(prev => ({ ...prev, contactoRelacion: t }))} />
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={onSave}>
                <Text style={styles.actionButtonText}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={onCancel}>
                <Text style={styles.actionButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionContent}>
              {entry.ContactoEmergenciaNombre || 'No especificado'} ({entry.ContactoEmergenciaRelacion || 'N/A'})
            </Text>
            <Text style={styles.sectionContent}>
              {entry.ContactoEmergenciaTelefono || 'No especificado'}
            </Text>
            <TouchableOpacity style={styles.editButton} onPress={onEdit}>
              <Ionicons name="pencil" size={14} color="#fff" />
              <Text style={styles.editButtonText}>Editar Contacto</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};


export default function HistoryEnfermeroScreen({ userId }) {
  const [bebes, setBebes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para la UI
  const [expandedIds, setExpandedIds] = useState({});
  const [histories, setHistories] = useState({});
  const [historiesLoading, setHistoriesLoading] = useState({});
  const [historiesError, setHistoriesError] = useState({});
  const [editingContactId, setEditingContactId] = useState({});
  const [draftContact, setDraftContact] = useState({});
  const [newObservation, setNewObservation] = useState({});
  
  // La lógica de carga y guardado se mantiene como la tenías
  useEffect(() => {
    async function loadBebes() {
      if (!userId) {
        setError('ID de usuario no disponible.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const resp = await fetch(
          `${API_BASE_URL}/api/enfermero/historial-bebes-completo/${userId}`
        );
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(`Error ${resp.status}: ${txt}`);
        }
        const data = await resp.json();
        if (!data.length) {
          setBebes([]);
        } else {
          setBebes(data.map(item => ({
            id: item.idBebe,
            nombre: item.BebeNombre,
            apellidoPaterno: item.BebeApellidoPaterno,
            apellidoMaterno: item.BebeApellidoMaterno,
            sexo: item.BebeSexo,
            peso: item.BebePeso,
            fechaNacimiento: item.BebeFechaNacimiento,
            idCuna: item.idCuna
          })));
        }
      } catch (err) {
        console.error(err);
        setError(`Error al cargar historial: ${err.message}`);
        Alert.alert('Error', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadBebes();
  }, [userId]);

  const toggleExpanded = async babyId => {
    setExpandedIds(prev => ({ ...prev, [babyId]: !prev[babyId] }));
    if (!histories[babyId]) {
      setHistoriesLoading(prev => ({ ...prev, [babyId]: true }));
      try {
        const resp = await fetch(
          `${API_BASE_URL}/api/enfermero/historial/${babyId}`
        );
        if (!resp.ok) throw new Error(`Código ${resp.status}`);
        const data = await resp.json();
        // Ordenamos los historiales del más reciente al más antiguo
        const sortedData = data.sort((a, b) => new Date(b.FechaVisitaMedica) - new Date(a.FechaVisitaMedica));
        setHistories(prev => ({ ...prev, [babyId]: sortedData }));
      } catch (err) {
        console.error(err);
        setHistoriesError(prev => ({ ...prev, [babyId]: err.message }));
      } finally {
        setHistoriesLoading(prev => ({ ...prev, [babyId]: false }));
      }
    }
  };

  const startEditContact = (babyId, entry) => {
    setEditingContactId({ [babyId]: entry.idHistorial });
    setDraftContact({
      contactoNombre: entry.ContactoEmergenciaNombre || '',
      contactoTelefono: entry.ContactoEmergenciaTelefono || '',
      contactoRelacion: entry.ContactoEmergenciaRelacion || ''
    });
  };
  const cancelEditContact = () => {
    setEditingContactId({});
    setDraftContact({});
  };
  const saveContact = async (babyId, entryId) => {
    try {
      const payload = {
        ContactoEmergenciaNombre: draftContact.contactoNombre,
        ContactoEmergenciaTelefono: draftContact.contactoTelefono,
        ContactoEmergenciaRelacion: draftContact.contactoRelacion
      };
      const resp = await fetch(
        `${API_BASE_URL}/api/enfermero/historial/${entryId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      if (!resp.ok) throw new Error(`Código ${resp.status}`);
      setHistories(prev => ({
        ...prev,
        [babyId]: prev[babyId].map(e =>
          e.idHistorial === entryId ? { ...e, ...payload } : e
        )
      }));
      cancelEditContact();
      Alert.alert('Éxito', 'Contacto actualizado.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message);
    }
  };

  const startNewObservation = babyId => {
    setNewObservation({ [babyId]: '' });
  };
  
  const cancelNewObservation = () => {
    setNewObservation({});
  };

  // Esta función se mantiene con la lógica original de crear un nuevo registro
  const submitNewObservation = async babyId => {
    const observationText = newObservation[babyId];
    if (!observationText || observationText.trim() === '') {
      return Alert.alert('Error', 'La observación no puede estar vacía.');
    }
    try {
      const payload = {
        idBebe: babyId,
        ObservacionesMedicas: observationText,
        Vacunas: '',
        FechaVisitaMedica: new Date().toISOString().split('T')[0],
        idUsuario: userId
      };

      const resp = await fetch(
        `${API_BASE_URL}/api/enfermero/historial`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Error ${resp.status}: ${errorText}`);
      }
      
      const savedRecord = await resp.json();
      
      setHistories(prev => ({
        ...prev,
        [babyId]: [savedRecord, ...(prev[babyId] || [])]
      }));
      
      cancelNewObservation();
      Alert.alert('Éxito', 'Nueva observación agregada.');

    } catch (err) {
      console.error(err);
      Alert.alert('Error al guardar', err.message);
    }
  };


  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4A2C8E" /><Text>Cargando...</Text></View>;
  if (error) return <View style={styles.errorContainer}><Text style={styles.errorText}>Error: {error}</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Historial de Bebés</Text>
      <FlatList
        data={bebes}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => {
          const expanded = !!expandedIds[item.id];
          const isAddingObservation = newObservation[item.id] !== undefined;

          return (
            <View style={styles.bebeCard}>
              <TouchableOpacity onPress={() => toggleExpanded(item.id)}>
                <View style={styles.bebeCardHeader}>
                    <Text style={styles.bebeName}>{item.nombre} {item.apellidoPaterno} {item.apellidoMaterno}</Text>
                    <Ionicons name={expanded ? "chevron-up-circle" : "chevron-down-circle"} size={24} color="#7E57C2" />
                </View>
                <Text style={styles.bebeInfo}>Nacido el: {new Date(item.fechaNacimiento).toLocaleDateString()}</Text>
              </TouchableOpacity>

              {expanded && (
                <View style={styles.expandedContent}>
                  <TouchableOpacity style={styles.pdfButton} onPress={() => Linking.openURL(`${API_BASE_URL}/api/enfermero/historial/${item.id}/pdf`).catch(() => Alert.alert("Error", "No se pudo generar el PDF."))}>
                    <Ionicons name="cloud-download-outline" size={18} color="#fff" />
                    <Text style={styles.pdfButtonText}>Descargar Reporte PDF</Text>
                  </TouchableOpacity>
                  
                  {isAddingObservation ? (
                    <View style={styles.newForm}>
                      <Text style={styles.detailsHeader}>Añadir Nueva Observación</Text>
                      <TextInput
                        style={styles.inputObservation}
                        placeholder="Escribe una nueva observación..."
                        value={newObservation[item.id]}
                        onChangeText={text => setNewObservation({ [item.id]: text })}
                        multiline
                      />
                      <View style={styles.buttonGroup}>
                        <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={() => submitNewObservation(item.id)}>
                          <Text style={styles.actionButtonText}>Guardar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={cancelNewObservation}>
                          <Text style={styles.actionButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.addButton} onPress={() => startNewObservation(item.id)}>
                      <Ionicons name="add-circle-outline" size={22} color="#fff" />
                      <Text style={styles.addButtonText}>Agregar Observación</Text>
                    </TouchableOpacity>
                  )}
                  
                  {historiesLoading[item.id] ? <ActivityIndicator /> : historiesError[item.id] ? <Text style={styles.errorText}>Error: {historiesError[item.id]}</Text> : (
                  histories[item.id]?.length > 0 ? histories[item.id].map((entry) => (
                    <HistoryEntryCard
                      key={entry.idHistorial} // ✅ CORRECCIÓN APLICADA AQUÍ
                      entry={entry}
                      isEditingContact={editingContactId[item.id] === entry.idHistorial}
                      onEdit={() => startEditContact(item.id, entry)}
                      onSave={() => saveContact(item.id, entry.idHistorial)}
                      onCancel={cancelEditContact}
                      draftContact={draftContact}
                      setDraftContact={setDraftContact}
                    />
                  )) : <Text style={styles.noHistoryText}>Aún no hay registros para este bebé.</Text>
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

// Estilos (sin cambios)
const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#F0F4F8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: 'red', textAlign: 'center' },
  header: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#1E2A3B' },
  bebeCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#9DAABF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  bebeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bebeName: { fontSize: 20, fontWeight: '700', color: '#4A2C8E' },
  bebeInfo: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  expandedContent: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 15 },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BF360C',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  pdfButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  noHistoryText: { textAlign: 'center', color: '#6B7280', marginVertical: 20, fontStyle: 'italic' },
  
  historyCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    marginBottom: 0,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
    marginBottom: 10,
  },
  historyCardDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A2C8E',
    marginLeft: 8,
  },
  historySection: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 5,
  },
  sectionContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7E57C2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 12,
  },
  
  newForm: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E0E0E0', padding: 15, borderRadius: 10, marginBottom: 15 },
  detailsHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fff' },
  inputObservation: { minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fff', fontSize: 15 },
  buttonGroup: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  actionButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  saveButton: { backgroundColor: '#10B981' }, // Verde
  cancelButton: { backgroundColor: '#6B7280' }, // Gris
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#4A2C8E',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15, 
  },
  addButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});