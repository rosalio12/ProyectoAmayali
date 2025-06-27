import React from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';

export default function ChartScreen() {
  // Datos de crecimiento (peso en kg)
  const weightData = [
    { value: 3.2, label: 'Nac', date: '01 Ene', customDataPoint: () => (
      <View style={styles.customDataPoint}>
        <Ionicons name="body" size={16} color="#e74c3c" />
      </View>
    )},
    { value: 4.1, label: '1m', date: '01 Feb' },
    { value: 5.0, label: '2m', date: '01 Mar' },
    { value: 5.8, label: '3m', date: '01 Abr' },
    { value: 6.5, label: '4m', date: '01 May' },
    { value: 7.1, label: '5m', date: '01 Jun' },
    { value: 7.6, label: '6m', date: '01 Jul' },
  ];

  // Datos de alertas por mes
  const alertData = [
    { value: 2, label: 'Ene', frontColor: '#f39c12' },
    { value: 1, label: 'Feb', frontColor: '#2ecc71' },
    { value: 3, label: 'Mar', frontColor: '#e74c3c' },
    { value: 0, label: 'Abr', frontColor: '#2ecc71' },
    { value: 1, label: 'May', frontColor: '#f39c12' },
    { value: 0, label: 'Jun', frontColor: '#2ecc71' },
  ];

  // Datos de temperatura promedio
  const temperatureData = [
    { value: 36.5, label: 'Lun' },
    { value: 36.7, label: 'Mar' },
    { value: 36.8, label: 'Mié' },
    { value: 36.6, label: 'Jue' },
    { value: 36.9, label: 'Vie' },
    { value: 37.0, label: 'Sáb' },
    { value: 36.8, label: 'Dom' },
  ];

  const [activeTab, setActiveTab] = React.useState('growth');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.screenTitle}>Monitoreo del Bebé</Text>
      
      {/* Selector de pestañas */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'growth' && styles.activeTab]}
          onPress={() => setActiveTab('growth')}
        >
          <Text style={styles.tabText}>Crecimiento</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'alerts' && styles.activeTab]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={styles.tabText}>Alertas</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'health' && styles.activeTab]}
          onPress={() => setActiveTab('health')}
        >
          <Text style={styles.tabText}>Salud</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'growth' && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Evolución del Peso</Text>
          <LineChart
            data={weightData}
            color="#3498db"
            thickness={3}
            curved
            isAnimated
            animateOnDataChange
            animationDuration={1200}
            startFillColor="#3498db"
            endFillColor="#EBF5FB"
            startOpacity={0.8}
            endOpacity={0.1}
            spacing={50}
            initialSpacing={10}
            yAxisColor="#bdc3c7"
            xAxisColor="#bdc3c7"
            yAxisThickness={0.5}
            xAxisThickness={0.5}
            rulesColor="#ecf0f1"
            rulesType="solid"
            yAxisTextStyle={{ color: '#7f8c8d' }}
            xAxisLabelTextStyle={{ color: '#7f8c8d', width: 60 }}
            pointerConfig={{
              pointerStripHeight: 160,
              pointerStripColor: 'lightgray',
              pointerStripWidth: 1,
              pointerColor: '#3498db',
              radius: 6,
              pointerLabelWidth: 80,
              pointerLabelHeight: 40,
              pointerLabelComponent: (items) => {
                return (
                  <View style={styles.pointerLabel}>
                    <Text style={styles.pointerText}>{items[0].date}</Text>
                    <Text style={styles.pointerValue}>{items[0].value} kg</Text>
                  </View>
                );
              },
            }}
          />
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#3498db' }]} />
              <Text style={styles.legendText}>Peso (kg)</Text>
            </View>
          </View>
        </View>
      )}

      {activeTab === 'alerts' && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Alertas Mensuales</Text>
          <BarChart
            data={alertData}
            barWidth={22}
            spacing={40}
            roundedTop
            roundedBottom={false}
            frontColor="lightgray"
            yAxisThickness={0.5}
            xAxisThickness={0.5}
            yAxisTextStyle={{ color: '#7f8c8d' }}
            xAxisLabelTextStyle={{ color: '#7f8c8d' }}
            noOfSections={3}
            maxValue={4}
            renderTooltip={(item) => (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>{item.value} alerta{item.value !== 1 ? 's' : ''}</Text>
              </View>
            )}
          />
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#e74c3c' }]} />
              <Text style={styles.legendText}>Críticas</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#f39c12' }]} />
              <Text style={styles.legendText}>Advertencias</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#2ecc71' }]} />
              <Text style={styles.legendText}>Normales</Text>
            </View>
          </View>
        </View>
      )}

      {activeTab === 'health' && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Temperatura Semanal</Text>
          <LineChart
            data={temperatureData}
            color="#e74c3c"
            thickness={3}
            isAnimated
            yAxisOffset={36}
            yAxisSuffix="°C"
            spacing={40}
            initialSpacing={10}
            yAxisColor="#bdc3c7"
            xAxisColor="#bdc3c7"
            yAxisThickness={0.5}
            xAxisThickness={0.5}
            rulesColor="#ecf0f1"
            yAxisTextStyle={{ color: '#7f8c8d' }}
            xAxisLabelTextStyle={{ color: '#7f8c8d' }}
            dataPointsColor="#e74c3c"
            dataPointsRadius={6}
            pointerConfig={{
              pointerStripHeight: 140,
              pointerStripColor: 'lightgray',
              pointerStripWidth: 1,
              pointerColor: '#e74c3c',
              radius: 6,
              pointerLabelWidth: 80,
              pointerLabelHeight: 40,
              pointerLabelComponent: (items) => {
                return (
                  <View style={styles.pointerLabel}>
                    <Text style={styles.pointerText}>{items[0].label}</Text>
                    <Text style={styles.pointerValue}>{items[0].value}°C</Text>
                  </View>
                );
              },
            }}
          />
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#e74c3c' }]} />
              <Text style={styles.legendText}>Temperatura</Text>
            </View>
          </View>
          <View style={styles.referenceLine}>
            <Text style={styles.referenceText}>Rango normal: 36.5°C - 37.5°C</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 5,
    elevation: 2,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#3498db',
  },
  tabText: {
    color: '#7f8c8d',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  pointerLabel: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ecf0f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pointerText: {
    fontSize: 10,
    color: '#7f8c8d',
  },
  pointerValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  tooltip: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 12,
  },
  referenceLine: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#EBF5FB',
    borderRadius: 6,
    alignSelf: 'center',
  },
  referenceText: {
    color: '#3498db',
    fontSize: 12,
    fontWeight: '500',
  },
  customDataPoint: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
});