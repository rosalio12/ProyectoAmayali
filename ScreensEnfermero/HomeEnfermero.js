import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Button, ActivityIndicator, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

// IPs y Puertos de tus backends
const SQL_API_BASE = 'http://172.18.2.158:3000'; // Tu API de SQL Server
const MONGO_API_BASE = 'http://172.18.2.158:5000'; // Tu API de MongoDB (corregido el error tipográfico en 'http')

export default function HomeEnfermeroScreen({ userId }) { // Recibe userId del enfermero
  const [assignedBabies, setAssignedBabies] = useState([]); // Almacenará la lista de bebés asignados
  const [selectedBaby, setSelectedBaby] = useState(null); // Almacenará el bebé actualmente seleccionado
  const [sensorData, setSensorData] = useState({}); // Almacenará los datos del sensor del bebé seleccionado
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  // Función para obtener alertas basadas en los datos del sensor
  const getAlerts = useCallback((data) => {
    const alerts = [];

    if (data.oxigenacion && data.oxigenacion < 90) {
      alerts.push({
        type: 'oxigenacion',
        message: `Oxigenación baja (${data.oxigenacion}%)`,
        level: 'danger'
      });
    }

    if (data.frecuenciaCardiaca) {
      if (data.frecuenciaCardiaca > 160 || data.frecuenciaCardiaca < 100) {
        alerts.push({
          type: 'corazon',
          message: `Ritmo cardíaco anormal (${Math.round(data.frecuenciaCardiaca)} lpm)`,
          level: 'warning'
        });
      }
    }

    if (alerts.length === 0) {
      alerts.push({
        type: 'ok',
        message: 'Signos vitales normales',
        level: 'success'
      });
    }
    return alerts;
  }, []);

  // Función principal para obtener todos los datos de los bebés del enfermero
  const fetchData = useCallback(async () => {
    if (!userId) {
      console.log('HomeEnfermeroScreen: userId no está disponible aún.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Obtener los bebés ASIGNADOS a este enfermero desde SQL
      console.log(`HomeEnfermeroScreen: Fetching babies for nurse userId: ${userId} from SQL`);
      const babiesRes = await fetch(`${SQL_API_BASE}/api/bebes/enfermero/${userId}`); // ¡Endpoint para enfermeros!

      if (!babiesRes.ok) {
        const errorText = await babiesRes.text();
        throw new Error(`Error ${babiesRes.status}: ${errorText} al obtener bebés para el enfermero.`);
      }
      const babies = await babiesRes.json();
      console.log('HomeEnfermeroScreen: Babies obtained from SQL:', babies);

      if (babies.length === 0) {
        Alert.alert("Sin Bebés Asignados", "No tienes bebés registrados o asignados a tu cuenta de enfermero.");
        setAssignedBabies([]);
        setSelectedBaby(null);
        setSensorData({});
        setLoading(false);
        return;
      }

      setAssignedBabies(babies);

      // Si no hay un bebé seleccionado o el bebé seleccionado ya no está en la lista, selecciona el primero
      if (!selectedBaby || !babies.some(baby => baby.idBebe === selectedBaby.idBebe)) {
        setSelectedBaby(babies[0]);
      }

    } catch (error) {
      console.error('Error fetching babies for nurse home screen:', error);
      Alert.alert("Error de Conexión", `No se pudieron cargar la lista de bebés. ${error.message}`);
      setAssignedBabies([]);
      setSelectedBaby(null);
      setSensorData({});
    } finally {
      setLoading(false);
    }
  }, [userId, selectedBaby]); // Dependencias: userId y selectedBaby para reaccionar a cambios en la selección

  // Efecto para obtener los datos del sensor del bebé seleccionado
  useEffect(() => {
    const fetchSensorData = async () => {
      if (!selectedBaby || !selectedBaby.idCuna) {
        setSensorData({
          heartRate: '--', oxygen: '--', temperature: '--°C',
          alerts: [{ type: 'info', message: 'Selecciona un bebé con cuna asignada para ver sus datos.', level: 'info' }],
          lastUpdate: '--'
        });
        return;
      }

      try {
        const cunaMongoId = `CUNA${String(selectedBaby.idCuna).padStart(3, '0')}`;
        console.log(`HomeEnfermeroScreen: Fetching sensor data for cunaId: ${cunaMongoId} from MongoDB`);

        const sensorDataRes = await fetch(`${MONGO_API_BASE}/sensor-data?cunas=${cunaMongoId}&limit=1`);
        if (!sensorDataRes.ok) {
          const errorText = await sensorDataRes.text();
          throw new Error(`Error ${sensorDataRes.status}: ${errorText} al obtener datos de sensor de Mongo.`);
        }
        const jsonSensor = await sensorDataRes.json();
        console.log('HomeEnfermeroScreen: Sensor data from Mongo:', jsonSensor);

        const latestSensorReading = jsonSensor.data && jsonSensor.data.length > 0 ? jsonSensor.data[0] : null;

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
            heartRate: '--', oxygen: '--', temperature: '--°C',
            alerts: [{ type: 'info', message: 'No hay datos de sensor recientes para esta cuna.', level: 'info' }],
            lastUpdate: '--'
          });
        }
      } catch (error) {
        console.error('Error fetching sensor data:', error);
        Alert.alert("Error de Conexión", `No se pudieron cargar los datos del sensor. ${error.message}`);
        setSensorData({});
      }
    };

    fetchSensorData();
    const interval = setInterval(fetchSensorData, 6000); // Actualizar cada 6 segundos
    return () => clearInterval(interval);
  }, [selectedBaby, getAlerts]); // Dependencias: selectedBaby y getAlerts

  // Efecto para cargar la lista de bebés al inicio
  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    setShowScanner(false); // Cierra el escáner inmediatamente

    if (!selectedBaby || !selectedBaby.idBebe) {
      Alert.alert("Error", "No se pudo asignar la cuna. Por favor, selecciona un bebé primero.");
      setScanned(false);
      return;
    }

    Alert.alert(
      `QR Escaneado`,
      `Cuna ID detectada: ${data}. ¿Deseas asignar esta cuna al bebé ${selectedBaby.Nombre}?`,
      [
        { text: "Cancelar", style: "cancel", onPress: () => setScanned(false) },
        {
          text: "Asignar", onPress: async () => {
            try {
              const cunaIdFromQR = parseInt(data, 10);
              if (isNaN(cunaIdFromQR)) {
                Alert.alert("Error", "El ID de cuna escaneado no es un número válido.");
                setScanned(false);
                return;
              }

              // Endpoint de SQL para actualizar la cuna de un bebé
              const assignCunaRes = await fetch(`${SQL_API_BASE}/api/bebe/asignar-cuna`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idBebe: selectedBaby.idBebe, idCuna: cunaIdFromQR })
              });

              if (!assignCunaRes.ok) {
                const errorText = await assignCunaRes.text();
                throw new Error(`Error ${assignCunaRes.status}: ${errorText}`);
              }
              Alert.alert("Éxito", `Cuna asignada correctamente a ${selectedBaby.Nombre}.`);
              // Recargar los datos después de la asignación
              fetchData();
            } catch (error) {
              console.error("Error asignando cuna:", error);
              Alert.alert("Error", `Fallo al asignar la cuna: ${error.message}`);
            } finally {
              setScanned(false);
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7E57C2" />
        <Text style={styles.loadingText}>Cargando bebés asignados...</Text>
      </View>
    );
  }

  // Permisos de la cámara
  if (showScanner && permission && !permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.message}>Se necesita permiso para usar la cámara</Text>
        <Button onPress={requestPermission} title="Conceder permiso" color="#7E57C2" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Monitor de Bebés Asignados</Text>
          {selectedBaby ? (
            <Text style={styles.babyName}>{selectedBaby.Nombre} {selectedBaby.Apellidos || ''}</Text>
          ) : (
            <Text style={styles.babyName}>Ningún bebé seleccionado</Text>
          )}
        </View>

        {/* Lista horizontal de bebés */}
        <View style={styles.babiesListContainer}>
          <Text style={styles.listTitle}>Tus Bebés Asignados:</Text>
          {assignedBabies.length > 0 ? (
            <FlatList
              horizontal
              data={assignedBabies}
              keyExtractor={(item) => item.idBebe.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.babyListItem,
                    selectedBaby && selectedBaby.idBebe === item.idBebe && styles.selectedBabyListItem
                  ]}
                  onPress={() => setSelectedBaby(item)}
                >
                  <Text style={[styles.babyListItemText, selectedBaby && selectedBaby.idBebe === item.idBebe && styles.selectedBabyListItemText]}>
                    {item.Nombre}
                  </Text>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
            />
          ) : (
            <Text style={styles.noBabyMessage}>No se encontraron bebés asignados a tu cuenta.</Text>
          )}
        </View>
        <View style={styles.divider} /> {/* Línea divisoria */}


        {selectedBaby ? (
          <>
            <MedicalDataCard
              heartRate={sensorData.heartRate}
              oxygen={sensorData.oxygen}
              temperature={sensorData.temperature}
              lastUpdate={sensorData.lastUpdate}
            />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Estado del Sistema</Text>
              {sensorData.alerts && sensorData.alerts.map((alert, index) => (
                <AlertItem key={index} {...alert} />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={50} color="#7E57C2" />
            <Text style={styles.infoCardText}>Selecciona un bebé de la lista superior para ver sus signos vitales.</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={() => setShowScanner(true)}>
        <Ionicons name="qr-code-outline" size={30} color="white" />
        <Text style={styles.addButtonText}>Asignar Cuna</Text>
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
              <TouchableOpacity style={styles.backButton} onPress={() => setShowScanner(false)}>
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text style={styles.backButtonText}>Volver</Text>
              </TouchableOpacity>
              <View style={styles.scanFrame} />
              <Text style={styles.scanText}>Escanee el código QR de la cuna</Text>
            </View>
          </CameraView>
        </View>
      )}
    </View>
  );
}

// Componentes funcionales fuera del componente principal (sin cambios)
const VitalSign = ({ icon, value, unit, label }) => (
  <View style={styles.vitalSign}>
    <View style={styles.vitalSignHeader}>
      <Ionicons name={icon} size={24} color="#7E57C2" />
      <Text style={styles.vitalSignLabel}>{label}</Text>
    </View>
    <Text style={styles.vitalSignValue}>
      {value} <Text style={styles.vitalSignUnit}>{unit}</Text>
    </Text>
  </View>
);

const MedicalDataCard = ({ heartRate, oxygen, temperature, lastUpdate }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>Monitor de Signos Vitales</Text>

    <View style={styles.vitalSignsContainer}>
      <VitalSign icon="heart" value={heartRate} unit="lpm" label="Ritmo Cardíaco" />
      <VitalSign icon="pulse" value={oxygen} unit="%" label="Oxígeno" />
    </View>
    <View style={styles.temperatureContainer}>
      <Ionicons name="thermometer" size={24} color="#7E57C2" />
      <Text style={styles.temperatureLabel}>Temperatura:</Text>
      <Text style={styles.temperatureValue}>{temperature}</Text>
    </View>

    <Text style={styles.lastUpdate}>
      Última actualización: {lastUpdate || new Date().toLocaleTimeString()}
    </Text>
  </View>
);

const AlertItem = ({ type, message, level }) => {
  const getIconName = () => {
    switch (type) {
      case 'oxigenacion': return 'warning';
      case 'corazon': return 'heart';
      case 'error': return 'alert-circle';
      case 'info': return 'information-circle';
      default: return 'checkmark-circle';
    }
  };

  const getColor = () => {
    switch (level) {
      case 'danger': return '#FF5252';
      case 'warning': return '#FFC107';
      case 'info': return '#2196F3';
      default: return '#4CAF50';
    }
  };

  return (
    <View style={[styles.alertItem, { backgroundColor: `${getColor()}20` }]}>
      <Ionicons name={getIconName()} size={20} color={getColor()} />
      <Text style={[styles.alertText, { color: getColor() }]}>{message}</Text>
    </View>
  );
};

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
    position: 'absolute', right: 20, bottom: 20,
    backgroundColor: '#7E57C2', width: 60, height: 60,
    borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5
  },
  addButtonText: { color: 'white', fontSize: 10, marginTop: 2, fontWeight: 'bold' },
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
    marginTop: 30,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  // Estilos para la lista de bebés
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
    backgroundColor: '#E0E0E0',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#CCC',
  },
  selectedBabyListItem: {
    backgroundColor: '#7E57C2',
    borderColor: '#4A2C8E',
  },
  babyListItemText: {
    color: '#4A4A4A',
    fontWeight: '500',
  },
  selectedBabyListItemText: {
    color: 'white',
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
  }
});