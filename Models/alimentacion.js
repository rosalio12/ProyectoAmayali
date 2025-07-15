import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';

const feedingData = [
  { time: '08:00', amount: 120, type: 'Leche materna', duration: 15 },
  { time: '11:30', amount: 90, type: 'Fórmula', duration: 10 },
  { time: '15:00', amount: 110, type: 'Leche materna', duration: 12 },
  { time: '18:30', amount: 100, type: 'Leche materna', duration: 14 },
];
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

const chartData = feedingData.map((item, index) => ({
  value: item.amount,
  label: item.time,
  frontColor: item.type === 'Leche materna' ? '#3498db' : '#9b59b6',
}));

export default function alimentacionScreen() {
  const [activeTab, setActiveTab] = useState('today');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.screenTitle}>Alimentación</Text>
      
      {/* Selector de período */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'today' && styles.activeTab]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={styles.tabText}>Hoy</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'week' && styles.activeTab]}
          onPress={() => setActiveTab('week')}
        >
          <Text style={styles.tabText}>Semana</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'month' && styles.activeTab]}
          onPress={() => setActiveTab('month')}
        >
          <Text style={styles.tabText}>Mes</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total hoy</Text>
          <Text style={styles.summaryValue}>420 ml</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Próxima toma</Text>
          <Text style={styles.summaryValue}>21:30</Text>
        </View>
      </View>

      {/* Gráfico */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Consumo por toma</Text>
        <BarChart
          data={chartData}
          barWidth={22}
          spacing={30}
          roundedTop
          yAxisTextStyle={{ color: '#7f8c8d' }}
          xAxisLabelTextStyle={{ color: '#7f8c8d' }}
          noOfSections={4}
          maxValue={150}
          showReferenceLine1
          referenceLine1Position={100}
          referenceLine1Config={{ color: '#f39c12', dashWidth: 2 }}
        />
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#3498db' }]} />
            <Text style={styles.legendText}>Materna</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#9b59b6' }]} />
            <Text style={styles.legendText}>Fórmula</Text>
          </View>
        </View>
      </View>

      {/* Historial de tomas */}
      <View style={styles.historyCard}>
        <Text style={styles.historyTitle}>Registro de Toma</Text>
        {feedingData.map((item, index) => (
          <View key={index} style={styles.feedingItem}>
            <View style={styles.feedingTime}>
              <Text style={styles.timeText}>{item.time}</Text>
              <Text style={styles.typeText}>{item.type}</Text>
            </View>
            <View style={styles.feedingDetails}>
              <Text style={styles.amountText}>{item.amount} ml</Text>
              <Text style={styles.durationText}>{item.duration} min</Text>
            </View>
          </View>
        ))}
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
      {/* Botón para añadir toma */}
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Registrar Toma</Text>
      </TouchableOpacity>
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
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
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
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  feedingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  feedingTime: {},
  timeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  typeText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  feedingDetails: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
  },
  durationText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
});