const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // Para JSON en POST

// ⚙️ CONFIGURACIÓN SQL SERVER
const config = {
  user: 'rosalio21',
  password: 'rosalio12',
  server: '172.18.2.158',
  database: 'AMEYALII',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// ✅ Versión con `req.query.email` para que funcione con fetchUserRole
app.get('/api/rol/by-email', async (req, res) => {
  const userEmail = req.query.email;

  if (!userEmail) {
    return res.status(400).json({ error: 'Falta el correo electrónico' });
  }

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('correo', sql.VarChar, userEmail)
      .query(`
        SELECT T2.Nombre AS rol  -- ¡Aquí solo seleccionamos el rol!
        FROM Usuario AS T1
        INNER JOIN Rol AS T2 ON T1.idRol = T2.idRol
        WHERE T1.Correo = @correo
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const rol = result.recordset[0].rol; // ¡Aquí solo obtenemos 'rol' directamente!

    const rolesPermitidos = ['Padre', 'Madre', 'Enfermero'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({ error: `Rol no permitido: ${rol}` });
    }

    res.json({ role: rol }); // ¡Enviamos solo el rol en la respuesta!

  } catch (err) {
    console.error('Error al consultar rol:', err); // Cambié el mensaje de error para reflejar solo el rol
    res.status(500).send('Error al consultar rol'); // Cambié el mensaje de error
  }
});

// --- NUEVO ENDPOINT: Obtener idUsuario por email ---
// Este endpoint es adicional y NO AFECTA tu lógica de autenticación existente.
app.get('/api/usuario-id-by-email', async (req, res) => {
    const userEmail = req.query.email;

    if (!userEmail) {
        return res.status(400).json({ error: 'Falta el correo electrónico' });
    }

    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('correo', sql.VarChar, userEmail)
            .query(`SELECT idUsuario FROM Usuario WHERE Correo = @correo`);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'ID de usuario no encontrado para este correo' });
        }

        const idUsuario = result.recordset[0].idUsuario;
        res.json({ idUsuario: idUsuario });

    } catch (err) {
        console.error('Error al obtener ID de usuario por email:', err);
        res.status(500).send('Error al obtener ID de usuario');
    }
});

//endpoints para models

// --- NUEVO ENDPOINT: Obtener Bebés por idUsuario ---
// Este endpoint es crucial para los padres/madres
app.get('/api/bebes/usuario/:idUsuario', async (req, res) => {
    const idUsuario = parseInt(req.params.idUsuario);

    if (isNaN(idUsuario)) {
        return res.status(400).json({ error: 'ID de usuario no válido.' });
    }

    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('idUsuario', sql.Int, idUsuario)
            .query(`
             SELECT
    b.idBebe,
    b.Nombre,
    b.Apellidos,
    b.Sexo,
    b.Peso,
    b.FechaNacimiento,
    b.idCuna,
    cu.Nombre AS nombreCuarto,
    h.Nombre AS nombreHospital
FROM Bebe b
LEFT JOIN Cuna c ON b.idCuna = c.idCuna
LEFT JOIN Cuarto cu ON c.idCuarto = cu.idCuarto
LEFT JOIN Hospital h ON cu.idHospital = h.idHospital
WHERE c.idUsuario = @idUsuario;

            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'No se encontraron bebés para este usuario.' });
        }

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al obtener bebés por usuario:', err);
        res.status(500).send('Error al consultar bebés para el usuario.');
    }
});



// ✅ Contactos de emergencia filtrados por usuario
app.get('/api/contactos-emergencia/:idUsuario', async (req, res) => {
  const idUsuario = parseInt(req.params.idUsuario);

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('idUsuario', sql.Int, idUsuario)
      .query(`
        SELECT Nombre, Apellido, Telefono, Correo, Relacion
        FROM contactoEm
        WHERE idUsuario = @idUsuario
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al consultar contactos');
  }
});

// ✅ Nuevo: Agregar contacto de emergencia
app.post('/api/contactos-emergencia', async (req, res) => {
  const { idUsuario, Nombre, Apellido, Telefono, Correo, Relacion } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('idUsuario', sql.Int, idUsuario)
      .input('Nombre', sql.NVarChar, Nombre)
      .input('Apellido', sql.NVarChar, Apellido)
      .input('Telefono', sql.NVarChar, Telefono)
      .input('Correo', sql.NVarChar, Correo)
      .input('Relacion', sql.NVarChar, Relacion)
      .query(`
        INSERT INTO contactoEm (idUsuario, Nombre, Apellido, Telefono, Correo, Relacion)
        VALUES (@idUsuario, @Nombre, @Apellido, @Telefono, @Correo, @Relacion)
      `);

    res.status(200).send('Contacto agregado correctamente');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al agregar contacto');
  }
});

// ✅ Historial de bebés por usuario
app.get('/api/historial-bebes/:idUsuario', async (req, res) => {
  const idUsuario = parseInt(req.params.idUsuario);

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('idUsuario', sql.Int, idUsuario)
      .query(`
        SELECT 
          b.idBebe,
          b.Nombre AS nombre,
          hb.ObservacionesMedicas,
          hb.Alergias,
          c.Nombre AS contactoNombre,
          c.Telefono AS contactoTelefono
        FROM Bebe b
        JOIN HistorialBebe hb ON b.idBebe = hb.idBebe
        JOIN contactoEm c ON b.idBebe = c.idBebe
        WHERE b.idUsuario = @idUsuario
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al consultar historial');
  }
});

// ✅ Cunas por enfermero
app.get('/api/cunas/enfermero/:idUsuario', async (req, res) => {
  const idUsuario = parseInt(req.params.idUsuario);

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('idUsuario', sql.Int, idUsuario)
      .query(`
        SELECT 
          C.idCuna,
          CONCAT('Cuna ', C.idCuna) AS nombre,
          C.Estado,
          C.FechaAsig,
          Cu.Nombre AS nombreCuarto,
          H.Nombre AS nombreHospital
        FROM Cuna C
        INNER JOIN Cuarto Cu ON C.idCuarto = Cu.idCuarto
        INNER JOIN Hospital H ON Cu.idHospital = H.idHospital
        WHERE C.idUsuario = @idUsuario
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al consultar cunas');
  }
});

// ✅ Bebés por enfermero
app.get('/api/bebes/enfermero/:idUsuario', async (req, res) => {
  const idUsuario = parseInt(req.params.idUsuario);

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('idUsuario', sql.Int, idUsuario)
      .query(`
        SELECT
          b.idBebe,
          b.Nombre,
          b.Apellidos,
          b.Sexo,
          b.Peso,
          b.FechaNacimiento,
          c.idCuna,
          cu.Nombre AS nombreCuarto,
          h.Nombre AS nombreHospital
        FROM Bebe b
        INNER JOIN Cuna c ON b.idCuna = c.idCuna
        INNER JOIN Cuarto cu ON c.idCuarto = cu.idCuarto
        INNER JOIN Hospital h ON cu.idHospital = h.idHospital
        WHERE c.idUsuario = @idUsuario
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al consultar bebés para enfermero');
  }
});

// --- NUEVO ENDPOINT: Historial Completo de Bebés para Enfermero ---
// Este endpoint obtiene todos los bebés asignados a las cunas de un enfermero,
// junto con su historial médico y contacto de emergencia (si existen).
app.get('/api/enfermero/historial-bebes-completo/:idUsuario', async (req, res) => {
    const idUsuario = parseInt(req.params.idUsuario);

    if (isNaN(idUsuario)) {
        return res.status(400).json({ error: 'ID de usuario no válido.' });
    }

    try {
        console.log(`[Backend] Iniciando conexión para Historial Completo Enfermero con id: ${idUsuario}`);
        const pool = await sql.connect(config);
        console.log(`[Backend] Conexión establecida para Historial Completo Enfermero.`);

        const result = await pool.request()
            .input('idUsuario', sql.Int, idUsuario)
            .query(`
                SELECT
                    b.idBebe,
                    b.Nombre AS BebeNombre,
                    b.Apellidos AS BebeApellidos,
                    b.Sexo AS BebeSexo,
                    b.Peso AS BebePeso,
                    b.FechaNacimiento AS BebeFechaNacimiento,
                    c.idCuna,
                    -- Información del HistorialBebe (puede ser NULL si no hay historial)
                    hb.ObservacionesMedicas,
                    hb.Vacunas,
                    hb.FechaVisitaMedica,
                    -- Información del Contacto de Emergencia (puede ser NULL si no hay contacto directo)
                    ce.Nombre AS ContactoEmergenciaNombre,
                    ce.Telefono AS ContactoEmergenciaTelefono,
                    ce.Relacion AS ContactoEmergenciaRelacion
                FROM Bebe b
                INNER JOIN Cuna c ON b.idCuna = c.idCuna
                LEFT JOIN HistorialBebe hb ON b.idBebe = hb.idBebe
                LEFT JOIN contactoEm ce ON b.idBebe = ce.idBebe
                WHERE c.idUsuario = @idUsuario;
            `);

        console.log(`[Backend] Consulta exitosa para Historial Completo Enfermero. Filas encontradas: ${result.recordset.length}`);
        res.json(result.recordset);

    } catch (err) {
        console.error(`[Backend] ERROR al obtener Historial Completo Enfermero (id: ${idUsuario}):`, err);
        // Enviar un mensaje de error más descriptivo que podría venir de la excepción
        res.status(500).send(`Error interno del servidor al consultar historial completo: ${err.message || err}`);
    }
});

// ✅ Vacunas filtradas por usuario y bebé
app.get('/api/vacunas/:idUsuario/:idBebe', async (req, res) => {
  const idUsuario = parseInt(req.params.idUsuario);
  const idBebe = parseInt(req.params.idBebe);

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('idUsuario', sql.Int, idUsuario)
      .input('idBebe', sql.Int, idBebe)
      .query(`
        SELECT 
  hb.Vacunas, 
  hb.FechaVisitaMedica
FROM HistorialBebe hb
INNER JOIN Bebe b ON hb.idBebe = b.idBebe
INNER JOIN Cuna c ON b.idCuna = c.idCuna
WHERE hb.idBebe = @idBebe AND c.idUsuario = @idUsuario
ORDER BY hb.FechaVisitaMedica DESC;

      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al consultar vacunas');
  }
});

// ✅ Condiciones médicas filtradas por usuario y bebé
app.get('/api/condiciones/:idUsuario/:idBebe', async (req, res) => {
  const idUsuario = parseInt(req.params.idUsuario);
  const idBebe = parseInt(req.params.idBebe);

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('idUsuario', sql.Int, idUsuario)
      .input('idBebe', sql.Int, idBebe)
      .query(`
        SELECT ObservacionesMedicas AS Descripcion, FechaVisitaMedica
        FROM HistorialBebe hb
        INNER JOIN Bebe b ON hb.idBebe = b.idBebe
		INNER JOIN Cuna c ON b.idCuna = c.idCuna
        WHERE hb.idBebe = @idBebe AND c.idUsuario = @idUsuario
        ORDER BY FechaVisitaMedica DESC;
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al consultar condiciones médicas');
  }
});

// ✅ Agregar vacuna
app.post('/api/vacunas', async (req, res) => {
  const { idBebe, vacunas, fecha } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('idBebe', sql.Int, idBebe)
      .input('Vacunas', sql.NVarChar, vacunas)
      .input('FechaVisitaMedica', sql.Date, fecha)
      .query(`
        INSERT INTO HistorialBebe (idBebe, Vacunas, FechaVisitaMedica)
        VALUES (@idBebe, @Vacunas, @FechaVisitaMedica)
      `);

    res.status(200).send('Vacuna agregada correctamente');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al agregar vacuna');
  }
});

// ✅ Agregar condición médica
app.post('/api/condiciones', async (req, res) => {
  const { idBebe, observaciones, fecha } = req.body;

  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('idBebe', sql.Int, idBebe)
      .input('ObservacionesMedicas', sql.NVarChar, observaciones)
      .input('FechaVisitaMedica', sql.Date, fecha)
      .query(`
        INSERT INTO HistorialBebe (idBebe, ObservacionesMedicas, FechaVisitaMedica)
        VALUES (@idBebe, @ObservacionesMedicas, @FechaVisitaMedica)
      `);

    res.status(200).send('Condición médica agregada correctamente');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al agregar condición médica');
  }
});
// ✅ Nuevo: Crear un perfil de usuario en la base de datos SQL
// Se debe llamar DESPUÉS de que el registro en Firebase sea exitoso.
// ✅ Nuevo: Crear un perfil de usuario en la base de datos SQL
app.post('/api/registroConCasa', async (req, res) => {
  const {
    firebaseUID,
    Nombre,
    Apellidos,
    Correo,
    NumTel,
    FechaNacimiento,
    contrasena, // Si la usas, de lo contrario ignora
    idRol,
    nombreCasa,
    direccionCasa,
    telefonoCasa,
    correoCasa
  } = req.body;

  if (!firebaseUID || !Nombre || !Correo || !idRol || !nombreCasa) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const pool = await sql.connect(config);

    // Verificar si ya existe la casa
    const checkCasa = await pool.request()
      .input('nombreCasa', sql.VarChar, nombreCasa)
      .query('SELECT idCasa FROM Casa WHERE Nombre = @nombreCasa');

    let idCasa;

    if (checkCasa.recordset.length > 0) {
      idCasa = checkCasa.recordset[0].idCasa;
    } else {
      // Insertar nueva casa
      const nuevaCasa = await pool.request()
        .input('nombreCasa', sql.VarChar, nombreCasa)
        .input('direccion', sql.VarChar, direccionCasa || '')
        .input('telefono', sql.VarChar, telefonoCasa || '')
        .input('correo', sql.VarChar, correoCasa || '')
        .query(`
          INSERT INTO Casa (Nombre, direccion, NumTel, correo, FechaRegistro, activo)
          OUTPUT INSERTED.idCasa
          VALUES (@nombreCasa, @direccion, @telefono, @correo, GETDATE(), 1)
        `);

      idCasa = nuevaCasa.recordset[0].idCasa;
    }

    // Insertar usuario asociado a la casa
    const nuevoUsuario = await pool.request()
      .input('Nombre', sql.VarChar, Nombre)
      .input('Apellidos', sql.VarChar, Apellidos)
      .input('Correo', sql.VarChar, Correo)
      .input('NumTel', sql.VarChar, NumTel)
      .input('FechaNacimiento', sql.Date, FechaNacimiento)
      .input('idRol', sql.Int, idRol)
      .input('idCasa', sql.Int, idCasa)
      .input('firebaseUID', sql.NVarChar, firebaseUID)
      .query(`
        INSERT INTO Usuario (Nombre, Apellidos, Correo, NumTel, FechaNacimiento, idRol, idCasa, firebaseUID)
        OUTPUT INSERTED.idUsuario
        VALUES (@Nombre, @Apellidos, @Correo, @NumTel, @FechaNacimiento, @idRol, @idCasa, @firebaseUID)
      `);

    const userId = nuevoUsuario.recordset[0].idUsuario;

    res.status(201).json({
      message: 'Usuario y casa registrados correctamente',
      idUsuario: userId,
      idCasa: idCasa
    });
  } catch (err) {
    console.error('Error al registrar usuario con casa:', err);
    res.status(500).send('Error al registrar usuario con casa');
  }
});


// ✅ Nuevo: Asignar una cuna a un usuario
app.put('/api/cunas/asignar', async (req, res) => {
  const { idCuna, idUsuario } = req.body;

  if (!idCuna || !idUsuario) {
    return res.status(400).send('Se requieren idCuna y idUsuario');
  }

  try {
    const pool = await sql.connect(config);

    // Opcional: Verificar si la cuna ya está asignada
    const cunaCheck = await pool.request()
        .input('idCuna', sql.Int, idCuna)
        .query('SELECT idUsuario FROM Cuna WHERE idCuna = @idCuna');

    if (cunaCheck.recordset.length > 0 && cunaCheck.recordset[0].idUsuario !== null) {
        return res.status(409).send('Esta cuna ya está asignada a otro usuario.');
    }

    // Asignar la cuna
    await pool.request()
      .input('idCuna', sql.Int, idCuna)
      .input('idUsuario', sql.Int, idUsuario)
      .input('FechaAsig', sql.Date, new Date())
      .query(`
        UPDATE Cuna
        SET idUsuario = @idUsuario,
            Estado = 1,
            FechaAsig = @FechaAsig
        WHERE idCuna = @idCuna
      `);

    res.status(200).send('Cuna asignada correctamente');

  } catch (err) {
    console.error('Error al asignar cuna:', err);
    res.status(500).send('Error en el servidor al asignar la cuna');
  }
});


// --- Manejador de Errores Global (AÑADIDO AL FINAL) ---
// Este middleware capturará cualquier error que no haya sido atrapado por un try/catch en una ruta.
app.use((err, req, res, next) => {
    console.error('[GLOBAL ERROR HANDLER] Unhandled error:', err.stack); // Imprime el stack trace completo
    res.status(500).send('Ocurrió un error inesperado en el servidor.');
});

// ✅ LISTEN
app.listen(3000,'0.0.0.0', () => {
  console.log('API corriendo en http://localhost:3000');
});
