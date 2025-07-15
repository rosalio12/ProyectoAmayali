const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// 🔗 Conexión a MongoDB Atlas
mongoose.connect('mongodb+srv://Antonio:antonio2005@cluster0.ioh6lph.mongodb.net/AMEYALI?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Atlas conectado'))
.catch(err => console.error('❌ Error MongoDB:', err));

// 📦 Esquemas
const SensorSchema = new mongoose.Schema({
  cunaId: { type: String, default: "CUNA001" },
  origin: { type: String, default: "hospital" },
  timestamp: { type: Date, default: Date.now },
  temperatura: { type: Number, min: 30, max: 45 },
  frecuenciaCardiaca: { type: Number, min: 30, max: 200 },
  oxigenacion: { type: Number, min: 50, max: 100 },
  movimiento: { type: Boolean, default: false }
});

const AlertasSchema = new mongoose.Schema({
  cunaId: { type: String, default: "CUNA001" },
  tipo: { type: String, required: true },
  valor: { type: Number, required: true },
  umbral: { type: Number, min: 0, max: 100 },
  timestamp: { type: Date, default: Date.now },
  estado: { type: String, default: "Pendiente" },
  origen: { type: String, default: "Casa" }
});

const SensorData = mongoose.model('lecturas', SensorSchema);
const AlertaData = mongoose.model('alertas', AlertasSchema);

// 🛰 Conexión al Broker MQTT
const mqttClient = mqtt.connect('mqtt://node02.myqtthub.com', {
  username: 'Rosalio',
  password: '1234',
  clientId: 'esp32'
}); 

let lastMessageTime = Date.now();

mqttClient.on('connect', () => {
  console.log('📡 Conectado al broker MQTT');
  mqttClient.subscribe('sensor/oximetro', (err) => {
    if (err) console.error('❌ Error al suscribirse a tópico:', err);
    else console.log('✅ Suscrito al tópico: sensor/oximetro');
  });
});

// 🧠 Procesamiento de mensajes MQTT
mqttClient.on('message', async (topic, message) => {
  lastMessageTime = Date.now(); // Actualiza el tiempo del último mensaje recibido

  console.log("🛰 MQTT mensaje recibido");
  console.log("📌 Tópico:", topic);
  console.log("📦 Payload bruto:", message.toString());

  try {
    const payload = JSON.parse(message.toString());
    console.log("✅ Payload JSON parseado:", payload);

    const { frecuenciaCardiaca, oxigenacion, temperatura, movimiento, cunaId, origin } = payload;

    if (frecuenciaCardiaca === undefined || oxigenacion === undefined) {
      console.warn("⚠️ Datos incompletos MQTT (faltan FC o SpO2):", payload);
      return;
    }

    const newData = new SensorData({
      cunaId: cunaId || "CUNA001",
      origin: origin || "hospital",
      temperatura: temperatura || 36.5,
      frecuenciaCardiaca,
      oxigenacion,
      movimiento: movimiento || false
    });

    await newData.save();
    console.log("✅ 📥 Dato MQTT guardado en MongoDB:", newData);

    await checkForAlerts(newData);

  } catch (err) {
    console.error("❌ Error al procesar mensaje MQTT:", err.message);
    console.error("🛠 Payload inválido:", message.toString());
  }
});

// 🛎 Revisión cada 15 segundos por si no llegan mensajes
setInterval(() => {
  const now = Date.now();
  if (now - lastMessageTime > 15000) {
    console.warn("⏳ ¡No se han recibido mensajes MQTT en los últimos 15 segundos!");
  }
}, 15000);

// 🚨 Reglas de alerta automáticas
async function checkForAlerts(sensorData) {
  if (sensorData.oxigenacion < 90) {
    const alerta = new AlertaData({
      tipo: "Oxigenación baja",
      valor: sensorData.oxigenacion,
      umbral: 90,
      cunaId: sensorData.cunaId
    });
    await alerta.save();
    console.log("⚠️ Alerta: Oxigenación baja");
  }

  if (sensorData.frecuenciaCardiaca > 150 || sensorData.frecuenciaCardiaca < 60) {
    const alerta = new AlertaData({
      tipo: "Frecuencia cardíaca anormal",
      valor: sensorData.frecuenciaCardiaca,
      umbral: sensorData.frecuenciaCardiaca > 150 ? 150 : 60,
      cunaId: sensorData.cunaId
    });
    await alerta.save();
    console.log("⚠️ Alerta: Frecuencia cardíaca anormal");
  }
}

// 🧪 Endpoints API
// ✅ Modificado: Ahora puede filtrar por cunaId(s)
app.get('/sensor-data', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cunas = req.query.cunas; // Nuevo: Soporte para filtrar por cunas

    let query = {};
    if (cunas) {
      const cunaArray = cunas.split(',').map(id => id.trim());
      query.cunaId = { $in: cunaArray };
    }

    const data = await SensorData.find(query).sort({ timestamp: -1 }).limit(limit);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/alertas', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    // 🔑 Filtro por cunas específicas: ?cunas=CUNA005,CUNA006
    const cunas = req.query.cunas;

    let query = {};
    if (cunas) {
      const cunaArray = cunas.split(',').map(id => id.trim());
      query.cunaId = { $in: cunaArray };
    }

    const data = await AlertaData.find(query)
      .sort({ timestamp: -1 })
      .limit(limit);

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/sensor-data', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await SensorData.find().sort({ timestamp: -1 }).limit(limit);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/alertas', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await AlertaData.find().sort({ timestamp: -1 }).limit(limit);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔌 Endpoints disponibles:`);
  console.log(`- POST /sensor-data`);
  console.log(`- POST /alertas`);
  console.log(`- GET  /sensor-data`);
  console.log(`- GET  /alertas`);
});
