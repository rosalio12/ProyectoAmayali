import React, { useState, useEffect } from "react"
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native"

export default function ChartEnfermeroScreen({ userId }) {
  const [alertas, setAlertas] = useState(null)
  const [filtroNivel, setFiltroNivel] = useState("Todos")
  const [loadingCunas, setLoadingCunas] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [observacion, setObservacion] = useState("")
  const [alertaSeleccionada, setAlertaSeleccionada] = useState(null)

  const SQL_API_BASE = "http://192.168.0.223:3000"
  const MONGO_API_BASE = "http://192.168.0.223:5000"

  const fetchAlertsForEnfermero = async () => {
    if (!userId) {
      setLoadingCunas(false)
      setAlertas([])
      return
    }

    setLoadingCunas(true)
    setAlertas(null)

    try {
      const cunasSqlRes = await fetch(`${SQL_API_BASE}/api/cunas/enfermero/${userId}`)
      if (!cunasSqlRes.ok) {
        throw new Error("Error al obtener cunas")
      }
      const cunasSql = await cunasSqlRes.json()

      if (cunasSql.length === 0) {
        setAlertas([])
        setLoadingCunas(false)
        return
      }

      const cunasMongoIds = cunasSql.map((cuna) => {
        const cunaNum = String(cuna.idCuna).padStart(3, "0")
        return `CUNA${cunaNum}`
      })
      const cunasQueryParam = cunasMongoIds.join(",")

      const mongoAlertsRes = await fetch(`${MONGO_API_BASE}/alertas?cunas=${cunasQueryParam}`)
      if (!mongoAlertsRes.ok) {
        throw new Error("Error al obtener alertas")
      }
      const mongoAlertsData = await mongoAlertsRes.json()

      // Ordenar alertas: primero pendientes, luego resueltas, y ambas por fecha descendente
      const sortedAlerts = (mongoAlertsData.data || mongoAlertsData).sort((a, b) => {
        const estadoA = a.estado?.toLowerCase() || "pendiente"
        const estadoB = b.estado?.toLowerCase() || "pendiente"
        const dateA = new Date(a.timestamp)
        const dateB = new Date(b.timestamp)

        if (estadoA === "pendiente" && estadoB !== "pendiente") return -1
        if (estadoA !== "pendiente" && estadoB === "pendiente") return 1
        return dateB - dateA // Ordenar por fecha más reciente primero
      })

      setAlertas(sortedAlerts)
    } catch (err) {
      Alert.alert("Error", "No se pudieron cargar las alertas")
      setAlertas([])
    } finally {
      setLoadingCunas(false)
    }
  }

  // Modal para observación
  const abrirModal = (alerta) => {
    setAlertaSeleccionada(alerta)
    setObservacion("")
    setModalVisible(true)
  }
  const cerrarModal = () => {
    setModalVisible(false)
    setAlertaSeleccionada(null)
    setObservacion("")
  }

  // Marcar alerta como resuelta con observación y nombre real
  const resolverAlerta = async () => {
    if (!alertaSeleccionada) return
    try {
      let nombreEnfermero = "Enfermero"
      try {
        const resNombre = await fetch(`${SQL_API_BASE}/api/usuarios/${userId}/nombre`)
        if (resNombre.ok) {
          const dataNombre = await resNombre.json()
          if (dataNombre && dataNombre.nombre) {
            nombreEnfermero = dataNombre.nombre
          } else {
            Alert.alert("Error", "No se pudo obtener el nombre del enfermero. Se usará 'Enfermero'.")
          }
        } else {
          Alert.alert("Error", "No se pudo obtener el nombre del enfermero (respuesta no OK). Se usará 'Enfermero'.")
        }
      } catch (e) {
        Alert.alert("Error", "No se pudo obtener el nombre del enfermero (error de red). Se usará 'Enfermero'.")
      }

      // LOG para depuración
      console.log("[DEBUG] Valor de nombreEnfermero que se enviará a Mongo:", nombreEnfermero)

      // 2. Enviar el nombre y observación al backend de Mongo
      const res = await fetch(`${MONGO_API_BASE}/alertas/${alertaSeleccionada._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: "resuelta",
          atendidaPor: nombreEnfermero,
          observacion: observacion || "Sin observaciones",
        }),
      })
      if (!res.ok) throw new Error("No se pudo actualizar la alerta")
      cerrarModal()
      await fetchAlertsForEnfermero()
    } catch (err) {
      Alert.alert("Error", "No se pudo marcar la alerta como resuelta")
    }
  }

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await fetchAlertsForEnfermero()
    setRefreshing(false)
  }, [userId])

  useEffect(() => {
    fetchAlertsForEnfermero()
  }, [userId])

  const clasificaNivel = (al) => {
    const tipo = al.tipo.toLowerCase()
    if (
      tipo.includes("critica") ||
      (al.tipo.includes("Oxigenación baja") && al.valor <= 85) ||
      (al.tipo.includes("Frecuencia cardíaca anormal") && (al.valor > 160 || al.valor < 50))
    ) {
      return "🔴 Urgente"
    }
    if (
      tipo.includes("media") ||
      (al.tipo.includes("Oxigenación baja") && al.valor > 85 && al.valor <= 90) ||
      (al.tipo.includes("Frecuencia cardíaca anormal") &&
        ((al.valor > 150 && al.valor <= 160) || (al.valor >= 50 && al.valor < 60)))
    ) {
      return "🟡 Revisar"
    }
    return "🟢 Normal"
  }

  const getAlertColors = (nivel) => {
    switch (nivel) {
      case "🔴 Urgente":
        return { bg: "#fdf2f8", border: "#f9a8d4", text: "#be185d", icon: "#ec4899" }
      case "🟡 Revisar":
        return { bg: "#fefce8", border: "#fde047", text: "#a16207", icon: "#eab308" }
      default:
        return { bg: "#f3f4f6", border: "#d1d5db", text: "#374151", icon: "#6b7280" }
    }
  }

  if (loadingCunas || alertas === null) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Cargando alertas...</Text>
        </View>
      </>
    )
  }

  // Solo mostrar alertas pendientes y aplicar filtro de nivel
  let filtradas = alertas
    ? alertas.filter(al => (al.estado?.toLowerCase() === "pendiente" || !al.estado))
    : []
  if (filtroNivel !== "Todos") {
    filtradas = filtradas.filter((al) => clasificaNivel(al) === filtroNivel)
  }

  // Estadísticas simples
  const stats = {
    urgentes: filtradas.filter((al) => clasificaNivel(al) === "🔴 Urgente").length,
    revisar: filtradas.filter((al) => clasificaNivel(al) === "🟡 Revisar").length,
    normales: filtradas.filter((al) => clasificaNivel(al) === "🟢 Normal").length,
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#7c3aed" />
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#7c3aed"]} />}
      >
        {/* Header Simple */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}> Alertas del Turno</Text>
          <Text style={styles.headerSubtitle}>Monitoreo en tiempo real</Text>
        </View>

        {/* Resumen Visual Simple */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.urgentCard]}>
            <Text style={styles.summaryNumber}>{stats.urgentes}</Text>
            <Text style={styles.summaryLabel}>🔴 Urgentes</Text>
          </View>

          <View style={[styles.summaryCard, styles.reviewCard]}>
            <Text style={styles.summaryNumber}>{stats.revisar}</Text>
            <Text style={styles.summaryLabel}>🟡 Revisar</Text>
          </View>

          <View style={[styles.summaryCard, styles.normalCard]}>
            <Text style={styles.summaryNumber}>{stats.normales}</Text>
            <Text style={styles.summaryLabel}>🟢 Normales</Text>
          </View>
        </View>

        {/* Filtros Simples */}
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Ver:</Text>
          <View style={styles.filterButtons}>
            {["Todos", "🔴 Urgente", "🟡 Revisar", "🟢 Normal"].map((nivel) => (
              <TouchableOpacity
                key={nivel}
                style={[styles.filterButton, filtroNivel === nivel && styles.filterButtonActive]}
                onPress={() => setFiltroNivel(nivel)}
              >
                <Text style={[styles.filterButtonText, filtroNivel === nivel && styles.filterButtonTextActive]}>
                  {nivel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Lista de Alertas Simplificada */}
        <View style={styles.alertsContainer}>
          <Text style={styles.alertsTitle}>
            {filtradas.length === 0
              ? "✅ Todo bajo control"
              : `${filtradas.length} ${filtradas.length === 1 ? "alerta" : "alertas"}`}
          </Text>

          {filtradas.length === 0 ? (
            <View style={styles.noAlertsContainer}>
              <Text style={styles.noAlertsText}>No hay alertas para este filtro</Text>
              <Text style={styles.noAlertsSubtext}>Todos los pacientes están estables</Text>
            </View>
          ) : (
            filtradas.map((al, idx) => {
              const nivel = clasificaNivel(al)
              const colors = getAlertColors(nivel)

              return (
                <View
                  key={al._id || idx}
                  style={[styles.alertCard, { backgroundColor: colors.bg, borderLeftColor: colors.icon }]}
                >
                  <View style={styles.alertHeader}>
                    <Text style={[styles.alertLevel, { color: colors.text }]}>{nivel}</Text>
                    <Text style={styles.alertTime}>
                      {new Date(al.timestamp).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>

                  <Text style={styles.alertMessage}>{al.tipo}</Text>

                  <View style={styles.alertFooter}>
                    <Text style={styles.alertCuna}>📍 {al.cunaId}</Text>
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#7c3aed",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        marginLeft: "auto",
                      }}
                      onPress={() => abrirModal(al)}
                    >
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>Marcar resuelta</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>
      {/* Modal para observación */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={cerrarModal}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.container}>
            <Text style={modalStyles.title}>Observación al resolver alerta</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Describe cómo resolviste la alerta o escribe 'Sin observaciones'"
              value={observacion}
              onChangeText={setObservacion}
              multiline
            />
            <View style={modalStyles.buttonContainer}>
              <TouchableOpacity style={modalStyles.cancelButton} onPress={cerrarModal}>
                <Text style={modalStyles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.confirmButton} onPress={resolverAlerta}>
                <Text style={modalStyles.buttonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: "#7c3aed",
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#7c3aed",
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#e9d5ff",
  },
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  urgentCard: {
    borderLeftColor: "#ec4899",
  },
  reviewCard: {
    borderLeftColor: "#eab308",
  },
  normalCard: {
    borderLeftColor: "#6b7280",
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
    textAlign: "center",
  },
  filtersContainer: {
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  filterButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#e5e7eb",
  },
  filterButtonActive: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  alertsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  alertsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  noAlertsContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noAlertsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#059669",
    marginBottom: 8,
  },
  noAlertsSubtext: {
    fontSize: 14,
    color: "#6b7280",
  },
  alertCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  alertLevel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  alertTime: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  alertMessage: {
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 12,
    lineHeight: 22,
  },
  alertFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertCuna: {
    fontSize: 14,
    color: "#7c3aed",
    fontWeight: "600",
  },
  alertValue: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
})

// Estilos para el modal
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    width: '100%',
    marginBottom: 20,
    backgroundColor: '#f9fafb',
    fontSize: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  confirmButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
