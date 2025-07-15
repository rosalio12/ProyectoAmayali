
import { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Text,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { PieChart } from 'react-native-gifted-charts'; 
import { Ionicons } from '@expo/vector-icons';

// ✅ Recibe userId del padre como prop
export default function ChartScreen({ userId }) {
    const [alertas, setAlertas] = useState([]);
    const [chartData, setChartData] = useState([]); 
    const [loading, setLoading] = useState(true);

    const SQL_API_BASE = 'http://localhost:3000';
    const MONGO_API_BASE = 'http://172.18.2.158:5000';

    useEffect(() => {
        const fetchAlertsForPadre = async () => {
            if (!userId) {
                console.log('AlertasPadreScreen: userId del padre no está disponible.');
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                // ⚠️ Asumimos que tienes un endpoint para obtener la cuna del bebé de un padre
                // Por ejemplo: GET /api/bebes/padre/123 -> { idCuna: 4 }
                // Aquí lo simulamos, pero debes conectarlo a tu backend real.
                console.log(`AlertasPadreScreen: Buscando cuna para el padre userId: ${userId}`);
                
              
                const cunaIdSql = 4; // SIMULADO: Asumimos que el padre tiene asignada la cuna 4
                if (!cunaIdSql) {
                    Alert.alert("Sin Bebé Asignado", "No se encontró un bebé asignado a este usuario.");
                    setLoading(false);
                    return;
                }
               
                const cunaMongoId = `CUNA${String(cunaIdSql).padStart(3, '0')}`;
                console.log('AlertasPadreScreen: Cuna Mongo para consulta:', cunaMongoId);

                // Obtener alertas de MongoDB para esa cuna específica
                const mongoAlertsRes = await fetch(`${MONGO_API_BASE}/alertas?cunas=${cunaMongoId}`);
                if (!mongoAlertsRes.ok) {
                    throw new Error('No se pudieron obtener las alertas de la cuna.');
                }
                const mongoAlertsData = await mongoAlertsRes.json();
                const fetchedAlerts = mongoAlertsData.data || mongoAlertsData;

                setAlertas(fetchedAlerts);
                processDataForChart(fetchedAlerts); // ✅ Procesar datos para la gráfica

            } catch (err) {
                console.error('❌ AlertasPadreScreen: Error general al cargar alertas:', err);
                Alert.alert("Error de Carga", `No se pudieron cargar las alertas. Detalle: ${err.message}`);
                setAlertas([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAlertsForPadre();
    }, [userId]);

    // Función para clasificar el nivel de la alerta (reutilizada)
    const clasificaNivel = (al) => {
        const tipo = al.tipo.toLowerCase();
        if (tipo.includes('critica') || (al.tipo.includes('Oxigenación baja') && al.valor <= 85)) return 'Crítico';
        if (tipo.includes('media') || (al.tipo.includes('Oxigenación baja') && al.valor > 85 && al.valor <= 90)) return 'Medio';
        return 'Leve';
    };


    const getIconColor = (nivel) => {
        switch (nivel) {
            case 'Crítico': return '#e74c3c'; // Rojo
            case 'Medio': return '#f39c12';   // Naranja
            default: return '#3498db';        // Azul
        }
    };
    
    // ✅ Función para procesar las alertas y generar los datos para la gráfica
    const processDataForChart = (alertsToProcess) => {
        const counts = { 'Crítico': 0, 'Medio': 0, 'Leve': 0 };
        alertsToProcess.forEach(al => {
            const nivel = clasificaNivel(al);
            counts[nivel]++;
        });

        const dataForChart = Object.keys(counts).map(nivel => ({
            value: counts[nivel],
            color: getIconColor(nivel),
            label: nivel,
            text: `${counts[nivel]}`, // Muestra el número en la gráfica
        })).filter(item => item.value > 0); // Solo mostrar niveles con alertas

        setChartData(dataForChart);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6c5ce7" />
                <Text style={styles.loadingText}>Cargando estado del bebé...</Text>
            </View>
        );
    }

    const totalAlerts = alertas.length;

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.screenTitle}>Resumen de Bienestar</Text>

            {/* --- SECCIÓN DE GRÁFICA --- */}
            <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>Distribución de Alertas</Text>
                {totalAlerts > 0 ? (
                    <View style={styles.pieChartContainer}>
                        <PieChart
                            data={chartData}
                            donut
                            radius={90}
                            innerRadius={60}
                            textSize={16}
                            textColor="white"
                            fontWeight="bold"
                            focusOnPress
                            centerLabelComponent={() => (
                                <View style={styles.pieCenterLabel}>
                                    <Text style={styles.pieCenterValue}>{totalAlerts}</Text>
                                    <Text style={styles.pieCenterText}>Alertas</Text>
                                </View>
                            )}
                        />
                    </View>
                ) : (
                    <View style={styles.noDataContainer}>
                        <Ionicons name="checkmark-circle" size={48} color="#2ecc71" />
                        <Text style={styles.noDataText}>¡Todo en orden! No hay alertas.</Text>
                    </View>
                )}
                 {/* Leyenda del gráfico */}
                <View style={styles.legendContainer}>
                    {chartData.map(item => (
                        <View key={item.label} style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                            <Text style={styles.legendText}>{item.label} ({item.value})</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* --- SECCIÓN DE LISTA DE ALERTAS --- */}
            <View style={styles.listSection}>
                <Text style={styles.sectionTitle}>Historial Reciente</Text>
                {alertas.length === 0 ? (
                     <Text style={styles.noDataListText}>No hay registros para mostrar.</Text>
                ) : (
                    alertas.map((al, idx) => {
                        const nivel = clasificaNivel(al);
                        const iconColor = getIconColor(nivel);
                        return (
                            <View key={idx} style={[styles.alertItem, { borderLeftColor: iconColor }]}>
                                <View style={styles.alertHeader}>
                                    <Ionicons name="warning" size={22} color={iconColor} />
                                    <Text style={[styles.alertText, { color: iconColor }]}>
                                        {nivel} - {al.tipo}
                                    </Text>
                                </View>
                                <Text style={styles.alertSubText}>Valor registrado: {al.valor}</Text>
                                <Text style={styles.alertTimestamp}>
                                    {new Date(al.timestamp).toLocaleString('es-MX')}
                                </Text>
                            </View>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}

// --- ESTILOS ---
const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f9f9fb' },
    screenTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        textAlign: 'center',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#34495e',
        marginBottom: 16,
    },
    chartSection: {
        backgroundColor: '#ffffff',
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    pieChartContainer: {
        marginVertical: 20,
    },
    pieCenterLabel: { justifyContent: 'center', alignItems: 'center' },
    pieCenterText: { fontSize: 16, color: '#7f8c8d' },
    pieCenterValue: { fontSize: 30, fontWeight: 'bold', color: '#2c3e50' },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 20,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 15,
        marginBottom: 10,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    legendText: {
        fontSize: 14,
        color: '#34495e',
    },
    listSection: {
        paddingBottom: 40,
    },
    alertItem: {
        backgroundColor: '#ffffff',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderLeftWidth: 5,
        elevation: 2,
    },
    alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    alertText: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    alertSubText: { fontSize: 14, color: '#636e72', marginLeft: 8 },
    alertTimestamp: { fontSize: 12, color: '#b2bec3', marginTop: 8, textAlign: 'right' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9fb' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#6c5ce7' },
    noDataContainer: { alignItems: 'center', paddingVertical: 30 },
    noDataText: { marginTop: 10, fontSize: 16, color: '#27ae60', fontWeight: 'bold' },
    noDataListText: { textAlign: 'center', marginTop: 20, color: '#636e72', fontStyle: 'italic' }
});