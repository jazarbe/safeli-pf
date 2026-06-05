process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config();

const express = require('express');
const DBRouter = require('./src/controllers/db-controller.js');

const app = express();
const PORT = process.env.PORT || 3000;

const { importarDelitos } = require('./backoffice.js');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static('src'));

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

app.get('/', (req, res) => {
  res.send('Servidor funcionando correctamente');
});

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
    res.status(500).json({ 
      success: false, 
      error: 'Hubo un error al procesar el archivo.',
      details: error.message 
    });
  }
});

app.use('/delitos', DBRouter);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
  console.log(`http://localhost:${PORT}/`)
});