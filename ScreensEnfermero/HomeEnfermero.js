import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Button, ActivityIndicator, Alert, FlatList, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';

// IPs y Puertos de tus backends
const SQL_API_BASE = 'http://192.168.0.223:3000'; // Tu API de SQL Server
const MONGO_API_BASE = 'http://192.168.0.223:5000'; // Tu API de MongoDB
const ALIMENTACION_API_BASE = 'http://192.168.0.223:5000'; // API para alimentación

// --- Componentes de UI refactorizados y con diseño mejorado ---
const VitalSign = ({ icon, value, unit, label, isDanger }) => (
  <View style={[styles.vitalSign, isDanger && styles.vitalSignDanger]}>
    <View style={styles.vitalSignHeader}>
      <Ionicons name={icon} size={24} color={isDanger ? '#FF5252' : '#7E57C2'} />
      <Text style={styles.vitalSignLabel}>{label}</Text>
    </View>
    <Text style={[styles.vitalSignValue, isDanger && styles.vitalSignValueDanger]}>
      {value} <Text style={[styles.vitalSignUnit, isDanger && styles.vitalSignUnitDanger]}>{unit}</Text>
    </Text>
  </View>
);

const MedicalDataCard = ({ heartRate, oxygen, temperature, lastUpdate }) => {
  const isOxygenLow = oxygen && oxygen !== '--' && parseInt(oxygen, 10) < 90;
  const isHeartRateAbnormal = heartRate && heartRate !== '--' && (parseInt(heartRate, 10) > 160 || parseInt(heartRate, 10) < 100);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Monitor de Signos Vitales</Text>
      <View style={styles.vitalSignsContainer}>
        <VitalSign icon="heart" value={heartRate} unit="lpm" label="Ritmo Cardíaco" isDanger={isHeartRateAbnormal} />
        <VitalSign icon="pulse" value={oxygen} unit="%" label="Oxígeno" isDanger={isOxygenLow} />
      </View>
      <View style={styles.temperatureContainer}>
        <Ionicons name="thermometer" size={24} color="#7E57C2" />
        <Text style={styles.temperatureLabel}>Temperatura:</Text>
        <Text style={styles.temperatureValue}>{temperature}</Text>
      </View>
      <Text style={styles.lastUpdate}>Última actualización: {lastUpdate || '--'}</Text>
    </View>
  );
};

const AlertItem = ({ type, message, level }) => {
  const getIconName = () => ({ oxigenacion: 'warning', corazon: 'heart', error: 'alert-circle', info: 'information-circle' }[type] || 'checkmark-circle');
  const getColor = () => ({ danger: '#FF5252', warning: '#FFC107', success: '#4CAF50', info: '#2196F3' }[level] || '#4CAF50');

  return (
    <View style={[styles.alertItem, { backgroundColor: `${getColor()}15` }]}>
      <Ionicons name={getIconName()} size={20} color={getColor()} />
      <Text style={[styles.alertText, { color: getColor() }]}>{message}</Text>
    </View>
  );
};

export default function HomeEnfermeroScreen({ userId, navigation }) {
  const [assignedBabies, setAssignedBabies] = useState([]);
  const [selectedBaby, setSelectedBaby] = useState(null);
  const [sensorData, setSensorData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Nuevo estado para evitar múltiples procesamientos
  const [permission, requestPermission] = useCameraPermissions();
  const [modalVisible, setModalVisible] = useState(false);
  const [nuevoBebe, setNuevoBebe] = useState({
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    sexo: '',
    peso: '',
    fechaNacimiento: '',
    alergias: ''
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getAlerts = useCallback((data) => {
    const alerts = [];
    if (data.oxigenacion && data.oxigenacion < 90) {
      alerts.push({ type: 'oxigenacion', message: `Oxigenación baja (${data.oxigenacion}%)`, level: 'danger' });
    }
    if (data.frecuenciaCardiaca) {
      if (data.frecuenciaCardiaca > 160 || data.frecuenciaCardiaca < 100) {
        alerts.push({ type: 'corazon', message: `Ritmo cardíaco anormal (${Math.round(data.frecuenciaCardiaca)} lpm)`, level: 'warning' });
      }
    }
    if (alerts.length === 0) {
      alerts.push({ type: 'ok', message: 'Signos vitales normales', level: 'success' });
    }
    return alerts;
  }, []);

  const fetchUltimosRegistros = async (idBebe) => {
    try {
      const res = await fetch(`${ALIMENTACION_API_BASE}/registro-alimentacion/ultimo/${idBebe}`);
      if (!res.ok) return { ultimaComida: null, tipoAlimento: null, ultimoMedicamento: null, nombreMedicina: null };
      const data = await res.json();
      return {
        ultimaComida: data.ultimaComida || null,
        tipoAlimento: data.tipoAlimento || null,
        ultimoMedicamento: data.ultimoMedicamento || null,
        nombreMedicina: data.nombreMedicina || null
      };
    } catch {
      return { ultimaComida: null, tipoAlimento: null, ultimoMedicamento: null, nombreMedicina: null };
    }
  };

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const babiesRes = await fetch(`${SQL_API_BASE}/api/bebes/enfermero/${userId}`);
      if (!babiesRes.ok) {
        throw new Error(`Error ${babiesRes.status} al obtener bebés.`);
      }
      const babies = await babiesRes.json();
      if (babies.length === 0) {
        setAssignedBabies([]);
        setSelectedBaby(null);
        setSensorData({});
        setLoading(false);
        return;
      }

      const babiesWithRegistros = await Promise.all(
        babies.map(async (baby) => {
          const { ultimaComida, tipoAlimento, ultimoMedicamento, nombreMedicina } = await fetchUltimosRegistros(baby.idBebe);
          return { ...baby, ultimaComida, tipoAlimento, ultimoMedicamento, nombreMedicina };
        })
      );

      setAssignedBabies(babiesWithRegistros);
      
      // Solo actualizar selectedBaby si no hay ninguno seleccionado o si el actual ya no existe
      const currentSelectedBabyStillExists = babiesWithRegistros.some(b => b.idBebe === selectedBaby?.idBebe);
      if (!selectedBaby || !currentSelectedBabyStillExists) {
        setSelectedBaby(babiesWithRegistros[0]);
      }
    } catch (error) {
      console.error('Error fetching babies:', error);
      Alert.alert("Error de Conexión", `No se pudieron cargar los bebés. ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [userId, selectedBaby?.idBebe]);

  useEffect(() => {
    const fetchSensorData = async () => {
      if (!selectedBaby || !selectedBaby.idCuna) {
        setSensorData({
           heartRate: '--',
           oxygen: '--',
           temperature: '--°C',
           alerts: [{ type: 'info', message: 'Selecciona un bebé con cuna para ver datos.', level: 'info' }],
           lastUpdate: '--'
         });
        return;
      }

      try {
        const cunaMongoId = `CUNA${String(selectedBaby.idCuna).padStart(3, '0')}`;
        const sensorDataRes = await fetch(`${MONGO_API_BASE}/sensor-data?cunas=${cunaMongoId}&limit=1`);
        if (!sensorDataRes.ok) throw new Error(`Error ${sensorDataRes.status} al obtener datos del sensor.`);
        const jsonSensor = await sensorDataRes.json();
        const latestSensorReading = jsonSensor.data?.[0];

        if (latestSensorReading) {
          setSensorData({
            heartRate: latestSensorReading.frecuenciaCardiaca ? `${Math.round(latestSensorReading.frecuenciaCardiaca)}` : '--',
            oxygen: latestSensorReading.oxigenacion ? `${Math.round(latestSensorReading.oxigenacion)}` : '--',
            temperature: latestSensorReading.temperatura ? `${latestSensorReading.temperatura.toFixed(1)}°C` : '--°C',
            alerts: getAlerts(latestSensorReading),
            lastUpdate: new Date(latestSensorReading.timestamp).toLocaleTimeString()
          });
        } else {
          setSensorData({
             heartRate: '--',
             oxygen: '--',
             temperature: '--°C',
             alerts: [{ type: 'info', message: 'No hay datos recientes.', level: 'info' }],
             lastUpdate: '--'
           });
        }
      } catch (error) {
        console.error('Error fetching sensor data:', error);
        setSensorData({
           heartRate: '--',
           oxygen: '--',
           temperature: '--°C',
           alerts: [{ type: 'error', message: 'Error al cargar datos.', level: 'danger' }],
           lastUpdate: '--'
         });
      }
    };

    fetchSensorData();
    const interval = setInterval(fetchSensorData, 60000);
    return () => clearInterval(interval);
  }, [selectedBaby, getAlerts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // CAMBIO PRINCIPAL: Simplificar useFocusEffect para evitar conflictos
  useFocusEffect(
    useCallback(() => {
      // Solo actualizar los registros de cuidados del bebé seleccionado actual
      const refreshCuidados = async () => {
        if (selectedBaby) {
          const { ultimaComida, tipoAlimento, ultimoMedicamento, nombreMedicina } = await fetchUltimosRegistros(selectedBaby.idBebe);
          
          // Actualizar solo los datos de cuidados sin cambiar la selección
          setAssignedBabies(prev =>
            prev.map(b =>
              b.idBebe === selectedBaby.idBebe
                ? { ...b, ultimaComida, tipoAlimento, ultimoMedicamento, nombreMedicina }
                : b
            )
          );
          
          setSelectedBaby(prev =>
            prev && prev.idBebe === selectedBaby.idBebe
              ? { ...prev, ultimaComida, tipoAlimento, ultimoMedicamento, nombreMedicina }
              : prev
          );
        }
      };
      
      refreshCuidados();
    }, [selectedBaby?.idBebe])
  );

  // Función mejorada para manejar el escaneo de códigos QR
  const handleBarCodeScanned = async ({ type, data }) => {
    // Evitar múltiples procesamientos
    if (scanned || isProcessing) {
      return;
    }

    setScanned(true);
    setIsProcessing(true);
    setShowScanner(false);

    if (!selectedBaby || !selectedBaby.idBebe) {
      Alert.alert("Error", "Por favor, selecciona un bebé antes de escanear una cuna.");
      resetScannerState();
      return;
    }

    try {
      let cunaId;
      if (/^\d+$/.test(data)) {
        cunaId = parseInt(data, 10);
      } else {
        const match = data.match(/(\d+)$/);
        cunaId = match ? parseInt(match[1], 10) : null;
      }

      if (!cunaId || isNaN(cunaId)) {
        throw new Error("El código QR no contiene un ID de cuna válido.");
      }

      // Mostrar confirmación una sola vez
      Alert.alert(
        "Confirmar Asignación",
        `¿Asignar la Cuna #${cunaId} al bebé ${selectedBaby.Nombre} ${selectedBaby.ApellidoPaterno}?`,
        [
          { 
            text: "Cancelar", 
            style: "cancel", 
            onPress: () => resetScannerState()
          },
          {
            text: "Asignar",
            onPress: async () => {
              try {
                const apiEndpoint = `${SQL_API_BASE}/api/bebe/asignar-cuna`;
                const response = await fetch(apiEndpoint, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    idBebe: selectedBaby.idBebe,
                    idCuna: cunaId,
                    idUsuario: userId
                  })
                });

                const responseJson = await response.json();
                if (!response.ok) {
                  throw new Error(responseJson.message || `Error del servidor: ${response.status}`);
                }

                Alert.alert("Éxito", responseJson.message);
                await fetchData(); // Actualizar datos después de la asignación
              } catch (assignError) {
                Alert.alert("Error de Asignación", assignError.message);
              } finally {
                resetScannerState();
              }
            }
          },
        ]
      );
    } catch (error) {
      Alert.alert("Error", `No se pudo procesar el código QR: ${error.message}`);
      resetScannerState();
    }
  };

  // Función para resetear el estado del escáner
  const resetScannerState = () => {
    setTimeout(() => {
      setScanned(false);
      setIsProcessing(false);
    }, 1000);
  };

  // Función mejorada para abrir el escáner
  const openScanner = () => {
    setScanned(false);
    setIsProcessing(false);
    setShowScanner(true);
  };

  const handleAgregarBebe = async () => {
    setModalVisible(true);
  };

  const handleGuardarBebe = async () => {
    try {
      const resp = await fetch(`${SQL_API_BASE}/api/bebes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevoBebe })
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Error ${resp.status}: ${txt}`);
      }
      const data = await resp.json();
      setModalVisible(false);
      setNuevoBebe({
        nombre: '',
        apellidoPaterno: '',
        apellidoMaterno: '',
        sexo: '',
        peso: '',
        fechaNacimiento: '',
        alergias: ''
      });
      
      await fetchData();
      
      let cunaMsg = '';
      if (data && data.idCuna) {
        cunaMsg = `\nAsignado a la cuna #${data.idCuna}.`;
      }
      Alert.alert('Éxito', `Bebé creado y cuna asignada automáticamente.${cunaMsg}`);
    } catch (err) {
      console.error('Error al crear bebé:', err);
      Alert.alert('Error', err.message);
    }
  };

  // --- Renderizado de UI ---
  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#7E57C2" /><Text style={styles.loadingText}>Cargando...</Text></View>;
  }

  if (showScanner && permission && !permission.granted) {
    return <View style={styles.permissionContainer}><Text style={styles.message}>Se necesita permiso para usar la cámara</Text><Button onPress={requestPermission} title="Conceder permiso" /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Monitor de Bebés</Text>
          <Text style={styles.babyName}>{selectedBaby ? `${selectedBaby.Nombre} ${selectedBaby.ApellidoPaterno || ''}` : 'Ningún bebé seleccionado'}</Text>
        </View>

        <View style={styles.babiesListContainer}>
          <Text style={styles.listTitle}>Tus Bebés Asignados:</Text>
          {assignedBabies.length > 0 ? (
            <FlatList
              horizontal
              data={assignedBabies}
              keyExtractor={(item) => item.idBebe.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedBaby?.idBebe === item.idBebe;
                return (
                  <TouchableOpacity
                    style={[styles.babyListItem, isSelected && styles.selectedBabyListItem]}
                    onPress={() => setSelectedBaby(item)}
                  >
                    <Text style={[styles.babyListItemText, isSelected && styles.selectedBabyListItemText]}>
                      {item.Nombre} {item.ApellidoPaterno || ''}
                    </Text>
                    <Text style={[styles.babyListItemSubText, isSelected && styles.selectedBabyListItemSubText]}>
                      {item.idCuna ? `Cuna: #${item.idCuna}` : 'Sin Cuna'}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              showsHorizontalScrollIndicator={false}
            />
          ) : <Text style={styles.noBabyMessage}>No tienes bebés asignados.</Text>}
        </View>

        <View style={styles.divider} />

        {selectedBaby ? (
          <>
            <MedicalDataCard {...sensorData} />
            <View style={styles.cuidadosCard}>
              <Text style={styles.cuidadosTitle}>Cuidados Recientes</Text>
              <Text style={styles.cuidadosLabel}>
                Última comida: <Text style={styles.cuidadosBold}>
                  {selectedBaby.ultimaComida ? new Date(selectedBaby.ultimaComida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </Text>
                {selectedBaby.tipoAlimento ? (
                  <Text style={styles.cuidadosExtra}> ({selectedBaby.tipoAlimento})</Text>
                ) : null}
              </Text>
              <Text style={styles.cuidadosLabel}>
                Último med.: <Text style={styles.cuidadosBold}>
                  {selectedBaby.ultimoMedicamento ? new Date(selectedBaby.ultimoMedicamento).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </Text>
                {selectedBaby.nombreMedicina ? (
                  <Text style={styles.cuidadosExtra}> ({selectedBaby.nombreMedicina})</Text>
                ) : null}
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Estado del Sistema</Text>
              {sensorData.alerts?.map((alert, index) => <AlertItem key={index} {...alert} />)}
            </View>
          </>
        ) : <View style={styles.infoCard}><Ionicons name="information-circle-outline" size={50} color="#7E57C2" /><Text style={styles.infoCardText}>Selecciona un bebé para ver sus datos.</Text></View>}
      </ScrollView>

      {/* Botón flotante Agregar Bebé (izquierda) */}
      <TouchableOpacity style={styles.fabLeft} onPress={handleAgregarBebe}>
        <View style={styles.fabButton}>
          <Text style={{ fontSize: 28, color: 'white', marginRight: 2 }}>👶</Text>
          <Ionicons name="add" size={20} color="white" style={{ marginLeft: -6, marginTop: -8 }} />
        </View>
      </TouchableOpacity>

      {/* Botón flotante QR (derecha) - Mejorado */}
      <TouchableOpacity 
        style={styles.fabRight} 
        onPress={openScanner}
        disabled={isProcessing}
      >
        <View style={[styles.fabButton, isProcessing && { opacity: 0.6 }]}>
          <Ionicons name="qr-code-outline" size={30} color="white" />
        </View>
      </TouchableOpacity>

      {showScanner && permission?.granted && (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          >
            <View style={styles.overlay}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => {
                  setShowScanner(false);
                  resetScannerState();
                }}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text style={styles.backButtonText}>Volver</Text>
              </TouchableOpacity>
              <View style={styles.scanFrame} />
              <Text style={styles.scanText}>Escanee el código QR de la cuna</Text>
              {scanned && (
                <Text style={styles.processingText}>Procesando...</Text>
              )}
            </View>
          </CameraView>
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalForm}>
            <Text style={styles.modalTitle}>Nuevo Bebé</Text>
            <View style={styles.formGroup}>
              <TextInput placeholder="Nombre" value={nuevoBebe.nombre} onChangeText={t => setNuevoBebe(prev => ({ ...prev, nombre: t }))} style={styles.input} />
              <TextInput placeholder="Apellido Paterno" value={nuevoBebe.apellidoPaterno} onChangeText={t => setNuevoBebe(prev => ({ ...prev, apellidoPaterno: t }))} style={styles.input} />
              <TextInput placeholder="Apellido Materno" value={nuevoBebe.apellidoMaterno} onChangeText={t => setNuevoBebe(prev => ({ ...prev, apellidoMaterno: t }))} style={styles.input} />
              <TextInput placeholder="Sexo" value={nuevoBebe.sexo} onChangeText={t => setNuevoBebe(prev => ({ ...prev, sexo: t }))} style={styles.input} />
              <TextInput placeholder="Peso (kg)" value={nuevoBebe.peso} onChangeText={t => setNuevoBebe(prev => ({ ...prev, peso: t }))} keyboardType="numeric" style={styles.input} />
              <TouchableOpacity
                style={[styles.input, { justifyContent: 'center', height: 48 }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={{ color: nuevoBebe.fechaNacimiento ? '#333' : '#888', fontSize: 16 }}>
                  {nuevoBebe.fechaNacimiento
                    ? new Date(nuevoBebe.fechaNacimiento).toLocaleDateString()
                    : 'Fecha de Nacimiento'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={nuevoBebe.fechaNacimiento ? new Date(nuevoBebe.fechaNacimiento) : new Date()}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(_, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setNuevoBebe(prev => ({
                        ...prev,
                        fechaNacimiento: selectedDate.toISOString().split('T')[0]
                      }));
                    }
                  }}
                />
              )}
              <TextInput placeholder="Alergias" value={nuevoBebe.alergias} onChangeText={t => setNuevoBebe(prev => ({ ...prev, alergias: t }))} style={styles.input} />
            </View>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleGuardarBebe}>
                <Text style={styles.modalButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Estilos actualizados y mejor organizados ---
const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  header: { marginBottom: 20, padding: 20, backgroundColor: '#7E57C2', borderRadius: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center' },
  babyName: { fontSize: 18, color: 'white', marginTop: 8, textAlign: 'center' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#4A2C8E', marginBottom: 16 },
  vitalSignsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  vitalSign: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#F9F5FF', marginHorizontal: 4 },
  vitalSignHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  vitalSignLabel: { marginLeft: 8, fontSize: 14, color: '#616161' },
  vitalSignValue: { fontSize: 24, fontWeight: 'bold', color: '#4A2C8E', textAlign: 'center' },
  vitalSignUnit: { fontSize: 16, fontWeight: 'normal', color: '#757575' },
  temperatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F9F5FF',
    borderRadius: 8,
  },
  temperatureLabel: { marginLeft: 8, fontSize: 16, color: '#616161', fontWeight: 'bold' },
  temperatureValue: { marginLeft: 5, fontSize: 20, fontWeight: 'bold', color: '#4A2C8E' },
  lastUpdate: { fontSize: 12, color: '#9E9E9E', textAlign: 'right', marginTop: 8 },
  alertItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8 },
  alertText: { marginLeft: 10, fontSize: 14, fontWeight: '500' },
  addButton: {
    backgroundColor: '#7E57C2',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    marginBottom: 10,
  },
  addBabyButton: {
    backgroundColor: '#4A2C8E',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    flexDirection: 'row',
  },
  fabContainer: {
    position: 'absolute',
    left: 20, // Cambiado de right a left
    bottom: 20,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 10,
  },
  fabLeft: {
    position: 'absolute',
    left: 20,
    bottom: 30,
    zIndex: 10,
  },
  fabRight: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    zIndex: 10,
  },
  fabButton: {
    backgroundColor: '#7E57C2',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    elevation: 6,
    shadowColor: '#7E57C2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  backButton: {
    position: 'absolute', top: 50, left: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20
  },
  backButtonText: { color: 'white', marginLeft: 5, fontWeight: '500' },
  scanFrame: { width: 250, height: 250, borderWidth: 2, borderColor: 'white', borderRadius: 10 },
  scanText: {
    fontSize: 16, color: 'white', marginTop: 20, textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 5
  },
  message: { textAlign: 'center', paddingBottom: 10, margin: 20, color: '#7E57C2' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#7E57C2' },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  noBabyMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  babiesListContainer: {
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A2C8E',
    marginBottom: 10,
  },
  babyListItem: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    minHeight: 60,
    minWidth: 120,
  },
  selectedBabyListItem: {
    backgroundColor: '#7E57C2',
    borderColor: '#4A2C8E',
  },
  babyListItemText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  selectedBabyListItemText: {
    color: 'white',
  },
  babyListItemSubText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  selectedBabyListItemSubText: {
    color: '#EADDFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#DCDCDC',
    marginVertical: 15,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  infoCardText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  cuidadosCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cuidadosTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A2C8E',
    marginBottom: 10,
    textAlign: 'center',
  },
  cuidadosLabel: {
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
  },
  cuidadosBold: {
    fontWeight: 'bold',
    color: '#4A2C8E',
  },
  // --- Modal Mejorado ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalForm: {
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 20,
    width: '92%',
    elevation: 8,
    shadowColor: '#7E57C2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 22,
    marginBottom: 18,
    color: '#4A2C8E',
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#F9F5FF',
    color: '#333',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#888',
  },
  saveButton: {
    backgroundColor: '#4A2C8E',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});