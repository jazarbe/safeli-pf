process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

const express = require('express');
const path = require('path');
const DBRouter = require('./src/controllers/db-controller.js');
const { importarDelitos } = require('./src/backoffice/backoffice.js');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

// Middleware para parsear JSON y formularios
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'src'
app.use(express.static(path.join(__dirname, 'src')));

// --- RUTAS DE LA API (SUPABASE) ---
app.use('/delitos', DBRouter); 

// --- RUTA PRINCIPAL (BACKOFFICE INTEGRADO) ---
// Ahora la raíz redirige o sirve directamente el panel avanzado
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'backoffice', 'backoffice.html'));
});

// Endpoint unificado de importación en la raíz de la API
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
  console.log(`📊 Panel de control unificado en: http://localhost:${PORT}`);
});