// api.js

import axios from 'axios';

// DESPUÉS (Correcto) ✅
const API_BASE_URL = 'http://localhost:5000'; // O la IP de tu servidor

export const fetchAlertData = async () => {
  try {
    // La URL ahora será: http://localhost:5000/alertas?limit=100
    const response = await axios.get(`${API_BASE_URL}/alertas?limit=100`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    // Agrega el re-lanzamiento del error para que el componente lo atrape
    throw error; 
  }
};

export const fetchHealthData = async () => {
  try {
    // La URL ahora será: http://localhost:5000/sensor-data?limit=7
    const response = await axios.get(`${API_BASE_URL}/sensor-data?limit=7`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching health data:', error);
    // Agrega el re-lanzamiento del error para que el componente lo atrape
    throw error; 
  }
}; 