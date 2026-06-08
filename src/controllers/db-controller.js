const DBService = require('../services/db-service.js');
require('dotenv').config();
const router = require('express').Router();

const { importarDelitos } = require('../../backoffice.js');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const svc = new DBService();

// GET /delitos/delitos  → tabla paginada con filtros
router.get('/delitos', async (req, res) => {
  try {
    const result = await svc.getDelitosAsync(req.query);
    res.json(result);
  } catch (err) {
    console.error('Error en DBController:', err);
    res.status(500).json({ message: 'Error al obtener los delitos', details: err.message });
  }
});

// GET /delitos/tipos  → lista de tipos para el filtro
router.get('/tipos', async (req, res) => {
  try {
    const data = await svc.getTiposAsync();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener tipos', details: err.message });
  }
});

// GET /delitos/subtipos?idTipo=X  → subtipos (opcionalmente filtrados)
router.get('/subtipos', async (req, res) => {
  try {
    const data = await svc.getSubtiposAsync(req.query.idTipo || null);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener subtipos', details: err.message });
  }
});

// POST /delitos/importar  → importación de Excel
router.post('/importar', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Por favor, selecciona un archivo Excel.' });
    }
    const cantidadInsertados = await importarDelitos(req.file.buffer);
    res.json({ success: true, message: `Se importaron con éxito ${cantidadInsertados} registro/s a la base de datos.` });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Hubo un error al procesar el archivo.', details: error.message });
  }
});

module.exports = router;