import { StatusBar } from "expo-status-bar"
import { StyleSheet, Text, View, Button, TouchableOpacity, ScrollView } from "react-native"
import { CameraView, useCameraPermissions } from "expo-camera"
import { useState } from "react"
import { Ionicons } from "@expo/vector-icons"

export default function DeviceEnfermeroScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [showConnectButton, setShowConnectButton] = useState(false)
  const [connectedCunas, setConnectedCunas] = useState([
    { id: "CUNA001", babyName: "Emma García", status: "Conectada", lastUpdate: "2 min ago" },
    { id: "CUNA002", babyName: "Diego López", status: "Conectada", lastUpdate: "1 min ago" },
    { id: "CUNA003", babyName: "Sofia Martínez", status: "Desconectada", lastUpdate: "15 min ago" },
  ])
  const [showScanner, setShowScanner] = useState(false)

  if (!permission) {
    return <View />
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Se necesita permiso para usar la cámara</Text>
        <Button onPress={requestPermission} title="Conceder permiso" />
      </View>
    )
  }

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true)
    setShowConnectButton(true)
  }

  const handleConnectPress = () => {
    alert("Conectando nueva cuna...")
    setShowConnectButton(false)
    setScanned(false)
    setShowScanner(false)

    // Simular conexión de nueva cuna
    const newCuna = {
      id: `CUNA00${connectedCunas.length + 1}`,
      babyName: "Nuevo Bebé",
      status: "Conectada",
      lastUpdate: "ahora",
    }
    setConnectedCunas([...connectedCunas, newCuna])
  }

  const toggleCunaStatus = (cunaId) => {
    setConnectedCunas((prev) =>
      prev.map((cuna) =>
        cuna.id === cunaId ? { ...cuna, status: cuna.status === "Conectada" ? "Desconectada" : "Conectada" } : cuna,
      ),
    )
  }

  if (showScanner) {
    return (
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.backButton} onPress={() => setShowScanner(false)}>
              <Ionicons name="arrow-back" size={24} color="white" />
              <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>

            <View style={styles.scanFrame} />
            <Text style={styles.scanText}>Escanee el código QR de la nueva cuna</Text>

            {showConnectButton && (
              <TouchableOpacity style={styles.connectButton} onPress={handleConnectPress}>
                <Text style={styles.connectButtonText}>Conectar nueva cuna</Text>
              </TouchableOpacity>
            )}
          </View>
        </CameraView>
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.screenTitle}>Gestión de Dispositivos</Text>

      {/* Header con información del enfermero */}
      <View style={styles.nurseHeader}>
        <Ionicons name="person-circle" size={40} color="#7E57C2" />
        <View style={styles.nurseInfo}>
          <Text style={styles.nurseName}>Dr. Juan Pérez</Text>
          <Text style={styles.nurseRole}>Enfermero Jefe - Neonatología</Text>
        </View>
      </View>

      {/* Resumen de cunas */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen de Cunas Asignadas</Text>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{connectedCunas.filter((c) => c.status === "Conectada").length}</Text>
            <Text style={styles.statLabel}>Conectadas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{connectedCunas.filter((c) => c.status === "Desconectada").length}</Text>
            <Text style={styles.statLabel}>Desconectadas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{connectedCunas.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Lista de cunas conectadas */}
      <View style={styles.cunasSection}>
        <Text style={styles.sectionTitle}>Cunas Asignadas</Text>
        {connectedCunas.map((cuna, index) => (
          <View key={cuna.id} style={styles.cunaCard}>
            <View style={styles.cunaHeader}>
              <View style={styles.cunaInfo}>
                <Text style={styles.cunaId}>{cuna.id}</Text>
                <Text style={styles.babyName}>{cuna.babyName}</Text>
              </View>
              <View style={styles.cunaStatus}>
                <View
                  style={[
                    styles.statusIndicator,
                    cuna.status === "Conectada" ? styles.statusConnected : styles.statusDisconnected,
                  ]}
                >
                  <Text style={styles.statusText}>{cuna.status}</Text>
                </View>
              </View>
            </View>

            <View style={styles.cunaDetails}>
              <Text style={styles.lastUpdate}>Última actualización: {cuna.lastUpdate}</Text>
              <View style={styles.cunaActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => toggleCunaStatus(cuna.id)}>
                  <Ionicons name={cuna.status === "Conectada" ? "pause" : "play"} size={16} color="#7E57C2" />
                  <Text style={styles.actionButtonText}>
                    {cuna.status === "Conectada" ? "Desconectar" : "Reconectar"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="settings" size={16} color="#7E57C2" />
                  <Text style={styles.actionButtonText}>Configurar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Botón para añadir nueva cuna */}
      <TouchableOpacity style={styles.addCunaButton} onPress={() => setShowScanner(true)}>
        <Ionicons name="add-circle" size={24} color="white" />
        <Text style={styles.addCunaButtonText}>Conectar Nueva Cuna</Text>
      </TouchableOpacity>

      {/* Información adicional */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Instrucciones</Text>
        <View style={styles.infoItem}>
          <Ionicons name="qr-code" size={20} color="#7E57C2" />
          <Text style={styles.infoText}>Escanea el código QR en la cuna para conectarla</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="wifi" size={20} color="#7E57C2" />
          <Text style={styles.infoText}>Asegúrate de que la cuna esté conectada a WiFi</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="shield-checkmark" size={20} color="#7E57C2" />
          <Text style={styles.infoText}>Todas las conexiones están encriptadas</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F5FF",
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4A2C8E",
    marginBottom: 20,
    textAlign: "center",
    paddingTop: 20,
    paddingHorizontal: 15,
  },
  nurseHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    margin: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
  },
  nurseInfo: {
    marginLeft: 15,
    flex: 1,
  },
  nurseName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4A2C8E",
  },
  nurseRole: {
    fontSize: 14,
    color: "#7E57C2",
  },
  summaryCard: {
    backgroundColor: "white",
    margin: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A2C8E",
    marginBottom: 15,
    textAlign: "center",
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#7E57C2",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
  },
  cunasSection: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4A2C8E",
    marginBottom: 15,
  },
  cunaCard: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  cunaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cunaInfo: {
    flex: 1,
  },
  cunaId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A2C8E",
  },
  babyName: {
    fontSize: 14,
    color: "#666",
  },
  cunaStatus: {
    alignItems: "flex-end",
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusConnected: {
    backgroundColor: "#2ecc71",
  },
  statusDisconnected: {
    backgroundColor: "#e74c3c",
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  cunaDetails: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
  lastUpdate: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
  cunaActions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#F0EBFF",
    borderRadius: 20,
  },
  actionButtonText: {
    marginLeft: 5,
    color: "#7E57C2",
    fontSize: 12,
    fontWeight: "500",
  },
  addCunaButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#7E57C2",
    margin: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 3,
  },
  addCunaButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 10,
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: "white",
    margin: 15,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    marginBottom: 30,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A2C8E",
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 10,
    color: "#666",
    flex: 1,
  },
  // Estilos del escáner
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backButtonText: {
    color: "white",
    marginLeft: 5,
    fontWeight: "500",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  scanText: {
    fontSize: 16,
    color: "white",
    marginTop: 20,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 5,
  },
  connectButton: {
    marginTop: 30,
    backgroundColor: "#4CAF50",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
  },
  connectButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
    margin: 20,
  },
})
