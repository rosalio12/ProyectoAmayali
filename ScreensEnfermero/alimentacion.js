import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- Componente de Tarjeta reutilizable para un diseño limpio ---
const Card = ({ children, title, iconName }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Icon name={iconName} size={24} color="#008080" />
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <View style={styles.cardContent}>
      {children}
    </View>
  </View>
);

export default function RegistroCuidadosScreen({ idUsuario }) {
  // --- ESTADO ---
  const [bebes, setBebes] = useState([]);
  const [idBebe, setIdBebe] = useState(null);
  const [comida, setComida] = useState('');
  const [horaComida, setHoraComida] = useState(new Date());
  const [medicamento, setMedicamento] = useState('');
  const [horaMedicamento, setHoraMedicamento] = useState(new Date());
  const [ultimaComida, setUltimaComida] = useState(null);
  const [ultimoMed, setUltimoMed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para controlar la visibilidad de los selectores de hora
  const [showComidaPicker, setShowComidaPicker] = useState(false);
  const [showMedPicker, setShowMedPicker] = useState(false);

  // --- CONFIGURACIÓN ---
  const API_URL = 'http://localhost:5000';
  const API_BEBES_URL = 'http://localhost:3000';

  // --- EFECTOS (FETCH DE DATOS) ---
  // MODIFICADO: Usar el endpoint correcto y el idUsuario recibido por props
  const fetchBebes = useCallback(() => {
    setLoading(true);
    fetch(`${API_BEBES_URL}/api/bebes/enfermero/${idUsuario}`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        setBebes(data);
        if (data.length > 0) {
          setIdBebe(data[0].idBebe);
        }
      })
      .catch(err => {
        console.error("Error al cargar bebés:", err);
        Alert.alert('Error', 'No se pudieron cargar los datos de los bebés.');
      })
      .finally(() => setLoading(false));
  }, [idUsuario]);

  const fetchUltimosRegistros = useCallback(() => {
    if (!idBebe) return;
    fetch(`${API_URL}/registro-alimentacion/ultimo/${idBebe}`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        setUltimaComida(data?.ultimaComida || null);
        setUltimoMed(data?.ultimoMedicamento || null);
      })
      .catch(err => {
        console.error('Error al obtener últimos registros:', err);
      });
  }, [idBebe]);

  useEffect(() => {
    fetchBebes();
  }, [fetchBebes]);

  useEffect(() => {
    fetchUltimosRegistros();
  }, [idBebe, fetchUltimosRegistros]);

  // Siempre actualizar la última comida en pantalla cuando cambie ultimaComida
  useEffect(() => {
    // Este efecto fuerza el renderizado del valor actualizado de ultimaComida
    // No requiere lógica adicional, React lo re-renderiza automáticamente
  }, [ultimaComida]);

  // --- MANEJADORES DE EVENTOS ---
  const handleDateChange = (event, selectedDate, type) => {
    if (type === 'comida') {
      setShowComidaPicker(Platform.OS === 'ios');
      if (selectedDate) {
        setHoraComida(selectedDate);
      }
    } else if (type === 'medicamento') {
      setShowMedPicker(Platform.OS === 'ios');
      if (selectedDate) {
        setHoraMedicamento(selectedDate);
      }
    }
  };

  const enviarRegistro = async () => {
    if (!idBebe || (!comida && !medicamento)) {
      Alert.alert('Atención', 'Debe completar al menos un campo: comida o medicamento.');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/registro-alimentacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idBebe,
          comida: comida || null,
          horaComida: comida ? horaComida : null,
          medicamento: medicamento || null,
          horaMedicamento: medicamento ? horaMedicamento : null,
        }),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Registro guardado correctamente.');
        fetchUltimosRegistros();
        if (comida) setComida('');
        if (medicamento) setMedicamento('');
      } else {
        Alert.alert('Error', 'No se pudo guardar el registro. Intente de nuevo.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERIZADO ---
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#008080" />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Registro de Cuidados</Text>
        
        <Card title="Seleccionar Bebé" iconName="baby-face-outline">
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={idBebe}
              onValueChange={(itemValue) => setIdBebe(itemValue)}
              enabled={bebes.length > 0}
              style={styles.picker}
            >
              {bebes.length > 0 ? (
                bebes.map((bebe) => (
                  <Picker.Item
                    key={bebe.idBebe}
                    label={`${bebe.Nombre} ${bebe.ApellidoPaterno}`}
                    value={bebe.idBebe}
                  />
                ))
              ) : (
                <Picker.Item label="No hay bebés asignados" value={null} />
              )}
            </Picker>
          </View>
        </Card>

        <Card title="Estado Actual" iconName="information-outline">
            <View style={styles.infoRow}>
                <Icon name="baby-bottle-outline" size={24} color="#555" />
                <Text style={styles.infoText}>
                  Última comida: <Text style={styles.infoBold}>
                    {ultimaComida ? new Date(ultimaComida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </Text>
                </Text>
            </View>
            <View style={styles.infoRow}>
                <Icon name="pill" size={24} color="#555" />
                <Text style={styles.infoText}>
                  Último med.: <Text style={styles.infoBold}>
                    {ultimoMed ? new Date(ultimoMed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </Text>
                </Text>
            </View>
        </Card>

        <Card title="Registrar Alimentación" iconName="food-apple-outline">
          <Text style={styles.label}>Tipo de Comida</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Leche materna, Fórmula 80ml"
            value={comida}
            onChangeText={setComida}
          />
          <TouchableOpacity style={styles.timeButton} onPress={() => setShowComidaPicker(true)}>
            <Icon name="clock-outline" size={20} color="#008080" />
            <Text style={styles.timeButtonText}>Hora: {horaComida.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
        </Card>

        <Card title="Registrar Medicamento" iconName="medical-bag">
          <Text style={styles.label}>Nombre y Dosis</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Paracetamol 10mg"
            value={medicamento}
            onChangeText={setMedicamento}
          />
          <TouchableOpacity style={styles.timeButton} onPress={() => setShowMedPicker(true)}>
            <Icon name="clock-outline" size={20} color="#008080" />
            <Text style={styles.timeButtonText}>Hora: {horaMedicamento.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
        </Card>

        {showComidaPicker && (
          <DateTimePicker
            testID="comidaTimePicker"
            value={horaComida}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(e, date) => handleDateChange(e, date, 'comida')}
          />
        )}

        {showMedPicker && (
          <DateTimePicker
            testID="medicamentoTimePicker"
            value={horaMedicamento}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(e, date) => handleDateChange(e, date, 'medicamento')}
          />
        )}

        <TouchableOpacity 
            style={[styles.submitButton, (isSubmitting || !idBebe) && styles.submitButtonDisabled]}
            onPress={enviarRegistro}
            disabled={isSubmitting || !idBebe}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Guardando...' : 'Guardar Registro'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- ESTILOS ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FAFD',
  },
  scrollContent: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4FAFD',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  cardContent: {
    // No necesita estilos adicionales por ahora
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
  },
  picker: {
    // Estilos para el picker pueden variar por plataforma
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#555',
  },
  infoBold: {
    fontWeight: 'bold',
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F2F2',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: 'center',
  },
  timeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#008080',
  },
  submitButton: {
    backgroundColor: '#008080',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#A9D4D4',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

