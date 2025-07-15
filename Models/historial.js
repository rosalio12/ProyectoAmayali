import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen({ userId }) { // Recibe userId como prop
  const [vaccines, setVaccines] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true); // Se inicia en true para la carga inicial
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null); // 'vacuna' o 'condicion'
  const [inputValue, setInputValue] = useState('');
  const [idBebe, setIdBebe] = useState(null); // Estado para almacenar el idBebe dinámico

  const formatFecha = (fechaStr) => {
    if (!fechaStr) return 'Fecha desconocida';
    const opciones = { day: 'numeric', month: 'long', year: 'numeric' };
    const fecha = new Date(fechaStr);
    const fechaFormateada = fecha.toLocaleDateString('es-MX', opciones);
    return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  };

  const fetchBebeIdForUser = async (currentUserId) => {
    setLoading(true); // Inicia la carga
    try {
      const response = await fetch(`http://172.18.2.158:3000/api/bebes/usuario/${currentUserId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error al obtener bebés para el usuario: ${response.status} - ${errorText}`);
        setIdBebe(null); 
        setLoading(false); // <--- IMPORTANTE: Se pone en false si hay error al obtener el bebé
        return;
      }
      
      const data = await response.json();
      if (data && data.length > 0 && data[0].idBebe) {
        setIdBebe(data[0].idBebe);
        await fetchDataForBebe(data[0].idBebe); 
      } else {
        console.warn('No se encontraron bebés para el usuario:', currentUserId);
        setIdBebe(null); 
        setLoading(false); // <--- IMPORTANTE: Se pone en false si no se encuentran bebés
      }
    } catch (error) {
      console.error('Error de red o inesperado al obtener idBebe:', error);
      Alert.alert('Error de Conexión', 'No se pudo conectar al servidor para obtener el ID del bebé. Verifica tu red.');
      setIdBebe(null);
      setLoading(false); // <--- IMPORTANTE: Se pone en false si hay un error de red
    }
  };

  const fetchDataForBebe = async (bebeId) => {
    if (!bebeId) {
      setVaccines([]);
      setConditions([]);
      setLoading(false); // <--- IMPORTANTE: Se pone en false si no hay idBebe válido
      return;
    }
    
    // Ya estamos en estado de carga por fetchBebeIdForUser, no necesitamos ponerlo en true de nuevo

    try {
      const vacunasRes = await fetch(`http://172.18.2.158:3000/api/vacunas/${userId}/${bebeId}`);
      const vacunasData = await vacunasRes.json();
      setVaccines(vacunasData);

      const condicionesRes = await fetch(`http://172.18.2.158:3000/api/condiciones/${userId}/${bebeId}`);
      const condicionesData = await condicionesRes.json();
      setConditions(condicionesData);

    } catch (error) {
      console.error('Error al cargar historial médico para el bebé:', error);
      Alert.alert('Error de Carga', 'No se pudo cargar el historial médico. Intenta de nuevo más tarde.');
      setVaccines([]); 
      setConditions([]);
    } finally {
      setLoading(false); // <--- IMPORTANTE: Siempre se pone en false al finalizar las llamadas de datos
    }
  };

  useEffect(() => {
    if (userId) {
      fetchBebeIdForUser(userId);
    } else {
      setLoading(false); // Si no hay userId desde el inicio, no cargamos y mostramos vacío
      setIdBebe(null); 
      Alert.alert('Error de Usuario', 'No se encontró un ID de usuario válido. Por favor, vuelve a iniciar sesión.');
    }
  }, [userId]); 

  const handleAdd = async () => {
    if (!inputValue.trim()) {
      Alert.alert('Campo vacío', 'Escribe algo primero.');
      return;
    }
    if (idBebe === null) {
      Alert.alert('Error', 'No se pudo determinar el bebé asociado para guardar el historial. Asegúrate de que tu usuario tenga un bebé asignado.');
      return;
    }

    const fecha = new Date().toISOString().split('T')[0];
    const payload = { idBebe, fecha };

    let url = '';
    if (modalType === 'vacuna') {
      payload.vacunas = inputValue;
      url = 'http://localhost:3000/api/vacunas';
    } else {
      payload.observaciones = inputValue;
      url = 'http://localhost:3000/api/condiciones';
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        Alert.alert('Éxito', `${modalType === 'vacuna' ? 'Vacuna' : 'Condición'} agregada correctamente.`);
        fetchDataForBebe(idBebe); 
      } else {
        const errorData = await res.json();
        Alert.alert('Error', `No se pudo guardar: ${errorData.message || res.statusText}`);
      }
    } catch (err) {
      console.error('Error al guardar:', err);
      Alert.alert('Error de Red', 'Fallo al guardar. Verifica tu conexión o el servidor.');
    } finally {
      setInputValue('');
      setModalVisible(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6c5ce7" />
        <Text style={{ marginTop: 10, color: '#6c5ce7' }}>Cargando historial médico...</Text>
      </View>
    );
  }

  // Una vez que loading es false (ya sea por éxito o por error/sin datos),
  // se renderiza esta parte, mostrando la UI con o sin datos.
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="folder-open-outline" size={28} color="#6c5ce7" />
        <Text style={styles.screenTitle}>Historial Médico</Text>
      </View>

      {/* VACUNAS */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#6c5ce7" />
          <Text style={styles.cardTitle}>Vacunas</Text>
        </View>
        {vaccines.length > 0 ? (
          vaccines.map((v, i) => (
            <View key={i} style={styles.item}>
              <Ionicons name="medkit-outline" size={18} color="#6c5ce7" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{v.Vacunas}</Text>
                <Text style={styles.itemDetail}>{formatFecha(v.FechaVisitaMedica)}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={20} color="#aaa" />
            {idBebe === null ? (
              <Text style={styles.singleItem}>No se pudo cargar vacunas. Bebé no asociado o error en el servidor.</Text>
            ) : (
              <Text style={styles.singleItem}>No hay vacunas registradas aún</Text>
            )}
          </View>
        )}
        <TouchableOpacity
          style={[styles.addButton, idBebe === null && styles.disabledButton]}
          onPress={() => {
            setModalType('vacuna');
            setModalVisible(true);
          }}
          disabled={idBebe === null}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Agregar Vacuna</Text>
        </TouchableOpacity>
      </View>

      {/* CONDICIONES */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="heart-outline" size={24} color="#6c5ce7" />
          <Text style={styles.cardTitle}>Condiciones Médicas</Text>
        </View>
        {conditions.length > 0 ? (
          conditions.map((c, i) => (
            <View key={i} style={styles.item}>
              <Ionicons name="document-text-outline" size={18} color="#6c5ce7" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{c.Descripcion}</Text>
                <Text style={styles.itemDetail}>{formatFecha(c.FechaVisitaMedica)}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={20} color="#aaa" />
            {idBebe === null ? (
              <Text style={styles.singleItem}>No se pudo cargar condiciones. Bebé no asociado o error en el servidor.</Text>
            ) : (
              <Text style={styles.singleItem}>Sin condiciones médicas registradas</Text>
            )}
          </View>
        )}
        <TouchableOpacity
          style={[styles.addButton, idBebe === null && styles.disabledButton]}
          onPress={() => {
            setModalType('condicion');
            setModalVisible(true);
          }}
          disabled={idBebe === null}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Agregar Condición</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'vacuna' ? 'Nueva Vacuna' : 'Nueva Condición Médica'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Describe aquí..."
              placeholderTextColor="#999"
              value={inputValue}
              onChangeText={setInputValue}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={handleAdd}>
                <Text style={styles.buttonText}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setInputValue('');
                }}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9fb',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6c5ce7',
    marginLeft: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 18,
    marginBottom: 25,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6c5ce7',
    marginLeft: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemTitle: { fontSize: 16, color: '#333', fontWeight: '600' },
  itemDetail: { fontSize: 13, color: '#777', marginTop: 4 },
  singleItem: { fontSize: 14, color: '#777', marginLeft: 8 },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6c5ce7',
    padding: 14,
    borderRadius: 50,
    marginTop: 15,
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    width: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6c5ce7',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    backgroundColor: '#6c5ce7',
    padding: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#b2bec3',
    padding: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
});