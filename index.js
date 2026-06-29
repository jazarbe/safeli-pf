process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

const express = require('express');
const path = require('path');
const DBRouter = require('./src/controllers/db-controller.js');

const app = express();
const PORT = process.env.PORT || 3000;

const { importarDelitos } = require('./src/backoffice/backoffice.js');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Middleware para parsear JSON y formularios
app.use(express.json());

// Servir archivos estáticos (CSS, JS del cliente, imágenes) desde la carpeta 'src'
app.use(express.static(path.join(__dirname, 'src')));

// --- RUTAS DE LA API (SUPABASE) ---
// Conectamos tu controlador para que responda bajo el prefijo /api o /delitos
app.use('/delitos', DBRouter); 

// --- RUTAS DE LAS VISTAS (HTML) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.get('/backoffice', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'backoffice', 'backoffice.html'));
});

// Mantenemos tu endpoint global de importación por si el formulario del HTML apunta directo a la raíz
app.post('/importar', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Por favor, selecciona un archivo Excel.' });
    }

    const cantidadInsertados = await importarDelitos(req.file.buffer);

    res.json({ 
      success: true, 
      message: `Se importaron con éxito ${cantidadInsertados} registro/s a la base de datos.` 
    });

  } catch (error) {
    console.error('Error al importar:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Panel de control disponible en: http://localhost:${PORT}/backoffice`);
});