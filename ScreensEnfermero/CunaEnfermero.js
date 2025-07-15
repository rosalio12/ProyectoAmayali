// ScreensEnfermero/CunaEnfermero.js

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions, TouchableOpacity, Alert } from 'react-native'; // Añadí Alert para mensajes de error
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

// ✅ IMPORTANTE: Recibe userId como prop
export default function CunasEnfermeroScreen({ userId }) {
  const [vista, setVista] = useState('grid');
  const [cunaSeleccionada, setCunaSeleccionada] = useState(null);
  const [cunas, setCunas] = useState([]);

  // Eliminamos el ID fijo: const idUsuario = 5;

  useEffect(() => {
    const fetchCunas = async () => {
      // Solo hacemos la llamada a la API si tenemos un userId válido
      if (userId) {
        console.log(`Obteniendo cunas para userId: ${userId}`); // Para depuración
        try {
          const response = await fetch(`http://localhost:3000/api/cunas/enfermero/${userId}`); // ¡Usamos la prop!
          
          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Error HTTP! estado: ${response.status}, mensaje: ${errorText}`);
          }
          const data = await response.json();
          console.log('Datos recibidos para cunas:', data); // Para depuración

          const cunasFormateadas = data.map(cuna => ({
            idCuna: cuna.idCuna,
            nombre: cuna.nombre,
            temperature: '---', // Valores de marcador de posición
            co2: '---',
            humidity: '---',
            movement: '---',
            weight: '---',
            status: cuna.Estado ? 'Modo seguro' : 'Inactivo', // Asegúrate que 'Estado' coincida con tu columna DB
            fechaAsig: cuna.FechaAsig, // Asegúrate que 'FechaAsig' coincida con tu columna DB
            nombreCuarto: cuna.nombreCuarto,
            nombreHospital: cuna.nombreHospital,
          }));

          setCunas(cunasFormateadas);
        } catch (error) {
          console.error("Error al obtener cunas:", error);
          Alert.alert("Error", "No se pudieron cargar las cunas. Por favor, inténtalo de nuevo.");
        }
      } else {
          console.log('CunasEnfermeroScreen: userId no está disponible aún.');
      }
    };

    fetchCunas();
  }, [userId]); // El efecto se vuelve a ejecutar si userId cambia

  const mostrarDetalle = (cuna) => {
    setCunaSeleccionada(cuna);
    setVista('detalle');
  };

  const volverAListado = () => {
    setVista('grid');
    setCunaSeleccionada(null);
  };

  if (vista === 'detalle' && cunaSeleccionada) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.detalleHeader}>
          <Text style={styles.detalleTitle}>{cunaSeleccionada.nombre}</Text>
          <Text style={styles.detalleSub}>Asignada el {new Date(cunaSeleccionada.fechaAsig).toLocaleDateString()}</Text>
        </View>

        <View style={styles.detalleCard}>
          <Dato icon="thermometer" label="Temperatura" value={cunaSeleccionada.temperature} color="#FF5252" />
          <Dato icon="cloud" label="CO2" value={cunaSeleccionada.co2} color="#42A5F5" />
          <Dato icon="water" label="Humedad" value={cunaSeleccionada.humidity} color="#29B6F6" />
          <Dato icon="move" label="Movimiento" value={cunaSeleccionada.movement} color="#AB47BC" />
          <Dato icon="scale" label="Peso" value={cunaSeleccionada.weight} color="#7E57C2" />
          <Dato icon="checkmark-circle" label="Estado" value={cunaSeleccionada.status} color="#5D9C59" />
          <Dato icon="home" label="Cuarto" value={cunaSeleccionada.nombreCuarto} color="#4A2C8E" />
          <Dato icon="medkit" label="Hospital" value={cunaSeleccionada.nombreHospital} color="#4A2C8E" />
        </View>

        <TouchableOpacity style={styles.botonVolver} onPress={volverAListado}>
          <Ionicons name="arrow-back" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.botonTexto}>Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Cunas Asignadas</Text>
      <View style={styles.grid}>
        {cunas.length > 0 ? cunas.map((cuna, index) => (
          <TouchableOpacity key={index} style={styles.card} onPress={() => mostrarDetalle(cuna)}>
            <Text style={styles.cunaTitle}>{cuna.nombre}</Text>
            <MiniSensor icon="thermometer" label="Temp." value={cuna.temperature} color="#FF5252" />
            <MiniSensor icon="cloud" label="CO2" value={cuna.co2} color="#42A5F5" />
            <MiniSensor icon="scale" label="Peso" value={cuna.weight} color="#7E57C2" />
            <MiniSensor icon="checkmark-circle" label="Estado" value={cuna.status} color="#5D9C59" />
          </TouchableOpacity>
        )) : <Text style={styles.noCunasText}>No se encontraron cunas asignadas para este usuario.</Text>}
      </View>
    </ScrollView>
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

function Dato({ icon, label, value, color }) {
  return (
    <View style={styles.dato}>
      <Ionicons name={icon} size={22} color={color} style={{ marginRight: 10 }} />
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F5FF', padding: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#4A2C8E', textAlign: 'center', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: (screenWidth / 2) - 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
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
    marginBottom: 30,
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
  },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  noCunasText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#777',
    width: '100%',
  }
});