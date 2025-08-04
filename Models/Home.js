import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Button, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LineChart } from 'react-native-gifted-charts'; // ✅ Importamos la gráfica de líneas

export default function HomeScreen() {
    const [babyData, setBabyData] = useState({
        name: '',
        age: '',
        status: '',
        heartRate: '--',
        oxygen: '--',
        temperature: '--°C',
        alerts: []
    });

    const [historicalData, setHistoricalData] = useState([]);
    const [serverIP] = useState('http://localhost:5000/sensor-data');
    const [permission, requestPermission] = useCameraPermissions();
      const [selectedBaby, setSelectedBaby] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [scanned, setScanned] = useState(false);
    
    // ✅ Nuevo estado para controlar la vista de la gráfica ('hourly' o 'minute')
    const [chartViewMode, setChartViewMode] = useState('hourly');

    const fetchData = async () => {
        try {
            // ✅ Pedimos más registros para poder agrupar por hora (ej. últimas 3 horas)
            const response = await fetch(`${serverIP}?limit=180`, {
                method: 'GET',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                mode: 'cors'
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const json = await response.json();

            if (json.data && json.data.length > 0) {
                const latestData = json.data[0];
                setHistoricalData(json.data); // Guardamos todo el historial
                setBabyData(prev => ({
                    ...prev,
                    heartRate: latestData.frecuenciaCardiaca ? `${Math.round(latestData.frecuenciaCardiaca)}` : '--',
                    oxygen: latestData.oxigenacion ? `${Math.round(latestData.oxigenacion)}` : '--',
                    temperature: latestData.temperatura ? `${latestData.temperatura.toFixed(1)}°C` : '--°C',
                    alerts: getAlerts(latestData)
                }));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setBabyData(prev => ({
                ...prev,
                alerts: [{
                    type: 'error',
                    message: 'Error de conexión con el servidor',
                    level: 'danger'
                }]
            }));
        }
    };
    
    const getAlerts = (data) => {
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
    };

    const handleBarCodeScanned = ({ type, data }) => {
        setScanned(true);
        alert(`Código QR escaneado: ${data}`);
        setShowScanner(false);
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 6000);
        return () => clearInterval(interval);
    }, []);

    const MedicalDataCard = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Monitor de Signos Vitales</Text>
            <View style={styles.vitalSignsContainer}>
                <VitalSign icon="heart" value={babyData.heartRate} unit="lpm" label="Ritmo Cardíaco" />
                <VitalSign icon="pulse" value={babyData.oxygen} unit="%" label="Oxígeno" />
            </View>
            <Text style={styles.lastUpdate}>
                Última actualización: {new Date().toLocaleTimeString()}
            </Text>
        </View>
    );

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>Se necesita permiso para usar la cámara</Text>
                <Button onPress={requestPermission} title="Conceder permiso" />
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

                <MedicalDataCard />

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Estado del Sistema</Text>
                    {babyData.alerts.map((alert, index) => (
                        <AlertItem key={index} {...alert} />
                    ))}
                </View>

                {/* ✅ TARJETA DE GRÁFICA CON BOTÓN PARA CAMBIAR VISTA */}
                <View style={styles.card}>
                    <View style={styles.chartHeader}>
                        <Text style={styles.cardTitle}>Historial de Signos Vitales</Text>
                        <TouchableOpacity onPress={() => setChartViewMode(chartViewMode === 'hourly' ? 'minute' : 'hourly')}>
                            <Text style={styles.chartToggleText}>
                                Ver por {chartViewMode === 'hourly' ? 'Minuto' : 'Hora'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <VitalsChart data={historicalData} viewMode={chartViewMode} />
                </View>

            </ScrollView>

            <TouchableOpacity style={styles.addButton} onPress={() => setShowScanner(true)}>
                <Ionicons name="scan" size={30} color="white" />
            </TouchableOpacity>

            {showScanner && (
                <View style={StyleSheet.absoluteFill}>
                    <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}>
                        <View style={styles.overlay}>
                            <TouchableOpacity style={styles.backButton} onPress={() => { setShowScanner(false); setScanned(false); }}>
                                <Ionicons name="arrow-back" size={24} color="white" />
                                <Text style={styles.backButtonText}>Volver</Text>
                            </TouchableOpacity>
                            <View style={styles.scanFrame} />
                            <Text style={styles.scanText}>Escanee el código QR</Text>
                        </View>
                    </CameraView>
                </View>
            )}
        </View>
    );
}

// ✅ COMPONENTE PARA LA GRÁFICA MODIFICADO
const VitalsChart = ({ data, viewMode }) => {
    if (!data || data.length < 2) {
        return (
            <View style={styles.chartLoader}>
                <ActivityIndicator size="large" color="#7E57C2" />
                <Text style={styles.chartLoaderText}>Esperando más datos para la gráfica...</Text>
            </View>
        );
    }

    // ✅ Lógica para procesar los datos según la vista seleccionada
    const getChartData = () => {
        const reversedData = data.slice().reverse(); // De más antiguo a más nuevo

        if (viewMode === 'hourly') {
            const hourlyData = {};
            reversedData.forEach(item => {
                const hour = new Date(item.timestamp).getHours();
                if (!hourlyData[hour]) {
                    hourlyData[hour] = { heartRates: [], oxygens: [], count: 0, timestamp: item.timestamp };
                }
                if(item.frecuenciaCardiaca) hourlyData[hour].heartRates.push(item.frecuenciaCardiaca);
                if(item.oxigenacion) hourlyData[hour].oxygens.push(item.oxigenacion);
                hourlyData[hour].count++;
            });

            const heartRateData = Object.keys(hourlyData).map(hour => {
                const hourData = hourlyData[hour];
                const avgHeartRate = hourData.heartRates.reduce((a, b) => a + b, 0) / (hourData.heartRates.length || 1);
                return { value: avgHeartRate, label: new Date(hourData.timestamp).toLocaleTimeString([], { hour: 'numeric', hour12: true }) };
            });

            const oxygenData = Object.keys(hourlyData).map(hour => {
                const hourData = hourlyData[hour];
                const avgOxygen = hourData.oxygens.reduce((a, b) => a + b, 0) / (hourData.oxygens.length || 1);
                return { value: avgOxygen };
            });

            return { heartRateData, oxygenData };
        } else { // 'minute' view
            const minuteData = reversedData.slice(-30); // Mostrar los últimos 30 registros
            const heartRateData = minuteData.map(item => ({
                value: item.frecuenciaCardiaca,
                label: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));
            const oxygenData = minuteData.map(item => ({ value: item.oxigenacion }));
            return { heartRateData, oxygenData };
        }
    };

    const { heartRateData, oxygenData } = getChartData();

    if (heartRateData.length < 2) {
         return (
            <View style={styles.chartLoader}>
                <Text style={styles.chartLoaderText}>No hay suficientes datos para la vista de '{viewMode}'.</Text>
            </View>
        );
    }

    return (
        <View>
            <LineChart
                data={heartRateData}
                data2={oxygenData}
                height={200}
                color1="#7E57C2"
                dataPointsColor1="#7E57C2"
                color2="#00BCD4"
                dataPointsColor2="#00BCD4"
                thickness={3}
                yAxisLabelSuffix=" "
                xAxisLabelTextStyle={{ color: '#616161', fontSize: 10 }}
                yAxisTextStyle={{ color: '#616161' }}
                rulesType="solid"
                rulesColor="#E0E0E0"
                yAxisColor="#E0E0E0"
                xAxisColor="#E0E0E0"
                spacing={viewMode === 'hourly' ? 60 : 50}
                initialSpacing={10}
                noOfSections={5}
                yAxisOffset={80}
                pointerConfig={{
                    pointerStripColor: 'lightgray',
                    pointerStripWidth: 2,
                    strokeDashArray: [2, 5],
                    pointerColor: '#4A2C8E',
                    radius: 4,
                    pointerLabelWidth: 100,
                    pointerLabelHeight: 90,
                    activatePointersOnLongPress: true,
                    autoAdjustPointerLabelPosition: false,
                    pointerLabelComponent: items => {
                      return (
                        <View style={styles.pointerLabel}>
                          <Text style={styles.pointerLabelText}>FC: {items[0].value.toFixed(0)} lpm</Text>
                          <Text style={styles.pointerLabelText}>SpO2: {items[1].value.toFixed(0)}%</Text>
                          <Text style={styles.pointerTimeText}>{items[0].label}</Text>
                        </View>
                      );
                    },
                }}
            />
            <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#7E57C2' }]} />
                    <Text style={styles.legendText}>Ritmo Cardíaco (lpm)</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#00BCD4' }]} />
                    <Text style={styles.legendText}>Oxígeno (%)</Text>
                </View>
            </View>
        </View>
    );
};

const VitalSign = ({ icon, value, unit, label }) => (
    <View style={styles.vitalSign}>
        <View style={styles.vitalSignHeader}><Ionicons name={icon} size={24} color="#7E57C2" /><Text style={styles.vitalSignLabel}>{label}</Text></View>
        <Text style={styles.vitalSignValue}>{value} <Text style={styles.vitalSignUnit}>{unit}</Text></Text>
    </View>
);

const AlertItem = ({ type, message, level }) => {
    const getIconName = () => { switch (type) { case 'oxigenacion': return 'warning'; case 'corazon': return 'heart'; case 'error': return 'alert-circle'; default: return 'checkmark-circle'; } };
    const getColor = () => { switch (level) { case 'danger': return '#FF5252'; case 'warning': return '#FFC107'; default: return '#4CAF50'; } };
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
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    babyName: { fontSize: 16, color: 'white', marginTop: 8 },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 3 },
    cardTitle: { fontSize: 18, fontWeight: '600', color: '#4A2C8E', marginBottom: 16, flex: 1 },
    vitalSignsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    vitalSign: { width: '48%', padding: 12, borderRadius: 8, backgroundColor: '#F9F5FF' },
    vitalSignHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    vitalSignLabel: { marginLeft: 8, fontSize: 14, color: '#616161' },
    vitalSignValue: { fontSize: 24, fontWeight: 'bold', color: '#4A2C8E', textAlign: 'center' },
    vitalSignUnit: { fontSize: 16, fontWeight: 'normal', color: '#757575' },
    lastUpdate: { fontSize: 12, color: '#9E9E9E', textAlign: 'right', marginTop: 8 },
    alertItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8 },
    alertText: { marginLeft: 10, fontSize: 14, fontWeight: '500' },
    addButton: {
        position: 'absolute', right: 20, bottom: 20,
        backgroundColor: '#7E57C2', width: 60, height: 60,
        borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5
    },
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
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
    message: { textAlign: 'center', paddingBottom: 10, margin: 20 },
    
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chartToggleText: {
        color: '#7E57C2',
        fontWeight: 'bold',
        fontSize: 14,
    },
    chartLoader: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chartLoaderText: {
        marginTop: 10,
        color: '#616161',
        fontStyle: 'italic',
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 15,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    legendText: {
        fontSize: 14,
        color: '#616161',
    },
    pointerLabel: {
        height: 90,
        width: 100,
        backgroundColor: 'white',
        borderRadius: 8,
        justifyContent: 'center',
        padding: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    pointerLabelText: {
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 12,
    },
    pointerTimeText: {
        color: 'gray',
        textAlign: 'center',
        fontSize: 10,
        marginTop: 5,
    }
});