const DBService = require('../services/db-service.js');
require('dotenv').config();
const router = require('express').Router();

const { importarDelitos } = require('../../backoffice.js');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

const svc = new DBService();

router.get('/delitos', async (req, res) => {
  try {
    const data = await svc.getDelitosAsync(req.query);
    res.json(data);
  } catch (err) {
    console.error('Error en DBController:', err);
    res.status(500).json({ message: 'Error al obtener los delitos', details: err.message });
  }
});

router.post('/importar', upload.single('archivo'), async (req, res) => {
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
    res.status(500).json({ 
      success: false, 
      error: 'Hubo un error al procesar el archivo.',
      details: error.message 
    });
  }
});

module.exports = router;