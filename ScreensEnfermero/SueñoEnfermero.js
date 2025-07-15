import { useState } from "react"
import { View, StyleSheet, Text, ScrollView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LineChart } from "react-native-gifted-charts"
import { Picker } from "@react-native-picker/picker"

export default function SueñoEnfermeroScreen() {
  const [selectedCuna, setSelectedCuna] = useState("CUNA001")

  const cunasInfo = {
    CUNA001: { babyName: "Emma García" },
    CUNA002: { babyName: "Diego López" },
    CUNA003: { babyName: "Sofia Martínez" },
  }

  const sleepData = {
    CUNA001: [
      { day: "Lun", hours: 14.5, naps: 4 },
      { day: "Mar", hours: 15.2, naps: 5 },
      { day: "Mié", hours: 13.8, naps: 3 },
      { day: "Jue", hours: 14.1, naps: 4 },
      { day: "Vie", hours: 15.0, naps: 5 },
      { day: "Sáb", hours: 14.3, naps: 4 },
      { day: "Dom", hours: 14.7, naps: 4 },
    ],
    CUNA002: [
      { day: "Lun", hours: 13.2, naps: 3 },
      { day: "Mar", hours: 14.1, naps: 4 },
      { day: "Mié", hours: 13.5, naps: 3 },
      { day: "Jue", hours: 14.8, naps: 5 },
      { day: "Vie", hours: 13.9, naps: 4 },
      { day: "Sáb", hours: 14.2, naps: 4 },
      { day: "Dom", hours: 13.7, naps: 3 },
    ],
    CUNA003: [
      { day: "Lun", hours: 15.8, naps: 6 },
      { day: "Mar", hours: 16.2, naps: 7 },
      { day: "Mié", hours: 15.1, naps: 5 },
      { day: "Jue", hours: 15.9, naps: 6 },
      { day: "Vie", hours: 16.0, naps: 6 },
      { day: "Sáb", hours: 15.5, naps: 5 },
      { day: "Dom", hours: 15.7, naps: 6 },
    ],
  }

  const lastSleep = {
    CUNA001: {
      start: "21:30",
      end: "07:15",
      duration: "9h 45m",
      quality: "Buena",
    },
    CUNA002: {
      start: "22:00",
      end: "06:45",
      duration: "8h 45m",
      quality: "Regular",
    },
    CUNA003: {
      start: "20:45",
      end: "07:30",
      duration: "10h 45m",
      quality: "Excelente",
    },
  }

  const currentSleepData = sleepData[selectedCuna] || []
  const currentLastSleep = lastSleep[selectedCuna] || {}

  const chartData = currentSleepData.map((item) => ({
    value: item.hours,
    label: item.day,
    date: `${item.hours}h`,
  }))

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.screenTitle}>Patrones de Sueño</Text>

      {/* Selector de Cuna */}
      <View style={styles.cunaSelector}>
        <Text style={styles.selectorLabel}>Seleccionar Cuna:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCuna}
            onValueChange={(itemValue) => setSelectedCuna(itemValue)}
            style={styles.picker}
          >
            {Object.keys(cunasInfo).map((cunaId) => (
              <Picker.Item key={cunaId} label={`${cunaId} - ${cunasInfo[cunaId].babyName}`} value={cunaId} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Resumen actual */}
      <View style={styles.currentSleepCard}>
        <Text style={styles.currentTitle}>Último Período - {cunasInfo[selectedCuna].babyName}</Text>
        <View style={styles.currentDetails}>
          <View style={styles.currentItem}>
            <Ionicons name="moon" size={20} color="#3498db" />
            <Text style={styles.currentLabel}>Inicio: {currentLastSleep.start}</Text>
          </View>
          <View style={styles.currentItem}>
            <Ionicons name="sunny" size={20} color="#f39c12" />
            <Text style={styles.currentLabel}>Fin: {currentLastSleep.end}</Text>
          </View>
          <View style={styles.currentItem}>
            <Ionicons name="time" size={20} color="#9b59b6" />
            <Text style={styles.currentLabel}>Duración: {currentLastSleep.duration}</Text>
          </View>
          <View style={styles.currentItem}>
            <Ionicons name="star" size={20} color="#2ecc71" />
            <Text style={styles.currentLabel}>Calidad: {currentLastSleep.quality}</Text>
          </View>
        </View>
      </View>

      {/* Gráfico de horas de sueño */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Horas de sueño por día</Text>
        <LineChart
          data={chartData}
          color="#3498db"
          thickness={3}
          isAnimated
          yAxisOffset={12}
          yAxisSuffix="h"
          spacing={40}
          initialSpacing={10}
          yAxisColor="#bdc3c7"
          xAxisColor="#bdc3c7"
          yAxisThickness={0.5}
          xAxisThickness={0.5}
          rulesColor="#ecf0f1"
          yAxisTextStyle={{ color: "#7f8c8d" }}
          xAxisLabelTextStyle={{ color: "#7f8c8d" }}
          dataPointsColor="#3498db"
          dataPointsRadius={6}
          pointerConfig={{
            pointerStripHeight: 140,
            pointerStripColor: "lightgray",
            pointerStripWidth: 1,
            pointerColor: "#3498db",
            radius: 6,
            pointerLabelWidth: 80,
            pointerLabelHeight: 40,
            pointerLabelComponent: (items) => (
              <View style={styles.pointerLabel}>
                <Text style={styles.pointerText}>{items[0].label}</Text>
                <Text style={styles.pointerValue}>{items[0].date}</Text>
              </View>
            ),
          }}
        />
        <View style={styles.referenceLine}>
          <Text style={styles.referenceText}>Promedio recomendado: 14-17 horas/día (0-3 meses)</Text>
        </View>
      </View>

      {/* Estadísticas */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Estadísticas Semanales</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.min(...currentSleepData.map((d) => d.hours)).toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Mínimo</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Math.max(...currentSleepData.map((d) => d.hours)).toFixed(1)}h</Text>
            <Text style={styles.statLabel}>Máximo</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {(currentSleepData.reduce((a, b) => a + b.hours, 0) / currentSleepData.length).toFixed(1)}h
            </Text>
            <Text style={styles.statLabel}>Promedio</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {(currentSleepData.reduce((a, b) => a + b.naps, 0) / currentSleepData.length).toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Siestas/día</Text>
          </View>
        </View>
      </View>

      {/* Consejos */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Consejos para Mejorar el Sueño</Text>
        <View style={styles.tipItem}>
          <Ionicons name="bulb" size={16} color="#f39c12" />
          <Text style={styles.tipText}>Mantén horarios consistentes para dormir</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="bulb" size={16} color="#f39c12" />
          <Text style={styles.tipText}>Crea una rutina relajante antes de dormir</Text>
        </View>
        <View style={styles.tipItem}>
          <Ionicons name="bulb" size={16} color="#f39c12" />
          <Text style={styles.tipText}>Evita sobreestimulación antes de dormir</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 20,
    textAlign: "center",
  },
  cunaSelector: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A2C8E",
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  picker: {
    height: 50,
  },
  currentSleepCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  currentTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 15,
    textAlign: "center",
  },
  currentDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  currentItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  currentLabel: {
    fontSize: 14,
    color: "#2c3e50",
    marginLeft: 10,
  },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 15,
    textAlign: "center",
  },
  referenceLine: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#EBF5FB",
    borderRadius: 6,
    alignSelf: "center",
  },
  referenceText: {
    color: "#3498db",
    fontSize: 12,
    fontWeight: "500",
  },
  pointerLabel: {
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ecf0f1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pointerText: {
    fontSize: 10,
    color: "#7f8c8d",
  },
  pointerValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 15,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    width: "48%",
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#3498db",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: "#7f8c8d",
  },
  tipsCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 15,
    textAlign: "center",
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#2c3e50",
    marginLeft: 10,
  },
})
