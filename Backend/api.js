const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const app = express();

app.use(cors());
app.use(express.json()); // Para JSON en POST

// ⚙️ CONFIGURACIÓN SQL SERVER
const config = {
  user: 'rosalio21',
  password: 'rosalio12',
  server: 'localhost',
  database: 'AMEYALII',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};
// NUEVO ENDPOINT: Obtener el peso de un bebé por el id de la cuna
app.get('/api/bebe/peso/:idCuna', async (req, res) => {
  const { idCuna } = req.params;

  // Validar que idCuna es un número
  if (isNaN(idCuna)) {
    return res.status(400).json({ success: false, message: 'El ID de la cuna debe ser un número.' });
  }

  try {
    const pool = await sql.connect(config); // Usar la configuración definida
    const result = await pool.request()
      .input('idCuna', sql.Int, idCuna)
      .query('SELECT Peso FROM Bebe WHERE idCuna = @idCuna');

    if (result.recordset.length > 0) {
      // Formatear el peso a un número con 3 decimales si es necesario
      const peso = parseFloat(result.recordset[0].Peso).toFixed(3);
      res.json({ success: true, peso: parseFloat(peso) });
    } else {
      res.status(404).json({ success: false, message: 'No se encontró un bebé asignado a esa cuna.' });
    }
  } catch (err) {
    console.error('Error al obtener el peso del bebé:', err);
    res.status(500).json({ success: false, error: 'Error del servidor al obtener el peso.' });
  }
});
// ⭐️ NUEVO ENDPOINT: PUT /api/bebe/asignar-cuna
// Asigna un bebé a una cuna disponible.
app.put('/api/bebe/asignar-cuna', async (req, res) => {
    const { idBebe, idCuna, idUsuario } = req.body;
    if (!idBebe || !idCuna || !idUsuario) {
        return res.status(400).json({ message: 'Se requieren los IDs de bebé, cuna y usuario.' });
    }

    let pool;
    try {
        pool = await sql.connect(config);
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            // 1. Verificar si la cuna está disponible
            const cunaResult = await new sql.Request(transaction)
                .input('idCuna', sql.Int, idCuna)
                .query('SELECT Estado FROM Cuna WHERE idCuna = @idCuna');

            if (cunaResult.recordset.length === 0) {
                 await transaction.rollback();
                 return res.status(404).json({ message: `La cuna con ID ${idCuna} no existe.` });
            }
            if (cunaResult.recordset[0].Estado === 1) {
                 await transaction.rollback();
                 return res.status(409).json({ message: `La cuna #${idCuna} ya está ocupada.` });
            }

            // 2. Elimina la restricción de "ya tiene cuna asignada"
            // Si el bebé ya tiene una cuna, lo desvinculamos de la anterior
            const bebeResult = await new sql.Request(transaction)
                .input('idBebe', sql.Int, idBebe)
                .query('SELECT idCuna FROM Bebe WHERE idBebe = @idBebe');

            if (bebeResult.recordset.length === 0) {
                 await transaction.rollback();
                 return res.status(404).json({ message: `El bebé con ID ${idBebe} no existe.` });
            }
            const cunaAnterior = bebeResult.recordset[0].idCuna;
            if (cunaAnterior !== null && cunaAnterior !== idCuna) {
                // Liberar la cuna anterior
                await new sql.Request(transaction)
                    .input('idCuna', sql.Int, cunaAnterior)
                    .query('UPDATE Cuna SET Estado = 0, FechaAsig = NULL, idUsuario = NULL WHERE idCuna = @idCuna');
            }

            // 3. Asignar la nueva cuna al bebé
            await new sql.Request(transaction)
                .input('idBebe', sql.Int, idBebe)
                .input('idCuna', sql.Int, idCuna)
                .query('UPDATE Bebe SET idCuna = @idCuna WHERE idBebe = @idBebe');

            // 4. Ocupar la nueva cuna, asignando fecha y usuario
            await new sql.Request(transaction)
                .input('idCuna', sql.Int, idCuna)
                .input('idUsuario', sql.Int, idUsuario)
                .query('UPDATE Cuna SET Estado = 1, FechaAsig = GETDATE(), idUsuario = @idUsuario WHERE idCuna = @idCuna');

            await transaction.commit();
            res.status(200).json({ message: `Bebé asignado a la cuna #${idCuna} correctamente.` });

        } catch (err) {
            await transaction.rollback();
            console.error('Error en la transacción de asignación:', err);
            res.status(500).json({ message: 'Error al asignar la cuna. La operación fue revertida.', error: err.message });
        }
    } catch (err) {
        console.error('Error de conexión a la base de datos:', err);
        res.status(500).json({ message: 'Error de conexión a la base de datos.', error: err.message });
    }
});
// PUT /api/cunas/dar-de-alta/:id (CORREGIDO Y MEJORADO)
app.put('/api/cunas/dar-de-alta/:id', async (req, res) => {
  const { id: idCuna } = req.params;
  // Validación básica del ID
  if (!idCuna || isNaN(parseInt(idCuna))) {
    return res.status(400).json({ message: 'Se requiere un ID de cuna numérico válido.' });
  }
  let pool;
  try {
    pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      // ******************************************************
      // INICIO DE LOS CONSOLE.LOG AGREGADOS
      // ******************************************************
      console.log(`[Backend] Intentando dar de alta cuna con ID: ${idCuna}`); //

      // 1. Encontrar el ID del bebé en esa cuna
      const requestBebeId = new sql.Request(transaction);
      console.log(`[Backend] Buscando bebé en cuna con ID: ${idCuna}`); //
      const bebeResult = await requestBebeId
        .input('idCuna', sql.Int, idCuna)
        .query('SELECT idBebe FROM Bebe WHERE idCuna = @idCuna');
      const idBebe = bebeResult.recordset.length > 0 ? bebeResult.recordset[0].idBebe : null;
      console.log(`[Backend] ID de bebé encontrado: ${idBebe}`); //

      if (idBebe) {
        console.log(`[Backend] Eliminando asignaciones de enfermeros para bebé ID: ${idBebe}`); //
        // 2. Eliminar todas las asignaciones del bebé con enfermeros
        await new sql.Request(transaction)
          .input('idBebe', sql.Int, idBebe)
          .query('DELETE FROM Bebe_Enfermero WHERE idBebe = @idBebe');

        console.log(`[Backend] Desvinculando bebé ID: ${idBebe} de la cuna`); //
        // 3. Desvincular al bebé de la cuna (poner idCuna a NULL)
        await new sql.Request(transaction)
          .input('idBebe', sql.Int, idBebe)
          .query('UPDATE Bebe SET idCuna = NULL WHERE idBebe = @idBebe');
      } else {
        console.log(`[Backend] No se encontró ningún bebé en la cuna con ID: ${idCuna}.`); // Agregado para claridad
      }

      // 4. Liberar la cuna (siempre se ejecuta)
      console.log(`[Backend] Liberando cuna ID: ${idCuna}`); //
      const updateCunaResult = await new sql.Request(transaction)
        .input('idCuna', sql.Int, idCuna)
        .query('UPDATE Cuna SET Estado = 0, FechaAsig = NULL, idUsuario = NULL WHERE idCuna = @idCuna');

      if (updateCunaResult.rowsAffected[0] === 0) {
        console.error(`[Backend] Error: No se pudo encontrar o actualizar la cuna con ID: ${idCuna}. La cuna podría no existir o ya estar libre.`); //
        throw new Error(`No se pudo encontrar o actualizar la cuna con ID: ${idCuna}.`);
      }
      
      await transaction.commit();
      console.log(`[Backend] Transacción confirmada para cuna ID: ${idCuna}. Alta médica completada.`); //
      res.status(200).json({ message: 'Alta médica completada correctamente.' });
    } catch (err) {
      await transaction.rollback();
      console.error(`[Backend] Error en la transacción para cuna ID ${idCuna}. Operación revertida. Error: ${err.message}`); // Agregado para depuración
      res.status(500).json({ message: 'Error al procesar el alta médica. La operación fue revertida.', error: err.message });
    }
  } catch (err) {
    console.error(`[Backend] Error de conexión a la base de datos para cuna ID ${idCuna}. Error: ${err.message}`); // Agregado para depuración
    res.status(500).json({ message: 'Error de conexión a la base de datos.', error: err.message });
  }
});

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
    const rol = result.recordset[0].rol; 

    const rolesPermitidos = ['Padre', 'Madre', 'Enfermero'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({ error: `Rol no permitido: ${rol}` });
    }
    res.json({ role: rol }); 
  } catch (err) {
    console.error('Error al consultar rol:', error); 
    res.status(500).send('Error al consultar rol'); 
  }
});
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
app.get('/api/enfermero/historial/:idBebe/pdf', async (req, res) => {

    const idBebe = parseInt(req.params.idBebe);
    if (isNaN(idBebe)) {

        return res.status(400).json({ error: 'ID de bebé no válido.' });
    }
    try {
        const pool = await sql.connect(config);
        const bebeResult = await pool.request()
            .input('idBebe', sql.Int, idBebe)
            .query(`
                SELECT
                    b.Nombre, b.ApellidoPaterno, b.ApellidoMaterno, b.Sexo, b.Peso, b.FechaNacimiento,
                    cu.Nombre AS nombreCuarto, h.Nombre AS nombreHospital
                FROM Bebe b
                LEFT JOIN Cuna c ON b.idCuna = c.idCuna
                LEFT JOIN Cuarto cu ON c.idCuarto = cu.idCuarto
                LEFT JOIN Hospital h ON cu.idHospital = h.idHospital
                WHERE b.idBebe = @idBebe
            `);
        if (bebeResult.recordset.length === 0) {
            return res.status(404).send('Bebé no encontrado.');
        }
        const bebe = bebeResult.recordset[0];
        const historialResult = await pool.request()
            .input('idBebe', sql.Int, idBebe)
            .query(`
                SELECT ObservacionesMedicas, Vacunas, FechaVisitaMedica
                FROM HistorialBebe
                WHERE idBebe = @idBebe
                ORDER BY FechaVisitaMedica DESC`);
        const historial = historialResult.recordset;
        // CORREGIDO: Traer la relación como texto desde la tabla Rol
        const contactoResult = await pool.request()
            .input('idBebe', sql.Int, idBebe)
            .query(`
                SELECT ce.Nombre, ce.Telefono, r.Nombre AS Relacion
                FROM contactoEm ce
                LEFT JOIN Rol r ON ce.idRolContacto = r.idRol
                WHERE ce.idBebe = @idBebe
            `);
        const contactos = contactoResult.recordset;
const path = require('path');
try {
    const doc = new PDFDocument({
        margin: 50,
        bufferPages: true,
});
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Historial_Bebe_${idBebe}.pdf`);
    doc.pipe(res);
    const addHeaderAndBorder = () => {
        const distance = 20;
        doc.rect(distance, distance, doc.page.width - distance * 2, doc.page.height - distance - 20)
           .lineWidth(5)
           .strokeColor('#000080')
           .stroke();
    const imagePath = path.join(__dirname, '..', 'Fotos', 'Logo1.png');  
        try {
            doc.image(imagePath, 465, 25, {
                width: 115,
                align: 'center',
            });
        } catch (imgErr) {
            console.error("Error al cargar la imagen del logo:", imgErr.message);
            doc.fontSize(10).fillColor('red').text('Logo no disponible', 50, 50);
        }
        doc.fillColor('black');
    };
    doc.on('pageAdded', addHeaderAndBorder);
    addHeaderAndBorder();
    doc.y = 127;
    doc.fontSize(20).font('Helvetica-Bold').text(`Historial Médico de: ${bebe.Nombre} ${bebe.ApellidoPaterno} ${bebe.ApellidoMaterno}`, { align: 'center' });
    doc.moveDown(0.5);
    const addInfoLine = (label, value) => {

        doc.fontSize(12).font('Helvetica-Bold').text(label, { continued: true, indent: 20 });

        doc.font('Helvetica').text(`: ${value || 'No especificado'}`);

    };

    doc.fontSize(16).font('Helvetica-Bold').text('Datos del Bebé', { underline: false });

    doc.moveDown(0.5);

    addInfoLine('Fecha de Nacimiento', new Date(bebe.FechaNacimiento).toLocaleDateString());

    addInfoLine('Sexo', bebe.Sexo);

    addInfoLine('Peso al nacer', `${bebe.Peso} kg`);

    addInfoLine('Hospital', bebe.nombreHospital);

    addInfoLine('Cuarto', bebe.nombreCuarto);

    doc.moveDown(2);

    doc.fontSize(16).font('Helvetica-Bold').text('Historial de Visitas Médicas', { underline: false });

    doc.moveDown(0.5);

    if (historial.length > 0) {

        historial.forEach(entry => {
            doc.fontSize(12).font('Helvetica-Bold').text(`Fecha de Visita: ${new Date(entry.FechaVisitaMedica).toLocaleDateString()}`);
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').text('Observaciones:', { underline: false });
            doc.font('Helvetica').text(entry.ObservacionesMedicas || 'Sin observaciones.', { indent: 15 });
            doc.moveDown(0.5);
            doc.font('Helvetica').text('Vacunas:', { underline: false });
            doc.font('Helvetica').text(entry.Vacunas || 'Sin vacunas registradas.', { indent: 15 });
            doc.moveDown(1);
        });
    } else {
        doc.fontSize(12).font('Helvetica').text('No hay registros de historial médico.');
        doc.moveDown(2);
    }
    doc.fontSize(16).font('Helvetica-Bold').text('Contactos de Emergencia', { underline: false });

    doc.moveDown(0.5);

    if (contactos.length > 0) {

        contactos.forEach(contacto => {

            doc.fontSize(12).font('Helvetica').text(`• ${contacto.Nombre} (${contacto.Relacion}) - Tel: ${contacto.Telefono}`);
        });
    } else {
        doc.fontSize(12).font('Helvetica').text('No hay contactos de emergencia registrados.');
    }
    doc.end();
} catch (err) {
    console.error(`[Backend] ERROR al generar PDF para bebé ${idBebe}:`, err);
    res.status(500).send('Error al generar el PDF.');
}
    } catch (err) {
      console.error(`[Backend] ERROR al generar PDF para bebé ${idBebe}:`, err);
      res.status(500).send('Error al generar el PDF.');
    }
});

app.get('/api/usuarios/:idUsuario/bebes', async (req, res) => {
    const idUsuario = parseInt(req.params.idUsuario);
    if (isNaN(idUsuario)) {
        return res.status(400).json({ error: 'ID de usuario no válido.' });
    }
    try {
        const pool = await sql.connect(config);
        // CORRECCIÓN: Se obtienen los apellidos por separado.
        const result = await pool.request()
            .input('idUsuario', sql.Int, idUsuario)
            .query(`
                SELECT
                    b.idBebe, b.Nombre, b.ApellidoPaterno, b.ApellidoMaterno, b.Sexo,
                    b.Peso, b.FechaNacimiento, b.idCuna,
                    cu.Nombre AS nombreCuarto, h.Nombre AS nombreHospital
                FROM Bebe b
                INNER JOIN Cuna c ON b.idCuna = c.idCuna
                INNER JOIN Cuarto cu ON c.idCuarto = cu.idCuarto
                INNER JOIN Hospital h ON cu.idHospital = h.idHospital
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
app.get('/api/bebes/:idBebe/contactos-emergencia', async (req, res) => {
    const idBebe = parseInt(req.params.idBebe);
    if (isNaN(idBebe)) {
        return res.status(400).json({ error: 'ID de bebé no válido.' });
    }
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('idBebe', sql.Int, idBebe)
            .query(`
                SELECT idContacto, Nombre, ApellidoPaterno, ApellidoMaterno, Telefono, Correo, Relacion
                FROM contactoEm
                WHERE idBebe = @idBebe
            `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al consultar contactos');
    }
});
app.post('/api/contactos-emergencia', async (req, res) => {
    const { idBebe, Nombre, ApellidoPaterno, ApellidoMaterno, Telefono, Correo, Relacion } = req.body;
    if (!idBebe || !Nombre || !ApellidoPaterno) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: idBebe, Nombre, ApellidoPaterno.' });
    }
    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('idBebe', sql.Int, idBebe)
            .input('Nombre', sql.NVarChar, Nombre)
            .input('ApellidoPaterno', sql.NVarChar, ApellidoPaterno)
            .input('ApellidoMaterno', sql.NVarChar, ApellidoMaterno)
            .input('Telefono', sql.NVarChar, Telefono)
            .input('Correo', sql.NVarChar, Correo)
            .input('Relacion', sql.NVarChar, Relacion)
            .query(`
                INSERT INTO contactoEm (idBebe, Nombre, ApellidoPaterno, ApellidoMaterno, Telefono, Correo, Relacion)
                VALUES (@idBebe, @Nombre, @ApellidoPaterno, @ApellidoMaterno, @Telefono, @Correo, @Relacion)
            `);
        res.status(201).send('Contacto agregado correctamente');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al agregar contacto');
    }
});
app.get('/api/enfermero/historial/:idBebe', async (req, res) => {
    const idBebe = parseInt(req.params.idBebe);
    if (isNaN(idBebe)) {
        return res.status(400).json({ error: 'ID de bebé no válido.' });
    }

    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('idBebe', sql.Int, idBebe)
            .query(`
                SELECT
                    hb.idHistorial,
                    hb.ObservacionesMedicas,
                    hb.Vacunas,
                    hb.FechaVisitaMedica,
                    ce.Nombre AS ContactoEmergenciaNombre,
                    ce.ApellidoPaterno,
                    ce.ApellidoMaterno,
                    ce.Telefono AS ContactoEmergenciaTelefono,
                    ce.Correo AS ContactoEmergenciaCorreo,
                    ce.RelacionRol AS ContactoEmergenciaRelacion
                FROM HistorialBebe hb
                OUTER APPLY (
                    SELECT TOP 1
                        ce.Nombre,
                        ce.ApellidoPaterno,
                        ce.ApellidoMaterno,
                        ce.Telefono,
                        ce.Correo,
                        r.Nombre AS RelacionRol
                    FROM contactoEm ce
                    LEFT JOIN Rol r ON ce.idRolContacto = r.idRol
                    WHERE ce.idBebe = hb.idBebe
                    ORDER BY ce.idContacto ASC
                ) ce
                WHERE hb.idBebe = @idBebe
                ORDER BY hb.FechaVisitaMedica DESC;
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error(`[Backend] ERROR al obtener historial para bebé ${idBebe}:`, err);
        res.status(500).send('Error al consultar el historial del bebé.');
    }
});


app.get('/api/enfermero/historial-bebes-completo/:userId', async (req, res) => {

    const userId = parseInt(req.params.userId);



    if (isNaN(userId)) {

        return res.status(400).json({ error: 'ID de usuario no válido.' });

    }



    try {

        const pool = await sql.connect(config);

        const result = await pool.request()

            .input('idUsuario', sql.Int, userId)

            .query(`

                SELECT DISTINCT -- Usar DISTINCT es una buena práctica aquí

                    b.idBebe,

                    b.Nombre AS BebeNombre,

                    b.ApellidoPaterno AS BebeApellidoPaterno,
                    b.ApellidoMaterno AS BebeApellidoMaterno,

                    b.Sexo AS BebeSexo,

                    b.Peso AS BebePeso,

                    b.FechaNacimiento AS BebeFechaNacimiento,

                    b.idCuna

                FROM Bebe b

                INNER JOIN Cuna c ON b.idCuna = c.idCuna

                WHERE c.idUsuario = @idUsuario;

            `);



        res.json(result.recordset);



    } catch (err) {

        console.error(`[Backend] ERROR al obtener bebés para el enfermero ${userId}:`, err);

        res.status(500).send('Error al consultar los bebés asignados.');

    }

});

app.put('/api/enfermero/historial/observaciones/:idHistorial', async (req, res) => {

    const { idHistorial } = req.params;

    const { ObservacionesMedicas } = req.body; // Recibimos el texto de las observaciones



    if (!ObservacionesMedicas) {

        return res.status(400).json({ error: 'El campo ObservacionesMedicas es requerido.' });

    }



    try {

        const pool = await sql.connect(config);

        await pool.request()

            .input('idHistorial', sql.Int, idHistorial)

            .input('Observaciones', sql.NVarChar, ObservacionesMedicas)

            .query(`

                UPDATE HistorialBebe

                SET ObservacionesMedicas = @Observaciones

                WHERE idHistorial = @idHistorial;

            `);

       

        res.status(200).send('Observaciones actualizadas correctamente.');



    } catch (err) {

        console.error('[Backend] ERROR al actualizar observaciones:', err);

        res.status(500).send('Error al actualizar las observaciones.');

    }

});

app.post('/api/enfermero/historial', async (req, res) => {

    const { idBebe, ObservacionesMedicas, Vacunas, FechaVisitaMedica, idUsuario } = req.body;



    if (!idBebe || !FechaVisitaMedica || !idUsuario) {

        return res.status(400).json({ error: 'Faltan campos obligatorios: idBebe, FechaVisitaMedica, idUsuario' });

    }

   

    try {

        const pool = await sql.connect(config);

        const result = await pool.request()

            .input('idBebe', sql.Int, idBebe)

            .input('ObservacionesMedicas', sql.NVarChar, ObservacionesMedicas || null)

            .input('Vacunas', sql.NVarChar, Vacunas || null)

            .input('FechaVisitaMedica', sql.Date, FechaVisitaMedica)

            .input('idUsuario', sql.Int, idUsuario) // id del enfermero que registra

            .query(`

                INSERT INTO HistorialBebe (idBebe, ObservacionesMedicas, Vacunas, FechaVisitaMedica, idUsuario)

                OUTPUT INSERTED.*

                VALUES (@idBebe, @ObservacionesMedicas, @Vacunas, @FechaVisitaMedica, @idUsuario);

            `);

        res.status(201).json(result.recordset[0]);

    } catch (err) {

        console.error('[Backend] ERROR al crear nuevo historial:', err);

        res.status(500).send('Error al agregar la nueva entrada de historial.');

    }

});

app.put('/api/enfermero/historial/:idHistorial', async (req, res) => {

  const idHistorial = parseInt(req.params.idHistorial);

  const { ContactoEmergenciaNombre, ContactoEmergenciaTelefono, ContactoEmergenciaRelacion } = req.body;



  if (isNaN(idHistorial)) {

    return res.status(400).json({ error: 'ID de historial no válido.' });

  }



  try {

    const pool = await sql.connect(config);

    const meta = await pool.request()

      .input('idHist', sql.Int, idHistorial)

      .query('SELECT idBebe FROM HistorialBebe WHERE idHistorial = @idHist');

   

    if (!meta.recordset.length) {

      return res.status(404).send('Historial no encontrado.');

    }

    const { idBebe } = meta.recordset[0];

    await pool.request()

      .input('idBebe', sql.Int, idBebe) // Solo necesitamos el id del bebé

      .input('Nombre', sql.NVarChar, ContactoEmergenciaNombre)

      .input('Telefono', sql.NVarChar, ContactoEmergenciaTelefono)

      .input('Relacion', sql.NVarChar, ContactoEmergenciaRelacion)

      .query(`

        -- Asumimos que la tabla 'contactoEm' tiene una entrada por cada 'idBebe'.

        -- Si no existe, usamos MERGE para crearla o actualizarla.

        MERGE contactoEm AS target

        USING (SELECT @idBebe AS idBebe) AS source

        ON (target.idBebe = source.idBebe)

        WHEN MATCHED THEN

            UPDATE SET

                Nombre = @Nombre,

                Telefono = @Telefono,

                Relacion = @Relacion

        WHEN NOT MATCHED THEN

            INSERT (idBebe, Nombre, Telefono, Relacion)

            VALUES (@idBebe, @Nombre, @Telefono, @Relacion);

      `);



    res.send('Contacto de emergencia actualizado.');

  } catch (err) {

    console.error(err);

    res.status(500).send('Error al actualizar el contacto.');

  }

});
// ✅ VERSIÓN CORREGIDA (Aunque se recomienda eliminarla)
app.get('/api/enfermero/bebes/:idUsuario', async (req, res) => {
    // Corregido: Se usa idUsuario para mantener la consistencia
    const idUsuario = parseInt(req.params.idUsuario);

    if (isNaN(idUsuario)) {
        return res.status(400).json({ error: 'ID de usuario no válido.' });
    }

    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('idUsuario', sql.Int, idUsuario)
            .query(`
                SELECT DISTINCT
                    b.idBebe,
                    b.Nombre AS BebeNombre,
                    -- CORRECCIÓN: Se seleccionan apellidos por separado
                    b.ApellidoPaterno AS BebeApellidoPaterno,
                    b.ApellidoMaterno AS BebeApellidoMaterno,
                    b.Sexo AS BebeSexo,
                    b.Peso AS BebePeso,
                    b.FechaNacimiento AS BebeFechaNacimiento,
                    b.idCuna
                FROM Bebe b
                INNER JOIN Cuna c ON b.idCuna = c.idCuna
                WHERE c.idUsuario = @idUsuario;
            `);

        res.json(result.recordset);

    } catch (err) {
        console.error(`[Backend] ERROR al obtener bebés para el enfermero ${idUsuario}:`, err);
        res.status(500).send('Error al consultar los bebés asignados.');
    }
});
app.put('/api/enfermero/historial/observaciones/:idHistorial', async (req, res) => {
    const { idHistorial } = req.params;
    const { ObservacionesMedicas } = req.body; // Recibimos el texto de las observaciones

    if (!ObservacionesMedicas) {
        return res.status(400).json({ error: 'El campo ObservacionesMedicas es requerido.' });
    }

    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input('idHistorial', sql.Int, idHistorial)
            .input('Observaciones', sql.NVarChar, ObservacionesMedicas)
            .query(`
                UPDATE HistorialBebe
                SET ObservacionesMedicas = @Observaciones
                WHERE idHistorial = @idHistorial;
            `);
        
        res.status(200).send('Observaciones actualizadas correctamente.');

    } catch (err) {
        console.error('[Backend] ERROR al actualizar observaciones:', err);
        res.status(500).send('Error al actualizar las observaciones.');
    }
});
app.post('/api/enfermero/historial', async (req, res) => {
    const { idBebe, ObservacionesMedicas, Vacunas, FechaVisitaMedica, idUsuario } = req.body;

    if (!idBebe || !FechaVisitaMedica || !idUsuario) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: idBebe, FechaVisitaMedica, idUsuario' });
    }
    
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('idBebe', sql.Int, idBebe)
            .input('ObservacionesMedicas', sql.NVarChar, ObservacionesMedicas || null)
            .input('Vacunas', sql.NVarChar, Vacunas || null)
            .input('FechaVisitaMedica', sql.Date, FechaVisitaMedica)
            .input('idUsuario', sql.Int, idUsuario) // id del enfermero que registra
            .query(`
                INSERT INTO HistorialBebe (idBebe, ObservacionesMedicas, Vacunas, FechaVisitaMedica, idUsuario)
                OUTPUT INSERTED.*
                VALUES (@idBebe, @ObservacionesMedicas, @Vacunas, @FechaVisitaMedica, @idUsuario);
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('[Backend] ERROR al crear nuevo historial:', err);
        res.status(500).send('Error al agregar la nueva entrada de historial.');
    }
});
app.put('/api/enfermero/historial/:idHistorial', async (req, res) => {
  const idHistorial = parseInt(req.params.idHistorial);
  const { ContactoEmergenciaNombre, ContactoEmergenciaTelefono, ContactoEmergenciaRelacion } = req.body;

  if (isNaN(idHistorial)) {
    return res.status(400).json({ error: 'ID de historial no válido.' });
  }

  try {
    const pool = await sql.connect(config);
    const meta = await pool.request()
      .input('idHist', sql.Int, idHistorial)
      .query('SELECT idBebe FROM HistorialBebe WHERE idHistorial = @idHist');
    
    if (!meta.recordset.length) {
      return res.status(404).send('Historial no encontrado.');
    }
    const { idBebe } = meta.recordset[0];
    await pool.request()
      .input('idBebe', sql.Int, idBebe) // Solo necesitamos el id del bebé
      .input('Nombre', sql.NVarChar, ContactoEmergenciaNombre)
      .input('Telefono', sql.NVarChar, ContactoEmergenciaTelefono)
      .input('Relacion', sql.NVarChar, ContactoEmergenciaRelacion)
      .query(`
        -- Asumimos que la tabla 'contactoEm' tiene una entrada por cada 'idBebe'.
        -- Si no existe, usamos MERGE para crearla o actualizarla.
        MERGE contactoEm AS target
        USING (SELECT @idBebe AS idBebe) AS source
        ON (target.idBebe = source.idBebe)
        WHEN MATCHED THEN
            UPDATE SET 
                Nombre = @Nombre,
                Telefono = @Telefono,
                Relacion = @Relacion
        WHEN NOT MATCHED THEN
            INSERT (idBebe, Nombre, Telefono, Relacion)
            VALUES (@idBebe, @Nombre, @Telefono, @Relacion);
      `);

    res.send('Contacto de emergencia actualizado.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar el contacto.');
  }
});
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
          b.ApellidoPaterno,
          b.ApellidoMaterno,
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
app.get('/api/enfermero/historial-bebes-completo/:idUsuario', async (req, res) => {
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
                    b.Nombre AS BebeNombre,
                    b.ApellidoPaterno AS BebeApellidoPaterno,
                    b.ApellidoMaterno AS BebeApellidoMaterno,
                    b.Sexo AS BebeSexo,
                    b.Peso AS BebePeso,
                    b.FechaNacimiento AS BebeFechaNacimiento,
                    c.idCuna,
                    hb.ObservacionesMedicas,
                    hb.Vacunas,
                    hb.FechaVisitaMedica,
                    -- CORRECIÓN: Se seleccionan todos los campos del nombre del contacto
                    ce.Nombre AS ContactoEmergenciaNombre,
                    ce.ApellidoPaterno AS ContactoEmergenciaPaterno,
                    ce.ApellidoMaterno AS ContactoEmergenciaMaterno,
                    ce.Telefono AS ContactoEmergenciaTelefono,
                    ce.Relacion AS ContactoEmergenciaRelacion
                FROM Bebe b
                INNER JOIN Cuna c ON b.idCuna = c.idCuna
                LEFT JOIN HistorialBebe hb ON b.idBebe = hb.idBebe
                LEFT JOIN contactoEm ce ON b.idBebe = ce.idBebe
                WHERE c.idUsuario = @idUsuario;
            `);
        
        res.json(result.recordset);

    } catch (err) {
        console.error(`[Backend] ERROR al obtener Historial Completo Enfermero (id: ${idUsuario}):`, err);
        res.status(500).send(`Error interno del servidor al consultar historial completo: ${err.message || err}`);
    }
});

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


// --- NUEVO ENDPOINT ---
// GET /api/cunas/disponibles: Devuelve solo las cunas con Estado = 0 (libres)
app.get('/api/cunas/disponibles', async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .query('SELECT idCuna, Nombre FROM Cuna WHERE Estado = 0 OR Estado IS NULL');
    res.json(result.recordset);
  } catch (err) {
    console.error('[Backend] Error al obtener cunas disponibles:', err);
    res.status(500).json({ message: 'Error al obtener cunas disponibles', error: err.message });
  }
});

// --- NUEVO ENDPOINT ---
// PUT /api/bebe/asignar-cuna: Asigna una cuna a un bebé
app.put('/api/bebe/asignar-cuna', async (req, res) => {
  const { idBebe, idCuna } = req.body;

  if (!idBebe || !idCuna) {
    return res.status(400).json({ message: 'Se requieren idBebe y idCuna.' });
  }

  let pool;
  try {
    pool = await sql.connect(config);
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Verificar si la cuna está realmente disponible
      const cunaCheck = await new sql.Request(transaction)
        .input('idCuna', sql.Int, idCuna)
        .query('SELECT Estado FROM Cuna WHERE idCuna = @idCuna');

      if (cunaCheck.recordset.length = 0) {
        throw new Error(`La cuna con ID ${idCuna} no existe.`);
      }
      if (cunaCheck.recordset[0].Estado = 1) {
        throw new Error(`La cuna #${idCuna} ya está ocupada.`);
      }

      // 1. Asignar la cuna al bebé
      await new sql.Request(transaction)
        .input('idBebe', sql.Int, idBebe)
        .input('idCuna', sql.Int, idCuna)
        .query('UPDATE Bebe SET idCuna = @idCuna WHERE idBebe = @idBebe');

      // 2. Marcar la cuna como ocupada
      await new sql.Request(transaction)
        .input('idCuna', sql.Int, idCuna)
        .input('idUsuario', sql.Int, null) // Opcional: Asignar un enfermero si es necesario
        .query("UPDATE Cuna SET Estado = 1, FechaAsig = GETDATE() WHERE idCuna = @idCuna");
      
      await transaction.commit();
      res.status(200).json({ message: 'Cuna asignada correctamente.' });

    } catch (err) {
      await transaction.rollback();
      console.error('[Backend] Error en transacción de asignación:', err);
      res.status(500).json({ message: err.message || 'Error al asignar la cuna.', error: err.message });
    }
  } catch (err) {
    console.error('[Backend] Error de conexión en asignación:', err);
    res.status(500).json({ message: 'Error de conexión a la base de datos.', error: err.message });
  }
});

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

// NUEVO ENDPOINT: Obtener nombre completo de usuario por idUsuario
app.get('/api/usuarios/:idUsuario/nombre', async (req, res) => {
  const idUsuario = parseInt(req.params.idUsuario);
  if (isNaN(idUsuario)) {
    return res.status(400).json({ error: 'ID de usuario no válido.' });
  }
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('idUsuario', sql.Int, idUsuario)
      .query(`
        SELECT Nombre, ApellidoPaterno, ApellidoMaterno
        FROM Usuario
        WHERE idUsuario = @idUsuario
      `);
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const u = result.recordset[0];
    const nombreCompleto = [u.Nombre, u.ApellidoPaterno, u.ApellidoMaterno].filter(Boolean).join(' ');
    res.json({ nombre: nombreCompleto });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener nombre de usuario.' });
  }
});

// NUEVO ENDPOINT: Crear bebé y asignar cuna automáticamente (el trigger hará la asignación de cuna)
app.post('/api/bebes', async (req, res) => {
  const {
    nombre,
    apellidoPaterno,
    apellidoMaterno,
    sexo,
    peso,
    fechaNacimiento,
    alergias
  } = req.body;

  if (!nombre || !apellidoPaterno || !sexo || !peso || !fechaNacimiento) {
    return res.status(400).json({ message: 'Faltan campos obligatorios.' });
  }

  try {
    const pool = await sql.connect(config);
    // 1. Insertar el bebé (sin OUTPUT)
    await pool.request()
      .input('Nombre', sql.NVarChar, nombre)
      .input('ApellidoPaterno', sql.NVarChar, apellidoPaterno)
      .input('ApellidoMaterno', sql.NVarChar, apellidoMaterno)
      .input('Sexo', sql.NVarChar, sexo)
      .input('Peso', sql.Float, peso)
      .input('FechaNacimiento', sql.Date, fechaNacimiento)
      .input('Alergias', sql.NVarChar, alergias || null)
      .query(`
        INSERT INTO Bebe (Nombre, ApellidoPaterno, ApellidoMaterno, Sexo, Peso, FechaNacimiento, Alergias)
        VALUES (@Nombre, @ApellidoPaterno, @ApellidoMaterno, @Sexo, @Peso, @FechaNacimiento, @Alergias)
      `);

    // 2. Obtener el último bebé insertado (por nombre y fecha, o usando SCOPE_IDENTITY si fuera posible)
    const result = await pool.request()
      .input('Nombre', sql.NVarChar, nombre)
      .input('ApellidoPaterno', sql.NVarChar, apellidoPaterno)
      .input('ApellidoMaterno', sql.NVarChar, apellidoMaterno)
      .input('FechaNacimiento', sql.Date, fechaNacimiento)
      .query(`
        SELECT TOP 1 *
        FROM Bebe
        WHERE Nombre = @Nombre
          AND ApellidoPaterno = @ApellidoPaterno
          AND ApellidoMaterno = @ApellidoMaterno
          AND FechaNacimiento = @FechaNacimiento
        ORDER BY idBebe DESC
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error('[API] Error al crear bebé:', err);
    res.status(500).json({ message: 'Error al crear bebé', error: err.message });
  }
});

app.use((err, req, res, next) => {
    console.error('[GLOBAL ERROR HANDLER] Unhandled error:', err.stack); // Imprime el stack trace completo
    res.status(500).send('Ocurrió un error inesperado en el servidor.');
});

// ✅ LISTEN
app.listen(3000,'0.0.0.0', () => {
  console.log('API corriendo en http://localhost:3000');
});

