import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    ScrollView, 
    Dimensions, 
    TouchableOpacity, 
    ActivityIndicator, 
    Modal, 
    TextInput, 
    Alert, 
    Platform,
    StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Color Palette ---
const colors = {
    primaryDark: '#4C1D95',
    primary: '#6D28D9',
    primaryLight: '#EDE9FE',
    background: '#F5F3FF',
    card: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#475569',
    textMuted: '#64748B',
    border: '#E0E7FF',
    danger: '#DC2626',
    success: '#16A34A',
};

// --- API Configuration ---
const MONGO_API_BASE = 'http://192.168.0.223:5000'; // Your MongoDB API
const API_URL = 'http://192.168.0.223:3000'; // Your main SQL API

// --- Reusable Components ---

function Dato({ icon, label, value, color, unit = '' }) {
  return (
    <View style={styles.datoRow}>
      <View style={styles.datoLabelContainer}>
        <Ionicons name={icon} size={22} color={color} style={styles.datoIcon} />
        <Text style={styles.datoLabel}>{label}</Text>
      </View>
      <Text style={styles.datoValue}>{value} <Text style={styles.datoUnit}>{unit}</Text></Text>
    </View>
  );
}

function MiniSensor({ icon, label, value, color }) {
    return (
      <View style={styles.miniSensor}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={styles.miniValue}>{value}</Text>
        <Text style={styles.miniLabel}>{label}</Text>
      </View>
    );
}
  
function ConfirmationModal({ isVisible, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar" }) {
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
          <Ionicons name="alert-circle-outline" size={50} color={colors.danger} style={{ marginBottom: 15 }} />
          <Text style={modalStyles.title}>{title}</Text>
          <Text style={modalStyles.message}>{message}</Text>
          <View style={modalStyles.buttonContainer}>
            <TouchableOpacity style={[modalStyles.button, modalStyles.cancelButton]} onPress={onCancel}>
              <Text style={[modalStyles.buttonText, modalStyles.cancelButtonText]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalStyles.button, modalStyles.confirmButton]} onPress={onConfirm}>
              <Text style={[modalStyles.buttonText, modalStyles.confirmButtonText]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- Main Component ---
export default function CunasEnfermeroScreen({ userId }) {
    const [vista, setVista] = useState('grid');
    const [cunaSeleccionada, setCunaSeleccionada] = useState(null);
    const [cunas, setCunas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [cunaToConfirm, setCunaToConfirm] = useState(null);
    const [sensorData, setSensorData] = useState({});
    const [weightData, setWeightData] = useState({});
    const [modalProblema, setModalProblema] = useState(false);
    const [cunaProblema, setCunaProblema] = useState('');
    const [descripcionProblema, setDescripcionProblema] = useState('');
    const [enviandoProblema, setEnviandoProblema] = useState(false);
    const [avanzadoData, setAvanzadoData] = useState({});
    const [loadingAvanzado, setLoadingAvanzado] = useState({});
    const [ultimoTimestampAvanzado, setUltimoTimestampAvanzado] = useState({});

    // --- Data Fetching ---
    const fetchCunas = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        
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

    // --- Sensor and Weight Data Hook ---
    useEffect(() => {
        if (!cunas.length) return;
        let isMounted = true;

        const fetchAllData = async () => {
            const cunaMongoIds = cunas.map(c => `CUNA${String(c.idCuna).padStart(3, '0')}`).join(',');

            // 1. Datos básicos (frecuencia cardiaca, oxigenacion, temperatura, movimiento)
            let basicSensorData = {};
            try {
                const sensorRes = await fetch(`${MONGO_API_BASE}/sensor-data?cunas=${cunaMongoIds}&limit=${cunas.length}`);
                if(sensorRes.ok) {
                    const sensorJson = await sensorRes.json();
                    if (isMounted && sensorJson.data) {
                        basicSensorData = sensorJson.data.reduce((acc, reading) => {
                            const cunaIdNumber = parseInt((reading.cunaId || '').replace('CUNA', ''), 10);
                            if (!acc[cunaIdNumber]) {
                                acc[cunaIdNumber] = {
                                    ...reading,
                                    temperatura: reading.temperatura ?? null,
                                    movimiento: reading.movimiento ?? null,
                                    frecuenciaCardiaca: reading.frecuenciaCardiaca,
                                    oxigenacion: reading.oxigenacion,
                                };
                            }
                            return acc;
                        }, {});
                    }
                }
            } catch(e) {
                console.error("Error fetching basic sensor data from MongoDB:", e);
            }

            // 2. Datos avanzados (mlx, scd40, co2, peso, etc)
            let advancedSensorData = {};
            try {
                const advRes = await fetch(`${MONGO_API_BASE}/sensor-data/avanzado?cunas=${cunaMongoIds}&limit=${cunas.length}`);
                if (advRes.ok) {
                    const advJson = await advRes.json();
                    if (isMounted && advJson.data) {
                        advancedSensorData = advJson.data.reduce((acc, reading) => {
                            const cunaIdNumber = parseInt((reading.cunaId || '').replace('CUNA', ''), 10);
                            if (!acc[cunaIdNumber]) {
                                acc[cunaIdNumber] = {
                                    temperatura_mlx_ambiente: reading.temperatura_mlx_ambiente,
                                    temperatura_mlx_objeto: reading.temperatura_mlx_objeto,
                                    peso: reading.peso_kg,
                                    movimiento_cuna: reading.movimiento_cuna,
                                    co2_ppm: reading.co2_ppm,
                                    temperatura_scd40: reading.temperatura_scd40,
                                    humedad_scd40: reading.humedad_scd40,
                                    server_timestamp: reading.server_timestamp,
                                };
                            }
                            return acc;
                        }, {});
                    }
                }
            } catch(e) {
                console.error("Error fetching advanced sensor data from MongoDB:", e);
            }

            // 3. Unir ambos tipos de datos
            const mergedData = {};
            cunas.forEach(cuna => {
                const id = cuna.idCuna;
                mergedData[id] = {
                    ...(basicSensorData[id] || {}),
                    ...(advancedSensorData[id] || {}),
                };
            });
            setSensorData(mergedData);

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
 

        return () => {
            isMounted = false;
         
        };
    }, [cunas]);

    // --- Logic and Navigation ---
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

    // --- Technical Problem Modal Logic ---
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
            Alert.alert('Campos incompletos', 'Por favor, selecciona una cuna y describe el problema.');
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

    // --- Fetch avanzado por cuna seleccionada (sin intervalos, solo cuando cambia cuna o sensorData) ---
    useEffect(() => {
        if (!cunaSeleccionada) return;
        const cunaKey = cunaSeleccionada.idCuna;
        const mongoId = `CUNA${String(cunaKey).padStart(3, '0')}`;

        const fetchLatestAvanzado = async () => {
            setLoadingAvanzado(prev => ({ ...prev, [cunaKey]: true }));
            try {
                const res = await fetch(`${MONGO_API_BASE}/sensor-data/avanzado?cunas=${mongoId}&limit=1`);
                const json = await res.json();
                let latest = null;
                if (json.data && Array.isArray(json.data) && json.data.length > 0) {
                    latest = json.data[0];
                }
                setAvanzadoData(prev => ({ ...prev, [cunaKey]: latest || null }));
            } catch {
                setAvanzadoData(prev => ({ ...prev, [cunaKey]: null }));
            } finally {
                setLoadingAvanzado(prev => ({ ...prev, [cunaKey]: false }));
            }
        };

        fetchLatestAvanzado();
        // Solo se ejecuta cuando cambia la cuna seleccionada o los datos básicos
    }, [cunaSeleccionada, sensorData]);

    // --- Render Components ---
    const renderDetalleCuna = (cuna) => {
        const sensor = getCunaSensorData(cuna.idCuna);
        const peso = getCunaWeight(cuna.idCuna);
        const avanzado = avanzadoData[cuna.idCuna];
        const loadingAvz = loadingAvanzado[cuna.idCuna];

        return (
            <View style={styles.detalleContainer}>
                <View style={styles.detalleHeader}>
                    <Text style={styles.detalleTitle}>{cuna.nombre}</Text>
                    <Text style={styles.detalleSubtitle}>Asignada el {new Date(cuna.fechaAsig).toLocaleDateString()}</Text>
                </View>

                <View style={styles.detalleCard}>
                    <Text style={styles.cardSectionTitle}>Signos Vitales</Text>
                    {/* Datos básicos */}
                    <Dato icon="thermometer-outline" label="Temperatura" value={sensor?.temperatura !== undefined ? sensor.temperatura.toFixed(1) : '---'} unit="°C" color="#C026D3" />
                    <Dato icon="heart-outline" label="Frec. Cardiaca" value={sensor?.frecuenciaCardiaca !== undefined ? sensor.frecuenciaCardiaca : '---'} unit="BPM" color="#DB2777" />
                    <Dato icon="pulse-outline" label="Oxigenación" value={sensor?.oxigenacion !== undefined ? `${sensor.oxigenacion}` : '---'} unit="%" color="#4338CA" />
                    <Dato icon="body-outline" label="Movimiento" value={sensor?.movimiento !== undefined ? (sensor.movimiento ? 'Detectado' : 'No Detectado') : '---'} color="#7C3AED" />
                    <Dato icon="scale-outline" label="Peso de nacimiento" value={peso !== '---' ? `${peso}` : '---'} unit="kg" color="#6D28D9" />
                    {/* Datos avanzados */}
                    {loadingAvz ? (
                        <Text style={{ color: '#888', marginTop: 8 }}>Cargando datos avanzados...</Text>
                    ) : avanzado ? (
                        <>
                            <Dato icon="thermometer-outline" label="Temp. MLX Objeto" value={avanzado.temperatura_mlx_objeto !== undefined ? avanzado.temperatura_mlx_objeto.toFixed(1) : '---'} unit="°C" color="#C026D3" />
                            <Dato icon="thermometer-outline" label="Temp. MLX Ambiente" value={avanzado.temperatura_mlx_ambiente !== undefined ? avanzado.temperatura_mlx_ambiente.toFixed(1) : '---'} unit="°C" color="#C026D3" />
                            <Dato icon="thermometer-outline" label="Temp. SCD40" value={avanzado.temperatura_scd40 !== undefined ? avanzado.temperatura_scd40.toFixed(1) : '---'} unit="°C" color="#C026D3" />
                            <Dato icon="water-outline" label="Humedad SCD40" value={avanzado.humedad_scd40 !== undefined ? avanzado.humedad_scd40.toFixed(1) : '---'} unit="%" color="#009688" />
                            <Dato icon="cloud-outline" label="CO₂" value={avanzado.co2_ppm !== undefined ? avanzado.co2_ppm : '---'} unit="ppm" color="#607D8B" />
                            <Dato icon="body-outline" label="Movimiento Cuna" value={avanzado.movimiento_cuna !== undefined ? (avanzado.movimiento_cuna ? 'Detectado' : 'No Detectado') : '---'} color="#7C3AED" />
                            <Dato icon="scale-outline" label="Peso actual" value={avanzado.peso_kg !== undefined ? `${avanzado.peso_kg}` : '---'} unit="kg" color="#6D28D9" />
                        </>
                    ) : (
                        <Text style={{ color: '#888', marginTop: 8 }}>Sin datos avanzados</Text>
                    )}
                </View>

                <View style={styles.detalleCard}>
                    <Text style={styles.cardSectionTitle}>Información de Ubicación</Text>
                    <Dato icon="checkmark-circle-outline" label="Estado" value={cuna.status} color={colors.success} />
                    <Dato icon="business-outline" label="Cuarto" value={cuna.nombreCuarto} color={colors.primaryDark} />
                    <Dato icon="git-network-outline" label="Hospital" value={cuna.nombreHospital} color={colors.primaryDark} />
                </View>
                
                <TouchableOpacity style={styles.actionButton} onPress={() => handleDarAlta(cuna)}>
                    <Ionicons name="log-out-outline" size={22} color="#fff" />
                    <Text style={styles.actionButtonText}>Dar de Alta Médica</Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading && !cunas.length) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Cargando cunas...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
                
                {vista === 'detalle' && cunaSeleccionada ? (
                    <>
                        <TouchableOpacity style={styles.backButton} onPress={volverAListado}>
                            <Ionicons name="arrow-back-outline" size={24} color={colors.primary} />
                        </TouchableOpacity>
                        {renderDetalleCuna(cunaSeleccionada)}
                    </>
                ) : (
                    <>
                        <Text style={styles.headerTitle}>Cunas Asignadas</Text>
                        {cunas.length === 0 ? (
                            <View style={styles.noCunasContainer}>
                                <Ionicons name="bed-outline" size={60} color="#D1D5DB" />
                                <Text style={styles.noCunasText}>No tienes cunas asignadas.</Text>
                            </View>
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
                                            <View style={styles.cardHeader}>
                                                <Text style={styles.cunaTitle}>{cuna.nombre}</Text>
                                                <View style={[styles.statusBadge, { backgroundColor: cuna.status === 'Ocupada' ? colors.success : colors.textMuted }]} />
                                            </View>
                                            <View style={styles.cardSensorGrid}>
                                                <MiniSensor icon="heart-outline" label="BPM" value={sensor?.frecuenciaCardiaca || '---'} color="#DB2777" />
                                                <MiniSensor icon="pulse-outline" label="O₂" value={sensor?.oxigenacion ? `${sensor.oxigenacion}%` : '---'} color="#4338CA" />
                                                <MiniSensor icon="scale-outline" label="Peso" value={peso !== '---' ? `${peso}kg` : '---'} color="#6D28D9" />
                                                <MiniSensor icon="thermometer-outline" label="Temp" value={sensor?.temperatura ? `${sensor.temperatura.toFixed(1)}°` : '---'} color="#C026D3" />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={abrirModalProblema} activeOpacity={0.8}>
                <Ionicons name="build-outline" size={28} color="#fff" />
            </TouchableOpacity>

            <Modal visible={modalProblema} transparent animationType="slide" onRequestClose={cerrarModalProblema}>
                <View style={modalStyles.overlay}>
                    <View style={[modalStyles.container, { paddingBottom: 30 }]}>
                        <Text style={modalStyles.title}>Reportar Falla Técnica</Text>
                        
                        <Text style={modalStyles.inputLabel}>Cuna afectada</Text>
                        <View style={modalStyles.pickerContainer}>
                            <Picker
                                selectedValue={cunaProblema}
                                style={modalStyles.picker}
                                onValueChange={itemValue => setCunaProblema(itemValue)}
                                mode="dropdown"
                            >
                                <Picker.Item label="Selecciona una cuna..." value="" color="#9ca3af" />
                                {cunas.map(cuna => (
                                    <Picker.Item key={cuna.idCuna} label={cuna.nombre} value={cuna.idCuna} />
                                ))}
                            </Picker>
                        </View>
                        
                        <Text style={modalStyles.inputLabel}>Descripción del problema</Text>
                        <TextInput
                            style={modalStyles.input}
                            placeholder="Ej: El sensor de temperatura no responde..."
                            placeholderTextColor="#9ca3af"
                            value={descripcionProblema}
                            onChangeText={setDescripcionProblema}
                            multiline
                        />
                        <View style={modalStyles.buttonContainer}>
                            <TouchableOpacity style={[modalStyles.button, modalStyles.cancelButton]} onPress={cerrarModalProblema} disabled={enviandoProblema}>
                                <Text style={[modalStyles.buttonText, modalStyles.cancelButtonText]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[modalStyles.button, modalStyles.confirmButton, {backgroundColor: colors.primary}]} onPress={enviarProblemaTecnico} disabled={enviandoProblema}>
                                <Text style={[modalStyles.buttonText, modalStyles.confirmButtonText]}>{enviandoProblema ? 'Enviando...' : 'Reportar'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// --- Styles ---
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    loadingText: { fontSize: 18, color: colors.primary, marginTop: 10, fontWeight: '500' },
    container: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: colors.primaryDark, paddingHorizontal: 20, marginBottom: 24, marginTop: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 20 },
    card: {
        width: (width - 55) / 2,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: colors.primaryLight,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cunaTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryDark },
    statusBadge: { width: 10, height: 10, borderRadius: 5 },
    cardSensorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
        marginTop: 4,
    },
    miniSensor: { alignItems: 'center', width: '48%' },
    miniValue: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
    miniLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    
    // Detail View
    backButton: { position: 'absolute', top: 20, left: 20, zIndex: 10, backgroundColor: colors.primaryLight, padding: 8, borderRadius: 20 },
    detalleContainer: { paddingHorizontal: 20 },
    detalleHeader: { alignItems: 'center', marginVertical: 20 },
    detalleTitle: { fontSize: 28, fontWeight: 'bold', color: colors.primaryDark },
    detalleSubtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 4 },
    detalleCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardSectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryDark, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.primaryLight, paddingBottom: 10 },
    datoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    datoLabelContainer: { flexDirection: 'row', alignItems: 'center' },
    datoIcon: { marginRight: 15, width: 22 },
    datoLabel: { fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
    datoValue: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
    datoUnit: { color: colors.textMuted, fontWeight: '500' },
    actionButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.danger,
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 10,
        elevation: 3,
    },
    actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
    
    noCunasContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50, opacity: 0.7 },
    noCunasText: { textAlign: 'center', marginTop: 16, fontSize: 18, color: colors.textSecondary },

    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        backgroundColor: colors.primary,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    }
});

const modalStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    container: {
        width: '100%',
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    title: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
    message: { fontSize: 16, color: colors.textSecondary, marginBottom: 24, textAlign: 'center', lineHeight: 24 },
    inputLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, alignSelf: 'flex-start', marginBottom: 8 },
    pickerContainer: {
        width: '100%',
        backgroundColor: colors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
        height: 56,
        justifyContent: 'center'
    },
    picker: { flex: 1, color: colors.textPrimary },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: colors.background,
        color: colors.textPrimary,
        minHeight: 100,
        marginBottom: 24,
        textAlignVertical: 'top',
    },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12 },
    button: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    confirmButton: { backgroundColor: colors.danger },
    cancelButton: { backgroundColor: colors.border },
    buttonText: { fontSize: 16, fontWeight: 'bold' },
    confirmButtonText: { color: '#fff' },
    cancelButtonText: { color: colors.textSecondary },
});
    