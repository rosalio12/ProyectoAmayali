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
  StatusBar,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- Color Palette ---
const colors = {
  primary: '#6D28D9',
  primaryDark: '#4C1D95',
  primaryLight: '#EDE9FE',
  background: '#F5F3FF',
  card: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textMuted: '#6B7280',
  border: '#DDD6FE',
  success: '#16A34A',
  disabled: '#A78BFA',
};

// --- Reusable Card Component ---
const Card = ({ children, title, iconName }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Icon name={iconName} size={24} color={colors.primary} />
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <View style={styles.cardContent}>{children}</View>
  </View>
);

export default function RegistroCuidadosScreen({ idUsuario }) {
  // --- STATE ---
  const [bebes, setBebes] = useState([]);
  const [idBebe, setIdBebe] = useState(null);
  const [cantidadLeche, setCantidadLeche] = useState(''); // MODIFICADO: De 'comida' a 'cantidadLeche'
  const [horaComida, setHoraComida] = useState(new Date());
  const [medicamento, setMedicamento] = useState('');
  const [horaMedicamento, setHoraMedicamento] = useState(new Date());
  const [ultimaComida, setUltimaComida] = useState(null);
  const [ultimoMed, setUltimoMed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComidaPicker, setShowComidaPicker] = useState(false);
  const [showMedPicker, setShowMedPicker] = useState(false);

  // --- CONFIGURATION ---
  const API_URL = 'http://192.168.0.223:5000';
  const API_BEBES_URL = 'http://192.168.0.223:3000';

  // --- DATA FETCHING ---
  const fetchBebes = useCallback(() => {
    if (!idUsuario) {
        setLoading(false);
        return;
    }
    setLoading(true);
    fetch(`${API_BEBES_URL}/api/bebes/enfermero/${idUsuario}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
      .then(data => {
        setBebes(data);
        if (data.length > 0) {
          setIdBebe(data[0].idBebe);
        }
      })
      .catch(err => {
        console.error('Error al cargar bebés:', err);
        Alert.alert('Error', 'No se pudieron cargar los datos de los bebés.');
      })
      .finally(() => setLoading(false));
  }, [idUsuario]);

  const fetchUltimosRegistros = useCallback(() => {
    if (!idBebe) return;
    fetch(`${API_URL}/registro-alimentacion/ultimo/${idBebe}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res)))
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

  // --- EVENT HANDLERS ---
  const handleDateChange = (event, selectedDate, type) => {
    const pickerSetter = type === 'comida' ? setShowComidaPicker : setShowMedPicker;
    const dateSetter = type === 'comida' ? setHoraComida : setHoraMedicamento;
    
    pickerSetter(Platform.OS === 'ios');
    if (selectedDate) {
      dateSetter(selectedDate);
    }
  };

  const enviarRegistro = async () => {
    // MODIFICADO: La condición ahora revisa cantidadLeche
    if (!idBebe || (!cantidadLeche.trim() && !medicamento.trim())) {
      Alert.alert('Atención', 'Debe completar al menos un campo: cantidad de leche o medicamento.');
      return;
    }

    setIsSubmitting(true);
    try {
      // MODIFICADO: Formatear el campo 'comida' para el backend
      const comidaParaEnviar = cantidadLeche.trim() ? `Leche - ${cantidadLeche}ml` : null;

      const response = await fetch(`${API_URL}/registro-alimentacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idBebe,
          comida: comidaParaEnviar,
          horaComida: cantidadLeche.trim() ? horaComida : null,
          medicamento: medicamento.trim() || null,
          horaMedicamento: medicamento.trim() ? horaMedicamento : null,
        }),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Registro guardado correctamente.');
        fetchUltimosRegistros();
        setCantidadLeche(''); // MODIFICADO: Limpiar el estado correcto
        setMedicamento('');
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

  // --- RENDER ---
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Registro de Cuidados</Text>

        <Card title="Seleccionar Bebé" iconName="baby-face-outline">
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={idBebe}
              onValueChange={itemValue => setIdBebe(itemValue)}
              enabled={bebes.length > 0}
              style={styles.picker}
              dropdownIconColor={colors.primary}
            >
              {bebes.length > 0 ? (
                bebes.map(bebe => (
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
            <Icon name="baby-bottle-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              Última comida:{' '}
              <Text style={styles.infoBold}>
                {ultimaComida ? new Date(ultimaComida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
              </Text>
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="pill" size={24} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              Último med.:{' '}
              <Text style={styles.infoBold}>
                {ultimoMed ? new Date(ultimoMed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
              </Text>
            </Text>
          </View>
        </Card>

        {/* --- SECCIÓN DE ALIMENTACIÓN MODIFICADA --- */}
        <Card title="Registrar Alimentación" iconName="food-apple-outline">
          <Text style={styles.label}>Cantidad de Leche (ml)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. 80"
            placeholderTextColor={colors.textMuted}
            value={cantidadLeche}
            onChangeText={setCantidadLeche}
            keyboardType="numeric" // Teclado numérico para la cantidad
          />
          <TouchableOpacity style={styles.timeButton} onPress={() => setShowComidaPicker(true)}>
            <Icon name="clock-outline" size={20} color={colors.primary} />
            <Text style={styles.timeButtonText}>
              Hora: {horaComida.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        </Card>
        {/* --- FIN DE LA SECCIÓN MODIFICADA --- */}

        <Card title="Registrar Medicamento" iconName="medical-bag">
          <Text style={styles.label}>Nombre y Dosis</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Paracetamol 10mg"
            placeholderTextColor={colors.textMuted}
            value={medicamento}
            onChangeText={setMedicamento}
          />
          <TouchableOpacity style={styles.timeButton} onPress={() => setShowMedPicker(true)}>
            <Icon name="clock-outline" size={20} color={colors.primary} />
            <Text style={styles.timeButtonText}>
              Hora: {horaMedicamento.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        </Card>

        {showComidaPicker && (
          <DateTimePicker
            value={horaComida}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(e, date) => handleDateChange(e, date, 'comida')}
          />
        )}

        {showMedPicker && (
          <DateTimePicker
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
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Guardar Registro</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primaryDark,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryLight,
    paddingBottom: 12,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryDark,
    marginLeft: 10,
  },
  cardContent: {},
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  picker: {
    color: colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12,
    color: colors.textSecondary,
  },
  infoBold: {
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
    color: colors.textPrimary,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: colors.disabled,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
