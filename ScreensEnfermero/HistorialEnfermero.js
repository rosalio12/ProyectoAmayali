import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Asegúrate de tener esto

// Asegúrate de que esta URL base sea correcta para tu backend
const API_BASE_URL = 'http://localhost:3000';

export default function HistoryEnfermeroScreen({ userId }) {
    const navigation = useNavigation();
    const [bebes, setBebes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Función para navegar a los detalles, pasando el id del bebé
    const verDetallesBebe = (idBebe, nombreBebe) => {
        navigation.navigate('DetallesBebeEnfermero', { idBebe, idUsuarioEnfermero: userId, nombreBebe });
    };

    useEffect(() => {
        const cargarHistorial = async () => {
            if (!userId) {
                setError("ID de usuario no disponible. Inicie sesión nuevamente.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                // CAMBIO AQUÍ: Usamos el nuevo endpoint
                const response = await fetch(`${API_BASE_URL}/api/enfermero/historial-bebes-completo/${userId}`);

                if (!response.ok) {
                    const errorText = await response.text(); // Intenta leer el mensaje de error del servidor
                    throw new Error(`Error ${response.status}: ${errorText || 'Error desconocido al consultar historial'}`);
                }

                const data = await response.json();
                console.log('Datos recibidos de la API (Historial Enfermero):', data); // Para depuración

                if (data.length === 0) {
                    setBebes([]); // Asegúrate de que sea un array vacío
                    Alert.alert("Información", "No se encontraron bebés en tu historial.");
                } else {
                    // Mapear los datos para adaptarlos a tu estructura, si es necesario
                    // Si la API ya devuelve el formato deseado, esta parte puede ser más simple
                    const bebesMapeados = data.map(item => ({
                        id: item.idBebe, // Asumiendo que `idBebe` es el ID único
                        nombre: item.BebeNombre,
                        apellidos: item.BebeApellidos,
                        sexo: item.BebeSexo,
                        peso: item.BebePeso,
                        fechaNacimiento: item.BebeFechaNacimiento,
                        idCuna: item.idCuna,
                        observaciones: item.ObservacionesMedicas || 'Sin observaciones',
                        vacunas: item.Vacunas || 'Sin vacunas',
                        fechaVisita: item.FechaVisitaMedica || 'N/A',
                        contactoNombre: item.ContactoEmergenciaNombre || 'N/A',
                        contactoTelefono: item.ContactoEmergenciaTelefono || 'N/A',
                        contactoRelacion: item.ContactoEmergenciaRelacion || 'N/A',
                        // Agrega cualquier otro campo que necesites del historial completo
                    }));
                    setBebes(bebesMapeados);
                }
            } catch (err) {
                console.error('HistoryEnfermeroScreen: Error cargando historial:', err);
                setError(`Error al cargar historial: ${err.message}`);
                Alert.alert("Error", `No se pudo cargar el historial: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        if (userId) { // Asegura que la función solo se ejecute si hay un userId
            cargarHistorial();
        }
    }, [userId]); // Dependencia en userId para recargar si cambia

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text>Cargando historial...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error: {error}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.goBackText}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Historial de Bebés</Text>
            {bebes.length === 0 ? (
                <Text style={styles.noDataText}>No se encontraron bebés en tu historial.</Text>
            ) : (
                <FlatList
                    data={bebes}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.bebeCard}
                            onPress={() => verDetallesBebe(item.id, item.nombre)}
                        >
                            <Text style={styles.bebeName}>{item.nombre} {item.apellidos}</Text>
                            <Text>Sexo: {item.sexo}</Text>
                            <Text>Peso: {item.peso} kg</Text>
                            <Text>Fecha de Nacimiento: {new Date(item.fechaNacimiento).toLocaleDateString()}</Text>
                            <Text>Cuna: {item.idCuna}</Text>
                            <Text style={styles.detailsHeader}>Último Historial:</Text>
                            <Text>Observaciones: {item.observaciones}</Text>
                            <Text>Vacunas: {item.vacunas}</Text>
                            <Text>Fecha Visita: {item.fechaVisita === 'N/A' ? 'N/A' : new Date(item.fechaVisita).toLocaleDateString()}</Text>
                            <Text style={styles.detailsHeader}>Contacto de Emergencia:</Text>
                            <Text>Nombre: {item.contactoNombre}</Text>
                            <Text>Teléfono: {item.contactoTelefono}</Text>
                            <Text>Relación: {item.contactoRelacion}</Text>
                            <Text style={styles.viewDetailsText}>Ver más detalles...</Text>
                        </TouchableOpacity>
                    )}
                />
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        marginBottom: 10,
    },
    goBackText: {
        color: 'blue',
        textDecorationLine: 'underline',
    },
    header: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    noDataText: {
        fontSize: 18,
        textAlign: 'center',
        marginTop: 50,
        color: '#777',
    },
    bebeCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    bebeName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#007bff', // Un color vibrante para el nombre
    },
    detailsHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
        color: '#555',
    },
    viewDetailsText: {
        marginTop: 10,
        color: '#007bff',
        fontWeight: 'bold',
        textAlign: 'right',
    },
});