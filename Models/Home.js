import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  // Datos de ejemplo
  const babyData = {
    name: 'Emma',
    age: '3 meses',
    weight: '6.2 kg',
    height: '62 cm',
    lastFeeding: 'Hace 2 horas',
    lastDiaperChange: 'Hace 1 hora',
    status: 'Durmiendo',
    heartRate: '132 lpm',
    oxygen: '98%',
    temperature: '36.8°C',
    alerts: [
      { type: 'movement', message: 'Poco movimiento en últimos 10 min', level: 'warning' },
      { type: 'temperature', message: 'Temperatura estable', level: 'ok' }
    ]
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Bienvenida, Mamá</Text>
          <Text style={styles.babyName}>Bebé: {babyData.name}</Text>
        </View>
        <View style={styles.headerDecoration}></View>
      </View>

      {/* Tarjeta de estado general */}
      <View style={[styles.card, styles.statusCard]}>
        <Text style={styles.cardTitle}>Estado Actual</Text>
        <View style={styles.statusRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="heart" size={20} color="#fff" />
          </View>
          <Text style={styles.statusText}>Latidos: {babyData.heartRate}</Text>
        </View>
        <View style={styles.statusRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="pulse" size={20} color="#fff" />
          </View>
          <Text style={styles.statusText}>Oxígeno: {babyData.oxygen}</Text>
        </View>
        <View style={styles.statusRow}>
          <View style={styles.iconContainer}>
            <Ionicons name="thermometer" size={20} color="#fff" />
          </View>
          <Text style={styles.statusText}>Temperatura: {babyData.temperature}</Text>
        </View>
        <View style={[styles.statusRow, styles.statusContainer]}>
          <View style={styles.iconContainer}>
            <Ionicons name="moon" size={20} color="#fff" />
          </View>
          <Text style={styles.statusText}>Estado: {babyData.status}</Text>
        </View>
      </View>

      {/* Tarjeta de alertas */}
      <View style={[styles.card, styles.alertsCard]}>
        <Text style={styles.cardTitle}>Alertas</Text>
        {babyData.alerts.map((alert, index) => (
          <View key={index} style={[
            styles.alertItem,
            alert.level === 'warning' ? styles.alertWarning : styles.alertOk
          ]}>
            <View style={[
              styles.alertIconContainer,
              alert.level === 'warning' ? styles.alertIconWarning : styles.alertIconOk
            ]}>
              <Ionicons 
                name={alert.level === 'warning' ? "warning" : "checkmark-circle"} 
                size={16} 
                color="#fff" 
              />
            </View>
            <Text style={styles.alertText}>{alert.message}</Text>
          </View>
        ))}
      </View>

      {/* Tarjeta de información básica */}
      <View style={[styles.card, styles.infoCard]}>
        <Text style={styles.cardTitle}>Información del Bebé</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Edad:</Text>
          <Text style={styles.infoValue}>{babyData.age}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Peso:</Text>
          <Text style={styles.infoValue}>{babyData.weight}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Talla:</Text>
          <Text style={styles.infoValue}>{babyData.height}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Última comida:</Text>
          <Text style={styles.infoValue}>{babyData.lastFeeding}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Último cambio:</Text>
          <Text style={styles.infoValue}>{babyData.lastDiaperChange}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F5FF', // Fondo suave lila claro
    padding: 15,
  },
  header: {
    marginBottom: 25,
    position: 'relative',
  },
  headerContent: {
    zIndex: 2,
  },
  headerDecoration: {
    position: 'absolute',
    top: -10,
    left: -20,
    right: -20,
    height: 80,
    backgroundColor: '#E4D4FF', // Degradado más oscuro
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#4A2C8E', // Morado oscuro
    marginTop: 10,
  },
  babyName: {
    fontSize: 18,
    color: '#7E57C2', // Morado medio
    marginTop: 5,
    fontWeight: '500',
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
  statusCard: {
    backgroundColor: '#7E57C2', // Morado medio
  },
  alertsCard: {
    backgroundColor: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    paddingBottom: 10,
  },
  alertsCard: {
    backgroundColor: '#FFFFFF',
  },
  alertsCard: {
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#4A2C8E', // Morado oscuro para títulos en tarjetas blancas
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 10,
  },
  statusCard: {
    backgroundColor: '#7E57C2', // Morado medio
  },
  statusCard: {
    backgroundColor: '#7E57C2', // Morado medio
  },
  statusCard: {
    backgroundColor: '#7E57C2', // Morado medio
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.3)',
    paddingBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  statusContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  alertIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertIconWarning: {
    backgroundColor: '#FF5252', // Rojo suave
  },
  alertIconOk: {
    backgroundColor: '#66BB6A', // Verde suave
  },
  alertWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF5252',
  },
  alertOk: {
    borderLeftWidth: 4,
    borderLeftColor: '#66BB6A',
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    color: '#757575',
    fontSize: 15,
  },
  infoValue: {
    color: '#4A2C8E',
    fontSize: 15,
    fontWeight: '500',
  },
});