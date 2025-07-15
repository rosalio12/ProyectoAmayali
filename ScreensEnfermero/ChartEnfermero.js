import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert // Importamos Alert para mejor manejo de errores
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ✅ Recibe userId como prop
export default function ChartEnfermeroScreen({ userId }) {
  const [alertas, setAlertas] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroNivel, setFiltroNivel] = useState('Todos');
  const [filtroFecha, setFiltroFecha] = useState('Todos');
  const [loadingCunas, setLoadingCunas] = useState(true); // Nuevo estado para la carga de cunas

  // IPs y Puertos de tus backends
  const SQL_API_BASE = 'http://172.18.2.158:3000'; // Tu API de SQL Server
  const MONGO_API_BASE = 'http://172.18.2.158:5000'; // Tu API de MongoDB

  useEffect(() => {
    const fetchAlertsForEnfermero = async () => {
      if (!userId) {
        console.log('ChartEnfermeroScreen: userId no está disponible aún.');
        setLoadingCunas(false);
        setAlertas([]); // Aseguramos que no se quede cargando
        return;
      }

      setLoadingCunas(true); // Iniciar carga de cunas y alertas
      setAlertas(null); // Reiniciar alertas para mostrar indicador de carga

      try {
        // 1. Obtener IDs de cuna SQL asignadas al enfermero
        console.log(`ChartEnfermeroScreen: Fetching SQL cunas for userId: ${userId}`);
        const cunasSqlRes = await fetch(`${SQL_API_BASE}/api/cunas/enfermero/${userId}`);
        if (!cunasSqlRes.ok) {
          const errorText = await cunasSqlRes.text();
          throw new Error(`Error ${cunasSqlRes.status}: ${errorText} al obtener cunas de SQL`);
        }
        const cunasSql = await cunasSqlRes.json();
        console.log('ChartEnfermeroScreen: Cunas SQL obtenidas:', cunasSql);

        if (cunasSql.length === 0) {
            Alert.alert("Sin Cunas", "Este enfermero no tiene cunas asignadas.");
            setAlertas([]);
            setLoadingCunas(false);
            return;
        }

        // 2. Mapear IDs de cuna SQL a IDs de cuna de MongoDB
        // Asumiendo que el idCuna de SQL es un número y en Mongo es CUNA00X
        const cunasMongoIds = cunasSql.map(cuna => {
            const cunaNum = String(cuna.idCuna).padStart(3, '0'); // Rellena con ceros para tener 3 dígitos
            return `CUNA${cunaNum}`;
        });
        const cunasQueryParam = cunasMongoIds.join(',');
        console.log('ChartEnfermeroScreen: Cunas Mongo para consulta:', cunasQueryParam);

        // 3. Construir la URL de la API de MongoDB con los IDs de cuna
        const MONGO_ALERTS_API_URL = `${MONGO_API_BASE}/alertas?cunas=${cunasQueryParam}`;
        console.log(`ChartEnfermeroScreen: Fetching MongoDB alerts from: ${MONGO_ALERTS_API_URL}`);

        // 4. Obtener alertas de MongoDB
        const mongoAlertsRes = await fetch(MONGO_ALERTS_API_URL);
        if (!mongoAlertsRes.ok) {
          const errorText = await mongoAlertsRes.text();
          throw new Error(`Error ${mongoAlertsRes.status}: ${errorText} al obtener alertas de Mongo`);
        }
        const mongoAlertsData = await mongoAlertsRes.json();
        console.log('ChartEnfermeroScreen: Alertas de Mongo obtenidas:', mongoAlertsData);

        // Si la respuesta tiene una propiedad 'data', la usamos; de lo contrario, la respuesta completa.
        setAlertas(mongoAlertsData.data || mongoAlertsData);

      } catch (err) {
        console.error('❌ ChartEnfermeroScreen: Error general al cargar alertas:', err);
        Alert.alert("Error de Carga", `No se pudieron cargar las alertas. Detalle: ${err.message}`);
        setAlertas([]); // Asegurar que el estado no sea 'null' para salir del loading
      } finally {
        setLoadingCunas(false); // Finalizar carga
      }
    };

    fetchAlertsForEnfermero();
  }, [userId]); // El efecto se ejecuta cuando userId cambia

  if (loadingCunas || alertas === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c5ce7" />
        <Text style={styles.loadingText}>Cargando alertas de cunas...</Text>
      </View>
    );
  }

  const clasificaNivel = (al) => {
    const tipo = al.tipo.toLowerCase();
    // Aquí puedes ajustar la lógica de niveles según tus necesidades exactas
    if (tipo.includes('critica') || (al.tipo.includes('Oxigenación baja') && al.valor <= 85) || (al.tipo.includes('Frecuencia cardíaca anormal') && (al.valor > 160 || al.valor < 50))) return 'Crítico';
    if (tipo.includes('media') || (al.tipo.includes('Oxigenación baja') && al.valor > 85 && al.valor <= 90) || (al.tipo.includes('Frecuencia cardíaca anormal') && ((al.valor > 150 && al.valor <= 160) || (al.valor >= 50 && al.valor < 60)))) return 'Medio';
    return 'Leve';
  };

  const getBackgroundColor = (nivel) => {
    switch (nivel) {
      case 'Crítico': return '#fdecea';
      case 'Medio': return '#fff8e6';
      default: return '#f3f0ff';
    }
  };

  const getIconColor = (nivel) => {
    switch (nivel) {
      case 'Crítico': return '#e74c3c';
      case 'Medio': return '#f39c12';
      default: return '#6c5ce7';
    }
  };

  let filtradas = alertas;
  if (filtroTipo !== 'Todos') {
    filtradas = filtradas.filter(al => al.tipo === filtroTipo);
  }
  if (filtroNivel !== 'Todos') {
    filtradas = filtradas.filter(al => clasificaNivel(al) === filtroNivel);
  }
  if (filtroFecha === 'Hoy') {
    filtradas = filtradas.filter(al => {
      const fecha = new Date(al.timestamp);
      const hoy = new Date();
      return fecha.toDateString() === hoy.toDateString();
    });
  }

  // Asegúrate de que alertas no sea null antes de mapear para tipos únicos
  const tiposUnicos = alertas ? [...new Set(alertas.map(al => al.tipo))] : [];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.screenTitle}>🩺 Alertas Filtrables</Text>

      <View style={styles.filtrosContainer}>
        <Text style={styles.filtroTitle}>Tipo:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          <FiltroChip
            label="Todos"
            activo={filtroTipo === 'Todos'}
            onPress={() => setFiltroTipo('Todos')}
            icon="layers-outline"
          />
          {tiposUnicos.map(tipo => (
            <FiltroChip
              key={tipo}
              label={tipo}
              activo={filtroTipo === tipo}
              onPress={() => setFiltroTipo(tipo)}
              icon="alert-circle-outline"
            />
          ))}
        </ScrollView>

        <Text style={styles.filtroTitle}>Gravedad:</Text>
        <View style={styles.chipRow}>
          {['Todos', 'Crítico', 'Medio', 'Leve'].map(nivel => (
            <FiltroChip
              key={nivel}
              label={nivel}
              activo={filtroNivel === nivel}
              onPress={() => setFiltroNivel(nivel)}
              icon="warning-outline"
            />
          ))}
        </View>

        <Text style={styles.filtroTitle}>Fecha:</Text>
        <View style={styles.chipRow}>
          {['Todos', 'Hoy'].map(fecha => (
            <FiltroChip
              key={fecha}
              label={fecha}
              activo={filtroFecha === fecha}
              onPress={() => setFiltroFecha(fecha)}
              icon="calendar-outline"
            />
          ))}
        </View>
      </View>

      <View style={styles.listContainer}>
        {filtradas.length === 0 && (
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#636e72' }}>
            No hay alertas que coincidan con el filtro.
          </Text>
        )}
        {filtradas.map((al, idx) => {
          const nivel = clasificaNivel(al);
          const bg = getBackgroundColor(nivel);
          const iconColor = getIconColor(nivel);
          return (
            <View key={idx} style={[styles.alertItem, { backgroundColor: bg }]}>
              <View style={styles.alertHeader}>
                <Ionicons name="warning" size={22} color={iconColor} />
                <Text style={[styles.alertText, { color: iconColor }]}>
                  {al.tipo} - {nivel}
                </Text>
              </View>
              <Text style={styles.alertSubText}>Valor: {al.valor}</Text>
              <Text style={styles.alertSubText}>Cuna: {al.cunaId}</Text>
              <Text style={styles.alertTimestamp}>
                {new Date(al.timestamp).toLocaleString()}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// Componente Chip reutilizable (sin cambios)
function FiltroChip({ label, activo, onPress, icon }) {
  return (
    <TouchableOpacity
      style={[styles.chip, activo && styles.chipActivo]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={16}
        color={activo ? '#fff' : '#6c5ce7'}
        style={{ marginRight: 4 }}
      />
      <Text style={[styles.chipTexto, activo && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9f9fb' },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6c5ce7',
    textAlign: 'center',
    marginBottom: 20,
  },
  filtrosContainer: { marginBottom: 20 },
  filtroTitle: { fontWeight: 'bold', color: '#2d3436', marginVertical: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#edf2fb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 6,
  },
  chipActivo: {
    backgroundColor: '#6c5ce7',
  },
  chipTexto: {
    color: '#6c5ce7',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: { paddingBottom: 40 },
  alertItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  alertText: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  alertSubText: { fontSize: 14, color: '#636e72' },
  alertTimestamp: { fontSize: 12, color: '#636e72', marginTop: 4 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9fb',
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#6c5ce7' },
});