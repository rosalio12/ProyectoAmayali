const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'PATCH'], // <-- Agrega PATCH aquí
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// MongoDB Atlas Connection
mongoose.connect('mongodb+srv://Antonio:antonio2005@cluster0.ioh6lph.mongodb.net/AMEYALI?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Atlas conectado'))
.catch(err => console.error('❌ Error MongoDB:', err));

// Sensor Schema
const SensorSchema = new mongoose.Schema({
  cunaId: { type: String, default: "CUNA001" },
  origin: { type: String, default: "hospital" },
  timestamp: { type: Date, default: Date.now },
  temperatura: { type: Number, min: 30, max: 45 },
  frecuenciaCardiaca: { type: Number, min: 30, max: 200 },
  oxigenacion: { type: Number, min: 50, max: 100 },
  movimiento: { type: Boolean, default: false }
});

// Alert Schema
const AlertasSchema = new mongoose.Schema({
  cunaId: { type: String, default: "CUNA001" },
  tipo: { type: String, required: true },
  valor: { type: Number, required: true },
  umbral: { type: Number, min: 0, max: 100 },
  timestamp: { type: Date, default: Date.now },
  estado: { type: String, default: "Pendiente" },
  origen: { type: String, default: "hospital" },
  // NUEVO: Guardar quién atendió la alerta y la observación
  atendidaPor: { type: String, default: null },
  observacion: { type: String, default: null }
});

const SensorData = mongoose.model('lecturas', SensorSchema);
const AlertaData = mongoose.model('alertas', AlertasSchema);

// Food Schema
const ComidaSchema = new mongoose.Schema({
  cunaId: { type: String, required: true },
  origen: { type: String, default: "hospital" },
  tipoAlimento: { type: String, required: true },
  cantidad: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Medicine Schema
const MedicinaSchema = new mongoose.Schema({
  cunaId: { type: String, required: true },
  origen: { type: String, default: "hospital" },
  nombreMedicina: { type: String, required: true },
  dosis: { type: String, required: true },
  via: { type: String, default: "oral" },
  timestamp: { type: Date, default: Date.now }
});

const Comida = mongoose.model('ultimacomidas', ComidaSchema);
const Medicina = mongoose.model('ultimamedicinas', MedicinaSchema);

// MQTT Setup
const mqttClient = mqtt.connect('mqtt://node02.myqtthub.com', {
  username: 'Rosalio',
  password: '1234',
  clientId: 'esp32'
});

let lastMessageTime = Date.now();

mqttClient.on('connect', () => {
  console.log('📡 Conectado al broker MQTT');
  mqttClient.subscribe('sensor/oximetro', err => {
    if (err) console.error('❌ Error al suscribirse a tópico:', err);
    else console.log('✅ Suscrito al tópico: sensor/oximetro');
  });
});

mqttClient.on('message', async (topic, message) => {
  lastMessageTime = Date.now();

  try {
    const payload = JSON.parse(message.toString());
    const { frecuenciaCardiaca, oxigenacion, temperatura, movimiento, cunaId, origin } = payload;

    if (frecuenciaCardiaca === undefined || oxigenacion === undefined) {
      console.warn("⚠️ Datos incompletos MQTT");
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
    console.log("✅ 📥 Dato MQTT guardado en MongoDB");

    await checkForAlerts(newData);

  } catch (err) {
    console.error("❌ Error al procesar mensaje MQTT:", err.message);
  }
});

setInterval(() => {
  if (Date.now() - lastMessageTime > 15000) {
    console.warn("⏳ ¡No se han recibido mensajes MQTT en los últimos 15 segundos!");
  }
}, 15000);

async function checkForAlerts(sensorData) {
  if (sensorData.oxigenacion < 90) {
    await new AlertaData({
      tipo: "Oxigenación baja",
      valor: sensorData.oxigenacion,
      umbral: 90,
      cunaId: sensorData.cunaId
    }).save();
    console.log("⚠️ Alerta: Oxigenación baja");
  }

  if (sensorData.frecuenciaCardiaca > 150 || sensorData.frecuenciaCardiaca < 60) {
    await new AlertaData({
      tipo: "Frecuencia cardíaca anormal",
      valor: sensorData.frecuenciaCardiaca,
      umbral: sensorData.frecuenciaCardiaca > 150 ? 150 : 60,
      cunaId: sensorData.cunaId
    }).save();
    console.log("⚠️ Alerta: Frecuencia cardíaca anormal");
  }
}

// API Endpoints
app.get('/sensor-data', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const query = req.query.cunas ? { cunaId: { $in: req.query.cunas.split(',') } } : {};
    const data = await SensorData.find(query).sort({ timestamp: -1 }).limit(limit);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/alertas', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const query = req.query.cunas ? { cunaId: { $in: req.query.cunas.split(',') } } : {};
    const data = await AlertaData.find(query).sort({ timestamp: -1 }).limit(limit);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/comida', async (req, res) => {
  try {
    const nuevaComida = new Comida(req.body);
    await nuevaComida.save();
    res.json({ success: true, message: 'Comida registrada', data: nuevaComida });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/comida', async (req, res) => {
  try {
    const query = req.query.cunaId ? { cunaId: req.query.cunaId } : {};
    const data = await Comida.find(query).sort({ timestamp: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/medicina', async (req, res) => {
  try {
    const nuevaMedicina = new Medicina(req.body);
    await nuevaMedicina.save();
    res.json({ success: true, message: 'Medicina registrada', data: nuevaMedicina });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/medicina', async (req, res) => {
  try {
    const query = req.query.cunaId ? { cunaId: req.query.cunaId } : {};
    const data = await Medicina.find(query).sort({ timestamp: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Nuevo endpoint para registrar alimentación y/o medicamento
app.post('/registro-alimentacion', async (req, res) => {
  try {
    const { idBebe, comida, horaComida, medicamento, horaMedicamento } = req.body;
    let ultimaComida = null;
    let ultimoMedicamento = null;

    if (comida) {
      const nuevaComida = new Comida({
        cunaId: idBebe,
        tipoAlimento: comida,
        cantidad: 1, // Puedes ajustar esto si tienes un campo de cantidad
        timestamp: horaComida ? new Date(horaComida) : new Date()
      });
      await nuevaComida.save();
      ultimaComida = nuevaComida.timestamp;
    }

    if (medicamento) {
      const nuevaMedicina = new Medicina({
        cunaId: idBebe,
        nombreMedicina: medicamento,
        dosis: "1", // Puedes ajustar esto si tienes un campo de dosis
        timestamp: horaMedicamento ? new Date(horaMedicamento) : new Date()
      });
      await nuevaMedicina.save();
      ultimoMedicamento = nuevaMedicina.timestamp;
    }

    res.json({ success: true, ultimaComida, ultimoMedicamento });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Nuevo endpoint para consultar la última alimentación y medicamento de un bebé
app.get('/registro-alimentacion/ultimo/:cunaId', async (req, res) => {
  try {
    const cunaId = req.params.cunaId;
    const ultimaComida = await Comida.findOne({ cunaId }).sort({ timestamp: -1 });
    const ultimoMedicamento = await Medicina.findOne({ cunaId }).sort({ timestamp: -1 });

    res.json({
      ultimaComida: ultimaComida ? ultimaComida.timestamp : null,
      ultimoMedicamento: ultimoMedicamento ? ultimoMedicamento.timestamp : null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para actualizar el estado y atendidaPor de una alerta
app.patch('/alertas/:id', async (req, res) => {
  try {
    const { estado, atendidaPor, observacion } = req.body;
    const updateFields = { estado, atendidaPor };
    if (observacion !== undefined) updateFields.observacion = observacion;
    const alertaActualizada = await AlertaData.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );
    if (!alertaActualizada) {
      return res.status(404).json({ success: false, error: "Alerta no encontrada" });
    }
    res.json({ success: true, data: alertaActualizada });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- NUEVO ESQUEMA Y ENDPOINT PARA PROBLEMAS TÉCNICOS ---
const ProblemaTecnicoSchema = new mongoose.Schema({
  idCuna: { type: String, required: true },
  descripcion: { type: String, required: true },
  idEnfermero: { type: String, required: true },
  fecha: { type: Date, default: Date.now }
});
const ProblemaTecnico = mongoose.model('problemas_tecnicos', ProblemaTecnicoSchema);

app.post('/problemas-tecnicos', async (req, res) => {
  try {
    const { idCuna, descripcion, idEnfermero, fecha } = req.body;
    if (!idCuna || !descripcion || !idEnfermero) {
      return res.status(400).json({ success: false, error: 'Faltan datos requeridos.' });
    }
    const nuevoProblema = new ProblemaTecnico({
      idCuna,
      descripcion,
      idEnfermero,
      fecha: fecha ? new Date(fecha) : new Date()
    });
    await nuevoProblema.save();
    res.json({ success: true, message: 'Problema técnico registrado correctamente.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});