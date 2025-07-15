import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CunaScreen({ userId }) { // Recibimos 'route' como prop
  // Extraemos el userId de los parámetros de la ruta.
  // Si por alguna razón no se pasa, usamos un valor predeterminado 'usuario_desconocido'.


  // Estado para los datos de los sensores (simulados)
  const [sensorData, setSensorData] = useState({
    temperature: '--',
    co2: '--',
    humidity: '--',
    movement: '--',
    weight: '--',
    status: 'Conectando...'
  });

  // Simular actualización de datos del sensor
  useEffect(() => {
    // Aquí es donde en una aplicación real harías una llamada a tu API
    // para obtener los datos de los sensores **específicos para este userId**.
    // Por ejemplo: fetchDataForUser(userId).then(data => setSensorData(data));
    console.log(`CunaScreen: Iniciando monitoreo para el usuario con ID: ${userId}`);

    const interval = setInterval(() => {
      setSensorData({
        temperature: (36.5 + Math.random() * 1.5).toFixed(1) + '°C',
        co2: Math.floor(400 + Math.random() * 600) + ' ppm',
        humidity: Math.floor(40 + Math.random() * 30) + '%',
        movement: Math.random() > 0.3 ? 'Activo' : 'Inactivo',
        weight: (6.2 + Math.random() * 0.5).toFixed(2) + ' kg',
        status: 'Modo seguro'
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [userId]); // Añadimos userId a las dependencias. Si el userId cambia, el efecto se reiniciará.

  // Verificar alertas
  useEffect(() => {
    const temp = parseFloat(sensorData.temperature);
    const co2 = parseInt(sensorData.co2);
    
    if (temp > 37.5 || temp < 36) {
      Alert.alert('Alerta de Temperatura', `¡Atención, ${userId}! Temperatura fuera de rango seguro: ${sensorData.temperature}`);
    }
    
    if (co2 > 1000) {
      Alert.alert('Alerta de CO2', `¡Atención, ${userId}! Niveles de CO2 elevados: ${sensorData.co2}`);
    }
  }, [sensorData, userId]); // Añadimos userId a las dependencias para incluirlo en las alertas

  return (
    <ScrollView style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Monitoreo de Cuna Inteligente</Text>
          {/* Mostramos el ID del usuario para verificar que se esté pasando correctamente */}
          <Text style={styles.userIdDisplay}>ID Usuario: {userId}</Text> 
        </View>
        <View style={styles.headerDecoration}></View>
      </View>

      {/* Imagen de la cuna con marco */}
      <View style={styles.imageContainer}>
        <View style={styles.imageFrame}>
          <Image 
            // Aquí puedes agregar tu imagen de la cuna, por ejemplo:
            // source={require('../assets/cuna_placeholder.png')}
            // style={styles.cunaImage}
          />
        </View>
      </View>

      {/* Tarjeta de Sensores Principales */}
      <View style={[styles.card, styles.sensorCard]}>
        <Text style={styles.cardTitle}>Datos de Sensores</Text>
        
        <View style={styles.sensorGrid}>
          {/* Temperatura */}
          <View style={styles.sensorItem}>
            <View style={styles.sensorHeader}>
              <View style={[styles.sensorIcon, styles.tempIcon]}>
                <Ionicons name="thermometer" size={20} color="#fff" />
              </View>
              <Text style={styles.sensorLabel}>Temperatura</Text>
            </View>
            <Text style={styles.sensorValue}>{sensorData.temperature}</Text>
            <View style={styles.rangeContainer}>
              <Text style={styles.sensorRange}>Rango seguro: </Text>
              <Text style={styles.sensorRangeValue}>36°C - 37.5°C</Text>
            </View>
          </View>

          {/* CO2 */}
          <View style={styles.sensorItem}>
            <View style={styles.sensorHeader}>
              <View style={[styles.sensorIcon, styles.co2Icon]}>
                <Ionicons name="cloud" size={20} color="#fff" />
              </View>
              <Text style={styles.sensorLabel}>CO2</Text>
            </View>
            <Text style={styles.sensorValue}>{sensorData.co2}</Text>
            <View style={styles.rangeContainer}>
              <Text style={styles.sensorRange}>Óptimo: </Text>
              <Text style={styles.sensorRangeValue}>{"<"}1000 ppm</Text>
            </View>
          </View>

          {/* Humedad */}
          <View style={styles.sensorItem}>
            <View style={styles.sensorHeader}>
              <View style={[styles.sensorIcon, styles.humidityIcon]}>
                <Ionicons name="water" size={20} color="#fff" />
              </View>
              <Text style={styles.sensorLabel}>Humedad</Text>
            </View>
            <Text style={styles.sensorValue}>{sensorData.humidity}</Text>
            <View style={styles.rangeContainer}>
              <Text style={styles.sensorRange}>Ideal: </Text>
              <Text style={styles.sensorRangeValue}>40% - 70%</Text>
            </View>
          </View>

          {/* Movimiento */}
          <View style={styles.sensorItem}>
            <View style={styles.sensorHeader}>
              <View style={[styles.sensorIcon, styles.movementIcon]}>
                <Ionicons name="move" size={20} color="#fff" />
              </View>
              <Text style={styles.sensorLabel}>Movimiento</Text>
            </View>
            <Text style={[
              styles.sensorValue,
              sensorData.movement === 'Activo' ? styles.valueActive : styles.valueInactive
            ]}>
              {sensorData.movement}
            </Text>
            <View style={styles.rangeContainer}>
              <Text style={styles.sensorRange}>Última detección: </Text>
              <Text style={styles.sensorRangeValue}>ahora</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tarjeta de Peso */}
      <View style={[styles.card, styles.weightCard]}>
        <Text style={styles.cardTitle}>Peso del Bebé</Text>
        <View style={styles.weightContainer}>
          <View style={styles.weightIcon}>
            <Ionicons name="scale" size={28} color="#fff" />
          </View>
          <Text style={styles.weightValue}>{sensorData.weight}</Text>
        </View>
        <View style={styles.weightProgress}>
          <View style={[styles.progressBar, {width: '75%'}]} />
          <Text style={styles.progressText}>Crecimiento: <Text style={styles.progressPercent}>75% percentil</Text></Text>
        </View>
      </View>

      {/* Recomendaciones */}
      <View style={[styles.card, styles.tipsCard]}>
        <Text style={styles.cardTitle}>Recomendaciones</Text>
        <View style={styles.tipItem}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb" size={18} color="#fff" />
          </View>
          <Text style={styles.tipText}>Mantén la temperatura ambiente entre 20°C y 22°C</Text>
        </View>
        <View style={styles.tipItem}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb" size={18} color="#fff" />
          </View>
          <Text style={styles.tipText}>Ventila la habitación si el CO2 supera 1000 ppm</Text>
        </View>
        <View style={styles.tipItem}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb" size={18} color="#fff" />
          </View>
          <Text style={styles.tipText}>Verifica la posición del bebé si no hay movimiento por más de 10 min</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F5FF', // Fondo lila claro consistente
    padding: 15,
  },
  header: {
    marginBottom: 25,
    position: 'relative',
  },
  headerContent: {
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  headerDecoration: {
    position: 'absolute',
    top: -10,
    left: -20,
    right: -20,
    height: 80,
    backgroundColor: '#E4D4FF', // Degradado morado claro
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4A2C8E', // Morado oscuro
    marginTop: 10,
    flex: 1,
  },
  // Nuevo estilo para mostrar el ID del usuario
  userIdDisplay: {
    fontSize: 14,
    color: '#616161',
    marginTop: 10,
    marginLeft: 10,
    fontWeight: '500',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  statusSafe: {
    backgroundColor: '#5D9C59', // Verde más suave
  },
  statusWarning: {
    backgroundColor: '#DF2E38', // Rojo más suave
  },
  statusText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 12,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  imageFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 10,
    shadowColor: '#7E57C2',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cunaImage: {
    width: '100%',
    height: 100,
    // Asegúrate de tener una imagen en esta ruta si la descomentas
  },
  card: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#7E57C2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sensorCard: {
    backgroundColor: '#FFFFFF',
  },
  weightCard: {
    backgroundColor: '#7E57C2', // Morado medio
  },
  tipsCard: {
    backgroundColor: '#4A2C8E', // Morado oscuro
  },
  // El estilo 'cardTitle' se repite en el código original, lo he consolidado
  // para mayor claridad, pero manteniendo el color blanco para las tarjetas de color.
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    // Este color se sobrescribe si la tarjeta tiene un fondo de color (weightCard, tipsCard)
    color: '#4A2C8E', 
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
  },
  // Específico para los títulos de tarjetas con fondo oscuro
  weightCard: {
    backgroundColor: '#7E57C2', // Morado medio
  },
  tipsCard: {
    backgroundColor: '#4A2C8E', // Morado oscuro
  },
  // Sobrescribimos el color del título para las tarjetas con fondo de color
  // Puedes usar una prop 'titleColor' o aplicar el estilo inline si prefieres.
  // En este caso, el `cardTitle` de las tarjetas `weightCard` y `tipsCard`
  // ya están definidos con `color: '#FFFFFF'` en tu código original,
  // así que lo mantengo como estaba.
  
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sensorItem: {
    width: '48%',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sensorIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  tempIcon: {
    backgroundColor: '#FF5252', // Rojo para temperatura
  },
  co2Icon: {
    backgroundColor: '#42A5F5', // Azul para CO2
  },
  humidityIcon: {
    backgroundColor: '#29B6F6', // Azul claro para humedad
  },
  movementIcon: {
    backgroundColor: '#AB47BC', // Morado para movimiento
  },
  sensorLabel: {
    fontSize: 14,
    color: '#616161',
    fontWeight: '500',
  },
  sensorValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginVertical: 5,
  },
  valueActive: {
    color: '#5D9C59', // Verde para activo
  },
  valueInactive: {
    color: '#DF2E38', // Rojo para inactivo
  },
  rangeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sensorRange: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  sensorRangeValue: {
    fontSize: 12,
    color: '#4A2C8E',
    fontWeight: '500',
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  weightIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  weightValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  weightProgress: {
    marginTop: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    marginBottom: 5,
    opacity: 0.7,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  progressPercent: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tipIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
});