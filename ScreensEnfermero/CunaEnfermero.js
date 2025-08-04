import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

const screenWidth = Dimensions.get('window').width;
const MONGO_API_BASE = 'http://localhost:5000'; // Tu API para MongoDB
const API_URL = 'http://localhost:3000'; // Tu API principal para SQL

// --- Componentes Reutilizables ---

function Dato({ icon, label, value, color }) {
  return (
    <View style={styles.dato}>
      <Ionicons name={icon} size={22} color={color} style={{ marginRight: 10 }} />
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function MiniSensor({ icon, label, value, color }) {
  return (
    <View style={styles.miniSensor}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.miniLabel}>{label}:</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function ConfirmationModal({ isVisible, title, message, onConfirm, onCancel }) {
  if (!isVisible) return null;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={isVisible}
      onRequestClose={onCancel}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <Text style={modalStyles.title}>{title}</Text>
          <Text style={modalStyles.message}>{message}</Text>
          <View style={modalStyles.buttonContainer}>
            <TouchableOpacity style={modalStyles.cancelButton} onPress={onCancel}>
              <Text style={modalStyles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.confirmButton} onPress={onConfirm}>
              <Text style={modalStyles.buttonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- Componente Principal ---
export default function CunasEnfermeroScreen({ userId }) {
  const [vista, setVista] = useState('grid');
  const [cunaSeleccionada, setCunaSeleccionada] = useState(null);
  const [cunas, setCunas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [cunaToConfirm, setCunaToConfirm] = useState(null);
  const [sensorData, setSensorData] = useState({});
  const [weightData, setWeightData] = useState({}); // NUEVO: Estado para el peso
  const [modalProblema, setModalProblema] = useState(false);
  const [cunaProblema, setCunaProblema] = useState('');
  const [descripcionProblema, setDescripcionProblema] = useState('');
  const [enviandoProblema, setEnviandoProblema] = useState(false);

  // --- Funciones de Fetching de Datos ---
  const fetchCunas = async () => {
    if (!userId) {
        setLoading(false);
        return;
    };
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/cunas/enfermero/${userId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error HTTP! estado: ${response.status}, mensaje: ${errorText}`);
      }
      const data = await response.json();
      const cunasFormateadas = data.map(cuna => ({
        idCuna: cuna.idCuna,
        nombre: cuna.nombre,
        status: cuna.Estado ? 'Ocupada' : 'Libre',
        fechaAsig: cuna.FechaAsig,
        nombreCuarto: cuna.nombreCuarto,
        nombreHospital: cuna.nombreHospital,
      }));
      setCunas(cunasFormateadas);
    } catch (error) {
      console.error("[fetchCunas] Error al obtener cunas:", error);
      Alert.alert("Error", "No se pudieron cargar las cunas. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCunas();
  }, [userId]);

  // --- HOOK MEJORADO PARA SENSORES Y PESO ---
  useEffect(() => {
    if (!cunas.length) return;
    let isMounted = true;

    const fetchAllData = async () => {
      // --- 1. Obtener datos de sensores (MongoDB) ---
      const cunaMongoIds = cunas.map(c => `CUNA${String(c.idCuna).padStart(3, '0')}`).join(',');
      
      try {
        const sensorRes = await fetch(`${MONGO_API_BASE}/sensor-data?cunas=${cunaMongoIds}&limit=${cunas.length}`);
        if(sensorRes.ok) {
            const sensorJson = await sensorRes.json();
            if (isMounted && sensorJson.data) {
                const mappedSensorData = sensorJson.data.reduce((acc, reading) => {
                    const cunaIdNumber = parseInt(reading.cunaId.replace('CUNA', ''), 10);
                    if (!acc[cunaIdNumber]) { // Guardar solo el más reciente
                        acc[cunaIdNumber] = reading;
                    }
                    return acc;
                }, {});
                setSensorData(mappedSensorData);
            }
        }
      } catch(e) {
          console.error("Error fetching sensor data from MongoDB:", e);
      }

      // --- 2. Obtener datos de peso (SQL) ---
      try {
        const weightPromises = cunas.map(cuna =>
          fetch(`${API_URL}/api/bebe/peso/${cuna.idCuna}`).then(res => res.ok ? res.json() : null)
        );
        const weightResults = await Promise.all(weightPromises);
        
        if (isMounted) {
          const mappedWeightData = {};
          weightResults.forEach((result, index) => {
            if (result && result.success) {
              const cunaId = cunas[index].idCuna;
              mappedWeightData[cunaId] = result.peso;
            }
          });
          setWeightData(mappedWeightData);
        }
      } catch (e) {
        console.error("Error fetching weight data from SQL:", e);
      }
    };

    fetchAllData();
    const interval = setInterval(fetchAllData, 6000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [cunas]);

  // --- Funciones de Lógica y Navegación ---
  const getCunaSensorData = (cunaId) => sensorData[cunaId] || null;
  const getCunaWeight = (cunaId) => weightData[cunaId] || '---';

  const handleDarAlta = (cunaADarDeAlta) => {
    setCunaToConfirm(cunaADarDeAlta);
    setIsModalVisible(true);
  };

  const confirmDarAlta = async () => {
    if (!cunaToConfirm) return;

    setIsModalVisible(false);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/cunas/dar-de-alta/${cunaToConfirm.idCuna}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error en la respuesta del servidor');
      }

      const result = await response.json();
      Alert.alert("Éxito", result.message || "Alta médica completada correctamente.");
      
      await fetchCunas();
      volverAListado();

    } catch (error) {
      console.error("[Frontend] Error al dar de alta:", error);
      Alert.alert("Error", "No se pudo completar el alta médica");
    } finally {
      setLoading(false);
      setCunaToConfirm(null);
    }
  };

  const cancelDarAlta = () => {
    setIsModalVisible(false);
    setCunaToConfirm(null);
  };

  const mostrarDetalle = (cuna) => {
    setCunaSeleccionada(cuna);
    setVista('detalle');
  };

  const volverAListado = () => {
    setVista('grid');
    setCunaSeleccionada(null);
  };

  // --- Lógica del Modal de Problema Técnico ---
  const abrirModalProblema = () => {
    setCunaProblema('');
    setDescripcionProblema('');
    setModalProblema(true);
  };

  const cerrarModalProblema = () => {
    setModalProblema(false);
  };

  const enviarProblemaTecnico = async () => {
    if (!cunaProblema || !descripcionProblema.trim()) {
      Alert.alert('Error', 'Selecciona una cuna y describe el problema.');
      return;
    }
    setEnviandoProblema(true);
    try {
      const body = {
        idCuna: cunaProblema,
        descripcion: descripcionProblema,
        idEnfermero: userId,
        fecha: new Date().toISOString(),
      };
      const res = await fetch(`${MONGO_API_BASE}/problemas-tecnicos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('No se pudo guardar el problema técnico');
      Alert.alert('Éxito', 'El problema técnico fue reportado correctamente.');
      cerrarModalProblema();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setEnviandoProblema(false);
    }
  };

  // --- Componentes de Renderizado ---
  const renderDetalleCuna = (cuna) => {
    const sensor = getCunaSensorData(cuna.idCuna);
    const peso = getCunaWeight(cuna.idCuna);
    
    return (
      <View style={styles.detalleContainerCompleto}>
        <View style={styles.detalleHeader}>
          <Text style={styles.detalleTitle}>{cuna.nombre}</Text>
          <Text style={styles.detalleSub}>Asignada el {new Date(cuna.fechaAsig).toLocaleDateString()}</Text>
        </View>
        <View style={styles.detalleCard}>
          <Dato icon="thermometer" label="Temperatura" value={sensor?.temperatura !== undefined ? `${sensor.temperatura.toFixed(1)}°C` : '---'} color="#FF5252" />
          <Dato icon="heart" label="Frec. Cardiaca" value={sensor?.frecuenciaCardiaca !== undefined ? sensor.frecuenciaCardiaca : '---'} color="#E91E63" />
          <Dato icon="pulse" label="Oxigenación" value={sensor?.oxigenacion !== undefined ? `${sensor.oxigenacion}%` : '---'} color="#42A5F5" />
          <Dato icon="move" label="Movimiento" value={sensor?.movimiento !== undefined ? (sensor.movimiento ? 'Sí' : 'No') : '---'} color="#AB47BC" />
          <Dato icon="scale" label="Peso" value={peso !== '---' ? `${peso} kg` : '---'} color="#7E57C2" />
          <Dato icon="checkmark-circle" label="Estado" value={cuna.status} color="#5D9C59" />
          <Dato icon="home" label="Cuarto" value={cuna.nombreCuarto} color="#4A2C8E" />
          <Dato icon="medkit" label="Hospital" value={cuna.nombreHospital} color="#4A2C8E" />
          
          <TouchableOpacity
            style={styles.botonDarAlta}
            onPress={() => handleDarAlta(cuna)}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.botonTexto}>Dar de alta</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !cunas.length) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9F5FF' }}>
        <ActivityIndicator size="large" color="#4A2C8E" />
        <Text style={{ fontSize: 18, color: '#4A2C8E', marginTop: 10 }}>Cargando cunas...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={styles.headerTitle}>Cunas Asignadas</Text>

        {vista === 'detalle' && cunaSeleccionada ? (
          <View>
            {renderDetalleCuna(cunaSeleccionada)}
            <TouchableOpacity style={styles.botonVolver} onPress={volverAListado}>
               <Ionicons name="arrow-back-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
               <Text style={styles.botonTexto}>Volver al listado</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {cunas.length === 0 ? (
              <Text style={styles.noCunasText}>No tienes cunas asignadas actualmente.</Text>
            ) : cunas.length <= 2 ? (
              <View>
                {cunas.map(cuna => <View key={cuna.idCuna}>{renderDetalleCuna(cuna)}</View>)}
              </View>
            ) : (
              <View style={styles.grid}>
                {cunas.map((cuna) => {
                  const sensor = getCunaSensorData(cuna.idCuna);
                  const peso = getCunaWeight(cuna.idCuna);
                  return (
                    <TouchableOpacity key={cuna.idCuna} style={styles.card} onPress={() => mostrarDetalle(cuna)}>
                      <Text style={styles.cunaTitle}>{cuna.nombre}</Text>
                      <MiniSensor icon="heart" label="F.C." value={sensor?.frecuenciaCardiaca || '---'} color="#E91E63" />
                      <MiniSensor icon="pulse" label="O₂" value={sensor?.oxigenacion ? `${sensor.oxigenacion}%` : '---'} color="#42A5F5" />
                      <MiniSensor icon="scale" label="Peso" value={peso !== '---' ? `${peso} kg` : '---'} color="#7E57C2" />
                      <MiniSensor icon="checkmark-circle" label="Estado" value={cuna.status} color="#5D9C59" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modales y Botón Flotante */}
      <ConfirmationModal
        isVisible={isModalVisible}
        title="Confirmar Alta Médica"
        message={`¿Estás seguro de dar de alta al bebé en ${cunaToConfirm ? cunaToConfirm.nombre : 'esta cuna'}?`}
        onConfirm={confirmDarAlta}
        onCancel={cancelDarAlta}
      />

      <TouchableOpacity
        style={styles.fabProblema}
        onPress={abrirModalProblema}
        activeOpacity={0.8}
      >
        <Ionicons name="alert-circle-outline" size={28} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8 }}>Reportar Falla</Text>
      </TouchableOpacity>

      <Modal visible={modalProblema} transparent animationType="slide" onRequestClose={cerrarModalProblema}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Text style={modalStyles.title}>Reporte de Problema Técnico</Text>
            <Text style={modalStyles.label}>Selecciona la cuna:</Text>
            <View style={modalStyles.selectContainer}>
              <Ionicons name="bed-outline" size={20} color="#4A2C8E" style={{ marginRight: 8 }} />
              <Picker
                selectedValue={cunaProblema}
                style={modalStyles.picker}
                onValueChange={itemValue => setCunaProblema(itemValue)}
                mode="dropdown"
                dropdownIconColor="#4A2C8E"
              >
                <Picker.Item label="Selecciona una cuna" value="" color="#888" />
                {cunas.map(cuna => (
                  <Picker.Item key={cuna.idCuna} label={cuna.nombre} value={cuna.idCuna} />
                ))}
              </Picker>
            </View>
            <Text style={modalStyles.label}>Descripción del problema:</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Describe el problema técnico de la cuna o sensores..."
              value={descripcionProblema}
              onChangeText={setDescripcionProblema}
              multiline
              numberOfLines={4}
            />
            <View style={modalStyles.buttonContainer}>
              <TouchableOpacity style={modalStyles.cancelButton} onPress={cerrarModalProblema} disabled={enviandoProblema}>
                <Text style={modalStyles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.confirmButton} onPress={enviarProblemaTecnico} disabled={enviandoProblema}>
                <Text style={modalStyles.buttonText}>{enviandoProblema ? 'Enviando...' : 'Aceptar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F5FF', padding: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#4A2C8E', textAlign: 'center', marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  card: {
    width: (screenWidth / 2) - 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#7E57C2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cunaTitle: { fontSize: 16, fontWeight: 'bold', color: '#4A2C8E', marginBottom: 10, textAlign: 'center' },
  miniSensor: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  miniLabel: { marginLeft: 5, fontSize: 13, color: '#555', fontWeight: '600' },
  miniValue: { marginLeft: 5, fontSize: 13, fontWeight: 'bold', color: '#2c3e50' },
  dato: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  label: { fontSize: 16, color: '#4A2C8E', fontWeight: '600' },
  value: { fontSize: 16, marginLeft: 6, fontWeight: 'bold', color: '#333' },
  detalleHeader: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  detalleTitle: { fontSize: 24, fontWeight: 'bold', color: '#4A2C8E' },
  detalleSub: { fontSize: 14, color: '#777', marginTop: 4 },
  detalleCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#7E57C2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    marginHorizontal: 5,
  },
  detalleContainerCompleto: {
    marginBottom: 25,
  },
  botonVolver: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#4A2C8E',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    elevation: 4,
    marginBottom: 40,
    marginTop: 10,
  },
  botonDarAlta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#d9534f',
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
    elevation: 3,
    shadowColor: '#d9534f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  noCunasText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#777',
    width: '100%',
  },
  fabProblema: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#d9534f',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#d9534f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 20,
  }
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 26,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A2C8E',
    marginBottom: 18,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
  },
  label: {
      fontSize: 16,
      color: '#4A2C8E',
      fontWeight: '600',
      alignSelf: 'flex-start',
      marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
    gap: 10,
  },
  confirmButton: {
    backgroundColor: '#d9534f',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
    minWidth: 110,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
    minWidth: 110,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 12,
    width: '100%',
    height: 50,
  },
  picker: {
    flex: 1,
    color: '#333',
    backgroundColor: 'transparent',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9fb',
    color: '#333',
    width: '100%',
    minHeight: 70,
    marginBottom: 18,
    textAlignVertical: 'top',
  },
});
