import React, { useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    Text,
    ScrollView,
    TouchableOpacity,
    Linking,
    TextInput,
    Alert,
    Modal,      // ✅ Importamos el componente Modal
    Pressable,  // ✅ Usamos Pressable para mejor feedback al tocar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EmergenciaScreen({ userId }) {
    const [contacts, setContacts] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false); // ✅ Estado para controlar el modal

    // Estados para el formulario, agrupados en un objeto para mayor limpieza
    const [newContact, setNewContact] = useState({
        nombre: '',
        apellido: '',
        telefono: '',
        correo: '',
        relacion: '',
    });

    const fetchContacts = () => {
        if (!userId || userId === 'usuario_desconocido') {
            console.warn("No se encontró un ID de usuario válido para cargar contactos.");
            setContacts([]);
            return;
        }
        // Usamos una IP local genérica, asegúrate de que sea la correcta para tu red
        fetch(`http://172.18.2.158:3000/api/contactos-emergencia/${userId}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                const formatted = data.map(c => ({
                    id: c.idContacto, // Es buena práctica usar un id único
                    name: `${c.Nombre} ${c.Apellido}`,
                    number: c.Telefono, // Guardamos solo el número
                    relation: c.Relacion,
                }));
                setContacts(formatted);
            })
            .catch(error => {
                console.error("Error al cargar contactos:", error);
                Alert.alert('Error', 'No se pudieron cargar los contactos. Revisa tu conexión.');
            });
    };

    useEffect(() => {
        fetchContacts();
    }, [userId]);

    const handleCall = (number) => {
        Linking.openURL(`tel:${number}`);
    };

    const handleSendLocation = () => {
        const message = encodeURIComponent(`🚨 ¡Necesito ayuda urgente! Esta es mi ubicación aproximada.`);
        // Abre WhatsApp para enviar el mensaje a cualquier contacto
        Linking.openURL(`https://wa.me/?text=${message}`);
    };
    
    // ✅ Limpia el formulario y abre el modal
    const openAddContactModal = () => {
        setNewContact({ nombre: '', apellido: '', telefono: '', correo: '', relacion: '' });
        setIsModalVisible(true);
    };

    const handleAddContact = async () => {
        if (!newContact.nombre || !newContact.telefono) {
            Alert.alert('Campos incompletos', 'El nombre y el teléfono son obligatorios.');
            return;
        }

        try {
            const response = await fetch('http://192.168.1.100:3000/api/contactos-emergencia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idUsuario: userId,
                    Nombre: newContact.nombre,
                    Apellido: newContact.apellido,
                    Telefono: newContact.telefono,
                    Correo: newContact.correo,
                    Relacion: newContact.relacion,
                }),
            });

            if (response.ok) {
                Alert.alert('¡Éxito!', 'El contacto ha sido agregado.');
                setIsModalVisible(false); // ✅ Cierra el modal
                fetchContacts(); // Recarga la lista de contactos
            } else {
                const errorData = await response.json();
                Alert.alert('Error', `No se pudo agregar el contacto: ${errorData.message || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error("Error al agregar contacto:", error);
            Alert.alert('Error de Red', 'No se pudo conectar con el servidor.');
        }
    };
    
    // Función para actualizar el estado del formulario de manera genérica
    const handleInputChange = (field, value) => {
        setNewContact(prevState => ({ ...prevState, [field]: value }));
    };


    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.screenTitle}>Emergencia</Text>
            <Text style={styles.screenSubtitle}>Acciones rápidas y contactos de confianza.</Text>

            {/* --- TARJETA DE ACCIONES PRINCIPALES --- */}
            <View style={styles.card}>
                <TouchableOpacity style={[styles.mainButton, styles.redButton]} onPress={() => handleCall('911')}>
                    <Ionicons name="call" size={24} color="#fff" />
                    <Text style={styles.mainButtonText}>Llamar al 911</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mainButton, styles.blueButton]} onPress={handleSendLocation}>
                    <Ionicons name="location-sharp" size={24} color="#fff" />
                    <Text style={styles.mainButtonText}>Enviar Ubicación</Text>
                </TouchableOpacity>
            </View>

            {/* --- SECCIÓN DE CONTACTOS --- */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Mis Contactos</Text>
                <TouchableOpacity style={styles.addButton} onPress={openAddContactModal}>
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Agregar</Text>
                </TouchableOpacity>
            </View>

            {contacts.length > 0 ? (
                contacts.map((contact) => (
                    <View key={contact.id} style={styles.contactCard}>
                        <Ionicons name="person-circle" size={40} color="#8A86DB" />
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactName}>{contact.name}</Text>
                            <Text style={styles.contactRelation}>{contact.relation || 'Contacto'}</Text>
                        </View>
                        <TouchableOpacity style={styles.callButton} onPress={() => handleCall(contact.number)}>
                            <Ionicons name="call" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ))
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={40} color="#c7c7cd" />
                    <Text style={styles.emptyStateText}>Aún no tienes contactos de emergencia.</Text>
                    <Text style={styles.emptyStateSubtext}>Usa el botón "Agregar" para empezar.</Text>
                </View>
            )}

            {/* --- SECCIÓN DE PROTOCOLOS --- */}
            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Protocolos Básicos</Text>
            <View style={styles.card}>
                <View style={styles.protocolHeader}>
                    <Ionicons name="medkit" size={22} color="#6A65D7" />
                    <Text style={styles.protocolTitle}>Si el bebé se atraganta</Text>
                </View>
                <Text style={styles.protocolStep}>1. Coloca al bebé boca abajo sobre tu antebrazo.</Text>
                <Text style={styles.protocolStep}>2. Da 5 palmadas firmes entre los omóplatos.</Text>
                <Text style={styles.protocolStep}>3. Si no reacciona, llama al 911 inmediatamente.</Text>
            </View>
             <View style={styles.card}>
                <View style={styles.protocolHeader}>
                    <Ionicons name="thermometer" size={22} color="#6A65D7" />
                    <Text style={styles.protocolTitle}>En caso de fiebre alta</Text>
                </View>
                <Text style={styles.protocolStep}>1. Mantén al bebé hidratado y con ropa ligera.</Text>
                <Text style={styles.protocolStep}>2. Un baño con agua tibia puede ayudar a bajar la temperatura.</Text>
                <Text style={styles.protocolStep}>3. Si la fiebre persiste o es muy alta, contacta a tu médico.</Text>
            </View>

            {/* --- MODAL PARA AGREGAR CONTACTO --- */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Nuevo Contacto de Emergencia</Text>
                        
                        <TextInput style={styles.input} placeholder="Nombre (*)" placeholderTextColor="#999" value={newContact.nombre} onChangeText={(val) => handleInputChange('nombre', val)} />
                        <TextInput style={styles.input} placeholder="Apellido" placeholderTextColor="#999" value={newContact.apellido} onChangeText={(val) => handleInputChange('apellido', val)} />
                        <TextInput style={styles.input} placeholder="Teléfono (*)" placeholderTextColor="#999" value={newContact.telefono} onChangeText={(val) => handleInputChange('telefono', val)} keyboardType="phone-pad" />
                        <TextInput style={styles.input} placeholder="Correo electrónico" placeholderTextColor="#999" value={newContact.correo} onChangeText={(val) => handleInputChange('correo', val)} keyboardType="email-address" autoCapitalize="none"/>
                        <TextInput style={styles.input} placeholder="Relación (Ej: Padre, Doctora)" placeholderTextColor="#999" value={newContact.relacion} onChangeText={(val) => handleInputChange('relacion', val)} />

                        <View style={styles.modalActions}>
                            <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsModalVisible(false)}>
                                <Text style={styles.modalButtonText}>Cancelar</Text>
                            </Pressable>
                            <Pressable style={[styles.modalButton, styles.saveButton]} onPress={handleAddContact}>
                                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Guardar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

// --- ESTILOS MEJORADOS ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F7FC',
    },
    contentContainer: {
        padding: 20,
    },
    screenTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2C3A47',
    },
    screenSubtitle: {
        fontSize: 16,
        color: '#576574',
        marginBottom: 24,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    mainButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 10,
    },
    redButton: { backgroundColor: '#E74C3C' },
    blueButton: { backgroundColor: '#3498DB' },
    mainButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2C3A47',
    },
    addButton: {
        flexDirection: 'row',
        backgroundColor: '#6A65D7',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        alignItems: 'center',
    },
    addButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 5,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2.22,
        elevation: 3,
    },
    contactInfo: {
        flex: 1,
        marginLeft: 12,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3A47',
    },
    contactRelation: {
        fontSize: 14,
        color: '#576574',
    },
    callButton: {
        backgroundColor: '#2ECC71',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        backgroundColor: '#fff',
        borderRadius: 16,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#576574',
        marginTop: 12,
        fontWeight: '600',
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#A4B0BE',
        marginTop: 4,
    },
    protocolHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    protocolTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2C3A47',
        marginLeft: 10,
    },
    protocolStep: {
        fontSize: 14,
        color: '#576574',
        marginBottom: 5,
        lineHeight: 20,
        paddingLeft: 10,
    },
    // --- Estilos del Modal ---
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        alignItems: 'stretch',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#2C3A47',
    },
    input: {
        backgroundColor: '#F4F7FC',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 10,
        marginBottom: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#EAEAEA',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#EAEAEA',
        marginRight: 10,
    },
    saveButton: {
        backgroundColor: '#6A65D7',
        marginLeft: 10,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3A47',
    },
});